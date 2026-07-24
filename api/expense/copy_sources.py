import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from supabase import create_client


ALLOWED_COPY_SOURCE_ROLES = {"master", "accounting", "leader", "leader_juboteam"}
DEFAULT_LIMIT = 15
MAX_LIMIT = 30


def get_supabase():
    """복사 소스 조회에 사용할 Supabase 클라이언트를 생성합니다."""
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


def parse_positive_int(raw_value, default_value, max_value=None):
    """양의 정수 쿼리 값을 기본값과 최대값 규칙에 맞게 정리합니다."""
    try:
        parsed_value = int(raw_value)
    except (TypeError, ValueError):
        return default_value

    if parsed_value < 1:
        return default_value

    if max_value is not None:
        return min(parsed_value, max_value)

    return parsed_value


def fetch_query_count(query):
    """카운트 전용 쿼리를 실행해 전체 건수를 반환합니다."""
    result = query.limit(1).execute()
    return result.count or 0


def build_expense_item_summary_map(sb, report_ids):
    """목록 화면에 필요한 항목 개수와 첫 항목 요약을 계산합니다."""
    if not report_ids:
        return {}

    result = (
        sb.table("expense_items")
        .select("report_id, account_category, description, sort_order")
        .in_("report_id", report_ids)
        .order("sort_order")
        .execute()
    )

    summary_map = {report_id: {"item_count": 0, "first_item_summary": "-"} for report_id in report_ids}

    for item in result.data or []:
        report_id = item.get("report_id")
        if report_id not in summary_map:
            continue

        summary_map[report_id]["item_count"] += 1

        if summary_map[report_id]["item_count"] == 1:
            account_category = item.get("account_category") or ""
            description = item.get("description") or ""
            summary_map[report_id]["first_item_summary"] = f"{account_category} · {description}".strip(" ·") or "-"

    return summary_map


def build_copy_source_items(sb, reports):
    """기존 결의서 목록을 복사 소스 선택용 응답 구조로 변환합니다."""
    report_ids = [report.get("id") for report in reports if report.get("id")]
    item_summary_map = build_expense_item_summary_map(sb, report_ids)

    return [
        {
            "id": report.get("id"),
            "resolution_date": report.get("resolution_date"),
            "claim_date": report.get("claim_date"),
            "total_amount": report.get("total_amount") or 0,
            "status": report.get("status"),
            "item_count": item_summary_map.get(report.get("id"), {}).get("item_count", 0),
            "first_item_summary": item_summary_map.get(report.get("id"), {}).get("first_item_summary", "-"),
            "created_at": report.get("created_at"),
        }
        for report in reports
    ]


def fetch_copy_sources(sb, requester, params):
    """현재 사용자가 작성한 최근 결의서 목록을 복사 소스용으로 조회합니다."""
    limit = parse_positive_int(params.get("limit", [DEFAULT_LIMIT])[0], DEFAULT_LIMIT, MAX_LIMIT)

    total_count = fetch_query_count(
        sb.table("expense_reports").select("id", count="exact").eq("user_id", requester["id"])
    )

    reports_result = (
        sb.table("expense_reports")
        .select("id, resolution_date, claim_date, total_amount, status, created_at")
        .eq("user_id", requester["id"])
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    reports = reports_result.data or []

    return {
        "items": build_copy_source_items(sb, reports),
        "total_count": total_count,
        "limit": limit,
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """요청 사용자의 기존 결의서 복사 소스 목록을 반환합니다."""
        auth_header = self.headers.get("Authorization", "")
        requester = get_request_user(auth_header)

        if not requester:
            self._send_json({"error": "Permission denied"}, 403)
            return

        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            sb = get_supabase()
            self._send_json(fetch_copy_sources(sb, requester, params), 200)
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
