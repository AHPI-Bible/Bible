// Render 서버
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";
// 로컬 테스트
// const AHPI_API_BASE_URL = "http://127.0.0.1:5000/api";

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

let currentBook = "Genesis";
let currentChapter = 1;
let currentVerse = 1;
let loadedChapterData = { korean: {}, english: {}, original: {}, commentaries: {} };
let historyStack = [];
let historyIndex = -1;
let isHistoryNavigating = false;
let tempCopyData = { kor: "", eng: "", ori: "", verse: 0 };

let currentBibleFontSize = 100;
let currentCommFontSize = 100;

const layoutClasses = ["layout-40-60", "layout-50-50", "layout-60-40", "layout-70-30", "layout-100-0"];

document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners();
    loadChapter(currentBook, currentChapter, true);
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }
    const savedLayout = localStorage.getItem('layoutRatio') || "layout-60-40";
    document.body.classList.add(savedLayout);
});

function setupEventListeners() {
    const closeModal = (id) => { document.getElementById(id).style.display = "none"; };
    document.getElementById("nav-modal-close").onclick = () => closeModal("nav-modal");
    document.getElementById("lexicon-close").onclick = () => closeModal("lexicon-modal");
    document.getElementById("search-close").onclick = () => closeModal("search-result-modal");
    document.getElementById("chapter-nav-close").onclick = () => closeModal("chapter-nav-modal");
    document.getElementById("copy-close").onclick = () => closeModal("copy-modal");
    document.getElementById("settings-close").onclick = () => closeModal("settings-modal");

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
    document.getElementById("toggle-commentary-btn").onclick = toggleCommentary;

    document.getElementById("btn-dark-mode").onclick = toggleDarkMode;
    document.getElementById("btn-comm-font-plus").onclick = () => changeCommFontSize(10);
    document.getElementById("btn-comm-font-minus").onclick = () => changeCommFontSize(-10);

    document.getElementById("close-analysis-btn").onclick = closeAnalysisPanel;
    document.getElementById("close-lexicon-btn").onclick = closeLexiconPanel;
    
    document.getElementById("close-commentary-btn").onclick = () => {
        if(window.innerWidth <= 768) {
            toggleCommentary();
        } else {
            applyLayout("layout-100-0");
        }
    };

    // 좌우 비율 메뉴
    document.getElementById("btn-layout-header").onclick = () => {
        document.getElementById("layout-menu").classList.toggle("show");
    };
    document.querySelectorAll(".menu-item").forEach(item => {
        item.onclick = (e) => {
            const ratio = e.target.getAttribute("data-ratio");
            applyLayout(`layout-${ratio}`);
            document.getElementById("layout-menu").classList.remove("show");
        };
    });
    window.onclick = (e) => {
        if (!e.target.matches('#btn-layout-header') && !e.target.matches('#btn-layout-header img')) {
            const menu = document.getElementById("layout-menu");
            if (menu && menu.classList.contains('show')) menu.classList.remove('show');
        }
    };

    // 복사 기능 연결
    document.getElementById("copy-kor").onclick = () => copyVerseRange("kor");
    document.getElementById("copy-eng").onclick = () => copyVerseRange("eng");
    document.getElementById("copy-ori").onclick = () => copyVerseRange("ori");
    
    // [NEW] 시작 드롭다운 변경 시 끝 드롭다운 갱신
    document.getElementById("kor-start").onchange = () => updateEndDropdown("kor");
    document.getElementById("eng-start").onchange = () => updateEndDropdown("eng");
    document.getElementById("ori-start").onchange = () => updateEndDropdown("ori");

    // 끝 드롭다운 선택 시 자동 복사
    document.getElementById("kor-end").onchange = () => copyVerseRange("kor");
    document.getElementById("eng-end").onchange = () => copyVerseRange("eng");
    document.getElementById("ori-end").onchange = () => copyVerseRange("ori");

    // 설정 연결
    document.getElementById("btn-settings").onclick = () => {
        document.getElementById("settings-modal").style.display = "flex";
    };
    document.getElementById("chk-kor").onchange = () => toggleBibleVersionVisibility("kor");
    document.getElementById("chk-eng").onchange = () => toggleBibleVersionVisibility("eng");
    document.getElementById("chk-ori").onchange = () => toggleBibleVersionVisibility("ori");
}

