import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from supabase import create_client


ALL_REPORT_ROLES = {"master", "accounting"}
OWN_REPORT_ROLES = {"leader", "leader_juboteam"}


def get_supabase():
    """서비스 롤 키로 Supabase 클라이언트를 생성합니다."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    return create_client(url, key)


def extract_bearer_token(auth_header):
    """Authorization 헤더에서 Bearer 토큰만 분리해 반환합니다."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    return auth_header[len("Bearer "):]


def can_view_all_reports(role):
    """해당 역할이 전체 지출결의서를 조회할 수 있는지 확인합니다."""
    return role in ALL_REPORT_ROLES


def can_view_own_reports(role):
    """해당 역할이 본인 지출결의서를 조회할 수 있는지 확인합니다."""
    return role in OWN_REPORT_ROLES


def get_request_user(auth_header):
    """요청 토큰을 검증하고 지출결의서 조회 권한이 있는 사용자 정보를 반환합니다."""
    token = extract_bearer_token(auth_header)
    if not token:
        return None

    sb = get_supabase()

    try:
        user = sb.auth.get_user(token)
        user_id = user.user.id
        result = sb.table("profiles").select("role").eq("id", user_id).single().execute()
        role = result.data.get("role") if result.data else None

        if can_view_all_reports(role) or can_view_own_reports(role):
            return {"id": user_id, "role": role}
    except Exception:
        return None

    return None


def build_author_name_map(sb, reports):
    """조회한 결의서 목록에 대응하는 작성자 이름 맵을 생성합니다."""
    user_ids = list({report.get("user_id") for report in reports if report.get("user_id")})
    if not user_ids:
        return {}

    result = sb.table("profiles").select("id, name").in_("id", user_ids).execute()
    return {
        profile.get("id"): profile.get("name") or ""
        for profile in (result.data or [])
    }


def attach_author_names(sb, reports):
    """결의서 데이터에 작성자 이름을 붙여 프런트에서 바로 사용할 수 있게 만듭니다."""
    author_name_map = build_author_name_map(sb, reports)
    return [
        {
            **report,
            "author_name": author_name_map.get(report.get("user_id")) or "",
        }
        for report in reports
    ]


def build_reports_select_clause(include_receipts):
    """목록과 상세 화면에 맞는 Supabase select 구문을 반환합니다."""
    if include_receipts:
        return """
            *,
            expense_items (*),
            expense_receipts (*)
        """

    return """
        *,
        expense_items (*)
    """


def fetch_reports(sb, requester, report_id=None):
    """역할에 맞는 범위로 지출결의서 목록 또는 상세 데이터를 조회합니다."""
    include_receipts = bool(report_id)
    query = sb.table("expense_reports").select(build_reports_select_clause(include_receipts))

    if not can_view_all_reports(requester["role"]):
        query = query.eq("user_id", requester["id"])

    if report_id:
        return query.eq("id", report_id).single().execute().data

    return query.order("created_at", desc=True).execute().data or []


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """요청자의 역할에 맞는 지출결의서 목록 또는 상세 데이터를 반환합니다."""
        auth_header = self.headers.get("Authorization", "")
        requester = get_request_user(auth_header)

        if not requester:
            self._send_json({"error": "Permission denied"}, 403)
            return

        parsed = urlparse(self.path)
        report_id = parse_qs(parsed.query).get("id", [None])[0]

        try:
            sb = get_supabase()
            report_data = fetch_reports(sb, requester, report_id)

            if report_id:
                if not report_data:
                    self._send_json({"error": "Expense report not found"}, 404)
                    return

                resolved_reports = attach_author_names(sb, [report_data])
                self._send_json(resolved_reports[0], 200)
                return

            resolved_reports = attach_author_names(sb, report_data)
            self._send_json(resolved_reports, 200)
        except Exception as error:
            self._send_json({"error": str(error)}, 500)

    def _send_json(self, data, status=200):
        """JSON 응답과 공통 헤더를 함께 전송합니다."""
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """브라우저의 CORS 사전 요청에 응답합니다."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
