import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import geohash from 'ngeohash';

/**
 * Firestore 서비스 클래스
 * SQLite3를 대체하여 Firestore를 사용하는 데이터베이스 서비스
 */
export class FirestoreService {
  constructor() {
    this.collections = {
      PARKING_LOTS: "parking_lots",
      PARKING_STATUS: "parking_status",
      CLICK_REVIEW: "click_reveiw",
    };
  }

  /**
   * 주차장 기본 정보 저장/업데이트
   */
  async saveParkingLot(parkingData) {
    try {
      const docRef = db
        .collection(this.collections.PARKING_LOTS)
        .doc(parkingData.parking_code.toString());

      const data = {
        parking_code: parkingData.parking_code,
        parking_name: parkingData.parking_name || "",
        addr: parkingData.addr || "",
        coordinates: parkingData.coordinates || null,
        lat_wgs84: parkingData.lat_wgs84 || null,
        lng_wgs84: parkingData.lng_wgs84 || null,
        tel: parkingData.tel || "",
        pay_yn_name: parkingData.pay_yn_name || "",
        weekday_begin: parkingData.weekday_begin || "",
        weekday_end: parkingData.weekday_end || "",
        updated_at: FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp(),
      };

      await docRef.set(data, { merge: true });
      return { success: true, id: parkingData.parking_code };
    } catch (error) {
      console.error("주차장 정보 저장 실패:", error);
      throw new Error(`주차장 정보 저장 실패: ${error.message}`);
    }
  }

  /**
   * 주차장 상태 정보 저장 (실시간 데이터)
   */
  async saveParkingStatus(statusData) {
    try {
      const docRef = db
        .collection(this.collections.PARKING_STATUS)
        .doc(`${statusData.parking_code}_${Date.now()}`);

      const data = {
        parking_code: statusData.parking_code,
        parking_name: statusData.parking_name || "",
        parking_status_name: statusData.parking_status_name || "",
        capacity: statusData.capacity || 0,
        cur_parking: statusData.cur_parking || 0,
        rates: statusData.rates || "",
        time_rate: statusData.time_rate || "",
        add_rates: statusData.add_rates || "",
        add_time_rate: statusData.add_time_rate || "",
        timestamp: FieldValue.serverTimestamp(),
      };

      await docRef.set(data);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("주차장 상태 저장 실패:", error);
      throw new Error(`주차장 상태 저장 실패: ${error.message}`);
    }
  }

