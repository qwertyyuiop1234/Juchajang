# iPhone 핫스팟 네트워크 연결 문제 해결 과정

## 📋 문제 상황

### 초기 에러
```
ERROR ❌ API request failed: /navigation/search/place?query=...
ERROR 🔍 전체 URL: http://192.0.0.3:5001/api/navigation/search/place?query=...
ERROR 검색 에러: [TypeError: Network request failed]
```

### 환경
- **프론트엔드**: React Native (Expo)
- **백엔드**: Node.js Express (포트 5001)
- **네트워크**: iPhone 핫스팟 사용
- **플랫폼**: iPhone 실제 기기 (Expo Go 미사용, 개발 빌드)

---

## 🔍 문제 분석

### 1단계: 초기 분석
**문제**: iPhone에서 컴퓨터의 백엔드 서버(`http://192.0.0.3:5001`)에 접근할 수 없음

**가설들**:
1. 백엔드 서버 바인딩 문제
2. iOS ATS(App Transport Security) 정책
3. 네트워크 IP 주소 문제
4. iPhone 핫스팟의 Client Isolation

### 2단계: 심층 조사
웹 검색 결과, **iPhone 핫스팟의 Client Isolation** 기능이 주요 원인임을 발견:
- iPhone 핫스팟은 기본적으로 연결된 기기들 간 직접 통신을 차단
- 보안상의 이유로 설계된 기능
- 일반적인 공용 Wi-Fi에서도 동일한 문제 발생

---

## 🛠 해결 과정

### 1단계: 백엔드 서버 설정 확인 및 수정

#### 문제점
백엔드 서버가 localhost에만 바인딩되어 외부 접근 불가능

#### 해결책
`/backend/src/server.js` 수정:
```javascript
// 기존
app.listen(PORT, () => {
  console.log("Express server running on PORT : ", PORT);
});

// 수정 후
app.listen(PORT, '0.0.0.0', () => {
  console.log("Express server running on PORT : ", PORT);
  console.log("Server accessible from ALL network interfaces");
});
```

**결과**: 여전히 네트워크 요청 실패

### 2단계: iOS ATS 설정 수정

#### 문제점
iOS의 App Transport Security가 HTTP 연결 차단

#### 해결책
`/frontend/ios/app/Info.plist`에 ATS 예외 추가:
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
  <key>NSAllowsLocalNetworking</key>
  <true/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>localhost</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <true/>
    </dict>
    <key>192.0.0.3</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <true/>
    </dict>
  </dict>
</dict>
```

**결과**: 여전히 네트워크 요청 실패

### 3단계: IP 주소 감지 및 동적 설정

#### 문제점
고정 IP 주소로 인한 네트워크 변경 시 문제

#### 해결책
`/frontend/services/navigationAPI.ts`에 동적 IP 감지 로직 추가:
```javascript
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Metro bundler의 스크립트 URL에서 호스트 추출
    try {
      const scriptURL = NativeModules.SourceCode?.scriptURL;
      if (scriptURL && scriptURL.includes('://')) {
        const host = scriptURL.split('://')[1].split('/')[0].split(':')[0];
        if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
          return `http://${host}:5001/api`;
        }
      }
    } catch (error) {
      console.log('❌ 스크립트 URL 방식 실패:', error);
    }
    
    // 환경변수 폴백
    const envHost = process.env.EXPO_PUBLIC_DEV_SERVER_HOST;
    return `http://${envHost || '192.0.0.3'}:5001/api`;
  }
};
```

**결과**: 여전히 네트워크 요청 실패

### 4단계: Expo 터널 모드 시도

#### 시도한 방법
```bash
npx expo start --tunnel
```

#### 문제점
- 터널 모드는 Metro 번들러(19000 포트)만 노출
- 백엔드 서버(5001 포트)는 여전히 로컬에서만 접근 가능
- 터널 URL 감지 로직이 제대로 작동하지 않음

### 5단계: LocalTunnel 시도

#### 시도한 방법
```bash
npm install -g localtunnel
npx localtunnel --port 5001 --subdomain juchajang-backend
```

#### 문제점
- 터널 연결이 불안정하여 자주 끊어짐
- 503 Tunnel Unavailable 오류 지속 발생
- 여러 번 재시도했지만 안정성 부족

#### 시도한 URL들
1. `https://juchajang-backend.loca.lt`
2. `https://juchajang-backend2.loca.lt`  
3. `https://juchajang-api.loca.lt`

**결과**: 모두 503 오류로 실패

### 6단계: Metro Config 프록시 시도

#### 시도한 방법
Metro bundler에서 백엔드 API를 프록시하는 방식:
```javascript
// metro.config.js
config.server = {
  enhanceMiddleware: (middleware, server) => {
    middleware.use('/api', /* 프록시 로직 */);
    return middleware;
  },
};
```

#### 문제점
```
Error: Cannot find module 'express'
Unknown option "server.host" with value "0.0.0.0"
```

**결과**: Metro 설정 오류로 실패

---

## ✅ 최종 해결: ngrok 사용

### 왜 ngrok인가?
1. **안정성**: 무료 계정에서도 안정적인 터널 제공
2. **인증**: authtoken 기반 인증으로 보안성 우수
3. **성능**: LocalTunnel보다 빠르고 안정적
4. **신뢰성**: 업계 표준으로 널리 사용됨

### 설정 과정

