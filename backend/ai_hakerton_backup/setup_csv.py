"""
parking_lots.csv 파일을 Firestore에서 생성하는 스크립트
recommend.py가 작동하기 위해 필요합니다.
"""

import preprocessing

def main():
    print("🚀 Firestore에서 parking_lots.csv 생성 중...")
    
    try:
        # get_data() 함수가 parking_lots.csv를 자동으로 생성합니다
        _ = preprocessing.get_data()
        print("✅ parking_lots.csv 파일이 성공적으로 생성되었습니다!")
        print("💡 이제 recommend.py를 사용할 수 있습니다.")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        print("💡 Firestore 연결을 확인하세요.")

if __name__ == '__main__':
    main()

