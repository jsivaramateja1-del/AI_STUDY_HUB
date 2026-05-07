from flask import Flask, render_template, request, jsonify, session, redirect
import sqlite3, os, io, base64, random, smtplib, json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from groq import Groq
import hashlib, secrets
import PyPDF2
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

# ========== CONFIGURATION ==========
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GMAIL_USER   = os.environ.get("GMAIL_USER", "")
GMAIL_PASS   = os.environ.get("GMAIL_PASS", "")
DEV_MODE     = os.environ.get("DEV_MODE", "False") == "True"

try:
    with open("secret.key", "r") as f:
        FLASK_SECRET_KEY = f.read().strip()
        if not FLASK_SECRET_KEY:
            raise ValueError("secret.key is empty")
except FileNotFoundError:
    raise RuntimeError("secret.key file not found")
except Exception as e:
    raise RuntimeError(f"Error reading secret.key: {e}")

if not GROQ_API_KEY and not DEV_MODE:
    raise RuntimeError("GROQ_API_KEY is not set in .env file")
elif DEV_MODE:
    print("=" * 50)
    print("⚠️  DEVELOPMENT MODE — using mock responses")
    print("=" * 50)
else:
    print("✓ Groq API configured")

app.secret_key = FLASK_SECRET_KEY
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# ========== HELPERS ==========
def hash_pw(pw):       return generate_password_hash(pw)
def verify_pw(h, p):   return check_password_hash(h, p)

def get_db():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

def ask_groq(prompt, system=None, model="llama-3.3-70b-versatile"):
    if DEV_MODE or not client:
        return get_mock_response(prompt)
    try:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(
            model=model, messages=messages,
            temperature=0.7, max_tokens=1024, top_p=1, stream=False
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Groq API error: {e}")
        if "rate limit" in str(e).lower():
            raise Exception("Rate limit reached. Please wait a moment.")
        raise

def get_mock_response(prompt):
    prompt_lower = prompt.lower()
    if "summarize" in prompt_lower or "summary" in prompt_lower:
        return """## Overview
This is a mock summary. Add your Groq API key to get real AI responses.

## Key Points
- Set GROQ_API_KEY in your .env file
- Get a free key at console.groq.com
- Fast inference with llama3-70b-8192
- No cost for reasonable usage

## Main Takeaway
Get your free Groq API key to unlock full AI power."""
    elif "quiz" in prompt_lower or "question" in prompt_lower:
        return """Q1. What is the purpose of an API key?
A) To decorate the interface
B) To authenticate requests to an external service
C) To speed up the browser
D) To store passwords

Answer: B) To authenticate requests to an external service

Q2. Where do you get a Groq API key?
A) api.openai.com
B) huggingface.co
C) console.groq.com
D) github.com

Answer: C) console.groq.com

Q3. What model does this app use by default?
A) gpt-4
B) claude-3
C) gemini-pro
D) llama3-70b-8192

Answer: D) llama3-70b-8192

Q4. What file stores environment variables?
A) config.json
B) settings.py
C) .env
D) secret.txt

Answer: C) .env

Q5. What is DEV_MODE used for?
A) Making the site look better
B) Running without an API key using mock responses
C) Enabling dark mode
D) Speeding up the database

Answer: B) Running without an API key using mock responses"""
    elif "analyz" in prompt_lower:
        return """## 📋 Summary
Mock analysis. Add your Groq API key for real AI analysis.

## 🔑 Key Points
- Visit console.groq.com for a free key
- Add GROQ_API_KEY=your-key to .env
- Restart the server after adding
- Full analysis will then be available

## 🏷️ Keywords
groq, api, key, development, mock

## 📊 Difficulty Level
**Beginner**
Getting an API key is straightforward.

## 💡 Study Tips
- Get the free Groq key first
- Then test with real content
- The llama3-70b model is very capable"""
    else:
        return "🔧 Development mode active. Add GROQ_API_KEY to your .env file for real AI responses. Visit console.groq.com for a free API key."

# FIX: Math captcha — returns (question_string, answer_int)
def generate_math_captcha():
    a = random.randint(1, 12)
    b = random.randint(1, 12)
    op = random.choice(['+', '+', '+', '-', '*'])  # weighted towards +
    if op == '+':
        answer = a + b
        q = f"{a} + {b}"
    elif op == '-':
        a, b = max(a, b), min(a, b)  # ensure positive result
        answer = a - b
        q = f"{a} - {b}"
    else:
        a = random.randint(1, 5)
        b = random.randint(1, 5)
        answer = a * b
        q = f"{a} × {b}"
    return q, answer

def send_otp_email(to_email, otp, name):
    if not GMAIL_USER or not GMAIL_PASS:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your AI Study Hub OTP Code"
        msg["From"]    = GMAIL_USER
        msg["To"]      = to_email
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;
                    background:#050508;color:#f0f4ff;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#00f5ff,#ff0080);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;font-size:24px;color:#050508;">AI Study Hub</h1>
          </div>
          <div style="padding:36px 32px;">
            <h2>Hi {name}!</h2>
            <p style="color:#6b7aaa;">Your OTP expires in 10 minutes.</p>
            <div style="background:#0a0a12;border-radius:12px;padding:24px;text-align:center;">
              <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#00f5ff;">{otp}</span>
            </div>
          </div>
        </div>"""
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(GMAIL_USER, GMAIL_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False

def init_db():
    conn = get_db()
    conn.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, verified INTEGER DEFAULT 0)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS quiz_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL, topic TEXT NOT NULL,
        score INTEGER NOT NULL, total INTEGER NOT NULL DEFAULT 5,
        percentage REAL NOT NULL, taken_at TEXT NOT NULL,
        questions_json TEXT DEFAULT NULL,
        FOREIGN KEY (user_email) REFERENCES users(email))""")
    # Migrate: add questions_json column if it doesn't exist yet
    try:
        conn.execute("ALTER TABLE quiz_attempts ADD COLUMN questions_json TEXT DEFAULT NULL")
    except Exception:
        pass  # Column already exists
    conn.commit()
    conn.close()

