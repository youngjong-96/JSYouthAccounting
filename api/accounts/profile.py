import json
import os
from http.server import BaseHTTPRequestHandler

from supabase import create_client


def get_supabase():
    """서비스 롤 키로 Supabase 클라이언트를 생성합니다."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    return create_client(url, key)


def verify_user(auth_header):
    """Authorization 헤더의 Supabase JWT를 검증하고 현재 사용자 id를 반환합니다."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header[len("Bearer "):]
    sb = get_supabase()

    try:
        user = sb.auth.get_user(token)
        return user.user.id if user and user.user else None
    except Exception:
        return None


def normalize_profile_update_payload(data):
    """허용된 회원정보 수정 필드만 추려서 DB 업데이트 형태로 정리합니다."""
    name = str(data.get("name", "")).strip()
    organization = str(data.get("organization", "")).strip()
    contact = str(data.get("contact", "")).strip()

    if not name:
        raise ValueError("이름은 비워둘 수 없습니다.")

    return {
        "name": name,
        "organization": organization or None,
        "contact": contact or None,
    }


class handler(BaseHTTPRequestHandler):
    def do_PATCH(self):
        """현재 로그인한 사용자의 회원정보를 수정합니다."""
        auth_header = self.headers.get("Authorization", "")
        user_id = verify_user(auth_header)

        if not user_id:
            self._send_json({"error": "Permission denied"}, 403)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body or b"{}")
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON"}, 400)
            return

        try:
            update_data = normalize_profile_update_payload(data)
        except ValueError as error:
            self._send_json({"error": str(error)}, 400)
            return

        try:
            sb = get_supabase()
            sb.table("profiles").update(update_data).eq("id", user_id).execute()
            result = (
                sb.table("profiles")
                .select("id, name, organization, contact, role, is_approved")
                .eq("id", user_id)
                .single()
                .execute()
            )

            if not result.data:
                self._send_json({"error": "회원정보를 저장할 프로필을 찾지 못했습니다."}, 404)
                return

            self._send_json(result.data, 200)
        except Exception as error:
            self._send_json({"error": str(error)}, 500)

    def _send_json(self, data, status=200):
        """JSON 응답을 UTF-8로 반환합니다."""
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """CORS preflight 요청을 처리합니다."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
