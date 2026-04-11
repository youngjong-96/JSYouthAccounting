# 빌드 스테이지
FROM node:20-alpine AS build
WORKDIR /app

# 의존성 복사 및 설치
COPY package*.json ./
RUN npm install

# 소스 복사 및 애플리케이션 빌드
COPY . .
RUN npm run build

# 프로덕션 스테이지 (Nginx)
FROM nginx:alpine
# 빌드된 정적 파일을 Nginx가 서빙할 폴더로 복사
COPY --from=build /app/dist /usr/share/nginx/html
# React Router 가 잘 동작하도록 nginx.conf 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
