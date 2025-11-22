import requests
import csv
import json

# 오픈 소스 SBLGNT 헬라어 성경 데이터 (JSON 형식)
URL = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/grc_sbl.json"
OUTPUT_FILE = "greek_bible.csv"

print(f"헬라어 성경 다운로드 중... ({URL})")

try:
    response = requests.get(URL)
    response.raise_for_status() # 에러 체크
    data = response.json()
    
    print("다운로드 완료. CSV 변환 시작...")
    
    # CSV 파일 생성
    with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as csvfile:
        writer = csv.writer(csvfile)
        # 헤더: 책이름, 장, 절, 내용
        writer.writerow(["book", "chapter", "verse", "text"])
        
        count = 0
        for book_data in data:
            book_name = book_data['name'] # 예: Matthew
            
            for chapter_idx, verses in enumerate(book_data['chapters']):
                chapter_num = chapter_idx + 1
                
                for verse_idx, text in enumerate(verses):
                    verse_num = verse_idx + 1
                    
                    # Sefaria/우리 시스템과 책 이름 맞추기
                    if book_name == "Acts of the Apostles": book_name = "Acts"
                    
                    writer.writerow([book_name, chapter_num, verse_num, text])
                    count += 1
                    
    print(f"완료! 총 {count}개의 헬라어 절을 '{OUTPUT_FILE}'에 저장했습니다.")

except Exception as e:
    print(f"오류 발생: {e}")