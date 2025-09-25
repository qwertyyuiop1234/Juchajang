import dotenv from 'dotenv';
import { db } from '../src/config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import axios from 'axios';

dotenv.config();

// 서울시 공영주차장 API 설정
const SEOUL_API_KEY = process.env.SEOUL_API_KEY;
const SEOUL_API_BASE_URL = 'http://openapi.seoul.go.kr:8088';

if (!SEOUL_API_KEY) {
  console.error('SEOUL_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

/**
 * 서울시 공영주차장 API에서 요금 정보 가져오기
 */
async function fetchSeoulParkingRates(start = 1, end = 1000) {
  try {
    const url = `${SEOUL_API_BASE_URL}/${SEOUL_API_KEY}/json/GetParkInfo/${start}/${end}/`;
    console.log(`서울시 API 호출: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 30000
    });

    if (response.data.GetParkInfo) {
      const result = response.data.GetParkInfo;
      
      if (result.RESULT && result.RESULT.CODE !== 'INFO-000') {
        throw new Error(`API 오류: ${result.RESULT.MESSAGE}`);
      }
      
      return result.row || [];
    }
    
    return [];
  } catch (error) {
    console.error('서울시 API 호출 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', error.response.data);
    }
    throw error;
  }
}

/**
 * Firebase에서 모든 주차장 정보 가져오기
 */
async function getAllParkingLots() {
  try {
    const snapshot = await db.collection('parking_lots').get();
    const parkingLots = [];
    
    snapshot.forEach(doc => {
      parkingLots.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return parkingLots;
  } catch (error) {
    console.error('Firebase 주차장 정보 조회 실패:', error);
    throw error;
  }
}

/**
 * Firebase 주차장 정보에 요금 정보 업데이트 (기존 필드 유지)
 */
async function updateParkingLotRates(parkingCode, rateData) {
  try {
    const docRef = db.collection('parking_lots').doc(parkingCode.toString());
    
    const updateData = {
      rates: rateData.PRK_CRG || null,
      time_rates: rateData.PRK_HM || null,
      add_rates: rateData.ADD_CRG || null,
      add_time_rates: rateData.ADD_UNIT_TM_MNT || null,
      rate_updated_at: FieldValue.serverTimestamp()
    };
    
    // update() 메서드는 기존 필드를 유지하면서 새로운 필드만 추가/업데이트
    await docRef.update(updateData);
    return true;
  } catch (error) {
    console.error(`주차장 ${parkingCode} 요금 정보 업데이트 실패:`, error);
    return false;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('=== 서울시 공영주차장 요금 정보 업데이트 시작 ===');
  
  try {
    // 1. Firebase에서 기존 주차장 정보 가져오기
    console.log('1. Firebase 주차장 정보 조회 중...');
    const firebaseParkingLots = await getAllParkingLots();
    console.log(`Firebase에서 ${firebaseParkingLots.length}개 주차장 발견`);
    
    // 2. 서울시 API에서 요금 정보 가져오기
    console.log('\n2. 서울시 API에서 요금 정보 조회 중...');
    
    let allApiData = [];
    let currentStart = 1;
    const batchSize = 1000;
    
    // API 데이터를 배치로 가져오기
    while (true) {
      const currentEnd = currentStart + batchSize - 1;
      console.log(`배치 ${Math.ceil(currentStart / batchSize)}: ${currentStart} ~ ${currentEnd}`);
      
      try {
        const batch = await fetchSeoulParkingRates(currentStart, currentEnd);
        
        if (batch.length === 0) {
          console.log('더 이상 데이터가 없습니다.');
          break;
        }
        
        allApiData = allApiData.concat(batch);
        console.log(`현재까지 수집된 API 데이터: ${allApiData.length}개`);
        
        currentStart = currentEnd + 1;
        
        // API 호출 간격 조절 (1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`배치 ${Math.ceil(currentStart / batchSize)} 처리 실패:`, error.message);
        break;
      }
    }
    
    console.log(`\n서울시 API에서 총 ${allApiData.length}개 주차장 데이터 수집 완료`);
    
    // API 데이터를 주차장 코드 기준으로 Map 생성
    const apiDataMap = new Map();
    allApiData.forEach(apiLot => {
      if (apiLot.PKLT_CD) {
        apiDataMap.set(apiLot.PKLT_CD.toString(), apiLot);
      }
    });
    
    // 3. 주차장 코드 매칭 및 업데이트
    console.log('\n3. 주차장 코드 매칭 및 요금 정보 업데이트 중...');
    
    let matchedCount = 0;
    let updatedCount = 0;
    
    for (const firebaseLot of firebaseParkingLots) {
      const parkingCode = firebaseLot.parking_code.toString();
      console.log(`\n처리 중: ${firebaseLot.parking_name} (${parkingCode})`);
      
      // API 데이터에서 동일한 주차장 코드 찾기
      const matchedApiData = apiDataMap.get(parkingCode);
      
      if (matchedApiData) {
        matchedCount++;
        console.log(`✓ 매칭됨: ${matchedApiData.PKLT_NM}`);
        
        // 요금 정보가 있는지 확인
        if (matchedApiData.PRK_CRG || matchedApiData.PRK_HM || 
            matchedApiData.ADD_CRG || matchedApiData.ADD_UNIT_TM_MNT) {
          
          console.log(`요금 정보 업데이트 중...`);
          console.log(`- 기본요금: ${matchedApiData.PRK_CRG}`);
          console.log(`- 기본시간: ${matchedApiData.PRK_HM}`);
          console.log(`- 추가요금: ${matchedApiData.ADD_CRG}`);
          console.log(`- 추가시간: ${matchedApiData.ADD_UNIT_TM_MNT}`);
          
          const success = await updateParkingLotRates(parkingCode, matchedApiData);
          if (success) {
            updatedCount++;
            console.log(`✓ 업데이트 완료`);
          } else {
            console.log(`✗ 업데이트 실패`);
          }
        } else {
          console.log(`요금 정보가 없습니다.`);
        }
      } else {
        console.log(`✗ 매칭되지 않음 (주차장 코드: ${parkingCode})`);
      }
      
      // Firebase 쓰기 제한을 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n=== 업데이트 완료 ===');
    console.log(`Firebase 주차장: ${firebaseParkingLots.length}개`);
    console.log(`서울시 API 주차장: ${allApiData.length}개`);
    console.log(`매칭된 주차장: ${matchedCount}개`);
    console.log(`업데이트된 주차장: ${updatedCount}개`);
    
  } catch (error) {
    console.error('프로세스 실행 중 오류:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main().then(() => {
  console.log('프로세스가 완료되었습니다.');
  process.exit(0);
}).catch(error => {
  console.error('프로세스 실행 실패:', error);
  process.exit(1);
});