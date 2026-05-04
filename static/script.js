'use strict';

/* ══════════════════════════════════════════════════════════
   AI STUDY HUB — SCRIPT.JS
   Captcha · OTP · Sidebar · Summarizer · PDF Summarizer
   Chatbot (file upload + quiz offer) · Interactive Quiz
   Content Analyzer · Performance Analytics
══════════════════════════════════════════════════════════ */

// ── CAPTCHA ───────────────────────────────────────────────
function initCaptcha(questionId, formId, answerId) {
  let a = Math.floor(Math.random() * 12) + 1;
  let b = Math.floor(Math.random() * 12) + 1;
  const qEl   = document.getElementById(questionId);
  const form  = document.getElementById(formId);
  const ansEl = document.getElementById(answerId);
  if (!qEl || !form || !ansEl) return;
  qEl.textContent = a + ' + ' + b;
  form.addEventListener('submit', function (e) {
    const ans = parseInt(ansEl.value.trim(), 10);
    if (isNaN(ans) || ans !== a + b) {
      e.preventDefault();
      ansEl.value = '';
      ansEl.classList.add('shake-it');
      ansEl.addEventListener('animationend', function () {
        ansEl.classList.remove('shake-it');
      }, { once: true });
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      qEl.textContent = a + ' + ' + b;
      ansEl.focus();
      return;
    }
    const btn = form.querySelector('.btn-submit');
    if (btn) {
      const loader = btn.querySelector('.btn-loader');
      const lbl    = btn.querySelector('.btn-label');
      const arrow  = btn.querySelector('.btn-arrow');
      if (loader) loader.classList.add('active');
      if (lbl)    lbl.textContent = 'Processing…';
      if (arrow)  arrow.textContent = '';
      btn.disabled = true;
    }
  });
}

// ── OTP ───────────────────────────────────────────────────
function initOtp() {
  const digits = Array.from(document.querySelectorAll('.otp-digit'));
  const hidden = document.getElementById('otpHidden');
  const form   = document.getElementById('otpForm') || document.getElementById('resetOtpForm');
  const verBtn = document.getElementById('verifyBtn');
  if (!digits.length) return;
  digits[0].focus();

  function sync() {
    const val = digits.map(function (d) { return d.value; }).join('');
    if (hidden) hidden.value = val;
    digits.forEach(function (d) { d.classList.toggle('filled', d.value !== ''); });
    if (verBtn) verBtn.disabled = val.length < 6;
    if (val.length === 6 && form) setTimeout(function () { form.requestSubmit(); }, 220);
  }

  digits.forEach(function (d, i) {
    d.addEventListener('input', function () {
      d.value = d.value.replace(/\D/g, '').slice(-1);
      sync();
      if (d.value && i < digits.length - 1) digits[i + 1].focus();
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !d.value && i > 0) {
        digits[i - 1].focus(); digits[i - 1].value = ''; sync();
      }
      if (e.key === 'ArrowLeft'  && i > 0)                digits[i - 1].focus();
      if (e.key === 'ArrowRight' && i < digits.length - 1) digits[i + 1].focus();
    });
    d.addEventListener('paste', function (e) {
      e.preventDefault();
      const p = (e.clipboardData || window.clipboardData).getData('text')
                  .replace(/\D/g, '').slice(0, 6);
      p.split('').forEach(function (ch, j) { if (digits[j]) digits[j].value = ch; });
      sync();
      const nxt = digits.find(function (x) { return !x.value; });
      (nxt || digits[digits.length - 1]).focus();
    });
  });

  if (verBtn) verBtn.disabled = true;
  sync();

  if (form) {
    form.addEventListener('submit', function () {
      if (verBtn) {
        const lbl = verBtn.querySelector('.btn-label');
        if (lbl) lbl.textContent = 'Verifying…';
        verBtn.disabled = true;
      }
    });
  }

  // ── OTP COUNTDOWN TIMER (built into initOtp for signup OTP page) ──
  var totalSeconds = 180;   // 3 minutes
  var timerEl      = document.getElementById('otpTimer');
  var timerSubEl   = document.getElementById('otpTimerSub');
  var expiredEl    = document.getElementById('otpExpiredMsg');

  if (!timerEl) return;
  if (expiredEl) expiredEl.style.display = 'none';

  function updateTimerDisplay() {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    timerEl.textContent = '⏱ ' + m + ':' + (s < 10 ? '0' : '') + s;
    if (totalSeconds <= 20) {
      timerEl.style.color = '#ff4d6d';
      timerEl.style.fontWeight = '700';
    } else if (totalSeconds <= 60) {
      timerEl.style.color = '#fbbf24';
    } else {
      timerEl.style.color = '';
    }
  }

  updateTimerDisplay();

  var countdown = setInterval(function () {
    totalSeconds--;
    if (totalSeconds <= 0) {
      clearInterval(countdown);
      timerEl.textContent = '⏱ 0:00';
      timerEl.style.color = '#ff4d6d';
      if (timerSubEl) timerSubEl.textContent = 'OTP expired';
      if (expiredEl)  expiredEl.style.display = 'block';
      digits.forEach(function (d) { d.disabled = true; });
      if (verBtn) verBtn.disabled = true;
      return;
    }
    updateTimerDisplay();
  }, 1000);
}

