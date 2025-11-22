import sqlite3
import csv

# 원본 파일 (대소문자 주의)
INPUT_DB = "BHSSBL.bdb"
# 저장할 파일
OUTPUT_CSV = "greek_bible.csv"

# 신약 성경 책 번호 매핑 (40번 마태복음 ~ 66번 요한계시록)
BOOK_MAP = {
    40: "Matthew", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts",
    45: "Romans", 46: "1 Corinthians", 47: "2 Corinthians", 48: "Galatians", 49: "Ephesians",
    50: "Philippians", 51: "Colossians", 52: "1 Thessalonians", 53: "2 Thessalonians",
    54: "1 Timothy", 55: "2 Timothy", 56: "Titus", 57: "Philemon",
    58: "Hebrews", 59: "James", 60: "1 Peter", 61: "2 Peter",
    62: "1 John", 63: "2 John", 64: "3 John", 65: "Jude", 66: "Revelation"
}

print(f"🔄 '{INPUT_DB}'에서 신약 헬라어 추출 중...")

try:
    conn = sqlite3.connect(INPUT_DB)
    cursor = conn.cursor()

    # 신약(40~66권)만 조회
    cursor.execute("SELECT book, chapter, verse, btext FROM Bible WHERE book >= 40 AND book <= 66")
    rows = cursor.fetchall()

    if not rows:
        print("⚠️ 신약 데이터(book 40~66)를 찾을 수 없습니다. 구약만 있는 파일일 수도 있습니다.")
    else:
        with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["book", "chapter", "verse", "text"])
            
            count = 0
            for book_id, chapter, verse, text in rows:
                if book_id in BOOK_MAP:
                    book_name = BOOK_MAP[book_id]
                    # 텍스트 정제 (혹시 모를 HTML 태그 등 제거)
                    clean_text = text.strip()
                    writer.writerow([book_name, chapter, verse, clean_text])
                    count += 1
        
        print(f"🎉 대성공! 총 {count}개의 헬라어 절을 '{OUTPUT_CSV}'로 변환했습니다.")

    conn.close()

except Exception as e:
    print(f"❌ 오류 발생: {e}")