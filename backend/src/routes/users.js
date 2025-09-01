import express from 'express';
import { auth } from '../config/firebase.js';
import { db } from '../config/firebase.js';

const router = express.Router();

// Firebase 토큰 검증 미들웨어
async function verifyFirebaseToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

// 관리자 이메일 목록 (환경 변수로 관리)
const ADMIN_EMAILS = [
  'admin@juchajang.com',
  'dltmdgus6665@gmail.com', // 당신의 이메일 추가
  'seunghyun@juchajang.com'
];

// 사용자 프로필 조회
router.get('/profile', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Firestore에서 사용자 정보 조회
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      // 관리자 권한 확인
      const isAdmin = ADMIN_EMAILS.includes(req.user.email);
      
      // 사용자 문서가 없으면 기본 정보로 생성
      const defaultProfile = {
        uid: userId,
        email: req.user.email,
        displayName: req.user.name || null,
        role: isAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        favorites: [],
        preferences: {
          notifications: true,
          locationServices: true,
        }
      };
      
      await db.collection('users').doc(userId).set(defaultProfile);
      return res.json(defaultProfile);
    }

    const userData = userDoc.data();
    res.json(userData);
  } catch (error) {
    console.error('프로필 조회 에러:', error);
    res.status(500).json({ error: '프로필 조회 중 오류가 발생했습니다.' });
  }
});

// 사용자 프로필 업데이트
router.put('/profile', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const updateData = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    // 보안상 특정 필드만 업데이트 허용
    const allowedFields = ['displayName', 'preferences', 'phoneNumber'];
    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, { updatedAt: updateData.updatedAt });

    await db.collection('users').doc(userId).update(filteredData);
    
    const updatedDoc = await db.collection('users').doc(userId).get();
    res.json(updatedDoc.data());
  } catch (error) {
    console.error('프로필 업데이트 에러:', error);
    res.status(500).json({ error: '프로필 업데이트 중 오류가 발생했습니다.' });
  }
});

// 즐겨찾기 추가
router.post('/favorites', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { parkingLotId } = req.body;

    if (!parkingLotId) {
      return res.status(400).json({ error: '주차장 ID가 필요합니다.' });
    }

    const userRef = db.collection('users').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      const userData = userDoc.data();
      const favorites = userData.favorites || [];
      
      if (!favorites.includes(parkingLotId)) {
        favorites.push(parkingLotId);
        transaction.update(userRef, { 
          favorites,
          updatedAt: new Date().toISOString()
        });
      }
    });

    res.json({ message: '즐겨찾기에 추가되었습니다.' });
  } catch (error) {
    console.error('즐겨찾기 추가 에러:', error);
    res.status(500).json({ error: '즐겨찾기 추가 중 오류가 발생했습니다.' });
  }
});

// 즐겨찾기 제거
router.delete('/favorites/:parkingLotId', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { parkingLotId } = req.params;

    const userRef = db.collection('users').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      const userData = userDoc.data();
      const favorites = userData.favorites || [];
      const updatedFavorites = favorites.filter(id => id !== parkingLotId);
      
      transaction.update(userRef, { 
        favorites: updatedFavorites,
        updatedAt: new Date().toISOString()
      });
    });

    res.json({ message: '즐겨찾기에서 제거되었습니다.' });
  } catch (error) {
    console.error('즐겨찾기 제거 에러:', error);
    res.status(500).json({ error: '즐겨찾기 제거 중 오류가 발생했습니다.' });
  }
});

// 사용자 예약 내역 조회
router.get('/reservations', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const reservationsSnapshot = await db.collection('reservations')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const reservations = [];
    reservationsSnapshot.forEach(doc => {
      reservations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(reservations);
  } catch (error) {
    console.error('예약 내역 조회 에러:', error);
    res.status(500).json({ error: '예약 내역 조회 중 오류가 발생했습니다.' });
  }
});

// 계정 삭제
router.delete('/account', verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Firestore에서 사용자 데이터 삭제
    await db.collection('users').doc(userId).delete();
    
    // 사용자의 예약 내역 삭제
    const reservationsSnapshot = await db.collection('reservations')
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    reservationsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    // Firebase Auth에서 사용자 삭제
    await auth.deleteUser(userId);
    
    res.json({ message: '계정이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('계정 삭제 에러:', error);
    res.status(500).json({ error: '계정 삭제 중 오류가 발생했습니다.' });
  }
});

// 관리자 권한 확인 미들웨어
const verifyAdminRole = async (req, res, next) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    next();
  } catch (error) {
    console.error('관리자 권한 확인 에러:', error);
    res.status(500).json({ error: '권한 확인 중 오류가 발생했습니다.' });
  }
};

// 관리자 전용: 모든 사용자 목록 조회
router.get('/admin/users', verifyFirebaseToken, verifyAdminRole, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      // 민감한 정보 제외하고 반환
      users.push({
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      });
    });
    
    res.json(users);
  } catch (error) {
    console.error('사용자 목록 조회 에러:', error);
    res.status(500).json({ error: '사용자 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 관리자 전용: 사용자 권한 변경
router.put('/admin/users/:userId/role', verifyFirebaseToken, verifyAdminRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: '유효하지 않은 역할입니다.' });
    }
    
    await db.collection('users').doc(userId).update({
      role,
      updatedAt: new Date().toISOString()
    });
    
    res.json({ message: '사용자 권한이 업데이트되었습니다.' });
  } catch (error) {
    console.error('사용자 권한 변경 에러:', error);
    res.status(500).json({ error: '사용자 권한 변경 중 오류가 발생했습니다.' });
  }
});

// 관리자 전용: 통계 데이터 조회
router.get('/admin/stats', verifyFirebaseToken, verifyAdminRole, async (req, res) => {
  try {
    // 사용자 수
    const usersSnapshot = await db.collection('users').get();
    const userCount = usersSnapshot.size;
    
    // 예약 수
    const reservationsSnapshot = await db.collection('reservations').get();
    const reservationCount = reservationsSnapshot.size;
    
    // 오늘 가입자 수
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsersSnapshot = await db.collection('users')
      .where('createdAt', '>=', today.toISOString())
      .get();
    const todayUserCount = todayUsersSnapshot.size;
    
    res.json({
      totalUsers: userCount,
      totalReservations: reservationCount,
      todayNewUsers: todayUserCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('통계 조회 에러:', error);
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
});

export default router;