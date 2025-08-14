# 네비게이션 기능 설정 가이드

네이버맵 Direction 5 API를 활용한 네비게이션 기능이 구현되었습니다.

## 🚀 구현된 기능

### ✅ 백엔드 (Node.js + Express)
- **네이버맵 Direction 5 API 통합**
- **다중 경로 옵션 제공** (trafast, tracomfort, traoptimal)
- **경로 이탈 감지 및 재탐색 API**
- **경유지 포함 경로 계산**

### ✅ 프론트엔드 (React Native + Expo)
- **실시간 위치 추적 및 지도 표시**
- **경로 시각화 (Polyline)**
- **턴바이턴 음성 및 시각 안내**
- **경로 이탈 자동 감지 및 재탐색**
- **주차장 목록에서 직접 네비게이션 시작**

## 🔧 설정 방법

### 1. 네이버 클라우드 플랫폼 키 발급

1. [네이버 클라우드 플랫폼 콘솔](https://console.ncloud.com/naver-service/application)에 접속
2. Application 생성
3. Maps → Direction 5 서비스 추가
4. Client ID와 Client Secret 확인

### 2. 백엔드 설정

```bash
cd backend
cp .env.example .env
```

`.env` 파일 수정:
```bash
PORT=5001
NAVER_CLIENT_ID=your_naver_client_id_here
NAVER_CLIENT_SECRET=your_naver_client_secret_here
```

백엔드 실행:
```bash
npm install
npm start
```

### 3. 프론트엔드 설정

```bash
cd frontend
npm install
```

iOS/Android 실행:
```bash
npm run ios    # iOS
npm run android # Android
```

## 📱 사용 방법

### 1. 네비게이션 시작
1. 홈 화면에서 주차장 카드 선택
2. 주차장 상세 페이지에서 "길찾기" 버튼 클릭
3. 자동으로 네비게이션 화면으로 이동

### 2. 네비게이션 기능
- **음성 안내**: 우상단 스피커 버튼으로 ON/OFF 가능
- **경로 재탐색**: 하단 "재탐색" 버튼 클릭
- **네비게이션 종료**: 우상단 X 버튼 클릭

### 3. 자동 기능
- **실시간 위치 추적**: 1초마다 위치 업데이트
- **경로 이탈 감지**: 10초마다 경로 이탈 확인 (100m 임계값)
- **자동 재탐색**: 경로 이탈 시 자동으로 새 경로 계산
- **도착 알림**: 목적지 50m 내 도달 시 자동 알림

## 🛠️ API 엔드포인트

### 경로 검색
```http
POST /api/navigation/directions
Content-Type: application/json

{
  "start": {
    "latitude": 37.5666102,
    "longitude": 126.9783881
  },
  "goal": {
    "latitude": 37.4979462,
    "longitude": 127.0279958
  },
  "option": "trafast"
}
```

### 다중 경로 검색
```http
POST /api/navigation/directions/multiple
Content-Type: application/json

{
  "start": {
    "latitude": 37.5666102,
    "longitude": 126.9783881
  },
  "goal": {
    "latitude": 37.4979462,
    "longitude": 127.0279958
  }
}
```

### 경로 이탈 확인
```http
POST /api/navigation/route/deviation-check
Content-Type: application/json

{
  "currentLocation": {
    "latitude": 37.5666102,
    "longitude": 126.9783881
  },
  "path": [126.9783881, 37.5666102, ...],
  "threshold": 100
}
```

### 경로 재탐색
```http
POST /api/navigation/route/reroute
Content-Type: application/json

{
  "currentLocation": {
    "latitude": 37.5666102,
    "longitude": 126.9783881
  },
  "originalGoal": {
    "latitude": 37.4979462,
    "longitude": 127.0279958
  },
  "option": "trafast"
}
```

## 📂 파일 구조

```
backend/
├── src/
│   ├── config/env.js              # 환경변수 설정
│   ├── services/naverMap.js       # 네이버맵 API 서비스
│   ├── routes/navigation.js       # 네비게이션 API 라우트
│   └── server.js                  # Express 서버 메인

frontend/
├── app/
│   ├── navigation.tsx             # 네비게이션 메인 화면
│   └── parking-detail.tsx         # 주차장 상세 (길찾기 연동)
├── services/
│   └── navigationAPI.ts           # 백엔드 API 호출 서비스
└── components/
    └── TurnByTurnGuide.tsx        # 턴바이턴 안내 컴포넌트
```

## 🚨 주의사항

1. **네이버 클라우드 플랫폼 키**: 반드시 실제 키로 교체 필요
2. **위치 권한**: iOS/Android 위치 권한 허용 필수
3. **백엔드 서버**: 프론트엔드 사용 전 백엔드 서버 실행 필요
4. **네트워크**: Direction 5 API 호출을 위한 인터넷 연결 필수

## 🔍 트러블슈팅

### API 호출 실패
- 네이버 클라우드 플랫폼 키 확인
- Direction 5 서비스 활성화 확인
- 네트워크 연결 상태 확인

### 위치 추적 실패
- 앱 위치 권한 설정 확인
- iOS: 설정 > 개인정보 보호 및 보안 > 위치 서비스
- Android: 설정 > 위치

### 네비게이션 화면 접근 불가
- 백엔드 서버 실행 상태 확인 (http://localhost:5001/api/health)
- 주차장 상세 페이지에서 길찾기 버튼 클릭

## 🎯 향후 개선사항

1. **실시간 교통정보** 반영
2. **음성 안내 커스터마이징** (속도, 음성 변경)
3. **즐겨찾는 경로** 저장 기능
4. **다국어 음성 안내** 지원
5. **오프라인 지도** 캐싱