const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

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

// 책 이름 매핑 (한글, 약어)
const BOOK_INFO = {
    "Genesis": { ko: "창세기", kabbr: "창", abbr: "Gen" }, "Exodus": { ko: "출애굽기", kabbr: "출", abbr: "Exo" },
    "Leviticus": { ko: "레위기", kabbr: "레", abbr: "Lev" }, "Numbers": { ko: "민수기", kabbr: "민", abbr: "Num" },
    "Deuteronomy": { ko: "신명기", kabbr: "신", abbr: "Deu" }, "Joshua": { ko: "여호수아", kabbr: "수", abbr: "Jos" },
    "Judges": { ko: "사사기", kabbr: "삿", abbr: "Jdg" }, "Ruth": { ko: "룻기", kabbr: "룻", abbr: "Rut" },
    "1 Samuel": { ko: "사무엘상", kabbr: "삼상", abbr: "1Sa" }, "2 Samuel": { ko: "사무엘하", kabbr: "삼하", abbr: "2Sa" },
    "1 Kings": { ko: "열왕기상", kabbr: "왕상", abbr: "1Ki" }, "2 Kings": { ko: "열왕기하", kabbr: "왕하", abbr: "2Ki" },
    "1 Chronicles": { ko: "역대상", kabbr: "대상", abbr: "1Ch" }, "2 Chronicles": { ko: "역대하", kabbr: "대하", abbr: "2Ch" },
    "Ezra": { ko: "에스라", kabbr: "스", abbr: "Ezr" }, "Nehemiah": { ko: "느헤미야", kabbr: "느", abbr: "Neh" },
    "Esther": { ko: "에스더", kabbr: "에", abbr: "Est" }, "Job": { ko: "욥기", kabbr: "욥", abbr: "Job" },
    "Psalms": { ko: "시편", kabbr: "시", abbr: "Psa" }, "Proverbs": { ko: "잠언", kabbr: "잠", abbr: "Pro" },
    "Ecclesiastes": { ko: "전도서", kabbr: "전", abbr: "Ecc" }, "Song of Songs": { ko: "아가", kabbr: "아", abbr: "Sng" },
    "Isaiah": { ko: "이사야", kabbr: "사", abbr: "Isa" }, "Jeremiah": { ko: "예레미야", kabbr: "렘", abbr: "Jer" },
    "Lamentations": { ko: "예레미야애가", kabbr: "애", abbr: "Lam" }, "Ezekiel": { ko: "에스겔", kabbr: "겔", abbr: "Eze" },
    "Daniel": { ko: "다니엘", kabbr: "단", abbr: "Dan" }, "Hosea": { ko: "호세아", kabbr: "호", abbr: "Hos" },
    "Joel": { ko: "요엘", kabbr: "욜", abbr: "Joe" }, "Amos": { ko: "아모스", kabbr: "암", abbr: "Amo" },
    "Obadiah": { ko: "오바댜", kabbr: "옵", abbr: "Oba" }, "Jonah": { ko: "요나", kabbr: "욘", abbr: "Jon" },
    "Micah": { ko: "미가", kabbr: "미", abbr: "Mic" }, "Nahum": { ko: "나훔", kabbr: "나", abbr: "Nah" },
    "Habakkuk": { ko: "하박국", kabbr: "합", abbr: "Hab" }, "Zephaniah": { ko: "스바냐", kabbr: "습", abbr: "Zep" },
    "Haggai": { ko: "학개", kabbr: "학", abbr: "Hag" }, "Zechariah": { ko: "스가랴", kabbr: "슥", abbr: "Zec" },
    "Malachi": { ko: "말라기", kabbr: "말", abbr: "Mal" },
    "Matthew": { ko: "마태복음", kabbr: "마", abbr: "Mat" }, "Mark": { ko: "마가복음", kabbr: "막", abbr: "Mar" },
    "Luke": { ko: "누가복음", kabbr: "눅", abbr: "Luk" }, "John": { ko: "요한복음", kabbr: "요", abbr: "Joh" },
    "Acts": { ko: "사도행전", kabbr: "행", abbr: "Act" }, "Romans": { ko: "로마서", kabbr: "롬", abbr: "Rom" },
    "1 Corinthians": { ko: "고린도전서", kabbr: "고전", abbr: "1Co" }, "2 Corinthians": { ko: "고린도후서", kabbr: "고후", abbr: "2Co" },
    "Galatians": { ko: "갈라디아서", kabbr: "갈", abbr: "Gal" }, "Ephesians": { ko: "에베소서", kabbr: "엡", abbr: "Eph" },
    "Philippians": { ko: "빌립보서", kabbr: "빌", abbr: "Php" }, "Colossians": { ko: "골로새서", kabbr: "골", abbr: "Col" },
    "1 Thessalonians": { ko: "데살로니가전서", kabbr: "살전", abbr: "1Th" }, "2 Thessalonians": { ko: "데살로니가후서", kabbr: "살후", abbr: "2Th" },
    "1 Timothy": { ko: "디모데전서", kabbr: "딤전", abbr: "1Ti" }, "2 Timothy": { ko: "디모데후서", kabbr: "딤후", abbr: "2Ti" },
    "Titus": { ko: "디도서", kabbr: "딛", abbr: "Tit" }, "Philemon": { ko: "빌레몬서", kabbr: "몬", abbr: "Phm" },
    "Hebrews": { ko: "히브리서", kabbr: "히", abbr: "Heb" }, "James": { ko: "야고보서", kabbr: "약", abbr: "Jas" },
    "1 Peter": { ko: "베드로전서", kabbr: "벧전", abbr: "1Pe" }, "2 Peter": { ko: "베드로후서", kabbr: "벧후", abbr: "2Pe" },
    "1 John": { ko: "요한일서", kabbr: "요일", abbr: "1Jn" }, "2 John": { ko: "요한이서", kabbr: "요이", abbr: "2Jn" },
    "3 John": { ko: "요한삼서", kabbr: "요삼", abbr: "3Jn" }, "Jude": { ko: "유다서", kabbr: "유", abbr: "Jud" },
    "Revelation": { ko: "요한계시록", kabbr: "계", abbr: "Rev" }
};

