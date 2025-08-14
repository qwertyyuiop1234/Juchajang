# Node.js 20 LTS 버전 사용
FROM node:20-slim

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 애플리케이션 소스 코드 복사
COPY src/ ./src/

# 포트 노출
EXPOSE 5001

# 환경변수 설정
ENV NODE_ENV=production

# 애플리케이션 실행
CMD ["node", "src/server.js"]