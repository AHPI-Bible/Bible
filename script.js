// Render 서버 주소
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
    initSelectors(); 
    setupEventListeners();
    fetchChapter(currentBook, currentChapter);
});

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
        document.getElementById("nt-select").value = "";
        updateChapterOptions(this.value);
    };
    document.getElementById("nt-select").onchange = function() {
        document.getElementById("ot-select").value = "";
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
    sel.value = 1;
}

function updateNavUI() {
    const isNT = NT_BOOKS.includes(currentBook);
    if (isNT) {
        document.getElementById("nt-select").value = currentBook;
        document.getElementById("nt-select").classList.add("active");
        document.getElementById("nt-select").classList.remove("inactive");
        
        document.getElementById("ot-select").value = "";
        document.getElementById("ot-select").classList.add("inactive");
        document.getElementById("ot-select").classList.remove("active");
    } else {
        document.getElementById("ot-select").value = currentBook;
        document.getElementById("ot-select").classList.add("active");
        document.getElementById("ot-select").classList.remove("inactive");
        
        document.getElementById("nt-select").value = "";
        document.getElementById("nt-select").classList.add("inactive");
        document.getElementById("nt-select").classList.remove("active");
    }

    if (document.getElementById("chapter-select").options.length < currentChapter) {
        updateChapterOptions(currentBook);
    }
    document.getElementById("chapter-select").value = currentChapter;
}

function navigateManual() {
    const otVal = document.getElementById("ot-select").value;
    const ntVal = document.getElementById("nt-select").value;
    const book = otVal || ntVal || currentBook;
    const chapter = parseInt(document.getElementById("chapter-select").value);
    fetchChapter(book, chapter);
}

// --- 챕터 로드 ---
async function fetchChapter(book, chapter) {
    currentBook = book;
    currentChapter = chapter;
    currentVerse = 1; 
    updateNavUI();

    const bibleList = document.getElementById("bible-list");
    bibleList.innerHTML = "<p>데이터를 불러오는 중입니다...</p>";
    
    // 오직 우리 서버만 호출 (모든 데이터가 여기 있음)
    const url = `${AHPI_API_BASE_URL}/get_chapter_data/${book}/${chapter}`;
    
    try {
        const res = await fetch(url);
        if(!res.ok) throw new Error("서버 응답 실패");
        
        const ahpiData = await res.json();
        
        // 데이터 저장
        loadedChapterData.korean = ahpiData.korean_verses || {};
        loadedChapterData.english = ahpiData.english_verses || {};
        loadedChapterData.commentaries = ahpiData.commentaries || {};
        
        // 원어 선택
        const isNT = NT_BOOKS.includes(book);
        if (isNT) {
            loadedChapterData.original = ahpiData.greek_verses || {};
        } else {
            loadedChapterData.original = ahpiData.hebrew_verses || {};
        }

        // 최대 절 수 계산
        const maxVerse = Math.max(
            Object.keys(loadedChapterData.korean).length,
            Object.keys(loadedChapterData.english).length
        );

        renderBibleList(maxVerse);
        selectVerse(1);

    } catch (error) {
        console.error(error);
        bibleList.innerHTML = "<p style='color:red'>데이터를 가져오지 못했습니다. (API 서버 업데이트 필요)</p>";
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

        // 데이터가 문자열로 들어옴
        const kor = loadedChapterData.korean[i] || "";
        const eng = loadedChapterData.english[i] || "";
        const ori = loadedChapterData.original[i] || "";

        let html = `<span class="verse-num">${i}.</span>`;
        html += `<span class="korean-text">${kor}</span>`;
        html += `<span class="english-text">${eng}</span>`;
        
        // 원어 단어 처리
        const oriWords = ori.split(/\s+/).filter(w => w.length > 0);
        let oriHtml = "";
        oriWords.forEach(word => {
            if (/[\u0590-\u05FF]/.test(word) || /[\u0370-\u03FF\u1F00-\u1FFF]/.