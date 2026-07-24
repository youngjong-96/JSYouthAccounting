# JSYouth 회계 시스템

Google Sheets를 회계 원장 저장소로 사용하고, Supabase 기반 인증/DB/스토리지와 Vercel 서버리스 API를 함께 운영하는 웹 애플리케이션입니다.  
요약 보기, 상세 내역 보기, 지출결의서 작성/조회, 자유게시판, 사용자 권한 관리, 내 정보 수정까지 한 서비스 안에서 처리합니다.

## 기술 스택

| 영역 | 기술 | 비고 |
|---|---|---|
| 프런트엔드 | React 19, Vite 8 | SPA |
| 스타일링 | Tailwind CSS | 커스텀 컬러 토큰 사용 |
| 라우팅 | react-router-dom 7 | 권한별 라우팅 제어 |
| 아이콘 | lucide-react | UI 아이콘 |
| 인증/DB/스토리지 | Supabase | Auth, Postgres, Storage |
| 서버 API | Vercel Serverless Functions (Python) | `/api/*` |
| 회계 데이터 저장 | Google Sheets | gspread 사용 |
| 배포 | Vercel | 정적 프런트 + 서버리스 함수 |

## 아키텍처 개요

현재 구조는 전통적인 단일 백엔드 구조가 아니라, 기능별로 데이터 경로가 나뉜 하이브리드 형태입니다.

```text
브라우저 -> Vercel 프런트
브라우저 -> Supabase(Auth / DB / Storage)
브라우저 -> Vercel API -> Google Sheets
브라우저 -> Vercel API -> Supabase Service Role
브라우저 -> 메모리/세션 캐시 -> 재조회 최소화
```

### 데이터 흐름

- 로그인, 세션 확인, 일반 프로필 조회는 Supabase Auth / `profiles` 테이블을 사용합니다.
- 내 정보 수정은 `/api/accounts/profile`이 현재 로그인한 사용자만 검증해 안전하게 처리합니다.
- 지출결의서 작성, 수정, 삭제, 체크 업데이트는 프런트엔드가 Supabase DB에 직접 접근합니다.
- 지출결의서 목록 조회는 `/api/expense/reports`가 서버에서 권한을 확인한 뒤 작성자명과 경량 요약 데이터를 조합해 반환합니다.
- 지출결의서 상세 조회는 `/api/expense/report_detail`이 서버에서 권한을 확인한 뒤 항목/영수증/작성자명을 함께 반환합니다.
- 회계 요약/상세 데이터는 `/api/finance/*`가 Google Sheets를 읽어서 반환합니다.
- 사용자 삭제 같은 관리자 작업은 `/api/accounts/*`가 Supabase Service Role 권한으로 처리합니다.
- 영수증 이미지는 Supabase Storage `receipts` 버킷에 저장됩니다.
- 지출결의서 보기 화면은 프런트엔드에서 목록/상세 캐시와 캐시 무효화 신호를 사용해 반복 조회 체감 속도를 개선합니다.

## 주요 기능

| 기능 | 설명 |
|---|---|
| 요약 보기 | 연도/월/주 기준 재정 요약을 대시보드형 카드로 제공하고, 누적 잔액·인원 보고·항목별 통계를 한눈에 표시 |
| 상세 내역 보기 | Google Sheets 기반 거래 내역 조회 및 필터링 |
| 지출결의서 작성 | 항목 입력, 영수증 첨부, 임시저장, 제출 |
| 지출결의서 조회 | 서버 페이지네이션 기반 목록 조회, 상세 모달, 처리현황 체크, 작성자명 표시, 인쇄 |
| 지출결의서 속도 개선 | 목록/상세 캐시, 캐시 무효화, 페이지 이동/상세 로딩 피드백으로 반복 조회 UX 개선 |
| 영수증 인쇄 | PC 인쇄 시 결의서 본문 뒤에 첨부 영수증까지 함께 출력 |
| 자유게시판 | 게시글 작성, 조회, 수정, 삭제 |
| 사용자 관리 | 승인/권한 관리, 계정 삭제 |
| 마이페이지 | 내 정보 조회/수정 및 비밀번호 변경 |

## 역할 및 권한

