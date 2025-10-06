# LSTM AI 주차장 추천 시스템 테스트 가이드

## 설치 및 실행

### 1. Python 패키지 설치
```bash
cd backend/ai_hakerton
pip install -r requirements.txt
```

### 2. 직접 테스트 (CLI)
```bash
# 서울 중심부 (광화문) 좌표로 테스트
python recommend.py 37.5665 126.9780

# 강남역 좌표로 테스트
python recommend.py 37.4979 127.0276
```

### 3. API 테스트

**서버 시작:**
```bash
cd backend
npm start
```

**API 요청 (Postman/curl):**
```bash
curl -X POST http://localhost:3000/api/parking/recommend-ai \
  -H "Content-Type: application/json" \
  -d '{
    "destination_lat": 37.5665,
    "destination_lng": 126.9780,
    "num_recommendations": 5
  }'
```

## 예상 응답 형식

```json
{
  "success": true,
  "data": [
    {
      "parking_code": "171900",
      "parking_name": "세종로 공영주차장",
      "addr": null,
      "coordinates": [37.5733, 126.9759],
      "predicted_available": null,
      "congestion_level": "Normal",
      "congestion_rate": "20.00",
      "distance_km": "1.23",
      "total_score": 0.85,
      "distance_score": 0.85,
      "tel": null,
      "pay_yn_name": null,
      "weekday_begin": null,
      "weekday_end": null,
      "price_rates": 3000
    }
  ],
  "total_found": 5,
  "message": "LSTM 모델을 사용하여 5개의 주차장을 추천합니다.",
  "prediction_time": "2025-01-10T12:00:00.000Z",
  "models_trained": 1
}
```

## 트러블슈팅

### 1. Python 경로 오류
- Windows: `python` 명령이 작동하는지 확인
- 환경변수 설정: `PYTHON_PATH=C:\Python311\python.exe`

### 2. Firebase 인증 오류
- `backend/ai_hakerton/key.json` 파일 존재 확인
- 파일 권한 확인

### 3. 모델 파일 없음
- `best_lstm_model.pth` 파일 존재 확인
- 모든 `.joblib` 스케일러 파일 존재 확인

### 4. CSV 파일 없음
- `parking_lots.csv` 파일 존재 확인
- Firestore에서 데이터 가져와서 생성 필요

## 프론트엔드 통합 테스트

1. 앱 시작 → AI 버튼 켜짐 (기본)
2. 현재 위치 주변 5개 주차장 표시 확인
3. 목적지 검색 → 해당 목적지 주변 5개 주차장 표시 확인
4. AI 버튼 끄기 → 거리 기반 추천으로 전환 확인

## 성능 지표

- 추천 응답 시간: < 5초
- Python 프로세스 타임아웃: 30초
- 추천 정확도: 거리(40%) + 가격(40%) + 혼잡도(20%)

