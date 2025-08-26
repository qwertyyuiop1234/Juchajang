import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import axios from "axios";
import { firestoreService } from './firestoreService.js';

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
 * 간단한 혼잡도 예측 (실제 Prophet 대신 통계적 접근)
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
 * Firestore와 Prophet 모델을 사용한 AI 주차장 추천
 */
export async function recommendParkingWithAI(
  destinationCoords,
  numRecommendations = 5,
  predictionTime = null
) {
  return new Promise((resolve, reject) => {
    const pythonScriptPath = path.join(
      __dirname,
      "../../ai/parking_prophet_firestore.py"
    );
    const [lat, lng] = destinationCoords;

    // Python 스크립트 실행 인자
    const args = [
      pythonScriptPath,
      lat.toString(),
      lng.toString(),
      numRecommendations.toString(),
    ];
    if (predictionTime) {
      args.push(predictionTime.toISOString());
    }

    // 콘다 환경의 Python 사용
    const pythonPath = "/opt/miniconda3/envs/juchajang-ai/bin/python";
    const pythonProcess = spawn(pythonPath, args);
    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("Python script stderr:", stderr);
        reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Python output: ${error.message}`));
      }
    });

    pythonProcess.on("error", (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

/**
 * Firestore를 사용한 주차장 추천 함수
 */
export async function recommendParking(
  destinationCoords,
  numRecommendations = 5
) {
  try {
    // Firestore에서 모든 주차장의 최신 상태 조회
    const allParkingData = await firestoreService.getAllLatestParkingStatus();

    const recommendations = allParkingData
      .map((row) => {
        // lat_wgs84, lng_wgs84에서 좌표 추출
        const lat = parseFloat(row.lat_wgs84);
        const lng = parseFloat(row.lng_wgs84);
        
        if (isNaN(lat) || isNaN(lng)) return null;
        const coords = [lat, lng];

        const distance = haversineDistance(destinationCoords, coords);
        if (distance === null) return null;

        const congestionLevel = predictCongestion(
          row.capacity,
          row.cur_parking
        );
        const availableSpaces = Math.max(
          0,
          (row.capacity || 0) - (row.cur_parking || 0)
        );

        // 점수 계산
        const congestionScores = { Quiet: 5, Normal: 3, Congested: 1 };
        const congestionScore = congestionScores[congestionLevel] || 1;

        return {
          parking_code: row.parking_code,
          parking_name: row.parking_name,
          addr: row.addr,
          coordinates: coords,
          capacity: row.capacity || 0,
          current_parking: row.cur_parking || 0,
          predicted_available: availableSpaces,
          congestion_level: congestionLevel,
          distance_km: Math.round(distance * 100) / 100, // 소수점 2자리
          congestion_score: congestionScore,
          cur_parking_time: row.cur_parking_time,
          tel: row.tel,
          pay_yn_name: row.pay_yn_name,
          weekday_begin: row.weekday_begin,
          weekday_end: row.weekday_end,
        };
      })
      .filter((item) => item !== null)
      .filter((item) => item.distance_km <= 10); // 10km 이내만

    if (recommendations.length === 0) {
      return {
        success: true,
        data: [],
        message: "주변 10km 이내에 추천할 주차장이 없습니다.",
      };
    }

    // 거리 점수 계산
    const maxDistance = Math.max(
      ...recommendations.map((r) => r.distance_km)
    );
    recommendations.forEach((rec) => {
      rec.distance_score =
        maxDistance > 0
          ? ((maxDistance - rec.distance_km) / maxDistance) * 10
          : 10;
      rec.total_score =
        rec.congestion_score * 0.6 + rec.distance_score * 0.4;
    });

    // 점수 순으로 정렬하고 상위 N개 선택
    const topRecommendations = recommendations
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, numRecommendations);

    return {
      success: true,
      data: topRecommendations,
      total_found: recommendations.length,
      message: `${topRecommendations.length}개의 주차장을 추천합니다.`,
    };
  } catch (error) {
    throw new Error(`주차장 추천 실패: ${error.message}`);
  }
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