const NT_BOOKS = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
const ALL_BOOKS = Object.keys(BIBLE_DATA);
const OT_BOOKS = ALL_BOOKS.filter(book => !NT_BOOKS.includes(book));

let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;
let loadedChapterData = { korean: {}, english: {}, original: {}, commentaries: {} };

let historyStack = [];
let historyIndex = -1;

document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners();
    loadChapter(currentBook, currentChapter, true);
});

function setupEventListeners() {
    const closeModal = (id) => { const el = document.getElementById(id); if(el) el.style.display = "none"; };
    document.getElementById("nav-modal-close").onclick = () => closeModal("nav-modal");
    document.getElementById("lexicon-close").onclick = () => closeModal("lexicon-modal");
    document.getElementById("search-close").onclick = () => closeModal("search-result-modal");
    document.getElementById("chapter-nav-close").onclick = () => closeModal("chapter-nav-modal");
    document.getElementById("analysis-close").onclick = () => closeModal("analysis-modal");

    document.getElementById("btn-ot").onclick = () => openBookGrid("OT");
    document.getElementById("btn-nt").onclick = () => openBookGrid("NT");

    document.getElementById("prev-btn").onclick = goToPrevChapter;
    document.getElementById("next-btn").onclick = goToNextChapter;
    document.getElementById("hist-back-btn").onclick = goHistoryBack;
    document.getElementById("hist-fwd-btn").onclick = goHistoryForward;

    document.getElementById("search-btn").onclick = performSearch;
    document.getElementById("search-input").onkeypress = (e) => { if(e.key === 'Enter') performSearch(); };

    document.getElementById("edit-btn").onclick = openEditor;
    document.getElementById("cancel-btn").onclick = closeEditor;
    document.getElementById("save-btn").onclick = saveCommentary;
}

// --- [수정됨] 히스토리 기능 (다음 버튼 작동하게 수정) ---
function addToHistory(book, chapter) {
    // 현재 위치가 스택의 현재 인덱스와 같다면 중복 추가 방지
    if (historyIndex >= 0) {
        const curr = historyStack[historyIndex];
        if (curr.book === book && curr.chapter === chapter) return;
    }

    // 새로운 이동: 현재 인덱스 이후의 기록을 모두 지우고 새 기록 추가
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push({ book, chapter });
    historyIndex++;
    updateHistoryButtons();
}

function goHistoryBack() {
    if (historyIndex > 0) {
        historyIndex--;
        const prev = historyStack[historyIndex];
        loadChapter(prev.book, prev.chapter, false);
        updateHistoryButtons();
    }
}

function goHistoryForward() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        const next = historyStack[historyIndex];
        loadChapter(next.book, next.chapter, false);
        updateHistoryButtons();
    }
}

function updateHistoryButtons() {
    const backBtn = document.getElementById("hist-back-btn");
    const fwdBtn = document.getElementById("hist-fwd-btn");
    
    backBtn.style.opacity = (historyIndex > 0) ? "1" : "0.5";
    backBtn.disabled = (historyIndex <= 0);
    
    fwdBtn.style.opacity = (historyIndex < historyStack.length - 1) ? "1" : "0.5";
    fwdBtn.disabled = (historyIndex >= historyStack.length - 1);
}

