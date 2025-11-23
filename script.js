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

document.addEventListener("DOMContentLoaded", function() {
    setupEventListeners();
    fetchChapter(currentBook, currentChapter);
});

function setupEventListeners() {
    // 닫기 버튼들
    document.getElementById("lexicon-close").onclick = () => document.getElementById("lexicon-modal").style.display = "none";
    document.getElementById("search-close").onclick = () => document.getElementById("search-result-modal").style.display = "none";
    document.getElementById("book-nav-close").onclick = () => document.getElementById("book-nav-modal").style.display = "none";
    document.getElementById("chapter-nav-close").onclick = () => document.getElementById("chapter-nav-modal").style.display = "none";

    // 내비게이션 버튼
    document.getElementById("prev-btn").onclick = goToPrevChapter;
    document.getElementById("next-btn").onclick = goToNextChapter;
    document.getElementById("go-btn").onclick = navigateManual; // (이젠 거의 안쓰지만 유지)
    
    document.getElementById("search-btn").onclick = performSearch;
    document.getElementById("search-input").onkeypress = (e) => { if(e.key === 'Enter') performSearch(); };

    // [NEW] 트리거 버튼 (책 선택 / 장 선택)
    document.getElementById("book-trigger").onclick = () => openBookModal();
    document.getElementById("chapter-trigger").onclick = () => openChapterModal();

    // [NEW] 구약/신약 탭 버튼
    document.getElementById("tab-ot").onclick = () => renderBookGrid("OT");
    document.getElementById("tab-nt").onclick = () => renderBookGrid("NT");

    // 에디터
    document.getElementById("edit-btn").onclick = openEditor;
    document.getElementById("cancel-btn").onclick = closeEditor;
    document.getElementById("save-btn").onclick = saveCommentary;
}

// --- [UI] 책 선택 팝업 ---
function openBookModal() {
    const modal = document.getElementById("book-nav-modal");
    modal.style.display = "flex";
    // 현재 책이 구약이면 구약 탭, 신약이면 신약 탭 열기
    if (NT_BOOKS.includes(currentBook)) {
        renderBookGrid("NT");
    } else {
        renderBookGrid("OT");
    }
}

function renderBookGrid(type) {
    const grid = document.getElementById("book-grid");
    const tabOt = document.getElementById("tab-ot");
    const tabNt = document.getElementById("tab-nt");
    
    grid.innerHTML = "";
    
    // 탭 활성화 스타일
    if (type === "OT") {
        tabOt.classList.add("active");
        tabNt.classList.remove("active");
        books = OT_BOOKS;
    } else {
        tabNt.classList.add("active");
        tabOt.classList.remove("active");
        books = NT_BOOKS;
    }

    // 버튼 생성
    books.forEach(book => {
        const btn = document.createElement("div");
        btn.className = "grid-btn";
        btn.innerText = KOREAN_BOOK_NAMES[book] || book;
        if (book === currentBook) btn.classList.add("selected");
        
        btn.onclick = () => {
            // 책 선택 -> 바로 장 선택 팝업으로 이동
            currentBook = book;
            document.getElementById("book-nav-modal").style.display = "none";
            updateNavUI(); // 버튼 글자 업데이트
            openChapterModal(); // 장 선택 열기
        };
        grid.appendChild(btn);
    });
}

// --- [UI] 장 선택 팝업 ---
function openChapterModal() {
    const modal = document.getElementById("chapter-nav-modal");
    const title = document.getElementById("chapter-modal-title");
    const grid = document.getElementById("chapter-grid");
    
    title.innerText = `${KOREAN_BOOK_NAMES[currentBook]} - 장 선택`;
    modal.style.display = "flex";
    grid.innerHTML = "";

    const maxChapter = BIBLE_DATA[currentBook] || 50;

    for (let i = 1; i <= maxChapter; i++) {
        const btn = document.createElement("div");
        btn.className = "grid-btn";
        btn.innerText = i;
        if (i === currentChapter) btn.classList.add("selected");
        
        btn.onclick = () => {
            // 장 선택 -> 데이터 로드
            currentChapter = i;
            document.getElementById("chapter-nav-modal").style.display = "none";
            fetchChapter(currentBook, currentChapter);
        };
        grid.appendChild(btn);
    }
}

// --- [UI] 버튼 텍스트 업데이트 ---
function updateNavUI() {
    document.getElementById("book-trigger").innerText = `${KOREAN_BOOK_NAMES[currentBook]} ▾`;
    document.getElementById("chapter-trigger").innerText = `${currentChapter}장 ▾`;
}

// ... (이하 기존 fetchChapter, renderBibleList 등 데이터 로직은 100% 동일) ...
// 아래는 기존 코드에서 navigateManual만 수정하고 나머지는 유지

function navigateManual() {
    fetchChapter(currentBook, currentChapter); // 그냥 새로고침 역할
}

