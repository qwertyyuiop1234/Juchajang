#!/bin/bash

# 네이버 클라우드 플랫폼 VPC 배포 스크립트
# Naver Directions 5 API가 작동하는 VPC 환경에 백엔드 배포

set -e  # 오류 발생 시 스크립트 중단

# 색상 출력을 위한 함수
print_info() {
    echo -e "\033[34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

# 변수 설정
SERVER_IP=${1:-"your-server-ip"}
SERVER_USER=${2:-"ubuntu"}
REMOTE_DIR="/home/$SERVER_USER/juchajang-backend"
LOCAL_DIR="."

if [ "$SERVER_IP" = "your-server-ip" ]; then
    print_error "사용법: $0 <서버IP> [사용자명]"
    print_info "예시: $0 123.456.789.101 ubuntu"
    exit 1
fi

print_info "🚀 네이버 클라우드 플랫폼 VPC 배포 시작"
print_info "📍 대상 서버: $SERVER_USER@$SERVER_IP"
print_info "📁 원격 디렉토리: $REMOTE_DIR"

# 1. 서버 연결 테스트
print_info "🔍 서버 연결 테스트 중..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_IP exit 2>/dev/null; then
    print_error "서버에 연결할 수 없습니다. SSH 키 설정 또는 네트워크를 확인하세요."
    exit 1
fi
print_success "서버 연결 성공"

# 2. 원격 디렉토리 생성
print_info "📁 원격 디렉토리 생성 중..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_DIR"

# 3. 소스 코드 배포
print_info "📦 소스 코드 업로드 중..."
rsync -avz --delete \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=.env \
    --exclude=*.log \
    $LOCAL_DIR/ $SERVER_USER@$SERVER_IP:$REMOTE_DIR/

# 4. VPC용 환경변수 파일 적용
print_info "⚙️ VPC 환경변수 설정 중..."
ssh $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && cp .env.vpc .env"

# 5. 의존성 설치
print_info "📦 의존성 설치 중..."
ssh $SERVER_USER@$SERVER_IP "cd $REMOTE_DIR && npm install --production"

# 6. 서비스 설정 및 시작
print_info "🔧 systemd 서비스 설정 중..."
ssh $SERVER_USER@$SERVER_IP "sudo tee /etc/systemd/system/juchajang-backend.service > /dev/null <<EOF
[Unit]
Description=Juchajang Backend Service for VPC
After=network.target

[Service]
Type=simple
User=$SERVER_USER
WorkingDirectory=$REMOTE_DIR
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF"

# 7. 서비스 활성화 및 시작
print_info "🚀 서비스 시작 중..."
ssh $SERVER_USER@$SERVER_IP "
    sudo systemctl daemon-reload
    sudo systemctl enable juchajang-backend
    sudo systemctl restart juchajang-backend
    sleep 5
"

# 8. 서비스 상태 확인
print_info "🔍 서비스 상태 확인 중..."
SERVICE_STATUS=$(ssh $SERVER_USER@$SERVER_IP "sudo systemctl is-active juchajang-backend")
if [ "$SERVICE_STATUS" = "active" ]; then
    print_success "서비스가 성공적으로 시작되었습니다!"
else
    print_error "서비스 시작 실패. 로그를 확인하세요:"
    ssh $SERVER_USER@$SERVER_IP "sudo journalctl -u juchajang-backend --no-pager -n 20"
    exit 1
fi

# 9. 헬스체크
print_info "🏥 애플리케이션 헬스체크 중..."
sleep 5
HEALTH_CHECK=$(ssh $SERVER_USER@$SERVER_IP "curl -s http://localhost:5001/api/health || echo 'failed'")
if echo "$HEALTH_CHECK" | grep -q "success"; then
    print_success "애플리케이션이 정상적으로 작동 중입니다!"
else
    print_warning "헬스체크 실패. 애플리케이션 로그를 확인하세요."
    ssh $SERVER_USER@$SERVER_IP "sudo journalctl -u juchajang-backend --no-pager -n 10"
fi

# 10. Nginx 설정 적용 (선택사항)
read -p "Nginx 리버스 프록시를 설정하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "🌐 Nginx 설정 중..."
    ssh $SERVER_USER@$SERVER_IP "sudo tee /etc/nginx/sites-available/juchajang-backend > /dev/null <<EOF
server {
    listen 80;
    server_name $SERVER_IP;

    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if (\\\$request_method = 'OPTIONS') {
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
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
EOF"

    ssh $SERVER_USER@$SERVER_IP "
        sudo ln -sf /etc/nginx/sites-available/juchajang-backend /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default
        sudo nginx -t && sudo systemctl reload nginx
    "
    print_success "Nginx 설정 완료!"
fi

print_success "✅ VPC 배포 완료!"
echo ""
print_info "📋 배포 정보:"
print_info "  • 서버 주소: http://$SERVER_IP"
print_info "  • API 엔드포인트: http://$SERVER_IP/api"
print_info "  • 헬스체크: http://$SERVER_IP/api/health"
echo ""
print_info "🔧 관리 명령어:"
print_info "  • 서비스 상태: ssh $SERVER_USER@$SERVER_IP 'sudo systemctl status juchajang-backend'"
print_info "  • 로그 확인: ssh $SERVER_USER@$SERVER_IP 'sudo journalctl -u juchajang-backend -f'"
print_info "  • 서비스 재시작: ssh $SERVER_USER@$SERVER_IP 'sudo systemctl restart juchajang-backend'"
echo ""
print_info "🧪 API 테스트:"
print_info "  curl -X POST http://$SERVER_IP/api/navigation/directions \\"
print_info "    -H 'Content-Type: application/json' \\"
print_info "    -d '{\"start\":{\"latitude\":37.5665,\"longitude\":126.9780},\"goal\":{\"latitude\":37.5651,\"longitude\":126.9895}}'"