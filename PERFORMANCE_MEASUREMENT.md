# 성능 측정 가이드

이 문서는 데이터 조회 성능을 개선하기 전후로 같은 조건에서 비교하기 위한 절차입니다.

## 포함된 계측

브라우저에서 URL 뒤에 `?perf=1`을 붙이면 해당 탭에서 다음을 `sessionStorage`와 개발자 도구 콘솔에 기록합니다.

- 매출 요약 조회가 화면에 표시될 때까지의 시간
- 지출결의서 목록·상세 API 요청 시간
- 기존 결의서 목록 조회와 항목 적용 시간
- 임시저장 결의서가 화면에 표시될 때까지의 시간

API 응답에는 `Server-Timing` 헤더도 포함됩니다. 응답 본문, 사용자 이름, 금액, 토큰, 문서 ID는 성능 기록에 남지 않습니다.

| API | 주요 구간 |
| --- | --- |
| `/api/finance/summary` | `sheets_connect`, `finance_sheet_read`, `personnel_sheet_read`, `aggregate`, `serialize`, `total` |
| `/api/expense/reports` | `auth`, `scope_count`, `filtered_count`, `list_query`, `author_lookup`, `item_summary_lookup`, `serialize`, `total` |
| `/api/expense/report_detail` | `auth`, `detail_query`, `author_lookup`, `serialize`, `total` |
| `/api/expense/copy_sources` | `auth`, `source_count`, `source_list_query`, `item_summary_lookup`, `serialize`, `total` |
| `/api/expense/copy_source_detail` | `auth`, `copy_source_detail_query`, `serialize`, `total` |

## Vercel 설정

`PERFORMANCE_LOGGING=1` 환경 변수를 Preview 환경에 먼저 추가한 뒤 새 배포를 만듭니다. 이 값이 켜져 있을 때만 Vercel Functions 로그에 JSON 형식의 `api_performance` 이벤트가 기록됩니다.

Production에서 확인해야 하면 짧은 측정 기간에만 켜고, 완료 후 제거하거나 `0`으로 바꿉니다. `Server-Timing` 헤더와 브라우저 측정은 이 환경 변수와 관계없이 사용할 수 있습니다.

## 측정 절차

1. Preview 또는 Production URL에 `?perf=1`을 붙여 엽니다.
2. 개발자 도구 Console에서 아래 명령으로 이전 기록을 비웁니다.

   ```js
   window.__requestPerf?.clear();
   window.__expenseReportPerf?.clear();
   ```

3. 같은 계정·역할·연월 조건으로 한 가지 시나리오를 10회 반복합니다.
4. Console에서 결과를 확인하거나 복사합니다.

   ```js
   window.__requestPerf.summary();
   window.__requestPerf.read();
   window.__expenseReportPerf.summary();
   ```

5. Network 탭에서 해당 API를 선택하고 Response Headers의 `Server-Timing` 값도 확인합니다.
6. 개선을 적용한 뒤, 같은 시나리오·같은 데이터에서 1~5를 반복합니다.

처음 한 번은 새로고침 직후, 나머지는 연속 요청으로 측정해 별도로 기록합니다. 목록·상세 화면에는 60초 메모리 캐시가 있으므로, API 자체를 비교할 때는 매회 새로고침 후 실행합니다.

## 권장 시나리오

- 매출: 연·월 전체 조회, 특정 주차 조회
- 결의서: 목록 첫 진입, 필터 적용, 상세 열기
- 작성: 기존 결의서 목록 열기, 기존 결의서 적용, 임시저장 수정 화면 열기

비교할 때는 평균보다 `p75Ms`와 `maxMs`를 우선 봅니다. `p75Ms`는 사용자의 느린 쪽 25% 경험을 보여 주며, 서버리스 초기 실행처럼 간헐적으로 느린 요청의 영향을 평균보다 잘 드러냅니다.