| 역할 | 요약 보기 | 상세 보기 | 지출결의서 작성 | 지출결의서 조회 | 사용자 관리 | 처리 체크 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `master` | 가능 | 가능 | 가능 | 전체 | 가능 | 가능 |
| `accounting` | 가능 | 가능 | 가능 | 전체 | 불가 | 가능 |
| `leader` | 불가 | 불가 | 가능 | 본인만 | 불가 | 불가 |
| `leader_juboteam` | 헌금 전용 | 불가 | 가능 | 본인만 | 불가 | 불가 |
| `pending` | 불가 | 불가 | 불가 | 불가 | 불가 | 불가 |

> `pending` 상태 사용자는 로그인 후 자동으로 로그아웃 처리됩니다.

## 프로젝트 구조

```text
JSYouthAccounting/
├─ api/                               # Vercel Serverless Functions (Python)
│  ├─ accounts/
│  │  ├─ users.py                     # GET/DELETE - 사용자 목록 조회, 계정 삭제
│  │  ├─ profile.py                   # PATCH - 내 정보 수정
│  │  └─ users_detail.py              # PATCH - 사용자 승인/권한 변경
│  ├─ expense/
│  │  ├─ report_detail.py             # GET - 지출결의서 상세 조회 + 작성자명 조합
│  │  └─ reports.py                   # GET - 지출결의서 목록 조회 + 페이지네이션 + 작성자명 조합
│  └─ finance/
│     ├─ record.py                    # POST - Google Sheets 거래 기록 추가
│     └─ summary.py                   # GET - 요약/상세 회계 데이터 조회
├─ src/
│  ├─ assets/
│  ├─ components/
│  │  ├─ Dashboard.jsx
│  │  ├─ ExpenseReportDetailModal.jsx
│  │  ├─ MonthlyReportModal.jsx
│  │  ├─ Sidebar.jsx
│  │  ├─ TransactionForm.jsx
│  │  └─ WeeklyReportModal.jsx
│  ├─ context/
│  │  ├─ AuthContext.jsx
│  │  └─ authPermissions.js
│  ├─ lib/
│  │  ├─ expenseReportCacheInvalidation.js
│  │  ├─ expenseReportPerformance.js  # 성능 측정 및 디버그 유틸
│  │  ├─ expenseReportService.js      # 지출결의서 CRUD 및 읽기 API 연동
│  │  ├─ freeBoardService.js
│  │  ├─ profileService.js            # 내 정보 수정 API 연동
│  │  ├─ supabase.js
│  │  └─ uploadReceipt.js
│  ├─ pages/
│  │  ├─ DetailView.jsx
│  │  ├─ ExpenseReport.jsx
│  │  ├─ ExpenseReportCreate.jsx
│  │  ├─ FreeBoardPage.jsx
│  │  ├─ LoginPage.jsx
│  │  ├─ MyPage.jsx
│  │  ├─ RegisterPage.jsx
│  │  ├─ ResetPasswordPage.jsx
│  │  ├─ SummaryView.jsx
│  │  └─ UserManagementPage.jsx
│  ├─ App.jsx
│  ├─ index.css
│  └─ main.jsx
├─ DESIGN.md                          # UI/디자인 참고 문서
├─ VERSION.md                         # 버전 변경 이력
├─ requirements.txt                   # Python 서버리스 의존성
├─ vercel.json                        # SPA/API rewrite 설정
└─ vite.config.js
```


## API 명세

모든 API는 `/api` 경로 아래에서 동작합니다.

### `GET /api/finance/summary`

Google Sheets에서 회계 요약 데이터를 읽습니다.

| 쿼리 파라미터 | 타입 | 설명 |
|---|---|---|
| `year` | number | 조회 연도 |
| `month` | number | 조회 월 |
| `week` | number | 조회 주차 |

### `POST /api/finance/record`

Google Sheets에 거래 한 건을 추가합니다.

예시 요청:

```json
{
  "year": 2026,
  "month": 6,
  "day": 7,
  "week": 1,
  "date_str": "2026-06-07",
  "type": "수입",
  "category": "헌금",
  "name": "홍길동",
  "amount": 100000,
  "note": "주일헌금"
}
```

