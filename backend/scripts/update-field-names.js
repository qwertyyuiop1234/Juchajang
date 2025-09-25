import dotenv from 'dotenv';
import { db } from '../src/config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

dotenv.config();

/**
 * 필드명 변경: time_rates -> time_rate, add_time_rates -> add_time_rate
 */
async function updateFieldNames() {
  console.log('=== 주차장 필드명 변경 시작 ===');
  
  try {
    // Firebase에서 모든 주차장 정보 가져오기
    console.log('주차장 정보 조회 중...');
    const snapshot = await db.collection('parking_lots').get();
    
    console.log(`총 ${snapshot.size}개 주차장 발견`);
    
    let updatedCount = 0;
    let processedCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      processedCount++;
      
      console.log(`\n[${processedCount}/${snapshot.size}] 처리 중: ${data.parking_name || '이름 없음'} (${doc.id})`);
      
      // time_rates 또는 add_time_rates 필드가 있는지 확인
      const hasOldFields = data.time_rates !== undefined || data.add_time_rates !== undefined;
      
      if (hasOldFields) {
        console.log('  필드명 변경 필요');
        
        const updateData = {};
        
        // 새 필드 추가
        if (data.time_rates !== undefined) {
          updateData.time_rate = data.time_rates;
          console.log(`  time_rates (${data.time_rates}) -> time_rate`);
        }
        
        if (data.add_time_rates !== undefined) {
          updateData.add_time_rate = data.add_time_rates;
          console.log(`  add_time_rates (${data.add_time_rates}) -> add_time_rate`);
        }
        
        // 기존 필드 삭제
        if (data.time_rates !== undefined) {
          updateData.time_rates = FieldValue.delete();
        }
        
        if (data.add_time_rates !== undefined) {
          updateData.add_time_rates = FieldValue.delete();
        }
        
        // 업데이트 실행
        try {
          await doc.ref.update(updateData);
          updatedCount++;
          console.log('  ✓ 업데이트 완료');
        } catch (error) {
          console.error(`  ✗ 업데이트 실패: ${error.message}`);
        }
        
        // Firebase 쓰기 제한을 위한 짧은 대기
        await new Promise(resolve => setTimeout(resolve, 50));
      } else {
        console.log('  변경할 필드 없음');
      }
    }
    
    console.log('\n=== 필드명 변경 완료 ===');
    console.log(`총 주차장: ${snapshot.size}개`);
    console.log(`업데이트된 주차장: ${updatedCount}개`);
    
  } catch (error) {
    console.error('프로세스 실행 중 오류:', error);
    throw error;
  }
}

// 스크립트 실행
updateFieldNames().then(() => {
  console.log('프로세스가 완료되었습니다.');
  process.exit(0);
}).catch(error => {
  console.error('프로세스 실행 실패:', error);
  process.exit(1);
});