init_db()

# ========== FEATURE DATA ==========
FEATURES = {
    "summarizer": {
        "id": "summarizer", "emoji": "🧠", "title": "AI Text Summarizer",
        "tagline": "From walls of text to crystal-clear insights — instantly.",
        "color": "#00f5ff", "color2": "#a78bfa", "grad": "linear-gradient(135deg,#00f5ff,#a78bfa)",
        "desc": "Stop drowning in pages of notes. Our AI Summarizer reads everything and returns sharp, revision-ready bullet points in seconds. Whether it's a 10,000-word textbook chapter or lecture notes — paste it in and get the key ideas extracted.",
        "steps": [
            {"icon": "📋", "title": "Paste your text", "desc": "Drop in any text — notes, articles, chapters, research papers"},
            {"icon": "⚡", "title": "AI processes it", "desc": "AI reads, understands and extracts the core meaning"},
            {"icon": "✨", "title": "Get bullet points", "desc": "Receive a clean overview, key points and main takeaway"},
        ],
        "stats": [{"val": "10x", "lbl": "Faster revision"}, {"val": "50k", "lbl": "Chars supported"}, {"val": "100%", "lbl": "AI powered"}],
        "demo_lines": ["## Overview", "Photosynthesis converts light energy into chemical energy...", "## Key Points", "• Plants use chlorophyll to absorb sunlight", "• CO₂ + H₂O → glucose + O₂", "• Occurs in light & dark reactions", "## Main Takeaway", "Photosynthesis is the foundation of all food chains."],
        "prev": None, "next": "pdf",
    },
    "pdf": {
        "id": "pdf", "emoji": "📄", "title": "PDF Summarizer",
        "tagline": "Upload any PDF. Get structured study notes in seconds.",
        "color": "#ff0080", "color2": "#ff6eb0", "grad": "linear-gradient(135deg,#ff0080,#ff6eb0)",
        "desc": "Stop manually reading through entire PDFs. Upload your textbooks, lecture slides, research papers and our AI extracts structured notes — section by section, with key concepts and revision checklist.",
        "steps": [
            {"icon": "📤", "title": "Upload your PDF", "desc": "Drag or click — supports up to 15 pages"},
            {"icon": "🔎", "title": "AI reads it all", "desc": "Every page is extracted and intelligently processed"},
            {"icon": "📚", "title": "Structured notes", "desc": "Get section breakdowns, key terms and a revision checklist"},
        ],
        "stats": [{"val": "15", "lbl": "Pages supported"}, {"val": "10MB", "lbl": "Max file size"}, {"val": "3s", "lbl": "Avg processing"}],
        "demo_lines": ["# 📚 Study Notes — Chapter 4.pdf", "## Overview", "This chapter covers Newton's laws...", "## 📖 Section Breakdown", "### First Law (Inertia)", "• Objects at rest stay at rest", "## ✅ Quick Revision Checklist", "☐ Define all three Newton's laws"],
        "prev": "summarizer", "next": "chatbot",
    },
    "chatbot": {
        "id": "chatbot", "emoji": "🤖", "title": "AI Chatbot Assistant",
        "tagline": "Your 24/7 study companion — always ready, never tired.",
        "color": "#39ff14", "color2": "#00f5ff", "grad": "linear-gradient(135deg,#39ff14,#00f5ff)",
        "desc": "Ask any question, upload any file, and get clear educational answers instantly. The AI Chatbot explains concepts with analogies, breaks down complex topics, and even offers to generate quizzes from your uploaded content.",
        "steps": [
            {"icon": "💬", "title": "Ask anything", "desc": "Type your question or upload a PDF, text or code file"},
            {"icon": "🤖", "title": "AI understands", "desc": "AI reads, analyzes and formulates a clear educational answer"},
            {"icon": "🎓", "title": "Learn instantly", "desc": "Get explanations, examples and follow-up suggestions"},
        ],
        "stats": [{"val": "24/7", "lbl": "Always available"}, {"val": "9+", "lbl": "File types"}, {"val": "∞", "lbl": "Questions"}],
        "demo_lines": ["You: What is the difference between DNA and RNA?", "", "🤖 Great question!", "• DNA is double-stranded; RNA is single-stranded", "• DNA uses thymine; RNA uses uracil", "• DNA stores info; RNA carries it", "Want me to generate a quiz on this? 🎯"],
        "prev": "pdf", "next": "quiz",
    },
    "quiz": {
        "id": "quiz", "emoji": "📝", "title": "Quiz Generator",
        "tagline": "Test yourself. Know what you know. Master what you don't.",
        "color": "#ffaa00", "color2": "#ff6eb0", "grad": "linear-gradient(135deg,#ffaa00,#ff6eb0)",
        "desc": "Active recall is proven to be 3x more effective for memory. Our Quiz Generator creates interactive MCQs from any content. Answer, get instant feedback, navigate freely, and watch your score saved to your performance tracker automatically.",
        "steps": [
            {"icon": "📋", "title": "Paste text or upload", "desc": "Feed in any study material"},
            {"icon": "🎲", "title": "AI generates MCQs", "desc": "Challenging, relevant questions in seconds"},
            {"icon": "✅", "title": "Answer & get scored", "desc": "Click options, get instant feedback, see results"},
        ],
        "stats": [{"val": "5+", "lbl": "Questions"}, {"val": "3x", "lbl": "Better retention"}, {"val": "Auto", "lbl": "Score saved"}],
        "demo_lines": ["Q2. What is the powerhouse of the cell?", "", "  A) Nucleus", "  B) Ribosome", "▶ C) Mitochondria  ✓ Correct!", "  D) Golgi apparatus", "", "Progress: ██████░░░░  Q 2 / 5"],
        "prev": "chatbot", "next": "analyzer",
    },
    "analyzer": {
        "id": "analyzer", "emoji": "🔍", "title": "Content Analyzer",
        "tagline": "Understand any content deeply — keywords, difficulty, tips.",
        "color": "#a78bfa", "color2": "#00f5ff", "grad": "linear-gradient(135deg,#a78bfa,#00f5ff)",
        "desc": "The Content Analyzer gives you a complete intelligence report: summary, key points, important keywords, difficulty rating and personalised study tips so you know exactly how to approach the material.",
        "steps": [
            {"icon": "📝", "title": "Paste any content", "desc": "Text, notes, articles — anything"},
            {"icon": "🧬", "title": "Deep AI analysis", "desc": "AI identifies structure, difficulty and key info"},
            {"icon": "📊", "title": "Full intelligence", "desc": "Get summary, keywords, difficulty and study tips"},
        ],
        "stats": [{"val": "5", "lbl": "Analysis sections"}, {"val": "3", "lbl": "Difficulty levels"}, {"val": "100%", "lbl": "Personalised tips"}],
        "demo_lines": ["## 📋 Summary", "Quantum entanglement is a phenomenon...", "## 🏷️ Keywords", "quantum, entanglement, superposition", "## 📊 Difficulty Level", "**Advanced** — Dense theoretical physics", "## 💡 Study Tips", "• Start with classical physics first"],
        "prev": "quiz", "next": "performance",
    },
    "performance": {
        "id": "performance", "emoji": "📊", "title": "My Performance",
        "tagline": "Track your growth. See your trends. Celebrate every win.",
        "color": "#00f5ff", "color2": "#39ff14", "grad": "linear-gradient(135deg,#00f5ff,#39ff14)",
        "desc": "Every quiz you take is automatically recorded and analysed. Your Performance dashboard shows total attempts, average score, best and worst scores, pass rate and trend — all visualised in beautiful dark-mode charts.",
        "steps": [
            {"icon": "📝", "title": "Take quizzes", "desc": "Every quiz score is automatically saved"},
            {"icon": "📈", "title": "Data is analysed", "desc": "AI calculates trends, pass rate and grade distribution"},
            {"icon": "🏆", "title": "See your progress", "desc": "Beautiful charts, stat cards and full history table"},
        ],
        "stats": [{"val": "6", "lbl": "Metrics tracked"}, {"val": "Live", "lbl": "Chart generation"}, {"val": "∞", "lbl": "Quiz history"}],
        "demo_lines": ["Total Quizzes    →  12", "Average Score    →  74%", "Best Score       →  100% 🏆", "Worst Score      →  40%", "Pass Rate        →  83%", "Trend            →  📈 Improving", "", "Recent: Biology 5/5 · Physics 3/5"],
        "prev": "analyzer", "next": None,
    },
}