// --- UI 팝업 ---
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
        const info = BOOK_INFO[book] || {ko: book};
        btn.innerText = info.ko;
        if (book === currentBook) btn.classList.add("selected");
        btn.onclick = () => openChapterGrid(book);
        grid.appendChild(btn);
    });
}

function openChapterGrid(book) {
    const modal = document.getElementById("chapter-nav-modal");
    const title = document.getElementById("chapter-modal-title");
    const grid = document.getElementById("chapter-grid");
    document.getElementById("nav-modal").style.display = "none";
    
    const info = BOOK_INFO[book] || {ko: book};
    title.innerText = `${info.ko} - 장 선택`;
    modal.style.display = "flex";
    grid.innerHTML = "";

    const maxChapter = BIBLE_DATA[book] || 50;
    for (let i = 1; i <= maxChapter; i++) {
        const btn = document.createElement("div");
        btn.className = "grid-btn chapter-num";
        btn.innerText = i;
        if (book === currentBook && i === currentChapter) btn.classList.add("selected");
        btn.onclick = () => {
            document.getElementById("chapter-nav-modal").style.display = "none";
            loadChapter(book, i, true);
        };
        grid.appendChild(btn);
    }
}

function updateNavUI() {
    const info = BOOK_INFO[currentBook] || {ko: currentBook};
    document.getElementById("current-location").innerText = `${info.ko} ${currentChapter}장`;
    
    const isNT = NT_BOOKS.includes(currentBook);
    if (isNT) {
        document.getElementById("btn-nt").classList.add("active");
        document.getElementById("btn-ot").classList.remove("active");
    } else {
        document.getElementById("btn-ot").classList.add("active");
        document.getElementById("btn-nt").classList.remove("active");
    }
}

// --- 로드 ---
function loadChapter(book, chapter, pushToHistory = true) {
    currentBook = book;
    currentChapter = chapter;
    if (pushToHistory) addToHistory(book, chapter);
    fetchChapterData(book, chapter);
}

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

        const maxVerse = Math.max(Object.keys(loadedChapterData.korean).length, Object.keys(loadedChapterData.english).length);

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

function renderBibleList(maxVerse) {
    const list = document.getElementById("bible-list");
    list.innerHTML = "";
    if (maxVerse === 0) { list.innerHTML = "<p>본문이 없습니다.</p>"; return; }

    const isNT = NT_BOOKS.includes(currentBook);
    const analysisIcon = isNT ? "α" : "א";

    for (let i = 1; i <= maxVerse; i++) {
        const div = document.createElement("div");
        div.className = "verse-item";
        div.id = `verse-row-${i}`; 
        
        div.onclick = (e) => {
            if(e.target.tagName === 'SPAN' && (e.target.classList.contains('strong-word') || e.target.classList.contains('hebrew-word') || e.target.classList.contains('action-icon') || e.target.classList.contains('analysis-icon'))) return;
            selectVerse(i); 
        };

        const korRaw = loadedChapterData.korean[i] || "";
        const engRaw = Array.isArray(loadedChapterData.english) ? (loadedChapterData.english[i-1] || "") : (loadedChapterData.english[i] || "");
        const ori = loadedChapterData.original[i-1] || "";

        const korHtml = renderTextWithStrongs(korRaw, "kor");
        const engHtml = renderTextWithStrongs(engRaw, "eng");

        // [수정됨] 아이콘 배치 로직
        // 한글: 절 번호 + 한글 + 복사 아이콘
        let html = `<div class="verse-line">
                        <span class="verse-num">${i}.</span>
                        <span class="korean-text">${korHtml}</span>
                        <span class="action-icon" title="한글 복사" onclick="copyToClipboard('${korRaw}', 'kor', ${i})">📋</span>
                    </div>`;
        
        // 영어: 영어 + 복사 아이콘
        html += `<div class="verse-line">
                    <span class="english-text">${engHtml}</span>
                    <span class="action-icon" title="영어 복사" onclick="copyToClipboard('${engRaw}', 'eng', ${i})">📋</span>
                 </div>`;

        // 원어: (헬라어: 알파+본문+복사 / 히브리어: 복사+본문+알렢)
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
        
        if (isNT) {
            // 신약 (헬라어): [알파] [본문] [복사]
             html += `<div class="verse-line" style="display:flex; align-items:center;">
                        <span class="analysis-icon" title="원전 분해" onclick="openAnalysisModal('${ori.replace(/'/g, "\\'")}')">${analysisIcon}</span>
                        <span class="greek-text" style="margin:0 8px;">${oriHtml}</span>
                        <span class="action-icon" title="원어 복사" onclick="copyToClipboard('${ori.replace(/'/g, "\\'")}', 'grk', ${i})">📋</span>
                     </div>`;
        } else {
            // 구약 (히브리어): [복사] [본문] [알렢] (RTL 고려)
             html += `<div class="verse-line" style="display:flex; align-items:center; justify-content:flex-end;">
                        <span class="action-icon" title="원어 복사" onclick="copyToClipboard('${ori.replace(/'/g, "\\'")}', 'heb', ${i})">📋</span>
                        <span class="hebrew-text" style="margin:0 8px;">${oriHtml}</span>
                        <span class="analysis-icon" title="원전 분해" onclick="openAnalysisModal('${ori.replace(/'/g, "\\'")}')">${analysisIcon}</span>
                     </div>`;
        }

        div.innerHTML = html;
        list.appendChild(div);
    }
    
    attachStrongClickEvents();
    makeHebrewWordsClickable();
}

