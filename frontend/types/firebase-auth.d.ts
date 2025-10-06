/**
 * Firebase Auth React Native 타입 확장
 * getReactNativePersistence는 React Native 환경에서만 사용 가능
 */

import '@firebase/auth';

declare module '@firebase/auth' {
  export interface ReactNativeAsyncStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }

  export function getReactNativePersistence(
    storage: ReactNativeAsyncStorage
  ): any;
}

declare module 'firebase/auth' {
  export { getReactNativePersistence } from '@firebase/auth';
}