# ========== AUTH ROUTES ==========
@app.route("/")
def home():
    if "user" in session:
        return redirect("/dashboard")
    # FIX: generate math captcha, not alphanumeric
    q, answer = generate_math_captcha()
    session["login_captcha_answer"] = answer
    return render_template("login.html", captcha_q=q)

@app.route("/signup")
def signup_page():
    if "user" in session:
        return redirect("/dashboard")
    q, answer = generate_math_captcha()
    session["signup_captcha_answer"] = answer
    return render_template("signup.html", captcha_q=q)

@app.route("/register", methods=["POST"])
def register():
    name     = request.form.get("name",    "").strip()
    email    = request.form.get("email",   "").strip().lower()
    password = request.form.get("password","")
    captcha  = request.form.get("captcha", "").strip()

    def re_render(error):
        q, answer = generate_math_captcha()
        session["signup_captcha_answer"] = answer
        return render_template("signup.html", error=error, captcha_q=q, name=name, email=email)

    if not (name and email and password):
        return re_render("All fields are required.")
    if len(password) < 6:
        return re_render("Password must be at least 6 characters.")
    if "@" not in email or "." not in email:
        return re_render("Please enter a valid email address.")

    expected = session.get("signup_captcha_answer")
    if not captcha.lstrip("-").isdigit() or int(captcha) != expected:
        return re_render("Wrong captcha answer. Please try again.")

    conn = get_db()
    if conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
        conn.close()
        return re_render("That email is already registered.")
    conn.close()

    otp     = str(random.randint(100000, 999999))
    expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    session["pending_reg"] = {
        "name": name, "email": email,
        "password": hash_pw(password), "otp": otp, "expires": expires
    }
    sent    = send_otp_email(email, otp, name)
    dev_otp = otp if not sent else None
    return render_template("otp.html", email=email, mode="register", dev_otp=dev_otp, sent=sent)

@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    mode      = request.form.get("mode", "register")
    otp_input = request.form.get("otp", "").strip()
    pending   = session.get("pending_reg", {})
    if not pending:
        q, answer = generate_math_captcha()
        session["login_captcha_answer"] = answer
        return render_template("login.html", error="Session expired. Please try again.", captcha_q=q)
    expires = pending.get("expires")
    if expires and datetime.utcnow() > datetime.fromisoformat(expires):
        session.pop("pending_reg", None)
        return render_template("otp.html", email=pending.get("email"), mode=mode,
                               error="OTP has expired. Please register again.")
    if otp_input != pending.get("otp"):
        dev_otp = pending.get("otp") if not GMAIL_USER else None
        return render_template("otp.html", email=pending.get("email"), mode=mode,
                               error="Incorrect OTP. Please try again.", dev_otp=dev_otp, sent=True)
    try:
        conn = get_db()
        conn.execute("INSERT INTO users (name,email,password,verified) VALUES (?,?,?,1)",
                     (pending["name"], pending["email"], pending["password"]))
        conn.commit(); conn.close()
        session.pop("pending_reg", None)
        q, answer = generate_math_captcha()
        session["login_captcha_answer"] = answer
        return render_template("login.html", success="Account verified! Please sign in.", captcha_q=q)
    except sqlite3.IntegrityError:
        q, answer = generate_math_captcha()
        session["signup_captcha_answer"] = answer
        return render_template("signup.html", error="Email already registered.", captcha_q=q)

