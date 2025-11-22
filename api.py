import csv
import os
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------
# 1. 성경 데이터 로드 (한글 + 헬라어 + 히브리어)
# ---------------------------------------------------
print("--- 서버 시작: 모든 성경 데이터 로드 중 ---")

bible_data_list = []     # 검색용
korean_map = {}          # 한글용
greek_map = {}           # 헬라어용
hebrew_map = {}          # 히브리어용

base_dir = os.path.dirname(os.path.abspath(__file__))

# 공통 로드 함수
def load_csv_to_map(filename, target_map, is_korean=False):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"⚠️ 파일 없음: {filename}")
        return
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                # CSV 헤더에 따라 book_name 또는 book 사용
                b = row.get('book_name') or row.get('book')
                c = row.get('chapter_num') or row.get('chapter')
                v = row.get('verse_num') or row.get('verse')
                t = row.get('korean_text') or row.get('text')
                
                if not b: continue

                key = f"{b}-{c}-{v}"
                target_map[key] = t
                count += 1
                
                # 한글인 경우 검색 리스트에도 추가
                if is_korean:
                    bible_data_list.append({
                        "book": b, "chapter": int(c), "verse": int(v), "text": t
                    })
        print(f"✅ {filename} 로드 완료: {count}절")
    except Exception as e:
        print(f"❌ {filename} 로드 실패: {e}")

# 3개 파일 로드 실행
load_csv_to_map('korean_bible.csv', korean_map, is_korean=True)
load_csv_to_map('greek_bible.csv', greek_map)
load_csv_to_map('hebrew_bible.csv', hebrew_map)


# ---------------------------------------------------
# 2. DB 연결
# ---------------------------------------------------
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

# ---------------------------------------------------
# 3. API 라우트
# ---------------------------------------------------

@app.route('/api/get_chapter_data/<book_name>/<int:chapter_num>', methods=['GET'])
def get_ahpi_chapter_data(book_name, chapter_num):
    print(f"요청: {book_name} {chapter_num}장")
    
    korean_verses = {}
    greek_verses = {}
    hebrew_verses = {} # 히브리어 추가
    
    # 최대 176절까지 순회하며 찾기
    for i in range(1, 177):
        key = f"{book_name}-{chapter_num}-{i}"
        if key in korean_map: korean_verses[i] = korean_map[key]
        if key in greek_map: greek_verses[i] = greek_map[key]
        if key in hebrew_map: hebrew_verses[i] = hebrew_map[key]

    # 주해 찾기
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
        'greek_verses': greek_verses,
        'hebrew_verses': hebrew_verses, # 응답에 포함
        'commentaries': commentaries
    })

@app.route('/api/save_commentary', methods=['POST'])
def save_commentary():
    data = request.json
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO commentaries (book, chapter, verse, content)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (book, chapter, verse) 
            DO UPDATE SET content = EXCLUDED.content;
        """, (data['book'], data['chapter'], data['verse'], data['content']))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"message": "저장 성공"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['GET'])
def search_bible():
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify({"results": [], "message": "2글자 이상 입력"})
    results = []
    count = 0
    for item in bible_data_list:
        if query in item['text']:
            results.append(item)
            count += 1
            if count >= 100: break
    return jsonify({"results": results, "count": count})

if __name__ == '__main__':
    app.run(debug=True, port=5000)