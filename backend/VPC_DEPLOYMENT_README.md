# 네이버 클라우드 플랫폼 VPC 배포 가이드

Naver Directions 5 API가 VPC 환경에서만 작동하므로, 이 가이드를 통해 VPC에 백엔드를 배포할 수 있습니다.

## 📋 사전 준비사항

### 1. 네이버 클라우드 플랫폼 VPC 설정
- VPC 생성 완료
- Subnet 설정 완료  
- Internet Gateway 설정 완료
- Route Table 설정 완료

### 2. Server (Compute Engine) 생성
```bash
# Ubuntu 20.04 LTS 권장
# 최소 사양: vCPU 1개, RAM 2GB, SSD 20GB
# 보안 그룹에서 다음 포트 허용:
# - SSH (22)
# - HTTP (80) 
# - HTTPS (443)
# - Custom (5001) - 백엔드 서비스용
```

## 🚀 자동 배포 (권장)

### 1. 배포 스크립트 실행
```bash
# 서버 설정 (최초 1회만)
scp ncp-server-setup.sh ubuntu@<서버IP>:~/
ssh ubuntu@<서버IP> 'bash ~/ncp-server-setup.sh'

# 애플리케이션 배포
./deploy-to-vpc.sh <서버IP> ubuntu
```

### 2. 배포 확인
```bash
# 헬스체크
curl http://<서버IP>/api/health

# Directions API 테스트
curl -X POST http://<서버IP>/api/navigation/directions \
  -H 'Content-Type: application/json' \
  -d '{
    "start": {"latitude": 37.5665, "longitude": 126.9780},
    "goal": {"latitude": 37.5651, "longitude": 126.9895}
  }'
```

## 🛠️ 수동 배포

### 1. 서버 접속 및 환경 설정
```bash
ssh ubuntu@<서버IP>

# Node.js 20 LTS 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 기본 패키지 설치
sudo apt-get update
sudo apt-get install -y nginx git
```

### 2. 소스 코드 배포
```bash
# 로컬에서 서버로 파일 전송
rsync -avz --exclude=node_modules backend/ ubuntu@<서버IP>:~/juchajang-backend/

# 서버에서 의존성 설치
ssh ubuntu@<서버IP>
cd ~/juchajang-backend
npm install --production
```

### 3. 환경 변수 설정
```bash
# VPC용 환경변수 적용
cp .env.vpc .env

# 필요시 API 키 수정
nano .env
```

### 4. systemd 서비스 설정
```bash
sudo tee /etc/systemd/system/juchajang-backend.service > /dev/null <<EOF
[Unit]
Description=Juchajang Backend Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/juchajang-backend
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable juchajang-backend
sudo systemctl start juchajang-backend
```

### 5. Nginx 리버스 프록시 설정
```bash
sudo tee /etc/nginx/sites-available/juchajang-backend > /dev/null <<EOF
server {
    listen 80;
    server_name <서버IP>;

    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/juchajang-backend /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 🐳 Docker 배포 (선택사항)

### 1. Docker 이미지 빌드
```bash
# 로컬에서
docker build -t juchajang-backend .
docker tag juchajang-backend your-registry/juchajang-backend:latest
docker push your-registry/juchajang-backend:latest
```

### 2. 서버에서 Docker 실행
```bash
ssh ubuntu@<서버IP>

# Docker 실행
docker run -d \
  --name juchajang-backend \
  --restart unless-stopped \
  -p 5001:5001 \
  --env-file .env.vpc \
  your-registry/juchajang-backend:latest
```

## 🔍 모니터링 및 문제 해결

### 서비스 상태 확인
```bash
# 서비스 상태
sudo systemctl status juchajang-backend

# 실시간 로그 확인
sudo journalctl -u juchajang-backend -f

# 최근 로그 확인
sudo journalctl -u juchajang-backend --no-pager -n 50
```

### 일반적인 문제 해결

#### 1. Directions 5 API 403 오류
```bash
# VPC 내부에서 API 호출되고 있는지 확인
curl -I https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving
```

#### 2. 포트 접근 불가
```bash
# 방화벽 설정 확인
sudo ufw status
sudo ufw allow 5001

# 포트 사용 확인
sudo netstat -tlnp | grep 5001
```

#### 3. 환경변수 문제
```bash
# 환경변수 확인
cat .env
systemctl show juchajang-backend --property Environment
```

## 📊 API 엔드포인트

배포 완료 후 다음 엔드포인트들을 사용할 수 있습니다:

- `GET /api/health` - 헬스체크
- `POST /api/navigation/directions` - 단일 경로 검색
- `POST /api/navigation/directions/multiple` - 다중 경로 검색
- `POST /api/navigation/directions/waypoints` - 경유지 포함 경로 검색
- `GET /api/navigation/search/place` - 장소 검색
- `POST /api/navigation/search/nearby-parking` - 주변 주차장 검색

## 🔒 보안 고려사항

1. **API 키 보안**: `.env` 파일 권한을 600으로 설정
2. **방화벽 설정**: 필요한 포트만 열기
3. **HTTPS 설정**: Let's Encrypt 등을 통한 SSL 인증서 적용 권장
4. **정기 업데이트**: 시스템 및 Node.js 정기 업데이트

## 📞 지원

배포 중 문제가 발생하면:
1. 로그 파일 확인
2. 네트워크 연결 상태 확인  
3. API 키 유효성 확인
4. VPC 설정 확인