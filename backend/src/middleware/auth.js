import { auth } from '../config/firebase.js';

// Firebase 토큰 검증 미들웨어
export async function authenticateToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '인증 토큰이 필요합니다.' 
      });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    return res.status(401).json({ 
      success: false, 
      message: '유효하지 않은 토큰입니다.' 
    });
  }
}

// 관리자 권한 확인 미들웨어
export async function verifyAdminRole(req, res, next) {
  try {
    const { db } = await import('../config/firebase.js');
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: '관리자 권한이 필요합니다.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('관리자 권한 확인 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '권한 확인 중 오류가 발생했습니다.' 
    });
  }
}