@app.route("/resend-otp", methods=["POST"])
def resend_otp():
    pending = session.get("pending_reg", {})
    if not pending:
        return redirect("/signup")
    otp = str(random.randint(100000, 999999))
    pending["otp"]         = otp
    pending["expires"]     = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    session["pending_reg"] = pending
    sent    = send_otp_email(pending["email"], otp, pending["name"])
    dev_otp = otp if not sent else None
    return render_template("otp.html", email=pending["email"], mode="register",
                           dev_otp=dev_otp, sent=sent, success="New OTP sent!")

@app.route("/login", methods=["POST"])
def login():
    email    = request.form.get("email",    "").strip().lower()
    password = request.form.get("password", "")
    captcha  = request.form.get("captcha",  "").strip()

    def re_render(error):
        q, answer = generate_math_captcha()
        session["login_captcha_answer"] = answer
        return render_template("login.html", error=error, captcha_q=q)

    expected = session.get("login_captcha_answer")
    if not captcha.lstrip("-").isdigit() or int(captcha) != expected:
        return re_render("Wrong captcha answer. Please try again.")

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    if not user or not verify_pw(user["password"], password):
        return re_render("Invalid email or password.")
    if not user["verified"]:
        return re_render("Please verify your email first.")

    session.pop("login_captcha_answer", None)
    session["user"] = email
    session["name"] = user["name"]
    return redirect("/dashboard")

@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect("/")
    return render_template("dashboard.html", name=session.get("name", "Student"))

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if "user" in session:
        return redirect("/dashboard")
    if request.method == "GET":
        return render_template("forgot_password.html")
    email = request.form.get("email", "").strip().lower()
    if not email:
        return render_template("forgot_password.html", error="Please enter your email.")
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=? AND verified=1", (email,)).fetchone()
    conn.close()
    if not user:
        return render_template("forgot_password.html",
                               success="If that email exists, an OTP has been sent.")
    otp = str(random.randint(100000, 999999))
    session["reset_otp"]     = otp
    session["reset_email"]   = email
    session["reset_expires"] = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    sent    = send_otp_email(email, otp, user["name"])
    dev_otp = otp if not sent else None
    return render_template("reset_otp.html", email=email, dev_otp=dev_otp, sent=sent)

@app.route("/verify-reset-otp", methods=["POST"])
def verify_reset_otp():
    otp_input = request.form.get("otp", "").strip()
    email     = session.get("reset_email",   "")
    saved_otp = session.get("reset_otp",     "")
    expires   = session.get("reset_expires", "")
    if not email or not saved_otp:
        return render_template("forgot_password.html", error="Session expired. Try again.")
    if expires and datetime.utcnow() > datetime.fromisoformat(expires):
        session.pop("reset_otp", None); session.pop("reset_email", None); session.pop("reset_expires", None)
        return render_template("forgot_password.html", error="OTP expired. Please try again.")
    if otp_input != saved_otp:
        dev_otp = saved_otp if not GMAIL_USER else None
        return render_template("reset_otp.html", email=email,
                               error="Incorrect OTP.", dev_otp=dev_otp, sent=True)
    session["reset_verified"] = True
    return render_template("new_password.html", email=email)

@app.route("/resend-reset-otp", methods=["POST"])
def resend_reset_otp():
    email = session.get("reset_email", "")
    if not email:
        return redirect("/forgot-password")
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    otp = str(random.randint(100000, 999999))
    session["reset_otp"]     = otp
    session["reset_expires"] = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    sent    = send_otp_email(email, otp, user["name"] if user else "User")
    dev_otp = otp if not sent else None
    return render_template("reset_otp.html", email=email, dev_otp=dev_otp,
                           sent=sent, success="New OTP sent!")

@app.route("/reset-password", methods=["POST"])
def reset_password():
    if not session.get("reset_verified"):
        return render_template("forgot_password.html", error="Session expired. Try again.")
    email    = session.get("reset_email", "")
    password = request.form.get("password", "")
    confirm  = request.form.get("confirm",  "")
    if not password or not confirm:
        return render_template("new_password.html", email=email, error="Both fields are required.")
    if len(password) < 6:
        return render_template("new_password.html", email=email, error="Password must be at least 6 characters.")
    if password != confirm:
        return render_template("new_password.html", email=email, error="Passwords do not match.")
    try:
        conn = get_db()
        conn.execute("UPDATE users SET password=? WHERE email=?", (hash_pw(password), email))
        conn.commit(); conn.close()
        session.pop("reset_otp", None); session.pop("reset_email", None)
        session.pop("reset_verified", None); session.pop("reset_expires", None)
        q, answer = generate_math_captcha()
        session["login_captcha_answer"] = answer
        return render_template("login.html", success="Password reset! Please sign in.", captcha_q=q)
    except Exception as e:
        return render_template("new_password.html", email=email, error=str(e))

# ========== FEATURE PAGES ==========
@app.route("/feature/<name>")
def feature_page(name):
    feat = FEATURES.get(name)
    if not feat:
        return redirect("/")
    return render_template("feature.html", f=feat, features_map=FEATURES)

