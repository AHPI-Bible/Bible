// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// 성경 데이터
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

const NT_BOOKS = [
    "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", 
    "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", 
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", 
    "1 John", "2 John", "3 John", "Jude", "Revelation"
];

const BOOK_NAMES = Object.keys(BIBLE_DATA);

let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;
let nextRef = null;
let prevRef = null;

document.addEventListener("DOMContentLoaded", function() {
    initSelectors(); 

    document.getElementById("modal-close-button").addEventListener("click", () => {
        document.getElementById("lexicon-modal").style.display = "none";
    });
    document.getElementById("search-close-button").addEventListener("click", () => {
        document.getElementById("search-result-modal").style.display = "none";
    });

    document.getElementById("prev-btn").addEventListener("click", goToPrevChapter);
    document.getElementById("next-btn").addEventListener("click", goToNextChapter);
    document.getElementById("go-btn").addEventListener("click", navigateManual);
    document.getElementById("search-btn").addEventListener("click", performSearch);
    document.getElementById("search-input").addEventListener("keypress", function(e) {
        if (e.key === 'Enter') performSearch();
    });

    document.getElementById("book-select").addEventListener("change", function() {
        updateChapterOptions(this.value);
        updateVerseOptions(176); 
        document.getElementById("verse-select").value = 1;
    });
    document.getElementById("chapter-select").addEventListener("change", function() {
        document.getElementById("verse-select").value = 1;
    });

    setupEditorEvents();
    fetchHybridText(currentBook, currentChapter, currentVerse);
});

// --- 데이터 로드 핵심 로직 ---
async function fetchHybridText(book, chapter, verse) {
    currentBook = book;
    currentChapter = chapter;
    currentVerse = verse;
    updateNavUI();

    const displayArea = document.querySelector(".bible-text-container");
    const commentDisplay = document.getElementById('commentary-display');
    
    displayArea.innerHTML = `<p>데이터를 로드하는 중...</p>`;
    commentDisplay.innerText = "로딩 중...";

    // 1. AHPI 서버 (한글, 주석)
    const ahpiPromise = fetch(`${AHPI_API_BASE_URL}/get_data/${book}/${chapter}/${verse}`)
        .then(res => res.json());

    // 2. 원어/영어 API (구약 vs 신약)
    let originalTextPromise;
    
    if (NT_BOOKS.includes(book)) {
        // [신약]
        // 영어: Bible-Api (WEB 버전)
        const englishPromise = fetch(`https://bible-api.com/${book}+${chapter}:${verse}?translation=web`).then(res => res.json());
        
        // [수정됨] 헬라어: Sefaria (SBL Greek New Testament 버전) - 여기가 훨씬 안정적임
        const greekPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}.${verse}?version=SBL_Greek_New_Testament`)
            .then(res => {
                if (!res.ok) return { text: "" }; // 에러나면 빈 값
                return res.json();
            })
            .catch(() => ({ text: "" }));

        originalTextPromise = Promise.all([englishPromise, greekPromise]).then(([enData, grData]) => {
            // Sefaria는 text 필드에 헬라어를 담아 보냄 (배열일 수도 있음)
            let greekText = Array.isArray(grData.text) ? grData.text.join(" ") : (grData.text || "헬라어 본문 없음");
            
            // HTML 태그 제거 (혹시 있을 경우)
            greekText = greekText.replace(/<[^>]*>?/gm, '');

            return {
                text: enData.text || "영어 본문 없음",
                he: greekText, 
                next: null,
                prev: null
            };
        });
    } else {
        // [구약] Sefaria API (히브리어 + 영어)
        originalTextPromise = fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}.${verse}?context=0`)
            .then(res => {
                if (!res.ok) return { text: "", he: "" };
                return res.json();
            });
    }

    try {
        const [ahpiData, textData] = await Promise.all([ahpiPromise, originalTextPromise]);
        
        const koreanText = ahpiData.korean_text || "한글 본문을 찾을 수 없습니다.";
        const englishText = textData.text || "";
        const originalText = textData.he || ""; 

        nextRef = textData.next || null;
        prevRef = textData.prev || null;
        
        // 신약 등 next 정보 없을 때 수동 계산
        if (!nextRef) nextRef = `${book} ${chapter}:${verse + 1}`;
        if (!prevRef && verse > 1) prevRef = `${book} ${chapter}:${verse - 1}`;

        // 신약 절 개수 확인 (Sefaria 이용)
        if (!NT_BOOKS.includes(book)) {
             fetch(`https://www.sefaria.org/api/texts/${book}.${chapter}?context=0&pad=0`)
                .then(res => res.json())
                .then(chapterData => {
                    if(chapterData && chapterData.text) updateVerseOptions(chapterData.text.length);
                });
        }

        displayArea.innerHTML = `
            <div class="verse">
                <p class="korean-text">${koreanText}</p>
                <p class="english-text">${englishText}</p>
                <p class="hebrew-text" dir="rtl">${originalText}</p> 
            </div>
        `;
        commentDisplay.innerText = ahpiData.ahpi_commentary;
        
        resetEditorMode();
        makeHebrewWordsClickable(); 

    } catch (error) {
        console.error("실패:", error);
        displayArea.innerHTML = `<p style="color:red;">데이터 로드 중 오류 발생.</p>`;
    }
}