function applyLayout(className) {
    layoutClasses.forEach(c => document.body.classList.remove(c));
    document.body.classList.add(className);
    localStorage.setItem('layoutRatio', className);
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

function changeCommFontSize(delta) {
    currentCommFontSize += delta;
    if(currentCommFontSize < 70) currentCommFontSize = 70;
    if(currentCommFontSize > 250) currentCommFontSize = 250;
    const displayDiv = document.getElementById("commentary-display");
    if(displayDiv) displayDiv.style.fontSize = `${1.1 * (currentCommFontSize/100)}rem`;
}

function toggleCommentary() {
    const panel = document.getElementById("commentary-area");
    if(panel.classList.contains("show")) {
        panel.classList.remove("show");
    } else {
        panel.classList.add("show");
    }
}

function closeAnalysisPanel() {
    const panel = document.getElementById("analysis-panel");
    panel.classList.remove("show");
}

function closeLexiconPanel() {
    const panel = document.getElementById("lexicon-panel");
    panel.classList.remove("show");
}

// [수정] 복사 모달: 시작/끝 드롭다운 초기화
function openCopyModal(kor, eng, ori, verse) {
    tempCopyData = { kor, eng, ori, verse };
    const maxVerse = Object.keys(loadedChapterData.korean).length;
    
    initDropdowns("kor", verse, maxVerse);
    initDropdowns("eng", verse, maxVerse);
    initDropdowns("ori", verse, maxVerse);

    document.getElementById("copy-modal").style.display = "flex";
}

function initDropdowns(lang, current, max) {
    const startSel = document.getElementById(`${lang}-start`);
    const endSel = document.getElementById(`${lang}-end`);
    startSel.innerHTML = "";
    endSel.innerHTML = "";

    // 시작: 1 ~ Max
    for(let i=1; i<=max; i++) {
        startSel.add(new Option(i, i, false, i===current));
    }
    // 끝: Current ~ Max (기본값)
    for(let i=current; i<=max; i++) {
        endSel.add(new Option(i, i, false, i===current));
    }
}

// [NEW] 시작 선택 시 끝 드롭다운 업데이트 (Start+1 ~ Max)
function updateEndDropdown(lang) {
    const startVal = parseInt(document.getElementById(`${lang}-start`).value);
    const endSel = document.getElementById(`${lang}-end`);
    const maxVerse = Object.keys(loadedChapterData.korean).length;
    
    // 현재 선택된 끝 값 저장 (가능하다면 유지)
    const currentEnd = parseInt(endSel.value);
    endSel.innerHTML = "";

    // 끝 드롭다운은 시작 값부터 끝까지
    for(let i=startVal; i<=maxVerse; i++) {
        endSel.add(new Option(i, i));
    }
    // 만약 이전 끝 값이 유효하면 선택
    if(currentEnd >= startVal) endSel.value = currentEnd;
    else endSel.value = startVal; // 아니면 시작값으로 리셋
}

function copyVerseRange(lang) {
    const start = parseInt(document.getElementById(`${lang}-start`).value);
    const end = parseInt(document.getElementById(`${lang}-end`).value);
    
    if(start > end) return;

    let copyText = "";
    const info = BOOK_INFO[currentBook] || { abbr: currentBook.substring(0,1) };
    // 한글 약어 처리 (단순화)
    let abbr = info.abbr; 
    if(KOREAN_BOOK_NAMES[currentBook]) abbr = KOREAN_BOOK_NAMES[currentBook].substring(0,1);
    if(KOREAN_BOOK_NAMES[currentBook] && KOREAN_BOOK_NAMES[currentBook].length >= 4) abbr = KOREAN_BOOK_NAMES[currentBook].substring(0,2);

    for(let i=start; i<=end; i++) {
        let text = "";
        if(lang === 'kor') text = loadedChapterData.korean[i];
        else if(lang === 'eng') text = (Array.isArray(loadedChapterData.english) ? loadedChapterData.english[i-1] : loadedChapterData.english[i]);
        else text = loadedChapterData.original[i-1];

        if(text) {
            const cleanText = text.replace(/<[^>]*>?/gm, '');
            copyText += `${abbr} ${currentChapter}:${i} ${cleanText}\n`;
        }
    }

    navigator.clipboard.writeText(copyText).then(() => {
        showToast("복사되었습니다");
    });
}

function toggleBibleVersionVisibility(type) {
    const isChecked = document.getElementById(`chk-${type}`).checked;
    let targetClass = "";
    if(type === 'kor') targetClass = ".korean-text";
    else if(type === 'eng') targetClass = ".english-text";
    else targetClass = ".hebrew-text"; 

    const elements = document.querySelectorAll(targetClass);
    elements.forEach(el => {
        if(isChecked) el.closest('.verse-line').classList.remove('hidden');
        else el.closest('.verse-line').classList.add('hidden');
    });
}

function loadChapter(book, chapter, pushToHistory = true) {
    currentBook = book;
    currentChapter = chapter;
    if (pushToHistory) addToHistory(book, chapter);
    isHistoryNavigating = false;
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
        
        toggleBibleVersionVisibility('kor');
        toggleBibleVersionVisibility('eng');
        toggleBibleVersionVisibility('ori');

    } catch (error) {
        console.error(error);
        bibleList.innerHTML = "<p style='color:red'>데이터 로드 실패</p>";
    }
}

