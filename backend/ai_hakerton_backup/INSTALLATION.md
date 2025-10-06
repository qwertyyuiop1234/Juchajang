# 설치 및 초기 설정 가이드

## 1단계: Python 패키지 설치

```bash
cd backend/ai_hakerton
pip install -r requirements.txt
```

## 2단계: Firebase 인증 파일 확인

`key.json` 파일이 `backend/ai_hakerton/` 디렉토리에 있는지 확인하세요.
✅ 이미 있음!

## 3단계: parking_lots.csv 생성 (필수!)

이 단계는 **반드시 실행**해야 합니다!

```bash
python setup_csv.py
```

이 스크립트는:
- Firestore에서 주차장 데이터를 가져옵니다
- `parking_lots.csv` 파일을 생성합니다
- `data.csv` 파일도 함께 생성합니다

**실행 결과 예시:**
```
🚀 Firestore에서 parking_lots.csv 생성 중...
✅ DataFrame이 'parking_lots.csv'으로 성공적으로 저장되었습니다.
✅ DataFrame이 'data.csv'으로 성공적으로 저장되었습니다.
✅ parking_lots.csv 파일이 성공적으로 생성되었습니다!
💡 이제 recommend.py를 사용할 수 있습니다.
```

## 4단계: 테스트

### CLI 테스트
```bash
python recommend.py 37.5665 126.9780
```

**성공 응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "parking_code": "171900",
      "parking_name": "세종로 공영주차장",
      "lat": 37.5733,
      "lon": 126.9759,
      "distance_index": 0.00015,
      "price_rates": 3000,
      "congestion_metric": 0.2,
      "final_score": 0.85
    }
  ],
  "message": "5개의 주차장을 추천합니다."
}
```

### Node.js API 테스트

1. 백엔드 서버 시작:
```bash
cd backend
npm start
```

2. API 요청:
```bash
curl -X POST http://localhost:3000/api/parking/recommend-ai \
  -H "Content-Type: application/json" \
  -d '{
    "destination_lat": 37.5665,
    "destination_lng": 126.9780
  }'
```

## 문제 해결

### "parking_lots.csv를 찾을 수 없습니다"
→ `python setup_csv.py` 실행

### "Firebase 초기화 오류"
→ `key.json` 파일이 있는지 확인

### "모델 파일을 찾을 수 없습니다"
→ `best_lstm_model.pth`와 `*.joblib` 파일들이 있는지 확인

### Python 경로 오류 (Windows)
→ 환경변수 설정: `set PYTHON_PATH=C:\Python311\python.exe`

## 완료!

이제 프론트엔드에서 AI 버튼을 눌러 LSTM 기반 주차장 추천을 받을 수 있습니다! 🎉

