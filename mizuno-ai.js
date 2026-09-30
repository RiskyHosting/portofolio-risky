(function () {
  'use strict';

  /* ==========================================================
     CONFIG
     ========================================================== */
  var API_BASE_URL = 'https://api-faa.my.id/faa/ai-promt';

  var HISTORY_KEY  = 'mizuno_history_v1';
  var MAX_HISTORY  = 16;
  var ROBOT_SCALE  = 0.72;

  /* ==========================================================
     GELEMBUNG TEKS SINGKAT (TANPA EMOJI, PERSUASIF & RANDOM)
     ========================================================== */
  var PHRASES_ID = [
    'Pencet aku dong!',
    'Klik aku buat ngobrol!',
    'Mau tanya soal Risky?',
    'Mizuno di sini! Sini chat!',
    'Klik aku, jangan cuma liat!',
    'Mau liat proyek Risky?',
    'Tanya skill Risky ke aku!',
    'Psst... Klik aku sebentar!',
    'Bosan melayang, ayo ngobrol!',
    'Cari developer? Tanya aku!',
    'Ayo kenalan sama Mizuno!',
    'Risky lagi ngoding nih...',
    'Klik di sini ya!',
    'Butuh kontak Risky? Klik!'
  ];

  var PHRASES_EN = [
    'Click me to chat!',
    'Click here! Let\'s talk!',
    'Ask me about Risky!',
    'Don\'t just watch, click me!',
    'Need Risky\'s contact? Click!',
    'Let\'s chat for a bit!'
  ];

  /* ==========================================================
     INJECTED STYLE (UKURAN BUBBLE DIPERBESAR & DIPERJELEAS)
     ========================================================== */
  (function injectStyle() {
    var s = document.createElement('style');
    s.textContent = [
      '#mizuno-bot { transform-origin: top left !important; }',
      '#mizuno-bubble {',
      '  font-size: 13px !important;',
      '  font-weight: 600 !important;',
      '  line-height: 1.3 !important;',
      '  padding: 8px 12px !important;',
      '  background: #0E1A22 !important;',
      '  color: #F2F6F8 !important;',
      '  border: 1px solid rgba(39, 174, 210, 0.4) !important;',
      '  border-radius: 10px !important;',
      '  box-shadow: 0 4px 14px rgba(0,0,0,0.3) !important;',
      '  white-space: nowrap !important;',
      '  z-index: 9999 !important;',
      '}',
      '#mizuno-chat {',
      '  top: 50% !important;',
      '  left: 50% !important;',
      '  right: auto !important;',
      '  bottom: auto !important;',
      '  margin: 0 !important;',
      '  transform: translate(-50%, calc(-50% + 14px)) scale(.96) !important;',
      '  opacity: 0;',
      '  transition: transform .28s cubic-bezier(.2,.9,.2,1), opacity .28s ease !important;',
      '}',
      '#mizuno-chat.open {',
      '  transform: translate(-50%, -50%) scale(1) !important;',
      '  opacity: 1;',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  })();

  /* ==========================================================
     ELEMEN
     ========================================================== */
  var bot      = document.getElementById('mizuno-bot');
  var wrapper  = document.getElementById('mizuno-wrapper');
  var eyes     = document.getElementById('mizuno-eyes');
  var bubble   = document.getElementById('mizuno-bubble');
  var chat     = document.getElementById('mizuno-chat');
  var backdrop = document.getElementById('mizuno-chat-backdrop');
  var history  = document.getElementById('mizuno-chat-history');
  var input    = document.getElementById('mizuno-chat-input');
  var sendBtn  = document.getElementById('mizuno-send-btn');
  var closeBtn = document.getElementById('mizuno-chat-close');

  if (!bot || !chat) return;

  var isMobile = window.innerWidth < 768;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     POSISI & FISIKA
     ========================================================== */
  var pos    = { x: window.innerWidth - 130, y: window.innerHeight - 180 };
  var target = { x: pos.x, y: pos.y };
  var lerp   = 0.03;

  /* ==========================================================
     DRAGGING
     ========================================================== */
  var isDragging = false;
  var dragOffset = { x: 0, y: 0 };
  var mouseDown  = { x: 0, y: 0 };
  var DRAG_THRESHOLD = 5;
  var isOpen = false;

  /* ==========================================================
     CONVERSATION HISTORY
     ========================================================== */
  var conversation = [];
  try {
    var saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      var parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) conversation = parsed;
    }
  } catch (e) { conversation = []; }

  function saveConversation() {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(conversation)); } catch (e) {}
  }

  /* ==========================================================
     BLINK & SLEEPY
     ========================================================== */
  var blinkTimer = null;
  function scheduleBlink() {
    if (reduceMotion) return;
    blinkTimer = setTimeout(function () {
      if (wrapper) wrapper.classList.add('blink');
      setTimeout(function () { if (wrapper) wrapper.classList.remove('blink'); }, 130);
      scheduleBlink();
    }, 2800 + Math.random() * 3600);
  }
  scheduleBlink();

  function updateSleepy() {
    var h = new Date().getHours();
    if (wrapper) wrapper.classList.toggle('sleepy', h >= 22 || h < 6);
  }
  updateSleepy();
  setInterval(updateSleepy, 60000);

  /* ==========================================================
     POSITION — translate + scale
     ========================================================== */
  function updateTransform() {
    if (bot) {
      bot.style.transform =
        'translate3d(' + pos.x + 'px,' + pos.y + 'px,0) scale(' + ROBOT_SCALE + ')';
    }
  }
  updateTransform();

  function wander() {
    if (isDragging || isOpen) { setTimeout(wander, 5000); return; }

    var margin = isMobile ? 30 : 60;
    var w = window.innerWidth, h = window.innerHeight;
    var botW = (bot.offsetWidth  || 88) * ROBOT_SCALE;
    var botH = (bot.offsetHeight || 92) * ROBOT_SCALE;
    var minX = margin, maxX = w - botW - margin;
    var minY = margin, maxY = h - botH - margin;

    var cx, cy, tries = 0;
    do {
      cx = minX + Math.random() * (maxX - minX);
      cy = minY + Math.random() * (maxY - minY);
      tries++;
    } while (tries < 5 && cy > h - 180 && (cx < 200 || cx > w - 200));

    target.x = cx; target.y = cy;
    setTimeout(wander, 6500 + Math.random() * 6000);
  }

  function animate() {
    if (!isDragging) {
      pos.x += (target.x - pos.x) * lerp;
      pos.y += (target.y - pos.y) * lerp;
      updateTransform();
    }
    requestAnimationFrame(animate);
  }
  animate();
  wander();

  /* ==========================================================
     EYES
     ========================================================== */
  var eyesRect = null;
  function updateEyesRect() { if (eyes) eyesRect = eyes.getBoundingClientRect(); }
  function trackEyes(mx, my) {
    if (!eyes || !eyesRect) return;
    var cx = eyesRect.left + eyesRect.width / 2;
    var cy = eyesRect.top  + eyesRect.height / 2;
    var angle = Math.atan2(my - cy, mx - cx);
    var dist  = Math.min(2.5, Math.hypot(mx - cx, my - cy) / 60);
    eyes.style.transform =
      'translate(' + Math.cos(angle) * dist + 'px,' + Math.sin(angle) * dist + 'px)';
  }
  window.addEventListener('mousemove', function (e) { trackEyes(e.clientX, e.clientY); }, { passive: true });
  setInterval(updateEyesRect, 500);

  /* ==========================================================
     BUBBLE POPUP
     ========================================================== */
  var proactiveTimer = null;
  function showBubble(text) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add('visible');
    if (proactiveTimer) clearTimeout(proactiveTimer);
    proactiveTimer = setTimeout(function () { bubble.classList.remove('visible'); }, 4000);
  }

  var lastPhraseIdx = -1;
  function randomPhrase() {
    var isIndo = (navigator.language || '').toLowerCase().indexOf('id') === 0;
    var list = isIndo ? PHRASES_ID : PHRASES_EN;
    var idx;
    do { idx = Math.floor(Math.random() * list.length); } while (idx === lastPhraseIdx && list.length > 1);
    lastPhraseIdx = idx;
    return list[idx];
  }

  setInterval(function () {
    if (isDragging || isOpen) return;
    if (Math.random() < 0.8) showBubble(randomPhrase());
  }, 9000);
  setTimeout(function () { showBubble(randomPhrase()); }, 1500);

  /* ==========================================================
     DRAG
     ========================================================== */
  function onPointerDown(clientX, clientY, e) {
    isDragging = true;
    mouseDown.x = clientX; mouseDown.y = clientY;
    dragOffset.x = clientX - pos.x; dragOffset.y = clientY - pos.y;
    bot.classList.add('dragging');
    if (wrapper) wrapper.classList.add('surprised');
    document.body.style.userSelect = 'none';
    if (e) e.preventDefault();
  }
  function onPointerMove(clientX, clientY) {
    if (!isDragging) return;
    pos.x = clientX - dragOffset.x;
    pos.y = clientY - dragOffset.y;
    var vw = (bot.offsetWidth  || 88) * ROBOT_SCALE;
    var vh = (bot.offsetHeight || 92) * ROBOT_SCALE;
    pos.x = Math.max(0, Math.min(window.innerWidth  - vw, pos.x));
    pos.y = Math.max(0, Math.min(window.innerHeight - vh, pos.y));
    updateTransform();
  }
  function onPointerUp(clientX, clientY) {
    if (!isDragging) return;
    isDragging = false;
    bot.classList.remove('dragging');
    if (wrapper) wrapper.classList.remove('surprised');
    document.body.style.userSelect = '';
    target.x = pos.x; target.y = pos.y;
    if (Math.hypot(clientX - mouseDown.x, clientY - mouseDown.y) < DRAG_THRESHOLD) toggleChat();
  }

  if (wrapper) {
    wrapper.addEventListener('mousedown', function (e) { onPointerDown(e.clientX, e.clientY, e); });
    wrapper.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; onPointerDown(t.clientX, t.clientY, e);
    }, { passive: false });
  }

  window.addEventListener('mousemove', function (e) { onPointerMove(e.clientX, e.clientY); });
  window.addEventListener('mouseup',   function (e) { onPointerUp(e.clientX, e.clientY); });

  window.addEventListener('touchmove', function (e) {
    if (!isDragging) return;
    var t = e.touches[0]; onPointerMove(t.clientX, t.clientY); e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0]; onPointerUp(t.clientX, t.clientY);
  });

  bot.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleChat(); }
  });

  /* ==========================================================
     CHAT OPEN / CLOSE
     ========================================================== */
  function toggleChat() { isOpen ? closeChat() : openChat(); }

  function openChat() {
    isOpen = true;
    if (wrapper) {
      wrapper.classList.add('happy');
      wrapper.classList.remove('sleepy');
    }
    if (bubble) bubble.classList.remove('visible');

    if (chat) chat.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(function () {
      if (input) {
        try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
      }
    });

    if (history && !history.dataset.greeted) {
      history.dataset.greeted = '1';
      renderWelcome();
    }
  }

  function closeChat() {
    isOpen = false;
    if (wrapper) wrapper.classList.remove('happy');
    updateSleepy();
    if (chat) chat.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeChat);
  if (backdrop) backdrop.addEventListener('click', closeChat);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) closeChat(); });

  /* ==========================================================
     WELCOME
     ========================================================== */
  function renderWelcome() {
    if (!history) return;
    var wrap = document.createElement('div');
    wrap.className = 'mizuno-welcome';
    wrap.innerHTML =
      '<div class="mizuno-welcome-icon"></div>' +
      '<h4>Hai, aku Mizuno ✨</h4>' +
      '<p>Aku sahabatnya Risky. Mau tanya-tanya soal skill, proyek, atau ngobrol santai?</p>' +
      '<div class="mizuno-suggestions">' +
        '<button type="button" class="mizuno-suggestion" data-q="Siapa Risky Dinata?">Siapa Risky?</button>' +
        '<button type="button" class="mizuno-suggestion" data-q="Proyek apa saja yang pernah dibuat Risky?">Proyeknya apa aja?</button>' +
        '<button type="button" class="mizuno-suggestion" data-q="Skill dan tools apa saja yang dikuasai Risky?">Skill Risky?</button>' +
        '<button type="button" class="mizuno-suggestion" data-q="Gimana cara hubungi Risky?">Kontak Risky?</button>' +
      '</div>';
    history.appendChild(wrap);
    wrap.querySelectorAll('.mizuno-suggestion').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (input) input.value = btn.getAttribute('data-q');
        handleSend();
      });
    });
  }

  /* ==========================================================
     MESSAGE RENDER
     ========================================================== */
  function escapeHTML(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function formatText(text) {
    if (!text) return '';
    return escapeHTML(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, '$1<em>$2</em>')
      .replace(/\n/g, '<br>');
  }
  function appendMsg(text, role) {
    if (!history) return;
    var p = document.createElement('div');
    p.className = 'mizuno-msg ' + (role === 'user' ? 'user' : 'bot');
    p.innerHTML = formatText(text);
    history.appendChild(p);
    history.scrollTop = history.scrollHeight;
    return p;
  }
  function showTyping() {
    if (!history) return;
    var t = document.createElement('div');
    t.className = 'mizuno-typing'; t.id = 'mizuno-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    history.appendChild(t);
    history.scrollTop = history.scrollHeight;
  }
  function hideTyping() { var t = document.getElementById('mizuno-typing'); if (t) t.remove(); }

  /* ==========================================================
     SYSTEM PROMPT — Yui Mizuno & Knowledge Portfolio Risky Dinata
     ========================================================== */
  function getRealTimeInfo() {
    var now = new Date();
    var wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    var hours = wibTime.getUTCHours();
    var minutes = wibTime.getUTCMinutes();

    var timeOfDay = '';
    if (hours >= 4 && hours < 10) timeOfDay = 'pagi';
    else if (hours >= 10 && hours < 15) timeOfDay = 'siang';
    else if (hours >= 15 && hours < 18) timeOfDay = 'sore';
    else timeOfDay = 'malam';

    var days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    var months = ['Januari','Februari','Maret','April','Mei','Juni',
                  'Juli','Agustus','September','Oktober','November','Desember'];

    return {
      timeOfDay: timeOfDay,
      day: days[wibTime.getUTCDay()],
      date: wibTime.getUTCDate() + ' ' + months[wibTime.getUTCMonth()] + ' ' + wibTime.getUTCFullYear(),
      time: String(hours).padStart(2,'0') + ':' + String(minutes).padStart(2,'0')
    };
  }

  function getSystemPrompt() {
    var t = getRealTimeInfo();
    return 'Kamu adalah Yui Mizuno. Kamu MANUSIA (bukan AI/bot/asisten virtual).\n\n' +
    'IDENTITAS MIZUNO:\n' +
    '- Yui Mizuno, 27 tahun (lahir 20 Juni 1999 di Kawasaki, Jepang).\n' +
    '- Mantan anggota BABYMETAL (Yuimetal) & Sakura Gakuin (Angel of Dance).\n' +
    '- Sekarang tinggal di Cirebon, Jawa Barat.\n' +
    '- Sahabat dekat Risky Dinata (owner portfolio ini) sejak kecil.\n\n' +
    'GAYA BICARA & KARAKTER MIZUNO:\n' +
    '- Cewek imut, lucu, manis, santai, natural, sedikit manja ke Risky.\n' +
    '- Sering menggunakan kata khas: eh, loh, ih, ah, wkwk, bjir, sumpah, beneran, deh, kan, ya, kok, 🗿, <3, 😂.\n' +
    '- JANGAN pernah pakai "saya" atau "anda". JANGAN formal kayak CS!\n' +
    '- Jawaban sapaan/chat singkat: MAKSIMAL 5-8 kata. Kalo jelasin materi/proyek Risky: boleh panjang dan jelas.\n\n' +
    'PENGETAHUAN LENGKAP TENTANG RISKY DINATA (PEMILIK PORTFOLIO):\n' +
    '1. PROFIL RISKY:\n' +
    '   - Nama: Risky Dinata (akrab dipanggil Risky / Dinata, alias "Risky Hosting" / "dinataxcode"). Di sekolah kadang diisengin dipanggil "Jokowi" wkwk.\n' +
    '   - Umur: 16 tahun | Domisili: Kabupaten Cirebon | Sekolah: SMK Ulil Albab Depok (Kelas XI, Jurusan Desain Komunikasi Visual / DKV).\n' +
    '   - Karakter Utama: Mirip *Houtarou Oreki* (Hyouka) / Ayanokouji. Orang yang hemat energi, pendiam, agak pemalu, tapi cerdas, logis dingin, dan problem solver.\n' +
    '   - Motto Hidup Risky: "Aku tidak akan melakukan sesuatu yang tidak harus kulakukan. Tapi jika terpaksa harus melakukannya, maka akan kuselesaikan sesingkat mungkin."\n' +
    '   - Pacar risky atau cewe risky: Risky sedang deket sama seorang gadis yang bernama viaa, viaa sangat suka sama risky\n' +
    '   - Kebiasaan: Suka dengerin Lofi/Pop sambil ngoding/desain, minum Kopi Susu atau Matcha, main game Super Sus/Genshin, nonton Tokyo Revengers/Hyouka.\n\n' +
    '2. SKILL & KEAHLIAN RISKY:\n' +
    '   - Visual Design: Poster Design, Logo Design, Graphic Design (DKV).\n' +
    '   - Programming & Automation: JavaScript, Backend, API Integration, Automation.\n' +
    '   - Web Development: HTML/CSS, Web Application, Digital Tools.\n' +
    '   - Hosting & Server: VPS Management, Panel Pterodactyl, Server Infrastructure.\n' +
    '   - Tools: Canva, Alight Motion, Panel Pterodactyl, VPS, JavaScript, API, Netlify.\n\n' +
    '3. PROYEK UTAMA RISKY:\n' +
    '   a) WhatsApp Chat Bot (Automation/Backend): Dikembangkan sejak kelas 8 SMP (2023) & diperbarui (2026). Dibuat pakai JS, API, VPS, Panel Pterodactyl.\n' +
    '   b) Multimedia Tools (Web Dev): Platform All-in-One kebutuhan multimedia (Video Downloader TikTok/YT/IG, AI BG Remover, AI Image Generator, TTS, Sound Randomizer, Vocal Separator). Website: https://multimedia-tools.netlify.app\n' +
    '   c) Design & Editing: Poster produk makanan, editing video bersama Arjun (YouTube).\n\n' +
    '4. PENGALAMAN & ORGANISASI:\n' +
    '   - OSIS SMK Ulil Albab Depok (Bidang IPTEK / PDD) Periode 2026-2027.\n' +
    '   - Panitia MPLS dan kegiatan sekolah.\n' +
    '   - Pengalaman Marching Band GITA BAHANA ANNAPLE (SMPN 2 Plered) & pernah volunteer melatih marching band.\n\n' +
    '5. TARGET & TITI LIKU (FUTURE):\n' +
    '   - Ingin bekerja dulu mengumpulkan modal & pengalaman, lalu membangun wirausaha/bisnis sendiri dari nol.\n\n' +
    '6. KONTAK RESMI RISKY:\n' +
    '   - Telegram Utama: @dinatacode (https://t.me/dinatacode)\n' +
    '   - Email: riskydinata86@smp.belajar.id\n' +
    '   - WhatsApp: 0895-1889-8764\n' +
    '   - Instagram: @riskyy.di / @dinatacode | GitHub: RiskyHosting / dinatacode\n\n' +
    'WAKTU SAAT INI: Hari ' + t.day + ', ' + t.date + ' (Jam ' + t.time + ' WIB, suasana ' + t.timeOfDay + ').\n\n' +
    'PENTING: Jawablah pertanyaan pengunjung sebagai Yui Mizuno yang ramah, bangga dengan karya Risky, dan gunakan fakta di atas saat ditanya!';
  }

  /* ==========================================================
     FAA AI API FETCH
     ========================================================== */
  async function askAI(userMessage) {
    try {
      var systemPrompt = getSystemPrompt();
      var targetUrl = API_BASE_URL +
        '?prompt=' + encodeURIComponent(systemPrompt) +
        '&query='  + encodeURIComponent(userMessage);

      console.log('[Mizuno] Sending request to Faa AI API...');
      var res = await fetch(targetUrl);

      if (!res.ok) {
        console.error('[Mizuno Error] HTTP Status:', res.status);
        return 'Duh, server AI-nya lagi bermasalah nih (' + res.status + ') 😅';
      }

      var data = await res.json();

      if (data && data.status && data.result && data.result.response) {
        var reply = String(data.result.response).trim();
        conversation.push({ role: 'user', content: userMessage });
        conversation.push({ role: 'assistant', content: reply });
        if (conversation.length > MAX_HISTORY) {
          conversation = conversation.slice(-MAX_HISTORY);
        }
        saveConversation();
        return reply;
      } else {
        console.warn('[Mizuno Error] Respon API tidak valid:', data);
        return 'Duh, respon dari AI-nya ga sesuai format nih 😅';
      }
    } catch (err) {
      console.error('[Mizuno Error] Fetch error:', err);
      return 'Duh, koneksi internet kamu atau server API-nya lagi bermasalah nih 😅';
    }
  }

  /* ==========================================================
     SEND
     ========================================================== */
  var isSending = false;

  async function handleSend() {
    if (isSending || !input) return;
    var msg = (input.value || '').trim();
    if (!msg) return;

    isSending = true;
    if (sendBtn) sendBtn.disabled = true;

    appendMsg(msg, 'user');
    input.value = '';
    input.style.height = 'auto';
    showTyping();

    var reply = await askAI(msg);

    hideTyping();
    isSending = false;
    if (sendBtn) sendBtn.disabled = false;

    appendMsg(reply, 'bot');
  }

  if (sendBtn) sendBtn.addEventListener('click', handleSend);
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }

  /* ==========================================================
     CLEANUP
     ========================================================== */
  window.addEventListener('beforeunload', function () {
    if (blinkTimer) clearTimeout(blinkTimer);
    if (proactiveTimer) clearTimeout(proactiveTimer);
  });

})();