// ── OTP COUNTDOWN TIMER (standalone — called from reset_otp.html) ─
function startOtpTimer(seconds) {
  var timerEl   = document.getElementById('otpTimer');
  var subEl     = document.getElementById('otpTimerSub');
  var expEl     = document.getElementById('otpExpiredMsg');
  var verifyBtn = document.getElementById('verifyBtn');
  var digits    = document.querySelectorAll('.otp-digit');

  if (!timerEl) return;
  if (expEl) expEl.style.display = 'none';

  var remaining = seconds;

  function updateDisplay() {
    var mins = Math.floor(remaining / 60);
    var secs = remaining % 60;
    timerEl.textContent = '⏱ ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
    if (remaining <= 20) {
      timerEl.style.color = '#ff4d6d';
      timerEl.style.fontWeight = '700';
    } else if (remaining <= 60) {
      timerEl.style.color = '#fbbf24';
      timerEl.style.fontWeight = 'normal';
    } else {
      timerEl.style.color = '';
      timerEl.style.fontWeight = 'normal';
    }
  }

  updateDisplay();

  var interval = setInterval(function () {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      timerEl.textContent = '⏱ 0:00';
      timerEl.style.color = '#ff4d6d';
      if (subEl)     subEl.textContent   = 'OTP expired';
      if (expEl)     expEl.style.display = 'block';
      if (verifyBtn) verifyBtn.disabled  = true;
      digits.forEach(function (d) { d.disabled = true; });
      return;
    }
    updateDisplay();
  }, 1000);
}

// ── SIDEBAR ───────────────────────────────────────────────
function openSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('visible');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeSidebar();
});

// ── TOOL SWITCHER ─────────────────────────────────────────
function showTool(id, btn) {
  document.querySelectorAll('.tool-panel').forEach(function (p) {
    p.classList.remove('active');
  });
  document.querySelectorAll('.nav-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  const panel = document.getElementById('tool-' + id);
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');
  if (window.innerWidth <= 960) closeSidebar();
  if (id === 'analytics') loadAnalytics();
}

// ── HELPERS ───────────────────────────────────────────────
function setLoading(btnId, spinnerId, on) {
  const btn = document.getElementById(btnId);
  const sp  = document.getElementById(spinnerId);
  if (btn) btn.disabled = on;
  if (sp)  sp.classList.toggle('active', on);
}

function renderMarkdown(text) {
  return text
    .replace(/^### (.+)$/gm,  '<h4>$1</h4>')
    .replace(/^## (.+)$/gm,   '<h3>$1</h3>')
    .replace(/^# (.+)$/gm,    '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[•\-\*] \[ \] (.+)$/gm, '<li class="check-item">&#9744; $1</li>')
    .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>)|$)/g, function (m, p1) {
      return '<ul>' + p1 + '</ul>';
    })
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function showResult(id, text, isErr) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('result--error');
  if (isErr) {
    el.textContent = text;
    el.classList.add('result--error');
  } else {
    el.innerHTML = '<p>' + renderMarkdown(text) + '</p>';
  }
  el.classList.add('visible');
}

function hideResult(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ''; el.classList.remove('visible', 'result--error'); }
}

async function callApi(url, payload) {
  const res  = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Request failed.');
  return data;
}

// ══════════════════════════════════════════════════════════
// SUMMARIZER — supports text + file upload
// ══════════════════════════════════════════════════════════
let _sumFile = null;

function handleSumFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  _sumFile = file;
  const info = document.getElementById('sumFileInfo');
  if (info) info.textContent = '📎 ' + file.name;
}

function removeSumFile() {
  _sumFile = null;
  const info  = document.getElementById('sumFileInfo');
  const input = document.getElementById('sumFileInput');
  if (info)  info.textContent = '';
  if (input) input.value = '';
}

async function doSummarize() {
  const textEl = document.getElementById('sum-text');
  const text   = textEl ? textEl.value.trim() : '';
  if (!text && !_sumFile) return alert('Please enter some text or upload a file to summarize.');
  hideResult('sum-out');
  setLoading('sum-btn', 'sum-spin', true);
  try {
    let data;
    if (_sumFile) {
      const fd = new FormData();
      fd.append('file', _sumFile);
      if (text) fd.append('text', text);
      const res = await fetch('/summarize-file', { method: 'POST', body: fd });
      data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed.');
    } else {
      data = await callApi('/summarize', { text: text });
    }
    showResult('sum-out', data.summary);
  } catch (e) {
    showResult('sum-out', e.message, true);
  } finally {
    setLoading('sum-btn', 'sum-spin', false);
    removeSumFile();
  }
}

// ══════════════════════════════════════════════════════════
// PDF SUMMARIZER
// ══════════════════════════════════════════════════════════
let _pdfFile = null;

function handlePdfSelect(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  _pdfFile = file;
  const info = document.getElementById('pdfFileInfo');
  const zone = document.getElementById('pdfDropZone');
  if (info) info.textContent = '📄 ' + file.name;
  if (zone) {
    const txt = zone.querySelector('.upload-txt');
    if (txt) txt.textContent = file.name;
  }
}

