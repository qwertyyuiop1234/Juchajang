import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import axios from "axios";
import { firestoreService } from './firestoreService.js';
import { ReviewService } from './reviewService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Haversine 공식을 사용한 거리 계산 (km)
 */
function haversineDistance(coord1, coord2) {
  if (!coord1 || !coord2 || coord1.length !== 2 || coord2.length !== 2) {
    return null;
  }

  const R = 6371.0; // 지구 반지름 (km)
  const [lat1, lon1] = coord1.map((deg) => (deg * Math.PI) / 180);
  const [lat2, lon2] = coord2.map((deg) => (deg * Math.PI) / 180);

  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * 간단한 혼잡도 예측 (통계적 접근)
 */
function predictCongestion(capacity, currentParking) {
  if (!capacity || capacity <= 0) return "Unknown";

  const availableSpaces = capacity - (currentParking || 0);
  const availabilityRate = (availableSpaces / capacity) * 100;

  if (availabilityRate <= 10) return "Congested";
  if (availabilityRate <= 30) return "Normal";
  return "Quiet";
}

/**
 * 좌표 문자열을 배열로 변환
 */
function parseCoordinates(coordString) {
  if (!coordString || typeof coordString !== "string") return null;

  try {
    const [lat, lng] = coordString.split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lat, lng];
  } catch (error) {
    return null;
  }
}

/**
 * 네이버 검색 API를 사용해 주소의 좌표 가져오기
 */
async function getCoordinatesFromAddress(address) {
  try {
    const response = await axios.get(
      "https://openapi.naver.com/v1/search/local.json",
      {
        params: {
          query: address,
          display: 1,
          start: 1,
          sort: "random",
        },
        headers: {
          "X-Naver-Client-Id": process.env.NAVER_CLIENT_LOCAL_ID,
          "X-Naver-Client-Secret": process.env.NAVER_CLIENT_LOCAL_SECRET,
        },
      }
    );

    if (response.data.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      // 네이버 API는 경도(mapx), 위도(mapy) 순서로 반환 (10^7 배율)
      // 문자열로 올 수 있으므로 parseInt로 변환
      const lng = parseInt(item.mapx) / 10000000;
      const lat = parseInt(item.mapy) / 10000000;
      return [lat, lng];
    }

    return null;
  } catch (error) {
    console.error("네이버 API 좌표 요청 실패:", error);
    return null;
  }
}

/**
 * LSTM 모델을 사용한 AI 주차장 추천 (recommend.py)
 */