function renderBibleList(maxVerse) {
    const list = document.getElementById("bible-list");
    list.innerHTML = "";
    list.style.fontSize = `${currentBibleFontSize}%`;

    if (maxVerse === 0) { list.innerHTML = "<p>본문이 없습니다.</p>"; return; }

    const isNT = NT_BOOKS.includes(currentBook);
    const analysisIcon = isNT ? "α" : "א"; 

    for (let i = 1; i <= maxVerse; i++) {
        const div = document.createElement("div");
        div.className = "verse-item";
        div.id = `verse-row-${i}`; 
        
        div.onclick = (e) => {
            if(e.target.closest('.left-column') || e.target.closest('.strong-word') || e.target.closest('.hebrew-word')) return;
            selectVerse(i);
        };

        const korRaw = loadedChapterData.korean[i] || "";
        const engRaw = Array.isArray(loadedChapterData.english) ? (loadedChapterData.english[i-1] || "") : (loadedChapterData.english[i] || "");
        const ori = loadedChapterData.original[i-1] || "";
        const commentContent = loadedChapterData.commentaries[i];
        
        const commIconClass = commentContent ? "material-icons left-icon-btn comm-icon has-content" : "material-icons left-icon-btn comm-icon";

        const korHtml = renderTextWithStrongs(korRaw, "kor");
        const engHtml = renderTextWithStrongs(engRaw, "eng");

        let html = `
            <div class="left-column">
                <div class="verse-num">${i}.</div>
                <div class="material-icons left-icon-btn copy-icon-left" title="복사" 
                     onclick="openCopyModal('${korRaw.replace(/'/g, "\\'")}', '${engRaw.replace(/'/g, "\\'")}', '${ori.replace(/'/g, "\\'")}', ${i})">
                     content_copy
                </div>
                <div class="${commIconClass}" title="주해 보기" 
                     onclick="handleCommentaryClick(${i})">
                     article
                </div>
                <div class="left-icon-btn analysis-icon" title="원전 분해" 
                     onclick="handleAnalysisClick('${currentBook}', ${currentChapter}, ${i})">
                     ${analysisIcon}
                </div>
            </div>
            
            <div class="text-column">
                <div class="verse-line">
                    <span class="korean-text">${korHtml}</span>
                </div>
                <div class="verse-line">
                    <span class="english-text">${engHtml}</span>
                </div>
                <div class="verse-line">
                    <span class="hebrew-text" ${isNT ? '' : 'dir="rtl"'}>${renderOriginalText(ori)}</span>
                </div>
            </div>
        `;
        div.innerHTML = html;
        list.appendChild(div);
    }
    
    attachStrongClickEvents();
    makeHebrewWordsClickable();
}

function handleCommentaryClick(verseNum) {
    selectVerse(verseNum); 
    if (window.innerWidth <= 768) {
        document.getElementById("commentary-area").classList.add("show");
    } else {
        if(document.body.classList.contains('layout-100-0')) {
            applyLayout("layout-60-40");
        }
    }
}

function handleAnalysisClick(book, chapter, verse) {
    if (window.innerWidth <= 1024) {
        loadAnalysisToLeftPanel(book, chapter, verse);
    } else {
        if(document.body.classList.contains('layout-100-0')) {
            applyLayout("layout-60-40");
        }
        loadAnalysisToRightPanel(book, chapter, verse);
    }
}

