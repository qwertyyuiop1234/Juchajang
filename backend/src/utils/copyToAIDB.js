import { db } from '../config/firebase.js';

/**
 * parking_status 컬렉션에서 조건에 맞는 문서들을 
 * ai_training_parking_data 컬렉션으로 복사
 * 조건: Parking_status_yn = 1 AND capacity >= 10
 */
async function copyToAIDB() {
  try {
    console.log('🔍 조건에 맞는 parking_status 데이터 조회 중...');
    
    // 원본 컬렉션에서 조건에 맞는 데이터 조회 (인덱스 오류 방지를 위해 단계별 필터링)
    const snapshot = await db.collection('parking_status')
      .where('parking_status_yn', '==', '1')
      .get();

    if (snapshot.empty) {
      console.log('❌ 조건에 맞는 데이터가 없습니다.');
      return;
    }

    console.log(`✅ ${snapshot.size}개의 문서를 찾았습니다.`);
    
    // AI 연습용 컬렉션 참조
    const aiCollectionRef = db.collection('ai_training_parking_data');
    
    console.log('📝 ai_training_parking_data 컬렉션으로 복사 중...');
    
    // 조건에 맞는 문서들을 배열로 수집
    const docsToProcess = [];
    snapshot.forEach((doc) => {
      const docData = doc.data();
      
      // capacity >= 10 조건 확인
      if (docData.capacity && docData.capacity >= 10) {
        docsToProcess.push({ id: doc.id, data: docData });
      }
    });
    
    console.log(`🔍 capacity >= 10 조건으로 필터링 후: ${docsToProcess.length}개 문서`);
    
    // 배치 크기 (Firestore 배치 제한: 500개)
    const BATCH_SIZE = 450;
    let processedCount = 0;
    
    // 배치별로 처리
    for (let i = 0; i < docsToProcess.length; i += BATCH_SIZE) {
      const batchDocs = docsToProcess.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      
      batchDocs.forEach((docInfo) => {
        const newDocRef = aiCollectionRef.doc(docInfo.id);
        batch.set(newDocRef, docInfo.data);
      });
      
      await batch.commit();
      processedCount += batchDocs.length;
      
      console.log(`✅ 배치 ${Math.floor(i / BATCH_SIZE) + 1} 완료: ${processedCount}/${docsToProcess.length} 문서 처리됨`);
    }
    
    console.log(`🎉 완료! ${processedCount}개의 문서가 ai_training_parking_data 컬렉션에 복사되었습니다.`);
    
    return {
      success: true,
      copiedCount: processedCount
    };

  } catch (error) {
    console.error('❌ 복사 중 오류 발생:', error);
    throw error;
  }
}

// 스크립트 직접 실행시
if (import.meta.url === `file://${process.argv[1]}`) {
  copyToAIDB()
    .then((result) => {
      console.log(`\n✨ 총 ${result.copiedCount}개의 문서가 AI 연습용 DB에 저장되었습니다!`);
    })
    .catch((error) => {
      console.error('💥 실행 실패:', error.message);
      process.exit(1);
    });
}

export default copyToAIDB;