### `GET /api/expense/reports`

지출결의서 목록을 서버 페이지네이션 방식으로 조회합니다.

| 쿼리 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `page` | number | `1` | 페이지 번호 |
| `limit` | number | `5` | 페이지당 개수, 최대 `20` |
| `director_confirmed` | string | `all` | `all`, `checked`, `unchecked` |
| `payment_completed` | string | `all` | `all`, `checked`, `unchecked` |
| `print_completed` | string | `all` | `all`, `checked`, `unchecked` |

- `master`, `accounting`: 전체 결의서 조회
- `leader`, `leader_juboteam`: 본인 결의서만 조회
- 서버에서 `profiles.name`을 안전하게 조회해 `author_name`을 붙여 반환
- 목록 응답은 `items`, `page`, `limit`, `total_count`, `total_pages`, `has_next`, `has_prev`, `scope_total_count`, `filters`를 포함합니다.

### `GET /api/expense/report_detail?id=<report_id>`

지출결의서 상세 1건을 조회합니다.

- 목록 조회와 동일한 권한 규칙을 사용합니다.
- `expense_items`, `expense_receipts`, `author_name`을 함께 반환합니다.

### `PATCH /api/accounts/profile`

현재 로그인한 사용자의 회원정보를 수정합니다.

- `Authorization: Bearer <Supabase access token>` 헤더가 필요합니다.
- 이름(`name`)은 필수이며 공백일 수 없습니다.

예시 요청:

```json
{
  "name": "홍길동",
  "organization": "청년부",
  "contact": "010-1234-5678"
}
```

### `GET /api/accounts/users`

전체 사용자 목록을 조회합니다.  
`master` 권한만 접근할 수 있습니다.

### `DELETE /api/accounts/users?id=<user_id>`

특정 사용자 계정을 삭제합니다.  
`master` 권한만 접근할 수 있으며 자기 자신은 삭제할 수 없습니다.

### `PATCH /api/accounts/users_detail/<user_id>`

특정 사용자의 승인 상태 또는 역할을 변경합니다.  
`master` 권한만 접근할 수 있습니다.

예시 요청:

```json
{
  "is_approved": true,
  "role": "accounting"
}
```

## 지출결의서 동작 방식

지출결의서 기능은 읽기와 쓰기 경로가 다릅니다.

- 목록 읽기: `/api/expense/reports`
- 상세 읽기: `/api/expense/report_detail`
- 작성/수정/삭제/체크 업데이트: Supabase DB 직접 접근
- 영수증 업로드/삭제: Supabase Storage 직접 접근

이 구조를 둔 이유는 작성자 이름을 조합할 때 `profiles` 접근 권한을 넓히지 않고도 역할별 조회 권한을 안전하게 유지하기 위해서입니다.

추가로 조회 UX를 위해 다음 전략을 사용합니다.

- 프런트엔드는 기본적으로 지출결의서 목록을 5건 단위로 조회합니다.
- 목록 페이지 데이터와 상세 데이터를 각각 별도 캐시로 유지합니다.
- 생성/수정/제출/삭제/체크 변경 이후에는 캐시 무효화 신호를 기록하고 다음 진입 시 필요한 범위만 다시 불러옵니다.

## 성능 디버깅 메모

지출결의서 보기 화면의 성능 측정이 필요할 때는 `?expensePerf=1` 쿼리를 사용합니다.

- 예시: `/expense?expensePerf=1`
- 브라우저 콘솔에서 `window.__expenseReportPerf.read()` 또는 `window.__expenseReportPerf.summary()`로 기록을 확인할 수 있습니다.

## Python 의존성

| 패키지 | 버전 | 용도 |
|---|---|---|
| gspread | 6.2.1 | Google Sheets 연동 |
| pandas | 2.2.3 | 회계 데이터 가공 |
| google-auth | 2.49.1 | Google 서비스 계정 인증 |
| supabase | 2.15.0 | 서버리스에서 Supabase 접근 |

## 참고 문서

- [DESIGN.md](./DESIGN.md)
- [VERSION.md](./VERSION.md)

## 라이선스

본 프로젝트는 내부 사용 목적의 서비스로 운영 중입니다.