# ========== AI ROUTES ==========
@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Please enter some text to summarize."}), 400
    if len(text) < 30:
        return jsonify({"error": "Text is too short (minimum 30 characters)."}), 400
    if len(text) > 50000:
        return jsonify({"error": "Text too long (max 50,000 characters)."}), 400
    try:
        result = ask_groq(
            f"""Summarize the following text professionally.

Return EXACTLY this format:

## Overview
[2-3 sentence high-level summary]

## Key Points
- [Important point]
- [Continue for all major points — minimum 4]

## Main Takeaway
[One powerful sentence]

Text:
{text}""",
            system="You are a world-class summarizer. Return formatted summary directly, no preamble.")
        return jsonify({"summary": result})
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route("/summarize-file", methods=["POST"])
def summarize_file():
    file = request.files.get("file")
    text = request.form.get("text", "").strip()
    if not file and not text:
        return jsonify({"error": "No file or text provided."}), 400
    content = text
    if file:
        fname = file.filename.lower()
        raw   = file.read()
        if fname.endswith(".pdf"):
            reader  = PyPDF2.PdfReader(io.BytesIO(raw))
            content = "\n".join(p.extract_text() or "" for p in reader.pages[:10]).strip()
        elif fname.endswith((".txt",".md",".csv",".py",".js")):
            content = raw.decode("utf-8", errors="ignore")[:8000]
        else:
            return jsonify({"error": "Unsupported file type for summarizer."}), 400
    if not content or len(content) < 30:
        return jsonify({"error": "Could not extract enough text to summarize."}), 400
    try:
        result = ask_groq(
            f"""Summarize the following text professionally.

Return EXACTLY this format:

## Overview
[2-3 sentence high-level summary]

## Key Points
- [Important point]
- [Continue for all major points — minimum 4]

## Main Takeaway
[One powerful sentence]

Text:
{content[:8000]}""",
            system="You are a world-class summarizer. Return formatted summary directly, no preamble.")
        return jsonify({"summary": result})
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route("/chat", methods=["POST"])
def chat():
    message = ""; file_content = ""
    if request.content_type and "multipart/form-data" in request.content_type:
        message = request.form.get("message", "").strip()
        file    = request.files.get("file")
        if file and file.filename:
            fname = file.filename.lower()
            try:
                raw = file.read()
                if fname.endswith(".pdf"):
                    reader       = PyPDF2.PdfReader(io.BytesIO(raw))
                    file_content = "\n".join(p.extract_text() or "" for p in reader.pages[:10]).strip()
                    file_content = f"\n\n[Attached PDF: {file.filename}]\n{file_content[:6000]}"
                elif fname.endswith((".png",".jpg",".jpeg",".gif",".webp")):
                    return jsonify({"reply": "Image analysis is not supported in this version. Please upload PDF or text files."})
                elif fname.endswith((".txt",".md",".csv",".py",".js",".html",".css",".json",".xml")):
                    file_content = raw.decode("utf-8", errors="ignore")[:6000]
                    file_content = f"\n\n[Attached file: {file.filename}]\n{file_content}"
                else:
                    return jsonify({"error": "Unsupported file type."}), 400
            except Exception as e:
                return jsonify({"error": f"Could not read file: {str(e)}"}), 400
    else:
        message = (request.json or {}).get("message", "").strip()
    if not message and not file_content:
        return jsonify({"error": "Please type a message or upload a file."}), 400
    full_prompt = (message + file_content).strip() or "Please analyze the attached content."
    try:
        reply = ask_groq(full_prompt,
            system="""You are a friendly, knowledgeable AI study assistant.
Answer clearly, concisely, and educationally. Use examples and analogies.
Format with bullet points or headings when helpful. Always be encouraging.""")
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route("/quiz", methods=["POST"])
def quiz():
    data          = request.json or {}
    text          = data.get("text", "").strip()
    num_questions = data.get("num_questions", 5)
    difficulty    = data.get("difficulty", "medium")
    if not text:
        return jsonify({"error": "Please enter content first."}), 400
    if len(text) < 20:
        return jsonify({"error": "Content too short to generate a quiz."}), 400
    diff_prompt = {
        "easy":   "Create straightforward questions testing core concepts only.",
        "medium": "Create moderate questions testing understanding and application.",
        "hard":   "Create challenging questions requiring deep analysis."
    }.get(difficulty, "Create moderate difficulty questions.")
    try:
        result = ask_groq(
            f"""Generate exactly {num_questions} multiple choice questions from the content below.
Difficulty: {diff_prompt}

Format STRICTLY as (leave one blank line between questions):

Q1. [Question]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Answer: [Letter]) [Answer text]

Content:
{text[:8000]}""",
            system="You are a quiz generator. Create clear, educational MCQs that test real understanding.")
        topic = text[:60].strip().replace("\n", " ")
        return jsonify({"quiz": result, "topic": topic})
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route("/quiz-from-file", methods=["POST"])
def quiz_from_file():
    file          = request.files.get("file")
    instruction   = request.form.get("instruction", "").strip()
    num_questions = int(request.form.get("num_questions", 5))
    difficulty    = request.form.get("difficulty", "medium")
    if not file:
        return jsonify({"error": "No file uploaded."}), 400
    fname = file.filename.lower()
    diff_prompt = {
        "easy":   "Create straightforward questions testing core concepts only.",
        "medium": "Create moderate questions testing understanding and application.",
        "hard":   "Create challenging questions requiring deep analysis."
    }.get(difficulty, "Create moderate difficulty questions.")
    try:
        raw  = file.read()
        text = ""
        if fname.endswith(".pdf"):
            reader = PyPDF2.PdfReader(io.BytesIO(raw))
            text   = "\n".join(p.extract_text() or "" for p in reader.pages[:15]).strip()
        elif fname.endswith((".txt",".md",".csv")):
            text = raw.decode("utf-8", errors="ignore")
        else:
            return jsonify({"error": "Unsupported file. Use PDF, TXT, MD, or CSV."}), 400
        if not text or len(text) < 30:
            return jsonify({"error": "Could not extract enough text from file."}), 400
        focus = f" Focus specifically on: {instruction}." if instruction else ""
        result = ask_groq(
            f"""Generate exactly {num_questions} multiple choice questions.{focus}
Difficulty: {diff_prompt}

Format STRICTLY as (leave one blank line between questions):

Q1. [Question]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Answer: [Letter]) [Answer text]

Content:
{text[:8000]}""",
            system="You are a quiz generator. Create clear, educational MCQs.")
        topic = (instruction or file.filename)[:60]
        return jsonify({"quiz": result, "topic": topic})
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route("/submit-quiz-score", methods=["POST"])
def submit_quiz_score():
    if "user" not in session:
        return jsonify({"error": "Not logged in. Please sign in to save scores."}), 401
    data      = request.json or {}
    score     = data.get("score")
    total     = data.get("total", 5)
    topic     = data.get("topic", "General")[:80]
    questions = data.get("questions", [])   # full Q+A data
    answers   = data.get("answers", [])     # user's answers
    if score is None or not isinstance(score, int):
        return jsonify({"error": "Invalid score value."}), 400
    if not (0 <= score <= total):
        return jsonify({"error": "Score out of range."}), 400
    pct = round((score / total) * 100, 1)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    # Store questions + user answers together
    questions_json = json.dumps({"questions": questions, "answers": answers}) if questions else None
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO quiz_attempts (user_email,topic,score,total,percentage,taken_at,questions_json) VALUES (?,?,?,?,?,?,?)",
            (session["user"], topic, score, total, pct, now, questions_json))
        conn.commit(); conn.close()
        if   pct >= 80: grade, msg = "Excellent! 🏆", "Outstanding! Keep it up!"
        elif pct >= 60: grade, msg = "Good job! 👍",  "Solid work. Review what you missed."
        elif pct >= 40: grade, msg = "Keep going! 💪","Revise the weak areas and retry."
        else:           grade, msg = "Needs work 📚", "Don't give up — revise and retry!"
        return jsonify({"saved": True, "percentage": pct, "grade": grade, "message": msg})
    except Exception as e:
        return jsonify({"error": f"Could not save score: {str(e)}"}), 500

