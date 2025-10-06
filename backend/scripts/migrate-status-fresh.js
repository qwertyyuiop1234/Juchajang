#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { firestoreService } from '../src/services/firestoreService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../data/parking.db');

/**
 * parking_status 데이터를 처음부터 깔끔하게 마이그레이션
 */
async function migrateParkingStatusFresh() {
  console.log('🚀 parking_status 데이터 전체 마이그레이션을 시작합니다...\n');
  
  let db;
  let stats = { total: 0, success: 0, failed: 0 };
  const startTime = Date.now();
  
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
    
    // Firestore가 비어있는지 확인
    const existingData = await firestoreService.getAllParkingStatusHistory(
      new Date(Date.now() - 365*24*60*60*1000), 
      new Date(), 
      10
    );
    console.log(`🔍 기존 Firestore 데이터: ${existingData.length}개 (비어있음 확인)`);
    
    // SQLite 총 데이터 개수 확인
    const totalCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM parking_status', [], (err, row) => {
        if (err) {
          reject(new Error(`데이터 개수 조회 실패: ${err.message}`));
          return;
        }
        resolve(row.count);
      });
    });
    
    console.log(`📊 SQLite 총 데이터: ${totalCount}개`);
    stats.total = totalCount;
    
    // 배치 크기 설정 (메모리 효율성을 위해)
    const batchSize = 500;
    let offset = 0;
    let processedBatches = 0;
    
    while (offset < totalCount) {
      // 배치별로 데이터 조회
      const parkingStatuses = await new Promise((resolve, reject) => {
        const query = `
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
          LIMIT ${batchSize} OFFSET ${offset}
        `;

        db.all(query, [], (err, rows) => {
          if (err) {
            reject(new Error(`배치 데이터 조회 실패: ${err.message}`));
            return;
          }
          resolve(rows);
        });
      });
      
      // 배치 처리
      for (const status of parkingStatuses) {
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
        } catch (error) {
          console.error(`❌ 마이그레이션 실패 (${status.parking_code}):`, error.message);
          stats.failed++;
        }
      }
      
      offset += batchSize;
      processedBatches++;
      
      // 진행률 표시
      const progress = Math.min(Math.round((stats.success + stats.failed) / stats.total * 100), 100);
      console.log(`⏳ 배치 ${processedBatches} 완료: ${progress}% (${stats.success + stats.failed}/${stats.total}) - 성공: ${stats.success}, 실패: ${stats.failed}`);
      
      // Firestore 요청 제한 방지를 위한 짧은 대기
      if (processedBatches % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log('\n🎉 parking_status 마이그레이션 완료!');
    console.log(`📊 결과: 성공 ${stats.success}개, 실패 ${stats.failed}개 (총 ${stats.total}개)`);
    console.log(`⏱️  소요 시간: ${duration}초`);
    console.log(`📈 처리 속도: ${Math.round(stats.success / duration)}개/초`);
    
    // 최종 검증
    console.log('\n🔍 마이그레이션 결과 검증 중...');
    const finalHistory = await firestoreService.getAllParkingStatusHistory(
      new Date(Date.now() - 365*24*60*60*1000), 
      new Date(), 
      15000
    );
    console.log(`✅ Firestore 최종 데이터: ${finalHistory.length}개`);
    
    const successRate = Math.round((stats.success / stats.total) * 100);
    console.log(`🎯 성공률: ${successRate}%`);
    
    if (stats.failed === 0) {
      console.log('🌟 모든 데이터가 성공적으로 마이그레이션되었습니다!');
    } else {
      console.log(`⚠️  ${stats.failed}개 데이터 마이그레이션에 실패했습니다.`);
    }
    
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

migrateParkingStatusFresh();