async function doPdfSummarize() {
  if (!_pdfFile) return alert('Please select a PDF file first.');
  hideResult('pdf-out');
  setLoading('pdf-btn', 'pdf-spin', true);
  try {
    const fd = new FormData();
    fd.append('pdf', _pdfFile);
    const res  = await fetch('/pdf-summarize', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'PDF failed.');
    showResult('pdf-out', data.summary);
  } catch (e) {
    showResult('pdf-out', e.message, true);
  } finally {
    setLoading('pdf-btn', 'pdf-spin', false);
  }
}

// ══════════════════════════════════════════════════════════
// CHATBOT
// ══════════════════════════════════════════════════════════
let _chatFile     = null;
let _chatFileText = '';
let _chatPendingQuizFile = null;

function handleChatFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  _chatFile     = file;
  _chatFileText = '';

  const preview = document.getElementById('chatFilePreview');
  const nameEl  = document.getElementById('chatFileName');
  const iconEl  = document.getElementById('chatFileIcon');
  if (preview) preview.classList.add('visible');
  if (nameEl)  nameEl.textContent = file.name;

  const fname = file.name.toLowerCase();
  let icon = '📎';
  if (fname.endsWith('.pdf'))                              icon = '📄';
  else if (/\.(png|jpg|jpeg|gif|webp)$/.test(fname))      icon = '🖼️';
  else if (/\.(py|js|ts|java|cpp|c|go|rs)$/.test(fname)) icon = '💻';
  else if (/\.(txt|md|csv|docx|xml|json)$/.test(fname))  icon = '📝';
  if (iconEl) iconEl.textContent = icon;
}

function removeChatFile() {
  _chatFile     = null;
  _chatFileText = '';
  const preview = document.getElementById('chatFilePreview');
  const input   = document.getElementById('chatFileInput');
  if (preview) preview.classList.remove('visible');
  if (input)   input.value = '';
}

function appendBotWithActions(container, text, actions) {
  const wrap   = document.createElement('div');
  wrap.className = 'chat-msg chat-msg--bot';
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = '🤖';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  const textSpan = document.createElement('span');
  textSpan.innerHTML = renderMarkdown(text);
  bubble.appendChild(textSpan);
  if (actions && actions.length) {
    const row = document.createElement('div');
    row.className = 'chat-action-row';
    actions.forEach(function (a) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-action-btn';
      btn.textContent = a.label;
      btn.addEventListener('click', function () {
        row.querySelectorAll('.chat-action-btn').forEach(function (b) {
          b.disabled = true;
          b.classList.toggle('chat-action-chosen', b === btn);
        });
        a.action();
      });
      row.appendChild(btn);
    });
    bubble.appendChild(row);
  }
  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

async function doChat() {
  const inp = document.getElementById('chatInput');
  const msg = inp ? inp.value.trim() : '';
  if (!msg && !_chatFile) return;

  const win     = document.getElementById('chatWindow');
  const sendBtn = document.querySelector('.chat-send');

  if (!_chatFile && _chatPendingQuizFile && msg) {
    appendMsg(win, msg, 'user');
    inp.value = '';
    inp.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    const typing = appendTyping(win);
    const fileForQuiz = _chatPendingQuizFile;
    _chatPendingQuizFile = null;
    try {
      await generateQuizFromFileWithInstruction(fileForQuiz, msg, win);
    } finally {
      typing.remove();
      inp.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      inp.focus();
    }
    return;
  }

  const displayMsg = msg + (_chatFile ? ' 📎 ' + _chatFile.name : '');
  appendMsg(win, displayMsg, 'user');
  inp.value    = '';
  inp.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  const typing = appendTyping(win);

  try {
    let data;
    const fileAttached = !!_chatFile;
    const attachedFile = _chatFile;

    if (_chatFile) {
      const fd = new FormData();
      fd.append('message', msg || 'Please read and describe this file.');
      fd.append('file', _chatFile);
      const res = await fetch('/chat', { method: 'POST', body: fd });
      data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed.');
      _chatFileText = data.extracted_text || '';
    } else {
      data = await callApi('/chat', { message: msg });
    }

    typing.remove();
    removeChatFile();
    appendMsg(win, data.reply || 'No response.', 'bot');

    if (fileAttached) {
      const capturedFile = attachedFile;
      appendBotWithActions(
        win,
        '✨ Want to create a quiz from this file? Tell me what to focus on, or I\'ll cover the whole thing.',
        [
          {
            label: '🎯 Yes, create a quiz!',
            action: function () {
              _chatPendingQuizFile = capturedFile;
              appendMsg(win, '📝 What should the quiz focus on? (e.g. "key concepts", "Python functions") — or say "everything" for a full quiz.', 'bot');
              inp.focus();
            }
          },
          {
            label: '❌ No thanks',
            action: function () {
              appendMsg(win, '👍 Got it! Let me know if you need anything else.', 'bot');
            }
          }
        ]
      );
    }

  } catch (e) {
    typing.remove();
    appendMsg(win, '⚠ ' + e.message, 'bot');
    removeChatFile();
  } finally {
    inp.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    inp.focus();
  }
}

