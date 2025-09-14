import express from "express";
import { reservationService } from "../services/reservationService.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * 예약 생성
 * POST /api/reservations
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const {
      parkingLotId,
      parkingLotName,
      parkingLotAddress,
      ownerName,
      ownerContact,
      reservationDate,
      timeSlots,
      startTime,
      endTime,
      duration,
      totalPrice,
      pricePerHour,
      paymentMethod,
      specialRequests,
    } = req.body;

    // 필수 필드 검증
    if (!parkingLotId || !reservationDate || !timeSlots || timeSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: "필수 정보가 누락되었습니다.",
      });
    }

    // 예약 중복 검사
    const conflictCheck = await reservationService.checkReservationConflict(
      parkingLotId,
      reservationDate,
      timeSlots
    );

    if (conflictCheck.hasConflict) {
      return res.status(409).json({
        success: false,
        message: "선택하신 시간대에 이미 예약이 있습니다.",
        conflicts: conflictCheck.conflicts,
      });
    }

    // 예약 데이터 생성
    const reservationData = {
      userId,
      parkingLotId,
      parkingLotName,
      parkingLotAddress,
      ownerName,
      ownerContact,
      reservationDate,
      timeSlots,
      startTime,
      endTime,
      duration,
      totalPrice,
      pricePerHour,
      paymentMethod,
      specialRequests,
    };

    const result = await reservationService.createReservation(reservationData);

    res.status(201).json({
      success: true,
      message: "예약이 성공적으로 생성되었습니다.",
      data: result,
    });
  } catch (error) {
    console.error("예약 생성 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "예약 생성 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 사용자의 예약 목록 조회
 * GET /api/reservations/my
 */
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50 } = req.query;

    const reservations = await reservationService.getUserReservations(
      userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    console.error("예약 목록 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "예약 목록 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 특정 예약 상세 조회
 * GET /api/reservations/:id
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const reservation = await reservationService.getReservation(id);

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "예약을 찾을 수 없습니다.",
      });
    }

    // 본인의 예약인지 확인
    if (reservation.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "예약에 접근할 권한이 없습니다.",
      });
    }

    res.json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error("예약 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "예약 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 예약 취소
 * DELETE /api/reservations/:id
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const result = await reservationService.cancelReservation(id, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("예약 취소 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "예약 취소 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 특정 주차장의 예약 가능 시간대 조회
 * GET /api/reservations/available-slots/:parkingLotId
 */
router.get("/available-slots/:parkingLotId", async (req, res) => {
  try {
    const { parkingLotId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "날짜가 필요합니다.",
      });
    }

    const timeSlots = await reservationService.getAvailableTimeSlots(
      parkingLotId,
      date
    );

    res.json({
      success: true,
      data: timeSlots,
    });
  } catch (error) {
    console.error("예약 가능 시간대 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "예약 가능 시간대 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 예약된 시간대 조회 (특정 주차장, 특정 날짜)
 * GET /api/reservations/reserved-slots/:parkingLotId
 */
router.get("/reserved-slots/:parkingLotId", async (req, res) => {
  try {
    const { parkingLotId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "날짜가 필요합니다.",
      });
    }

    const reservedSlots = await reservationService.getReservedTimeSlots(
      parkingLotId,
      date
    );

    res.json({
      success: true,
      data: {
        parkingLotId,
        date,
        reservedSlots,
      },
    });
  } catch (error) {
    console.error("예약된 시간대 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "예약된 시간대 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 예약 상태 업데이트 (관리자용)
 * PATCH /api/reservations/:id/status
 */
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    // TODO: 관리자 권한 확인 로직 추가

    const result = await reservationService.updateReservationStatus(
      id,
      status,
      paymentStatus
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("예약 상태 업데이트 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "예약 상태 업데이트 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 예약 통계 조회 (관리자용)
 * GET /api/reservations/stats/summary
 */
router.get("/stats/summary", authenticateToken, async (req, res) => {
  try {
    // TODO: 관리자 권한 확인 로직 추가

    const { startDate, endDate } = req.query;

    const stats = await reservationService.getReservationStats(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("예약 통계 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "예약 통계 조회 중 오류가 발생했습니다.",
    });
  }
});

export default router;