@app.route("/analyzer", methods=["POST"])
def analyzer():
    text = (request.json or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "Please enter some content to analyze."}), 400
    if len(text) < 20:
        return jsonify({"error": "Content too short (minimum 20 characters)."}), 400
    if len(text) > 50000:
        return jsonify({"error": "Too long. Max 50,000 characters."}), 400
    try:
        result = ask_groq(
            f"""Analyze this content and return EXACTLY this structure:

## 📋 Summary
[2-3 clear sentences]

## 🔑 Key Points
- [Point 1]
- [Minimum 4 points total]

## 🏷️ Keywords
[Most important keywords, comma-separated]

## 📊 Difficulty Level
**[Beginner / Intermediate / Advanced]**
[One sentence explaining why]

## 💡 Study Tips
- [Tip 1]
- [Tip 2]
- [Tip 3]

Content:
{text}""",
            system="You are an expert educational content analyzer. Always use the exact headings specified.")
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route("/analyzer-file", methods=["POST"])
def analyzer_file():
    file = request.files.get("file")
    text = request.form.get("text", "").strip()
    if not file and not text:
        return jsonify({"error": "No file or text provided."}), 400
    content = text
    if file:
        fname = file.filename.lower()
        raw   = file.read()
        if fname.endswith(".pdf"):
            reader  = PyPDF2.PdfReader(io.BytesIO(raw))
            content = "\n".join(p.extract_text() or "" for p in reader.pages[:10]).strip()
        elif fname.endswith((".txt",".md",".csv",".py",".js")):
            content = raw.decode("utf-8", errors="ignore")[:8000]
        else:
            return jsonify({"error": "Unsupported file type for analyzer."}), 400
    if not content or len(content) < 20:
        return jsonify({"error": "Could not extract enough content to analyze."}), 400
    try:
        result = ask_groq(
            f"""Analyze this content and return EXACTLY this structure:

## 📋 Summary
[2-3 clear sentences]

## 🔑 Key Points
- [Point 1]
- [Minimum 4 points total]

## 🏷️ Keywords
[Most important keywords, comma-separated]

## 📊 Difficulty Level
**[Beginner / Intermediate / Advanced]**
[One sentence explaining why]

## 💡 Study Tips
- [Tip 1]
- [Tip 2]
- [Tip 3]

Content:
{content[:8000]}""",
            system="You are an expert educational content analyzer.")
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route("/pdf-summarize", methods=["POST"])
def pdf_summarize():
    if "pdf" not in request.files:
        return jsonify({"error": "No file uploaded. Please select a PDF."}), 400
    f     = request.files["pdf"]
    fname = f.filename.lower().strip() if f.filename else ""
    if not fname:
        return jsonify({"error": "No file selected."}), 400
    if not fname.endswith(".pdf"):
        ext = fname.split(".")[-1].upper() if "." in fname else "unknown"
        return jsonify({"error": f"{ext} files are not supported. Please upload a PDF."}), 400
    try:
        raw = f.read()
        if len(raw) == 0:
            return jsonify({"error": "The uploaded file is empty."}), 400
        if len(raw) > 10 * 1024 * 1024:
            return jsonify({"error": "File too large. Maximum size is 10MB."}), 400
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(raw))
        except Exception:
            return jsonify({"error": "Could not read PDF. It may be corrupted or password-protected."}), 400
        total_pages   = len(reader.pages)
        pages_to_read = min(total_pages, 15)
        text_parts = []
        for i, page in enumerate(reader.pages[:pages_to_read]):
            try:
                pt = page.extract_text() or ""
                if pt.strip():
                    text_parts.append(f"[Page {i+1}]\n{pt.strip()}")
            except:
                continue
        text = "\n\n".join(text_parts).strip()
        if not text:
            return jsonify({"error": "Could not extract text. The PDF may be scanned/image-based."}), 400
        if len(text) < 50:
            return jsonify({"error": "Very little text found in this PDF."}), 400
        result = ask_groq(
            f"""Create comprehensive study notes from this PDF content.
PDF: {total_pages} pages total, reading {pages_to_read} pages.

Return EXACTLY this format:

# 📚 Study Notes

## Overview
[2-3 sentences summarizing the PDF]

## 📖 Section Breakdown
### [Section/Topic Name]
- [Key point]
- [Key point]

## 🔑 Key Concepts
- [Most important concept]

## 📝 Important Terms
- **[Term]**: [Definition]

## ✅ Quick Revision Checklist
- [ ] [Thing to know]

PDF Content:
{text[:8000]}""",
            system="You are an expert study notes creator. Transform PDF content into well-organized notes.")
        return jsonify({"summary": result, "pages": total_pages, "extracted": pages_to_read})
    except Exception as e:
        return jsonify({"error": f"AI error: {str(e)}"}), 500

