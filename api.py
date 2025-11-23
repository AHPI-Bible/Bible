import csv
import os
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------
# 1. 데이터 로드 (성경 4종 + 사전 1종)
# ---------------------------------------------------
print("--- 서버 시작: 데이터 로드 중 ---")

korean_map = {}          
english_map = {}         
greek_map = {}           
hebrew_map = {}          
bible_data_list = []     # 검색용
lexicon_map = {}         # [NEW] 사전 데이터 (메모리 캐시)

base_dir = os.path.dirname(os.path.abspath(__file__))

def load_csv_to_map(filename, target_map, is_korean=False, is_lexicon=False):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"⚠️ 파일 없음: {filename}")
        return
    
    try:
        # [중요] utf-8-sig : 윈도우/엑셀 CSV의 깨짐 방지
        with open(path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                if is_lexicon:
                    # 사전 데이터 로드 (헤더: strong_code, content)
                    code = row.get('strong_code')
                    content = row.get('content')
                    if code and content:
                        target_map[code] = content
                        count += 1
                else:
                    # 성경 데이터 로드
                    b = row.get('book_name') or row.get('book')
                    c = row.get('chapter_num') or row.get('chapter')
                    v = row.get('verse_num') or row.get('verse')
                    t = row.get('korean_text') or row.get('text')
                    
                    if not b: continue

                    key = f"{b}-{int(c)}-{int(v)}"
                    target_map[key] = t
                    count += 1
                    
                    if is_korean:
                        bible_data_list.append({
                            "book": b, "chapter": int(c), "verse": int(v), "text": t
                        })
        print(f"✅ {filename} 로드 완료: {count}건")
    except Exception as e:
        print(f"❌ {filename} 로드 실패: {e}")

# 파일 5개 모두 로드
load_csv_to_map('korean_bible.csv', korean_map, is_korean=True)
load_csv_to_map('english_bible.csv', english_map)
load_csv_to_map('greek_bible.csv', greek_map)
load_csv_to_map('hebrew_bible.csv', hebrew_map)
load_csv_to_map('strong_lexicon.csv', lexicon_map, is_lexicon=True) # [NEW]

# ---------------------------------------------------
# 2. DB 연결 (주해 저장용)
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
    korean_verses = {}
    english_verses = {}
    greek_verses = {}
    hebrew_verses = {}
    
    for i in range(1, 177):
        key = f"{book_name}-{chapter_num}-{i}"
        if key in korean_map: korean_verses[i] = korean_map[key]
        if key in english_map: english_verses[i] = english_map[key]
        if key in greek_map: greek_verses[i] = greek_map[key]
        if key in hebrew_map: hebrew_verses[i] = hebrew_map[key]

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
        'english_verses': english_verses,
        'greek_verses': greek_verses,
        'hebrew_verses': hebrew_verses,
        'commentaries': commentaries
    })

# [NEW] 사전 검색 API
@app.route('/api/lexicon/<code>', methods=['GET'])
def get_lexicon(code):
    # 메모리에 로드된 사전에서 찾기
    if code in lexicon_map:
        return jsonify({"code": code, "content": lexicon_map[code]})
    return jsonify({"code": code, "content": "사전 데이터가 없습니다."})

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