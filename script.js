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

const KOREAN_BOOK_NAMES = {
    "Genesis": "창세기", "Exodus": "출애굽기", "Leviticus": "레위기", "Numbers": "민수기", "Deuteronomy": "신명기",
    "Joshua": "여호수아", "Judges": "사사기", "Ruth": "룻기", "1 Samuel": "사무엘상", "2 Samuel": "사무엘하", "1 Kings": "열왕기상", "2 Kings": "열왕기하", "1 Chronicles": "역대상", "2 Chronicles": "역대하", "Ezra": "에스라", "Nehemiah": "느헤미야", "Esther": "에스더",
    "Job": "욥기", "Psalms": "시편", "Proverbs": "잠언", "Ecclesiastes": "전도서", "Song of Songs": "아가",
    "Isaiah": "이사야", "Jeremiah": "예레미야", "Lamentations": "예레미야애가", "Ezekiel": "에스겔", "Daniel": "다니엘",
    "Hosea": "호세아", "Joel": "요엘", "Amos": "아모스", "Obadiah": "오바댜", "Jonah": "요나", "Micah": "미가", "Nahum": "나훔", "Habakkuk": "하박국", "Zephaniah": "스바냐", "Haggai": "학개", "Zechariah": "스가랴", "Malachi": "말라기",
    "Matthew": "마태복음", "Mark": "마가복음", "Luke": "누가복음", "John": "요한복음", "Acts": "사도행전",
    "Romans": "로마서", "1 Corinthians": "고린도전서", "2 Corinthians": "고린도후서", "Galatians": "갈라디아서", "Ephesians": "에베소서", "Philippians": "빌립보서", "Colossians": "골로새서",
    "1 Thessalonians": "데살로니가전서", "2 Thessalonians": "데살로니가후서", "1 Timothy": "디모데전서", "2 Timothy": "디모데후서", "Titus": "디도서", "Philemon": "빌레몬서",
    "Hebrews": "히브리서", "James": "야고보서", "1 Peter": "베드로전서", "2 Peter": "베드로후서", "1 John": "요한일서", "2 John": "요한이서", "3 John": "요한삼서", "Jude": "유다서", "Revelation": "요한계시록"
};

const NT_BOOKS = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
const ALL_BOOKS = Object.keys(BIBLE_DATA);
const OT_BOOKS = ALL_BOOKS.filter(book => !NT_BOOKS.includes(book));

// 상태 변수
let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;
let loadedChapterData = { korean: {}, english: {}, original: {}, commentaries: {} };

// 히스토리 관리용
let historyStack = [];
let historyIndex = -1;
let isHistoryNavigating = false; // 히스토리 이동 중인지 체크

document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners();
    // 초기 로드 (히스토리에 추가)
    loadChapter(currentBook, currentChapter, true);
});

function setupEventListeners() {
    // 팝업 닫기
    document.getElementById("nav-modal-close").onclick = () => document.getElementById("nav-modal").style.display = "none";
    document.getElementById("lexicon-close").onclick = () => document.getElementById("lexicon-modal").style.display = "none";
    document.getElementById("search-close").onclick = () => document.getElementById("search-result-modal").style.display = "none";
    document.getElementById("chapter-nav-close").onclick = () => document.getElementById("chapter-nav-modal").style.display = "none";

    // 구약/신약 선택 팝업
    document.getElementById("btn-ot").onclick = () => openBookGrid("OT");
    document.getElementById("btn-nt").onclick = () => openBookGrid("NT");

    // 이전/다음 장 버튼
    document.getElementById("prev-btn").onclick = goToPrevChapter;
    document.getElementById("next-btn").onclick = goToNextChapter;

    // [NEW] 히스토리 버튼
    document.getElementById("hist-back-btn").onclick = goHistoryBack;
    document.getElementById("hist-fwd-btn").onclick = goHistoryForward;

    // 검색
    document.getElementById("search-btn").onclick = performSearch;
    document.getElementById("search-input").onkeypress = (e) => { if(e.key === 'Enter') performSearch(); };

    // 에디터
    document.getElementById("edit-btn").onclick = openEditor;
    document.getElementById("cancel-btn").onclick = closeEditor;
    document.getElementById("save-btn").onclick = saveCommentary;
}

// --- [핵심] 히스토리 기능 ---
function addToHistory(book, chapter) {
    // 현재 위치와 같다면 추가 안함
    if (historyIndex >= 0) {
        const curr = historyStack[historyIndex];
        if (curr.book === book && curr.chapter === chapter) return;
    }

    // 새로운 이동이 발생하면, 현재 위치 이후의 기록은 날림
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push({ book, chapter });
    historyIndex++;
    updateHistoryButtons();
}