async function generateQuizFromFileWithInstruction(file, instruction, win) {
  appendMsg(win, '⚙ Generating quiz from your file — please wait…', 'bot');
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('instruction', instruction === 'everything' ? '' : instruction);
    const res  = await fetch('/quiz-from-file', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate quiz.');

    const questions = parseQuizText(data.quiz);
    if (!questions.length) throw new Error('Could not parse quiz. Please try again.');

    const quizNavBtn = document.querySelector('.nav-btn[onclick*="quiz"]');
    showTool('quiz', quizNavBtn);

    quizState.questions  = questions;
    quizState.answers    = new Array(questions.length).fill(null);
    quizState.current    = 0;
    quizState.submitted  = false;
    quizState.topic      = data.topic || file.name;
    quizState.timePerQ   = 0;

    resetQuizUI();
    renderQuizQuestion(0);

    const interactive = document.getElementById('quizInteractive');
    if (interactive) interactive.classList.add('visible');

    appendMsg(win, '✅ Quiz ready! Switched to the Quiz tab — good luck! 🎯', 'bot');

  } catch (e) {
    appendMsg(win, '⚠ ' + e.message, 'bot');
  }
}

function appendMsg(container, text, role) {
  const wrap   = document.createElement('div');
  wrap.className = 'chat-msg chat-msg--' + role;
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = role === 'bot' ? '🤖' : '🎓';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  if (role === 'bot') {
    bubble.innerHTML = '<p>' + renderMarkdown(text) + '</p>';
  } else {
    bubble.textContent = text;
  }
  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

function appendTyping(container) {
  const wrap   = document.createElement('div');
  wrap.className = 'chat-msg chat-msg--bot';
  const avatar = document.createElement('div');
  avatar.className = 'chat-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = '🤖';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble typing-dots';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('span');
    dot.className = 'typing-dot';
    bubble.appendChild(dot);
  }
  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

// ══════════════════════════════════════════════════════════
// QUIZ — interactive, one question at a time
// ══════════════════════════════════════════════════════════

const quizState = {
  questions:     [],
  answers:       [],
  current:       0,
  submitted:     false,
  topic:         '',
  timePerQ:      0,
  questionTimer: null
};

let _quizPdfFile = null;

function switchQuizTab(tab, clickedBtn) {
  document.querySelectorAll('.quiz-tab').forEach(function (b) {
    b.classList.remove('active');
  });
  document.querySelectorAll('.quiz-source-pane').forEach(function (p) {
    p.classList.remove('active');
  });
  if (clickedBtn) clickedBtn.classList.add('active');
  const key  = tab.charAt(0).toUpperCase() + tab.slice(1);
  const pane = document.getElementById('quizPane' + key);
  if (pane) pane.classList.add('active');
}

function handleQuizFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  _quizPdfFile = file;
  const info  = document.getElementById('quizPdfInfo');
  const label = document.querySelector('#quizPanePdf .quiz-pdf-label');
  if (info)  info.textContent  = '📎 ' + file.name;
  if (label) label.textContent = file.name;
}

function parseQuizText(raw) {
  const questions = [];
  const blocks = raw.trim().split(/\n\s*\n(?=Q\d+\.)/);

  blocks.forEach(function (block) {
    block = block.trim();
    if (!block) return;

    const qMatch = block.match(/^Q\d+\.\s*(.+?)(?=\n[A-D][).])/s);
    if (!qMatch) return;
    const questionText = qMatch[1].trim().replace(/\s+/g, ' ');

    const options = {};
    const optRegex = /^([A-D])[).]\s*(.+)$/gm;
    let m;
    while ((m = optRegex.exec(block)) !== null) {
      options[m[1]] = m[2].trim();
    }

    const ansMatch = block.match(/^Answer:\s*([A-D])/im);
    if (!ansMatch) return;
    const correct = ansMatch[1].toUpperCase();

    if (Object.keys(options).length >= 2) {
      questions.push({ question: questionText, options: options, answer: correct });
    }
  });
  return questions;
}

// ── Per-question countdown timer ──────────────────────────
function startQuestionTimer(qIdx, seconds) {
  if (quizState.questionTimer) clearInterval(quizState.questionTimer);
  const timerEl = document.getElementById('quizQTimer');
  if (!timerEl) return;
  let remaining = seconds;

  function tick() {
    timerEl.textContent = '⏱ ' + remaining + 's';
    if (remaining <= 5) {
      timerEl.style.color = '#ff4d6d';
      timerEl.style.fontWeight = '700';
    } else if (remaining <= 10) {
      timerEl.style.color = '#fbbf24';
    } else {
      timerEl.style.color = '#00e5ff';
      timerEl.style.fontWeight = 'normal';
    }
    if (remaining <= 0) {
      clearInterval(quizState.questionTimer);
      timerEl.textContent = '⏱ Time up!';
      if (qIdx < quizState.questions.length - 1) {
        setTimeout(function () { quizGoTo(qIdx + 1); }, 700);
      }
      return;
    }
    remaining--;
  }
  tick();
  quizState.questionTimer = setInterval(tick, 1000);
}

