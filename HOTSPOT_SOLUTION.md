# iPhone 핫스팟 네트워크 연결 문제 해결책

## 문제 원인
iPhone 핫스팟은 **Client Isolation** 기능이 기본적으로 활성화되어 있어서 연결된 기기들(iPhone과 컴퓨터) 간에 직접 통신이 차단됩니다. 이 때문에 iPhone에서 컴퓨터의 백엔드 서버(192.0.0.3:5001)에 직접 접근할 수 없습니다.

## 해결책들

### 1. Expo Tunnel 모드 사용 (권장)
```bash
# Metro 번들러를 터널 모드로 시작
npx expo start --tunnel
```

이렇게 하면:
- Expo가 exp.direct 프록시 서버를 통해 터널을 생성
- iPhone과 컴퓨터 모두 인터넷을 통해 같은 터널에 접근
- Client Isolation 문제를 우회

### 2. 대안: 다른 Wi-Fi 네트워크 사용
- 공용 Wi-Fi 대신 Client Isolation이 비활성화된 네트워크 사용
- 집이나 사무실 Wi-Fi 등

### 3. 백엔드 서버 설정 확인
백엔드 서버가 이미 올바르게 설정되어 있음:
- `server.js`에서 `'0.0.0.0'`으로 바인딩 ✅
- Info.plist에서 ATS 예외 설정 ✅

## 현재 상태
- ✅ 백엔드 서버: 모든 네트워크 인터페이스에서 접근 가능
- ✅ iOS ATS: HTTP 연결 허용 설정됨
- ✅ navigationAPI.ts: Tunnel 모드 지원 추가됨
- ⚠️ iPhone 핫스팟 Client Isolation 문제 확인됨

## 권장 실행 명령
```bash
# 프론트엔드
npx expo start --tunnel

# 백엔드 (별도 터미널)
cd /Users/seunghyunlee/vscode/project/juchajang2/backend
node src/server.js
```

터널 모드는 일반 LAN 모드보다 속도가 느리지만, 핫스팟 환경에서 확실하게 작동합니다.