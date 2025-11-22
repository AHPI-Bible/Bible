// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// 성경 66권 목록 (Sefaria 호환 영문명)
const BIBLE_BOOKS = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
    "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther",
    "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Songs",
    "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
    "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
    "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
    "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
    "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

// 현재 상태
let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;
// 다음/이전 절 정보를 저장할 변수 (Sefaria API에서 받아옴)
let nextRef = null;
let prevRef = null;

document.addEventListener("DOMContentLoaded", function() {
    // 1. 책 목록(드롭다운) 생성
    initBookSelect();

    // 2. 팝업 닫기
    document.getElementById("modal-close-button").addEventListener("click", () => {
        document.getElementById("lexicon-modal").style.display = "none";
    });

    // 3. 내비게이션 버튼 이벤트
    document.getElementById("prev-btn").addEventListener("click", goToPrev);
    document.getElementById("next-btn").addEventListener("click", goToNext);
    document.getElementById("go-btn").addEventListener("click", navigateManual);

    // 4. 에디터 설정 및 초기 로드
    setupEditorEvents();
    fetchHybridText(currentBook, currentChapter, currentVerse);
});

// 책 선택창(Select) 초기화 함수
function initBookSelect() {
    const select = document.getElementById("book-select");
    BIBLE_BOOKS.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        select.appendChild(option);
    });
}

// [스마트 이동 1] 다음 절로 이동
function goToNext() {
    if (nextRef) {
        // Sefaria가 알려준 '다음 절' 정보(예: "Genesis 1:2" 또는 "Genesis 2:1")를 파싱해서 이동
        parseAndNavigate(nextRef);
    } else {
        alert("다음 절이 없습니다 (책의 끝입니다).");
    }
}

// [스마트 이동 2] 이전 절로 이동
function goToPrev() {
    if (prevRef) {
        parseAndNavigate(prevRef);
    } else {
        alert("이전 절이 없습니다 (책의 시작입니다).");
    }
}

// "Book Chapter:Verse" 문자열을 분해해서 이동하는 함수
function parseAndNavigate(refString) {
    // 예: "Genesis 1:2" -> lastSpaceIndex를 찾아 분리
    const lastSpace = refString.lastIndexOf(" ");
    const bookName = refString.substring(0, lastSpace);
    const rest = refString.substring(lastSpace + 1); // "1:2"
    const [chap, ver] = rest.split(":");
    
    fetchHybridText(bookName, parseInt(chap), parseInt(ver));
}

// [이동 기능 3] 직접 입력 이동
function navigateManual() {
    const book = document.getElementById("book-select").value;
    const chapter = parseInt(document.getElementById("chapter-input").value);
    const verse = parseInt(document.getElementById("verse-input").value);

    if (book && chapter > 0 && verse > 0) {
        fetchHybridText(book, chapter, verse);
    }
}

// UI 업데이트
function updateNavUI() {
    document.getElementById("book-select").value = currentBook;
    document.getElementById("chapter-input").value = currentChapter;
    document.getElementById("verse-input").value = currentVerse;
}

// 데이터 불러오기
async function fetchHybridText(book, chapter, verse) {
    currentBook = book;
    currentChapter = chapter;
    currentVerse = verse;
    updateNavUI();

    const displayArea = document.querySelector(".bible-text-container");
    const commentDisplay = document.getElementById('commentary-display');
    
    displayArea.innerHTML = `<p>데이터를 로드하는 중...</p>`;
    commentDisplay.innerText = "로딩 중...";

    try {
        const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_data/${book}/${chapter}/${verse}`).then(res => res.json());
        // Sefaria API 호출 (context=0으로 주변절 정보는 끄지만, next/prev 정보는 받아옴)
        const sefariaPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}.${verse}?context=0`).then(res => res.json());

        const [ahpiData, sefariaData] = await Promise.all([ahpiPromise, sefariaPromise]);
        
        if (ahpiData.error || !sefariaData.text) throw new Error("데이터 오류");

        // Sefaria가 주는 다음/이전 절 정보 저장
        nextRef = sefariaData.next; // 예: "Genesis 1:2"
        prevRef = sefariaData.prev; // 예: null or "Genesis 1:1"

        displayArea.innerHTML = `
            <div class="verse">
                <p class="korean-text">${ahpiData.korean_text}</p>
                <p class="english-text">${sefariaData.text}</p>
                <p class="hebrew-text" dir="rtl">${sefariaData.he}</p> 
            </div>
        `;
        commentDisplay.innerText = ahpiData.ahpi_commentary;
        
        resetEditorMode();
        makeHebrewWordsClickable(); 

    } catch (error) {
        console.error("실패:", error);
        displayArea.innerHTML = `<p style="color:red;">해당 구절을 찾을 수 없습니다.</p>`;
        commentDisplay.innerText = "";
    }
}

