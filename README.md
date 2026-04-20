# JSYouth 회계시스템

Google Spreadsheets를 데이터 저장소로 활용하여 재정을 관리하고 주간/월간 보고서를 생성하는 웹 애플리케이션입니다.

## 🏗 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React (Vite) + Tailwind CSS |
| 인증 / 사용자 DB | [Supabase](https://supabase.com) |
| 서버리스 API | Vercel Serverless Functions (Python) |
| 데이터 소스 | Google Spreadsheets (gspread) |
| 호스팅 | [Vercel](https://vercel.com) |

## 🌟 주요 기능

- **대시보드**: 연/월/주차별 수입·지출 필터링 및 요약
- **보고서 자동 생성**: 주간보고서·월간보고서 미리보기 및 인쇄
- **사용자 관리**: Supabase Auth 기반 가입 승인·역할(master/viewer) 관리
- **지출결의서 관리**: 지출결의서 작성 및 확인

## 📁 프로젝트 구조

```
jsyouth/
└── Frontend/                  # Vercel 배포 루트
    ├── api/                   # Vercel Serverless Functions (Python)
    │   ├── finance/
    │   │   ├── summary.py     # GET  - Google Sheets 데이터 조회
    │   │   └── record.py      # POST - Google Sheets 데이터 추가
    │   └── accounts/
    │       ├── users.py       # GET  - 사용자 목록 (마스터 전용)
    │       └── users_detail.py# PATCH- 사용자 승인/역할 변경
    ├── src/
    │   ├── lib/supabase.js    # Supabase 클라이언트
    │   ├── context/AuthContext.jsx
    │   ├── components/        # Dashboard, Sidebar, TransactionForm, ...
    │   └── pages/             # LoginPage, RegisterPage, SummaryView, ...
    ├── requirements.txt       # Python 서버리스 의존성
    ├── vercel.json            # Vercel 라우팅 설정
    └── package.json
```
