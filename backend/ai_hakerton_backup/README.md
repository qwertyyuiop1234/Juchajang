# LSTM AI 주차장 추천 시스템

## 설치 방법

### 1. Python 패키지 설치
```bash
pip install -r requirements.txt
```

### 2. 필수 파일 생성

#### parking_lots.csv 생성 (필수!)
```bash
python setup_csv.py
```
이 스크립트는 Firestore에서 주차장 데이터를 가져와 CSV 파일을 생성합니다.

#### key.json 확인
`key.json` 파일이 ai_hakerton 디렉토리에 있는지 확인하세요.
(이미 있음)

## 사용 방법

### CLI로 직접 테스트
```bash
# 서울 광화문 기준 추천
python recommend.py 37.5665 126.9780

# 강남역 기준 추천
python recommend.py 37.4979 127.0276
```

### Node.js API를 통한 사용
API 엔드포인트: `POST /api/parking/recommend-ai`

```bash
curl -X POST http://localhost:3000/api/parking/recommend-ai \
  -H "Content-Type: application/json" \
  -d '{
    "destination_lat": 37.5665,
    "destination_lng": 126.9780,
    "num_recommendations": 5
  }'
```

## 파일 설명

- `recommend.py`: 주차장 추천 메인 스크립트
- `model.py`: LSTM 모델 정의
- `preprocessing.py`: 데이터 전처리 및 Firestore 연동
- `setup_csv.py`: CSV 파일 생성 스크립트 (초기 설정용)
- `key.json`: Firebase 인증 키
- `*.joblib`: 스케일러 파일들
- `best_lstm_model.pth`: 학습된 LSTM 모델

## 추천 알고리즘

LSTM 기반 추천 시스템은 다음 요소를 고려합니다:

- **거리** (40%): 목적지와 주차장 간 거리
- **가격** (40%): 주차 요금
- **혼잡도** (20%): 예상 혼잡도 (Firestore에서 가져옴)

## 트러블슈팅

### 1. "parking_lots.csv를 찾을 수 없습니다"
```bash
python setup_csv.py
```

### 2. "Firebase 초기화 오류"
- `key.json` 파일이 있는지 확인
- Firestore 데이터베이스 접근 권한 확인

### 3. "모델 파일을 찾을 수 없습니다"
- `best_lstm_model.pth` 파일 확인
- `*.joblib` 스케일러 파일들 확인

## 성능

- 평균 응답 시간: < 5초
- 타임아웃: 30초
- 추천 개수: 5개 (고정)