async function doQuiz() {
  resetQuizUI();
  hideQuizError();

  const activePane = document.querySelector('.quiz-source-pane.active');
  const isFileTab  = activePane && activePane.id === 'quizPanePdf';

  const numQEl   = document.getElementById('quiz-num-questions');
  const timeEl   = document.getElementById('quiz-time-per-q');
  const diffEl   = document.getElementById('quiz-difficulty');
  const numQ     = numQEl ? (parseInt(numQEl.value) || 5) : 5;
  const timePerQ = timeEl ? (parseInt(timeEl.value) || 0) : 0;
  const diff     = diffEl ? diffEl.value : 'medium';

  setLoading('quiz-btn', 'quiz-spin', true);
  const btnLabel = document.getElementById('quiz-btn-label');
  if (btnLabel) btnLabel.textContent = 'Generating…';

  try {
    let rawQuiz = '', topic = '';

    if (isFileTab) {
      if (!_quizPdfFile) { showQuizError('Please upload a file first.'); return; }
      const fd = new FormData();
      fd.append('file', _quizPdfFile);
      fd.append('instruction', '');
      fd.append('num_questions', numQ);
      fd.append('difficulty', diff);
      const res  = await fetch('/quiz-from-file', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      rawQuiz = data.quiz;
      topic   = data.topic || _quizPdfFile.name;
    } else {
      const textEl = document.getElementById('quiz-text');
      const text   = textEl ? textEl.value.trim() : '';
      if (!text) { showQuizError('Please paste some text first.'); return; }
      const data = await callApi('/quiz', { text: text, num_questions: numQ, difficulty: diff });
      rawQuiz = data.quiz;
      topic   = data.topic || text.slice(0, 60);
    }

    const questions = parseQuizText(rawQuiz);
    if (!questions.length) { showQuizError('Could not parse quiz. Please try again.'); return; }

    quizState.questions  = questions;
    quizState.answers    = new Array(questions.length).fill(null);
    quizState.current    = 0;
    quizState.submitted  = false;
    quizState.topic      = topic;
    quizState.timePerQ   = timePerQ;

    renderQuizQuestion(0);
    const interactive = document.getElementById('quizInteractive');
    if (interactive) interactive.classList.add('visible');

  } catch (e) {
    showQuizError(e.message);
  } finally {
    setLoading('quiz-btn', 'quiz-spin', false);
    if (btnLabel) btnLabel.textContent = 'Generate Quiz';
  }
}

function renderQuizQuestion(idx) {
  if (!quizState.questions[idx]) return;
  quizState.current = idx;
  const q     = quizState.questions[idx];
  const total = quizState.questions.length;

  const fill  = document.getElementById('quizProgressFill');
  const label = document.getElementById('quizProgressLabel');
  if (fill)  fill.style.width  = Math.round(((idx + 1) / total) * 100) + '%';
  if (label) label.textContent = 'Q ' + (idx + 1) + ' / ' + total;

  const qNum  = document.getElementById('quizQNumber');
  const qText = document.getElementById('quizQText');
  if (qNum)  qNum.textContent  = 'Question ' + (idx + 1);
  if (qText) qText.textContent = q.question;

  const optContainer = document.getElementById('quizOptions');
  if (optContainer) {
    optContainer.innerHTML = '';
    ['A', 'B', 'C', 'D'].forEach(function (letter) {
      if (!q.options[letter]) return;

      const btn = document.createElement('button');
      btn.type  = 'button';
      btn.className = 'quiz-option';
      btn.setAttribute('data-letter', letter);

      const letterBox = document.createElement('span');
      letterBox.className   = 'quiz-option-letter';
      letterBox.textContent = letter;

      const txt = document.createElement('span');
      txt.className   = 'quiz-option-text';
      txt.textContent = q.options[letter];

      btn.appendChild(letterBox);
      btn.appendChild(txt);

      if (quizState.submitted) {
        btn.disabled = true;
        if (letter === q.answer)                    btn.classList.add('correct');
        else if (letter === quizState.answers[idx]) btn.classList.add('wrong');
      } else if (quizState.answers[idx] === letter) {
        btn.classList.add('selected');
      }

      if (!quizState.submitted) {
        btn.addEventListener('click', function () {
          selectQuizOption(idx, letter);
        });
      }

      optContainer.appendChild(btn);
    });
  }

  const feedback = document.getElementById('quizFeedback');
  if (feedback) {
    feedback.textContent = '';
    feedback.className   = 'quiz-feedback';
    if (quizState.submitted) {
      const ua = quizState.answers[idx];
      if (!ua) {
        feedback.textContent = '⚠ You skipped this question.';
        feedback.classList.add('visible', 'wrong-fb');
      } else if (ua === q.answer) {
        feedback.textContent = '✓ Correct!';
        feedback.classList.add('visible', 'correct-fb');
      } else {
        feedback.textContent = '✗ Wrong. Correct answer: ' + q.answer + ') ' + q.options[q.answer];
        feedback.classList.add('visible', 'wrong-fb');
      }
    }
  }

  if (!quizState.submitted && quizState.timePerQ > 0) {
    const timerEl = document.getElementById('quizQTimer');
    if (timerEl) timerEl.classList.remove('quiz-timer-hidden');
    startQuestionTimer(idx, quizState.timePerQ);
  } else {
    if (quizState.questionTimer) clearInterval(quizState.questionTimer);
    const timerEl = document.getElementById('quizQTimer');
    if (timerEl) timerEl.classList.add('quiz-timer-hidden');
  }

  renderDotNav(idx);
  updateQuizNav(idx);
}

function selectQuizOption(qIdx, letter) {
  if (quizState.submitted) return;
  quizState.answers[qIdx] = letter;

  document.querySelectorAll('.quiz-option').forEach(function (btn) {
    btn.classList.toggle('selected', btn.getAttribute('data-letter') === letter);
  });

  renderDotNav(qIdx);

  if (qIdx < quizState.questions.length - 1) {
    setTimeout(function () { quizGoTo(qIdx + 1); }, 380);
  } else {
    updateQuizNav(qIdx);
  }
}

function quizGoTo(idx) {
  if (idx < 0 || idx >= quizState.questions.length) return;
  renderQuizQuestion(idx);
}

function renderDotNav(currentIdx) {
  const nav = document.getElementById('quizDotNav');
  if (!nav) return;
  nav.innerHTML = '';
  quizState.questions.forEach(function (q, i) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Question ' + (i + 1));
    let cls = 'quiz-dot';
    if (i === currentIdx) {
      cls += ' current';
    } else if (quizState.submitted) {
      cls += quizState.answers[i] === q.answer ? ' correct-dot' : ' wrong-dot';
    } else if (quizState.answers[i] !== null) {
      cls += ' answered';
    }
    dot.className = cls;
    dot.addEventListener('click', function () { quizGoTo(i); });
    nav.appendChild(dot);
  });
}