async function loadAnalysisToLeftPanel(book, chapter, verse) {
    const panel = document.getElementById("analysis-panel");
    panel.classList.add("show");
    const contentDiv = document.getElementById("analysis-content");
    contentDiv.innerHTML = "<p style='padding:10px;'>원전 데이터를 분석 중입니다...</p>";
    await fetchAndRenderAnalysis(book, chapter, verse, contentDiv);
}

async function loadAnalysisToRightPanel(book, chapter, verse) {
    const panel = document.getElementById("commentary-area");
    panel.classList.add("show");
    const contentDiv = document.getElementById("commentary-display");
    contentDiv.innerHTML = "<p>원전 데이터를 분석 중입니다...</p>";
    closeEditor(); 
    await fetchAndRenderAnalysis(book, chapter, verse, contentDiv);
}

async function fetchAndRenderAnalysis(book, chapter, verse, targetElement) {
    try {
        const res = await fetch(`${AHPI_API_BASE_URL}/analysis/${book}/${chapter}/${verse}`);
        const data = await res.json();

        if (data.error) {
            targetElement.innerHTML = `<p style="color:red; font-weight:bold; padding:10px;">${data.error}</p>`;
            return;
        }

        if (data.length === 0) {
            targetElement.innerHTML = "<p style='padding:10px;'>분해 데이터가 없습니다.</p>";
            return;
        }

        const bookName = KOREAN_BOOK_NAMES[book] || book;
        // [수정] 헤더에 괄호 없이 '책 이름 장:절'만 표시
        let html = `<div class="analysis-header-line" style="margin:10px;">${bookName} ${chapter}:${verse}</div>
                    <div class="analysis-container" style="padding:10px;">`;

        data.forEach(item => {
            let rawText = item['btext'] || item['text'] || "";
            if (!rawText) {
                const ignoreKeys = ['book', 'chapter', 'id', 'verse'];
                for (const key in item) {
                    if (!ignoreKeys.includes(key.toLowerCase()) && typeof item[key] === 'string' && item[key].length > 5) {
                        rawText = item[key];
                        break; 
                    }
                }
            }
            const parsedHTML = parseAnalysisText(rawText);
            html += `<div class="analysis-block">${parsedHTML}</div>`;
        });

        html += `</div>`;
        targetElement.innerHTML = html;

    } catch (err) {
        targetElement.innerHTML = "<p style='color:red; padding:10px;'>서버 통신 오류</p>";
    }
}

