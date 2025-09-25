import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const SEOUL_API_KEY = process.env.SEOUL_API_KEY;
const SEOUL_API_BASE_URL = 'http://openapi.seoul.go.kr:8088';

async function debugApiData() {
  try {
    const url = `${SEOUL_API_BASE_URL}/${SEOUL_API_KEY}/json/GetParkInfo/1/10/`;
    console.log(`API 호출: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 30000
    });

    if (response.data.GetParkInfo && response.data.GetParkInfo.row) {
      const items = response.data.GetParkInfo.row;
      
      console.log(`\n총 ${items.length}개 항목 중 처음 3개 샘플:`);
      
      items.slice(0, 3).forEach((item, index) => {
        console.log(`\n=== 샘플 ${index + 1} ===`);
        console.log('PARKING_CODE:', item.PARKING_CODE);
        console.log('PARKING_NAME:', item.PARKING_NAME);
        console.log('ADDR:', item.ADDR);
        console.log('BSC_PRK_CRG:', item.BSC_PRK_CRG);
        console.log('BSC_PRK_HR:', item.BSC_PRK_HR);
        console.log('ADD_PRK_CRG:', item.ADD_PRK_CRG);
        console.log('ADD_PRK_HR:', item.ADD_PRK_HR);
        console.log('전체 필드들:', Object.keys(item));
      });
    } else {
      console.log('API 응답에서 데이터를 찾을 수 없습니다.');
      console.log('전체 응답:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('API 호출 실패:', error.message);
    if (error.response) {
      console.error('응답 상태:', error.response.status);
      console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugApiData();