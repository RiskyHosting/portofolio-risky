/* ============================================================
   AUDIO-PLAYER.JS — Background music
   - Autoplay dengan fade-in saat interaksi pertama
   - Volume boost via Web Audio API GainNode (bisa > 1.0)
   - Fade-out cepat saat pause
   - Fade-out halus di akhir lagu
   - Kontrol manual: play/pause button
   ============================================================ */

(function() {
  'use strict';
  
  /* ==========================================================
     CONFIG — ubah di sini kalau perlu
     ========================================================== */
  var AUDIO_URL = 'https://files.catbox.moe/lcugfa.mp3';
  var BOOST_GAIN = 2.4; // pengali volume — naikkan kalau kurang keras
  var TARGET_VOLUME = 1.0; // volume elemen (0.0 – 1.0, max 1)
  var FADE_IN_MS = 700; // fade-in cepat saat mulai
  var FADE_OUT_MS = 350; // fade-out saat user pause
  var END_FADE_MS = 1200; // fade-out halus di akhir lagu
  
  /* ==========================================================
     ELEMEN
     ========================================================== */
  var control = document.getElementById('audioControl');
  var btn = document.getElementById('audioBtn');
  var label = document.getElementById('audioLabel');
  if (!control || !btn) return;
  
  var iconPlay = btn.querySelector('.audio-icon-play');
  var iconPause = btn.querySelector('.audio-icon-pause');
  
  /* ==========================================================
     AUDIO SETUP
     ========================================================== */
  var audio = new Audio(AUDIO_URL);
  audio.loop = false;
  audio.volume = 0;
  audio.preload = 'auto';
  audio.crossOrigin = 'anonymous';
  
  /* ==========================================================
     WEB AUDIO API (untuk boost > 1.0)
     ========================================================== */
  var audioCtx = null;
  var sourceNode = null;
  var gainNode = null;
  
  function ensureAudioGraph() {
    if (audioCtx) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
      sourceNode = audioCtx.createMediaElementSource(audio);
      gainNode = audioCtx.createGain();
      gainNode.gain.value = BOOST_GAIN;
      sourceNode.connect(gainNode);
      gainNode.connect(audioCtx.destination);
    } catch (e) {
      audioCtx = null;
      console.warn('Web Audio API tidak tersedia, pakai volume element saja.', e);
    }
  }
  
  /* ==========================================================
     STATE
     ========================================================== */
  var hasStarted = false;
  var userWantsPlay = true;
  var fadeRaf = null;
  
  /* ==========================================================
     UI
     ========================================================== */
  function setPlayingUI(playing) {
    control.classList.toggle('playing', playing);
    if (iconPlay) iconPlay.style.display = playing ? 'none' : 'block';
    if (iconPause) iconPause.style.display = playing ? 'block' : 'none';
    if (label) label.textContent = playing ? 'Playing' : 'Music';
    btn.setAttribute('aria-label', playing ? 'Jeda musik' : 'Putar musik');
  }
  
  /* ==========================================================
     FADE
     ========================================================== */
  function fadeTo(targetVol, duration, onDone) {
    if (fadeRaf) cancelAnimationFrame(fadeRaf);
    
    var startVol = audio.volume;
    var startTime = performance.now();
    
    function tick(now) {
      var t = Math.min((now - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 2);
      audio.volume = Math.max(0, Math.min(1, startVol + (targetVol - startVol) * eased));
      if (t < 1) {
        fadeRaf = requestAnimationFrame(tick);
      } else {
        fadeRaf = null;
        if (onDone) onDone();
      }
    }
    fadeRaf = requestAnimationFrame(tick);
  }
  
  function fadeIn() {
    fadeTo(TARGET_VOLUME, FADE_IN_MS);
  }
  
  function fadeOutThenPause() {
    fadeTo(0, FADE_OUT_MS, function() {
      audio.pause();
      setPlayingUI(false);
    });
  }
  
  /* ==========================================================
     START (autoplay setelah interaksi pertama)
     ========================================================== */
  function tryStart() {
    if (hasStarted || !userWantsPlay) return;
    hasStarted = true;
    control.classList.add('visible');
    
    ensureAudioGraph();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function() {});
    }
    
    audio.play().then(function() {
      setPlayingUI(true);
      fadeIn();
    }).catch(function() {
      setPlayingUI(false);
    });
  }
  
  function onFirstInteract() {
    tryStart();
    window.removeEventListener('click', onFirstInteract);
    window.removeEventListener('scroll', onFirstInteract);
    window.removeEventListener('keydown', onFirstInteract);
    window.removeEventListener('touchstart', onFirstInteract);
  }
  window.addEventListener('click', onFirstInteract, { passive: true });
  window.addEventListener('scroll', onFirstInteract, { passive: true });
  window.addEventListener('keydown', onFirstInteract, { passive: true });
  window.addEventListener('touchstart', onFirstInteract, { passive: true });
  
  /* ==========================================================
     FADE-OUT DI AKHIR LAGU
     ========================================================== */
  audio.addEventListener('timeupdate', function() {
    if (!audio.duration) return;
    var remaining = audio.duration - audio.currentTime;
    var fadeWindow = END_FADE_MS / 1000;
    if (remaining < fadeWindow) {
      var t = Math.max(remaining / fadeWindow, 0);
      audio.volume = TARGET_VOLUME * t;
    }
  });
  
  audio.addEventListener('ended', function() {
    audio.volume = 0;
    setPlayingUI(false);
  });
  
  /* ==========================================================
     MANUAL TOGGLE
     ========================================================== */
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    ensureAudioGraph();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function() {});
    }
    
    if (audio.paused) {
      userWantsPlay = true;
      hasStarted = true;
      control.classList.add('visible');
      audio.play().then(function() {
        setPlayingUI(true);
        fadeIn();
      }).catch(function() {});
    } else {
      userWantsPlay = false;
      fadeOutThenPause();
    }
  });
  
  /* ==========================================================
     TAMPILKAN KONTROL SETELAH INTERAKSI
     ========================================================== */
  window.addEventListener('click', function() {
    control.classList.add('visible');
  }, { once: true, passive: true });
  
})();