function parseAnalysisText(text) {
    if (!text) return "";
    const chunks = text.split('*');
    let resultHtml = "";

    chunks.forEach(chunk => {
        if (!chunk.trim()) return;
        let processed = chunk;
        
        // [수정] 원전분해 원어 클릭 -> 사전 연결
        // 정규식으로 (기본 [H1234] ...) 패턴을 찾아서 코드 추출
        // 데이터 포맷: [원어] (기본 [코드] ...)
        const codeMatch = processed.match(/\(기본 \[(.*?)\]/); 
        const code = codeMatch ? codeMatch[1] : '';

        // 원어 단어 클릭 이벤트 추가
        processed = processed.replace(/\[(.*?)\]/, (match, word) => {
            if (code) {
                return `<span class="orig-word" onclick="openLexiconModal('${code}', '${word}')">${word}</span>`;
            } else {
                return `<span class="orig-word">${word}</span>`;
            }
        });

        processed = processed.replace(/#\s*(.*?)(?=$|<)/g, '<span class="meaning-text">$1</span>');
        processed = processed.replace(/@/g, '<br><span class="grammar-arrow">→</span> ');
        resultHtml += `<div class="analysis-word-item">${processed}</div>`;
    });
    return resultHtml;
}

// ... (나머지 renderOriginalText, showToast, history, openBookGrid 등 기존 로직 동일) ...
// (파일 용량 관계상 생략된 부분은 이전 코드와 동일합니다. 복붙 시 아래 부분은 기존 script.js 하단부와 같습니다)

function renderOriginalText(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    let html = "";
    words.forEach(word => {
        if (/[\u0590-\u05FF]/.test(word) || /[\u0370-\u03FF\u1F00-\u1FFF]/.test(word)) {
            const cleanData = word.replace(/['".,;:]/g, '');
            html += `<span class="hebrew-word" data-word="${cleanData}">${word}</span> `;
        } else {
            html += `${word} `;
        }
    });
    return html;
}

function showToast(msg) {
    const toast = document.getElementById("toast-message");
    toast.innerText = msg;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 1000);
}
function addToHistory(book, chapter) {
    if (historyIndex >= 0) { const curr = historyStack[historyIndex]; if (curr.book === book && curr.chapter === chapter) return; }
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push({ book, chapter });
    historyIndex++;
    updateHistoryButtons();
}
function goHistoryBack() {
    if (historyIndex > 0) { historyIndex--; isHistoryNavigating = true; loadChapter(historyStack[historyIndex].book, historyStack[historyIndex].chapter, false); updateHistoryButtons(); }
}
function goHistoryForward() {
    if (historyIndex < historyStack.length - 1) { historyIndex++; isHistoryNavigating = true; loadChapter(historyStack[historyIndex].book, historyStack[historyIndex].chapter, false); updateHistoryButtons(); }
}
function updateHistoryButtons() {
    document.getElementById("hist-back-btn").style.opacity = (historyIndex <= 0) ? "0.5" : "1";
    document.getElementById("hist-fwd-btn").style.opacity = (historyIndex >= historyStack.length - 1) ? "0.5" : "1";
}
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
        btn.onclick = () => { openChapterGrid(book); };
        grid.appendChild(btn);
    });
}
function openChapterGrid(book) {
    const modal = document.getElementById("chapter-nav-modal");
    const title = document.getElementById("chapter-modal-title");
    const grid = document.getElementById("chapter-grid");
    document.getElementById("nav-modal").style.display = "none";
    title.innerText = `${KOREAN_BOOK_NAMES[book]} - 장 선택`;
    modal.style.display = "flex";
    grid.innerHTML = "";
    const maxChapter = BIBLE_DATA[book] || 50;
    for (let i = 1; i <= maxChapter; i++) {
        const btn = document.createElement("div");
        btn.className = "grid-btn chapter-num";
        btn.innerText = i;
        if (book === currentBook && i === currentChapter) btn.classList.add("selected");
        btn.onclick = () => { document.getElementById("chapter-nav-modal").style.display = "none"; loadChapter(book, i, true); };
        grid.appendChild(btn);
    }
}
function updateNavUI() {
    document.getElementById("current-location").innerText = `${KOREAN_BOOK_NAMES[currentBook]} ${currentChapter}장`;
    const isNT = NT_BOOKS.includes(currentBook);
    if (isNT) { document.getElementById("btn-nt").classList.add("active"); document.getElementById("btn-ot").classList.remove("active"); } 
    else { document.getElementById("btn-ot").classList.add("active"); document.getElementById("btn-nt").classList.remove("active"); }
}
function renderTextWithStrongs(text, lang) {
    if (!text) return "";
    const parts = text.split(/(<[A-Z]{1,2}\d+>)/);
    let html = ""; let prevWord = "";
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.startsWith("<") && part.endsWith(">")) {
            let code = part.replace(/[<>]/g, ""); if(code.startsWith("W")) code = code.substring(1);
            if (prevWord.trim().length > 0) { html += `<span class="strong-word ${lang}" data-strong="${code}">${prevWord}</span>`; prevWord = ""; }
        } else { if (prevWord) html += prevWord; prevWord = part; }
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
        span.addEventListener('click', (e) => { e.stopPropagation(); });
    });
}

async function openLexiconModal(code, word) {
    if (window.innerWidth <= 1024) {
        loadLexiconToLeftPanel(code, word);
        return;
    }
    const modal = document.getElementById("lexicon-modal");
    const modalBody = document.getElementById("modal-body");
    modal.style.display = "flex"; modalBody.innerHTML = `<p>사전 찾는 중: ${code}...</p>`;
    await fetchAndRenderLexicon(code, word, modalBody);
}

async function loadLexiconToLeftPanel(code, word) {
    const panel = document.getElementById("lexicon-panel");
    panel.classList.add("show");
    const contentDiv = document.getElementById("lexicon-content");
    contentDiv.innerHTML = `<p style="padding:10px;">사전 찾는 중: ${code}...</p>`;
    await fetchAndRenderLexicon(code, word, contentDiv);
}

