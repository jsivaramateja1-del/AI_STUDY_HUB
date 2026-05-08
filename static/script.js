'use strict';

/* ══════════════════════════════════════════════════════════
   AI STUDY HUB — SCRIPT.JS
   OTP Timer · Sidebar · Summarizer · PDF · Chatbot
   Interactive Quiz (with answer review) · Analyzer · Analytics
   Custom Cursor · Tilt · Magnetic · Particles
══════════════════════════════════════════════════════════ */

// ── OTP ───────────────────────────────────────────────────
function initOtp() {
  var digits  = Array.from(document.querySelectorAll('.otp-digit'));
  var hidden  = document.getElementById('otpHidden');
  var form    = document.getElementById('otpForm');
  var verBtn  = document.getElementById('verifyBtn');
  var timerEl = document.getElementById('otpTimer');
  var subEl   = document.getElementById('otpTimerSub');
  var expEl   = document.getElementById('otpExpiredMsg');

  if (!digits.length) return;
  digits[0].focus();

  // ── 10-minute countdown ──────────────────────────────
  var remaining = 600; // 10 minutes
  if (expEl) expEl.style.display = 'none';

  function updateTimerDisplay() {
    var m = Math.floor(remaining / 60);
    var s = remaining % 60;
    if (timerEl) {
      timerEl.textContent = '⏱ ' + m + ':' + (s < 10 ? '0' : '') + s;
      if (remaining <= 30) {
        timerEl.style.color      = '#ff4d6d';
        timerEl.style.fontWeight = '700';
        timerEl.style.textShadow = '0 0 8px rgba(255,77,109,0.6)';
      } else if (remaining <= 60) {
        timerEl.style.color      = '#ffaa00';
        timerEl.style.fontWeight = 'normal';
        timerEl.style.textShadow = '';
      } else {
        timerEl.style.color      = '';
        timerEl.style.fontWeight = 'normal';
        timerEl.style.textShadow = '';
      }
    }
  }

  updateTimerDisplay();

  var countdown = setInterval(function() {
    remaining--;
    if (remaining <= 0) {
      clearInterval(countdown);
      if (timerEl) { timerEl.textContent = '⏱ 0:00'; timerEl.style.color = '#ff4d6d'; }
      if (subEl)   subEl.textContent     = 'OTP expired';
      if (expEl)   expEl.style.display   = 'block';
      digits.forEach(function(d) { d.disabled = true; });
      if (verBtn)  verBtn.disabled        = true;
      return;
    }
    updateTimerDisplay();
  }, 1000);

  // ── digit sync ───────────────────────────────────────
  function sync() {
    var val = digits.map(function(d) { return d.value; }).join('');
    if (hidden) hidden.value = val;
    digits.forEach(function(d) { d.classList.toggle('filled', d.value !== ''); });
    if (verBtn) verBtn.disabled = (val.length < 6 || remaining <= 0);
    if (val.length === 6 && form && remaining > 0) {
      setTimeout(function() { form.requestSubmit(); }, 220);
    }
  }

  digits.forEach(function(d, i) {
    d.addEventListener('input', function() {
      d.value = d.value.replace(/\D/g, '').slice(-1);
      sync();
      if (d.value && i < digits.length - 1) digits[i + 1].focus();
    });
    d.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace' && !d.value && i > 0) {
        digits[i-1].focus(); digits[i-1].value = ''; sync();
      }
      if (e.key === 'ArrowLeft'  && i > 0)               digits[i-1].focus();
      if (e.key === 'ArrowRight' && i < digits.length-1) digits[i+1].focus();
    });
    d.addEventListener('paste', function(e) {
      e.preventDefault();
      var p = (e.clipboardData || window.clipboardData).getData('text')
                .replace(/\D/g, '').slice(0, 6);
      p.split('').forEach(function(ch, j) { if (digits[j]) digits[j].value = ch; });
      sync();
      var nxt = digits.find(function(x) { return !x.value; });
      (nxt || digits[digits.length-1]).focus();
    });
  });

  if (verBtn) verBtn.disabled = true;
  sync();

  if (form) {
    form.addEventListener('submit', function() {
      clearInterval(countdown);
      if (verBtn) {
        var ring = verBtn.querySelector('.btn-ring');
        var lbl  = verBtn.querySelector('.btn-label');
        if (ring) ring.style.display = 'block';
        if (lbl)  lbl.textContent    = 'Verifying…';
        verBtn.disabled = true;
      }
    });
  }
}

// standalone timer — kept for backward compat but now a no-op
// (initOtp handles everything)
function startOtpTimer() {}

// ── SIDEBAR ───────────────────────────────────────────────
function openSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('visible');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeSidebar();
});

// ── TOOL SWITCHER ─────────────────────────────────────────
function showTool(id, btn) {
  document.querySelectorAll('.tool-panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  var panel = document.getElementById('tool-' + id);
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');
  if (window.innerWidth <= 960) closeSidebar();
  if (id === 'analytics') loadAnalytics();
}

// ── HELPERS ───────────────────────────────────────────────
function setLoading(btnId, spinnerId, on) {
  var btn = document.getElementById(btnId);
  var sp  = document.getElementById(spinnerId);
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
    .replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>)|$)/g, function(m, p1) {
      return '<ul>' + p1 + '</ul>';
    })
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

function showResult(id, text, isErr) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('result--error');
  if (isErr) {
    el.textContent = '⚠ ' + text;
    el.classList.add('result--error');
  } else {
    el.innerHTML = '<p>' + renderMarkdown(text) + '</p>';
  }
  el.classList.add('visible');
}

function hideResult(id) {
  var el = document.getElementById(id);
  if (el) { el.textContent = ''; el.classList.remove('visible', 'result--error'); }
}

async function callApi(url, payload) {
  var res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
  var data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Request failed.');
  return data;
}

function showToast(msg, type) {
  var existing = document.getElementById('globalToast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'globalToast';
  toast.style.cssText =
    'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);' +
    'padding:14px 24px;border-radius:12px;font-size:.88rem;font-weight:600;' +
    'z-index:9999;animation:fadeUp .3s ease;max-width:90vw;text-align:center;' +
    (type === 'error'
      ? 'background:rgba(255,77,109,.12);border:1px solid rgba(255,77,109,.35);color:#ff4d6d;'
      : 'background:rgba(57,255,20,.1);border:1px solid rgba(57,255,20,.3);color:#39ff14;');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 3500);
}

// ══════════════════════════════════════════════════════════
// SUMMARIZER
// ══════════════════════════════════════════════════════════
var _sumFile = null;

