import csv
import os
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 1. 한글 성경 데이터 로드
print("한글 성경 데이터를 메모리로 로드합니다...")
BIBLE_CSV_FILE = 'korean_bible.csv'
bible_data_in_memory = {}

try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, BIBLE_CSV_FILE)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row['book_name'] or not row['chapter_num'] or not row['verse_num']:
                continue
            key = f"{row['book_name']}-{row['chapter_num']}-{row['verse_num']}"
            bible_data_in_memory[key] = row['korean_text']
    print(f"성경 로드 완료: {len(bible_data_in_memory)}절")
except Exception as e:
    print(f"CSV 로드 중 오류: {e}")

# 2. DB 연결 및 초기화
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
        print("DB 초기화 완료")
    except Exception as e:
        print(f"DB 초기화 실패: {e}")

with app.app_context():
    init_db()

# 3. API 라우트

# [NEW] 챕터 단위 데이터 가져오기 (한글 + 주해 전체)
@app.route('/api/get_chapter_data/<book_name>/<int:chapter_num>', methods=['GET'])
def get_ahpi_chapter_data(book_name, chapter_num):
    # 1. 해당 챕터의 모든 한글 절 찾기 (메모리 검색)
    korean_verses = {}
    prefix = f"{book_name}-{chapter_num}-"
    
    # (데이터가 많아도 딕셔너리 키 검색은 빠름)
    # 정확도를 위해 전체 순회보다는 필요한 범위 추정이 좋으나, 
    # 현재 구조상 전체 키 중 prefix 매칭을 찾습니다.
    for key, text in bible_data_in_memory.items():
        if key.startswith(prefix):
            # key 예시: Genesis-1-1
            parts = key.split('-')
            if len(parts) == 3 and parts[0] == book_name and int(parts[1]) == chapter_num:
                verse_num = int(parts[2])
                korean_verses[verse_num] = text

    # 2. 해당 챕터의 모든 주해 찾기 (DB 검색)
    commentaries = {}
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "SELECT verse, content FROM commentaries WHERE book = %s AND chapter = %s",
            (book_name, chapter_num)
        )
        rows = cur.fetchall()
        for row in rows:
            commentaries[row[0]] = row[1]
        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB 읽기 오류: {e}")

    return jsonify({
        'korean_verses': korean_verses, # {1: "태초에...", 2: "..."}
        'commentaries': commentaries    # {1: "주해...", 3: "주해..."}
    })

# 주해 저장 (기존 동일)
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
        return jsonify({"message": "저장 성공"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 검색 (기존 동일)
@app.route('/api/search', methods=['GET'])
def search_bible():
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify({"results": [], "message": "2글자 이상 입력"})

    results = []
    count = 0
    try:
        for key, text in bible_data_in_memory.items():
            if query in text:
                try:
                    parts = key.split('-')
                    if len(parts) != 3: continue
                    results.append({
                        "book": parts[0],
                        "chapter": int(parts[1]),
                        "verse": int(parts[2]),
                        "text": text
                    })
                    count += 1
                    if count >= 100: break
                except ValueError: continue
    except Exception as e:
        return jsonify({"error": "오류"}), 500
    
    return jsonify({"results": results, "count": count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)