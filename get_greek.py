import requests
import csv
import json

# 오픈 소스 SBLGNT 헬라어 성경 데이터 (JSON 형식)
URL = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/grc_sbl.json"
OUTPUT_FILE = "greek_bible.csv"

# [중요] 책 이름 변환표 (Source JSON 이름 -> Sefaria/AHPI 표준 이름)
# 혹시 모를 이름 불일치를 방지하기 위한 안전장치입니다.
BOOK_NAME_MAP = {
    "Acts of the Apostles": "Acts",
    "Revelation of John": "Revelation",
    "The Revelation": "Revelation"
    # 나머지(Matthew, Mark 등)는 대부분 표준과 일치하므로 그대로 둠
}

print(f"헬라어 성경 다운로드 중... ({URL})")

try:
    response = requests.get(URL)
    response.raise_for_status() # 연결 에러 체크
    data = response.json()
    
    print("다운로드 완료. 데이터 변환 및 저장 시작...")
    
    # CSV 파일 생성
    with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as csvfile:
        writer = csv.writer(csvfile)
        # 헤더 작성
        writer.writerow(["book", "chapter", "verse", "text"])
        
        total_verses = 0
        
        for book_data in data:
            original_name = book_data['name']
            
            # 1. 책 이름 표준화 (매핑표에 있으면 바꾸고, 없으면 그대로 씀)
            book_name = BOOK_NAME_MAP.get(original_name, original_name)
            
            print(f"처리 중: {book_name}...") # 진행 상황 표시
            
            for chapter_idx, verses in enumerate(book_data['chapters']):
                chapter_num = chapter_idx + 1
                
                for verse_idx, text in enumerate(verses):
                    verse_num = verse_idx + 1
                    
                    # 2. CSV 쓰기
                    writer.writerow([book_name, chapter_num, verse_num, text])
                    total_verses += 1
                    
    print(f"\n[성공] 총 {total_verses}개의 헬라어 절을 '{OUTPUT_FILE}'에 저장했습니다.")

except Exception as e:
    print(f"\n[오류 발생] {e}")