function updateQuizNav(idx) {
  const prevBtn   = document.getElementById('quizPrevBtn');
  const nextBtn   = document.getElementById('quizNextBtn');
  const submitBtn = document.getElementById('quizSubmitBtn');
  const isLast    = idx === quizState.questions.length - 1;

  if (prevBtn)   prevBtn.disabled = idx === 0;
  if (nextBtn)   nextBtn.disabled = isLast;

  if (submitBtn) {
    submitBtn.style.display = (isLast && !quizState.submitted) ? 'flex' : 'none';
  }
}

document.addEventListener('keydown', function (e) {
  const interactive = document.getElementById('quizInteractive');
  if (!interactive || !interactive.classList.contains('visible')) return;
  if (quizState.submitted) return;
  if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;

  if (/^[a-dA-D]$/.test(e.key)) {
    e.preventDefault();
    selectQuizOption(quizState.current, e.key.toUpperCase());
  }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); quizGoTo(quizState.current - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); quizGoTo(quizState.current + 1); }
});

function showQuizError(msg) {
  const el = document.getElementById('quiz-error');
  if (el) { el.textContent = '⚠ ' + msg; el.classList.add('visible'); }
}

function hideQuizError() {
  const el = document.getElementById('quiz-error');
  if (el) { el.textContent = ''; el.classList.remove('visible'); }
}

function resetQuizUI() {
  const interactive = document.getElementById('quizInteractive');
  const results     = document.getElementById('quizResults');
  if (interactive) interactive.classList.remove('visible');
  if (results)     results.classList.remove('visible');

  quizState.questions  = [];
  quizState.answers    = [];
  quizState.current    = 0;
  quizState.submitted  = false;
  quizState.topic      = '';
  if (quizState.questionTimer) {
    clearInterval(quizState.questionTimer);
    quizState.questionTimer = null;
  }

  const timerEl = document.getElementById('quizQTimer');
  if (timerEl)  timerEl.classList.add('quiz-timer-hidden');

  const fill  = document.getElementById('quizProgressFill');
  const label = document.getElementById('quizProgressLabel');
  if (fill)  fill.style.width  = '0%';
  if (label) label.textContent = 'Q 1 / 5';

  const qNum  = document.getElementById('quizQNumber');
  const qText = document.getElementById('quizQText');
  if (qNum)  qNum.textContent  = 'Question 1';
  if (qText) qText.textContent = '';

  const opts = document.getElementById('quizOptions');
  if (opts) opts.innerHTML = '';

  const fb = document.getElementById('quizFeedback');
  if (fb) { fb.textContent = ''; fb.className = 'quiz-feedback'; }

  const dotNav = document.getElementById('quizDotNav');
  if (dotNav) dotNav.innerHTML = '';

  const saveEl = document.getElementById('quizSaveStatus');
  if (saveEl) { saveEl.textContent = ''; saveEl.className = 'quiz-save-status'; }

  hideQuizError();
}

