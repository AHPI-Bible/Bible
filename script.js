// Render 서버 주소
const AHPI_API_BASE_URL = "https://ahpi-bible-backend.onrender.com/api";

// 성경 데이터 (책 이름: 장 수)
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

// 한글 책 이름 매핑
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
    initSelectors(); 
    setupEventListeners();
    fetchChapter(currentBook, currentChapter);
});

// --- [수정됨] 절 선택창 관련 코드 삭제 ---
function initSelectors() {
    const otSelect = document.getElementById("ot-select");
    const ntSelect = document.getElementById("nt-select");

    OT_BOOKS.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = KOREAN_BOOK_NAMES[book] || book;
        otSelect.appendChild(option);
    });

    NT_BOOKS.forEach(book => {
        const option = document.createElement("option");
        option.value = book;
        option.innerText = KOREAN_BOOK_NAMES[book] || book;
        ntSelect.appendChild(option);
    });

    otSelect.value = "Genesis";
    updateChapterOptions("Genesis");
}

function setupEventListeners() {
    document.getElementById("modal-close-button").onclick = () => document.getElementById("lexicon-modal").style.display = "none";
    document.getElementById("search-close-button").onclick = () => document.getElementById("search-result-modal").style.display = "none";
    document.getElementById("prev-btn").onclick = goToPrevChapter;
    document.getElementById("next-btn").onclick = goToNextChapter;
    document.getElementById("go-btn").onclick = navigateManual;
    document.getElementById("search-btn").onclick = performSearch;
    document.getElementById("search-input").onkeypress = (e) => { if(e.key === 'Enter') performSearch(); };

    document.getElementById("ot-select").onchange = function() {
        document.getElementById("nt-select").value = ""; // 신약 초기화
        updateChapterOptions(this.value);
    };

    document.getElementById("nt-select").onchange = function() {
        document.getElementById("ot-select").value = ""; // 구약 초기화
        updateChapterOptions(this.value);
    };

    const editBtn = document.getElementById("edit-btn");
    const saveBtn = document.getElementById("save-btn");
    const cancelBtn = document.getElementById("cancel-btn");
    editBtn.onclick = openEditor;
    cancelBtn.onclick = closeEditor;
    saveBtn.onclick = saveCommentary;
}

function updateChapterOptions(bookName) {
    const sel = document.getElementById("chapter-select");
    sel.innerHTML = "";
    const max = BIBLE_DATA[bookName] || 50;
    
    for(let i=1; i<=max; i++) {
        const opt = document.createElement("option");
        opt.value = i; opt.innerText = i;
        sel.appendChild(opt);
    }
    sel.value = 1; // 1장으로 리셋
}

// --- [수정됨] 절 선택 로직 제거 ---
function navigateManual() {
    const otVal = document.getElementById("ot-select").value;
    const ntVal = document.getElementById("nt-select").value;
    
    // 둘 중 값이 있는 것을 선택
    const book = otVal || ntVal || currentBook;
    const chapter = parseInt(document.getElementById("chapter-select").value);
    
    fetchChapter(book, chapter);
}

// --- [수정됨] UI 업데이트 (절 관련 제거) ---
function updateNavUI() {
    const isNT = NT_BOOKS.includes(currentBook);
    
    if (isNT) {
        document.getElementById("nt-select").value = currentBook;
        document.getElementById("ot-select").value = "";
        
        // 시각 효과
        document.getElementById("nt-select").classList.add("active");
        document.getElementById("nt-select").classList.remove("inactive");
        document.getElementById("ot-select").classList.add("inactive");
        document.getElementById("ot-select").classList.remove("active");
    } else {
        document.getElementById("ot-select").value = currentBook;
        document.getElementById("nt-select").value = "";
        
        // 시각 효과
        document.getElementById("ot-select").classList.add("active");
        document.getElementById("ot-select").classList.remove("inactive");
        document.getElementById("nt-select").classList.add("inactive");
        document.getElementById("nt-select").classList.remove("active");
    }

    if (document.getElementById("chapter-select").options.length < currentChapter) {
        updateChapterOptions(currentBook);
    }
    document.getElementById("chapter-select").value = currentChapter;
}

// --- 데이터 로드 ---
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

        // 영어 데이터 배열 처리
        if (!Array.isArray(loadedChapterData.english)) {
             let engArr = [];
             for(let i=1; i<=maxVerse; i++) {
                 engArr.push(loadedChapterData.english[i] || "");
             }
             loadedChapterData.english = engArr;
        }

        renderBibleList(maxVerse);
        selectVerse(1); // 1절 자동 선택

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
        
        // 원어 단어 처리
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

// --- 영어 스트롱 코드 파싱 ---
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

// --- 원어 단어 클릭 ---
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