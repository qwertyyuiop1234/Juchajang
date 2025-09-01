# 토스페이먼츠 결제 API 문서

## 개요
토스페이먼츠를 사용한 주차장 결제 시스템 API입니다. 주차장 예약, 주차권 구매 등의 결제 기능을 제공합니다.

## 기본 URL
```
http://localhost:3000/api/payment
```

## API 엔드포인트

### 1. 결제 요청 생성
**POST** `/api/payment/create`

#### 요청 본문
```json
{
  "amount": 5000,
  "orderName": "주차장 예약",
  "customerName": "홍길동",
  "customerEmail": "hong@example.com",
  "customerPhone": "010-1234-5678",
  "productType": "parking_reservation",
  "parkingId": "123",
  "parkingName": "강남역 지하주차장",
  "userId": "user123"
}
```

#### 응답
```json
{
  "success": true,
  "message": "결제 요청이 생성되었습니다.",
  "data": {
    "success": true,
    "orderId": "reservation_123_1705123456789",
    "paymentData": {
      "amount": 5000,
      "orderId": "reservation_123_1705123456789",
      "orderName": "강남역 지하주차장 예약 (2시간)",
      "customerName": "홍길동",
      "customerEmail": "hong@example.com",
      "customerPhone": "010-1234-5678",
      "successUrl": "http://localhost:3000/payment/success",
      "failUrl": "http://localhost:3000/payment/fail",
      "windowTarget": "iframe",
      "useInternationalCardOnly": false,
      "flowMode": "DEFAULT",
      "easyPay": "TOSSPAY"
    },
    "clientKey": "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq"
  }
}
```

### 2. 주차장 예약 결제 요청
**POST** `/api/payment/reservation`

#### 요청 본문
```json
{
  "parkingId": "123",
  "parkingName": "강남역 지하주차장",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T12:00:00Z",
  "duration": 2,
  "amount": 6000,
  "userId": "user123",
  "customerName": "홍길동",
  "customerEmail": "hong@example.com",
  "customerPhone": "010-1234-5678"
}
```

### 3. 주차권 구매 결제 요청
**POST** `/api/payment/ticket`

#### 요청 본문
```json
{
  "ticketType": "1시간",
  "quantity": 5,
  "amount": 15000,
  "userId": "user123",
  "customerName": "홍길동",
  "customerEmail": "hong@example.com",
  "customerPhone": "010-1234-5678"
}
```

### 4. 결제 승인 처리
**POST** `/api/payment/confirm`

#### 요청 본문
```json
{
  "paymentKey": "payment_key_here",
  "orderId": "reservation_123_1705123456789",
  "amount": 5000
}
```

#### 응답
```json
{
  "success": true,
  "message": "결제가 성공적으로 완료되었습니다.",
  "data": {
    "success": true,
    "paymentId": "payment_id_here",
    "orderId": "reservation_123_1705123456789",
    "amount": 5000
  }
}
```

### 5. 결제 취소
**POST** `/api/payment/cancel`

#### 요청 본문
```json
{
  "paymentKey": "payment_key_here",
  "cancelReason": "사용자 요청"
}
```

#### 응답
```json
{
  "success": true,
  "message": "결제가 성공적으로 취소되었습니다.",
  "data": {
    "success": true,
    "paymentKey": "payment_key_here",
    "cancelReason": "사용자 요청"
  }
}
```

### 6. 결제 내역 조회
**GET** `/api/payment/history/:userId`

#### 쿼리 파라미터
- `limit`: 페이지당 결제 수 (기본값: 20)
- `offset`: 건너뛸 결제 수 (기본값: 0)

#### 예시
```
GET /api/payment/history/user123?limit=10&offset=0
```