function goHistoryBack() {
    if (historyIndex > 0) {
        historyIndex--;
        const prev = historyStack[historyIndex];
        isHistoryNavigating = true; // 히스토리 이동임을 표시
        loadChapter(prev.book, prev.chapter, false); // false: 히스토리 추가 X
    }
}

function goHistoryForward() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        const next = historyStack[historyIndex];
        isHistoryNavigating = true;
        loadChapter(next.book, next.chapter, false);
    }
}

function updateHistoryButtons() {
    document.getElementById("hist-back-btn").disabled = (historyIndex <= 0);
    document.getElementById("hist-fwd-btn").disabled = (historyIndex >= historyStack.length - 1);
    // 스타일 조정 (비활성화 시 흐리게)
    document.getElementById("hist-back-btn").style.opacity = (historyIndex <= 0) ? "0.5" : "1";
    document.getElementById("hist-fwd-btn").style.opacity = (historyIndex >= historyStack.length - 1) ? "0.5" : "1";
}

// --- 챕터 로드 (히스토리 처리 포함) ---
function loadChapter(book, chapter, pushToHistory = true) {
    currentBook = book;
    currentChapter = chapter;
    
    if (pushToHistory) {
        addToHistory(book, chapter);
    }
    isHistoryNavigating = false; // 리셋

    fetchChapterData(book, chapter);
}

// --- 데이터 요청 및 렌더링 ---
async function fetchChapterData(book, chapter) {
    currentVerse = 1; 
    updateNavUI();

    const bibleList = document.getElementById("bible-list");
    bibleList.innerHTML = "<p>데이터를 불러오는 중입니다...</p>";
    
    const url = `${AHPI_API_BASE_URL}/get_chapter_data/${book}/${chapter}`;
    
    try {
        const res = await fetch(url);
        if(!res.ok) throw new Error("서버 응답 실패");
        const ahpiData = await res.json();
        
        loadedChapterData.korean = ahpiData.korean_verses || {};
        loadedChapterData.english = ahpiData.english_verses || {};
        loadedChapterData.commentaries = ahpiData.commentaries || {};
        
        const isNT = NT_BOOKS.includes(book);
        if (isNT) loadedChapterData.original = ahpiData.greek_verses || {};
        else loadedChapterData.original = ahpiData.hebrew_verses || {};

        const maxVerse = Math.max(
            Object.keys(loadedChapterData.korean).length,
            Object.keys(loadedChapterData.english).length
        );

        if (!Array.isArray(loadedChapterData.english)) {
             let engArr = [];
             for(let i=1; i<=maxVerse; i++) engArr.push(loadedChapterData.english[i] || "");
             loadedChapterData.english = engArr;
        }

        renderBibleList(maxVerse);
        selectVerse(1);

    } catch (error) {
        console.error(error);
        bibleList.innerHTML = "<p style='color:red'>데이터 로드 실패</p>";
    }
}

function updateNavUI() {
    document.getElementById("current-location").innerText = `${KOREAN_BOOK_NAMES[currentBook]} ${currentChapter}장`;
    
    const isNT = NT_BOOKS.includes(currentBook);
    if (isNT) {
        document.getElementById("btn-nt").style.border = "2px solid #007bff";
        document.getElementById("btn-ot").style.border = "1px solid #ccc";
    } else {
        document.getElementById("btn-ot").style.border = "2px solid #007bff";
        document.getElementById("btn-nt").style.border = "1px solid #ccc";
    }
}

// --- UI 팝업 로직 ---
function openBookGrid(type) {
    const modal = document.getElementById("nav-modal");
    const title = document.getElementById("nav-modal-title");
    const grid = document.getElementById("nav-grid");
    modal.style.display = "flex";
    grid.innerHTML = "";
    let books = type === "OT" ? OT_BOOKS : NT_BOOKS;
    title.innerText = type === "OT" ? "구약 성경 선택" : "신약 성경 선택";

    books.forEach(book => {
        const btn = document.createElement("div");
        btn.className = "grid-btn";
        btn.innerText = KOREAN_BOOK_NAMES[book] || book;
        if (book === currentBook) btn.classList.add("selected");
        btn.onclick = () => {
            openChapterGrid(book);
        };
        grid.appendChild(btn);
    });
}

