import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * 개인 주차장 서비스 클래스
 */
export class PrivateParkingService {
  constructor() {
    this.collections = {
      PERSONAL_PARKING_LOTS: "personal_parking_lots",
      TIME_SLOTS: "time_slots",
    };
  }

  /**
   * 개인 주차장 등록
   */
  async createPrivateParkingLot(ownerId, parkingData) {
    try {
      const docRef = db.collection(this.collections.PERSONAL_PARKING_LOTS).doc();

      const data = {
        id: docRef.id,
        ownerId: ownerId, // 소유자 Firebase UID
        name: parkingData.name,
        address: parkingData.address,
        description: parkingData.description || "",
        lat: parkingData.lat || null,
        lng: parkingData.lng || null,
        pricePerHour: parkingData.pricePerHour || 5000,
        rules: parkingData.rules || [],
        availableDays: parkingData.availableDays || [1, 2, 3, 4, 5], // 월-금
        availableStartTime: parkingData.availableStartTime || "09:00",
        availableEndTime: parkingData.availableEndTime || "18:00",
        isActive: true,
        status: "available", // available, occupied, inactive
        rating: 0,
        reviewCount: 0,
        totalBookings: 0,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      await docRef.set(data);
      return { success: true, id: docRef.id, data };
    } catch (error) {
      console.error("개인 주차장 등록 실패:", error);
      throw new Error(`개인 주차장 등록 실패: ${error.message}`);
    }
  }

  /**
   * 사용자의 개인 주차장 목록 조회
   */
  async getOwnerParkingLots(ownerId) {
    try {
      const snapshot = await db
        .collection(this.collections.PERSONAL_PARKING_LOTS)
        .where("ownerId", "==", ownerId)
        .where("isActive", "==", true)
        .orderBy("created_at", "desc")
        .get();

      const parkingLots = [];
      snapshot.forEach((doc) => {
        parkingLots.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return parkingLots;
    } catch (error) {
      console.error("소유자 주차장 목록 조회 실패:", error);
      throw new Error(`소유자 주차장 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 모든 활성 개인 주차장 조회 (공개용)
   */
  async getAllActivePrivateParkingLots() {
    try {
      const snapshot = await db
        .collection(this.collections.PERSONAL_PARKING_LOTS)
        .where("isActive", "==", true)
        .where("status", "==", "available")
        .get();

      const parkingLots = [];
      for (const doc of snapshot.docs) {
        const lotData = doc.data();
        
        // 소유자 정보 조회
        const ownerDoc = await db.collection("users").doc(lotData.ownerId).get();
        const ownerData = ownerDoc.exists ? ownerDoc.data() : {};

        parkingLots.push({
          id: doc.id,
          ...lotData,
          ownerName: ownerData.displayName || "익명",
          ownerContact: ownerData.phoneNumber || null,
          ownerEmail: ownerData.email || null,
        });
      }

      return parkingLots;
    } catch (error) {
      console.error("개인 주차장 목록 조회 실패:", error);
      throw new Error(`개인 주차장 목록 조회 실패: ${error.message}`);
    }
  }

  /**
   * 특정 개인 주차장 조회
   */
  async getPrivateParkingLot(parkingLotId) {
    try {
      const doc = await db
        .collection(this.collections.PERSONAL_PARKING_LOTS)
        .doc(parkingLotId)
        .get();

      if (!doc.exists) {
        return null;
      }

      const lotData = doc.data();
      
      // 소유자 정보 조회
      const ownerDoc = await db.collection("users").doc(lotData.ownerId).get();
      const ownerData = ownerDoc.exists ? ownerDoc.data() : {};

      return {
        id: doc.id,
        ...lotData,
        ownerName: ownerData.displayName || "익명",
        ownerContact: ownerData.phoneNumber || null,
        ownerEmail: ownerData.email || null,
      };
    } catch (error) {
      console.error("개인 주차장 조회 실패:", error);
      throw new Error(`개인 주차장 조회 실패: ${error.message}`);
    }
  }

  /**
   * 개인 주차장 정보 업데이트
   */
  async updatePrivateParkingLot(parkingLotId, ownerId, updateData) {
    try {
      const docRef = db.collection(this.collections.PERSONAL_PARKING_LOTS).doc(parkingLotId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error("주차장을 찾을 수 없습니다.");
      }

      const currentData = doc.data();
      if (currentData.ownerId !== ownerId) {
        throw new Error("주차장을 수정할 권한이 없습니다.");
      }

      const allowedFields = [
        'name', 'address', 'description', 'pricePerHour', 'rules',
        'availableDays', 'availableStartTime', 'availableEndTime', 'status'
      ];

      const filteredUpdate = Object.keys(updateData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = updateData[key];
          return obj;
        }, { updated_at: FieldValue.serverTimestamp() });

      await docRef.update(filteredUpdate);
      return { success: true, message: "주차장 정보가 업데이트되었습니다." };
    } catch (error) {
      console.error("개인 주차장 업데이트 실패:", error);
      throw new Error(`개인 주차장 업데이트 실패: ${error.message}`);
    }
  }

  /**
   * 개인 주차장 비활성화 (삭제)
   */
  async deactivatePrivateParkingLot(parkingLotId, ownerId) {
    try {
      const docRef = db.collection(this.collections.PERSONAL_PARKING_LOTS).doc(parkingLotId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error("주차장을 찾을 수 없습니다.");
      }

      const currentData = doc.data();
      if (currentData.ownerId !== ownerId) {
        throw new Error("주차장을 삭제할 권한이 없습니다.");
      }

      await docRef.update({
        isActive: false,
        status: "inactive",
        updated_at: FieldValue.serverTimestamp(),
      });

      return { success: true, message: "주차장이 비활성화되었습니다." };
    } catch (error) {
      console.error("개인 주차장 비활성화 실패:", error);
      throw new Error(`개인 주차장 비활성화 실패: ${error.message}`);
    }
  }

  /**
   * 주차장 평점 업데이트
   */
  async updateParkingLotRating(parkingLotId, newRating) {
    try {
      const docRef = db.collection(this.collections.PERSONAL_PARKING_LOTS).doc(parkingLotId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error("주차장을 찾을 수 없습니다.");
      }

      const currentData = doc.data();
      const currentRating = currentData.rating || 0;
      const currentReviewCount = currentData.reviewCount || 0;

      // 새로운 평점 계산
      const newReviewCount = currentReviewCount + 1;
      const newAverageRating = ((currentRating * currentReviewCount) + newRating) / newReviewCount;

      await docRef.update({
        rating: Math.round(newAverageRating * 10) / 10, // 소수점 첫째자리까지
        reviewCount: newReviewCount,
        updated_at: FieldValue.serverTimestamp(),
      });

      return { success: true, newRating: newAverageRating };
    } catch (error) {
      console.error("평점 업데이트 실패:", error);
      throw new Error(`평점 업데이트 실패: ${error.message}`);
    }
  }

  /**
   * 예약 완료 시 통계 업데이트
   */
  async incrementBookingCount(parkingLotId) {
    try {
      const docRef = db.collection(this.collections.PERSONAL_PARKING_LOTS).doc(parkingLotId);
      
      await docRef.update({
        totalBookings: FieldValue.increment(1),
        updated_at: FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error("예약 카운트 업데이트 실패:", error);
      throw new Error(`예약 카운트 업데이트 실패: ${error.message}`);
    }
  }
}

export const privateParkingService = new PrivateParkingService();