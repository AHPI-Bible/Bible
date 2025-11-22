import csv
import os
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ==========================================
# 1. 한글 성경 데이터 로드 (CSV 파일)
# ==========================================
print("한글 성경 데이터를 메모리로 로드합니다...")
BIBLE_CSV_FILE = 'korean_bible.csv'
bible_data_in_memory = {}

try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, BIBLE_CSV_FILE)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 데이터 유효성 검사 (필수 항목이 비어있으면 건너뜀)
            if not row['book_name'] or not row['chapter_num'] or not row['verse_num']:
                continue
                
            key = f"{row['book_name']}-{row['chapter_num']}-{row['verse_num']}"
            bible_data_in_memory[key] = row['korean_text']
            
    print(f"성경 로드 완료: {len(bible_data_in_memory)}절")
except Exception as e:
    print(f"CSV 로드 중 오류 (데이터가 없을 수 있음): {e}")

# ==========================================
# 2. 데이터베이스(금고) 연결 및 초기화
# ==========================================
def get_db_connection():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    return conn

def init_db():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS commentaries (
                id SERIAL PRIMARY KEY,
                book VARCHAR(50) NOT NULL,
                chapter INT NOT NULL,
                verse INT NOT NULL,
                content TEXT,
                UNIQUE(book, chapter, verse)
            );
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("DB 초기화 완료: 주석 테이블 준비됨")
    except Exception as e:
        print(f"DB 초기화 실패 (DB URL 확인 필요): {e}")

with app.app_context():
    init_db()

# ==========================================
# 3. API 라우트 (창구)
# ==========================================

@app.route('/api/get_data/<book_name>/<int:chapter_num>/<int:verse_num>', methods=['GET'])
def get_ahpi_data(book_name, chapter_num, verse_num):
    key = f"{book_name}-{chapter_num}-{verse_num}"
    korean_text = bible_data_in_memory.get(key, "한글 본문 없음")
    
    commentary = ""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT content FROM commentaries WHERE book = %s AND chapter = %s AND verse = %s",
            (book_name, chapter_num, verse_num)
        )
        result = cur.fetchone()
        if result:
            commentary = result[0]
        else:
            commentary = "작성된 주석이 없습니다."
        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB 읽기 오류: {e}")
        commentary = "주석을 불러오는 중 오류가 발생했습니다."

    return jsonify({
        'korean_text': korean_text,
        'ahpi_commentary': commentary
    })

@app.route('/api/save_commentary', methods=['POST'])
def save_commentary():
    data = request.json
    book = data.get('book')
    chapter = data.get('chapter')
    verse = data.get('verse')
    content = data.get('content')

    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO commentaries (book, chapter, verse, content)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (book, chapter, verse) 
            DO UPDATE SET content = EXCLUDED.content;
        """, (book, chapter, verse, content))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "주석이 성공적으로 저장되었습니다."}), 200
    except Exception as e:
        print(f"저장 실패: {e}")
        return jsonify({"error": str(e)}), 500

# [수정됨] 안전해진 검색 기능
@app.route('/api/search', methods=['GET'])
def search_bible():
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify({"results": [], "message": "검색어를 2글자 이상 입력하세요."})

    results = []
    count = 0
    
    try:
        # 메모리에 있는 성경 전체를 뒤짐
        for key, text in bible_data_in_memory.items():
            if query in text:
                try:
                    # key 형식: "Genesis-1-1" 분해 시도
                    parts = key.split('-')
                    
                    # [안전장치] 키 형식이 이상하면 건너뜀
                    if len(parts) != 3: 
                        continue
                        
                    results.append({
                        "book": parts[0],
                        "chapter": int(parts[1]),
                        "verse": int(parts[2]),
                        "text": text
                    })
                    count += 1
                    # 결과가 너무 많으면 100개까지만 (성능 보호)
                    if count >= 100:
                        break
                except ValueError:
                    # 숫자로 변환 안 되는 데이터가 있으면 무시하고 계속 진행
                    continue
                    
    except Exception as e:
        print(f"검색 중 서버 오류: {e}")
        return jsonify({"error": "검색 중 오류가 발생했습니다."}), 500
    
    return jsonify({"results": results, "count": count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)