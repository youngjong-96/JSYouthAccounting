import json
import os
from http.server import BaseHTTPRequestHandler
from supabase import create_client


def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    return create_client(url, key)


def verify_master(auth_header):
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):]
    sb = get_supabase()
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
    def do_PATCH(self):
        auth_header = self.headers.get("Authorization", "")
        if not verify_master(auth_header):
            self._send_json({"error": "Permission denied"}, 403)
            return

        # Extract user_id from path e.g. /api/accounts/users/abc-123
        path_parts = self.path.split("/")
        user_id = path_parts[-1] if path_parts else None
        if not user_id:
            self._send_json({"error": "User ID required"}, 400)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._send_json({"error": "Invalid JSON"}, 400)
            return

        update_data = {}
        if "is_approved" in data:
            update_data["is_approved"] = data["is_approved"]
        if "role" in data:
            update_data["role"] = data["role"]

        try:
            sb = get_supabase()
            result = (
                sb.table("profiles")
                .update(update_data)
                .eq("id", user_id)
                .execute()
            )
            self._send_json(result.data[0] if result.data else {}, 200)
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
        self.send_header("Access-Control-Allow-Methods", "PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