function handleSumFile(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  _sumFile = file;
  var info = document.getElementById('sumFileInfo');
  if (info) info.textContent = '📎 ' + file.name;
}

function removeSumFile() {
  _sumFile = null;
  var info  = document.getElementById('sumFileInfo');
  var input = document.getElementById('sumFileInput');
  if (info)  info.textContent = '';
  if (input) input.value = '';
}

async function doSummarize() {
  var textEl = document.getElementById('sum-text');
  var text   = textEl ? textEl.value.trim() : '';
  if (!text && !_sumFile) {
    showToast('Please enter some text or upload a file to summarize.', 'error');
    return;
  }
  hideResult('sum-out');
  setLoading('sum-btn', 'sum-spin', true);
  try {
    var data;
    if (_sumFile) {
      var fd = new FormData();
      fd.append('file', _sumFile);
      if (text) fd.append('text', text);
      var res = await fetch('/summarize-file', { method: 'POST', body: fd });
      data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed.');
    } else {
      data = await callApi('/summarize', { text: text });
    }
    showResult('sum-out', data.summary);
  } catch(e) {
    showResult('sum-out', e.message, true);
    showToast(e.message, 'error');
  } finally {
    setLoading('sum-btn', 'sum-spin', false);
    removeSumFile();
  }
}

// ══════════════════════════════════════════════════════════
// PDF SUMMARIZER
// ══════════════════════════════════════════════════════════
var _pdfFile = null;

function handlePdfSelect(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  _pdfFile = file;
  var info = document.getElementById('pdfFileInfo');
  var zone = document.getElementById('pdfDropZone');
  if (info) info.textContent = '📄 ' + file.name;
  if (zone) {
    var txt = zone.querySelector('.upload-txt');
    if (txt) txt.textContent = file.name;
  }
}

async function doPdfSummarize() {
  if (!_pdfFile) {
    showToast('Please select a PDF file first.', 'error');
    return;
  }
  hideResult('pdf-out');
  setLoading('pdf-btn', 'pdf-spin', true);
  try {
    var fd  = new FormData();
    fd.append('pdf', _pdfFile);
    var res  = await fetch('/pdf-summarize', { method: 'POST', body: fd });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'PDF summarization failed.');
    var info = data.pages ? '\n\n_(' + data.extracted + ' of ' + data.pages + ' pages processed)_' : '';
    showResult('pdf-out', data.summary + info);
  } catch(e) {
    showResult('pdf-out', e.message, true);
    showToast(e.message, 'error');
  } finally {
    setLoading('pdf-btn', 'pdf-spin', false);
  }
}

// ══════════════════════════════════════════════════════════
// CHATBOT
// ══════════════════════════════════════════════════════════
var _chatFile            = null;
var _chatFileText        = '';
var _chatPendingQuizFile = null;

function handleChatFile(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  _chatFile     = file;
  _chatFileText = '';
  var preview = document.getElementById('chatFilePreview');
  var nameEl  = document.getElementById('chatFileName');
  var iconEl  = document.getElementById('chatFileIcon');
  if (preview) preview.classList.add('visible');
  if (nameEl)  nameEl.textContent = file.name;
  var fname = file.name.toLowerCase();
  var icon  = '📎';
  if (fname.endsWith('.pdf'))                              icon = '📄';
  else if (/\.(png|jpg|jpeg|gif|webp)$/.test(fname))      icon = '🖼️';
  else if (/\.(py|js|ts|java|cpp|c|go|rs)$/.test(fname)) icon = '💻';
  else if (/\.(txt|md|csv|docx|xml|json)$/.test(fname))  icon = '📝';
  if (iconEl) iconEl.textContent = icon;
}

function removeChatFile() {
  _chatFile     = null;
  _chatFileText = '';
  var preview = document.getElementById('chatFilePreview');
  var input   = document.getElementById('chatFileInput');
  if (preview) preview.classList.remove('visible');
  if (input)   input.value = '';
}

function appendBotWithActions(container, text, actions) {
  var wrap   = document.createElement('div');
  wrap.className = 'chat-msg chat-msg--bot';
  var avatar = document.createElement('div');
  avatar.className = 'chat-avatar'; avatar.setAttribute('aria-hidden','true');
  avatar.textContent = '🤖';
  var bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  var textSpan = document.createElement('span');
  textSpan.innerHTML = renderMarkdown(text);
  bubble.appendChild(textSpan);
  if (actions && actions.length) {
    var row = document.createElement('div');
    row.className = 'chat-action-row';
    actions.forEach(function(a) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'chat-action-btn';
      btn.textContent = a.label;
      btn.addEventListener('click', function() {
        row.querySelectorAll('.chat-action-btn').forEach(function(b) {
          b.disabled = true;
          b.classList.toggle('chat-action-chosen', b === btn);
        });
        a.action();
      });
      row.appendChild(btn);
    });
    bubble.appendChild(row);
  }
  wrap.appendChild(avatar); wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