async function fetchChapter(book, chapter) {
    currentBook = book;
    currentChapter = chapter;
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
        if (isNT) {
            loadedChapterData.original = ahpiData.greek_verses || {};
        } else {
            loadedChapterData.original = ahpiData.hebrew_verses || {};
        }

        const maxVerse = Math.max(
            Object.keys(loadedChapterData.korean).length,
            Object.keys(loadedChapterData.english).length
        );

        renderBibleList(maxVerse);
        selectVerse(1);

    } catch (error) {
        console.error(error);
        bibleList.innerHTML = "<p style='color:red'>데이터를 가져오지 못했습니다.</p>";
    }
}

function renderBibleList(maxVerse) {
    const list = document.getElementById("bible-list");
    list.innerHTML = "";

    if (maxVerse === 0) {
        list.innerHTML = "<p>본문이 없습니다.</p>";
        return;
    }

    for (let i = 1; i <= maxVerse; i++) {
        const div = document.createElement("div");
        div.className = "verse-item";
        div.id = `verse-row-${i}`; 
        div.onclick = () => selectVerse(i); 

        const kor = loadedChapterData.korean[i] || "";
        let eng = "";
        if (Array.isArray(loadedChapterData.english)) {
            eng = loadedChapterData.english[i-1] || "";
        } else {
            eng = loadedChapterData.english[i] || "";
        }
        const engHtml = renderEnglishWithStrongs(eng);
        const ori = loadedChapterData.original[i-1] || "";

        let html = `<span class="verse-num">${i}.</span>`;
        html += `<span class="korean-text">${kor}</span>`;
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
    
    makeHebrewWordsClickable();
    makeEnglishWordsClickable(); 
}

function renderEnglishWithStrongs(text) {
    if (!text) return "";
    const parts = text.split(/\s+/);
    let resultHtml = "";
    let currentWord = "";
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const match = part.match(/[<{]([HG]\d+)[>}]/);
        
        if (match) {
            const strongCode = match[1]; 
            if (currentWord) {
                resultHtml += `<span class="eng-strong-word" data-strong="${strongCode}">${currentWord}</span> `;
                currentWord = ""; 
            }
        } else {
            if (currentWord) resultHtml += `${currentWord} `;
            currentWord = part;
        }
    }
    if (currentWord) resultHtml += `${currentWord}`;
    return resultHtml;
}

function makeEnglishWordsClickable() {
    document.querySelectorAll('.eng-strong-word').forEach(span => {
        span.addEventListener('click', handleEnglishClick);
        span.style.cursor = "pointer";
        span.style.textDecoration = "underline";
        span.style.textDecorationColor = "#ccc";
    });
}

async function handleEnglishClick(event) {
    const strongCode = event.target.dataset.strong; 
    const word = event.target.innerText;
    
    const modal = document.getElementById("lexicon-modal");
    const modalBody = document.getElementById("modal-body");
    modal.style.display = "flex"; 
    modalBody.innerHTML = `<p>검색 중: ${strongCode}...</p>`;

    let html = `<h3 style="font-size:1.8rem; color:#007bff;">${word} (${strongCode})</h3>`;
    let link = "";
    if (strongCode.startsWith("H")) { 
        const num = strongCode.substring(1); 
        link = `https://biblehub.com/hebrew/${num}.htm`;
        html += `<p>히브리어 사전으로 연결됩니다.</p>`;
    } else { 
        const num = strongCode.substring(1);
        link = `https://biblehub.com/greek/${num}.htm`;
        html += `<p>헬라어 사전으로 연결됩니다.</p>`;
    }
    
    html += `<div style="margin-top:20px;">
                <a href="${link}" target="_blank" 
                   style="padding:12px; background:#f1f3f5; border-radius:8px; text-decoration:none; color:#333; font-weight:bold; border:1px solid #ddd; display:block; text-align:center;">
                   📘 BibleHub 사전 보기 ↗
                </a>
             </div>`;
    modalBody.innerHTML = html;
}

function makeHebrewWordsClickable() {
    document.querySelectorAll('.hebrew-word').forEach(span => {
        span.addEventListener('click', handleWordClick);
    });
}

