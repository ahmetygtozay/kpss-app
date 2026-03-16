// app.js - PostgreSQL API Entegrasyonlu Tam Sürüm

// Backend API adresiniz (Lokalde çalışırken bu adresi, sunucuya çıktığınızda gerçek URL'i kullanın)
const API_URL = "http://localhost:3000/api";

let currentLesson = "";
let cropper;
let isScanFilterActive = false;
let finalImageData = null;

let allQuestions = [];
let currentPage = 1;
const QUESTIONS_PER_PAGE = 50;

let touchStartX = 0;
let touchEndX = 0;

const topics = {
    turkce: ["Ses Bilgisi", "Yazım Kuralları", "Noktalama İşaretleri", "Sözcükte Yapı", "İsim-Sıfat-Zamir", "Tamlamalar ve Zarf", "Edat-Bağlaç-Ünlem", "Fiil Çekimi - Ek Fiil", "Fiilimsi", "Fiilde Yapı ve Çatı", "Söz Grupları ve Öbekleri", "Cümlenin Ögeleri", "Cümle Türleri", "Anlatım Bozuklukları"],
    matematik: ["Temel Matematik", "Problemler", "Permütasyon - Kombinasyon ve Olasılık", "Geometri", "Analitik Geometri"],
    tarih: ["İslamiyet Öncesi", "Türk-İslam Tarihi", "Anadolu Selçuklu", "Osmanlı Kültür", "Osmanlı Kuruluş", "Osmanlı Yükselme", "Osmanlı Duraklama", "Osmanlı Gerileme", "Osmanlı Dağılma", "20. yy Osmanlı", "I.Dünya Savaşı", "Kurtuluş Savaşı Hazırlık", "I.TBMM ve Cepheler", "Atatürk İlke ve İnkılapları", "Dış Politika", "Çağdaş Türk ve Dünya"],
    cografya: ["Coğrafi Konum", "Yer Şekilleri", "İklim", "Su, Toprak, Bitki", "Nüfus ve Göç", "Ekonomik Coğrafya", "Bölgeler"],
    vatandaslik: ["Temel Hukuk", "Devlet Yapıları", "Anayasa Tarihi", "Temel Haklar", "Yasama", "Yürütme", "Yargı", "İdare Hukuku"],
    guncel: ["Güncel Bilgiler"]
};

// Sayfa Başlatma
function openLesson(lesson) {
    currentLesson = lesson;
    currentPage = 1;
    clearForm();

    document.getElementById("mainPage").classList.add("hidden");
    document.getElementById("lessonPage").classList.remove("hidden");

    loadTopics();
    loadQuestions(); // Verileri API'den çeker
    setupSwipe();
}

function goBack() {
    document.getElementById("lessonPage").classList.add("hidden");
    document.getElementById("mainPage").classList.remove("hidden");
}

function loadTopics() {
    const topicInput = document.getElementById("topicInput");
    const filterTopic = document.getElementById("filterTopic");

    topicInput.innerHTML = "";
    filterTopic.innerHTML = '<option value="">Tüm Konular</option>';

    topics[currentLesson].forEach(t => {
        topicInput.add(new Option(t, t));
        filterTopic.add(new Option(t, t));
    });
}

// Görsel İşlemleri (Cropper.js)
function previewImage(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = e => openEditor(e.target.result);
    reader.readAsDataURL(input.files[0]);
}

function openEditor(src) {
    document.getElementById("editorModal").classList.remove("hidden");
    const img = document.getElementById("editorImage");
    img.src = src;
    if (cropper) cropper.destroy();
    cropper = new Cropper(img, { viewMode: 1, autoCropArea: 1 });
}

function rotateLeft() { cropper.rotate(-90); }
function rotateRight() { cropper.rotate(90); }

function toggleScanFilter() {
    isScanFilterActive = !isScanFilterActive;
    document.getElementById("scanFilterBtn").classList.toggle("active");
}

function applyEdits() {
    let canvas = cropper.getCroppedCanvas({ maxWidth: 800 });
    if (isScanFilterActive) {
        let ctx = canvas.getContext("2d");
        let img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let d = img.data;
        for (let i = 0; i < d.length; i += 4) {
            let avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
            let v = avg > 130 ? 255 : avg < 80 ? 0 : avg;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        ctx.putImageData(img, 0, 0);
    }
    finalImageData = canvas.toDataURL("image/jpeg", 0.6);
    document.getElementById("imagePreview").src = finalImageData;
    document.getElementById("imagePreviewContainer").classList.remove("hidden");
    closeEditor();
}

function closeEditor() {
    document.getElementById("editorModal").classList.add("hidden");
    if (cropper) cropper.destroy();
}

// --- API İşlemleri (PostgreSQL Verileri) ---

async function addQuestion() {
    let topic = document.getElementById("topicInput").value;
    let answer = document.getElementById("answerInput").value;
    let hard = document.getElementById("hardInput").checked;

    if (!finalImageData) return alert("Resim ekleyin");

    try {
        const response = await fetch(`${API_URL}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lesson: currentLesson,
                topic,
                answer,
                image: finalImageData,
                hard
            })
        });

        if (response.ok) {
            loadQuestions();
            clearForm();
        }
    } catch (err) {
        console.error("Ekleme hatası:", err);
    }
}

async function loadQuestions() {
    let selTopic = document.getElementById("filterTopic").value;
    let onlyHard = document.getElementById("filterHard").checked;

    try {
        const response = await fetch(`${API_URL}/questions/${currentLesson}`);
        const data = await response.json();

        allQuestions = data.filter(q => {
            if (selTopic && q.topic !== selTopic) return false;
            if (onlyHard && !q.hard) return false;
            return true;
        });

        renderPage();
    } catch (err) {
        console.error("Veri çekme hatası:", err);
    }
}

async function toggleHard(id) {
    const q = allQuestions.find(item => item.id === id);
    if (!q) return;

    q.hard = !q.hard;

    try {
        await fetch(`${API_URL}/questions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(q)
        });
        loadQuestions();
    } catch (err) {
        console.error("Güncelleme hatası:", err);
    }
}

