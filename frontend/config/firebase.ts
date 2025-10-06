import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 앱 초기화
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth 초기화 - AsyncStorage를 사용한 영속성 설정
let auth: Auth;

try {
  // React Native 환경에서 getReactNativePersistence 사용 시도
  // @ts-ignore - React Native 빌드에서만 export됨
  const firebaseAuth = require('firebase/auth');
  
  if (firebaseAuth.getReactNativePersistence) {
    // React Native 환경
    auth = initializeAuth(app, {
      persistence: firebaseAuth.getReactNativePersistence(ReactNativeAsyncStorage)
    });
  } else {
    // Web 환경 또는 함수가 없는 경우
    auth = initializeAuth(app);
  }
} catch (error) {
  // Auth already initialized, get existing instance
  auth = getAuth(app);
}

// Firestore 초기화
const db = getFirestore(app);

export { auth, db };
export default app;