async function doChat() {
  var inp = document.getElementById('chatInput');
  var msg = inp ? inp.value.trim() : '';
  if (!msg && !_chatFile) return;

  var win     = document.getElementById('chatWindow');
  var sendBtn = document.querySelector('.chat-send');

  if (!_chatFile && _chatPendingQuizFile && msg) {
    appendMsg(win, msg, 'user');
    inp.value    = '';
    inp.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    var typing      = appendTyping(win);
    var fileForQuiz = _chatPendingQuizFile;
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

  var displayMsg = msg + (_chatFile ? ' 📎 ' + _chatFile.name : '');
  appendMsg(win, displayMsg, 'user');
  inp.value    = '';
  inp.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  var typing       = appendTyping(win);
  var fileAttached = !!_chatFile;
  var attachedFile = _chatFile;

  try {
    var data;
    if (_chatFile) {
      var fd = new FormData();
      fd.append('message', msg || 'Please read and describe this file.');
      fd.append('file', _chatFile);
      var res = await fetch('/chat', { method: 'POST', body: fd });
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
      var capturedFile = attachedFile;
      appendBotWithActions(win,
        '✨ Want to create a quiz from this file? Tell me what to focus on, or say "everything".',
        [
          {
            label: '🎯 Yes, create a quiz!',
            action: function() {
              _chatPendingQuizFile = capturedFile;
              appendMsg(win, '📝 What should the quiz focus on? (e.g. "key concepts") — or say "everything".', 'bot');
              inp.focus();
            }
          },
          { label: '❌ No thanks', action: function() { appendMsg(win, '👍 Got it!', 'bot'); } }
        ]
      );
    }
  } catch(e) {
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
    var fd = new FormData();
    fd.append('file', file);
    fd.append('instruction', instruction === 'everything' ? '' : instruction);
    var res  = await fetch('/quiz-from-file', { method: 'POST', body: fd });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to generate quiz.');
    var questions = parseQuizText(data.quiz);
    if (!questions.length) throw new Error('Could not parse quiz. Please try again.');
    var quizNavBtn = document.querySelector('.nav-btn[onclick*="quiz"]');
    showTool('quiz', quizNavBtn);
    // FIX: resetQuizUI FIRST (it wipes quizState), THEN set state, THEN render
    resetQuizUI();
    quizState.questions = questions;
    quizState.answers   = new Array(questions.length).fill(null);
    quizState.current   = 0;
    quizState.submitted = false;
    quizState.topic     = data.topic || file.name;
    quizState.timePerQ  = 0;
    renderQuizQuestion(0);
    var interactive = document.getElementById('quizInteractive');
    if (interactive) interactive.classList.add('visible');
    appendMsg(win, '✅ Quiz ready! Switched to the Quiz tab — good luck! 🎯', 'bot');
  } catch(e) {
    appendMsg(win, '⚠ ' + e.message, 'bot');
  }
}

function appendMsg(container, text, role) {
  var wrap   = document.createElement('div');
  wrap.className = 'chat-msg chat-msg--' + role;
  var avatar = document.createElement('div');
  avatar.className = 'chat-avatar'; avatar.setAttribute('aria-hidden','true');
  avatar.textContent = role === 'bot' ? '🤖' : '🎓';
  var bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  if (role === 'bot') {
    bubble.innerHTML = '<p>' + renderMarkdown(text) + '</p>';
  } else {
    bubble.textContent = text;
  }
  wrap.appendChild(avatar); wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

function appendTyping(container) {
  var wrap   = document.createElement('div');
  wrap.className = 'chat-msg chat-msg--bot';
  var avatar = document.createElement('div');
  avatar.className = 'chat-avatar'; avatar.setAttribute('aria-hidden','true');
  avatar.textContent = '🤖';
  var bubble = document.createElement('div');
  bubble.className = 'chat-bubble typing-dots';
  for (var i = 0; i < 3; i++) {
    var dot = document.createElement('span');
    dot.className = 'typing-dot';
    bubble.appendChild(dot);
  }
  wrap.appendChild(avatar); wrap.appendChild(bubble);
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
  return wrap;
}

// ══════════════════════════════════════════════════════════
// QUIZ — fully interactive with answer review
// ══════════════════════════════════════════════════════════
var quizState = {
  questions:     [],
  answers:       [],
  current:       0,
  submitted:     false,
  topic:         '',
  timePerQ:      0,
  questionTimer: null
};

var _quizPdfFile = null;

function switchQuizTab(tab, clickedBtn) {
  document.querySelectorAll('.quiz-tab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.quiz-source-pane').forEach(function(p) { p.classList.remove('active'); });
  if (clickedBtn) clickedBtn.classList.add('active');
  var key  = tab.charAt(0).toUpperCase() + tab.slice(1);
  var pane = document.getElementById('quizPane' + key);
  if (pane) pane.classList.add('active');
}

function handleQuizFile(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  _quizPdfFile = file;
  var info  = document.getElementById('quizPdfInfo');
  var label = document.querySelector('#quizPanePdf .quiz-pdf-label');
  if (info)  info.textContent  = '📎 ' + file.name;
  if (label) label.textContent = file.name;
}

function parseQuizText(raw) {
  var questions = [];
  var blocks    = raw.trim().split(/\n\s*\n(?=Q\d+\.)/);
  blocks.forEach(function(block) {
    block = block.trim();
    if (!block) return;
    var qMatch = block.match(/^Q\d+\.\s*(.+?)(?=\n[A-D][).])/s);
    if (!qMatch) return;
    var questionText = qMatch[1].trim().replace(/\s+/g, ' ');
    var options  = {};
    var optRegex = /^([A-D])[).]\s*(.+)$/gm;
    var m;
    while ((m = optRegex.exec(block)) !== null) { options[m[1]] = m[2].trim(); }
    var ansMatch = block.match(/^Answer:\s*([A-D])/im);
    if (!ansMatch) return;
    var correct = ansMatch[1].toUpperCase();
    if (Object.keys(options).length >= 2) {
      questions.push({ question: questionText, options: options, answer: correct });
    }
  });
  return questions;
}

