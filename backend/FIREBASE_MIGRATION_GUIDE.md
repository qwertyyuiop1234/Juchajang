# SQLite → Firebase 마이그레이션 가이드

SQLite3 데이터베이스를 Firebase Firestore로 마이그레이션하는 완전한 가이드입니다.

## 🚀 마이그레이션 완료 현황

✅ **완료된 작업들:**
1. Firebase Admin SDK 설치 및 설정
2. Firestore 서비스 클래스 생성
3. 기존 SQLite 코드를 Firestore로 변환
4. 데이터 마이그레이션 스크립트 작성
5. Python AI 모듈 Firestore 연동

## 📁 생성된 파일들

```
backend/
├── src/
│   ├── config/
│   │   └── firebase.js              # Firebase 설정 파일
│   └── services/
│       ├── firestoreService.js      # Firestore 서비스 클래스
│       └── parkingAI.js             # 업데이트된 주차장 AI 서비스
├── scripts/
│   └── migrate-to-firestore.js      # 데이터 마이그레이션 스크립트
├── ai/
│   ├── firestore_helper.py          # Python Firestore 헬퍼
│   └── parking_prophet_firestore.py # Firestore용 Prophet 모델
└── package.json                     # firebase-admin 의존성 추가됨
```

## 🔧 사전 준비사항

### 1. Firebase 프로젝트 설정
1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트 확인
2. Firestore Database 활성화
3. 서비스 계정 키 파일이 올바른 위치에 있는지 확인:
   ```
   backend/juchajang-fbcfe-firebase-adminsdk-fbsvc-5fee059275.json
   ```

### 2. Python 환경 설정
```bash
# Firebase Admin SDK for Python 설치
pip install firebase-admin

# 또는 conda 환경에서:
conda activate juchajang-ai
pip install firebase-admin
```

## 📋 단계별 마이그레이션 방법

### 1단계: Firestore 연결 테스트
```bash
cd backend
node -e "
import('./src/services/firestoreService.js').then(async ({firestoreService}) => {
  const result = await firestoreService.testConnection();
  console.log(result);
});
"
```

### 2단계: 데이터 마이그레이션 실행
```bash
cd backend
node scripts/migrate-to-firestore.js --verify
```

**마이그레이션 옵션:**
- `--verify`: 마이그레이션 후 데이터 검증 실행
- 기본적으로 최근 10,000개의 주차장 상태 데이터만 마이그레이션

### 3단계: Python AI 모듈 테스트
```bash
cd backend/ai
python firestore_helper.py
```

### 4단계: 전체 시스템 테스트
```bash
cd backend/ai
python parking_prophet_firestore.py 37.5665 126.9780 5
```

## 🔄 Firestore 데이터 구조

### parking_lots 컬렉션
```javascript
{
  parking_code: "123456",
  parking_name: "주차장명",
  addr: "주소",
  lat_wgs84: 37.5665,
  lng_wgs84: 126.9780,
  tel: "전화번호",
  pay_yn_name: "유료/무료",
  weekday_begin: "09:00",
  weekday_end: "18:00",
  created_at: Timestamp,
  updated_at: Timestamp
}
```

### parking_status 컬렉션
```javascript
{
  parking_code: "123456",
  parking_name: "주차장명",
  capacity: 100,
  cur_parking: 80,
  cur_parking_time: "2024-01-01T12:00:00",
  parking_status_yn: "Y",
  parking_status_name: "운영중",
  collected_at: Timestamp,
  created_at: Timestamp
}
```

## 🔧 API 사용법 변경사항

### Before (SQLite)
```javascript
import { recommendParking } from './services/parkingAI.js';

// 기존 함수는 이제 Firestore를 사용
const result = await recommendParking([37.5665, 126.9780], 5);
```

### After (Firestore)
```javascript
import { recommendParkingWithAI, recommendParking } from './services/parkingAI.js';

// Firestore 기반 간단한 추천
const result = await recommendParking([37.5665, 126.9780], 5);

// Firestore + Prophet AI 추천
const aiResult = await recommendParkingWithAI([37.5665, 126.9780], 5);
```

## 🛠️ 새로운 Firestore 서비스 메서드

```javascript
import { firestoreService } from './services/firestoreService.js';

// 주차장 정보 저장
await firestoreService.saveParkingLot(parkingData);

// 주차장 상태 저장
await firestoreService.saveParkingStatus(statusData);

// 모든 주차장 조회
const lots = await firestoreService.getAllParkingLots();

// 특정 주차장 최신 상태
const status = await firestoreService.getLatestParkingStatus(parkingCode);

// 범위 내 주차장 검색
const nearbyLots = await firestoreService.getParkingLotsInRange(lat, lng, radiusKm);

// AI 모델 학습용 히스토리 데이터
const history = await firestoreService.getAllParkingStatusHistory(startDate, endDate);
```

## 📊 성능 및 비용 고려사항

### Firestore 장점
- ✅ 실시간 동기화
- ✅ 자동 확장
- ✅ 오프라인 지원
- ✅ 보안 규칙
- ✅ 다중 지역 복제

### 주의사항
- 📊 읽기/쓰기 작업 수에 따른 과금
- 🔍 복합 쿼리의 인덱스 필요
- 📈 대량 데이터 조회 시 비용 증가 가능

### 비용 최적화 권장사항
1. **배치 쓰기 사용**: 여러 문서를 한 번에 처리
2. **적절한 제한**: `limit()` 사용으로 불필요한 읽기 방지
3. **캐싱 전략**: 자주 조회하는 데이터는 메모리 캐시 활용
4. **쿼리 최적화**: 필요한 필드만 선택적으로 조회

## 🚨 트러블슈팅

### 1. Firebase 연결 실패
```bash
# 서비스 계정 키 파일 확인
ls -la backend/juchajang-fbcfe-firebase-adminsdk-fbsvc-5fee059275.json

# 환경변수 확인 (필요시)
echo $GOOGLE_APPLICATION_CREDENTIALS
```

### 2. Python 모듈 임포트 오류
```bash
# Firebase Admin SDK 재설치
pip uninstall firebase-admin
pip install firebase-admin

# 또는 conda 환경에서
conda activate juchajang-ai
pip install firebase-admin
```

### 3. 데이터 마이그레이션 실패
```bash
# SQLite 파일 존재 확인
ls -la backend/data/parking.db

# Firestore 권한 확인
node -e "
import('./src/config/firebase.js').then(({db}) => {
  console.log('Firestore 연결 성공:', !!db);
});
"
```

### 4. AI 모델 학습 실패
```bash
# Prophet 설치 확인
python -c "import prophet; print('Prophet 설치됨')"

# Firestore 데이터 확인
python backend/ai/firestore_helper.py
```

## 🎯 다음 단계 권장사항

1. **데이터 백업**: 정기적인 Firestore 데이터 백업 설정
2. **모니터링**: Firebase Console에서 사용량 모니터링
3. **보안 규칙**: Firestore 보안 규칙 설정
4. **인덱스 최적화**: 복합 쿼리를 위한 인덱스 생성
5. **로깅**: 상세한 로깅 시스템 구축

## 📞 도움이 필요한 경우

1. Firebase Console에서 프로젝트 상태 확인
2. 로그 파일 확인 (`console.log` 출력)
3. 마이그레이션 스크립트 재실행
4. Python 환경 재설정

---

**✨ 마이그레이션이 완료되었습니다!** 

이제 Firebase Firestore의 강력한 기능을 활용하여 확장 가능하고 실시간 동기화가 가능한 주차장 관리 시스템을 운영할 수 있습니다.