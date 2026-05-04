# JSYouth 회계시스템

Google Spreadsheets를 데이터 저장소로 활용하여 재정을 관리하고 주간/월간 보고서를 생성하는 웹 애플리케이션입니다.  
Supabase Auth 기반의 역할(Role) 시스템으로 페이지별 접근 권한을 제어합니다.

---

## 🏗 기술 스택

| 영역 | 기술 | 버전 |
|---|---|---|
| 프론트엔드 | React (Vite) | ^19 / ^8 |
| 스타일링 | Tailwind CSS | ^3.4 |
| 아이콘 | lucide-react | ^0.577 |
| 라우팅 | react-router-dom | ^7 |
| HTTP 클라이언트 | axios | ^1 |
| 인증 / 사용자 DB | [Supabase](https://supabase.com) | ^2 |
| 서버리스 API | Vercel Serverless Functions (Python) | - |
| 데이터 소스 | Google Spreadsheets (gspread) | 6.2.1 |
| 호스팅 | [Vercel](https://vercel.com) | - |

---

## 🌟 주요 기능

| 기능 | 설명 |
|---|---|
| **대시보드 (요약)** | 연/월/주차별 수입·지출 필터링 및 합계 요약 |
| **상세 내역** | 거래 내역 전체 조회 및 신규 거래 입력 |
| **주간보고서** | 주간 수입·지출 내역 미리보기 및 인쇄 |
| **월간보고서** | 월간 수입·지출 내역 미리보기 및 인쇄 |
| **지출결의서 작성** | 지출결의서 작성·수정 및 제출 |
| **지출결의서 목록** | 제출된 지출결의서 목록 조회 및 승인/확인 처리 |
| **사용자 관리** | 가입 승인 처리, 역할 변경 (마스터 전용) |
| **마이페이지** | 내 정보 확인, 비밀번호 변경 |

---

## 🔐 역할 및 권한 매트릭스

| 역할 | 요약보기 | 상세보기 | 지출결의서 작성 | 지출결의서 조회 | 사용자 관리 | 결의서 확인처리 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `master` (마스터) | ✅ | ✅ | ✅ | 전체 | ✅ | ✅ |
| `accounting` (회계팀) | ✅ | ✅ | ✅ | 전체 | ❌ | ✅ |
| `leader` (청년부리더) | ❌ | ❌ | ✅ | 본인만 | ❌ | ❌ |
| `leader_juboteam` (청년부리더+주보팀) | 헌금만 | ❌ | ✅ | 본인만 | ❌ | ❌ |
| `pending` (승인대기) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> `pending` 상태의 사용자는 로그인 시 자동으로 로그아웃 처리됩니다.

---

## 📁 프로젝트 구조

```
JSYouthAccounting/
├── api/                              # Vercel Serverless Functions (Python)
│   ├── finance/
│   │   ├── summary.py                # GET  - Google Sheets 재정 데이터 조회 (연/월/주차 필터)
│   │   └── record.py                 # POST - Google Sheets 거래 내역 추가
│   └── accounts/
│       ├── users.py                  # GET  - 전체 사용자 목록 조회 (마스터 전용)
│       └── users_detail.py           # PATCH- 사용자 승인 및 역할 변경
├── src/
│   ├── assets/                       # 정적 리소스 (이미지 등)
│   ├── components/
│   │   ├── Dashboard.jsx             # 레이아웃: 사이드바 + 콘텐츠 영역
│   │   ├── Sidebar.jsx               # 사이드바 내비게이션
│   │   ├── TransactionForm.jsx       # 거래 내역 입력 폼 (모달)
│   │   ├── WeeklyReportModal.jsx     # 주간보고서 미리보기 모달
│   │   ├── MonthlyReportModal.jsx    # 월간보고서 미리보기 모달
│   │   └── ExpenseReportDetailModal.jsx # 지출결의서 상세 보기 모달
│   ├── context/
│   │   ├── AuthContext.jsx           # 전역 인증 상태 및 권한 플래그 제공
│   │   └── authPermissions.js        # 역할별 권한 매트릭스 정의
│   ├── lib/
│   │   └── supabase.js               # Supabase 클라이언트 초기화
│   ├── pages/
│   │   ├── SummaryView.jsx           # 재정 요약 대시보드 페이지
│   │   ├── DetailView.jsx            # 거래 내역 상세 조회 페이지
│   │   ├── ExpenseReport.jsx         # 지출결의서 목록 페이지
│   │   ├── ExpenseReportCreate.jsx   # 지출결의서 작성/수정 페이지
│   │   ├── UserManagementPage.jsx    # 사용자 관리 페이지
│   │   ├── MyPage.jsx                # 마이페이지
│   │   ├── LoginPage.jsx             # 로그인
│   │   ├── RegisterPage.jsx          # 회원가입
│   │   ├── ForgotPasswordPage.jsx    # 비밀번호 찾기
│   │   └── ResetPasswordPage.jsx     # 비밀번호 재설정
│   ├── App.jsx                       # 전역 라우팅 구성 (ProtectedRoute / PermissionRoute)
│   ├── main.jsx                      # 앱 진입점
│   ├── App.css                       # 전역 스타일
│   └── index.css                     # Tailwind 기본 설정
├── index.html                        # HTML 진입점
├── vercel.json                       # Vercel 라우팅 설정 (SPA + API rewrites)
├── tailwind.config.js                # Tailwind 커스텀 색상/폰트 설정
├── vite.config.js                    # Vite 빌드 설정
├── package.json
├── requirements.txt                  # Python 서버리스 의존성
├── UIrule.md                         # UI 디자인 가이드
└── .gitignore
```

---

## ⚙️ 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 아래 변수를 설정합니다.

```env
# Supabase
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Google Sheets Service Account (Vercel 환경 변수로 설정)
GOOGLE_SERVICE_ACCOUNT_JSON=<service-account-json-string>

# Google Spreadsheet ID
SPREADSHEET_ID=<your-spreadsheet-id>

# Supabase Service Role Key (서버리스 함수용)
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

> **주의**: `.env` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.  
> Vercel 배포 시에는 Vercel 대시보드의 **Environment Variables** 설정에 동일하게 입력하세요.

---

## 🚀 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행 (http://localhost:5173)
npm run dev

# 3. 빌드 (프로덕션)
npm run build

# 4. 빌드 결과물 미리보기
npm run preview
```

> Python 서버리스 함수를 로컬에서 테스트하려면 [Vercel CLI](https://vercel.com/docs/cli)를 설치한 뒤  
> `vercel dev` 명령어를 사용하세요.

---

## 🔌 API 명세

모든 API는 `/api` 경로로 시작하며 Vercel Serverless Function(Python)으로 처리됩니다.  
인증은 `Authorization: Bearer <supabase-access-token>` 헤더로 전달합니다.

### `GET /api/finance/summary`

Google Sheets에서 재정 데이터를 조회합니다.

| 쿼리 파라미터 | 타입 | 설명 |
|---|---|---|
| `year` | number | 조회 연도 |
| `month` | number (optional) | 조회 월 |
| `week` | number (optional) | 조회 주차 |

---

### `POST /api/finance/record`

Google Sheets에 새 거래 내역을 추가합니다.

```json
{
  "date": "2025-01-15",
  "type": "수입",
  "category": "헌금",
  "amount": 100000,
  "memo": "주일헌금"
}
```

---

### `GET /api/accounts/users`

전체 사용자 목록을 반환합니다. **마스터(`master`) 역할만 호출 가능**합니다.

---

### `PATCH /api/accounts/users_detail`

특정 사용자의 승인 상태 또는 역할을 변경합니다. **마스터(`master`) 역할만 호출 가능**합니다.

```json
{
  "userId": "<uuid>",
  "role": "accounting"
}
```

---

## 🎨 디자인 시스템

커스텀 색상 팔레트와 컴포넌트 가이드라인은 [UIrule.md](./UIrule.md)를 참고하세요.

| 토큰 | HEX | 용도 |
|---|---|---|
| `navy` | `#333D51` | 텍스트·버튼·헤더 배경 (primary) |
| `gold` | `#D3AC2B` | 강조·포인트·액티브 상태 (accent) |
| `mist` | `#CBD0D8` | 보조 텍스트·보더·비활성 |
| `cream` | `#F4F3EA` | 기본 배경·카드 배경 |

폰트: **G마켓 산스 (GmarketSans)** — Light / Medium / Bold

---

## 📦 Python 의존성 (requirements.txt)

| 패키지 | 버전 | 용도 |
|---|---|---|
| gspread | 6.2.1 | Google Sheets API 연동 |
| pandas | 2.2.3 | 데이터 가공 |
| google-auth | 2.49.1 | Google 서비스 계정 인증 |
| supabase | 2.15.0 | 서버리스에서 Supabase 접근 |

---

## 📄 라이선스

본 프로젝트는 내부 사용 목적으로 제작되었습니다.
