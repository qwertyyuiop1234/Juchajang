from datetime import datetime, timedelta, timezone
import model
import preprocessing
import torch
import pandas as pd
import json
import recommend
if __name__ == '__main__':
    # input = ['capacity', 'add_time_rate', 'add_rates','time_rate', 'rates', 'coordinates','time']
    # loaded_model = model.load_model()
    # target_parking_code =preprocessing.get_clean_parking_codes()
    # pred_list=[]
    # for code in target_parking_code:
    #     predictions = model.predict_recursive(
    #         parking_code=code,
    #         model=loaded_model
    #     )
    #     print(predictions)

    # loaded_model = model.load_model()
    # # 첫 번째 클린 코드를 사용
    #
    # target_parking_code = 171900
    #
    #
    # # 2. 예측 실행: predictions는 168개의 float 값을 가진 리스트여야 합니다.
    # predictions = model.predict_recursive(
    #     parking_code=target_parking_code,
    #     model=loaded_model
    # )
    #
    # # 3. 🚨 문제 해결: 예측 결과(predictions)를 직접 전달합니다.
    # # (이전 코드의 불필요한 pred_list.append(predictions) 제거)
    #
    # # 4. 현재 시간 설정 (UTC)
    # time = datetime.now(timezone.utc).replace(microsecond=0)
    #
    # # 5. JSON 포매팅 함수 호출
    # # model.format_predictions_to_json(parking_code, predictions_list, parking_data, last_updated_time)
    # json_output = model.format_predictions_to_json(parking_code=target_parking_code, predictions_list=predictions,last_updated_time=time)
    # json_data_dict = json.loads(json_output)
    # preprocessing.save_to_firebase(json_data_dict)

    print(recommend.recommend_parking_lots_integrated(37.55384119,126.97579392))