async function handleWordClick(event) {
    const rawWord = event.target.dataset.word;
    const modal = document.getElementById("lexicon-modal");
    const modalBody = document.getElementById("modal-body");
    modal.style.display = "flex"; 
    modalBody.innerHTML = `<p>검색 중: ${rawWord}</p>`;

    const isHebrew = /[\u0590-\u05FF]/.test(rawWord);
    const cleanWord = isHebrew ? rawWord.replace(/[\u0591-\u05C7]/g, '') : rawWord.replace(/[.,;·]/g, '');

    let html = `<h3 style="font-size:1.8rem; text-align:center; color:#007bff;">${rawWord}</h3>`;
    
    html += `<div style="display:flex; gap:10px; justify-content:center; margin-bottom:20px;">`;
    if (isHebrew) {
        html += `<a href="https://dict.naver.com/heko/#/search?query=${cleanWord}" target="_blank" style="padding:8px 15px; background:#03C75A; color:white; border-radius:5px; text-decoration:none;">네이버 히브리어</a>`;
        html += `<a href="https://biblehub.com/hebrew/${cleanWord}.htm" target="_blank" style="padding:8px 15px; background:#004085; color:white; border-radius:5px; text-decoration:none;">Bible Hub</a>`;
    } else {
        html += `<a href="https://dict.naver.com/grko/#/search?query=${cleanWord}" target="_blank" style="padding:8px 15px; background:#03C75A; color:white; border-radius:5px; text-decoration:none;">네이버 헬라어</a>`;
        html += `<a href="https://biblehub.com/greek/${cleanWord}.htm" target="_blank" style="padding:8px 15px; background:#004085; color:white; border-radius:5px; text-decoration:none;">Bible Hub</a>`;
    }
    html += `</div>`;

    if (isHebrew) {
        try {
            const res = await fetch(`https://www.sefaria.org/api/words/${cleanWord}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    html += `<div style="text-align:left; background:#f8f9fa; padding:10px;"><strong>Sefaria:</strong><br>`;
                    data.forEach((entry, idx) => {
                        if (idx > 2) return;
                        if(entry.senses) {
                            entry.senses.forEach(s => { if(s.definition) html += `- ${s.definition}<br>`; });
                        }
                    });
                    html += `</div>`;
                }
            }
        } catch(e) {}
    }
    modalBody.innerHTML = html;
}

function selectVerse(verseNum) {
    currentVerse = verseNum;
    document.querySelectorAll(".verse-item").forEach(el => el.classList.remove("selected"));
    const targetRow = document.getElementById(`verse-row-${verseNum}`);
    if (targetRow) {
        targetRow.classList.add("selected");
        targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    document.getElementById("current-verse-display").innerText = `${KOREAN_BOOK_NAMES[currentBook]||currentBook} ${currentChapter}:${verseNum}`;
    const comment = loadedChapterData.commentaries[verseNum];
    document.getElementById("commentary-display").innerText = comment ? comment : "작성된 주해가 없습니다.";
    closeEditor();
}

function openEditor() {
    const displayDiv = document.getElementById("commentary-display");
    const input = document.getElementById("commentary-input");
    input.value = displayDiv.innerText === "작성된 주해가 없습니다." ? "" : displayDiv.innerText;
    document.getElementById("commentary-display").style.display = "none";
    document.getElementById("edit-btn").style.display = "none";
    document.getElementById("editor-container").style.display = "block";
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
    try {
        const res = await fetch(`${AHPI_API_BASE_URL}/save_commentary`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ book: currentBook, chapter: currentChapter, verse: currentVerse, content: content })
        });
        if (res.ok) {
            alert("저장 완료");
            loadedChapterData.commentaries[currentVerse] = content;
            selectVerse(currentVerse); 
        } else alert("저장 실패");
    } catch(e) { alert("오류"); }
    finally { btn.innerText = "저장"; }
}
function goToNextChapter() {
    if(currentChapter < BIBLE_DATA[currentBook]) fetchChapter(currentBook, currentChapter + 1);
    else {
        const idx = BOOK_NAMES.indexOf(currentBook);
        if(idx < BOOK_NAMES.length-1) fetchChapter(BOOK_NAMES[idx+1], 1);
    }
}
function goToPrevChapter() {
    if(currentChapter > 1) fetchChapter(currentBook, currentChapter - 1);
    else {
        const idx = BOOK_NAMES.indexOf(currentBook);
        if(idx > 0) fetchChapter(BOOK_NAMES[idx-1], BIBLE_DATA[BOOK_NAMES[idx-1]]);
    }
}
async function performSearch() {
    const q = document.getElementById("search-input").value;
    if(q.length<2) return alert("2글자 이상");
    const modal = document.getElementById("search-result-modal");
    const body = document.getElementById("search-results-body");
    body.innerHTML = "검색 중...";
    modal.style.display = "flex";
    const res = await fetch(`${AHPI_API_BASE_URL}/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if(data.results?.length) {
        body.innerHTML = data.results.map(item => 
            `<div class="search-item" onclick="goToSearchResult('${item.book}', ${item.chapter}, ${item.verse})">
                <div class="search-ref">${KOREAN_BOOK_NAMES[item.book] || item.book} ${item.chapter}:${item.verse}</div>
                <div class="search-text">${item.text}</div>
            </div>`
        ).join("");
    } else body.innerHTML = "결과 없음";
}
window.goToSearchResult = function(b, c, v) {
    document.getElementById("search-result-modal").style.display = "none";
    currentVerse = v; 
    fetchChapter(b, c);
};