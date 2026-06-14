import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from supabase import create_client


ALL_REPORT_ROLES = {"master", "accounting"}
OWN_REPORT_ROLES = {"leader", "leader_juboteam"}


def get_supabase():
    """서비스 로직에서 사용할 Supabase 클라이언트를 생성합니다."""
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
    """해당 역할이 본인 지출결의서만 조회할 수 있는지 확인합니다."""
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


def apply_scope_filter(query, requester):
    """요청자 역할에 맞는 조회 범위를 쿼리에 적용합니다."""
    if can_view_all_reports(requester["role"]):
        return query

    return query.eq("user_id", requester["id"])


def build_author_name_map(sb, reports):
    """상세 응답에 포함할 작성자 이름을 프로필 정보에서 찾아 맵으로 만듭니다."""
    user_ids = list({report.get("user_id") for report in reports if report.get("user_id")})
    if not user_ids:
        return {}

    result = sb.table("profiles").select("id, name").in_("id", user_ids).execute()
    return {
        profile.get("id"): profile.get("name") or ""
        for profile in (result.data or [])
    }


def fetch_report_detail(sb, requester, report_id):
    """권한 범위 안에서 지출결의서 상세 1건과 연관 데이터를 함께 조회합니다."""
    query = (
        sb.table("expense_reports")
        .select(
            """
            *,
            expense_items (*),
            expense_receipts (*)
            """
        )
        .eq("id", report_id)
    )
    query = apply_scope_filter(query, requester)
    result = query.single().execute()
    report = result.data

    if not report:
        return None

    author_name_map = build_author_name_map(sb, [report])
    return {
        **report,
        "author_name": author_name_map.get(report.get("user_id")) or "",
    }


def get_report_id_from_params(params):
    """상세 조회 쿼리 문자열에서 지출결의서 ID를 추출합니다."""
    report_id = params.get("id", [None])[0]
    return report_id.strip() if isinstance(report_id, str) else None


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """요청자의 역할에 맞는 지출결의서 상세 데이터를 반환합니다."""
        auth_header = self.headers.get("Authorization", "")
        requester = get_request_user(auth_header)

        if not requester:
            self._send_json({"error": "Permission denied"}, 403)
            return

        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        report_id = get_report_id_from_params(params)

        if not report_id:
            self._send_json({"error": "Expense report id is required"}, 400)
            return

        try:
            sb = get_supabase()
            report_detail = fetch_report_detail(sb, requester, report_id)

            if not report_detail:
                self._send_json({"error": "Expense report not found"}, 404)
                return

            self._send_json(report_detail, 200)
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
