import json
import math
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from supabase import create_client


ALL_REPORT_ROLES = {"master", "accounting"}
OWN_REPORT_ROLES = {"leader", "leader_juboteam"}
DEFAULT_PAGE = 1
DEFAULT_LIMIT = 5
MAX_LIMIT = 20
LIST_FILTER_FIELDS = (
    "director_confirmed",
    "payment_completed",
    "print_completed",
)


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


def normalize_filter_value(raw_value):
    """목록 체크 필터 값을 all, checked, unchecked 중 하나로 정규화합니다."""
    if raw_value in {"checked", "unchecked"}:
        return raw_value
    return "all"


def build_list_filters(params):
    """목록 쿼리 파라미터에서 체크 필터 조건만 추출합니다."""
    filters = {}

    for field in LIST_FILTER_FIELDS:
        filters[field] = normalize_filter_value(params.get(field, ["all"])[0])

    return filters


def apply_scope_filter(query, requester):
    """요청자 역할에 맞는 조회 범위를 쿼리에 적용합니다."""
    if can_view_all_reports(requester["role"]):
        return query

    return query.eq("user_id", requester["id"])


def apply_list_filters(query, filters):
    """체크 필터 조건을 목록 쿼리에 적용합니다."""
    for field, filter_value in filters.items():
        if filter_value == "checked":
            query = query.eq(field, True)
        elif filter_value == "unchecked":
            query = query.eq(field, False)

    return query


def fetch_query_count(query):
    """카운트 전용 쿼리를 실행해 전체 건수를 반환합니다."""
    result = query.limit(1).execute()
    return result.count or 0


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


def build_expense_item_summary_map(sb, report_ids):
    """목록 화면에 필요한 항목 개수와 첫 항목 요약을 보고서별로 계산합니다."""
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


def build_report_list_items(sb, reports):
    """원본 결의서 데이터를 목록 전용 경량 응답 구조로 변환합니다."""
    author_name_map = build_author_name_map(sb, reports)
    report_ids = [report.get("id") for report in reports if report.get("id")]
    item_summary_map = build_expense_item_summary_map(sb, report_ids)

    return [
        {
            "id": report.get("id"),
            "user_id": report.get("user_id"),
            "resolution_date": report.get("resolution_date"),
            "total_amount": report.get("total_amount") or 0,
            "status": report.get("status"),
            "author_name": author_name_map.get(report.get("user_id")) or "",
            "director_confirmed": bool(report.get("director_confirmed")),
            "payment_completed": bool(report.get("payment_completed")),
            "print_completed": bool(report.get("print_completed")),
            "director_confirmed_by": report.get("director_confirmed_by"),
            "payment_completed_by": report.get("payment_completed_by"),
            "print_completed_by": report.get("print_completed_by"),
            "item_count": item_summary_map.get(report.get("id"), {}).get("item_count", 0),
            "first_item_summary": item_summary_map.get(report.get("id"), {}).get("first_item_summary", "-"),
        }
        for report in reports
    ]


def fetch_report_detail(sb, requester, report_id):
    """권한 범위 안에서 지출결의서 상세 1건을 조회합니다."""
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


def fetch_report_list(sb, requester, params):
    """목록 페이지에 필요한 경량 데이터와 페이지 정보를 함께 조회합니다."""
    page = parse_positive_int(params.get("page", [DEFAULT_PAGE])[0], DEFAULT_PAGE)
    limit = parse_positive_int(params.get("limit", [DEFAULT_LIMIT])[0], DEFAULT_LIMIT, MAX_LIMIT)
    filters = build_list_filters(params)

    base_scope_query = apply_scope_filter(
        sb.table("expense_reports").select("id", count="exact"),
        requester,
    )
    scope_total_count = fetch_query_count(base_scope_query)

    filtered_count_query = apply_list_filters(
        apply_scope_filter(
            sb.table("expense_reports").select("id", count="exact"),
            requester,
        ),
        filters,
    )
    total_count = fetch_query_count(filtered_count_query)
    total_pages = max(1, math.ceil(total_count / limit)) if total_count else 1
    current_page = min(page, total_pages)
    start_index = (current_page - 1) * limit
    end_index = start_index + limit - 1

    list_query = apply_list_filters(
        apply_scope_filter(
            sb.table("expense_reports").select(
                """
                id,
                user_id,
                resolution_date,
                total_amount,
                status,
                director_confirmed,
                payment_completed,
                print_completed,
                director_confirmed_by,
                payment_completed_by,
                print_completed_by,
                created_at
                """
            ),
            requester,
        ),
        filters,
    )

    reports_result = list_query.order("created_at", desc=True).range(start_index, end_index).execute()
    reports = reports_result.data or []

    return {
        "items": build_report_list_items(sb, reports),
        "page": current_page,
        "limit": limit,
        "total_count": total_count,
        "total_pages": total_pages,
        "has_next": current_page < total_pages,
        "has_prev": current_page > 1,
        "scope_total_count": scope_total_count,
        "filters": filters,
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """요청자의 역할에 맞는 지출결의서 목록 또는 상세 데이터를 반환합니다."""
        auth_header = self.headers.get("Authorization", "")
        requester = get_request_user(auth_header)

        if not requester:
            self._send_json({"error": "Permission denied"}, 403)
            return

        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        report_id = params.get("id", [None])[0]

        try:
            sb = get_supabase()

            if report_id:
                report_detail = fetch_report_detail(sb, requester, report_id)
                if not report_detail:
                    self._send_json({"error": "Expense report not found"}, 404)
                    return

                self._send_json(report_detail, 200)
                return

            self._send_json(fetch_report_list(sb, requester, params), 200)
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
