#!/bin/bash

# 네이버 클라우드 플랫폼 Server (Compute Engine) 배포 스크립트
# VPC 환경에서 Naver Directions 5 API 사용을 위한 서버 설정

echo "🚀 네이버 클라우드 플랫폼 VPC 서버 설정 시작"

# 1. 시스템 업데이트
echo "📦 시스템 패키지 업데이트 중..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Node.js 20 LTS 설치
echo "📦 Node.js 20 LTS 설치 중..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Docker 설치
echo "🐳 Docker 설치 중..."
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# 4. Docker Compose 설치
echo "🐳 Docker Compose 설치 중..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5. 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 6. nginx 설치 (리버스 프록시용)
echo "🌐 Nginx 설치 중..."
sudo apt-get install -y nginx

# 7. 방화벽 설정
echo "🔒 방화벽 설정 중..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 5001
sudo ufw --force enable

# 8. 애플리케이션 디렉토리 생성
echo "📁 애플리케이션 디렉토리 설정 중..."
mkdir -p /home/$USER/juchajang-backend
cd /home/$USER/juchajang-backend

# 9. systemd 서비스 파일 생성
echo "⚙️ systemd 서비스 설정 중..."
sudo tee /etc/systemd/system/juchajang-backend.service > /dev/null <<EOF
[Unit]
Description=Juchajang Backend Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/home/$USER/juchajang-backend
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=5001

[Install]
WantedBy=multi-user.target
EOF

# 10. Nginx 리버스 프록시 설정
echo "🌐 Nginx 리버스 프록시 설정 중..."
sudo tee /etc/nginx/sites-available/juchajang-backend > /dev/null <<EOF
server {
    listen 80;
    server_name your-server-ip;  # 실제 서버 IP로 변경 필요

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
        
        # CORS 헤더 추가
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

    location /health {
        proxy_pass http://localhost:5001/api/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# 11. Nginx 사이트 활성화
sudo ln -s /etc/nginx/sites-available/juchajang-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "✅ 네이버 클라우드 플랫폼 VPC 서버 설정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. 소스 코드를 /home/$USER/juchajang-backend 에 업로드"
echo "2. npm install 실행"
echo "3. .env 파일에 네이버 API 키 설정"
echo "4. sudo systemctl enable juchajang-backend"
echo "5. sudo systemctl start juchajang-backend"
echo ""
echo "🔧 서비스 관리 명령어:"
echo "- 서비스 시작: sudo systemctl start juchajang-backend"
echo "- 서비스 중지: sudo systemctl stop juchajang-backend"
echo "- 서비스 재시작: sudo systemctl restart juchajang-backend"
echo "- 로그 확인: sudo journalctl -u juchajang-backend -f"