  /**
   * 모든 주차장 기본 정보 조회
   */
  async getAllParkingLots() {
    try {
      const snapshot = await db.collection(this.collections.PARKING_LOTS).get();
      const lots = [];
      snapshot.forEach((doc) => {
        lots.push({ id: doc.id, ...doc.data() });
      });
      return lots;
    } catch (error) {
      console.error("주차장 목록 조회 실패:", error);
      throw new Error(`주차장 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 특정 주차장 정보 조회
   */
  async getParkingLot(parkingCode) {
    try {
      const docRef = db
        .collection(this.collections.PARKING_LOTS)
        .doc(parkingCode.toString());
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error("주차장 정보 조회 실패:", error);
      throw new Error(`주차장 정보 조회 실패: ${error.message}`);
    }
  }

  /**
   * 특정 주차장의 최신 상태 조회
   */
  async getLatestParkingStatus(parkingCode) {
    try {
      const snapshot = await db
        .collection(this.collections.PARKING_STATUS)
        .where("parking_code", "==", parkingCode.toString())
        .orderBy("collected_at", "desc")
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.debug(`주차장 상태 조회 실패 (${parkingCode}):`, error.message);
      return null;
    }
  }

  /**
   * 모든 주차장 + 최신 상태 정보 조회
   */
  async getAllLatestParkingStatus() {
    try {
      const parkingLots = await this.getAllParkingLots();
      const latestStatuses = [];

      for (const lot of parkingLots) {
        const status = await this.getLatestParkingStatus(lot.parking_code);
        if (status) {
          // parking_name은 parking_lots의 값을 우선 사용 (덮어쓰기 방지)
          const { parking_name: statusName, ...statusData } = status;
          latestStatuses.push({
            ...lot,
            ...statusData,
            parking_name: lot.parking_name || statusName || '', // lot 우선, status 폴백
          });
        } else {
          // 상태 정보가 없는 주차장도 기본 정보로 포함
          latestStatuses.push({
            ...lot,
            parking_status_name: '정보없음',
            capacity: 0,
            cur_parking: 0,
          });
        }
      }

      return latestStatuses;
    } catch (error) {
      console.error("모든 주차장 최신 상태 조회 실패:", error);
      throw new Error(`모든 주차장 최신 상태 조회 실패: ${error.message}`);
    }
  }

  /**
   * Geohash를 사용한 근처 주차장 조회 (최적화)
   */
  async getParkingLotsNearbyWithGeohash(centerLat, centerLng, radiusKm = 5) {
    try {
      // precision에 따른 거리 (precision 5 = ~5km, precision 6 = ~1km)
      const precision = radiusKm > 3 ? 5 : 6;
      
      // 중심점의 geohash
      const centerHash = geohash.encode(centerLat, centerLng, precision);
      
      // 중심 셀과 이웃 셀들
      const neighbors = geohash.neighbors(centerHash);
      const searchHashes = [centerHash, ...Object.values(neighbors)];
      
      const allResults = [];
      
      // 각 geohash 셀에 대해 쿼리
      for (const hash of searchHashes) {
        try {
          const snapshot = await db
            .collection(this.collections.PARKING_LOTS)
            .where('geohash', '>=', hash)
            .where('geohash', '<', hash + '~')
            .limit(50)
            .get();
          
          snapshot.docs.forEach(doc => {
            allResults.push({ id: doc.id, ...doc.data() });
          });
        } catch (error) {
          // 인덱스가 없거나 geohash 필드가 없는 경우 무시
        }
      }
      
      // 중복 제거
      const uniqueResults = Array.from(
        new Map(allResults.map(item => [item.parking_code, item])).values()
      );
      
      // 정확한 거리로 필터링
      const filtered = uniqueResults.filter(lot => {
        if (!lot.lat_wgs84 || !lot.lng_wgs84) return false;
        const distance = this.calculateDistance(
          centerLat, centerLng,
          parseFloat(lot.lat_wgs84),
          parseFloat(lot.lng_wgs84)
        );
        return distance <= radiusKm;
      });
      
      // 결과가 없으면 폴백
      if (filtered.length === 0) {
        return await this.getParkingLotsInRange(centerLat, centerLng, radiusKm);
      }
      
      return filtered;
    } catch (error) {
      console.error('Geohash 쿼리 실패, 기존 방식으로 폴백:', error.message);
      return await this.getParkingLotsInRange(centerLat, centerLng, radiusKm);
    }
  }

  /**
   * Geohash 기반 최신 상태 조회
   */
  async getLatestParkingStatusNearby(centerLat, centerLng, radiusKm = 5) {
    try {
      const parkingLots = await this.getParkingLotsNearbyWithGeohash(
        centerLat, centerLng, radiusKm
      );
      
      const latestStatuses = [];
      
      for (const lot of parkingLots) {
        const status = await this.getLatestParkingStatus(lot.parking_code);
        if (status) {
          const { parking_name: statusName, ...statusData } = status;
          latestStatuses.push({
            ...lot,
            ...statusData,
            parking_name: lot.parking_name || statusName || '',
          });
        } else {
          latestStatuses.push({
            ...lot,
            parking_status_name: '정보없음',
            capacity: 0,
            cur_parking: 0,
          });
        }
      }
      
      return latestStatuses;
    } catch (error) {
      console.error('근처 주차장 상태 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 범위 내 주차장 검색 (기존 방식 - 폴백용)
   */
  async getParkingLotsInRange(centerLat, centerLng, radiusKm) {
    try {
      const allLots = await this.getAllLatestParkingStatus();

      const lotsInRange = allLots.filter((lot) => {
        if (!lot.lat_wgs84 || !lot.lng_wgs84) return false;

        const distance = this.calculateDistance(
          centerLat,
          centerLng,
          parseFloat(lot.lat_wgs84),
          parseFloat(lot.lng_wgs84)
        );

        return distance <= radiusKm;
      });

      return lotsInRange;
    } catch (error) {
      console.error("범위 내 주차장 검색 실패:", error);
      throw new Error(`범위 내 주차장 검색 실패: ${error.message}`);
    }
  }

  /**
   * Haversine 공식을 사용한 거리 계산 (km)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  /**
   * 각도를 라디안으로 변환
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * 클릭/리뷰 저장
   */
  async saveClickReview(reviewData) {
    try {
      const docRef = db.collection(this.collections.CLICK_REVIEW).doc();

      const data = {
        parking_code: reviewData.parking_code,
        click_type: reviewData.click_type || "",
        review_text: reviewData.review_text || "",
        rating: reviewData.rating || 0,
        timestamp: FieldValue.serverTimestamp(),
      };

      await docRef.set(data);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("클릭/리뷰 저장 실패:", error);
      throw new Error(`클릭/리뷰 저장 실패: ${error.message}`);
    }
  }

  /**
   * 사용자 제보 기반 주차장 상태 저장
   */
  async saveUserReportedStatus(parkingCode, statusName) {
    try {
      const statusData = {
        parking_code: parkingCode,
        parking_status_name: statusName,
        timestamp: FieldValue.serverTimestamp(),
        source: 'user_report'
      };

      await this.saveParkingStatus(statusData);
      return { success: true };
    } catch (error) {
      console.error("사용자 제보 상태 저장 실패:", error);
      throw new Error(`사용자 제보 상태 저장 실패: ${error.message}`);
    }
  }

  /**
   * 주차장 예측 데이터 조회
   */
  async getParkingPrediction(parkingCode) {
    try {
      console.log(`🔍 예측 데이터 조회 시작: parkingCode=${parkingCode}`);
      
      // 가능한 컬렉션 이름들을 시도
      const possibleCollections = ['parking_prediction', 'parking_predictions'];
      
      for (const collectionName of possibleCollections) {
        console.log(`🔍 컬렉션 시도: ${collectionName}`);
        const docRef = db.collection(collectionName).doc(parkingCode.toString());
        const doc = await docRef.get();
        
        console.log(`📄 문서 존재 여부 (${collectionName}): ${doc.exists}`);
        
        if (doc.exists) {
          const data = doc.data();
          console.log(`✅ 예측 데이터 조회 성공 (${collectionName}): ${Object.keys(data).length}개 필드`);
          return data;
        }
      }
      
      console.log(`❌ 모든 컬렉션에서 문서를 찾을 수 없음: ${parkingCode}`);
      return null;
    } catch (error) {
      console.error("주차장 예측 데이터 조회 실패:", error);
      throw new Error(`주차장 예측 데이터 조회 실패: ${error.message}`);
    }
  }
}

export const firestoreService = new FirestoreService();
