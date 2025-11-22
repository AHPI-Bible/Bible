// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// [핵심] 성경 66권 이름과 '총 장(Chapter) 수' 데이터
const BIBLE_DATA = {
    "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
    "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24, "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10, "Nehemiah": 13, "Esther": 10,
    "Job": 42, "Psalms": 150, "Proverbs": 31, "Ecclesiastes": 12, "Song of Songs": 8,
    "Isaiah": 66, "Jeremiah": 52, "Lamentations": 5, "Ezekiel": 48, "Daniel": 12,
    "Hosea": 14, "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4, "Micah": 7, "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2, "Zechariah": 14, "Malachi": 4,
    "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28,
    "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6, "Ephesians": 6, "Philippians": 4, "Colossians": 4,
    "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6, "2 Timothy": 4, "Titus": 3, "Philemon": 1,
    "Hebrews": 13, "James": 5, "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1, "Jude": 1, "Revelation": 22
};

const BOOK_NAMES = Object.keys(BIBLE_DATA);

let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;

document.addEventListener("DOMContentLoaded", function() {
    initSelectors(); // 드롭다운 초기화

    document.getElementById("modal-close-button").addEventListener("click", () => {
        document.getElementById("lexicon-modal").style.display = "none";
    });

    // 버튼 이벤트 (장 단위 이동)
    document.getElementById("prev-btn").addEventListener("click", goToPrevChapter);
    document.getElementById("next-btn").addEventListener("click", goToNextChapter);
    document.getElementById("go-btn").addEventListener("click", navigateManual);

    // 책 선택 시 장 목록 업데이트 이벤트
    document.getElementById("book-select").addEventListener("change", function() {
        updateChapterOptions(this.value);
    });

    setupEditorEvents();
    fetchHybridText(currentBook, currentChapter, currentVerse);
});

// --- [초기화] 드롭다운 메뉴 만들기 ---
function initSelectors() {
    // 1. 책 목록 채우기
    const bookSelect = document.getElementById("book-select");
    BOOK_NAMES.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        bookSelect.appendChild(option);
    });

    // 2. 초기 장(Chapter) 목록 채우기 (Genesis 기준)
    updateChapterOptions("Genesis");

    // 3. 절(Verse) 목록 채우기 (1~176절, 시편 119편 기준 넉넉하게)
    const verseSelect = document.getElementById("verse-select");
    for (let i = 1; i <= 176; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.innerText = i;
        verseSelect.appendChild(option);
    }
}

// 책을 바꾸면 -> 그 책의 장(Chapter) 수만큼 드롭다운을 다시 만듦
function updateChapterOptions(bookName) {
    const chapterSelect = document.getElementById("chapter-select");
    const maxChapters = BIBLE_DATA[bookName] || 50;
    
    chapterSelect.innerHTML = ""; // 기존 목록 비우기
    
    for (let i = 1; i <= maxChapters; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.innerText = i;
        chapterSelect.appendChild(option);
    }
    // 책이 바뀌면 1장으로 리셋
    chapterSelect.value = 1;
}

// --- [이동 로직] 다음 장 / 이전 장 ---

function goToNextChapter() {
    const maxChapters = BIBLE_DATA[currentBook];
    
    if (currentChapter < maxChapters) {
        // 같은 책 내에서 다음 장으로
        fetchHybridText(currentBook, currentChapter + 1, 1);
    } else {
        // 책의 끝이면 -> 다음 책 1장 1절로
        const currentBookIndex = BOOK_NAMES.indexOf(currentBook);
        if (currentBookIndex < BOOK_NAMES.length - 1) {
            const nextBook = BOOK_NAMES[currentBookIndex + 1];
            updateChapterOptions(nextBook); // 드롭다운 업데이트
            fetchHybridText(nextBook, 1, 1);
        } else {
            alert("성경의 마지막입니다.");
        }
    }
}

function goToPrevChapter() {
    if (currentChapter > 1) {
        // 같은 책 내에서 이전 장으로
        fetchHybridText(currentBook, currentChapter - 1, 1);
    } else {
        // 책의 시작이면 -> 이전 책의 마지막 장 1절로
        const currentBookIndex = BOOK_NAMES.indexOf(currentBook);
        if (currentBookIndex > 0) {
            const prevBook = BOOK_NAMES[currentBookIndex - 1];
            const prevBookMaxChapter = BIBLE_DATA[prevBook];
            updateChapterOptions(prevBook); // 드롭다운 업데이트
            fetchHybridText(prevBook, prevBookMaxChapter, 1);
        } else {
            alert("성경의 시작입니다.");
        }
    }
}

// [이동 기능] 드롭다운 선택값으로 이동
function navigateManual() {
    const book = document.getElementById("book-select").value;
    const chapter = parseInt(document.getElementById("chapter-select").value);
    const verse = parseInt(document.getElementById("verse-select").value);

    fetchHybridText(book, chapter, verse);
}

// UI 업데이트 (현재 위치를 드롭다운에 반영)
function updateNavUI() {
    document.getElementById("book-select").value = currentBook;
    // 만약 장(Chapter) 드롭다운이 현재 장을 포함하지 못하면(책 변경시 등), 업데이트
    if (document.getElementById("chapter-select").options.length < currentChapter) {
        updateChapterOptions(currentBook);
    }
    document.getElementById("chapter-select").value = currentChapter;
    document.getElementById("verse-select").value = currentVerse;
}

// 데이터 불러오기 (기존과 동일, UI업데이트만 추가)
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
        const sefariaPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}.${verse}?context=0`).then(res => res.json());

        const [ahpiData, sefariaData] = await Promise.all([ahpiPromise, sefariaPromise]);
        
        if (ahpiData.error || !sefariaData.text) throw new Error("데이터 오류");

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

// (이하 에디터, 팝업 기능은 기존과 동일)
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