async function fetchAndRenderLexicon(code, word, targetElement) {
    try {
        const res = await fetch(`${AHPI_API_BASE_URL}/lexicon/${code}`);
        const data = await res.json();
        if (data.content && data.content !== "사전 데이터가 없습니다.") {
            let content = data.content;
            content = content.replace(/([^\s]+)\^/g, '<span class="lexicon-huge-word">$1</span>');
            content = content.replace(/\^/g, '');
            targetElement.innerHTML = `<div style="text-align:left; line-height:1.6; font-size:1rem; padding:10px;">${content}</div>`;
        } else {
            let link = code.startsWith('H') ? `https://biblehub.com/hebrew/${code.substring(1)}.htm` : `https://biblehub.com/greek/${code.substring(1)}.htm`;
            targetElement.innerHTML = `<p style="color:red; text-align:center; padding:10px;">사전 데이터 없음</p><div style="text-align:center; margin-top:15px;"><a href="${link}" target="_blank" style="padding:8px; background:#eee; border-radius:5px;">BibleHub에서 보기</a></div>`;
        }
    } catch (err) { targetElement.innerHTML = "<p style='padding:10px;'>통신 오류</p>"; }
}

function selectVerse(verseNum) {
    currentVerse = verseNum;
    document.querySelectorAll(".verse-item").forEach(el => el.classList.remove("selected"));
    const targetRow = document.getElementById(`verse-row-${verseNum}`);
    if (targetRow) {
        targetRow.classList.add("selected");
        if(verseNum === 1) targetRow.scrollIntoView({ block: "center" });
    }
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
    const btn = document.getElementById("save-btn");
    btn.innerText = "저장 중...";
    await fetch(`${AHPI_API_BASE_URL}/save_commentary`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ book: currentBook, chapter: currentChapter, verse: currentVerse, content: content })
    });
    alert("저장 완료");
    loadedChapterData.commentaries[currentVerse] = content;
    selectVerse(currentVerse);
    const row = document.getElementById(`verse-row-${currentVerse}`);
    if (row) {
        const icon = row.querySelector('.comm-icon');
        if (icon) icon.classList.add('has-content');
    }
    btn.innerText = "저장";
    closeEditor();
}
function goToNextChapter() {
    if(currentChapter < BIBLE_DATA[currentBook]) loadChapter(currentBook, currentChapter + 1, true);
    else {
        const idx = OT_BOOKS.concat(NT_BOOKS).indexOf(currentBook);
        if(idx < ALL_BOOKS.length-1) loadChapter(ALL_BOOKS[idx+1], 1, true);
    }
}
function goToPrevChapter() {
    if(currentChapter > 1) loadChapter(currentBook, currentChapter - 1, true);
    else {
        const idx = OT_BOOKS.concat(NT_BOOKS).indexOf(currentBook);
        if(idx > 0) loadChapter(ALL_BOOKS[idx-1], BIBLE_DATA[ALL_BOOKS[idx-1]], true);
    }
}
async function performSearch() {
    const q = document.getElementById("search-input").value;
    const lang = document.getElementById("search-lang").value;
    if(q.length<2) return alert("2글자 이상");
    const modal = document.getElementById("search-result-modal");
    const body = document.getElementById("search-results-body");
    body.innerHTML = "<div style='text-align:center; padding:20px;'>검색 중...</div>";
    modal.style.display = "flex";
    const res = await fetch(`${AHPI_API_BASE_URL}/search?q=${encodeURIComponent(q)}&lang=${lang}`);
    const data = await res.json();
    if(data.results?.length) {
        body.innerHTML = `<div style='margin-bottom:10px; font-weight:bold;'>총 ${data.count}건 발견</div>` + 
        data.results.map(item => 
            `<div class="search-item" onclick="window.goToSearchResult('${item.book}', ${item.chapter}, ${item.verse})">
                <div class="search-ref">${KOREAN_BOOK_NAMES[item.book] || item.book} ${item.chapter}:${item.verse}</div>
                <div class="search-text" ${lang==='heb'?'dir="rtl"':''}>${item.text.replace(new RegExp(q, "gi"), `<mark>${q}</mark>`)}</div>
            </div>`
        ).join("");
    } else body.innerHTML = "<div style='text-align:center; padding:20px;'>결과 없음</div>";
}
window.goToSearchResult = function(b, c, v) {
    document.getElementById("search-result-modal").style.display = "none";
    loadChapter(b, c, true);
};
const BOOK_INFO = KOREAN_BOOK_NAMES;