async function submitQuizInteractive() {
  if (quizState.submitted) return;
  if (quizState.questionTimer) {
    clearInterval(quizState.questionTimer);
    quizState.questionTimer = null;
  }

  quizState.submitted = true;
  renderQuizQuestion(quizState.current);

  const total   = quizState.questions.length;
  let correct   = 0;
  let skipped   = 0;

  quizState.questions.forEach(function (q, i) {
    if (!quizState.answers[i])                   skipped++;
    else if (quizState.answers[i] === q.answer)  correct++;
  });

  const wrong = total - correct - skipped;
  const pct   = Math.round((correct / total) * 100);

  const grade =
    pct >= 90 ? 'S (90-100%)' :
    pct >= 80 ? 'A (80-89%)' :
    pct >= 70 ? 'B (70-79%)' :
    pct >= 60 ? 'C (60-69%)' :
    pct >= 50 ? 'D (50-59%)' :
                'F (Below 50%)';

  const gradeColor =
    pct >= 80 ? '#39ff14' :
    pct >= 60 ? '#00e5ff' :
    pct >= 50 ? '#fbbf24' :
                '#ff4d6d';

  const gradeMsg =
    pct >= 90 ? '🏆 Outstanding! You nailed it!'    :
    pct >= 80 ? '🌟 Excellent work! Keep it up!'    :
    pct >= 70 ? '👍 Good job! Almost there!'         :
    pct >= 60 ? '📚 Not bad — keep studying!'        :
    pct >= 50 ? '💪 Keep pushing, you can do it!'   :
                '😅 Need more practice. Try again!';

  const scoreEl = document.getElementById('quizResultsScore');
  const gradeEl = document.getElementById('quizResultsGrade');
  const msgEl   = document.getElementById('quizResultsMsg');
  const corrEl  = document.getElementById('qrbCorrect');
  const wrongEl = document.getElementById('qrbWrong');
  const skipEl  = document.getElementById('qrbSkipped');
  const saveEl  = document.getElementById('quizSaveStatus');

  if (scoreEl) scoreEl.textContent    = correct + '/' + total;
  if (gradeEl) {
    gradeEl.textContent = 'Grade: ' + grade;
    gradeEl.style.color = gradeColor;
  }
  if (msgEl)   msgEl.textContent      = gradeMsg;
  if (corrEl)  corrEl.textContent     = correct;
  if (wrongEl) wrongEl.textContent    = wrong;
  if (skipEl)  skipEl.textContent     = skipped;
  if (saveEl)  {
    saveEl.textContent = 'Saving score…';
    saveEl.className   = 'quiz-save-status';
  }

  // Show results panel
  const interactive = document.getElementById('quizInteractive');
  const results     = document.getElementById('quizResults');
  setTimeout(function () {
    if (interactive) interactive.classList.remove('visible');
    if (results)     results.classList.add('visible');
  }, 500);

  // FIX: correct URL — was /save-quiz-score, must be /submit-quiz-score
  try {
    const res = await fetch('/submit-quiz-score', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        score: correct,          // integer — number of correct answers
        total: total,            // integer — total questions
        topic: quizState.topic || 'General Quiz'
      })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to save.');
    if (saveEl) {
      saveEl.textContent = '✓ Score saved to your performance report!';
      saveEl.className   = 'quiz-save-status saved';
    }
  } catch (err) {
    console.error('[QUIZ SAVE]', err);
    if (saveEl) {
      saveEl.textContent = '⚠ Could not save score: ' + err.message;
      saveEl.className   = 'quiz-save-status error';
    }
  }
}

// ══════════════════════════════════════════════════════════
// CONTENT ANALYZER — supports text + file upload
// ══════════════════════════════════════════════════════════
let _anaFile = null;

function handleAnaFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  _anaFile = file;
  const info = document.getElementById('anaFileInfo');
  if (info) info.textContent = '📎 ' + file.name;
}

function removeAnaFile() {
  _anaFile = null;
  const info  = document.getElementById('anaFileInfo');
  const input = document.getElementById('anaFileInput');
  if (info)  info.textContent = '';
  if (input) input.value = '';
}

async function doAnalyzer() {
  const textEl = document.getElementById('ana-text');
  const text   = textEl ? textEl.value.trim() : '';
  if (!text && !_anaFile) return alert('Please enter some text or upload a file to analyze.');
  hideResult('ana-out');
  setLoading('ana-btn', 'ana-spin', true);
  try {
    let data;
    if (_anaFile) {
      const fd = new FormData();
      fd.append('file', _anaFile);
      if (text) fd.append('text', text);
      const res = await fetch('/analyzer-file', { method: 'POST', body: fd });
      data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed.');
    } else {
      data = await callApi('/analyzer', { text: text });
    }
    showResult('ana-out', data.result);
  } catch (e) {
    showResult('ana-out', e.message, true);
  } finally {
    setLoading('ana-btn', 'ana-spin', false);
    removeAnaFile();
  }
}

// ══════════════════════════════════════════════════════════
// PERFORMANCE ANALYTICS
// ══════════════════════════════════════════════════════════
async function loadAnalytics() {
  setLoading('analytics-btn', 'analytics-spin', true);
  const cards  = document.getElementById('analyticsCards');
  const empty  = document.getElementById('analyticsEmpty');
  const chart  = document.getElementById('analyticsChart');
  const recent = document.getElementById('recentWrap');
  if (cards)  cards.classList.remove('visible');
  if (empty)  empty.classList.remove('visible');
  if (chart)  chart.classList.remove('visible');
  if (recent) recent.classList.remove('visible');

  try {
    const res  = await fetch('/quiz-analytics');
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    if (data.empty) {
      if (empty) empty.classList.add('visible');
      return;
    }

    if (cards) {
      document.getElementById('a-total').textContent  = data.total_attempts;
      document.getElementById('a-avg').textContent    = data.avg_score + '%';
      document.getElementById('a-best').textContent   = data.best_score + '%';
      document.getElementById('a-worst').textContent  = data.worst_score + '%';
      document.getElementById('a-pass').textContent   = data.pass_rate + '%';
      document.getElementById('a-trend').textContent  = data.trend;
      cards.classList.add('visible');
    }
    if (chart && data.chart) { chart.src = data.chart; chart.classList.add('visible'); }

    if (recent && data.recent && data.recent.length) {
      const tbody = document.getElementById('recentBody');
      if (tbody) {
        tbody.innerHTML = '';
        data.recent.forEach(function (r, i) {
          const pct   = r.percentage;
          const cls   = pct >= 80 ? 'excellent' : pct >= 60 ? 'good' : pct >= 40 ? 'average' : 'poor';
          const lbl   = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good'  : pct >= 40 ? 'Average' : 'Needs Work';
          const topic = r.topic.length > 30 ? r.topic.slice(0, 30) + '…' : r.topic;
          const date  = r.taken_at ? r.taken_at.slice(0, 10) : '—';
          const tr    = document.createElement('tr');
          tr.innerHTML =
            '<td>' + (i + 1) + '</td>' +
            '<td title="' + r.topic + '">' + topic + '</td>' +
            '<td>' + r.score + '/' + r.total + '</td>' +
            '<td><strong>' + pct + '%</strong></td>' +
            '<td>' + date + '</td>' +
            '<td><span class="grade-badge grade-badge--' + cls + '">' + lbl + '</span></td>';
          tbody.appendChild(tr);
        });
      }
      recent.classList.add('visible');
    }

  } catch (e) {
    if (empty) {
      const p = empty.querySelector('p');
      if (p) p.textContent = '⚠ ' + e.message;
      empty.classList.add('visible');
    }
  } finally {
    setLoading('analytics-btn', 'analytics-spin', false);
  }
}

