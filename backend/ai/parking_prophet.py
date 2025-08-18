#!/usr/bin/env python3
import sys
import json
import sqlite3
import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta
import numpy as np
import math
import warnings
import requests
import os
from pathlib import Path
warnings.filterwarnings('ignore')

# .env 파일에서 환경변수 로드
def load_env():
    env_path = Path(__file__).parent.parent / '.env'
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value
    else:
        print(f".env 파일을 찾을 수 없음: {env_path}", file=sys.stderr)

# 환경변수 로드
load_env()

# 데이터베이스 경로
DB_PATH = Path(__file__).parent.parent / 'data' / 'parking.db'

def haversine_distance(coord1, coord2):
    """Haversine 공식을 사용한 거리 계산 (km)"""
    if not coord1 or not coord2 or len(coord1) != 2 or len(coord2) != 2:
        return float('inf')
    
    R = 6371.0  # 지구 반지름 (km)
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    
    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1
    
    a = (math.sin(delta_lat / 2)**2 + 
         math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def str_to_tuple(coord_str):
    """좌표 문자열을 튜플로 변환"""
    if coord_str and isinstance(coord_str, str):
        try:
            lat, lon = map(float, coord_str.split(','))
            return (lat, lon)
        except (ValueError, TypeError):
            return None
    return None

def get_coordinates_from_address(address):
    """네이버 검색 API를 사용해 주소의 좌표 가져오기"""
    try:
        # 환경변수에서 네이버 로컬 API 키 가져오기
        client_id = os.getenv('NAVER_CLIENT_LOCAL_ID')
        client_secret = os.getenv('NAVER_CLIENT_LOCAL_SECRET')
        
        if not client_id or not client_secret:
            print(f"네이버 API 키가 설정되지 않음", file=sys.stderr)
            return None
            
        headers = {
            'X-Naver-Client-Id': client_id,
            'X-Naver-Client-Secret': client_secret
        }
        
        params = {
            'query': address,
            'display': 1,
            'start': 1,
            'sort': 'random'
        }
        
        response = requests.get(
            'https://openapi.naver.com/v1/search/local.json',
            headers=headers,
            params=params,
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('items') and len(data['items']) > 0:
                item = data['items'][0]
                # 네이버 API는 경도(mapx), 위도(mapy) 순서로 반환 (10^7 배율)
                # 문자열로 올 수 있으므로 int로 변환
                lng = int(item['mapx']) / 10000000
                lat = int(item['mapy']) / 10000000
                return (lat, lng)
        
        return None
    except Exception as e:
        print(f"네이버 API 좌표 요청 실패: {e}", file=sys.stderr)
        return None

def train_prophet_models():
    """각 주차장별로 Prophet 모델 학습"""
    try:
        conn = sqlite3.connect(DB_PATH)
        df_status = pd.read_sql_query("SELECT * FROM parking_status", conn)
        conn.close()
        
        # Prophet 모델에 필요한 데이터프레임으로 변환
        df_status['ds'] = pd.to_datetime(df_status['collected_at']).dt.tz_localize(None)
        df_status['y'] = df_status['capacity'] - df_status['cur_parking']
        df_prophet = df_status[['parking_code', 'parking_name', 'capacity', 'ds', 'y']].copy()
        
        # 결측값 제거
        df_prophet = df_prophet.dropna(subset=['ds', 'y'])
        
        models = {}
        for code, name in df_prophet[['parking_code', 'parking_name']].drop_duplicates().values:
            df_lot = df_prophet[df_prophet['parking_code'] == code].copy()
            df_lot = df_lot.dropna(subset=['ds', 'y'])
            
            # 반포천 공영주차장 학습 데이터 디버깅
            if str(code) == '3187200':
                print(f"🔍 반포천 공영주차장 학습 데이터 확인: {len(df_lot)}개 데이터", file=sys.stderr)
                print(f"  capacity: {df_lot['capacity'].iloc[0] if len(df_lot) > 0 else 'N/A'}", file=sys.stderr)
                print(f"  y값(잔여좌석) 범위: {df_lot['y'].min():.0f} ~ {df_lot['y'].max():.0f}", file=sys.stderr)
                print(f"  y값 평균: {df_lot['y'].mean():.0f}", file=sys.stderr)
                print(f"  최근 5개 데이터:", file=sys.stderr)
                for i, row in df_lot.tail(5).iterrows():
                    print(f"    {row['ds']}: {row['y']:.0f}대 여유", file=sys.stderr)
            
            # 데이터가 충분한지 확인
            if len(df_lot) < 10:  # 최소 10개 데이터 포인트 필요
                if str(code) == '3187200':
                    print(f"❌ 반포천 공영주차장: 데이터 부족 ({len(df_lot)}개)", file=sys.stderr)
                continue
                
            try:
                m = Prophet(
                    yearly_seasonality=False,
                    weekly_seasonality=True,
                    daily_seasonality=True,
                    changepoint_prior_scale=0.05,  # 더 유연한 변화점 감지
                    seasonality_prior_scale=1.0,   # 계절성 효과 줄임
                    seasonality_mode='additive'    # multiplicative에서 additive로 변경
                )
                m.fit(df_lot[['ds', 'y']])
                
                if str(code) == '3187200':
                    print(f"✅ 반포천 공영주차장: Prophet 모델 학습 완료", file=sys.stderr)
                
                models[str(code)] = {
                    'name': name,
                    'capacity': int(df_lot['capacity'].iloc[0]),
                    'model': m
                }
            except Exception as e:
                if str(code) == '3187200':
                    print(f"❌ 반포천 공영주차장 모델 학습 실패: {e}", file=sys.stderr)
                else:
                    print(f"모델 학습 실패 (주차장 코드: {code}): {e}", file=sys.stderr)
                continue
                
        return models
    except Exception as e:
        print(f"모델 학습 중 오류: {e}", file=sys.stderr)
        return {}

def predict_congestion(models, parking_time):
    """혼잡도 예측"""
    future_df = pd.DataFrame({'ds': [pd.to_datetime(parking_time)]})
    predictions = []
    
    for code, info in models.items():
        try:
            model = info['model']
            capacity = info['capacity']
            
            forecast = model.predict(future_df)
            predicted_available = forecast['yhat'].iloc[0]
            
            # 반포천 공영주차장 예측 디버깅
            if code == '3187200':
                print(f"🔍 반포천 공영주차장 Prophet 예측:", file=sys.stderr)
                print(f"  원본 예측값: {predicted_available:.2f}", file=sys.stderr)
                print(f"  용량: {capacity}", file=sys.stderr)
                print(f"  예측 시간: {parking_time}", file=sys.stderr)
            
            # 예측값 보정
            if predicted_available < 0:
                if code == '3187200':
                    print(f"  ⚠️ 음수 예측값을 0으로 보정: {predicted_available:.2f} → 0", file=sys.stderr)
                predicted_available = 0
            elif predicted_available > capacity:
                if code == '3187200':
                    print(f"  ⚠️ 용량 초과 예측값을 용량으로 보정: {predicted_available:.2f} → {capacity}", file=sys.stderr)
                predicted_available = capacity
                
            congestion_rate = (predicted_available / capacity) * 100 if capacity > 0 else 0
            
            if congestion_rate <= 10:
                congestion_level = 'Congested'
            elif congestion_rate <= 30:
                congestion_level = 'Normal'
            else:
                congestion_level = 'Quiet'
                
            predictions.append({
                'parking_code': code,
                'predicted_available': int(round(predicted_available)),
                'congestion_level': congestion_level,
                'congestion_rate': round(congestion_rate, 2)
            })
        except Exception as e:
            print(f"예측 실패 (주차장 코드: {code}): {e}", file=sys.stderr)
            continue
            
    return predictions

def recommend_parking_with_prophet(destination_coords, num_recommendations=5, prediction_time=None):
    """Prophet 모델을 사용한 주차장 추천"""
    try:
        if prediction_time is None:
            prediction_time = datetime.now()
        
        # Prophet 모델 학습
        models = train_prophet_models()
        if not models:
            return {
                "success": False,
                "message": "Prophet 모델을 학습할 수 없습니다."
            }
        
        # 혼잡도 예측
        congestion_predictions = predict_congestion(models, prediction_time)
        print(f"예측 결과 수: {len(congestion_predictions)}", file=sys.stderr)
        if congestion_predictions:
            print(f"첫 번째 예측: {congestion_predictions[0]}", file=sys.stderr)
        
        # 주차장 정보 가져오기
        conn = sqlite3.connect(DB_PATH)
        df_lots = pd.read_sql_query("SELECT * FROM parking_lots", conn)
        conn.close()
        
        print(f"전체 주차장 수: {len(df_lots)}", file=sys.stderr)
        
        # 좌표 변환 - lat_wgs84, lng_wgs84 컬럼 사용하거나 네이버 API로 가져오기 (제한적으로)
        api_call_count = 0
        max_api_calls = 10  # 테스트를 위해 최대 10개만 호출
        
        def get_coordinates_for_row(row):
            nonlocal api_call_count
            
            # 기존 좌표가 있으면 사용
            if pd.notna(row['lat_wgs84']) and pd.notna(row['lng_wgs84']):
                try:
                    lat = float(row['lat_wgs84'])
                    lng = float(row['lng_wgs84'])
                    return (lat, lng)
                except (ValueError, TypeError):
                    pass
            
            # API 호출 제한 체크
            if api_call_count >= max_api_calls:
                return None
            
            # 좌표가 없으면 네이버 API로 가져오기
            if pd.notna(row['addr']):
                print(f"좌표 없음 - 네이버 API로 조회 ({api_call_count+1}/{max_api_calls}): {row['addr']}", file=sys.stderr)
                coords = get_coordinates_from_address(row['addr'])
                api_call_count += 1
                
                if coords:
                    print(f"좌표 획득: {row['addr']} -> {coords}", file=sys.stderr)
                    return coords
                    
                # API 호출 간 딜레이 추가 (Rate Limit 방지)
                import time
                time.sleep(0.1)
            
            return None
        
        df_lots['coordinates'] = df_lots.apply(get_coordinates_for_row, axis=1)
        df_lots = df_lots.dropna(subset=['coordinates'])
        
        print(f"좌표가 있는 주차장 수: {len(df_lots)}", file=sys.stderr)
        
        # 예측 결과와 주차장 정보 결합
        prediction_dict = {pred['parking_code']: pred for pred in congestion_predictions}
        print(f"예측 딕셔너리 키 개수: {len(prediction_dict)}", file=sys.stderr)
        
        # 반포천 공영주차장이 예측에 포함되었는지 확인
        if '3187200' in prediction_dict:
            print(f"✅ 반포천 공영주차장이 예측 딕셔너리에 포함됨", file=sys.stderr)
            print(f"  예측값: {prediction_dict['3187200']}", file=sys.stderr)
        else:
            print(f"❌ 반포천 공영주차장이 예측 딕셔너리에 없음", file=sys.stderr)
            print(f"  예측 딕셔너리의 처음 5개 키: {list(prediction_dict.keys())[:5]}", file=sys.stderr)
        
        recommendations = []
        seen_parking_codes = set()  # 중복 방지용
        
        for _, row in df_lots.iterrows():
            parking_code = str(row['parking_code'])
            
            # 반포천 공영주차장 디버깅
            if parking_code == '3187200':
                print(f"🔍 반포천 공영주차장 처리 시작", file=sys.stderr)
                print(f"  좌표: {row['coordinates']}", file=sys.stderr)
            
            # 중복 체크
            if parking_code in seen_parking_codes:
                if parking_code == '3187200':
                    print(f"❌ 반포천 공영주차장: 중복으로 인해 스킵", file=sys.stderr)
                continue
            
            if parking_code not in prediction_dict:
                if parking_code == '3187200':
                    print(f"❌ 반포천 공영주차장: 예측 딕셔너리에 없어서 스킵", file=sys.stderr)
                continue
                
            pred = prediction_dict[parking_code]
            coords = row['coordinates']
            
            # 거리 계산
            distance = haversine_distance(destination_coords, coords)
            
            if parking_code == '3187200':
                print(f"🔍 반포천 공영주차장 거리: {distance:.2f}km", file=sys.stderr)
                print(f"  목적지 좌표: {destination_coords}", file=sys.stderr)
                print(f"  주차장 좌표: {coords}", file=sys.stderr)
            
            if distance > 15:  # 15km 이내만
                if parking_code == '3187200':
                    print(f"❌ 반포천 공영주차장: 15km 초과로 인해 스킵 ({distance:.2f}km)", file=sys.stderr)
                continue
                
            # # 기존 점수 계산 로직 (주석처리)
            # congestion_scores = {'Quiet': 5, 'Normal': 3, 'Congested': 1}
            # congestion_score = congestion_scores.get(pred['congestion_level'], 1)
            
            # 개선된 점수 계산 로직 - 거리 중심
            predicted_spaces = pred['predicted_available']
            
            # 1. 거리 점수 (0-10점, 가까울수록 높음)
            # 1km 이내: 10점, 5km: 5점, 10km 이상: 1점
            if distance <= 1.0:
                distance_score = 10
            elif distance <= 3.0:
                distance_score = 8 - (distance - 1) * 1.5  # 1-3km: 8-5점
            elif distance <= 5.0:
                distance_score = 5 - (distance - 3) * 1.5  # 3-5km: 5-2점
            else:
                distance_score = max(1, 2 - (distance - 5) * 0.2)  # 5km 이상: 2-1점
            
            # 2. 예상 좌석수 점수 (0-10점)
            if predicted_spaces >= 10:
                availability_score = 10  # 10대 이상이면 충분
            elif predicted_spaces >= 5:
                availability_score = 7 + (predicted_spaces - 5) * 0.6  # 5-9대: 7-10점
            elif predicted_spaces >= 2:
                availability_score = 4 + (predicted_spaces - 2) * 1  # 2-4대: 4-7점
            elif predicted_spaces >= 1:
                availability_score = 2  # 1대: 2점
            else:
                availability_score = 0  # 0대: 0점
            
            # 3. 거리별 가중치 적용
            # 가까운 곳(3km 이내)은 거리를 더 중요하게, 먼 곳은 좌석수를 더 중요하게
            if distance <= 3.0:
                # 가까운 곳: 거리 70%, 좌석수 30%
                total_score = (distance_score * 0.7) + (availability_score * 0.3)
            else:
                # 먼 곳: 거리 40%, 좌석수 60% (멀리 갈거면 확실히 있어야 함)
                total_score = (distance_score * 0.4) + (availability_score * 0.6)
            
            # 4. 보너스 점수 (특별한 조건들)
            bonus_score = 0
            
            # 매우 가까우면서 좌석이 있는 경우 보너스
            if distance <= 0.5 and predicted_spaces >= 1:
                bonus_score += 2
            
            # 적당히 가깝고 여유로운 경우 보너스  
            if distance <= 2.0 and predicted_spaces >= 5:
                bonus_score += 1
            
            total_score += bonus_score
            total_score = min(total_score, 10)  # 최대 10점으로 제한
            
            if parking_code == '3187200':
                print(f"✅ 반포천 공영주차장 점수 계산 완료:", file=sys.stderr)
                print(f"  거리점수: {distance_score:.2f}, 좌석점수: {availability_score:.2f}, 보너스: {bonus_score:.2f}", file=sys.stderr)
                print(f"  총점: {total_score:.2f}, 예상좌석: {predicted_spaces}대", file=sys.stderr)
            
            recommendations.append({
                'parking_code': parking_code,
                'parking_name': row['parking_name'],
                'addr': row['addr'],
                'coordinates': coords,
                'predicted_available': predicted_spaces,
                'congestion_level': pred['congestion_level'],
                'congestion_rate': pred['congestion_rate'],
                'distance_km': round(distance, 2),
                'distance_score': round(distance_score, 2),
                'availability_score': round(availability_score, 2),
                'bonus_score': round(bonus_score, 2),
                'total_score': round(total_score, 2),
                'tel': row.get('tel'),
                'pay_yn_name': row.get('pay_yn_name'),
                'weekday_begin': row.get('weekday_begin'),
                'weekday_end': row.get('weekday_end')
            })
            
            seen_parking_codes.add(parking_code)  # 중복 방지용 추가
        
        if not recommendations:
            return {
                "success": True,
                "data": [],
                "message": "주변에 추천할 주차장이 없습니다."
            }
        
        # # 기존 거리 점수 계산 (주석처리)
        # max_distance = max(rec['distance_km'] for rec in recommendations)
        # for rec in recommendations:
        #     if max_distance > 0:
        #         rec['distance_score'] = ((max_distance - rec['distance_km']) / max_distance) * 10
        #     else:
        #         rec['distance_score'] = 10
        #     rec['total_score'] = (rec['congestion_score'] * 0.6) + (rec['distance_score'] * 0.4)
        
        # 디버그 로그
        print(f"점수 계산 완료: {len(recommendations)}개 주차장", file=sys.stderr)
        for rec in recommendations[:3]:  # 상위 3개만 로그
            print(f"  {rec['parking_name']}: 총점 {rec['total_score']} (거리 {rec['distance_score']} + 좌석 {rec['availability_score']} + 보너스 {rec['bonus_score']}) - {rec['distance_km']}km, {rec['predicted_available']}대", file=sys.stderr)
        
        # 점수 순으로 정렬
        recommendations.sort(key=lambda x: x['total_score'], reverse=True)
        top_recommendations = recommendations[:num_recommendations]
        
        return {
            "success": True,
            "data": top_recommendations,
            "total_found": len(recommendations),
            "prediction_time": prediction_time.isoformat(),
            "models_trained": len(models),
            "message": f"Prophet 모델을 사용하여 {len(top_recommendations)}개의 주차장을 추천합니다."
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": f"추천 과정에서 오류가 발생했습니다: {str(e)}"
        }

def main():
    """메인 함수 - 명령행 인자로 실행"""
    try:
        if len(sys.argv) < 3:
            print(json.dumps({
                "success": False,
                "message": "사용법: python parking_prophet.py <lat> <lng> [num_recommendations] [prediction_time]"
            }))
            return
        
        lat = float(sys.argv[1])
        lng = float(sys.argv[2])
        num_rec = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        
        # 예측 시간 (옵션)
        prediction_time = None
        if len(sys.argv) > 4:
            try:
                prediction_time = datetime.fromisoformat(sys.argv[4])
            except:
                prediction_time = datetime.now()
        else:
            prediction_time = datetime.now()
        
        result = recommend_parking_with_prophet([lat, lng], num_rec, prediction_time)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": f"실행 중 오류: {str(e)}"
        }, ensure_ascii=False))

if __name__ == "__main__":
    main()