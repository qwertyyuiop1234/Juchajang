# 주차장 AI 추천 서비스

## 설명
Prophet 모델을 사용하여 주차장 혼잡도를 예측하고 최적의 주차장을 추천하는 AI 서비스입니다.

## Python 환경 설정

### 1. Python 3.8+ 설치 확인
```bash
python3 --version
```

### 2. 필요한 라이브러리 설치
```bash
pip3 install -r requirements.txt
```

### 3. 직접 실행 테스트
```bash
python3 parking_prophet.py 37.5665 126.9780 5
```

## API 사용법

### 기본 추천 (Prophet 없이)
```bash
POST /api/parking/recommend
{
  "destination_lat": 37.5665,
  "destination_lng": 126.9780,
  "num_recommendations": 5
}
```

### AI 추천 (Prophet 모델 사용)
```bash
POST /api/parking/recommend-ai
{
  "destination_lat": 37.5665,
  "destination_lng": 126.9780,
  "num_recommendations": 5,
  "prediction_time": "2024-08-16T14:30:00"
}
```

## 주요 특징

1. **Prophet 시계열 예측**: 주차장별 이용 패턴을 학습하여 미래 혼잡도 예측
2. **거리 기반 점수**: 목적지와의 거리를 고려한 추천
3. **혼잡도 점수**: 예상 주차 가능 공간을 기반으로 한 혼잡도 평가
4. **실시간 데이터**: 최신 주차장 상태 정보 활용

## 응답 형식

```json
{
  "success": true,
  "data": [
    {
      "parking_code": "171721",
      "parking_name": "세종로 공영주차장(시)",
      "addr": "종로구 세종로 80-1",
      "coordinates": [37.5733728, 126.9759147],
      "predicted_available": 88,
      "congestion_level": "Quiet",
      "congestion_rate": 69.84,
      "distance_km": 1.88,
      "total_score": 6.63,
      "tel": "02-2290-6566",
      "pay_yn_name": "유료"
    }
  ],
  "total_found": 150,
  "prediction_time": "2024-08-16T14:30:00.000Z",
  "models_trained": 120,
  "message": "Prophet 모델을 사용하여 5개의 주차장을 추천합니다."
}
```