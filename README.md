# JSYouth 회계시스템 프로젝트

Google Spreadsheets를 데이터베이스로 활용하여 재정을 관리하고 주간/월간 보고서를 생성하는 JSYouth(주선청년) 웹 애플리케이션입니다.

## 🌟 주요 기능
- **대시보드**: 조건별(연, 월, 주차) 수입/지출 내역 필터링 및 차트/합계 제공
- **보고서 자동 생성**: 구글 스프레드시트 양식과 동일한 주간보고서 및 월간보고서 출력 기능 구현
- **데이터 직접 추가**: 웹화면에서 수입/지출 내역을 입력하면 구글 테이블 최하단에 동기화
- **사용자 관리**:
  - `master` 계정을 기반으로 가입자를 승인/거부할 수 있는 권한 시스템
  - `viewer`(일반조회자) 기능을 통한 조회 권한 분리

## 🏗 프로젝트 구조
프로젝트는 크게 백엔드와 프론트엔드로 나뉘어 있습니다.
- `/Backend`: Django 기반의 API 서버 (`finance` 엑셀 연동, `accounts` 사용자 승인/보안 처리)
- `/Frontend`: React (Vite) + Tailwind CSS 기반의 클라이언트 사이드 애플리케이션

## 🚀 로컬 실행 방법 (Windows 기준)

### 1. Backend (Django)
백엔드 실행을 위해서는 파이썬 가상환경을 활성화하고 필수 패키지들을 설치해야 합니다. 구글 시트 접근을 위한 `credentials.json` 키 파일이 `Backend` 폴더 최상단에 있어야 합니다.

```bash
cd Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

> **Note:** 최초 실행 시 DB 마이그레이션(`python manage.py migrate`)이 필요합니다. 

### 2. Frontend (React)
의존성 모듈을 설치한 뒤 개발 서버를 구동합니다. API가 8000포트에서 실행 중인지 확인하세요.

```bash
cd Frontend
npm install
npm run dev
```

서버가 구동되면 콘솔에 표시된 `http://localhost:5173` 으로 접속할 수 있습니다.

## 🔐 사용자 및 권한 테스트
테스트를 위해 기본 마스터 계정이 셋업되어야 합니다. 로컬 DB에 마스터 계정을 생성하려면 백엔드 폴더 내에서 `python create_master.py` 등을 실행하여 계정 생성 스크립트를 참조하십시오. 기본 승인 절차를 거치지 않은 사용자는 403 에러 메세지와 함께 접속이 차단됩니다.