function openChapterGrid(book) {
    const title = document.getElementById("nav-modal-title");
    const grid = document.getElementById("nav-grid");
    title.innerText = `${KOREAN_BOOK_NAMES[book]} - 장 선택`;
    grid.innerHTML = "";
    
    // 숫자판 그리드 스타일 적용
    grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(50px, 1fr))";

    const maxChapter = BIBLE_DATA[book] || 50;
    for (let i = 1; i <= maxChapter; i++) {
        const btn = document.createElement("div");
        btn.className = "grid-btn";
        btn.innerText = i;
        btn.style.fontWeight = "bold";
        if (book === currentBook && i === currentChapter) btn.classList.add("selected");
        btn.onclick = () => {
            document.getElementById("nav-modal").style.display = "none";
            // 그리드 스타일 복구
            grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(100px, 1fr))";
            loadChapter(book, i, true); // 히스토리 추가
        };
        grid.appendChild(btn);
    }
}

// --- [수정됨] 다국어 검색 ---
async function performSearch() {
    const q = document.getElementById("search-input").value;
    // 언어 선택값 가져오기 (한/영/히/헬)
    const lang = document.getElementById("search-lang").value;

    if(q.length < 2) return alert("2글자 이상 입력해주세요.");
    
    const modal = document.getElementById("search-result-modal");
    const body = document.getElementById("search-results-body");
    body.innerHTML = "검색 중...";
    modal.style.display = "flex";

    // 언어 파라미터 추가 전송
    const res = await fetch(`${AHPI_API_BASE_URL}/search?q=${encodeURIComponent(q)}&lang=${lang}`);
    const data = await res.json();
    
    if(data.results?.length) {
        body.innerHTML = data.results.map(item => 
            `<div class="search-item" onclick="window.goToSearchResult('${item.book}', ${item.chapter}, ${item.verse})">
                <div class="search-ref">${KOREAN_BOOK_NAMES[item.book] || item.book} ${item.chapter}:${item.verse}</div>
                <div class="search-text" ${lang==='heb'?'dir="rtl"':''}>${item.text}</div>
            </div>`
        ).join("");
    } else body.innerHTML = "결과 없음";
}

window.goToSearchResult = function(b, c, v) {
    document.getElementById("search-result-modal").style.display = "none";
    loadChapter(b, c, true); // 히스토리 추가하며 이동
};

// --- 이동 버튼 ---
function goToNextChapter() {
    if(currentChapter < BIBLE_DATA[currentBook]) loadChapter(currentBook, currentChapter + 1, true);
    else {
        const idx = BOOK_NAMES.indexOf(currentBook);
        if(idx < BOOK_NAMES.length-1) loadChapter(BOOK_NAMES[idx+1], 1, true);
    }
}
function goToPrevChapter() {
    if(currentChapter > 1) loadChapter(currentBook, currentChapter - 1, true);
    else {
        const idx = BOOK_NAMES.indexOf(currentBook);
        if(idx > 0) loadChapter(BOOK_NAMES[idx-1], BIBLE_DATA[BOOK_NAMES[idx-1]], true);
    }
}