export async function recommendParkingWithAI(
  destinationCoords,
  numRecommendations = 5
) {
  return new Promise(async (resolve, reject) => {
    const pythonScriptPath = path.join(
      __dirname,
      "../../ai_hakerton/recommend.py"
    );
    const [lat, lng] = destinationCoords;

    // Python 스크립트 실행 인자
    const args = [
      pythonScriptPath,
      lat.toString(),
      lng.toString(),
    ];

    // Python 실행 경로 (환경 변수 우선, 기본값 설정)
    const pythonPath = process.env.PYTHON_PATH || 'python';
    
    // 작업 디렉토리를 ai_hakerton으로 설정 (key.json 접근용)
    const workingDir = path.join(__dirname, "../../ai_hakerton");
    
    console.log("🤖 LSTM AI 추천 시작:", { lat, lng, pythonPath, workingDir });
    
    const pythonProcess = spawn(pythonPath, args, {
      cwd: workingDir,
      env: { 
        ...process.env, 
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
        LC_ALL: 'ko_KR.UTF-8'
      }
    });
    
    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString('utf-8');
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString('utf-8');
    });

    pythonProcess.on("close", async (code) => {
      if (code !== 0) {
        console.error("❌ Python script stderr:", stderr);
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        console.log("✅ LSTM AI 추천 성공:", result);
        
        // 프론트엔드 호환성을 위해 응답 형식 변환 및 리뷰 통계 추가
        if (result.success && result.data) {
          // 병렬로 리뷰 통계와 주차장 상세 정보 조회
          const enhancedData = await Promise.all(
            result.data.map(async (lot) => {
              let average_rating = 0;
              let total_reviews = 0;
              let capacity = 0;
              let cur_parking = 0;
              let available_spaces = 0;

              try {
                // 리뷰 통계 조회
                const reviewService = new ReviewService();
                const reviewStats = await reviewService.getReviewStats(lot.parking_code);
                if (reviewStats) {
                  average_rating = reviewStats.averageRating || 0;
                  total_reviews = reviewStats.totalReviews || 0;
                }

                // 주차장 상세 정보 조회
                const parkingDetail = await firestoreService.getLatestParkingStatus(lot.parking_code);
                if (parkingDetail) {
                  capacity = parkingDetail.capacity || 0;
                  cur_parking = parkingDetail.cur_parking || 0;
                  available_spaces = Math.max(0, capacity - cur_parking);
                }
              } catch (error) {
                console.log(`⚠️ 주차장 ${lot.parking_code} 상세 정보 로드 실패:`, error.message);
              }

              return {
                parking_code: lot.parking_code,
                parking_name: lot.parking_name,
                addr: `위도: ${lot.lat.toFixed(6)}, 경도: ${lot.lon.toFixed(6)}`, // 좌표 기반 주소
                coordinates: [lot.lat, lot.lon],
                predicted_available: Math.round(lot.congestion_metric * 100), // 혼잡도 기반 예상 가능 공간
                congestion_level: lot.congestion_metric < 0.5 ? "Normal" : lot.congestion_metric < 0.8 ? "Busy" : "Congested",
                congestion_rate: parseFloat((lot.congestion_metric * 100).toFixed(2)), // 숫자 타입으로 변환
                distance_km: parseFloat(Math.sqrt(lot.distance_index).toFixed(2)), // 숫자 타입으로 변환
                total_score: lot.final_score,
                distance_score: lot.final_score, // 호환성을 위해
                tel: "정보 없음",
                pay_yn_name: "정보 없음",
                weekday_begin: "00:00",
                weekday_end: "23:59",
                price_rates: lot.price_rates,
                // 새로 추가된 필드들
                average_rating,
                total_reviews,
                capacity,
                cur_parking,
                available_spaces
              };
            })
          );
          
          resolve({
            success: true,
            data: enhancedData,
            total_found: enhancedData.length,
            message: result.message || `LSTM 모델을 사용하여 ${enhancedData.length}개의 주차장을 추천합니다.`,
            prediction_time: new Date().toISOString(),
            models_trained: 1
          });
        } else {
          resolve(result);
        }
      } catch (error) {
        console.error("❌ JSON 파싱 실패:", error);
        console.error("stdout:", stdout);
        reject(new Error(`Failed to parse Python output: ${error.message}`));
      }
    });

    pythonProcess.on("error", (error) => {
      console.error("❌ Python 프로세스 시작 실패:", error);
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
    
    // 30초 타임아웃 설정
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error("Python script timeout (30 seconds)"));
    }, 30000);
  });
}


/**
 * Firestore를 사용한 특정 주차장 상세 정보 조회
 */
export async function getParkingDetail(parkingCode) {
  try {
    // 주차장 기본 정보 조회
    const parkingLot = await firestoreService.getParkingLot(parkingCode);
    if (!parkingLot) {
      return {
        success: false,
        message: "주차장을 찾을 수 없습니다.",
      };
    }

    // 주차장 최신 상태 조회
    const latestStatus = await firestoreService.getLatestParkingStatus(parkingCode);
    
    const combinedData = {
      ...parkingLot,
      ...latestStatus
    };

    const coords = parseCoordinates(combinedData.coordinates);
    const congestionLevel = predictCongestion(combinedData.capacity, combinedData.cur_parking);
    const availableSpaces = Math.max(
      0,
      (combinedData.capacity || 0) - (combinedData.cur_parking || 0)
    );

    return {
      success: true,
      data: {
        ...combinedData,
        coordinates: coords,
        predicted_available: availableSpaces,
        congestion_level: congestionLevel,
      },
    };
  } catch (error) {
    throw new Error(`주차장 상세 정보 조회 실패: ${error.message}`);
  }
}