function startQuestionTimer(qIdx, seconds) {
  if (quizState.questionTimer) clearInterval(quizState.questionTimer);
  var timerEl   = document.getElementById('quizQTimer');
  if (!timerEl) return;
  var remaining = seconds;
  function tick() {
    timerEl.textContent = '⏱ ' + remaining + 's';
    if (remaining <= 5)       { timerEl.style.color = '#ff4d6d'; timerEl.style.fontWeight = '700'; }
    else if (remaining <= 10) { timerEl.style.color = '#ffaa00'; timerEl.style.fontWeight = 'normal'; }
    else                      { timerEl.style.color = '#00e5ff'; timerEl.style.fontWeight = 'normal'; }
    if (remaining <= 0) {
      clearInterval(quizState.questionTimer);
      timerEl.textContent = '⏱ Time up!';
      if (qIdx < quizState.questions.length - 1) {
        setTimeout(function() { quizGoTo(qIdx + 1); }, 700);
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

  var activePane = document.querySelector('.quiz-source-pane.active');
  var isFileTab  = activePane && activePane.id === 'quizPanePdf';

  var numQEl   = document.getElementById('quiz-num-questions');
  var timeEl   = document.getElementById('quiz-time-per-q');
  var diffEl   = document.getElementById('quiz-difficulty');
  var numQ     = numQEl  ? (parseInt(numQEl.value)  || 5) : 5;
  var timePerQ = timeEl  ? (parseInt(timeEl.value)  || 0) : 0;
  var diff     = diffEl  ? diffEl.value : 'medium';

  setLoading('quiz-btn', 'quiz-spin', true);
  var btnLabel = document.getElementById('quiz-btn-label');
  if (btnLabel) btnLabel.textContent = 'Generating…';

  try {
    var rawQuiz = '', topic = '';

    if (isFileTab) {
      if (!_quizPdfFile) { showQuizError('Please upload a file first.'); return; }
      var fd = new FormData();
      fd.append('file', _quizPdfFile);
      fd.append('instruction', '');
      fd.append('num_questions', numQ);
      fd.append('difficulty', diff);
      var res  = await fetch('/quiz-from-file', { method: 'POST', body: fd });
      var data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      rawQuiz = data.quiz;
      topic   = data.topic || _quizPdfFile.name;
    } else {
      var textEl = document.getElementById('quiz-text');
      var text   = textEl ? textEl.value.trim() : '';
      if (!text) { showQuizError('Please paste some study material first.'); return; }
      var d = await callApi('/quiz', { text: text, num_questions: numQ, difficulty: diff });
      rawQuiz = d.quiz;
      topic   = d.topic || text.slice(0, 60);
    }

    var questions = parseQuizText(rawQuiz);
    if (!questions.length) { showQuizError('Could not parse quiz questions. Please try again.'); return; }

    quizState.questions = questions;
    quizState.answers   = new Array(questions.length).fill(null);
    quizState.current   = 0;
    quizState.submitted = false;
    quizState.topic     = topic;
    quizState.timePerQ  = timePerQ;

    renderQuizQuestion(0);
    var interactive = document.getElementById('quizInteractive');
    if (interactive) interactive.classList.add('visible');

  } catch(e) {
    showQuizError(e.message);
    showToast(e.message, 'error');
  } finally {
    setLoading('quiz-btn', 'quiz-spin', false);
    if (btnLabel) btnLabel.textContent = 'Generate Quiz';
  }
}

function renderQuizQuestion(idx) {
  if (!quizState.questions[idx]) return;
  quizState.current = idx;
  var q     = quizState.questions[idx];
  var total = quizState.questions.length;

  var fill  = document.getElementById('quizProgressFill');
  var label = document.getElementById('quizProgressLabel');
  if (fill)  fill.style.width  = Math.round(((idx + 1) / total) * 100) + '%';
  if (label) label.textContent = 'Q ' + (idx + 1) + ' / ' + total;

  var qNum  = document.getElementById('quizQNumber');
  var qText = document.getElementById('quizQText');
  if (qNum)  qNum.textContent  = 'Question ' + (idx + 1);
  if (qText) qText.textContent = q.question;

  // ── Render options ────────────────────────────────────
  var optContainer = document.getElementById('quizOptions');
  if (optContainer) {
    optContainer.innerHTML = '';
    ['A','B','C','D'].forEach(function(letter) {
      if (!q.options[letter]) return;
      var btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'quiz-option';
      btn.setAttribute('data-letter', letter);

      var letterBox = document.createElement('span');
      letterBox.className   = 'quiz-option-letter';
      letterBox.textContent = letter;

      var txt = document.createElement('span');
      txt.className   = 'quiz-option-text';
      txt.textContent = q.options[letter];

      // FIX: show correct/wrong icon in review mode
      var icon = document.createElement('span');
      icon.className = 'quiz-option-icon';

      btn.appendChild(letterBox);
      btn.appendChild(txt);
      btn.appendChild(icon);

      if (quizState.submitted) {
        btn.disabled = true;
        if (letter === q.answer) {
          btn.classList.add('correct');
          icon.textContent = '✓';
        } else if (letter === quizState.answers[idx]) {
          btn.classList.add('wrong');
          icon.textContent = '✗';
        }
      } else if (quizState.answers[idx] === letter) {
        btn.classList.add('selected');
      }

      if (!quizState.submitted) {
        btn.addEventListener('click', function() { selectQuizOption(idx, letter); });
      }
      optContainer.appendChild(btn);
    });
  }

  // ── Feedback ─────────────────────────────────────────
  var feedback = document.getElementById('quizFeedback');
  if (feedback) {
    feedback.textContent = '';
    feedback.className   = 'quiz-feedback';
    if (quizState.submitted) {
      var ua = quizState.answers[idx];
      if (!ua) {
        feedback.innerHTML   = '⚠ You skipped this question. The correct answer was <strong>' + q.answer + ') ' + q.options[q.answer] + '</strong>';
        feedback.classList.add('visible', 'wrong-fb');
      } else if (ua === q.answer) {
        feedback.textContent = '✓ Correct! Well done.';
        feedback.classList.add('visible', 'correct-fb');
      } else {
        feedback.innerHTML   = '✗ Wrong. The correct answer is <strong>' + q.answer + ') ' + q.options[q.answer] + '</strong>';
        feedback.classList.add('visible', 'wrong-fb');
      }
    }
  }

  // Per-question timer
  if (!quizState.submitted && quizState.timePerQ > 0) {
    var timerEl = document.getElementById('quizQTimer');
    if (timerEl) timerEl.classList.remove('quiz-timer-hidden');
    startQuestionTimer(idx, quizState.timePerQ);
  } else {
    if (quizState.questionTimer) clearInterval(quizState.questionTimer);
    var te = document.getElementById('quizQTimer');
    if (te) te.classList.add('quiz-timer-hidden');
  }

  renderDotNav(idx);
  updateQuizNav(idx);
}

function selectQuizOption(qIdx, letter) {
  if (quizState.submitted) return;
  quizState.answers[qIdx] = letter;
  document.querySelectorAll('.quiz-option').forEach(function(btn) {
    btn.classList.toggle('selected', btn.getAttribute('data-letter') === letter);
    btn.querySelector('.quiz-option-icon').textContent = '';
  });
  renderDotNav(qIdx);
  if (qIdx < quizState.questions.length - 1) {
    setTimeout(function() { quizGoTo(qIdx + 1); }, 380);
  } else {
    updateQuizNav(qIdx);
  }
}

function quizGoTo(idx) {
  if (idx < 0 || idx >= quizState.questions.length) return;
  renderQuizQuestion(idx);
}

function renderDotNav(currentIdx) {
  var nav = document.getElementById('quizDotNav');
  if (!nav) return;
  nav.innerHTML = '';
  quizState.questions.forEach(function(q, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Question ' + (i + 1));
    var cls = 'quiz-dot';
    if (i === currentIdx) {
      cls += ' current';
    } else if (quizState.submitted) {
      cls += (quizState.answers[i] === q.answer) ? ' correct-dot' : ' wrong-dot';
    } else if (quizState.answers[i] !== null) {
      cls += ' answered';
    }
    dot.className = cls;
    dot.addEventListener('click', function() { quizGoTo(i); });
    nav.appendChild(dot);
  });
}

function updateQuizNav(idx) {
  var prevBtn   = document.getElementById('quizPrevBtn');
  var nextBtn   = document.getElementById('quizNextBtn');
  var submitBtn = document.getElementById('quizSubmitBtn');
  var isLast    = idx === quizState.questions.length - 1;
  if (prevBtn)   prevBtn.disabled = (idx === 0);
  if (nextBtn)   nextBtn.disabled = isLast;
  if (submitBtn) submitBtn.style.display = (isLast && !quizState.submitted) ? 'flex' : 'none';
}

// Keyboard nav
document.addEventListener('keydown', function(e) {
  var interactive = document.getElementById('quizInteractive');
  if (!interactive || !interactive.classList.contains('visible')) return;
  if (quizState.submitted) return;
  if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
  if (/^[a-dA-D]$/.test(e.key)) {
    e.preventDefault();
    var letter = e.key.toUpperCase();
    var q = quizState.questions[quizState.current];
    if (q && q.options[letter]) selectQuizOption(quizState.current, letter);
  }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); quizGoTo(quizState.current - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); quizGoTo(quizState.current + 1); }
});

async function submitQuizInteractive() {
  if (quizState.submitted) return;
  if (quizState.questionTimer) {
    clearInterval(quizState.questionTimer);
    quizState.questionTimer = null;
  }
  quizState.submitted = true;

  // Re-render current question to show correct/wrong
  renderQuizQuestion(quizState.current);

  var total   = quizState.questions.length;
  var correct = 0, skipped = 0;
  quizState.questions.forEach(function(q, i) {
    if (!quizState.answers[i])                    skipped++;
    else if (quizState.answers[i] === q.answer)   correct++;
  });
  var wrong = total - correct - skipped;
  var pct   = Math.round((correct / total) * 100);

  var grade =
    pct >= 90 ? 'S (90-100%)' :
    pct >= 80 ? 'A (80-89%)' :
    pct >= 70 ? 'B (70-79%)' :
    pct >= 60 ? 'C (60-69%)' :
    pct >= 50 ? 'D (50-59%)' :
                'F (Below 50%)';

  var gradeColor =
    pct >= 80 ? '#39ff14' :
    pct >= 60 ? '#00e5ff' :
    pct >= 50 ? '#ffaa00' :
                '#ff4d6d';

  var gradeMsg =
    pct >= 90 ? '🏆 Outstanding! You nailed it!'   :
    pct >= 80 ? '🌟 Excellent work! Keep it up!'   :
    pct >= 70 ? '👍 Good job! Almost there!'        :
    pct >= 60 ? '📚 Not bad — keep studying!'       :
    pct >= 50 ? '💪 Keep pushing, you can do it!'  :
                '😅 Need more practice — try again!';

  var scoreEl = document.getElementById('quizResultsScore');
  var gradeEl = document.getElementById('quizResultsGrade');
  var msgEl   = document.getElementById('quizResultsMsg');
  var corrEl  = document.getElementById('qrbCorrect');
  var wrongEl = document.getElementById('qrbWrong');
  var skipEl  = document.getElementById('qrbSkipped');
  var saveEl  = document.getElementById('quizSaveStatus');

  if (scoreEl) scoreEl.textContent = correct + '/' + total;
  if (gradeEl) { gradeEl.textContent = 'Grade: ' + grade; gradeEl.style.color = gradeColor; }
  if (msgEl)   msgEl.textContent    = gradeMsg;
  if (corrEl)  corrEl.textContent   = correct;
  if (wrongEl) wrongEl.textContent  = wrong;
  if (skipEl)  skipEl.textContent   = skipped;
  if (saveEl)  { saveEl.textContent = 'Saving…'; saveEl.className = 'quiz-save-status'; }

  // Show results
  var interactive = document.getElementById('quizInteractive');
  var results     = document.getElementById('quizResults');
  setTimeout(function() {
    if (interactive) interactive.classList.remove('visible');
    if (results)     results.classList.add('visible');
    renderAnswerReview();
  }, 500);

  // Save score
  try {
    var res  = await fetch('/submit-quiz-score', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        score:     correct,
        total:     total,
        topic:     quizState.topic || 'General Quiz',
        questions: quizState.questions,
        answers:   quizState.answers
      })
    });
    var data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to save.');
    if (saveEl) {
      saveEl.textContent = '✓ Score saved to your performance report!';
      saveEl.className   = 'quiz-save-status saved';
    }
  } catch(err) {
    if (saveEl) {
      saveEl.textContent = '⚠ Could not save: ' + err.message;
      saveEl.className   = 'quiz-save-status error';
    }
  }
}