// 에디터 설정 (기존과 동일)
function setupEditorEvents() {
    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    const editorDiv = document.getElementById("editor-container");
    const displayDiv = document.getElementById("commentary-display");
    const inputArea = document.getElementById("commentary-input");

    editBtn.addEventListener("click", () => {
        inputArea.value = displayDiv.innerText === "작성된 주석이 없습니다." ? "" : displayDiv.innerText;
        displayDiv.style.display = "none";
        editBtn.style.display = "none";
        editorDiv.style.display = "block";
    });

    cancelBtn.addEventListener("click", resetEditorMode);
    saveBtn.addEventListener("click", saveCommentary);
}

function resetEditorMode() {
    document.getElementById("editor-container").style.display = "none";
    document.getElementById("commentary-display").style.display = "block";
    document.getElementById("edit-btn").style.display = "block";
}

async function saveCommentary() {
    const content = document.getElementById("commentary-input").value;
    const saveBtn = document.getElementById("save-btn");
    
    saveBtn.innerText = "저장 중...";
    saveBtn.disabled = true;

    try {
        const response = await fetch(`${AHPI_API_BASE_URL}/save_commentary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                book: currentBook,
                chapter: currentChapter,
                verse: currentVerse,
                content: content
            })
        });

        if (response.ok) {
            alert("주석이 저장되었습니다!");
            document.getElementById('commentary-display').innerText = content;
            resetEditorMode();
        } else {
            alert("저장 실패");
        }
    } catch (error) {
        alert("통신 오류");
    } finally {
        saveBtn.innerText = "저장";
        saveBtn.disabled = false;
    }
}

// 히브리어 클릭 (기존과 동일)
function makeHebrewWordsClickable() {
    const hebrewElement = document.querySelector(".hebrew-text");
    if (!hebrewElement) return;
    const words = hebrewElement.textContent.split(/\s+/).filter(w => w.length > 0);
    let htmlContent = '';
    words.forEach(word => {
        if (/[\u0590-\u05FF]/.test(word)) {
            htmlContent += `<span class="hebrew-word" data-word="${word}">${word}</span> `;
        } else {
            htmlContent += `${word} `;
        }
    });
    hebrewElement.innerHTML = htmlContent;
    document.querySelectorAll('.hebrew-word').forEach(span => {
        span.addEventListener('click', handleWordClick);
    });
}

async function handleWordClick(event) {
    const word = event.target.dataset.word;
    const modal = document.getElementById("lexicon-modal");
    const modalBody = document.getElementById("modal-body");
    modalBody.innerHTML = `<p>검색 중...</p>`;
    modal.style.display = "flex"; 
    try {
        const res = await fetch(`https://www.sefaria.org/api/words/${word}`);
        const data = await res.json();
        let content = `<h3 dir="rtl">${data.entry}</h3>`;
        if (data.senses) {
            content += "<ol>" + data.senses.map(s => `<li>${s.definition.en}</li>`).join("") + "</ol>";
        } else {
            content += "<p>정의를 찾을 수 없습니다.</p>";
        }
        modalBody.innerHTML = content;
    } catch (e) {
        modalBody.innerHTML = "<p>정보 없음</p>";
    }
}