/* ══════════════════════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════════════════════ */
(function initCursor() {
  var dot  = document.getElementById('cursorDot');
  var ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  var mx = window.innerWidth / 2;
  var my = window.innerHeight / 2;
  var rx = mx, ry = my;

  document.addEventListener('mousemove', function(e) {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animRing() {
    rx = lerp(rx, mx, 0.12);
    ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  }
  animRing();

  var hoverEls = document.querySelectorAll('a, button, input, textarea, label, .nav-btn');
  hoverEls.forEach(function(el) {
    el.addEventListener('mouseenter', function() { ring.classList.add('hovering'); });
    el.addEventListener('mouseleave', function() { ring.classList.remove('hovering'); });
  });

  document.addEventListener('mouseleave', function() {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', function() {
    dot.style.opacity  = '1';
    ring.style.opacity = '0.6';
  });

  document.addEventListener('mousedown', function() {
    dot.style.transform  = 'translate(-50%,-50%) scale(2.5)';
    ring.style.transform = 'translate(-50%,-50%) scale(0.7)';
  });
  document.addEventListener('mouseup', function() {
    dot.style.transform  = 'translate(-50%,-50%) scale(1)';
    ring.style.transform = 'translate(-50%,-50%) scale(1)';
  });
})();

/* ══════════════════════════════════════════════════════════
   3D TILT CARD
══════════════════════════════════════════════════════════ */
(function initTilt() {
  var cards = document.querySelectorAll('.tilt-card');
  cards.forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect  = card.getBoundingClientRect();
      var cx    = rect.left + rect.width  / 2;
      var cy    = rect.top  + rect.height / 2;
      var dx    = (e.clientX - cx) / (rect.width  / 2);
      var dy    = (e.clientY - cy) / (rect.height / 2);
      var tiltX = dy * -10;
      var tiltY = dx *  10;
      card.style.transform = 'perspective(800px) rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg) scale(1.02)';
    });
    card.addEventListener('mouseleave', function() {
      card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   MAGNETIC BUTTON
══════════════════════════════════════════════════════════ */
(function initMagnetic() {
  var btns = document.querySelectorAll('.magnetic, .btn-submit, .cyber-btn, .tool-btn, .otp-verify-btn');
  btns.forEach(function(btn) {
    btn.addEventListener('mousemove', function(e) {
      var rect = btn.getBoundingClientRect();
      var dx   = (e.clientX - rect.left - rect.width  / 2) * 0.25;
      var dy   = (e.clientY - rect.top  - rect.height / 2) * 0.25;
      btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.transform = '';
    });
  });
})();

/* ══════════════════════════════════════════════════════════
   NEURAL PARTICLES
══════════════════════════════════════════════════════════ */
(function initParticles() {
  var container = document.querySelector('.nc-particles');
  if (!container) return;
  var count  = 28;
  var colors = ['#00e5ff','#ff00ff','#00ffa3','#a78bfa','#ffffff'];
  for (var i = 0; i < count; i++) {
    var p     = document.createElement('div');
    p.className = 'nc-particle';
    var size  = (Math.random() * 3 + 1).toFixed(1);
    var x     = Math.random() * 100;
    var y     = Math.random() * 100;
    var dur   = (Math.random() * 12 + 8).toFixed(1);
    var delay = (Math.random() * 10).toFixed(1);
    var color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText =
      'position:absolute;' +
      'width:'  + size + 'px;' +
      'height:' + size + 'px;' +
      'left:'   + x + '%;' +
      'top:'    + y + '%;' +
      'background:' + color + ';' +
      'border-radius:50%;' +
      'opacity:0;' +
      'pointer-events:none;' +
      'animation:ncParticle ' + dur + 's ' + delay + 's ease-in-out infinite;' +
      'box-shadow:0 0 6px ' + color + ';';
    container.appendChild(p);
  }
})();

(function initScan() {
  var scan = document.querySelector('.nc-scan');
  if (scan) scan.style.display = 'block';
})();