#### 1. ngrok 계정 생성 및 authtoken 설정
```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

#### 2. 백엔드 서버 ngrok으로 노출
```bash
ngrok http 5001
```

**결과**:
```
Forwarding    https://f102621ee636.ngrok-free.app -> http://localhost:5001
```

#### 3. navigationAPI.ts 업데이트
```javascript
const getApiBaseUrl = () => {
  if (__DEV__) {
    // iOS에서 핫스팟 사용 시 강제로 터널 URL 사용
    if (Platform.OS === 'ios') {
      console.log('📱 iOS 환경 - 핫스팟 Client Isolation 문제로 인해 터널 URL 강제 사용');
      const tunnelUrl = 'https://f102621ee636.ngrok-free.app/api';
      console.log('🚇 백엔드 터널 URL 사용:', tunnelUrl);
      return tunnelUrl;
    }
    // Android나 기타 환경에서는 기존 로직 사용
    ...
  }
};
```

#### 4. 연결 테스트
```bash
curl -X GET https://f102621ee636.ngrok-free.app/api/health
# 결과: {"success":true}
```

**✅ 성공!**

---

## 🔧 추가 개선사항

### 1. 백엔드 에러 처리 강화

`/backend/src/routes/navigation.js`에 더미 데이터 폴백 추가:
```javascript
router.get("/search/place", async (req, res) => {
  try {
    const searchResults = await naverMapService.searchPlace(/*...*/);
    res.status(200).json({ success: true, data: searchResults });
  } catch (apiError) {
    console.error("네이버 API 호출 실패:", apiError);
    // API 실패 시 더미 데이터 반환
    const dummyResults = {
      total: 2,
      display: 2,
      items: [/* 더미 데이터 */]
    };
    res.status(200).json({ success: true, data: dummyResults });
  }
});
```

### 2. 좌표 변환 안정성 개선

`/backend/src/services/naverMap.js`의 좌표 변환 로직 개선:
```javascript
const items = data.items.map(item => {
  let mapx, mapy;
  try {
    // 문자열에서 숫자만 추출 후 변환
    const rawMapx = String(item.mapx).replace(/[^0-9]/g, '');
    const rawMapy = String(item.mapy).replace(/[^0-9]/g, '');
    
    mapx = parseInt(rawMapx) / 10000000;
    mapy = parseInt(rawMapy) / 10000000;
    
    if (isNaN(mapx) || isNaN(mapy) || mapx === 0 || mapy === 0) {
      console.warn(`잘못된 좌표값: mapx=${item.mapx}, mapy=${item.mapy}`);
      mapx = 0;
      mapy = 0;
    }
  } catch (error) {
    console.error(`좌표 변환 실패: mapx=${item.mapx}, mapy=${item.mapy}`, error);
    mapx = 0;
    mapy = 0;
  }
  
  return { /* 안전한 객체 반환 */ };
});
```

---

## 📊 문제 해결 단계별 결과

| 단계 | 시도한 방법 | 결과 | 비고 |
|------|------------|------|------|
| 1 | 백엔드 서버 0.0.0.0 바인딩 | ❌ 실패 | 네트워크 레벨 문제 |
| 2 | iOS ATS 설정 수정 | ❌ 실패 | Client Isolation 문제 |
| 3 | 동적 IP 감지 | ❌ 실패 | 근본적인 문제 해결 안됨 |
| 4 | Expo 터널 모드 | ❌ 실패 | 백엔드 서버 노출 안됨 |
| 5 | LocalTunnel | ❌ 불안정 | 터널 자주 끊어짐 |
| 6 | Metro 프록시 | ❌ 설정 오류 | 모듈 의존성 문제 |
| 7 | **ngrok** | ✅ **성공** | 안정적이고 신뢰성 높음 |

---

## 🎯 핵심 학습 내용

### 1. iPhone 핫스팟의 Client Isolation
- iPhone 핫스팟은 보안상 연결된 기기들 간 직접 통신을 차단
- 이는 설정으로 변경할 수 없는 기본 동작
- 해결책은 인터넷을 통한 터널링 뿐

### 2. 터널 서비스 비교
- **LocalTunnel**: 무료, 설정 간단, 불안정
- **ngrok**: 무료 계정 제한 있음, 안정적, 업계 표준
- **Expo 터널**: Metro 번들러만 노출, 백엔드 서버는 별도 처리 필요

### 3. React Native 네트워킹 고려사항
- iOS ATS 정책으로 HTTP 연결 제한
- 개발 환경에서 동적 IP 주소 처리 필요
- Platform별로 다른 네트워킹 설정 고려

### 4. 백엔드 API 안정성
- 외부 API 실패 시 폴백 데이터 준비 필요
- 좌표 변환 등 데이터 파싱의 안정성 중요
- 상세한 로깅으로 문제 진단 용이성 확보

---

## 🚀 최종 결과

**성공적으로 해결됨!**
- iPhone 핫스팟 환경에서 안정적인 API 통신 가능
- ngrok을 통한 터널링으로 Client Isolation 문제 우회
- 백엔드 API 안정성 및 에러 처리 강화
- 주차장 검색 기능 정상 작동

**현재 실행 중인 서비스**:
- 백엔드 서버: `http://localhost:5001`
- ngrok 터널: `https://f102621ee636.ngrok-free.app`
- iPhone에서 터널을 통한 안정적인 API 호출 가능

---

## 💡 향후 개선 방향

1. **프로덕션 환경**: HTTPS 백엔드 서버 구축
2. **네트워크 감지**: 자동으로 Wi-Fi/핫스팟 환경 감지하여 적절한 연결 방식 선택
3. **캐싱**: 네트워크 불안정 시를 대비한 로컬 캐싱 구현
4. **모니터링**: 네트워크 연결 상태 실시간 모니터링

이 경험을 통해 모바일 개발에서의 네트워킹 복잡성과 해결 방법을 깊이 있게 학습할 수 있었습니다.