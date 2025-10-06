import pandas as pd
import numpy as np
from firebase_admin import firestore
from typing import Dict, Any, Optional, List
import json
import preprocessing # preprocessing.get_db() 함수가 이 모듈에 있다고 가정

# === 상수 설정 (생략) ===
WEIGHTS = {
    "distance": 0.40,  # 거리가 짧을수록 (가중치 0.40)
    "price": 0.40,  # 가격이 저렴할수록 (가중치 0.40)
    "congestion": 0.20  # 혼잡도가 낮을수록 (가중치 0.20)
}
NUM_TO_RECOMMEND = 30


# === 보조 함수 (재사용 - 생략) ===
def coordinate_proximity_index(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat = lat1 - lat2
    dlon = lon1 - lon2
    return dlat ** 2 + dlon ** 2


def normalize_score(value: float, min_val: float, max_val: float, reverse: bool = False) -> float:
    if max_val == min_val: return 0.5
    normalized = (value - min_val) / (max_val - min_val)
    return 1 - normalized if reverse else normalized


def extract_first_congestion(json_data: Optional[Dict[str, Any]]) -> Optional[str]:
    """
    로드된 딕셔너리 데이터에서 T+1 시점의 혼잡도를 추출합니다.
    """
    # 🚨 None 검사: 입력이 None이면 즉시 None 반환 (TypeError 방지)
    if json_data is None:
        return None

    try:
        # 데이터가 딕셔너리임을 보장하고, 'predictions' 키에 접근
        congestion_status = json_data['predictions'][0]['congestion']
        return congestion_status

    except (KeyError, IndexError):
        # 'predictions' 키가 없거나 리스트가 비어있는 경우
        return None
    except Exception as e:
        print(f"처리 중 예기치 않은 오류 발생: {e}")
        return None


# --------------------------------------------------------------------------------

def get_closest_parking_preprocessed(target_lat: float, target_lon: float) -> Optional[pd.DataFrame]:
    """
    CSV에서 데이터를 로드하고 전처리 및 근접도 계산을 수행하여
    가장 가까운 30개 주차장의 DataFrame을 반환합니다.
    """
    FILE_PATH = 'parking_lots.csv'

    # NaN 처리에 필요한 열: rates 계산에 time_rate, rates, coordinates 사용 가정
    cols_for_rates = ['time_rate', 'rates', 'coordinates']

    try:
        # CSV 파일 존재 확인
        import os
        if not os.path.exists(FILE_PATH):
            print(f"❌ 파일을 찾을 수 없습니다: {FILE_PATH}")
            print("💡 preprocessing.py의 get_data() 함수를 실행하여 CSV 파일을 생성하세요.")
            return None
        
        parking_df = pd.read_csv(FILE_PATH)

        # 스케일링 전 NaN이 포함된 행 제거
        # 'parking_name'과 'parking_code'는 필수 열이므로 나중에 확인
        parking_df = parking_df.dropna(subset=cols_for_rates + ['parking_name', 'parking_code'])

        # 1. coordinates 열을 lat, lon으로 분리 및 타입 변환
        # expand=True를 사용하여 DataFrame으로 분리
        if 'coordinates' not in parking_df.columns:
            print("❌ 'coordinates' 열이 CSV에 없습니다.")
            return None
        
        temp_df = parking_df['coordinates'].str.split(',', expand=True)
        if temp_df.shape[1] < 2:
            print("❌ coordinates 형식이 잘못되었습니다. 'lat,lon' 형식이어야 합니다.")
            return None
        
        parking_df['lat'] = pd.to_numeric(temp_df[0], errors='coerce')
        parking_df['lon'] = pd.to_numeric(temp_df[1], errors='coerce')
        
        # NaN 제거
        parking_df = parking_df.dropna(subset=['lat', 'lon'])
        
        # 중복 좌표 문제 해결: 주차장 코드 기반으로 작은 오프셋 추가
        import hashlib
        def add_unique_offset(lat, lon, parking_code):
            # 주차장 코드를 해시하여 일관된 오프셋 생성
            hash_obj = hashlib.md5(str(parking_code).encode())
            hash_int = int(hash_obj.hexdigest()[:8], 16)
            
            # -0.0001 ~ +0.0001 범위의 오프셋 생성 (약 10m 범위)
            lat_offset = ((hash_int % 2000) - 1000) / 10000000
            lon_offset = (((hash_int >> 16) % 2000) - 1000) / 10000000
            
            return lat + lat_offset, lon + lon_offset
        
        parking_df[['lat', 'lon']] = parking_df.apply(
            lambda row: add_unique_offset(row['lat'], row['lon'], row['parking_code']), 
            axis=1, result_type='expand'
        )

        # 2. 가격 정보 처리 (rates 계산)
        parking_df['add_rates'] = parking_df['add_rates'].astype(float)
        parking_df['time_rate'] = parking_df['time_rate'].astype(float)
        parking_df['rates'] = parking_df['add_rates'] * parking_df['time_rate']  # rates 계산
        
        # NaN 처리: rates가 NaN인 경우 기본값 1000원 사용
        parking_df['rates'] = parking_df['rates'].fillna(1000)

        # 필수 열 검증 (이미 dropna로 상당 부분 처리됨)
        required_cols = ['parking_code', 'lat', 'lon', 'rates', 'parking_name']
        if not all(col in parking_df.columns for col in required_cols):
            # 필요한 모든 열이 없으면 오류 발생 (CSV 파일 구조 문제)
            raise ValueError(f"전처리 후 DataFrame에 필수 열이 부족합니다: {required_cols}")

    except FileNotFoundError:
        print(f"❌ 파일을 찾을 수 없습니다: {FILE_PATH}")
        print("💡 다음 명령으로 CSV 파일을 생성하세요:")
        print("   python setup_csv.py")
        return None
    except Exception as e:
        print(f"❌ 데이터 로드 및 전처리 중 오류 발생: {e}")
        print(f"현재 DataFrame 컬럼: {parking_df.columns.tolist()}")
        import traceback
        traceback.print_exc()
        return None

    # 3. 근접도 지표 계산 및 정렬
    parking_df['distance_index'] = (parking_df['lat'] - target_lat) ** 2 + \
                                   (parking_df['lon'] - target_lon) ** 2

    sorted_df = parking_df.sort_values(by='distance_index', ascending=True)
    top_n_closest_df = sorted_df.head(NUM_TO_RECOMMEND)

    # 4. 최종 결과 DataFrame 반환 (필요한 열만)
    final_result_df = top_n_closest_df[[
        'parking_code', 'lat', 'lon', 'rates', 'parking_name', 'distance_index'
    ]].reset_index(drop=True)

    return final_result_df


def get_parking_prediction_data(db: firestore.client, parking_code: List[str]) -> Dict[str, Optional[Dict]]:
    """
    Firestore에서 주차장 코드 리스트에 해당하는 예측 문서를 모두 가져옵니다.
    """
    if db is None:
        return {code: None for code in parking_code}

    results = {}

    for code in parking_code:
        try:
            doc_ref = db.collection('parking_predictions').document(str(code))  # Ensure code is string
            doc = doc_ref.get()
            results[code] = doc.to_dict() if doc.exists else None
        except Exception as e:
            results[code] = None
            print(f"❌ 코드 {code} 로드 중 오류: {e}")

    # 🚨 수정: 루프를 통해 모은 results 딕셔너리 전체를 반환
    return results


def recommend_parking_lots_integrated(target_lat: float, target_lon: float) -> List[Dict]:
    """
    주어진 좌표를 기반으로 가장 가까운 30개 주차장을 검색하고,
    거리, 가격, 혼잡도 기준으로 상위 5개를 추천합니다.
    """

    # 1. 가장 가까운 30개 주차장 데이터 로드 및 전처리
    closest_df = get_closest_parking_preprocessed(target_lat, target_lon)
    if closest_df is None or closest_df.empty:
        print("❌ 주차장 데이터 로드 실패 또는 결과 없음.")
        print("💡 parking_lots.csv 파일이 있는지 확인하세요.")
        print("   없다면 'python setup_csv.py'로 생성하세요.")
        return []

    # 2. Firestore 데이터베이스 클라이언트 획득
    db = preprocessing.get_db() # 실제 환경에서 사용
    if db is None:
        print("⚠️ 경고: DB 연결 실패. 혼잡도 데이터를 가져올 수 없습니다.")

    # 3. Firestore에서 혼잡도 예측 데이터 로드
    parking_codes = closest_df['parking_code'].tolist()
    # Mocking: 실제 DB에서 가져오지 못할 경우 대비
    if db is None:
        # Mocking: 모든 코드에 대해 임의의 혼잡도 데이터 생성
        prediction_data = {
            code: {
                'predictions': [{'congestion': 'Congested' if (np.random.rand() > 0.8) else 'Normal'}]
            }
            for code in parking_codes
        }
    else:
        prediction_data = get_parking_prediction_data(db, parking_codes)

    # 4. 최종 추천 데이터 구조 생성
    scored_lots = []

    # Pandas DataFrame을 순회하며 모든 속성 결합 및 혼잡도 추출
    for index, lot in closest_df.iterrows():
        code = lot['parking_code']

        # 🚨 변경: pred_dict가 None일 경우 extract_first_congestion으로 전달하여 안전하게 처리
        pred_dict = prediction_data.get(code)  # 기본값을 지정하지 않거나, None을 기본값으로 사용

        # a. 혼잡도 추출 (T+1 시점)
        congestion_status = extract_first_congestion(pred_dict)

        # 혼잡도 상태를 수치화
        if congestion_status == 'Congested':
            congestion_metric = 0.9
        elif congestion_status == 'Busy':
            congestion_metric = 0.6
        else:  # Normal 또는 None (데이터 없음/오류 시)
            congestion_metric = 0.2

        # 안전하게 가격 정보 가져오기 (rates 컬럼 사용 - 이미 계산된 가격)
        price_value = lot.get('rates', 1000)  # 기본값 1000원
        
        scored_lots.append({
            'parking_code': code,
            'parking_name': lot['parking_name'],
            'distance_index': lot['distance_index'],  # 좌표 차이 제곱 합
            'price_rates': price_value,  # 가격 (10분당 요금)
            'congestion_rate': congestion_metric,  # 수치화된 혼잡도
            'lat': lot['lat'],
            'lon': lot['lon'],
            'rates': price_value  # 최종 결과에서 사용하기 위해 추가
        })

    # 5. 정규화 및 최종 점수 계산
    if not scored_lots: return []

    # 정규화를 위한 최댓값/최솟값 계산
    distances = [lot['distance_index'] for lot in scored_lots]
    prices = [lot['price_rates'] for lot in scored_lots]
    congestions = [lot['congestion_rate'] for lot in scored_lots]

    min_dist, max_dist = min(distances), max(distances)
    min_price, max_price = min(prices), max(prices)
    min_cong, max_cong = min(congestions), max(congestions)

    for lot in scored_lots:
        # 가중치 계산: 거리, 가격, 혼잡도 모두 '낮을수록 좋음' (reverse=True)
        dist_score = normalize_score(lot['distance_index'], min_dist, max_dist, reverse=True)
        price_score = normalize_score(lot['price_rates'], min_price, max_price, reverse=True)
        cong_score = normalize_score(lot['congestion_rate'], min_cong, max_cong, reverse=True)  # 혼잡도가 낮을수록 점수 높음

        final_score = (
                dist_score * WEIGHTS["distance"] +
                price_score * WEIGHTS["price"] +
                cong_score * WEIGHTS["congestion"]
        )
        lot['final_recommendation_score'] = round(final_score, 4)

    # 6. 최종 점수 기준으로 정렬 및 상위 5개 추천
    scored_lots.sort(key=lambda x: x['final_recommendation_score'], reverse=True)

    recommendations = []
    for i, lot in enumerate(scored_lots[:5]):
        recommendations.append({
            'rank': i + 1,
            'parking_code': lot['parking_code'],
            'parking_name': lot['parking_name'],
            'lat': lot['lat'],
            'lon': lot['lon'],
            'distance_index': round(lot['distance_index'], 8),
            'price_rates': int(lot.get('rates', 1000)),  # rates 컬럼 사용, 기본값 1000
            'congestion_metric': lot['congestion_rate'],
            'final_score': lot['final_recommendation_score']
        })

    return recommendations


# ========================================================================================
# CLI 지원: Node.js에서 호출할 수 있도록 메인 함수 추가
# ========================================================================================
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "message": "사용법: python recommend.py <lat> <lng>"
        }, ensure_ascii=False))
        sys.exit(1)
    
    try:
        target_lat = float(sys.argv[1])
        target_lon = float(sys.argv[2])
        
        # 추천 실행
        recommendations = recommend_parking_lots_integrated(target_lat, target_lon)
        
        # JSON 형식으로 출력
        output = {
            "success": True,
            "data": recommendations,
            "message": f"{len(recommendations)}개의 주차장을 추천합니다."
        }
        
        print(json.dumps(output, ensure_ascii=False))
        
    except ValueError as e:
        print(json.dumps({
            "success": False,
            "message": f"잘못된 좌표 형식입니다: {str(e)}"
        }, ensure_ascii=False))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            "success": False,
            "message": f"추천 중 오류 발생: {str(e)}"
        }, ensure_ascii=False))
        sys.exit(1)