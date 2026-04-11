FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 시스템 의존성 설치
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 파이썬 패키지 복사 및 설치
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# 소스코드 복사
COPY . /app/

# Gunicorn 등으로 환경 띄우기 전, 마이그레이션 등은 서버 실행시 하거나 배포 스크립트로 진행합니다.
# 기본 엑스포즈 포트
EXPOSE 8000

# 개발 환경이 아니라 Gunicorn (WSGI) 운영 환경
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "jsyouth_backend.wsgi:application"]
