import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from supabase import create_client


ALLOWED_COPY_SOURCE_ROLES = {"master", "accounting", "leader", "leader_juboteam"}


def get_supabase():
    """복사 소스 상세 조회에 사용할 Supabase 클라이언트를 생성합니다."""
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


def can_use_copy_source(role):
    """해당 역할이 기존 결의서 복사 기능을 사용할 수 있는지 확인합니다."""
    return role in ALLOWED_COPY_SOURCE_ROLES


def get_request_user(auth_header):
    """요청 토큰을 검증하고 복사 기능을 사용할 수 있는 사용자 정보를 반환합니다."""
    token = extract_bearer_token(auth_header)
    if not token:
        return None

    sb = get_supabase()

    try:
        user = sb.auth.get_user(token)
        user_id = user.user.id
        result = sb.table("profiles").select("role").eq("id", user_id).single().execute()
        role = result.data.get("role") if result.data else None

        if can_use_copy_source(role):
            return {"id": user_id, "role": role}
    except Exception:
        return None

    return None


def get_report_id_from_params(params):
    """상세 조회 쿼리 문자열에서 지출결의서 ID를 추출합니다."""
    report_id = params.get("id", [None])[0]
    return report_id.strip() if isinstance(report_id, str) else None


def fetch_copy_source_detail(sb, requester, report_id):
    """현재 사용자가 작성한 결의서 중 복사할 원본 상세를 조회합니다."""
    result = (
        sb.table("expense_reports")
        .select(
            """
            id,
            user_id,
            resolution_date,
            claim_date,
            bank_account,
            total_amount,
            status,
            expense_items (*)
            """
        )
        .eq("id", report_id)
        .eq("user_id", requester["id"])
        .single()
        .execute()
    )

    return result.data


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """요청 사용자가 작성한 복사 소스 상세 데이터를 반환합니다."""
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
            report = fetch_copy_source_detail(sb, requester, report_id)

            if not report:
                self._send_json({"error": "Expense report not found"}, 404)
                return

            self._send_json(report, 200)
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