@app.route("/quiz-analytics")
def quiz_analytics():
    if "user" not in session:
        return jsonify({"error": "Not logged in."}), 401
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM quiz_attempts WHERE user_email=? ORDER BY taken_at ASC",
        (session["user"],)).fetchall()
    conn.close()
    if not rows:
        return jsonify({"empty": True})

    attempts    = [dict(r) for r in rows]
    scores      = [r["percentage"] for r in rows]
    total_att   = len(scores)
    avg_score   = round(float(np.mean(scores)), 1)
    best_score  = round(float(np.max(scores)),  1)
    worst_score = round(float(np.min(scores)),  1)
    pass_rate   = round(sum(1 for s in scores if s >= 60) / total_att * 100, 1)
    improving   = scores[-1] > scores[0] if len(scores) > 1 else None
    trend       = "Improving" if improving else "Declining" if improving is False else "N/A"

    grade_dist = {"Excellent (80-100)": 0, "Good (60-79)": 0,
                  "Average (40-59)": 0,    "Needs Work (<40)": 0}
    for s in scores:
        if   s >= 80: grade_dist["Excellent (80-100)"] += 1
        elif s >= 60: grade_dist["Good (60-79)"]       += 1
        elif s >= 40: grade_dist["Average (40-59)"]    += 1
        else:         grade_dist["Needs Work (<40)"]   += 1

    BG, AX       = "#050508", "#0a0a12"
    CYAN, VIOLET = "#00f5ff", "#a78bfa"
    GREEN, AMBER = "#39ff14", "#ffaa00"
    RED          = "#ff4d6d"
    TXT, GRID    = "#6b7aaa", "#1a1a2e"
    BORDER       = "#141420"

    fig = plt.figure(figsize=(14, 10), facecolor=BG)
    gs  = fig.add_gridspec(2, 3, hspace=0.48, wspace=0.36,
                           left=0.08, right=0.96, top=0.88, bottom=0.1)

    def style_ax(ax):
        ax.set_facecolor(AX)
        ax.tick_params(colors=TXT, labelsize=8)
        for sp in ax.spines.values(): sp.set_color(BORDER)
        ax.grid(color=GRID, linewidth=0.55, linestyle="--", alpha=0.8)

    idx = list(range(1, len(scores) + 1))

    ax1 = fig.add_subplot(gs[0, :2]); style_ax(ax1)
    ax1.plot(idx, scores, color=CYAN, linewidth=2.4, zorder=3)
    ax1.fill_between(idx, scores, alpha=0.12, color=CYAN)
    pc = [GREEN if s >= 80 else AMBER if s >= 60 else RED for s in scores]
    for xi, yi, c in zip(idx, scores, pc):
        ax1.scatter(xi, yi, color=c, s=55, zorder=5, edgecolors=BG, linewidths=1.2)
    ax1.axhline(60,        color=AMBER,  linewidth=1.2, linestyle="--", alpha=0.7, label="Pass (60%)")
    ax1.axhline(avg_score, color=VIOLET, linewidth=1.2, linestyle="--", alpha=0.7, label=f"Avg ({avg_score}%)")
    ax1.set_title("Score Trend", color="white", fontsize=11, fontweight="bold", pad=12)
    ax1.set_ylabel("Score (%)", color=TXT, fontsize=9)
    ax1.set_xlabel("Attempt #", color=TXT, fontsize=9)
    ax1.set_ylim(0, 110)
    ax1.legend(facecolor=AX, edgecolor=BORDER, labelcolor=TXT, fontsize=8)

    ax2 = fig.add_subplot(gs[0, 2])
    ax2.set_facecolor(BG)
    for sp in ax2.spines.values(): sp.set_visible(False)
    ax2.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
    ax2.grid(False)
    gkeys = list(grade_dist.keys()); gvals = list(grade_dist.values())
    gcolors = [GREEN, CYAN, AMBER, RED]
    nz = [(k, v, c) for k, v, c in zip(gkeys, gvals, gcolors) if v > 0]
    if nz:
        wl, wv, wc = zip(*nz)
        wedges, _, at = ax2.pie(wv, colors=wc, autopct="%1.0f%%", startangle=90,
            pctdistance=0.72, wedgeprops=dict(width=0.52, edgecolor=BG, linewidth=2.5))
        for a in at: a.set_color("white"); a.set_fontsize(8); a.set_fontweight("bold")
        ax2.set_title("Grade Distribution", color="white", fontsize=11, fontweight="bold", pad=12)
        ax2.legend(wedges, [f"{l}: {v}" for l, v in zip(wl, wv)], loc="lower center",
                   bbox_to_anchor=(0.5, -0.2), fontsize=7, facecolor=AX,
                   edgecolor=BORDER, labelcolor=TXT, ncol=1)

    ax3 = fig.add_subplot(gs[1, :2]); style_ax(ax3)
    bc   = [GREEN if s >= 80 else CYAN if s >= 60 else AMBER if s >= 40 else RED for s in scores]
    bars = ax3.bar(idx, scores, color=bc, alpha=0.85, width=0.65, zorder=3)
    ax3.axhline(60, color=AMBER, linewidth=1.2, linestyle="--", alpha=0.7)
    ax3.set_title("Score Per Attempt", color="white", fontsize=11, fontweight="bold", pad=12)
    ax3.set_ylabel("Score (%)", color=TXT, fontsize=9)
    ax3.set_xlabel("Attempt #", color=TXT, fontsize=9)
    ax3.set_ylim(0, 115)
    for bar, sc in zip(bars, scores):
        ax3.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 2,
                 f"{sc:.0f}%", ha="center", va="bottom",
                 color="white", fontsize=7.5, fontweight="bold")

    ax4 = fig.add_subplot(gs[1, 2]); ax4.set_facecolor(AX)
    for sp in ax4.spines.values(): sp.set_color(BORDER)
    ax4.tick_params(left=False, bottom=False, labelleft=False, labelbottom=False)
    ax4.grid(False); ax4.set_xlim(0, 1); ax4.set_ylim(0, 1)
    ax4.set_title("Your Stats", color="white", fontsize=11, fontweight="bold", pad=12)
    tc = GREEN if improving else RED if improving is False else TXT
    sr = [
        ("Total Quizzes",  str(total_att),     CYAN),
        ("Average Score",  f"{avg_score}%",    CYAN),
        ("Best Score",     f"{best_score}%",   GREEN),
        ("Worst Score",    f"{worst_score}%",  RED),
        ("Pass Rate",      f"{pass_rate}%",    AMBER),
        ("Trend",          trend,              tc),
    ]
    for i, (lbl, val, col) in enumerate(sr):
        y = 0.88 - i * 0.145
        ax4.text(0.05, y, lbl, color=TXT,  fontsize=8, va="center")
        ax4.text(0.95, y, val, color=col,  fontsize=9, va="center",
                 ha="right", fontweight="bold")
        if i < len(sr) - 1:
            ax4.axhline(y - 0.06, color=BORDER, linewidth=0.5, alpha=0.6)

    fig.suptitle(f"Quiz Performance — {session.get('name','Student')}",
                 color="white", fontsize=13, fontweight="bold", y=0.97)
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=110, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode()
    plt.close()

    # Strip large questions_json blob before sending to frontend
    def slim(a):
        return {k: v for k, v in a.items() if k != 'questions_json'}

    return jsonify({
        "empty":          False,
        "chart":          f"data:image/png;base64,{b64}",
        "total_attempts": total_att,
        "avg_score":      avg_score,
        "best_score":     best_score,
        "worst_score":    worst_score,
        "pass_rate":      pass_rate,
        "trend":          trend,
        "recent":         [slim(a) for a in attempts[-5:][::-1]]
    })

