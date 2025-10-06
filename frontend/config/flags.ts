/**
 * 기능 플래그 설정
 * 개발/테스트 중인 기능들을 단계적으로 활성화할 수 있도록 관리
 */

interface FeatureFlags {
  // 캐시 관련
  enableDiskCache: boolean;
  enableSWR: boolean;
  
  // 성능 모니터링
  enablePerformanceLogging: boolean;
  
  // 개발 도구
  enableDebugMode: boolean;
}

// 환경별 기본 설정
const getDefaultFlags = (): FeatureFlags => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    // 캐시 관련 - 프로덕션에서도 활성화
    enableDiskCache: true,
    enableSWR: true,
    
    // 성능 모니터링 - 개발 환경에서만
    enablePerformanceLogging: isDevelopment,
    
    // 개발 도구 - 개발 환경에서만
    enableDebugMode: isDevelopment,
  };
};

// 현재 활성화된 플래그
export const featureFlags: FeatureFlags = getDefaultFlags();

/**
 * 플래그 동적 변경 (런타임에 테스트용)
 */
export function updateFeatureFlag<K extends keyof FeatureFlags>(
  flag: K,
  value: FeatureFlags[K]
): void {
  featureFlags[flag] = value;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🚩 Feature flag updated: ${flag} = ${value}`);
  }
}

/**
 * 플래그 일괄 변경
 */
export function updateFeatureFlags(updates: Partial<FeatureFlags>): void {
  Object.assign(featureFlags, updates);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🚩 Feature flags updated:', updates);
  }
}

/**
 * 플래그 리셋 (기본값으로)
 */
export function resetFeatureFlags(): void {
  Object.assign(featureFlags, getDefaultFlags());
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🚩 Feature flags reset to defaults');
  }
}

/**
 * 플래그 상태 조회
 */
export function getFeatureFlags(): FeatureFlags {
  return { ...featureFlags };
}

/**
 * 특정 플래그 확인
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}

/**
 * 개발 환경에서 플래그 상태 출력
 */
export function logFeatureFlags(): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚩 Current feature flags:', featureFlags);
  }
}

// 앱 시작 시 플래그 상태 출력
if (process.env.NODE_ENV === 'development') {
  logFeatureFlags();
}
