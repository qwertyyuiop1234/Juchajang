#!/usr/bin/env node

import { db } from '../src/config/firebase.js';

/**
 * Firestore parking_status 컬렉션 전체 삭제
 */
async function deleteAllParkingStatus() {
  console.log('🗑️  Firestore parking_status 컬렉션 전체 삭제를 시작합니다...');
  console.log('⚠️  이 작업은 되돌릴 수 없습니다!');
  
  try {
    let deletedCount = 0;
    let batchCount = 0;
    const batchSize = 500; // Firestore 배치 작업 제한
    
    while (true) {
      // 배치로 문서들을 가져오기
      const snapshot = await db.collection('parking_status').limit(batchSize).get();
      
      if (snapshot.empty) {
        console.log('✅ 삭제할 문서가 더 이상 없습니다.');
        break;
      }
      
      // 배치 삭제 준비
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // 배치 실행
      await batch.commit();
      
      deletedCount += snapshot.docs.length;
      batchCount++;
      
      console.log(`🔥 배치 ${batchCount}: ${snapshot.docs.length}개 문서 삭제 (총 ${deletedCount}개 삭제됨)`);
      
      // Firestore 요청 제한을 위한 짧은 대기
      if (batchCount % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n🎉 parking_status 컬렉션 삭제 완료!`);
    console.log(`📊 총 ${deletedCount}개 문서가 삭제되었습니다.`);
    
    // 삭제 확인
    const verifySnapshot = await db.collection('parking_status').limit(1).get();
    if (verifySnapshot.empty) {
      console.log('✅ 삭제 확인: parking_status 컬렉션이 비어있습니다.');
    } else {
      console.log('⚠️  삭제 확인: 아직 일부 문서가 남아있을 수 있습니다.');
    }
    
  } catch (error) {
    console.error('💥 삭제 실패:', error.message);
    process.exit(1);
  }
}

deleteAllParkingStatus();