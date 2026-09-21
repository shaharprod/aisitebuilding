/*!
 * AI Academy · בוט שירות לקוחות — V1.10 (22.09.2026)
 * שימוש: <script src=".../support-chat.js" data-profile="courses|site" defer></script>
 *   data-show-when="landed" — (רשות) הבועה מוצגת רק כש-<body> נושא את המחלקה הזאת (למשל אחרי אנימציית פתיחה).
 * בועת צ'אט עצמאית. עונה רק על שאלות על הקורסים, מתוך מאגר הידע של השירות.
 * השרת: Google Apps Script "RAVMESER Support Bot" (לא קשור לשום מערכת פנימית).
 */
(function () {
  'use strict';
  if (window.__aiaSupportChat) return;
  window.__aiaSupportChat = true;

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzlWIrWai8zFC2YSCjgepdD38U4AQIMXp-di3fFsJFnuRwpAhM-kQYm1sWELyNM84Yl-Q/exec';
  var PRIVACY_URL = 'https://shaharprod.github.io/RAVMESER/privacy.html#support-bot';
  var me = document.currentScript;
  var PROFILE = (me && me.getAttribute('data-profile')) || 'courses';
  var SHOW_WHEN = (me && me.getAttribute('data-show-when')) || '';
  var MAX_Q = 500;
  var TIMEOUT_MS = 45000;
  var PROFILES = {
    courses: {
      button: 'שאלות על הקורס?',
      title: 'שירות לקוחות · AI Academy',
      sub: 'בוט אוטומטי · עונה על שאלות על הקורסים',
      greeting: 'שלום! אני הבוט של AI Academy.\nאפשר לשאול אותי על הקורסים, המסלולים, המועדים, המחירים, ההרשמה והזיכוי.\nלנושאים אישיים כמו חשבונית או ביטול — הכי מהיר במייל shaharprod@gmail.com.',
      chips: ['כמה עולה הקורס?', 'מה ההבדל בין המסלולים?', 'מתי וובינר הפתיחה?', 'איך עובד הזיכוי?']
    },
    site: {
      button: 'יש שאלה? דברו איתי',
      title: 'שמוליק שחר · AI Academy',
      sub: 'בוט אוטומטי · שירותים לעסקים וקורסים',
      greeting: 'שלום! אני הבוט של שמוליק שחר.\nאפשר לשאול אותי על ייעוץ והטמעת בינה מלאכותית בעסק, על אוטומציות, סדנאות ובניית כלים, ועל הקורסים — כולל הקורס החינמי.\nלשיחה אישית: shaharprod@gmail.com או 052-2603831.',
      chips: ['מה אתה עושה לעסקים?', 'כמה עולה ייעוץ?', 'איך מתחילים בקורס החינמי?', 'מה ההבדל בין מסלולי הקורס?']
    }
  };
  var P = PROFILES[PROFILE] || PROFILES.courses;
  var GREETING = P.greeting;
  var CHIPS = P.chips;
  var ERR = 'סליחה, לא הצלחתי לענות כרגע. אפשר לנסות שוב, או לכתוב ל-shaharprod@gmail.com.';

  // ---------- מצב ----------
  var history = [];   // {role:'user'|'bot', text}
  var busy = false;
  var sid = (function () {
    var k = 'aia_support_sid', v = '';
    try { v = sessionStorage.getItem(k) || ''; } catch (e) {}
    if (!v) {
      v = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { sessionStorage.setItem(k, v); } catch (e) {}
    }
    return v;
  })();

  // ---------- עיצוב ----------
  var css = [
    '.aia-sc,.aia-sc *{box-sizing:border-box;font-family:"Heebo","Assistant","Segoe UI",system-ui,sans-serif}',
    '.aia-sc{--n:#0F2E4C;--g:#F5B700;--bg:#FFFFFF;--p:#F1F4F7;--t:#1B2430;--m:#5A6470;direction:rtl;position:fixed;left:16px;bottom:16px;z-index:2147483000}',
    '.aia-sc-btn{display:flex;align-items:center;gap:8px;border:0;cursor:pointer;background:var(--n);color:#fff;border-radius:999px;padding:12px 18px 12px 16px;font-size:15px;font-weight:600;box-shadow:0 6px 20px rgba(15,46,76,.35)}',
    '.aia-sc-btn svg{width:22px;height:22px;flex:none}',
    '.aia-sc-btn:focus-visible,.aia-sc button:focus-visible,.aia-sc textarea:focus-visible{outline:3px solid var(--g);outline-offset:2px}',
    '.aia-sc-panel{position:absolute;left:0;bottom:0;width:370px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 32px);background:var(--bg);color:var(--t);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden}',
    '.aia-sc.open .aia-sc-panel{display:flex}.aia-sc.open .aia-sc-btn{display:none}',
    '.aia-sc-head{background:var(--n);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}',
    '.aia-sc-dot{width:10px;height:10px;border-radius:50%;background:var(--g);flex:none}',
    '.aia-sc-title{font-weight:700;font-size:16px;line-height:1.3}.aia-sc-sub{font-size:12.5px;opacity:.8}',
    '.aia-sc-x{margin-inline-start:auto;background:transparent;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:4px 8px;border-radius:8px}',
    '.aia-sc-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#FBFAF8}',
    '.aia-sc-msg{max-width:88%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.6;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}',
    '.aia-sc-msg a{color:#1a56c4;text-decoration:underline;unicode-bidi:isolate}',
    '.aia-sc-msg a[href^="tel:"],.aia-sc-msg a[href^="mailto:"]{white-space:nowrap}',
    '.aia-sc-bot{align-self:flex-start;background:var(--p);border-top-right-radius:4px}',
    '.aia-sc-user{align-self:flex-end;background:var(--n);color:#fff;border-top-left-radius:4px}',
    '.aia-sc-user a{color:#FFE08A}',
    '.aia-sc-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;background:#FBFAF8}',
    '.aia-sc-chip{border:1px solid #cfd8e3;background:#fff;color:var(--n);border-radius:999px;padding:6px 12px;font-size:13px;cursor:pointer}',
    '.aia-sc-chip:hover{border-color:var(--n)}',
    '.aia-sc-typing{align-self:flex-start;background:var(--p);border-radius:14px;padding:12px 14px;display:flex;gap:4px}',
    '.aia-sc-typing i{width:7px;height:7px;border-radius:50%;background:#8a96a3;animation:aiaB 1.2s infinite}',
    '.aia-sc-typing i:nth-child(2){animation-delay:.15s}.aia-sc-typing i:nth-child(3){animation-delay:.3s}',
    '@keyframes aiaB{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}',
    '@media (prefers-reduced-motion:reduce){.aia-sc-typing i{animation:none}}',
    '.aia-sc-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e6e9ee;background:#fff}',
    '.aia-sc-in{flex:1;resize:none;border:1px solid #cfd8e3;border-radius:12px;padding:10px 12px;font-size:15px;line-height:1.4;max-height:110px;min-height:44px;color:var(--t);background:#fff}',
    '.aia-sc-send{border:0;background:var(--g);color:var(--n);font-weight:800;border-radius:12px;padding:0 16px;font-size:15px;cursor:pointer;min-width:64px}',
    '.aia-sc-send[disabled]{opacity:.5;cursor:default}',
    '.aia-sc-foot{font-size:11.5px;color:var(--m);padding:0 12px 10px;background:#fff;line-height:1.5}',
    '.aia-sc-foot a{color:var(--m)}',
    '@media (max-width:480px){.aia-sc{left:12px;bottom:12px}.aia-sc-btn{padding:11px 14px;font-size:14px}.aia-sc-panel{position:fixed;left:8px;right:8px;bottom:8px;top:8px;width:auto;max-width:none;height:auto;max-height:none}}'
  ].join('\n');

  // ---------- עזרים ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // שמות קריאים לקישורים המוכרים (במקום כתובת ארוכה באמצע משפט בעברית)
  var LABELS = [
    [/RAVMESER\/tracks\.html/, 'דף המסלולים'],
    [/RAVMESER\/webinar\.html/, 'דף ההרשמה לוובינר'],
    [/RAVMESER\/offer\.html/, 'דף הקורס'],
    [/RAVMESER\/terms\.html/, 'תנאי השימוש'],
    [/RAVMESER\/privacy\.html/, 'מדיניות הפרטיות'],
    [/RAVMESER\/lead\.html/, 'הרשמה לקורס החינמי'],
    [/RAVMESER\/(index\.html)?$/, 'רשימת השיעורים'],
    [/AI-learning-for-ALL/, 'אתר הלימוד החינמי'],
    [/my\.schooler\.biz\/s\/119813/, 'דף הרכישה בסקולר'],
    [/my\.schooler\.biz\/s\/120864/, 'בית הספר בסקולר'],
    [/my\.schooler\.biz\/?$/, 'כניסה לאזור התלמידים'],
    [/aisitebuilding\.com\/?$/, 'aisitebuilding.com'],
    [/ai-education-platform/, 'הפורטפוליו'],
    [/instagram\.com/, 'אינסטגרם'],
    [/tiktok\.com/, 'טיקטוק'],
    [/whatsapp\.com\/channel/, 'ערוץ הוואטסאפ']
  ];
  function label(u) {
    for (var i = 0; i < LABELS.length; i++) if (LABELS[i][0].test(u)) return LABELS[i][1];
    return u.replace(/^https:\/\//, '');
  }
  // טקסט בטוח + קישורים לחיצים לכתובות, למיילים ולטלפון
  function richText(s) {
    var h = esc(s);
    h = h.replace(/(https:\/\/[^\s<]+[^\s<.,;:!?)\]'"׳״])/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + esc(label(u)) + '</a>';
    });
    h = h.replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '<a href="mailto:$1">$1</a>');
    h = h.replace(/(0\d{1,2}-\d{7})/g, '<a href="tel:$1">$1</a>');
    return h;
  }

  // ---------- בנייה ----------
  function build() {
    var st = el('style'); st.textContent = css; document.head.appendChild(st);

    var root = el('div', 'aia-sc'); root.setAttribute('lang', 'he');

    var btn = el('button', 'aia-sc-btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'פתיחת צ\'אט שירות לקוחות');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#F5B700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/></svg><span>' + esc(P.button) + '</span>';

    var panel = el('div', 'aia-sc-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'צ\'אט שירות לקוחות של AI Academy');

    var head = el('div', 'aia-sc-head');
    var dot = el('span', 'aia-sc-dot');
    var tw = el('div');
    tw.appendChild(el('div', 'aia-sc-title', P.title));
    tw.appendChild(el('div', 'aia-sc-sub', P.sub));
    var x = el('button', 'aia-sc-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'סגירה');
    head.appendChild(dot); head.appendChild(tw); head.appendChild(x);

    var log = el('div', 'aia-sc-log'); log.setAttribute('aria-live', 'polite');
    var chips = el('div', 'aia-sc-chips');
    CHIPS.forEach(function (c) {
      var b = el('button', 'aia-sc-chip', c); b.type = 'button';
      b.addEventListener('click', function () { send(c); });
      chips.appendChild(b);
    });

    var form = el('form', 'aia-sc-form');
    var input = el('textarea', 'aia-sc-in');
    input.rows = 1; input.maxLength = MAX_Q;
    input.placeholder = 'כתבו שאלה…';
    input.setAttribute('aria-label', 'השאלה שלכם');
    var sendBtn = el('button', 'aia-sc-send', 'שליחה'); sendBtn.type = 'submit';
    form.appendChild(input); form.appendChild(sendBtn);

    var foot = el('div', 'aia-sc-foot');
    foot.innerHTML = 'תשובות אוטומטיות על סמך מידע הקורס. אל תכתבו כאן פרטים אישיים, סיסמאות או פרטי אשראי. <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">מדיניות פרטיות</a>';

    panel.appendChild(head); panel.appendChild(log); panel.appendChild(chips);
    panel.appendChild(form); panel.appendChild(foot);
    root.appendChild(btn); root.appendChild(panel);
    document.body.appendChild(root);

    // הצגה מותנית: רק כשה-body נושא מחלקה מסוימת (למשל אחרי אנימציית פתיחה)
    if (SHOW_WHEN) {
      var sync = function () {
        var on = document.body.classList.contains(SHOW_WHEN);
        root.style.display = on ? '' : 'none';
      };
      sync();
      new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    var greeted = false;
    function open() {
      root.classList.add('open');
      if (!greeted) { addMsg('bot', GREETING); greeted = true; }
      setTimeout(function () { input.focus(); }, 50);
    }
    function close() { root.classList.remove('open'); btn.focus(); }
    btn.addEventListener('click', open);
    x.addEventListener('click', close);
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); }
    });
    input.addEventListener('input', function () {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });

    function addMsg(role, text) {
      var m = el('div', 'aia-sc-msg ' + (role === 'user' ? 'aia-sc-user' : 'aia-sc-bot'));
      m.innerHTML = richText(text);
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
      return m;
    }

    function send(text) {
      var q = String(text || '').trim().slice(0, MAX_Q);
      if (!q || busy) return;
      busy = true; sendBtn.disabled = true;
      chips.style.display = 'none';
      input.value = ''; input.style.height = 'auto';
      addMsg('user', q);
      var typing = el('div', 'aia-sc-typing');
      typing.innerHTML = '<i></i><i></i><i></i>';
      typing.setAttribute('aria-label', 'הבוט כותב');
      log.appendChild(typing); log.scrollTop = log.scrollHeight;

      var payload = JSON.stringify({ q: q, sid: sid, page: location.host + location.pathname, history: history.slice(-6) });
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // בלי preflight מול Apps Script
        body: payload,
        signal: ctrl ? ctrl.signal : undefined
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var a = (d && d.answer) ? String(d.answer) : ERR;
          finish(q, a);
        })
        .catch(function () { finish(null, ERR); });

      function finish(question, answer) {
        clearTimeout(timer);
        if (typing.parentNode) typing.parentNode.removeChild(typing);
        addMsg('bot', answer);
        if (question) {
          history.push({ role: 'user', text: question });
          history.push({ role: 'bot', text: answer });
          if (history.length > 12) history = history.slice(-12);
        }
        busy = false; sendBtn.disabled = false; input.focus();
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
