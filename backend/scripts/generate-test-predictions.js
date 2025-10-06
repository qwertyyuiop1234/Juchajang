import { db } from '../src/config/firebase.js';

/**
 * 테스트용 예측 데이터 생성 스크립트
 */
async function generateTestPredictions() {
  try {
    console.log('🔧 테스트용 예측 데이터 생성 중...');
    
    // 테스트할 주차장 코드들
    const testParkingCodes = ['171900', '3187200', '1234567'];
    
    for (const parkingCode of testParkingCodes) {
      console.log(`📊 주차장 ${parkingCode} 예측 데이터 생성 중...`);
      
      // 기본 주차장 정보 (실제 데이터가 있다면 가져오기)
      const capacity = 100; // 기본값
      const parkingName = `테스트 주차장 ${parkingCode}`;
      
      // 168시간 예측 데이터 생성 (7일 * 24시간)
      const predictions = [];
      const baseTime = new Date();
      baseTime.setHours(0, 0, 0, 0); // 오늘 자정부터 시작
      
      for (let i = 1; i <= 168; i++) {
        const predictionTime = new Date(baseTime);
        predictionTime.setHours(baseTime.getHours() + i);
        
        // 시간대별 패턴 시뮬레이션
        const hour = predictionTime.getHours();
        const dayOfWeek = predictionTime.getDay();
        
        let baseAvailability;
        
        // 요일별 기본 패턴
        if (dayOfWeek === 0 || dayOfWeek === 6) { // 주말
          baseAvailability = 0.7; // 70% 가용
        } else { // 평일
          baseAvailability = 0.5; // 50% 가용
        }
        
        // 시간대별 변동
        if (hour >= 9 && hour <= 18) { // 업무시간
          baseAvailability -= 0.2; // 더 혼잡
        } else if (hour >= 22 || hour <= 6) { // 심야
          baseAvailability += 0.3; // 더 여유
        }
        
        // 랜덤 변동 추가
        const randomVariation = (Math.random() - 0.5) * 0.2; // ±10%
        const finalAvailability = Math.max(0.1, Math.min(0.95, baseAvailability + randomVariation));
        
        const available = Math.round(capacity * finalAvailability);
        
        // 혼잡도 결정
        let congestion;
        if (finalAvailability >= 0.8) {
          congestion = 'Normal';
        } else if (finalAvailability >= 0.5) {
          congestion = 'Busy';
        } else {
          congestion = 'Congested';
        }
        
        predictions.push({
          time: predictionTime.toISOString(),
          available: available,
          congestion: congestion
        });
      }
      
      // Firestore에 저장할 데이터 구조
      const predictionData = {
        parking_code: parkingCode,
        parking_name: parkingName,
        capacity: capacity,
        last_updated: new Date().toISOString(),
        predictions: predictions
      };
      
      // Firestore에 저장
      const docRef = db.collection('parking_prediction').doc(parkingCode);
      await docRef.set(predictionData);
      
      console.log(`✅ 주차장 ${parkingCode} 예측 데이터 저장 완료 (${predictions.length}개 예측)`);
    }
    
    console.log('🎉 모든 테스트 예측 데이터 생성 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 예측 데이터 생성 실패:', error);
  }
}

// 스크립트 실행
generateTestPredictions().then(() => {
  console.log('📝 스크립트 실행 완료');
  process.exit(0);
}).catch((error) => {
  console.error('💥 스크립트 실행 오류:', error);
  process.exit(1);
});
