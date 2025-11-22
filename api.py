import csv
from flask import Flask, jsonify
from flask_cors import CORS 

print("AHPI 서버 관리실(API)을 준비 중입니다...")

BIBLE_CSV_FILE = 'korean_bible.csv'

# 1. 'korean_bible.csv' 파일을 통째로 메모리에 로드하는 함수
def load_bible_data_to_memory():
    """
    CSV 파일에서 모든 성경 데이터를 읽어와 
    빠른 검색이 가능한 딕셔너리(사전) 형태로 메모리에 저장합니다.
    """
    bible_data = {}
    try:
        with open(BIBLE_CSV_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f) 
            for row in reader:
                key = f"{row['book_name']}-{row['chapter_num']}-{row['verse_num']}"
                bible_data[key] = row['korean_text']
        
        print(f"총 {len(bible_data)}개의 한글 성경 구절을 메모리에 로드했습니다.")
        return bible_data
        
    except FileNotFoundError:
        print(f"오류: '{BIBLE_CSV_FILE}' 파일을 찾을 수 없습니다. process.py 실행 여부를 확인하세요.")
        return None
    except Exception as e:
        print(f"CSV 로드 중 오류 발생: {e}")
        return None

# 2. Flask '관리실(API)' 앱 생성
app = Flask(__name__)
CORS(app) 

# 3. 서버가 시작될 때, 성경 데이터 전체를 메모리에 미리 로드
print("한글 성경 데이터를 메모리로 로드합니다...")
bible_data_in_memory = load_bible_data_to_memory()

# 4. 데이터를 요청할 '창구(URL)' 정의
@app.route('/api/get_data/<book_name>/<int:chapter_num>/<int:verse_num>')
def get_ahpi_data(book_name, chapter_num, verse_num):
    
    if bible_data_in_memory is None:
        return jsonify({"error": "서버 데이터가 준비되지 않았습니다."}), 500

    # 1. 한글 본문 찾기
    key = f"{book_name}-{chapter_num}-{verse_num}"
    korean_text = bible_data_in_memory.get(key, "해당 구절의 한글 본문을 찾을 수 없습니다.")
    
    # 2. AHPI 주석 찾기 (임시 데이터)
    commentary = f"[임시 주석] {book_name} {chapter_num}:{verse_num}에 대한 AHPI 오픈 주석이 여기에 표시될 것입니다."
    
    # 3. 웹사이트에 응답
    return jsonify({
        'korean_text': korean_text,
        'ahpi_commentary': commentary
    })

# 5. 이 파일을 직접 실행했을 때 Flask 서버를 '가동'
if __name__ == '__main__':
    app.run(debug=True, port=5000)