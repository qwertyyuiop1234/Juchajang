/**
 * 간단한 LRU 캐시 서비스
 * 메모리 기반으로 빠른 응답 제공
 */
class CacheService {
  constructor(maxSize = 100, defaultTtlMs = 60000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
    this.cache = new Map();
  }

  /**
   * 캐시 키 생성
   */
  generateKey(prefix, ...params) {
    return `${prefix}:${params.map(p => 
      typeof p === 'number' ? p.toFixed(3) : String(p)
    ).join(',')}`;
  }

  /**
   * 캐시에서 데이터 조회
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // TTL 확인
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    // LRU: 최근 사용된 항목을 맨 뒤로 이동
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.data;
  }

  /**
   * 캐시에 데이터 저장
   */
  set(key, data, ttlMs = this.defaultTtlMs) {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }

  /**
   * 캐시 삭제
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * 캐시 전체 삭제
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 캐시 통계
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hits / (this.hits + this.misses) || 0
    };
  }

  /**
   * 만료된 항목 정리
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// 싱글톤 인스턴스
export const cacheService = new CacheService(200, 30000); // 200개 항목, 30초 TTL

// 주기적 정리 (5분마다)
setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);

export default cacheService;
