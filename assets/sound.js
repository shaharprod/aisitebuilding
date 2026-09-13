/* =====================================================================
   sound.js — פסקול הטיסה, מסונתז ב-Web Audio (בלי קבצים חיצוניים)
   רוח וסילון בסטרטוספירה → רעם וטורבולנציה בעננים → פאד דיגיטלי
   וציוצי נתונים בעיר → מכה במגע → אמביינט שקט מאחורי האתר.
   הדפדפן מרשה צליל רק אחרי מחווה של המשתמש, ולכן: כפתור רמקול,
   וכל לחיצה/מקש ראשונים מפעילים אותו. השתקה נשמרת ב-localStorage.
   ===================================================================== */
(function () {
  'use strict';
  var AC = window.AudioContext || window.webkitAudioContext;
  var KEY = 'aisb-sound';           // 'on' | 'off'
  var ctx = null, master = null, built = false, running = false;
  var wind, windF, windG, rumble, rumbleF, rumbleG, engA, engB, engG, padA, padB, padF, padG, lfo, lfoG;
  var btns = [];
  var muted = (function () { try { return localStorage.getItem(KEY) === 'off'; } catch (e) { return false; } })();

  function noiseBuffer(seconds) {
    var sr = ctx.sampleRate, n = Math.floor(sr * seconds), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0);
    var last = 0;
    for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = (w * 0.35 + last * 3.0) * 0.5; }   // רעש "חום" רך
    return b;
  }
  function loopNoise() { var s = ctx.createBufferSource(); s.buffer = noiseBuffer(4); s.loop = true; return s; }

  function build() {
    if (built) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);

    // רוח / סילון
    wind = loopNoise(); windF = ctx.createBiquadFilter(); windF.type = 'lowpass'; windF.frequency.value = 900; windF.Q.value = 0.7;
    windG = ctx.createGain(); windG.gain.value = 0.0; wind.connect(windF); windF.connect(windG); windG.connect(master);

    // רעם / טורבולנציה
    rumble = loopNoise(); rumbleF = ctx.createBiquadFilter(); rumbleF.type = 'lowpass'; rumbleF.frequency.value = 110;
    rumbleG = ctx.createGain(); rumbleG.gain.value = 0.0; rumble.connect(rumbleF); rumbleF.connect(rumbleG); rumbleG.connect(master);

    // מנוע
    engA = ctx.createOscillator(); engA.type = 'sawtooth'; engA.frequency.value = 52;
    engB = ctx.createOscillator(); engB.type = 'sine'; engB.frequency.value = 104.5;
    var engF = ctx.createBiquadFilter(); engF.type = 'lowpass'; engF.frequency.value = 220;
    engG = ctx.createGain(); engG.gain.value = 0.0;
    engA.connect(engF); engB.connect(engF); engF.connect(engG); engG.connect(master);

    // פאד דיגיטלי של העיר
    padA = ctx.createOscillator(); padA.type = 'triangle'; padA.frequency.value = 110;
    padB = ctx.createOscillator(); padB.type = 'triangle'; padB.frequency.value = 165.2;
    var padC = ctx.createOscillator(); padC.type = 'sine'; padC.frequency.value = 220.7;
    padF = ctx.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 700; padF.Q.value = 2.5;
    padG = ctx.createGain(); padG.gain.value = 0.0;
    lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; lfoG = ctx.createGain(); lfoG.gain.value = 320;
    lfo.connect(lfoG); lfoG.connect(padF.frequency);
    padA.connect(padF); padB.connect(padF); padC.connect(padF); padF.connect(padG); padG.connect(master);

    [wind, rumble, engA, engB, padA, padB, padC, lfo].forEach(function (n) { n.start(); });
    built = true;
  }

  function ramp(param, v, t) { var now = ctx.currentTime; param.cancelScheduledValues(now); param.setTargetAtTime(v, now, t || 0.25); }

  function activate() {
    if (muted) return;
    if (!built) build();
    running = true; refresh();
    var go = function () { ramp(master.gain, 0.9, 0.6); refresh(); };
    if (ctx.state !== 'running') { ctx.resume().then(go, function () { running = false; refresh(); }); } else { go(); }
  }
  function silence() { if (built) ramp(master.gain, 0, 0.3); running = false; refresh(); }

  function refresh() {
    btns.forEach(function (b) {
      b.classList.toggle('on', running && !muted);
      b.classList.toggle('muted', muted);
      b.setAttribute('aria-pressed', String(running && !muted));
      b.title = muted ? 'הסאונד כבוי — לחיצה מפעילה' : (running ? 'סאונד פועל — לחיצה משתיקה' : 'לחיצה להפעלת הסאונד');
    });
    document.body.classList.toggle('sound-on', running && !muted);
  }

  function toggle() {
    // לחיצה ראשונה (עוד לא מנגן, לא מושתק) = הפעלה; מנגן = השתקה; מושתק = ביטול השתקה
    if (running && !muted) { muted = true; silence(); }
    else { muted = false; activate(); }
    try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch (e) {}
  }

  /* -------- API שהטיסה קוראת לה -------- */
  var blipT = 0;
  function setPhase(t, kCloud, kCity, turb, landed, dt) {
    if (!built || !running) return;
    // רוח: חזקה למעלה, נחלשת בעיר, נעלמת אחרי הנחיתה
    var w = landed ? 0.02 : (0.20 - kCity * 0.13) * (1 - t * 0.35);
    ramp(windG.gain, w, 0.4);
    ramp(windF.frequency, 700 + (1 - kCity) * 900 + turb * 1200, 0.3);
    // טורבולנציה
    ramp(rumbleG.gain, landed ? 0 : turb * 0.45, 0.15);
    // מנוע: נשמע יותר בגובה נמוך, נדם אחרי הנחיתה
    ramp(engG.gain, landed ? 0.02 : 0.05 + kCity * 0.05, 0.4);
    ramp(engA.frequency, 52 - kCity * 10 - (landed ? 14 : 0), 0.8);
    // פאד העיר: עולה עם הפריצה, נשאר עדין מאחורי האתר
    ramp(padG.gain, kCity * (landed ? 0.045 : 0.075), 0.8);
    // ציוצי נתונים
    if (kCity > 0.3 && !landed) { blipT -= dt; if (blipT <= 0) { blip(); blipT = 0.12 + Math.random() * 0.5; } }
  }
  function blip() {
    var o = ctx.createOscillator(), g = ctx.createGain(), now = ctx.currentTime;
    o.type = 'sine'; o.frequency.value = 900 + Math.random() * 1900;
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.028, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    o.connect(g); g.connect(master); o.start(now); o.stop(now + 0.13);
  }
  function thunder(strength) {
    if (!built || !running) return;
    var s = ctx.createBufferSource(); s.buffer = noiseBuffer(2.2);
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
    var g = ctx.createGain(), now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.5 * strength, now + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    s.connect(f); f.connect(g); g.connect(master); s.start(now); s.stop(now + 2.0);
  }
  function touchdown() {
    if (!built || !running) return;
    var now = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(70, now); o.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.7, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    o.connect(g); g.connect(master); o.start(now); o.stop(now + 0.65);
    var s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.6);
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 1.2;
    var g2 = ctx.createGain(); g2.gain.setValueAtTime(0.0001, now); g2.gain.exponentialRampToValueAtTime(0.22, now + 0.03); g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    s.connect(f); f.connect(g2); g2.connect(master); s.start(now); s.stop(now + 0.5);
  }

  /* -------- חיווט -------- */
  var GEST = ['pointerdown', 'keydown', 'touchstart', 'click'];
  function firstGesture(e) {
    if (e && e.target && e.target.closest && e.target.closest('.snd')) return;   // הכפתור עצמו מטפל בעצמו
    if (!muted) activate();
    GEST.forEach(function (ev) { window.removeEventListener(ev, firstGesture, true); });
  }
  if (AC) {
    GEST.forEach(function (ev) { window.addEventListener(ev, firstGesture, true); });
    document.addEventListener('visibilitychange', function () { if (!built) return; if (document.hidden) ramp(master.gain, 0, 0.2); else if (running && !muted) ramp(master.gain, 0.9, 0.6); });
  }
  function bind(el) {
    if (!el) return; btns.push(el);
    el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggle(); });
  }
  bind(document.getElementById('snd-hud')); bind(document.getElementById('snd-nav'));
  refresh();

  window.__sound = { setPhase: setPhase, thunder: thunder, touchdown: touchdown, toggle: toggle, activate: activate, get muted() { return muted; }, get running() { return running; }, supported: !!AC };
})();
