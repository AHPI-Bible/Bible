import csv
import os
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 1. 한글 성경 데이터 로드
print("--- 서버 시작: 한글 성경 데이터 로드 중 ---")
BIBLE_CSV_FILE = 'korean_bible.csv'
bible_data_list = [] # 리스트로 변경 (검색 효율화)

try:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, BIBLE_CSV_FILE)
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row['book_name'] or not row['chapter_num'] or not row['verse_num']:
                continue
            # 데이터를 딕셔너리 리스트로 저장
            bible_data_list.append({
                "book": row['book_name'],
                "chapter": int(row['chapter_num']),
                "verse": int(row['verse_num']),
                "text": row['korean_text']
            })
    print(f"성경 로드 완료: {len(bible_data_list)}절")
except Exception as e:
    print(f"CSV 로드 중 오류: {e}")

# 2. DB 연결
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

# [핵심] 챕터 데이터 가져오기 (수정됨)
@app.route('/api/get_chapter_data/<book_name>/<int:chapter_num>', methods=['GET'])
def get_ahpi_chapter_data(book_name, chapter_num):
    print(f"요청 받음: {book_name} {chapter_num}장") # 로그 출력
    
    # 1. 해당 챕터의 모든 한글 절 찾기 (리스트 필터링)
    korean_verses = {}
    
    # 리스트에서 조건에 맞는 것만 뽑기
    filtered = [row for row in bible_data_list if row['book'] == book_name and row['chapter'] == chapter_num]
    
    for item in filtered:
        korean_verses[item['verse']] = item['text']

    print(f"찾은 한글 절 수: {len(korean_verses)}") # 로그 출력

    # 2. 주해 찾기 (DB)
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
        print(f"DB 오류: {e}")

    return jsonify({
        'korean_verses': korean_verses,
        'commentaries': commentaries
    })

# 주해 저장
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

# 검색
@app.route('/api/search', methods=['GET'])
def search_bible():
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify({"results": [], "message": "2글자 이상 입력"})

    results = []
    count = 0
    
    # 리스트에서 검색
    for item in bible_data_list:
        if query in item['text']:
            results.append(item)
            count += 1
            if count >= 100: break
    
    return jsonify({"results": results, "count": count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)