async function renderAnswerReview() {
  var section  = document.getElementById('quizReviewSection');
  var loading  = document.getElementById('quizReviewLoading');
  var list     = document.getElementById('quizReviewList');
  if (!section || !list) return;

  section.style.display = 'block';
  if (loading) loading.style.display = 'flex';
  list.innerHTML = '';

  var questions = quizState.questions;
  var answers   = quizState.answers;

  var explanations = [];
  try {
    var res = await fetch('/quiz-explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questions: questions,
        answers:   answers
      })
    });
    var data = await res.json();
    if (data.explanations) {
      explanations = data.explanations;
    } else if (data.raw) {
      // Groq returned non-JSON — show raw as fallback text per question
      explanations = questions.map(function() { return { why_correct: data.raw }; });
    }
  } catch(e) {
    // silently fail — cards still show correct answers without explanation
  }

  if (loading) loading.style.display = 'none';

  questions.forEach(function(q, i) {
    var userAns   = answers[i];
    var isCorrect = userAns === q.answer;
    var isSkipped = !userAns;

    var card = document.createElement('div');
    card.className = 'quiz-review-card ' + (isCorrect ? 'review-correct' : isSkipped ? 'review-skipped' : 'review-wrong');

    var optionsHtml = Object.keys(q.options).map(function(letter) {
      var cls  = '';
      if (letter === q.answer)                 cls = 'review-opt-correct';
      else if (letter === userAns && !isCorrect) cls = 'review-opt-wrong';
      var mark = (letter === q.answer) ? ' ✓' : (letter === userAns && !isCorrect) ? ' ✗' : '';
      return '<div class="review-opt ' + cls + '"><span class="review-opt-letter">' + letter + '</span>' + q.options[letter] + '<span class="review-opt-mark">' + mark + '</span></div>';
    }).join('');

    var exp = explanations[i] || null;

    // Build explanation HTML from structured data
    var explanationHtml = '';
    if (exp) {
      // Why wrong options
      var wrongOptHtml = '';
      if (exp.why_wrong) {
        var wrongEntries = Object.keys(exp.why_wrong)
          .filter(function(l) { return l !== q.answer; })
          .map(function(l) {
            return '<div class="review-why-wrong-item">' +
              '<span class="review-wrong-letter">' + l + '</span>' +
              '<span>' + exp.why_wrong[l] + '</span>' +
            '</div>';
          }).join('');
        if (wrongEntries) {
          wrongOptHtml =
            '<div class="review-exp-row">' +
              '<div class="review-exp-label review-exp-label--red">❌ WHY OTHERS ARE WRONG</div>' +
              '<div class="review-why-wrong-list">' + wrongEntries + '</div>' +
            '</div>';
        }
      }
      explanationHtml =
        '<div class="review-exp-block">' +
          '<div class="review-exp-divider"><span>💡 Explanation</span></div>' +

          (exp.concept
            ? '<div class="review-exp-row">' +
                '<div class="review-exp-label review-exp-label--purple">📌 CONCEPT</div>' +
                '<div class="review-exp-text">' + exp.concept + '</div>' +
              '</div>'
            : '') +

          (exp.why_correct
            ? '<div class="review-exp-row">' +
                '<div class="review-exp-label review-exp-label--cyan">✅ WHY IT\'S CORRECT</div>' +
                '<div class="review-exp-text review-exp-text--bright">' + exp.why_correct + '</div>' +
              '</div>'
            : '') +

          wrongOptHtml +

          (exp.key_takeaway
            ? '<div class="review-exp-row review-exp-takeaway-row">' +
                '<div class="review-exp-label review-exp-label--green">🔑 KEY TAKEAWAY</div>' +
                '<div class="review-exp-text review-exp-text--green">' + exp.key_takeaway + '</div>' +
              '</div>'
            : '') +

        '</div>';
    }

    var yourAnswerHtml = isSkipped
      ? '<span class="review-your-ans skipped">Not answered</span>'
      : '<span class="review-your-ans ' + (isCorrect ? 'ans-correct' : 'ans-wrong') + '">' + userAns + ') ' + q.options[userAns] + '</span>';

    card.innerHTML =
      '<div class="review-card-header">' +
        '<span class="review-q-num">Q' + (i + 1) + '</span>' +
        '<span class="review-status ' + (isCorrect ? 'status-correct' : isSkipped ? 'status-skipped' : 'status-wrong') + '">' +
          (isCorrect ? '✅ Correct' : isSkipped ? '⚠️ Skipped' : '❌ Incorrect') +
        '</span>' +
      '</div>' +
      '<div class="review-question">' + q.question + '</div>' +
      '<div class="review-opts">' + optionsHtml + '</div>' +
      '<div class="review-answer-row"><span class="review-label">Your answer:</span>' + yourAnswerHtml + '</div>' +
      '<div class="review-answer-row"><span class="review-label">Correct answer:</span><span class="review-correct-ans">' + q.answer + ') ' + q.options[q.answer] + '</span></div>' +
      explanationHtml;
    list.appendChild(card);
  });
}
function showQuizError(msg) {
  var el = document.getElementById('quiz-error');
  if (el) { el.textContent = '⚠ ' + msg; el.classList.add('visible'); }
}

