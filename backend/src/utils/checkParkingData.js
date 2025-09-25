import { db } from '../config/firebase.js';

/**
 * parking_status 컬렉션의 데이터를 확인하는 스크립트
 */
async function checkParkingData() {
  try {
    console.log('🔍 parking_status 컬렉션 데이터 확인 중...');
    
    // 전체 데이터 조회
    const snapshot = await db.collection('parking_status').limit(10).get();
    
    if (snapshot.empty) {
      console.log('❌ parking_status 컬렉션에 데이터가 없습니다.');
      return;
    }
    
    console.log(`📊 총 ${snapshot.size}개의 문서 샘플:`);
    console.log('='.repeat(60));
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n📄 문서 ${index + 1} (ID: ${doc.id}):`);
      console.log(`- Parking_status_yn: ${data.Parking_status_yn} (타입: ${typeof data.Parking_status_yn})`);
      console.log(`- capacity: ${data.capacity} (타입: ${typeof data.capacity})`);
      console.log(`- name: ${data.name || '이름없음'}`);
      
      // 주요 필드들 확인
      const keys = Object.keys(data).slice(0, 10);
      console.log(`- 필드들: ${keys.join(', ')}`);
    });
    
    // 조건별 카운트 확인
    console.log('\n🔢 조건별 데이터 개수:');
    
    // Parking_status_yn = 1인 데이터
    const statusSnapshot = await db.collection('parking_status')
      .where('Parking_status_yn', '==', 1)
      .get();
    console.log(`- Parking_status_yn = 1: ${statusSnapshot.size}개`);
    
    // capacity >= 10인 데이터 (클라이언트 측 필터링으로 확인)
    const allSnapshot = await db.collection('parking_status').get();
    let capacityCount = 0;
    let bothConditionCount = 0;
    
    allSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.capacity >= 10) {
        capacityCount++;
      }
      if (data.Parking_status_yn === 1 && data.capacity >= 10) {
        bothConditionCount++;
      }
    });
    
    console.log(`- capacity >= 10: ${capacityCount}개`);
    console.log(`- 두 조건 모두 만족: ${bothConditionCount}개`);
    
  } catch (error) {
    console.error('❌ 데이터 확인 중 오류:', error);
  }
}

// 스크립트 직접 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  checkParkingData();
}

export default checkParkingData;