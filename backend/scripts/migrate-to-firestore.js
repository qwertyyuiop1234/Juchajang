#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { firestoreService } from '../src/services/firestoreService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite DB 경로
const DB_PATH = path.join(__dirname, '../data/parking.db');

/**
 * SQLite 데이터를 Firestore로 마이그레이션하는 스크립트
 */
class DataMigrator {
  constructor() {
    this.db = null;
    this.stats = {
      parkingLots: { total: 0, success: 0, failed: 0 },
      parkingStatus: { total: 0, success: 0, failed: 0 }
    };
  }

  /**
   * SQLite 데이터베이스 연결
   */
  async connectSQLite() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(new Error(`SQLite 연결 실패: ${err.message}`));
          return;
        }
        console.log('✅ SQLite 데이터베이스에 연결되었습니다.');
        resolve();
      });
    });
  }

  /**
   * SQLite에서 주차장 기본 정보 조회
   */
  async getParkingLotsFromSQLite() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          parking_code,
          parking_name,
          addr,
          lat_wgs84,
          lng_wgs84,
          tel,
          pay_yn_name,
          weekday_begin,
          weekday_end,
          parking_type,
          oper_day,
          fee_info,
          rates,
          time_rate,
          day_maximum
        FROM parking_lots
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(new Error(`주차장 정보 조회 실패: ${err.message}`));
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * SQLite에서 주차장 상태 정보 조회
   */
  async getParkingStatusFromSQLite(limit = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          parking_code,
          parking_name,
          capacity,
          cur_parking,
          cur_parking_time,
          parking_status_yn,
          parking_status_name,
          collected_at
        FROM parking_status
        ORDER BY collected_at DESC
      `;

      if (limit) {
        query += ` LIMIT ${limit}`;
      }

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(new Error(`주차장 상태 조회 실패: ${err.message}`));
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * 주차장 기본 정보 마이그레이션
   */
  async migrateParkingLots() {
    console.log('\n🔄 주차장 기본 정보 마이그레이션을 시작합니다...');
    
    try {
      const parkingLots = await this.getParkingLotsFromSQLite();
      this.stats.parkingLots.total = parkingLots.length;

      console.log(`📊 총 ${parkingLots.length}개의 주차장 정보를 마이그레이션합니다.`);

      for (let i = 0; i < parkingLots.length; i++) {
        const lot = parkingLots[i];
        
        try {
          // coordinates 필드 생성 (lat, lng가 있는 경우)
          let coordinates = null;
          if (lot.lat_wgs84 && lot.lng_wgs84) {
            try {
              const lat = parseFloat(lot.lat_wgs84);
              const lng = parseFloat(lot.lng_wgs84);
              if (!isNaN(lat) && !isNaN(lng)) {
                coordinates = `${lat},${lng}`;
              }
            } catch (e) {
              // 좌표 파싱 실패는 무시
            }
          }

          await firestoreService.saveParkingLot({
            parking_code: lot.parking_code,
            parking_name: lot.parking_name,
            addr: lot.addr,
            coordinates: coordinates,
            lat_wgs84: lot.lat_wgs84,
            lng_wgs84: lot.lng_wgs84,
            tel: lot.tel,
            pay_yn_name: lot.pay_yn_name,
            weekday_begin: lot.weekday_begin,
            weekday_end: lot.weekday_end,
            parking_type: lot.parking_type,
            oper_day: lot.oper_day,
            fee_info: lot.fee_info,
            rates: lot.rates,
            time_rate: lot.time_rate,
            day_maximum: lot.day_maximum
          });

          this.stats.parkingLots.success++;
          
          // 진행률 표시
          if ((i + 1) % 10 === 0 || i + 1 === parkingLots.length) {
            const progress = Math.round(((i + 1) / parkingLots.length) * 100);
            console.log(`⏳ 진행률: ${progress}% (${i + 1}/${parkingLots.length})`);
          }
        } catch (error) {
          console.error(`❌ 주차장 ${lot.parking_code} 마이그레이션 실패:`, error.message);
          this.stats.parkingLots.failed++;
        }
      }

      console.log('✅ 주차장 기본 정보 마이그레이션 완료');
      console.log(`   - 성공: ${this.stats.parkingLots.success}개`);
      console.log(`   - 실패: ${this.stats.parkingLots.failed}개`);

    } catch (error) {
      console.error('❌ 주차장 기본 정보 마이그레이션 중 오류:', error.message);
      throw error;
    }
  }

  /**
   * 주차장 상태 정보 마이그레이션
   */
  async migrateParkingStatus(limit = 10000) {
    console.log('\n🔄 주차장 상태 정보 마이그레이션을 시작합니다...');
    
    try {
      const parkingStatuses = await this.getParkingStatusFromSQLite(limit);
      this.stats.parkingStatus.total = parkingStatuses.length;

      console.log(`📊 최근 ${parkingStatuses.length}개의 주차장 상태 정보를 마이그레이션합니다.`);

      for (let i = 0; i < parkingStatuses.length; i++) {
        const status = parkingStatuses[i];
        
        try {
          await firestoreService.saveParkingStatus({
            parking_code: status.parking_code,
            parking_name: status.parking_name,
            capacity: status.capacity,
            cur_parking: status.cur_parking,
            cur_parking_time: status.cur_parking_time,
            parking_status_yn: status.parking_status_yn,
            parking_status_name: status.parking_status_name,
            collected_at: status.collected_at ? new Date(status.collected_at) : null
          });

          this.stats.parkingStatus.success++;
          
          // 진행률 표시
          if ((i + 1) % 100 === 0 || i + 1 === parkingStatuses.length) {
            const progress = Math.round(((i + 1) / parkingStatuses.length) * 100);
            console.log(`⏳ 진행률: ${progress}% (${i + 1}/${parkingStatuses.length})`);
          }
        } catch (error) {
          console.error(`❌ 상태 정보 마이그레이션 실패 (${status.parking_code}):`, error.message);
          this.stats.parkingStatus.failed++;
        }
      }

      console.log('✅ 주차장 상태 정보 마이그레이션 완료');
      console.log(`   - 성공: ${this.stats.parkingStatus.success}개`);
      console.log(`   - 실패: ${this.stats.parkingStatus.failed}개`);

    } catch (error) {
      console.error('❌ 주차장 상태 정보 마이그레이션 중 오류:', error.message);
      throw error;
    }
  }

  /**
   * Firestore 연결 테스트
   */
  async testFirestoreConnection() {
    console.log('🔍 Firestore 연결을 테스트합니다...');
    
    try {
      const result = await firestoreService.testConnection();
      if (result.success) {
        console.log('✅ Firestore 연결 성공');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('❌ Firestore 연결 실패:', error.message);
      throw error;
    }
  }

  /**
   * 전체 마이그레이션 실행
   */
  async runMigration() {
    const startTime = Date.now();
    
    try {
      console.log('🚀 SQLite → Firestore 데이터 마이그레이션을 시작합니다...\n');
      
      // 1. Firestore 연결 테스트
      await this.testFirestoreConnection();
      
      // 2. SQLite 연결
      await this.connectSQLite();
      
      // 3. 주차장 기본 정보 마이그레이션
      await this.migrateParkingLots();
      
      // 4. 주차장 상태 정보 마이그레이션 (최근 10,000개)
      await this.migrateParkingStatus(10000);
      
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      console.log('\n🎉 마이그레이션이 완료되었습니다!');
      console.log(`⏱️  소요 시간: ${duration}초`);
      console.log('\n📊 마이그레이션 결과:');
      console.log(`   주차장 정보: ${this.stats.parkingLots.success}/${this.stats.parkingLots.total} 성공`);
      console.log(`   상태 정보: ${this.stats.parkingStatus.success}/${this.stats.parkingStatus.total} 성공`);
      
      if (this.stats.parkingLots.failed > 0 || this.stats.parkingStatus.failed > 0) {
        console.log('\n⚠️  일부 데이터 마이그레이션에 실패했습니다. 로그를 확인해 주세요.');
      }
      
    } catch (error) {
      console.error('\n💥 마이그레이션 실패:', error.message);
      process.exit(1);
    } finally {
      // SQLite 연결 종료
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('SQLite 연결 종료 실패:', err.message);
          }
        });
      }
    }
  }

  /**
   * 데이터 검증
   */
  async verifyMigration() {
    console.log('\n🔍 마이그레이션된 데이터를 검증합니다...');
    
    try {
      // Firestore에서 데이터 개수 확인
      const firestoreLots = await firestoreService.getAllParkingLots();
      console.log(`✅ Firestore 주차장 개수: ${firestoreLots.length}개`);
      
      // 샘플 데이터 확인
      if (firestoreLots.length > 0) {
        const sampleLot = firestoreLots[0];
        console.log(`📋 샘플 데이터: ${sampleLot.parking_name} (${sampleLot.parking_code})`);
      }
      
    } catch (error) {
      console.error('❌ 데이터 검증 실패:', error.message);
    }
  }
}

// 스크립트 실행
async function main() {
  const migrator = new DataMigrator();
  
  // 명령행 인자 확인
  const args = process.argv.slice(2);
  const shouldVerify = args.includes('--verify');
  
  try {
    await migrator.runMigration();
    
    if (shouldVerify) {
      await migrator.verifyMigration();
    }
    
    console.log('\n✨ 모든 작업이 완료되었습니다!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 작업 실패:', error.message);
    process.exit(1);
  }
}

// 메인 함수 실행
main();