function hideQuizError() {
  var el = document.getElementById('quiz-error');
  if (el) { el.textContent = ''; el.classList.remove('visible'); }
}

function resetQuizUI() {
  var interactive = document.getElementById('quizInteractive');
  var results     = document.getElementById('quizResults');
  if (interactive) interactive.classList.remove('visible');
  if (results)     results.classList.remove('visible');

  quizState.questions  = [];
  quizState.answers    = [];
  quizState.current    = 0;
  quizState.submitted  = false;
  quizState.topic      = '';
  if (quizState.questionTimer) { clearInterval(quizState.questionTimer); quizState.questionTimer = null; }

  var timerEl = document.getElementById('quizQTimer');
  if (timerEl) timerEl.classList.add('quiz-timer-hidden');

  var fill  = document.getElementById('quizProgressFill');
  var label = document.getElementById('quizProgressLabel');
  if (fill)  fill.style.width  = '0%';
  if (label) label.textContent = 'Q 1 / 5';

  var qText = document.getElementById('quizQText');
  var opts  = document.getElementById('quizOptions');
  var fb    = document.getElementById('quizFeedback');
  var dots  = document.getElementById('quizDotNav');
  var save  = document.getElementById('quizSaveStatus');
  if (qText) qText.textContent = '';
  if (opts)  opts.innerHTML    = '';
  if (fb)    { fb.textContent = ''; fb.className = 'quiz-feedback'; }
  if (dots)  dots.innerHTML   = '';
  if (save)  { save.textContent = ''; save.className = 'quiz-save-status'; }

  var reviewSection = document.getElementById('quizReviewSection');
  var reviewList    = document.getElementById('quizReviewList');
  var reviewLoading = document.getElementById('quizReviewLoading');
  if (reviewSection) reviewSection.style.display = 'none';
  if (reviewList)    reviewList.innerHTML = '';
  if (reviewLoading) reviewLoading.style.display = 'none';

  hideQuizError();
}

// ══════════════════════════════════════════════════════════
// CONTENT ANALYZER
// ══════════════════════════════════════════════════════════
var _anaFile = null;

function handleAnaFile(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  _anaFile = file;
  var info = document.getElementById('anaFileInfo');
  if (info) info.textContent = '📎 ' + file.name;
}

function removeAnaFile() {
  _anaFile = null;
  var info  = document.getElementById('anaFileInfo');
  var input = document.getElementById('anaFileInput');
  if (info)  info.textContent = '';
  if (input) input.value = '';
}

