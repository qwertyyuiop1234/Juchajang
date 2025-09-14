import { db } from "../config/firebase.js";
import { FieldValue } from "firebase-admin/firestore";

/**
 * 주차장 예약 서비스 클래스
 */
export class ReservationService {
  constructor() {
    this.collections = {
      RESERVATIONS: "reservations",
      PRIVATE_PARKING_LOTS: "private_parking_lots",
      TIME_SLOTS: "time_slots",
    };
  }

  /**
   * 예약 생성
   */
  async createReservation(reservationData) {
    try {
      const docRef = db.collection(this.collections.RESERVATIONS).doc();

      // 예약 데이터 구조
      const data = {
        id: docRef.id,
        userId: reservationData.userId,
        parkingLotId: reservationData.parkingLotId,
        parkingLotName: reservationData.parkingLotName,
        parkingLotAddress: reservationData.parkingLotAddress,
        ownerName: reservationData.ownerName,
        ownerContact: reservationData.ownerContact,
        reservationDate: reservationData.reservationDate, // YYYY-MM-DD 형식
        timeSlots: reservationData.timeSlots, // ['09:00', '10:00'] 배열 형태
        startTime: reservationData.startTime, // '09:00'
        endTime: reservationData.endTime, // '11:00'
        duration: reservationData.duration, // 시간 (숫자)
        totalPrice: reservationData.totalPrice,
        pricePerHour: reservationData.pricePerHour,
        status: "confirmed", // confirmed, cancelled, completed
        paymentStatus: "pending", // pending, paid, refunded
        paymentMethod: reservationData.paymentMethod || null,
        specialRequests: reservationData.specialRequests || "",
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      await docRef.set(data);
      return { success: true, id: docRef.id, data };
    } catch (error) {
      console.error("예약 생성 실패:", error);
      throw new Error(`예약 생성 실패: ${error.message}`);
    }
  }

  /**
   * 특정 날짜와 주차장의 예약된 시간대 조회
   */
  async getReservedTimeSlots(parkingLotId, date) {
    try {
      const snapshot = await db
        .collection(this.collections.RESERVATIONS)
        .where("parkingLotId", "==", parkingLotId)
        .where("reservationDate", "==", date)
        .where("status", "==", "confirmed")
        .get();

      const reservedSlots = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        reservedSlots.push(...data.timeSlots);
      });

      // 중복 제거하여 반환
      return [...new Set(reservedSlots)];
    } catch (error) {
      console.error("예약된 시간대 조회 실패:", error);
      throw new Error(`예약된 시간대 조회 실패: ${error.message}`);
    }
  }

  /**
   * 사용자별 예약 내역 조회
   */
  async getUserReservations(userId, limit = 50) {
    try {
      const snapshot = await db
        .collection(this.collections.RESERVATIONS)
        .where("userId", "==", userId)
        .orderBy("created_at", "desc")
        .limit(limit)
        .get();

      const reservations = [];
      snapshot.forEach((doc) => {
        reservations.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return reservations;
    } catch (error) {
      console.error("사용자 예약 내역 조회 실패:", error);
      throw new Error(`사용자 예약 내역 조회 실패: ${error.message}`);
    }
  }

  /**
   * 특정 예약 상세 조회
   */
  async getReservation(reservationId) {
    try {
      const doc = await db
        .collection(this.collections.RESERVATIONS)
        .doc(reservationId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error("예약 조회 실패:", error);
      throw new Error(`예약 조회 실패: ${error.message}`);
    }
  }

  /**
   * 예약 취소
   */
  async cancelReservation(reservationId, userId) {
    try {
      const reservationRef = db
        .collection(this.collections.RESERVATIONS)
        .doc(reservationId);

      const doc = await reservationRef.get();
      if (!doc.exists) {
        throw new Error("예약을 찾을 수 없습니다.");
      }

      const reservation = doc.data();
      if (reservation.userId !== userId) {
        throw new Error("예약을 취소할 권한이 없습니다.");
      }

      if (reservation.status === "cancelled") {
        throw new Error("이미 취소된 예약입니다.");
      }

      await reservationRef.update({
        status: "cancelled",
        updated_at: FieldValue.serverTimestamp(),
      });

      return { success: true, message: "예약이 성공적으로 취소되었습니다." };
    } catch (error) {
      console.error("예약 취소 실패:", error);
      throw new Error(`예약 취소 실패: ${error.message}`);
    }
  }

  /**
   * 예약 상태 업데이트
   */
  async updateReservationStatus(reservationId, status, paymentStatus = null) {
    try {
      const updateData = {
        status,
        updated_at: FieldValue.serverTimestamp(),
      };

      if (paymentStatus) {
        updateData.paymentStatus = paymentStatus;
      }

      await db
        .collection(this.collections.RESERVATIONS)
        .doc(reservationId)
        .update(updateData);

      return { success: true, message: "예약 상태가 업데이트되었습니다." };
    } catch (error) {
      console.error("예약 상태 업데이트 실패:", error);
      throw new Error(`예약 상태 업데이트 실패: ${error.message}`);
    }
  }

  /**
   * 개인 주차장 소유자별 예약 조회
   */
  async getOwnerReservations(ownerUserId, limit = 50) {
    try {
      // 먼저 소유자의 주차장 목록을 가져와야 합니다.
      // 이 부분은 실제 개인 주차장 데이터 구조에 맞게 조정해야 합니다.
      const snapshot = await db
        .collection(this.collections.RESERVATIONS)
        .where("ownerUserId", "==", ownerUserId) // 예약 데이터에 소유자 정보 필요
        .orderBy("created_at", "desc")
        .limit(limit)
        .get();

      const reservations = [];
      snapshot.forEach((doc) => {
        reservations.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return reservations;
    } catch (error) {
      console.error("소유자 예약 내역 조회 실패:", error);
      throw new Error(`소유자 예약 내역 조회 실패: ${error.message}`);
    }
  }

  /**
   * 예약 가능한 시간대 조회 (특정 날짜)
   */
  async getAvailableTimeSlots(parkingLotId, date) {
    try {
      // 기본 가능 시간대 (9시~18시)
      const allTimeSlots = [];
      for (let hour = 9; hour <= 18; hour++) {
        allTimeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
      }

      // 예약된 시간대 조회
      const reservedSlots = await this.getReservedTimeSlots(parkingLotId, date);

      // 예약되지 않은 시간대만 반환
      const availableSlots = allTimeSlots.filter(
        (slot) => !reservedSlots.includes(slot)
      );

      return {
        available: availableSlots,
        reserved: reservedSlots,
      };
    } catch (error) {
      console.error("예약 가능 시간대 조회 실패:", error);
      throw new Error(`예약 가능 시간대 조회 실패: ${error.message}`);
    }
  }

  /**
   * 예약 중복 검사
   */
  async checkReservationConflict(parkingLotId, date, timeSlots) {
    try {
      const reservedSlots = await this.getReservedTimeSlots(parkingLotId, date);
      
      // 요청된 시간대 중 이미 예약된 시간대가 있는지 확인
      const conflicts = timeSlots.filter(slot => reservedSlots.includes(slot));
      
      return {
        hasConflict: conflicts.length > 0,
        conflicts: conflicts,
      };
    } catch (error) {
      console.error("예약 중복 검사 실패:", error);
      throw new Error(`예약 중복 검사 실패: ${error.message}`);
    }
  }

  /**
   * 예약 통계 조회 (대시보드용)
   */
  async getReservationStats(startDate, endDate) {
    try {
      let query = db.collection(this.collections.RESERVATIONS);

      if (startDate) {
        query = query.where("created_at", ">=", startDate);
      }
      if (endDate) {
        query = query.where("created_at", "<=", endDate);
      }

      const snapshot = await query.get();
      
      let totalReservations = 0;
      let totalRevenue = 0;
      const statusCounts = {
        confirmed: 0,
        cancelled: 0,
        completed: 0,
      };

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalReservations++;
        
        if (data.status === 'completed') {
          totalRevenue += data.totalPrice || 0;
        }
        
        if (statusCounts[data.status] !== undefined) {
          statusCounts[data.status]++;
        }
      });

      return {
        totalReservations,
        totalRevenue,
        statusCounts,
      };
    } catch (error) {
      console.error("예약 통계 조회 실패:", error);
      throw new Error(`예약 통계 조회 실패: ${error.message}`);
    }
  }
}

export const reservationService = new ReservationService();