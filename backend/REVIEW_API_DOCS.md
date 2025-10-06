# 리뷰 API 문서

## 개요
주차장 리뷰 기능을 위한 REST API입니다. 리뷰 작성, 조회, 수정, 삭제 기능을 제공합니다.

## 기본 URL
```
http://localhost:3000/api/review
```

## API 엔드포인트

### 1. 리뷰 작성
**POST** `/api/review`

#### 요청 본문
```json
{
  "parkingId": "123",
  "parkingName": "강남역 지하주차장",
  "userId": "user123", // 선택사항
  "rating": 5,
  "reviewText": "매우 좋은 주차장입니다. 깨끗하고 안전합니다.",
  "categories": ["price_cheap", "space_wide", "safety_good"]
}
```

#### 응답
```json
{
  "success": true,
  "message": "리뷰가 성공적으로 저장되었습니다.",
  "data": {
    "success": true,
    "id": "review_id_here"
  }
}
```

### 2. 주차장별 리뷰 목록 조회
**GET** `/api/review/parking/:parkingId`

#### 쿼리 파라미터
- `limit`: 페이지당 리뷰 수 (기본값: 20)
- `offset`: 건너뛸 리뷰 수 (기본값: 0)

#### 예시
```
GET /api/review/parking/123?limit=10&offset=0
```

#### 응답
```json
{
  "success": true,
  "data": [
    {
      "id": "review_id",
      "parking_id": "123",
      "parking_name": "강남역 지하주차장",
      "user_id": "user123",
      "rating": 5,
      "review_text": "매우 좋은 주차장입니다.",
      "categories": ["price_cheap", "safety_good"],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

### 3. 주차장별 리뷰 통계 조회
**GET** `/api/review/parking/:parkingId/stats`

#### 예시
```
GET /api/review/parking/123/stats
```

#### 응답
```json
{
  "success": true,
  "data": {
    "totalReviews": 15,
    "averageRating": 4.2,
    "categoryStats": {
      "price_cheap": 12,
      "space_wide": 8,
      "safety_good": 5,
      "price_expensive": 2,
      "space_narrow": 1
    },
    "ratingDistribution": {
      "1": 0,
      "2": 1,
      "3": 2,
      "4": 8,
      "5": 4
    }
  }
}
```

### 4. 사용자별 리뷰 목록 조회
**GET** `/api/review/user/:userId`

#### 쿼리 파라미터
- `limit`: 페이지당 리뷰 수 (기본값: 20)
- `offset`: 건너뛸 리뷰 수 (기본값: 0)

#### 예시
```
GET /api/review/user/user123?limit=5&offset=0
```

### 5. 리뷰 수정
**PUT** `/api/review/:reviewId`

#### 요청 본문
```json
{
  "rating": 4,
  "reviewText": "수정된 리뷰 내용입니다.",
  "categories": ["price_cheap", "convenience_good"]
}
```

#### 응답
```json
{
  "success": true,
  "message": "리뷰가 성공적으로 수정되었습니다.",
  "data": {
    "success": true,
    "id": "review_id"
  }
}
```

### 6. 리뷰 삭제
**DELETE** `/api/review/:reviewId`

#### 예시
```
DELETE /api/review/review_id_here
```

#### 응답
```json
{
  "success": true,
  "message": "리뷰가 성공적으로 삭제되었습니다.",
  "data": {
    "success": true,
    "id": "review_id"
  }
}
```

### 7. 서비스 상태 확인
**GET** `/api/review/health`

#### 응답
```json
{
  "success": true,
  "message": "리뷰 서비스가 정상 작동 중입니다.",
  "timestamp": "2024-01-15T10:30:00Z",
  "endpoints": {
    "create": "POST /api/review",
    "getByParking": "GET /api/review/parking/:parkingId",
    "getStats": "GET /api/review/parking/:parkingId/stats",
    "getByUser": "GET /api/review/user/:userId",
    "update": "PUT /api/review/:reviewId",
    "delete": "DELETE /api/review/:reviewId"
  }
}
```

## 카테고리 목록
리뷰 작성 시 사용할 수 있는 카테고리들:

### 긍정적 카테고리 (좋았던 점)
- `price_cheap`: 💵 요금이 저렴해요
- `space_wide`: 🚗 주차 공간이 넓어요
- `congestion_low`: ✅ 자리가 넉넉해요
- `accessibility_good`: 🚶‍♀️ 목적지와 가까워요
- `safety_good`: ✨ 밝고 안전해요
- `convenience_good`: 🅿️ 입/출차가 편해요
- `ev_charging`: 🔌 전기차 충전 가능해요
- `facilities_good`: 👩‍🦽 편의시설이 잘 돼있어요

### 부정적 카테고리 (아쉬웠던 점)
- `price_expensive`: 💰 요금이 비싸요
- `space_narrow`: 🚗 주차 공간이 좁아요
- `congestion_high`: 🈵 자리가 항상 부족해요
- `accessibility_bad`: 🗺️ 찾아가기 어려워요
- `safety_bad`: 🌙 어둡고 무서워요
- `convenience_bad`: 🚧 입/출차가 불편해요
- `maintenance_bad`: 🧹 시설이 낡았어요

### 기존 카테고리 (하위 호환성)
- `cleanliness`: 청결도
- `safety`: 안전성
- `accessibility`: 접근성
- `price`: 가격
- `service`: 서비스
- `facility`: 시설

## 에러 응답
모든 API는 에러 발생 시 다음과 같은 형식으로 응답합니다:

```json
{
  "success": false,
  "message": "에러 메시지",
  "error": "상세 에러 정보 (개발 환경에서만)"
}
```

## 유효성 검사
- 평점: 1-5 사이의 정수
- 리뷰 내용: 최소 10자, 최대 500자
- 주차장 ID: 필수
- 주차장 이름: 필수

## 테스트 방법
```bash
# 서비스 상태 확인
curl http://localhost:3000/api/review/health

# 리뷰 작성 테스트
curl -X POST http://localhost:3000/api/review \
  -H "Content-Type: application/json" \
  -d '{
    "parkingId": "123",
    "parkingName": "테스트 주차장",
    "rating": 5,
    "reviewText": "테스트 리뷰입니다. 매우 좋은 주차장이에요!",
    "categories": ["price_cheap", "safety_good"]
  }'
```