// --- [수정됨] 복사 기능 (토스트 메시지 + 포맷팅) ---
function copyToClipboard(text, lang, verse) {
    // 태그 제거
    const cleanText = text.replace(/<[^>]*>?/gm, '');
    const info = BOOK_INFO[currentBook] || { ko: currentBook, kabbr: currentBook, abbr: currentBook.substring(0,3) };
    
    let copyString = "";
    if (lang === 'kor') {
        // 창 1:1 태초에...
        copyString = `${info.kabbr} ${currentChapter}:${verse} ${cleanText}`;
    } else if (lang === 'eng') {
        // Gen 1:1 In the beginning...
        copyString = `${info.abbr} ${currentChapter}:${verse} ${cleanText}`;
    } else {
        // Gen 1:1 בראשית...
        copyString = `${info.abbr} ${currentChapter}:${verse} ${cleanText}`;
    }

    navigator.clipboard.writeText(copyString).then(() => {
        showToast("복사되었습니다");
    });
}

// [NEW] 토스트 메시지 보여주기
function showToast(msg) {
    const toast = document.getElementById("toast-message");
    toast.innerText = msg;
    toast.classList.remove("hidden");
    setTimeout(() => {
        toast.classList.add("hidden");
    }, 500); // 0.5초 후 사라짐
}

function openAnalysisModal(text) {
    const modal = document.getElementById("analysis-modal");
    const body = document.getElementById("analysis-body");
    modal.style.display = "flex";
    body.innerHTML = `<h3 dir="rtl" style="font-size:1.5rem;">${text}</h3><p>원전 분해 기능은 준비 중입니다.</p>`;
}

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
    const info = BOOK_INFO[currentBook] || {ko: currentBook};
    document.getElementById("current-verse-display").innerText = `${info.ko} ${currentChapter}:${verseNum}`;
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
    const btn = document.getElementById("save-btn");
    btn.innerText = "저장 중...";
    await fetch(`${AHPI_API_BASE_URL}/save_commentary`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ book: currentBook, chapter: currentChapter, verse: currentVerse, content: content })
    });
    alert("저장 완료");
    loadedChapterData.commentaries[currentVerse] = content;
    selectVerse(currentVerse);
    btn.innerText = "저장";
    closeEditor();
}
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
async function performSearch() {
    const q = document.getElementById("search-input").value;
    const lang = document.getElementById("search-lang").value;
    if(q.length<2) return alert("2글자 이상");
    const modal = document.getElementById("search-result-modal");
    const body = document.getElementById("search-results-body");
    body.innerHTML = "검색 중...";
    modal.style.display = "flex";
    const res = await fetch(`${AHPI_API_BASE_URL}/search?q=${encodeURIComponent(q)}&lang=${lang}`);
    const data = await res.json();
    if(data.results?.length) {
        body.innerHTML = data.results.map(item => {
            const info = BOOK_INFO[item.book] || {ko: item.book};
            return `<div class="search-item" onclick="window.goToSearchResult('${item.book}', ${item.chapter}, ${item.verse})">
                <div class="search-ref">${info.ko} ${item.chapter}:${item.verse}</div>
                <div class="search-text" ${lang==='heb'?'dir="rtl"':''}>${item.text}</div>
            </div>`
        }).join("");
    } else body.innerHTML = "결과 없음";
}
window.goToSearchResult = function(b, c, v) {
    document.getElementById("search-result-modal").style.display = "none";
    loadChapter(b, c, true);
};