@app.route("/quiz-attempt/<int:attempt_id>")
def quiz_attempt_detail(attempt_id):
    if "user" not in session:
        return jsonify({"error": "Not logged in."}), 401
    conn = get_db()
    row  = conn.execute(
        "SELECT * FROM quiz_attempts WHERE id=? AND user_email=?",
        (attempt_id, session["user"])).fetchone()
    conn.close()
    if not row:
        return jsonify({"error": "Attempt not found."}), 404
    r = dict(row)
    qj = r.pop("questions_json", None)
    if qj:
        try:
            r["quiz_data"] = json.loads(qj)
        except Exception:
            r["quiz_data"] = None
    else:
        r["quiz_data"] = None
    return jsonify(r)


@app.route("/quiz-explain", methods=["POST"])
def quiz_explain():
    if "user" not in session:
        return jsonify({"error": "Not logged in."}), 401
    data = request.get_json()
    questions = data.get("questions", [])
    answers   = data.get("answers", [])
    if not questions:
        return jsonify({"error": "No questions provided."}), 400

    import re

    def clean_json(raw):
        """Strip markdown fences and return clean JSON string."""
        raw = raw.strip()
        raw = re.sub(r'^```[a-zA-Z]*\s*', '', raw)
        raw = re.sub(r'\s*```$', '', raw)
        return raw.strip()

    def parse_json_safe(raw):
        """Try to parse JSON, return None on failure."""
        try:
            return json.loads(clean_json(raw))
        except Exception:
            return None

    # Ask Groq for ALL questions in one call with a tight schema
    q_lines = []
    for i, q in enumerate(questions):
        opts = " | ".join(f"{k}) {v}" for k, v in q.get("options", {}).items())
        correct_letter = q.get("answer", "")
        correct_text   = q.get("options", {}).get(correct_letter, "")
        user_ans       = answers[i] if i < len(answers) else None
        q_lines.append(
            f"Q{i+1}: {q.get('question','')}\n"
            f"Options: {opts}\n"
            f"Correct: {correct_letter}) {correct_text}\n"
            f"Student: {user_ans or 'skipped'}"
        )

    schema_example = json.dumps([{
        "concept": "one sentence about what topic this tests",
        "why_correct": "2-3 sentences explaining why the correct answer is right",
        "why_wrong": {"A": "why A is wrong", "B": "why B is wrong"},
        "key_takeaway": "one memorable sentence to remember"
    }], indent=2)

    prompt = (
        f"You are a tutor. For each question below return a JSON array with {len(questions)} objects.\n"
        f"Each object MUST have exactly these keys: concept, why_correct, why_wrong, key_takeaway.\n"
        f"why_wrong is an object mapping WRONG option letters to one sentence each.\n"
        f"Return ONLY the raw JSON array. No markdown. No explanation. No extra text.\n\n"
        f"Example format:\n{schema_example}\n\n"
        f"Questions:\n\n" + "\n\n".join(q_lines)
    )

    try:
        raw = ask_groq(
            prompt,
            system="You are a JSON-only API. Output raw JSON arrays only. Never use markdown code fences.",
            model="llama-3.3-70b-versatile"
        )
        explanations = parse_json_safe(raw)

        # If top-level parse failed, try to extract JSON array with regex
        if explanations is None:
            match = re.search(r'\[.*\]', raw, re.DOTALL)
            if match:
                explanations = parse_json_safe(match.group(0))

        # If still failed, build one-question-at-a-time as fallback
        if explanations is None:
            explanations = []
            for i, q in enumerate(questions):
                opts = " | ".join(f"{k}) {v}" for k, v in q.get("options", {}).items())
                correct_letter = q.get("answer", "")
                correct_text   = q.get("options", {}).get(correct_letter, "")
                single_prompt = (
                    f"Question: {q.get('question','')}\n"
                    f"Options: {opts}\n"
                    f"Correct Answer: {correct_letter}) {correct_text}\n\n"
                    f"Return a single JSON object with keys: concept, why_correct, why_wrong, key_takeaway.\n"
                    f"why_wrong maps each wrong letter to one sentence. Raw JSON only, no markdown."
                )
                try:
                    r = ask_groq(single_prompt, system="Return only raw JSON objects. No markdown.")
                    obj = parse_json_safe(r)
                    if obj is None:
                        m = re.search(r'\{.*\}', r, re.DOTALL)
                        obj = parse_json_safe(m.group(0)) if m else None
                    explanations.append(obj or {"why_correct": r.strip()})
                except Exception:
                    explanations.append({"why_correct": "Explanation unavailable."})

        return jsonify({"explanations": explanations})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=False)