// --- 렌더링 및 기타 함수들 (기존 유지) ---
function renderBibleList(maxVerse) {
    const list = document.getElementById("bible-list");
    list.innerHTML = "";
    if (maxVerse === 0) { list.innerHTML = "<p>본문이 없습니다.</p>"; return; }

    for (let i = 1; i <= maxVerse; i++) {
        const div = document.createElement("div");
        div.className = "verse-item";
        div.id = `verse-row-${i}`; 
        div.onclick = () => selectVerse(i); 

        const kor = loadedChapterData.korean[i] || "";
        const eng = Array.isArray(loadedChapterData.english) ? (loadedChapterData.english[i-1] || "") : (loadedChapterData.english[i] || "");
        const ori = loadedChapterData.original[i-1] || "";

        const korHtml = renderTextWithStrongs(kor, "kor");
        const engHtml = renderTextWithStrongs(eng, "eng");

        let html = `<span class="verse-num">${i}.</span>`;
        html += `<span class="korean-text">${korHtml}</span>`;
        html += `<span class="english-text">${engHtml}</span>`; 
        
        const oriWords = ori.split(/\s+/).filter(w => w.length > 0);
        let oriHtml = "";
        oriWords.forEach(word => {
            if (/[\u0590-\u05FF]/.test(word) || /[\u0370-\u03FF\u1F00-\u1FFF]/.test(word)) {
                const cleanData = word.replace(/['".,;:]/g, '');
                oriHtml += `<span class="hebrew-word" data-word="${cleanData}">${word}</span> `;
            } else {
                oriHtml += `${word} `;
            }
        });
        html += `<span class="hebrew-text">${oriHtml}</span>`;

        div.innerHTML = html;
        list.appendChild(div);
    }
    
    attachStrongClickEvents();
    makeHebrewWordsClickable();
}

// ... (renderTextWithStrongs, attachStrongClickEvents, makeHebrewWordsClickable, handleWordClick, handleEnglishClick 등은 기존 코드와 동일하여 생략. 그대로 두시면 됩니다.) ...
// (지면 관계상 생략된 부분은 기존 코드를 사용하되, 위에서 수정된 fetchChapterData, performSearch 등이 중요합니다.)
// 아래에 필수 함수들 포함합니다.

function renderTextWithStrongs(text, lang) {
    if (!text) return "";
    const parts = text.split(/(<[A-Z]{1,2}\d+>)/);
    let html = "";
    let prevWord = "";
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith("<") && part.endsWith(">")) {
            let code = part.replace(/[<>]/g, ""); 
            if(code.startsWith("W")) code = code.substring(1);
            if (prevWord.trim().length > 0) {
                html += `<span class="strong-word ${lang}" data-strong="${code}">${prevWord}</span>`;
                prevWord = "";
            }
        } else {
            if (prevWord) html += prevWord;
            prevWord = part;
        }
    }
    if (prevWord) html += prevWord;
    return html;
}
function attachStrongClickEvents() {
    document.querySelectorAll('.strong-word').forEach(span => {
        span.addEventListener('click', async (e) => {
            e.stopPropagation();
            const code = e.target.dataset.strong;
            const word = e.target.innerText;
            openLexiconModal(code, word);
        });
    });
}
function makeHebrewWordsClickable() {
    document.querySelectorAll('.hebrew-word').forEach(span => {
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            // 원어는 스트롱 코드가 없으므로, 단어 자체로 검색하거나 알림
            // 현재는 알림만 (추후 구현)
        });
    });
}
async function openLexiconModal(code, word) {
    const modal = document.getElementById("lexicon-modal");
    const modalBody = document.getElementById("modal-body");
    modal.style.display = "flex"; 
    modalBody.innerHTML = `<p>사전 찾는 중: ${code}...</p>`;
    try {
        const res = await fetch(`${AHPI_API_BASE_URL}/lexicon/${code}`);
        const data = await res.json();
        let html = `<h3 style="font-size:1.5rem; color:#007bff; text-align:center;">${word} (${code})</h3>`;
        if (data.content && data.content !== "사전 데이터가 없습니다.") {
            html += `<div style="text-align:left; margin-top:15px; line-height:1.6; font-size:1rem;">${data.content}</div>`;
        } else {
            let link = code.startsWith('H') ? `https://biblehub.com/hebrew/${code.substring(1)}.htm` : `https://biblehub.com/greek/${code.substring(1)}.htm`;
            html += `<p style="color:red; text-align:center;">사전 데이터 없음</p><div style="text-align:center; margin-top:15px;"><a href="${link}" target="_blank" style="padding:8px; background:#eee; border-radius:5px;">BibleHub에서 보기</a></div>`;
        }
        modalBody.innerHTML = html;
    } catch (err) { modalBody.innerHTML = "<p>통신 오류</p>"; }
}
function selectVerse(verseNum) {
    currentVerse = verseNum;
    document.querySelectorAll(".verse-item").forEach(el => el.classList.remove("selected"));
    const targetRow = document.getElementById(`verse-row-${verseNum}`);
    if (targetRow) targetRow.classList.add("selected");
    document.getElementById("current-verse-display").innerText = `${KOREAN_BOOK_NAMES[currentBook]||currentBook} ${currentChapter}:${verseNum}`;
    const comment = loadedChapterData.commentaries[verseNum];
    document.getElementById("commentary-display").innerText = comment ? comment : "작성된 주해가 없습니다.";
    closeEditor();
}
function openEditor() {
    document.getElementById("commentary-display").style.display = "none";
    document.getElementById("edit-btn").style.display = "none";
    document.getElementById("editor-container").style.display = "block";
    document.getElementById("commentary-input").value = document.getElementById("commentary-display").innerText === "작성된 주해가 없습니다." ? "" : document.getElementById("commentary-display").innerText;
}
function closeEditor() {
    document.getElementById("editor-container").style.display = "none";
    document.getElementById("commentary-display").style.display = "block";
    document.getElementById("edit-btn").style.display = "block";
}
async function saveCommentary() {
    const content = document.getElementById("commentary-input").value;
    await fetch(`${AHPI_API_BASE_URL}/save_commentary`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ book: currentBook, chapter: currentChapter, verse: currentVerse, content: content })
    });
    alert("저장 완료");
    loadedChapterData.commentaries[currentVerse] = content;
    selectVerse(currentVerse);
    closeEditor();
}