// --- 검색 기능 ---
async function performSearch() {
    const query = document.getElementById("search-input").value;
    if (query.length < 2) {
        alert("검색어는 2글자 이상 입력해주세요.");
        return;
    }
    const searchModal = document.getElementById("search-result-modal");
    const resultBody = document.getElementById("search-results-body");
    resultBody.innerHTML = "<p>검색 중...</p>";
    searchModal.style.display = "flex";

    try {
        const response = await fetch(`${AHPI_API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            let html = `<p>총 ${data.count}개의 결과</p>`;
            data.results.forEach(item => {
                html += `
                    <div class="search-item" onclick="goToSearchResult('${item.book}', ${item.chapter}, ${item.verse})">
                        <div class="search-ref">${item.book} ${item.chapter}:${item.verse}</div>
                        <div class="search-text">${item.text}</div>
                    </div>`;
            });
            resultBody.innerHTML = html;
        } else {
            resultBody.innerHTML = "<p>검색 결과가 없습니다.</p>";
        }
    } catch (error) {
        resultBody.innerHTML = "<p>오류 발생</p>";
    }
}

window.goToSearchResult = function(book, chapter, verse) {
    document.getElementById("search-result-modal").style.display = "none";
    if (book !== currentBook) {
        document.getElementById("book-select").value = book;
        updateChapterOptions(book);
    }
    fetchHybridText(book, chapter, verse);
};

// --- 초기화 및 이동 로직 ---
function initSelectors() {
    const bookSelect = document.getElementById("book-select");
    BOOK_NAMES.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = book;
        bookSelect.appendChild(option);
    });
    updateChapterOptions("Genesis");
    updateVerseOptions(176);
}

function updateChapterOptions(bookName) {
    const chapterSelect = document.getElementById("chapter-select");
    const maxChapters = BIBLE_DATA[bookName] || 50;
    chapterSelect.innerHTML = ""; 
    for (let i = 1; i <= maxChapters; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.innerText = i;
        chapterSelect.appendChild(option);
    }
    chapterSelect.value = 1;
}

function updateVerseOptions(maxVerses) {
    const verseSelect = document.getElementById("verse-select");
    const currentVal = parseInt(verseSelect.value) || 1;
    verseSelect.innerHTML = ""; 
    for (let i = 1; i <= maxVerses; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.innerText = i;
        verseSelect.appendChild(option);
    }
    if (currentVal <= maxVerses) verseSelect.value = currentVal;
    else verseSelect.value = 1;
}

function goToNextChapter() {
    const maxChapters = BIBLE_DATA[currentBook];
    if (currentChapter < maxChapters) fetchHybridText(currentBook, currentChapter + 1, 1);
    else {
        const idx = BOOK_NAMES.indexOf(currentBook);
        if (idx < BOOK_NAMES.length - 1) {
            const nextBook = BOOK_NAMES[idx + 1];
            updateChapterOptions(nextBook); 
            fetchHybridText(nextBook, 1, 1);
        } else alert("성경의 마지막입니다.");
    }
}

function goToPrevChapter() {
    if (currentChapter > 1) fetchHybridText(currentBook, currentChapter - 1, 1);
    else {
        const idx = BOOK_NAMES.indexOf(currentBook);
        if (idx > 0) {
            const prevBook = BOOK_NAMES[idx - 1];
            updateChapterOptions(prevBook); 
            fetchHybridText(prevBook, BIBLE_DATA[prevBook], 1);
        } else alert("성경의 시작입니다.");
    }
}

function navigateManual() {
    const book = document.getElementById("book-select").value;
    const ch = parseInt(document.getElementById("chapter-select").value);
    const v = parseInt(document.getElementById("verse-select").value);
    fetchHybridText(book, ch, v);
}

function updateNavUI() {
    document.getElementById("book-select").value = currentBook;
    if (document.getElementById("chapter-select").options.length < currentChapter) updateChapterOptions(currentBook);
    document.getElementById("chapter-select").value = currentChapter;
    document.getElementById("verse-select").value = currentVerse;
}

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
            body: JSON.stringify({ book: currentBook, chapter: currentChapter, verse: currentVerse, content: content })
        });
        if (response.ok) {
            alert("저장 완료");
            document.getElementById('commentary-display').innerText = content;
            resetEditorMode();
        } else alert("저장 실패");
    } catch (error) { alert("통신 오류"); }
    finally { saveBtn.innerText = "저장"; saveBtn.disabled = false; }
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
        if (data.senses) content += "<ol>" + data.senses.map(s => `<li>${s.definition.en}</li>`).join("") + "</ol>";
        else content += "<p>정의 없음</p>";
        modalBody.innerHTML = content;
    } catch (e) { modalBody.innerHTML = "<p>정보 없음</p>"; }
}