#### 응답
```json
{
  "success": true,
  "data": [
    {
      "id": "order_id",
      "orderId": "reservation_123_1705123456789",
      "orderName": "강남역 지하주차장 예약 (2시간)",
      "amount": 6000,
      "productType": "parking_reservation",
      "parkingId": "123",
      "parkingName": "강남역 지하주차장",
      "userId": "user123",
      "customerName": "홍길동",
      "customerEmail": "hong@example.com",
      "customerPhone": "010-1234-5678",
      "status": "PAID",
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

### 7. 특정 주문 조회
**GET** `/api/payment/order/:orderId`

#### 예시
```
GET /api/payment/order/reservation_123_1705123456789
```

### 8. 서비스 상태 확인
**GET** `/api/payment/health`

#### 응답
```json
{
  "success": true,
  "message": "토스페이먼츠 결제 서비스가 정상 작동 중입니다.",
  "timestamp": "2024-01-15T10:30:00Z",
  "endpoints": {
    "create": "POST /api/payment/create",
    "confirm": "POST /api/payment/confirm",
    "cancel": "POST /api/payment/cancel",
    "history": "GET /api/payment/history/:userId",
    "order": "GET /api/payment/order/:orderId",
    "reservation": "POST /api/payment/reservation",
    "ticket": "POST /api/payment/ticket"
  }
}
```

## 상품 타입

### 지원하는 상품 타입
- `parking_reservation`: 주차장 예약
- `parking_ticket`: 주차권 구매
- `premium_service`: 프리미엄 서비스
- `monthly_subscription`: 월 구독

## 결제 상태

### 결제 상태 목록
- `READY`: 결제 준비
- `IN_PROGRESS`: 결제 진행중
- `DONE`: 결제 완료
- `CANCELED`: 결제 취소
- `PARTIAL_CANCELED`: 부분 취소
- `ABORTED`: 결제 중단
- `FAILED`: 결제 실패

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
- 결제 금액: 0보다 큰 정수
- 주문명: 필수
- 고객명: 필수
- 이메일 또는 전화번호: 둘 중 하나는 필수

## 테스트 방법

### 1. 서비스 상태 확인
```bash
curl http://localhost:3000/api/payment/health
```

### 2. 주차장 예약 결제 테스트
```bash
curl -X POST http://localhost:3000/api/payment/reservation \
  -H "Content-Type: application/json" \
  -d '{
    "parkingId": "123",
    "parkingName": "테스트 주차장",
    "startTime": "2024-01-15T10:00:00Z",
    "endTime": "2024-01-15T12:00:00Z",
    "duration": 2,
    "amount": 6000,
    "userId": "user123",
    "customerName": "홍길동",
    "customerEmail": "hong@example.com",
    "customerPhone": "010-1234-5678"
  }'
```

### 3. 주차권 구매 결제 테스트
```bash
curl -X POST http://localhost:3000/api/payment/ticket \
  -H "Content-Type: application/json" \
  -d '{
    "ticketType": "1시간",
    "quantity": 5,
    "amount": 15000,
    "userId": "user123",
    "customerName": "홍길동",
    "customerEmail": "hong@example.com",
    "customerPhone": "010-1234-5678"
  }'
```

## 프론트엔드 연동

### 결제 테스트 화면 접근
```
/payment?parkingId=123&parkingName=강남역 지하주차장
```

### 토스페이먼츠 SDK 연동 (향후 구현)
```javascript
// 실제 토스페이먼츠 SDK 연동 시 구현 예정
const tossPayments = TossPayments(clientKey);
tossPayments.requestPayment('card', {
  amount: 5000,
  orderId: 'order_id',
  orderName: '주차장 예약',
  customerName: '홍길동',
  customerEmail: 'hong@example.com',
  successUrl: 'http://localhost:3000/payment/success',
  failUrl: 'http://localhost:3000/payment/fail',
});
```

## 주의사항
- 현재는 테스트 모드로 설정되어 있습니다.
- 실제 운영 시에는 토스페이먼츠 실제 API 키로 변경해야 합니다.
- 결제 승인 처리는 실제 토스페이먼츠 API와 연동해야 합니다.
- 보안을 위해 결제 검증 로직을 추가해야 합니다.
