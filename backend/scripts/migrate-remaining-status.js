#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { firestoreService } from '../src/services/firestoreService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/parking.db');

/**
 * 남은 주차장 상태 데이터만 마이그레이션 (중복 제외)
 */
async function migrateRemainingStatus() {
  console.log('🔄 남은 주차장 상태 데이터 마이그레이션을 시작합니다...\n');
  
  let db;
  let stats = { total: 0, success: 0, failed: 0, skipped: 0 };
  
  try {
    // SQLite 연결
    db = await new Promise((resolve, reject) => {
      const database = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          reject(new Error(`SQLite 연결 실패: ${err.message}`));
          return;
        }
        console.log('✅ SQLite 연결 성공');
        resolve(database);
      });
    });
    
    // Firestore 연결 테스트
    const testResult = await firestoreService.testConnection();
    if (!testResult.success) {
      throw new Error(testResult.message);
    }
    console.log('✅ Firestore 연결 성공');
    
    // 1. 이미 Firestore에 있는 데이터의 최신 시간 확인
    console.log('🔍 Firestore에서 기존 데이터의 최신 시간을 확인합니다...');
    const existingData = await firestoreService.getAllParkingStatusHistory(
      new Date(Date.now() - 365*24*60*60*1000), 
      new Date(), 
      1
    );
    
    let lastMigratedTime = null;
    if (existingData.length > 0 && existingData[0].collected_at) {
      try {
        // Firestore Timestamp 객체를 JavaScript Date로 변환
        const collected_at = existingData[0].collected_at;
        if (collected_at.toDate && typeof collected_at.toDate === 'function') {
          lastMigratedTime = collected_at.toDate();
        } else if (collected_at instanceof Date) {
          lastMigratedTime = collected_at;
        } else {
          lastMigratedTime = new Date(collected_at);
        }
        console.log(`📅 마지막 마이그레이션 시간: ${lastMigratedTime.toISOString()}`);
      } catch (e) {
        console.log(`⚠️  시간 파싱 실패: ${e.message}. 전체 데이터를 마이그레이션합니다.`);
        lastMigratedTime = null;
      }
    } else {
      console.log('⚠️  기존 데이터가 없거나 시간 정보가 없습니다. 전체 데이터를 마이그레이션합니다.');
    }
    
    // 2. SQLite에서 남은 데이터만 조회
    const parkingStatuses = await new Promise((resolve, reject) => {
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
      
      // 마지막 마이그레이션 시간 이후 데이터만 조회
      if (lastMigratedTime) {
        query = `
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
          WHERE collected_at < '${lastMigratedTime.toISOString().replace('T', ' ').replace('Z', '')}'
          ORDER BY collected_at DESC
        `;
      }

      db.all(query, [], (err, rows) => {
        if (err) {
          reject(new Error(`상태 데이터 조회 실패: ${err.message}`));
          return;
        }
        resolve(rows);
      });
    });
    
    stats.total = parkingStatuses.length;
    console.log(`📊 마이그레이션할 남은 상태 데이터: ${parkingStatuses.length}개\n`);
    
    if (parkingStatuses.length === 0) {
      console.log('✅ 마이그레이션할 새로운 데이터가 없습니다!');
      return;
    }
    
    // 3. 상태 데이터 마이그레이션
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

        stats.success++;
        
        // 진행률 표시
        if ((i + 1) % 50 === 0 || i + 1 === parkingStatuses.length) {
          const progress = Math.round(((i + 1) / parkingStatuses.length) * 100);
          console.log(`⏳ 진행률: ${progress}% (${i + 1}/${parkingStatuses.length}) - 성공: ${stats.success}, 실패: ${stats.failed}`);
        }
      } catch (error) {
        console.error(`❌ 상태 마이그레이션 실패 (${status.parking_code}):`, error.message);
        stats.failed++;
      }
    }
    
    console.log('\n🎉 남은 주차장 상태 데이터 마이그레이션 완료!');
    console.log(`📊 결과: 성공 ${stats.success}개, 실패 ${stats.failed}개 (총 ${stats.total}개 처리)`);
    
    // 4. 최종 검증
    console.log('\n🔍 최종 마이그레이션 결과 검증 중...');
    const finalHistory = await firestoreService.getAllParkingStatusHistory(
      new Date(Date.now() - 365*24*60*60*1000), 
      new Date(), 
      15000
    );
    console.log(`✅ Firestore 총 상태 데이터: ${finalHistory.length}개`);
    
    // SQLite 총 개수와 비교
    const sqliteTotal = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM parking_status', [], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row.count);
      });
    });
    
    console.log(`📊 SQLite 총 데이터: ${sqliteTotal}개`);
    console.log(`📊 마이그레이션 완료율: ${Math.round((finalHistory.length / sqliteTotal) * 100)}%`);
    
  } catch (error) {
    console.error('\n💥 마이그레이션 실패:', error.message);
    process.exit(1);
  } finally {
    // SQLite 연결 종료
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('SQLite 연결 종료 실패:', err.message);
        }
      });
    }
  }
}

migrateRemainingStatus();