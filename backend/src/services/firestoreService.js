import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

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
      const docRef = db.collection(this.collections.PARKING_STATUS).doc();

      const data = {
        parking_code: statusData.parking_code,
        parking_name: statusData.parking_name || "",
        capacity: statusData.capacity || 0,
        cur_parking: statusData.cur_parking || 0,
        cur_parking_time: statusData.cur_parking_time || null,
        parking_status_yn: statusData.parking_status_yn || "",
        parking_status_name: statusData.parking_status_name || "",
        collected_at: statusData.collected_at || FieldValue.serverTimestamp(),
        created_at: FieldValue.serverTimestamp(),
      };

      await docRef.set(data);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("주차장 상태 저장 실패:", error);
      throw new Error(`주차장 상태 저장 실패: ${error.message}`);
    }
  }

  /**
   * 사용자 클릭 기반 혼잡도 제보 저장
   * 컬렉션: click_reveiw
   */
  async saveClickReview(clickData) {
    try {
      const docRef = db.collection(this.collections.CLICK_REVIEW).doc();
      const data = {
        parking_code: clickData.parking_code,
        status_name: clickData.status_name, // '여유' | '보통' | '혼잡'
        user_id: clickData.user_id || null,
        source: clickData.source || 'user_report',
        created_at: FieldValue.serverTimestamp(),
      };
      await docRef.set(data);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('클릭 리뷰 저장 실패:', error);
      throw new Error(`클릭 리뷰 저장 실패: ${error.message}`);
    }
  }

  /**
   * 주차장 목록 조회 (기본 정보)
   */
  async getAllParkingLots() {
    try {
      const snapshot = await db.collection(this.collections.PARKING_LOTS).get();
      const parkingLots = [];

      snapshot.forEach((doc) => {
        parkingLots.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      return parkingLots;
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
      const doc = await db
        .collection(this.collections.PARKING_LOTS)
        .doc(parkingCode.toString())
        .get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error("주차장 정보 조회 실패:", error);
      throw new Error(`주차장 정보 조회 실패: ${error.message}`);
    }
  }

  /**
   * 주차장 최신 상태 조회
   */
  async getLatestParkingStatus(parkingCode) {
    try {
      const snapshot = await db
        .collection(this.collections.PARKING_STATUS)
        .where("parking_code", "==", parkingCode)
        .orderBy("collected_at", "desc")
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error("주차장 상태 조회 실패:", error);
      throw new Error(`주차장 상태 조회 실패: ${error.message}`);
    }
  }

  /**
   * 모든 주차장의 최신 상태 조회
   */
  async getAllLatestParkingStatus() {
    try {
      const parkingLots = await this.getAllParkingLots();
      console.log(`🔍 parking_lots 컬렉션에서 가져온 주차장 수: ${parkingLots.length}`);
      
      // 화양동 주차장 확인
      const hwayangLot = parkingLots.find(lot => lot.addr && lot.addr.includes('화양동'));
      if (hwayangLot) {
        console.log('🎯 parking_lots에서 화양동 주차장 발견:', {
          parking_code: hwayangLot.parking_code,
          parking_name: hwayangLot.parking_name,
          addr: hwayangLot.addr
        });
      }

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
            cur_parking: 0
          });
        }
      }

      console.log(`🔍 최종 결합된 주차장 수: ${latestStatuses.length}`);
      return latestStatuses;
    } catch (error) {
      console.error("전체 주차장 상태 조회 실패:", error);
      throw new Error(`전체 주차장 상태 조회 실패: ${error.message}`);
    }
  }

  /**
   * 특정 기간의 주차장 상태 히스토리 조회 (AI 모델 학습용)
   */
  async getParkingStatusHistory(parkingCode, startDate, endDate) {
    try {
      let query = db
        .collection(this.collections.PARKING_STATUS)
        .where("parking_code", "==", parkingCode)
        .orderBy("collected_at", "desc");

      if (startDate) {
        query = query.where("collected_at", ">=", startDate);
      }
      if (endDate) {
        query = query.where("collected_at", "<=", endDate);
      }

      const snapshot = await query.get();
      const history = [];

      snapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return history;
    } catch (error) {
      console.error("주차장 히스토리 조회 실패:", error);
      throw new Error(`주차장 히스토리 조회 실패: ${error.message}`);
    }
  }

  /**
   * 모든 주차장의 상태 히스토리 조회 (AI 모델 학습용)
   */
  async getAllParkingStatusHistory(startDate, endDate, limit = 1000) {
    try {
      let query = db
        .collection(this.collections.PARKING_STATUS)
        .orderBy("collected_at", "desc")
        .limit(limit);

      if (startDate) {
        query = query.where("collected_at", ">=", startDate);
      }
      if (endDate) {
        query = query.where("collected_at", "<=", endDate);
      }

      const snapshot = await query.get();
      const history = [];

      snapshot.forEach((doc) => {
        history.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return history;
    } catch (error) {
      console.error("전체 주차장 히스토리 조회 실패:", error);
      throw new Error(`전체 주차장 히스토리 조회 실패: ${error.message}`);
    }
  }

  /**
   * 좌표 범위 내의 주차장 검색
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
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * 데이터베이스 연결 테스트
   */
  async testConnection() {
    try {
      const testDoc = db.collection("test").doc("connection_test");
      await testDoc.set({
        timestamp: FieldValue.serverTimestamp(),
        message: "Firestore connection test",
      });

      await testDoc.get();
      await testDoc.delete();

      return {
        success: true,
        message: "Firestore 연결 성공",
      };
    } catch (error) {
      console.error("Firestore 연결 테스트 실패:", error);
      return {
        success: false,
        message: `Firestore 연결 실패: ${error.message}`,
      };
    }
  }
}

export const firestoreService = new FirestoreService();
