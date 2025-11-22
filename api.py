import csv
import os
import psycopg2
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------
# 1. 성경 데이터 로드 (한글 + 헬라어)
# ---------------------------------------------------
print("--- 서버 시작: 성경 데이터 로드 중 ---")

# 데이터 저장소
bible_data_list = []     # 검색용 리스트 (전체)
korean_map = {}          # 한글 빠른 찾기용
greek_map = {}           # 헬라어 빠른 찾기용

base_dir = os.path.dirname(os.path.abspath(__file__))

# (1) 한글 로드
try:
    with open(os.path.join(base_dir, 'korean_bible.csv'), 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not row['book_name']: continue
            # 딕셔너리 키: "Genesis-1-1"
            key = f"{row['book_name']}-{row['chapter_num']}-{row['verse_num']}"
            korean_map[key] = row['korean_text']
            
            # 검색용 리스트에도 추가
            bible_data_list.append({
                "book": row['book_name'],
                "chapter": int(row['chapter_num']),
                "verse": int(row['verse_num']),
                "text": row['korean_text']
            })
    print(f"한글 성경 로드 완료: {len(korean_map)}절")
except Exception as e:
    print(f"한글 로드 실패: {e}")

# (2) 헬라어 로드 (파일이 있을 때만)
try:
    greek_path = os.path.join(base_dir, 'greek_bible.csv')
    if os.path.exists(greek_path):
        with open(greek_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # CSV 헤더: book, chapter, verse, text
                key = f"{row['book']}-{row['chapter']}-{row['verse']}"
                greek_map[key] = row['text']
        print(f"헬라어 성경 로드 완료: {len(greek_map)}절")
    else:
        print("헬라어 파일(greek_bible.csv)이 없습니다.")
except Exception as e:
    print(f"헬라어 로드 실패: {e}")


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

# [수정됨] 챕터 데이터 가져오기 (한글 + 헬라어 + 주해)
@app.route('/api/get_chapter_data/<book_name>/<int:chapter_num>', methods=['GET'])
def get_ahpi_chapter_data(book_name, chapter_num):
    print(f"요청: {book_name} {chapter_num}장")
    
    korean_verses = {}
    greek_verses = {} # 헬라어 담을 곳
    
    # 1. 메모리에서 한글/헬라어 찾기
    # (효율을 위해 해당 챕터의 최대 절 수를 대략 176으로 잡고 루프)
    for i in range(1, 177):
        key = f"{book_name}-{chapter_num}-{i}"
        
        # 한글
        if key in korean_map:
            korean_verses[i] = korean_map[key]
        
        # 헬라어
        if key in greek_map:
            greek_verses[i] = greek_map[key]

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
        'greek_verses': greek_verses, # 헬라어 데이터 추가됨
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