async function doAnalyzer() {
  var textEl = document.getElementById('ana-text');
  var text   = textEl ? textEl.value.trim() : '';
  if (!text && !_anaFile) {
    showToast('Please enter some text or upload a file to analyze.', 'error');
    return;
  }
  hideResult('ana-out');
  setLoading('ana-btn', 'ana-spin', true);
  try {
    var data;
    if (_anaFile) {
      var fd = new FormData();
      fd.append('file', _anaFile);
      if (text) fd.append('text', text);
      var res = await fetch('/analyzer-file', { method: 'POST', body: fd });
      data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed.');
    } else {
      data = await callApi('/analyzer', { text: text });
    }
    showResult('ana-out', data.result);
  } catch(e) {
    showResult('ana-out', e.message, true);
    showToast(e.message, 'error');
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
  var cards  = document.getElementById('analyticsCards');
  var empty  = document.getElementById('analyticsEmpty');
  var chart  = document.getElementById('analyticsChart');
  var recent = document.getElementById('recentWrap');
  if (cards)  cards.classList.remove('visible');
  if (empty)  empty.classList.remove('visible');
  if (chart)  chart.classList.remove('visible');
  if (recent) recent.classList.remove('visible');

  try {
    var res  = await fetch('/quiz-analytics');
    var data = await res.json();
    if (data.error) throw new Error(data.error);

    if (data.empty) {
      if (empty) empty.classList.add('visible');
      return;
    }

    if (cards) {
      document.getElementById('a-total').textContent = data.total_attempts;
      document.getElementById('a-avg').textContent   = data.avg_score + '%';
      document.getElementById('a-best').textContent  = data.best_score + '%';
      document.getElementById('a-worst').textContent = data.worst_score + '%';
      document.getElementById('a-pass').textContent  = data.pass_rate + '%';
      document.getElementById('a-trend').textContent = data.trend;
      cards.classList.add('visible');
    }

    if (chart && data.chart) { chart.src = data.chart; chart.classList.add('visible'); }

    if (recent && data.recent && data.recent.length) {
      var tbody = document.getElementById('recentBody');
      if (tbody) {
        tbody.innerHTML = '';
        data.recent.forEach(function(r, i) {
          var pct   = r.percentage;
          var cls   = pct >= 80 ? 'excellent' : pct >= 60 ? 'good' : pct >= 40 ? 'average' : 'poor';
          var lbl   = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Average' : 'Needs Work';
          var topic = r.topic.length > 30 ? r.topic.slice(0, 30) + '…' : r.topic;
          var date  = r.taken_at ? r.taken_at.slice(0, 10) : '—';
          var hasDetail = !!r.id;
          var tr    = document.createElement('tr');
          tr.className = hasDetail ? 'recent-row-clickable' : '';
          if (hasDetail) {
            tr.title = 'Click to review this attempt';
            tr.addEventListener('click', function() { openHistModal(r.id, r.topic, r.score, r.total, pct, r.taken_at); });
          }
          tr.innerHTML =
            '<td>' + (i+1) + '</td>' +
            '<td title="' + r.topic + '">' + topic + (hasDetail ? ' <span class="hist-row-hint">🔍</span>' : '') + '</td>' +
            '<td>' + r.score + '/' + r.total + '</td>' +
            '<td><strong>' + pct + '%</strong></td>' +
            '<td>' + date + '</td>' +
            '<td><span class="grade-badge grade-badge--' + cls + '">' + lbl + '</span></td>';
          tbody.appendChild(tr);
        });
      }
      recent.classList.add('visible');
    }
  } catch(e) {
    if (empty) {
      var p = empty.querySelector('p');
      if (p) p.textContent = '⚠ ' + e.message;
      empty.classList.add('visible');
    }
    showToast(e.message, 'error');
  } finally {
    setLoading('analytics-btn', 'analytics-spin', false);
  }
}

/* ══════════════════════════════════════════════════════════
   QUIZ HISTORY MODAL
══════════════════════════════════════════════════════════ */
function closeHistModal() {
  var overlay = document.getElementById('histModalOverlay');
  var modal   = document.getElementById('histModal');
  if (overlay) overlay.classList.remove('visible');
  if (modal)   modal.classList.remove('visible');
  document.body.style.overflow = '';
}

async function openHistModal(attemptId, topic, score, total, pct, takenAt) {
  var overlay = document.getElementById('histModalOverlay');
  var modal   = document.getElementById('histModal');
  var title   = document.getElementById('histModalTitle');
  var meta    = document.getElementById('histModalMeta');
  var scoreBar = document.getElementById('histModalScoreBar');
  var body    = document.getElementById('histModalBody');
  var loading = document.getElementById('histModalLoading');

  if (!modal) return;

  // Set header info
  if (title) title.textContent = topic;
  if (meta)  meta.textContent  = (takenAt ? takenAt.slice(0, 10) : '') + '  ·  ' + score + '/' + total + '  ·  ' + pct + '%';

  // Score bar color
  var barColor = pct >= 80 ? '#39ff14' : pct >= 60 ? '#00e5ff' : pct >= 50 ? '#ffaa00' : '#ff4d6d';
  if (scoreBar) {
    scoreBar.innerHTML =
      '<div class="hist-score-fill" style="width:' + pct + '%;background:' + barColor + '"></div>' +
      '<span class="hist-score-pct" style="color:' + barColor + '">' + pct + '%</span>';
  }

  // Show modal
  if (overlay) overlay.classList.add('visible');
  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';

  // Reset body
  if (body)    body.innerHTML = '';
  if (loading) { loading.style.display = 'flex'; body.appendChild(loading); }

  try {
    var res  = await fetch('/quiz-attempt/' + attemptId);
    // Guard: if server returns HTML (error page), res.json() throws "Unexpected token <"
    var text = await res.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch(parseErr) {
      throw new Error('Server error — could not load attempt (status ' + res.status + ')');
    }
    if (data.error) throw new Error(data.error);

    var quizData  = data.quiz_data;
    if (loading) loading.style.display = 'none';

    if (!quizData || !quizData.questions || !quizData.questions.length) {
      body.innerHTML = '<div class="hist-no-data">📭 No question data saved for this attempt.<br><small>Only attempts taken after the update include full review.</small></div>';
      return;
    }

    var questions = quizData.questions;
    var answers   = quizData.answers || [];

    // Render question cards immediately (no explanation yet)
    renderHistCards(body, questions, answers, []);

    // Fetch explanations
    var expRes  = await fetch('/quiz-explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: questions, answers: answers })
    });
    var expData = await expRes.json();
    var explanations = expData.explanations || [];

    // Re-render with explanations
    body.innerHTML = '';
    renderHistCards(body, questions, answers, explanations);

  } catch(e) {
    if (loading) loading.style.display = 'none';
    body.innerHTML = '<div class="hist-no-data">⚠ ' + e.message + '</div>';
  }
}

