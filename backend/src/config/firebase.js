import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin SDK 서비스 계정 키 파일 경로
const serviceAccountPath = path.join(__dirname, '../../juchajang-fbcfe-firebase-adminsdk-fbsvc-5fee059275.json');

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    // 프로젝트 ID는 서비스 계정 키 파일에서 자동으로 가져옴
  });
}

// Firestore 데이터베이스 인스턴스
export const db = admin.firestore();

// Firebase Auth 인스턴스 (필요한 경우)
export const auth = admin.auth();

export default admin;