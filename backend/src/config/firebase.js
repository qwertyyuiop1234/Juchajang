import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Firebase Admin SDK 서비스 계정 키를 환경 변수에서 가져오기
const serviceAccountKey = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
    // 프로젝트 ID는 서비스 계정 키에서 자동으로 가져옴
  });
}

// Firestore 데이터베이스 인스턴스
export const db = admin.firestore();

// Firebase Auth 인스턴스 (필요한 경우)
export const auth = admin.auth();

export default admin;