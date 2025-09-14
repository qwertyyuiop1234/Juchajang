import express from "express";
import { privateParkingService } from "../services/privateParkingService.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * 개인 주차장 등록
 * POST /api/personal-parking
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.uid;
    const parkingData = req.body;

    // 필수 필드 검증
    if (!parkingData.name || !parkingData.address) {
      return res.status(400).json({
        success: false,
        message: "주차장 이름과 주소는 필수입니다.",
      });
    }

    const result = await privateParkingService.createPrivateParkingLot(
      ownerId,
      parkingData
    );

    res.status(201).json({
      success: true,
      message: "개인 주차장이 성공적으로 등록되었습니다.",
      data: result,
    });
  } catch (error) {
    console.error("개인 주차장 등록 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "개인 주차장 등록 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 모든 활성 개인 주차장 조회 (공개용)
 * GET /api/personal-parking
 */
router.get("/", async (req, res) => {
  try {
    const parkingLots = await privateParkingService.getAllActivePrivateParkingLots();

    res.json({
      success: true,
      data: parkingLots,
    });
  } catch (error) {
    console.error("개인 주차장 목록 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "개인 주차장 목록 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 내 개인 주차장 목록 조회
 * GET /api/personal-parking/my
 */
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const ownerId = req.user.uid;
    const parkingLots = await privateParkingService.getOwnerParkingLots(ownerId);

    res.json({
      success: true,
      data: parkingLots,
    });
  } catch (error) {
    console.error("내 주차장 목록 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "내 주차장 목록 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 특정 개인 주차장 조회
 * GET /api/personal-parking/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const parkingLot = await privateParkingService.getPrivateParkingLot(id);

    if (!parkingLot) {
      return res.status(404).json({
        success: false,
        message: "주차장을 찾을 수 없습니다.",
      });
    }

    res.json({
      success: true,
      data: parkingLot,
    });
  } catch (error) {
    console.error("개인 주차장 조회 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "주차장 조회 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 개인 주차장 정보 수정
 * PUT /api/personal-parking/:id
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.uid;
    const updateData = req.body;

    const result = await privateParkingService.updatePrivateParkingLot(
      id,
      ownerId,
      updateData
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("개인 주차장 수정 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "주차장 정보 수정 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 개인 주차장 비활성화 (삭제)
 * DELETE /api/personal-parking/:id
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.uid;

    const result = await privateParkingService.deactivatePrivateParkingLot(
      id,
      ownerId
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("개인 주차장 삭제 에러:", error);
    res.status(500).json({
      success: false,
      message: error.message || "주차장 삭제 중 오류가 발생했습니다.",
    });
  }
});

export default router;