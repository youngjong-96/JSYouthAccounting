import json
import os
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler
from supabase import create_client


def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    return create_client(url, key)


def verify_master(auth_header):
    """Verify that the request comes from a master user via Supabase JWT."""
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    sb = create_client(supabase_url, service_key)

    try:
        user = sb.auth.get_user(token)
        user_id = user.user.id
        result = sb.table("profiles").select("role").eq("id", user_id).single().execute()
        if result.data and result.data.get("role") == "master":
            return user_id
    except Exception:
        pass
    return None


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        auth_header = self.headers.get("Authorization", "")
        if not verify_master(auth_header):
            self._send_json({"error": "Permission denied"}, 403)
            return

        try:
            sb = get_supabase()
            result = sb.table("profiles").select("*").order("created_at", desc=True).execute()
            self._send_json(result.data, 200)
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def do_DELETE(self):
        auth_header = self.headers.get("Authorization", "")
        requester_id = verify_master(auth_header)
        if not requester_id:
            self._send_json({"error": "Permission denied"}, 403)
            return

        # Query string에서 ?id=<user_id> 추출
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        target_id = params.get("id", [None])[0]

        if not target_id:
            self._send_json({"error": "Missing user id"}, 400)
            return

        # 자기 자신 삭제 방지
        if target_id == requester_id:
            self._send_json({"error": "Cannot delete your own account"}, 400)
            return

        try:
            sb = get_supabase()
            # profiles 먼저 삭제 (FK 제약 등 대비)
            sb.table("profiles").delete().eq("id", target_id).execute()
            # auth.users 삭제 (서비스 롤 키 필요)
            sb.auth.admin.delete_user(target_id)
            self._send_json({"success": True}, 200)
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