function renderHistCards(container, questions, answers, explanations) {
  questions.forEach(function(q, i) {
    var userAns   = answers[i] || null;
    var isCorrect = userAns === q.answer;
    var isSkipped = !userAns;
    var exp       = explanations[i] || null;

    var card = document.createElement('div');
    card.className = 'quiz-review-card ' + (isCorrect ? 'review-correct' : isSkipped ? 'review-skipped' : 'review-wrong');

    var optionsHtml = Object.keys(q.options || {}).map(function(letter) {
      var cls  = letter === q.answer ? 'review-opt-correct' : (letter === userAns && !isCorrect) ? 'review-opt-wrong' : '';
      var mark = letter === q.answer ? ' ✓' : (letter === userAns && !isCorrect) ? ' ✗' : '';
      return '<div class="review-opt ' + cls + '"><span class="review-opt-letter">' + letter + '</span>' + q.options[letter] + '<span class="review-opt-mark">' + mark + '</span></div>';
    }).join('');

    var yourAnswerHtml = isSkipped
      ? '<span class="review-your-ans skipped">Not answered</span>'
      : '<span class="review-your-ans ' + (isCorrect ? 'ans-correct' : 'ans-wrong') + '">' + userAns + ') ' + (q.options[userAns] || '') + '</span>';

    var explanationHtml = '';
    if (exp) {
      var wrongOptHtml = '';
      if (exp.why_wrong) {
        var wrongEntries = Object.keys(exp.why_wrong)
          .filter(function(l) { return l !== q.answer; })
          .map(function(l) {
            return '<div class="review-why-wrong-item"><span class="review-wrong-letter">' + l + '</span><span>' + exp.why_wrong[l] + '</span></div>';
          }).join('');
        if (wrongEntries) {
          wrongOptHtml = '<div class="review-exp-row"><div class="review-exp-label review-exp-label--red">❌ WHY OTHERS ARE WRONG</div><div class="review-why-wrong-list">' + wrongEntries + '</div></div>';
        }
      }
      explanationHtml =
        '<div class="review-exp-block">' +
          '<div class="review-exp-divider"><span>💡 Explanation</span></div>' +
          (exp.concept    ? '<div class="review-exp-row"><div class="review-exp-label review-exp-label--purple">📌 CONCEPT</div><div class="review-exp-text">' + exp.concept + '</div></div>' : '') +
          (exp.why_correct ? '<div class="review-exp-row"><div class="review-exp-label review-exp-label--cyan">✅ WHY IT\'S CORRECT</div><div class="review-exp-text review-exp-text--bright">' + exp.why_correct + '</div></div>' : '') +
          wrongOptHtml +
          (exp.key_takeaway ? '<div class="review-exp-row review-exp-takeaway-row"><div class="review-exp-label review-exp-label--green">🔑 KEY TAKEAWAY</div><div class="review-exp-text review-exp-text--green">' + exp.key_takeaway + '</div></div>' : '') +
        '</div>';
    }

    card.innerHTML =
      '<div class="review-card-header">' +
        '<span class="review-q-num">Q' + (i + 1) + '</span>' +
        '<span class="review-status ' + (isCorrect ? 'status-correct' : isSkipped ? 'status-skipped' : 'status-wrong') + '">' +
          (isCorrect ? '✅ Correct' : isSkipped ? '⚠️ Skipped' : '❌ Incorrect') +
        '</span>' +
      '</div>' +
      '<div class="review-question">' + q.question + '</div>' +
      '<div class="review-opts">' + optionsHtml + '</div>' +
      '<div class="review-answer-row"><span class="review-label">Your answer:</span>' + yourAnswerHtml + '</div>' +
      '<div class="review-answer-row"><span class="review-label">Correct answer:</span><span class="review-correct-ans">' + q.answer + ') ' + q.options[q.answer] + '</span></div>' +
      explanationHtml;

    container.appendChild(card);
  });
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeHistModal();
});

/* ══════════════════════════════════════════════════════════
   CUSTOM CURSOR
══════════════════════════════════════════════════════════ */
(function initCursor() {
  var dot  = document.getElementById('cursorDot');
  var ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var rx = mx, ry = my;

  document.addEventListener('mousemove', function(e) {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  function lerp(a, b, t) { return a + (b - a) * t; }

  (function animRing() {
    rx = lerp(rx, mx, 0.12); ry = lerp(ry, my, 0.12);
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(animRing);
  })();

  document.querySelectorAll('a, button, input, textarea, label, .nav-btn, .quiz-option').forEach(function(el) {
    el.addEventListener('mouseenter', function() { ring.classList.add('hovering'); });
    el.addEventListener('mouseleave', function() { ring.classList.remove('hovering'); });
  });

  document.addEventListener('mouseleave', function() { dot.style.opacity = '0'; ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', function() { dot.style.opacity = '1'; ring.style.opacity = '0.6'; });
  document.addEventListener('mousedown',  function() {
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
  document.querySelectorAll('.tilt-card').forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var dx   = (e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2);
      var dy   = (e.clientY - rect.top  - rect.height / 2) / (rect.height / 2);
      card.style.transform = 'perspective(800px) rotateX(' + (dy * -10) + 'deg) rotateY(' + (dx * 10) + 'deg) scale(1.02)';
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
  document.querySelectorAll('.magnetic, .btn-submit, .cyber-btn, .tool-btn, .otp-verify-btn').forEach(function(btn) {
    btn.addEventListener('mousemove', function(e) {
      var rect = btn.getBoundingClientRect();
      var dx   = (e.clientX - rect.left - rect.width  / 2) * 0.25;
      var dy   = (e.clientY - rect.top  - rect.height / 2) * 0.25;
      btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    btn.addEventListener('mouseleave', function() { btn.style.transform = ''; });
  });
})();

/* ══════════════════════════════════════════════════════════
   NEURAL PARTICLES
══════════════════════════════════════════════════════════ */
(function initParticles() {
  var container = document.querySelector('.nc-particles');
  if (!container) return;
  var colors = ['#00e5ff','#ff00ff','#00ffa3','#a78bfa','#ffffff'];
  for (var i = 0; i < 28; i++) {
    var p     = document.createElement('div');
    p.className = 'nc-particle';
    var size  = (Math.random() * 3 + 1).toFixed(1);
    var x     = Math.random() * 100;
    var y     = Math.random() * 100;
    var dur   = (Math.random() * 12 + 8).toFixed(1);
    var delay = (Math.random() * 10).toFixed(1);
    var color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText =
      'position:absolute;width:' + size + 'px;height:' + size + 'px;' +
      'left:' + x + '%;top:' + y + '%;background:' + color + ';' +
      'border-radius:50%;opacity:0;pointer-events:none;' +
      'animation:ncParticle ' + dur + 's ' + delay + 's ease-in-out infinite;' +
      'box-shadow:0 0 6px ' + color + ';';
    container.appendChild(p);
  }
})();

(function() {
  var scan = document.querySelector('.nc-scan');
  if (scan) scan.style.display = 'block';
})();