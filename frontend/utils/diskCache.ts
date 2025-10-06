import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
  key: string;
}


class DiskCache {
  private readonly CACHE_VERSION = 'v1';
  private readonly MAX_ENTRIES = 100; // 최대 캐시 엔트리 수
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5분 기본 TTL
  private readonly CACHE_PREFIX = 'parking_cache:';
  

  /**
   * 캐시 키 생성
   */
  private generateKey(lat: number, lng: number, radius: number, zoom: number): string {
    return `${this.CACHE_PREFIX}nearby:${lat.toFixed(4)},${lng.toFixed(4)},${radius},z${zoom}:${this.CACHE_VERSION}`;
  }

  /**
   * 캐시 엔트리 저장
   */
  async set<T>(lat: number, lng: number, radius: number, zoom: number, data: T, ttlMs?: number): Promise<void> {
    try {
      const key = this.generateKey(lat, lng, radius, zoom);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: this.CACHE_VERSION,
        key
      };

      await AsyncStorage.setItem(key, JSON.stringify(entry));
      
      // 캐시 크기 관리 (LRU 방식)
      await this.cleanupIfNeeded();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`💾 디스크 캐시 저장: ${key}`);
      }
    } catch (error) {
      console.error('디스크 캐시 저장 실패:', error);
    }
  }

  /**
   * 캐시 엔트리 조회
   */
  async get<T>(lat: number, lng: number, radius: number, zoom: number, ttlMs?: number): Promise<T | null> {
    try {
      const key = this.generateKey(lat, lng, radius, zoom);
      const cached = await AsyncStorage.getItem(key);
      
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);
      const ttl = ttlMs || this.DEFAULT_TTL;
      const isExpired = Date.now() - entry.timestamp > ttl;

      if (isExpired) {
        await AsyncStorage.removeItem(key);
        if (process.env.NODE_ENV === 'development') {
          console.log(`⏰ 디스크 캐시 만료: ${key}`);
        }
        return null;
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 디스크 캐시 적중: ${key}`);
      }
      
      return entry.data;
    } catch (error) {
      console.error('디스크 캐시 조회 실패:', error);
      return null;
    }
  }

  /**
   * 캐시 엔트리 삭제
   */
  async remove(lat: number, lng: number, radius: number, zoom: number): Promise<void> {
    try {
      const key = this.generateKey(lat, lng, radius, zoom);
      await AsyncStorage.removeItem(key);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🗑️ 디스크 캐시 삭제: ${key}`);
      }
    } catch (error) {
      console.error('디스크 캐시 삭제 실패:', error);
    }
  }

  /**
   * 전체 캐시 무효화 (버전 업데이트 시)
   */
  async invalidateAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`🔄 전체 디스크 캐시 무효화: ${cacheKeys.length}개`);
      }
    } catch (error) {
      console.error('전체 캐시 무효화 실패:', error);
    }
  }

  /**
   * 캐시 크기 관리 (LRU)
   */
  private async cleanupIfNeeded(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length <= this.MAX_ENTRIES) {
        return;
      }

      // 타임스탬프 기준으로 정렬하여 오래된 것부터 제거
      const entries = await Promise.all(
        cacheKeys.map(async (key) => {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const entry = JSON.parse(cached);
            return { key, timestamp: entry.timestamp };
          }
          return { key, timestamp: 0 };
        })
      );

      entries.sort((a, b) => a.timestamp - b.timestamp);
      
      const toRemove = entries.slice(0, entries.length - this.MAX_ENTRIES);
      const keysToRemove = toRemove.map(entry => entry.key);
      
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🧹 디스크 캐시 정리: ${keysToRemove.length}개 제거`);
        }
      }
    } catch (error) {
      console.error('캐시 정리 실패:', error);
    }
  }


  /**
   * 앱 시작 시 최근 캐시 키들 미리 로드 (하이드레이트)
   */
  async preloadRecentKeys(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 디스크 캐시 하이드레이트: ${cacheKeys.length}개 키 발견`);
      }
    } catch (error) {
      console.error('캐시 하이드레이트 실패:', error);
    }
  }
}

// 싱글톤 인스턴스
export const diskCache = new DiskCache();
export default diskCache;