async function deleteQuestion(id) {
    if (!confirm("Silmek istiyor musunuz?")) return;

    try {
        const response = await fetch(`${API_URL}/questions/${id}`, { method: 'DELETE' });
        if (response.ok) loadQuestions();
    } catch (err) {
        console.error("Silme hatası:", err);
    }
}

function editQuestion(id) {
    const q = allQuestions.find(item => item.id === id);
    if (!q) return;

    document.getElementById("answerInput").value = q.answer;
    document.getElementById("topicInput").value = q.topic;
    document.getElementById("hardInput").checked = q.hard;
    document.getElementById("imagePreview").src = q.image;
    document.getElementById("imagePreviewContainer").classList.remove("hidden");
    
    finalImageData = q.image;
    let btn = document.getElementById("mainActionBtn");
    btn.textContent = "Güncelle";
    btn.onclick = () => updateQuestion(id);
}

async function updateQuestion(id) {
    let topic = document.getElementById("topicInput").value;
    let answer = document.getElementById("answerInput").value;
    let hard = document.getElementById("hardInput").checked;

    try {
        await fetch(`${API_URL}/questions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, answer, hard, image: finalImageData })
        });
        loadQuestions();
        clearForm();
    } catch (err) {
        console.error("Güncelleme hatası:", err);
    }
}

async function openStats() {
    document.getElementById("mainPage").classList.add("hidden");
    document.getElementById("statsPage").classList.remove("hidden");
    let content = document.getElementById("statsContent");
    content.innerHTML = '<div class="card-header"><h3>Soru Dağılımı</h3></div>';

    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();
        
        const iconMap = { turkce: '📚', matematik: '🧮', tarih: '📜', cografya: '🌍', vatandaslik: '⚖️', guncel: '📰' };

        if (stats.length === 0) {
            content.innerHTML += "<p>Henüz veri yok.</p>";
            return;
        }

        stats.forEach(s => {
            content.innerHTML += `
                <p>
                    <strong>${iconMap[s.lesson] || '📝'} ${s.lesson.toUpperCase()}</strong>
                    <span>${s.count} Soru</span>
                </p>`;
        });
    } catch (err) {
        console.error("İstatistik hatası:", err);
    }
}

function closeStats() {
    document.getElementById("statsPage").classList.add("hidden");
    document.getElementById("mainPage").classList.remove("hidden");
}

// UI ve Render Fonksiyonları
function renderPage() {
    let list = document.getElementById("questionList");
    list.innerHTML = "";
    let start = (currentPage - 1) * QUESTIONS_PER_PAGE;
    let pageItems = allQuestions.slice(start, start + QUESTIONS_PER_PAGE);

    pageItems.forEach(q => {
        let div = document.createElement("div");
        div.className = "questionCard";
        div.innerHTML = `
            <img src="${q.image}" onclick="enlargeImage('${q.image}')">
            <div class="star ${q.hard ? 'active' : ''}" onclick="toggleHard(${q.id})">⭐</div>
            <div class="answer" onclick="this.classList.toggle('show')">${q.answer || "Not Yok"}</div>
            <div class="cardButtons">
                <button class="editBtn" onclick="editQuestion(${q.id})">Düzenle</button>
                <button class="deleteBtn" onclick="deleteQuestion(${q.id})">Sil</button>
            </div>
        `;
        list.appendChild(div);
    });
    updatePagination();
}

function updatePagination() {
    let totalPages = Math.ceil(allQuestions.length / QUESTIONS_PER_PAGE) || 1;
    document.getElementById("pageInfo").innerText = `${currentPage} / ${totalPages}`;
}

function nextPage() {
    let totalPages = Math.ceil(allQuestions.length / QUESTIONS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderPage();
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
    }
}

function setupSwipe() {
    const area = document.getElementById("questionList");
    area.addEventListener("touchstart", e => { touchStartX = e.changedTouches[0].screenX; });
    area.addEventListener("touchend", e => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 60) nextPage();
        if (touchEndX - touchStartX > 60) prevPage();
    });
}

function clearForm() {
    document.getElementById("answerInput").value = "";
    document.getElementById("imageInput").value = "";
    document.getElementById("hardInput").checked = false;
    document.getElementById("imagePreviewContainer").classList.add("hidden");
    finalImageData = null;
    let btn = document.getElementById("mainActionBtn");
    btn.textContent = "Soruyu Kaydet";
    btn.onclick = addQuestion;
}

function enlargeImage(src) {
    let m = document.createElement("div");
    Object.assign(m.style, {
        position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
        background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 4000
    });
    m.innerHTML = `<img src="${src}" style="max-width:98%;max-height:98%;border-radius:12px;">`;
    m.onclick = () => document.body.removeChild(m);
    document.body.appendChild(m);
}

// Service Worker Kaydı
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
}