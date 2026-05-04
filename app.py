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
GMAIL_USER = os.environ.get("GMAIL_USER", "")
GMAIL_PASS = os.environ.get("GMAIL_PASS", "")
DEV_MODE = os.environ.get("DEV_MODE", "False") == "True"

try:
    with open("secret.key", "r") as f:
        FLASK_SECRET_KEY = f.read().strip()
        if not FLASK_SECRET_KEY:
            raise ValueError("secret.key file is empty")
except FileNotFoundError:
    raise RuntimeError("secret.key file not found")
except Exception as e:
    raise RuntimeError(f"Error reading secret.key: {e}")

if not GROQ_API_KEY and not DEV_MODE:
    raise RuntimeError("GROQ_API_KEY is not set in .env file")
elif DEV_MODE:
    print("="*50)
    print("⚠️  DEVELOPMENT MODE ACTIVE – using mock responses")
    print("="*50)
else:
    print("✓ Groq API configured successfully")

app.secret_key = FLASK_SECRET_KEY
client = None
if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)

# ========== HELPER FUNCTIONS ==========
def hash_pw(pw):
    return generate_password_hash(pw)

def verify_pw(h, p):
    return check_password_hash(h, p)

def get_db():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    return conn

def ask_groq(prompt, system=None, model="mixtral-8x7b-32768"):
    if DEV_MODE or not client:
        return get_mock_response(prompt)
    try:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
            top_p=1,
            stream=False
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Groq API error: {e}")
        if "rate limit" in str(e).lower():
            return "⚠️ Rate limit reached. Please wait."
        if DEV_MODE:
            return get_mock_response(prompt)
        raise

def ask_claude(prompt, system=None):
    return ask_groq(prompt, system)

def get_mock_response(prompt):
    prompt_lower = prompt.lower()
    if "summarize" in prompt_lower:
        return """## Overview
Mock summary. Add Groq API key for real AI.

## Key Points
- Free Groq API
- Fast responses
- Multiple models

## Main Takeaway
Get your API key from console.groq.com"""
    elif "quiz" in prompt_lower:
        return """Q1. Sample question?
A) Yes
B) No
Answer: A) Yes"""
    else:
        return "Development mode: add Groq API key to .env file."

def generate_verification_code():
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    return ''.join(random.choices(chars, k=6))

def send_otp_email(to_email, otp, name):
    if not GMAIL_USER or not GMAIL_PASS:
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your AI Study Hub OTP Code"
        msg["From"] = GMAIL_USER
        msg["To"] = to_email

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

        # FIX: STARTTLS on port 587 (fixes DEV MODE)
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
        FOREIGN KEY (user_email) REFERENCES users(email))""")
    conn.commit()
    conn.close()

init_db()

# ========== FEATURE DATA (full) ==========
FEATURES = {
    "summarizer": {
        "id": "summarizer", "emoji": "🧠", "title": "AI Text Summarizer",
        "tagline": "From walls of text to crystal-clear insights — instantly.",
        "color": "#00f5ff", "color2": "#a78bfa", "grad": "linear-gradient(135deg,#00f5ff,#a78bfa)",
        "desc": "Stop drowning in pages of notes. Our AI Summarizer reads everything and returns sharp, revision-ready bullet points in seconds.",
        "steps": [{"icon": "📋", "title": "Paste your text", "desc": "Drop in any text — notes, articles, chapters"},
                  {"icon": "⚡", "title": "AI processes it", "desc": "AI reads and extracts core meaning"},
                  {"icon": "✨", "title": "Get bullet points", "desc": "Receive clean overview and key points"}],
        "stats": [{"val": "10x", "lbl": "Faster revision"}, {"val": "50k", "lbl": "Chars supported"}, {"val": "100%", "lbl": "AI powered"}],
        "demo_lines": ["## Overview", "Photosynthesis converts light energy into chemical energy...", "## Key Points", "• Plants use chlorophyll", "• CO₂ + H₂O → glucose + O₂", "## Main Takeaway", "Photosynthesis is foundation of food chains."],
        "prev": None, "next": "pdf",
    },
    "pdf": {
        "id": "pdf", "emoji": "📄", "title": "PDF Summarizer",
        "tagline": "Upload any PDF. Get structured study notes in seconds.",
        "color": "#ff0080", "color2": "#ff6eb0", "grad": "linear-gradient(135deg,#ff0080,#ff6eb0)",
        "desc": "Upload textbooks, lecture slides, research papers and get structured notes instantly.",
        "steps": [{"icon": "📤", "title": "Upload PDF", "desc": "Drag or click to upload"},
                  {"icon": "🔎", "title": "AI reads it", "desc": "Every page is extracted"},
                  {"icon": "📚", "title": "Get notes", "desc": "Structured breakdown"}],
        "stats": [{"val": "15", "lbl": "Pages"}, {"val": "10MB", "lbl": "Max size"}, {"val": "3s", "lbl": "Processing"}],
        "demo_lines": ["# 📚 Study Notes", "## Overview", "This chapter covers Newton's laws...", "## Key Concepts", "• First Law (Inertia)"],
        "prev": "summarizer", "next": "chatbot",
    },
    "chatbot": {
        "id": "chatbot", "emoji": "🤖", "title": "AI Chatbot Assistant",
        "tagline": "Your 24/7 study companion — always ready.",
        "color": "#39ff14", "color2": "#00f5ff", "grad": "linear-gradient(135deg,#39ff14,#00f5ff)",
        "desc": "Ask any question, upload any file, and get clear educational answers instantly.",
        "steps": [{"icon": "💬", "title": "Ask anything", "desc": "Type or upload"},
                  {"icon": "🤖", "title": "AI understands", "desc": "AI analyzes"},
                  {"icon": "🎓", "title": "Learn instantly", "desc": "Get explanations"}],
        "stats": [{"val": "24/7", "lbl": "Available"}, {"val": "9+", "lbl": "File types"}, {"val": "∞", "lbl": "Questions"}],
        "demo_lines": ["You: What is DNA?", "🤖 DNA stores genetic information...", "• Double-stranded helix", "• Contains genes"],
        "prev": "pdf", "next": "quiz",
    },
    "quiz": {
        "id": "quiz", "emoji": "📝", "title": "Quiz Generator",
        "tagline": "Test yourself. Master what you don't.",
        "color": "#ffaa00", "color2": "#ff6eb0", "grad": "linear-gradient(135deg,#ffaa00,#ff6eb0)",
        "desc": "Creates interactive MCQs from any content with instant feedback.",
        "steps": [{"icon": "📋", "title": "Paste text", "desc": "Feed in study material"},
                  {"icon": "🎲", "title": "AI generates", "desc": "Challenging questions"},
                  {"icon": "✅", "title": "Answer", "desc": "Get instant feedback"}],
        "stats": [{"val": "5", "lbl": "Questions"}, {"val": "3x", "lbl": "Retention"}, {"val": "Auto", "lbl": "Score saved"}],
        "demo_lines": ["Q2. What is the powerhouse of the cell?", "▶ C) Mitochondria  ✓ Correct!", "Progress: ██████░░░░ Q 2 / 5"],
        "prev": "chatbot", "next": "analyzer",
    },
    "analyzer": {
        "id": "analyzer", "emoji": "🔍", "title": "Content Analyzer",
        "tagline": "Understand deeply — keywords, difficulty, tips.",
        "color": "#a78bfa", "color2": "#00f5ff", "grad": "linear-gradient(135deg,#a78bfa,#00f5ff)",
        "desc": "Get summary, key points, keywords, difficulty rating and study tips.",
        "steps": [{"icon": "📝", "title": "Paste content", "desc": "Any text works"},
                  {"icon": "🧬", "title": "Deep analysis", "desc": "AI identifies structure"},
                  {"icon": "📊", "title": "Full report", "desc": "Get insights"}],
        "stats": [{"val": "5", "lbl": "Sections"}, {"val": "3", "lbl": "Levels"}, {"val": "100%", "lbl": "Personalized"}],
        "demo_lines": ["## Summary", "Quantum entanglement...", "## Difficulty", "**Advanced**", "## Study Tips", "• Start with classical physics"],
        "prev": "quiz", "next": "performance",
    },
    "performance": {
        "id": "performance", "emoji": "📊", "title": "My Performance",
        "tagline": "Track your growth. Celebrate every win.",
        "color": "#00f5ff", "color2": "#39ff14", "grad": "linear-gradient(135deg,#00f5ff,#39ff14)",
        "desc": "Every quiz score is tracked with beautiful charts and stats.",
        "steps": [{"icon": "📝", "title": "Take quizzes", "desc": "Scores saved"},
                  {"icon": "📈", "title": "Data analyzed", "desc": "Track trends"},
                  {"icon": "🏆", "title": "See progress", "desc": "View charts"}],
        "stats": [{"val": "6", "lbl": "Metrics"}, {"val": "Live", "lbl": "Charts"}, {"val": "∞", "lbl": "History"}],
        "demo_lines": ["Total Quizzes → 12", "Average Score → 74%", "Best Score → 100% 🏆", "Trend → 📈 Improving"],
        "prev": "analyzer", "next": None,
    },
}

# ========== AUTH ROUTES ==========
@app.route("/")
def home():
    if "user" in session:
        return redirect("/dashboard")
    code = generate_verification_code()
    session["login_verification_code"] = code
    return render_template("login.html", verification_code=code)

@app.route("/signup")
def signup_page():
    if "user" in session:
        return redirect("/dashboard")
    code = generate_verification_code()
    session["verification_code"] = code
    return render_template("signup.html", verification_code=code)

@app.route("/register", methods=["POST"])
def register():
    name = request.form.get("name", "").strip()
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    user_code = request.form.get("verification_code", "").strip().upper()

    def re_render(error):
        new_code = generate_verification_code()
        session["verification_code"] = new_code
        return render_template("signup.html", error=error, verification_code=new_code, name=name, email=email)

    if not (name and email and password):
        return re_render("All fields required.")
    if len(password) < 6:
        return re_render("Password must be at least 6 characters.")
    if "@" not in email or "." not in email:
        return re_render("Valid email required.")
    expected = session.get("verification_code")
    if user_code != expected:
        return re_render("Wrong verification code.")
    conn = get_db()
    if conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
        conn.close()
        return re_render("Email already registered.")
    otp = str(random.randint(100000, 999999))
    expires = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    session["pending_reg"] = {"name": name, "email": email, "password": hash_pw(password), "otp": otp, "expires": expires}
    conn.close()
    sent = send_otp_email(email, otp, name)
    dev_otp = otp if not sent else None
    return render_template("otp.html", email=email, mode="register", dev_otp=dev_otp, sent=sent)

@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    mode = request.form.get("mode", "register")
    otp_input = request.form.get("otp", "").strip()
    pending = session.get("pending_reg", {})
    if not pending:
        return render_template("login.html", error="Session expired.")
    expires = pending.get("expires")
    if expires and datetime.utcnow() > datetime.fromisoformat(expires):
        session.pop("pending_reg", None)
        return render_template("otp.html", email=pending.get("email"), mode=mode, error="OTP expired.")
    if otp_input != pending.get("otp"):
        dev_otp = pending.get("otp") if not GMAIL_USER else None
        return render_template("otp.html", email=pending.get("email"), mode=mode, error="Incorrect OTP.", dev_otp=dev_otp, sent=True)
    conn = get_db()
    conn.execute("INSERT INTO users (name,email,password,verified) VALUES (?,?,?,1)",
                 (pending["name"], pending["email"], pending["password"]))
    conn.commit(); conn.close()
    session.pop("pending_reg", None)
    return render_template("login.html", success="Account verified! Please sign in.")

@app.route("/resend-otp", methods=["POST"])
def resend_otp():
    pending = session.get("pending_reg", {})
    if not pending:
        return redirect("/signup")
    otp = str(random.randint(100000, 999999))
    pending["otp"] = otp
    pending["expires"] = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    session["pending_reg"] = pending
    sent = send_otp_email(pending["email"], otp, pending["name"])
    dev_otp = otp if not sent else None
    return render_template("otp.html", email=pending["email"], mode="register", dev_otp=dev_otp, sent=sent, success="New OTP sent!")

@app.route("/login", methods=["POST"])
def login():
    email = request.form.get("email", "").strip().lower()
    password = request.form.get("password", "")
    user_code = request.form.get("verification_code", "").strip().upper()
    expected = session.get("login_verification_code")
    if not user_code or user_code != expected:
        new_code = generate_verification_code()
        session["login_verification_code"] = new_code
        return render_template("login.html", error="Invalid verification code.", verification_code=new_code)
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    conn.close()
    if not user or not verify_pw(user["password"], password):
        new_code = generate_verification_code()
        session["login_verification_code"] = new_code
        return render_template("login.html", error="Invalid email or password.", verification_code=new_code)
    if not user["verified"]:
        new_code = generate_verification_code()
        session["login_verification_code"] = new_code
        return render_template("login.html", error="Please verify your email first.", verification_code=new_code)
    session.pop("login_verification_code", None)
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

@app.route("/forgot-password", methods=["GET","POST"])
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
        return render_template("forgot_password.html", success="If that email exists, an OTP has been sent.")
    otp = str(random.randint(100000, 999999))
    session["reset_otp"] = otp
    session["reset_email"] = email
    session["reset_expires"] = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    sent = send_otp_email(email, otp, user["name"])
    dev_otp = otp if not sent else None
    return render_template("reset_otp.html", email=email, dev_otp=dev_otp, sent=sent)

@app.route("/verify-reset-otp", methods=["POST"])
def verify_reset_otp():
    otp_input = request.form.get("otp", "").strip()
    email = session.get("reset_email", "")
    saved_otp = session.get("reset_otp", "")
    expires = session.get("reset_expires", "")
    if not email or not saved_otp:
        return render_template("forgot_password.html", error="Session expired.")
    if expires and datetime.utcnow() > datetime.fromisoformat(expires):
        session.pop("reset_otp", None); session.pop("reset_email", None); session.pop("reset_expires", None)
        return render_template("forgot_password.html", error="OTP expired. Please try again.")
    if otp_input != saved_otp:
        dev_otp = saved_otp if not GMAIL_USER else None
        return render_template("reset_otp.html", email=email, error="Incorrect OTP.", dev_otp=dev_otp, sent=True)
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
    session["reset_otp"] = otp
    session["reset_expires"] = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    sent = send_otp_email(email, otp, user["name"] if user else "User")
    dev_otp = otp if not sent else None
    return render_template("reset_otp.html", email=email, dev_otp=dev_otp, sent=sent, success="New OTP sent!")

@app.route("/reset-password", methods=["POST"])
def reset_password():
    if not session.get("reset_verified"):
        return render_template("forgot_password.html", error="Session expired.")
    email = session.get("reset_email", "")
    password = request.form.get("password", "")
    confirm = request.form.get("confirm", "")
    if not password or not confirm:
        return render_template("new_password.html", email=email, error="Both fields required.")
    if len(password) < 6:
        return render_template("new_password.html", email=email, error="Password must be at least 6 characters.")
    if password != confirm:
        return render_template("new_password.html", email=email, error="Passwords do not match.")
    try:
        conn = get_db()
        conn.execute("UPDATE users SET password=? WHERE email=?", (hash_pw(password), email))
        conn.commit(); conn.close()
        session.pop("reset_otp", None); session.pop("reset_email", None); session.pop("reset_verified", None); session.pop("reset_expires", None)
        return render_template("login.html", success="Password reset! Please sign in.")
    except Exception as e:
        return render_template("new_password.html", email=email, error=str(e))

# ========== FEATURE PAGES ==========
@app.route("/feature/<name>")
def feature_page(name):
    feat = FEATURES.get(name)
    if not feat:
        return redirect("/")
    return render_template("feature.html", f=feat, features_map=FEATURES)

# ========== AI ROUTES (full) ==========
@app.route("/summarize", methods=["POST"])
def summarize():
    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Please enter some text."}), 400
    if len(text) < 30:
        return jsonify({"error": "Text is too short (minimum 30 characters)."}), 400
    if len(text) > 50000:
        return jsonify({"error": "Text too long (max 50,000 chars)."}), 400
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
        return jsonify({"error": str(e)}), 500

@app.route("/summarize-file", methods=["POST"])
def summarize_file():
    file = request.files.get("file")
    text = request.form.get("text", "").strip()
    if not file and not text:
        return jsonify({"error": "No file or text provided."}), 400
    content = text
    if file:
        fname = file.filename.lower()
        raw = file.read()
        if fname.endswith(".pdf"):
            reader = PyPDF2.PdfReader(io.BytesIO(raw))
            content = "\n".join(p.extract_text() or "" for p in reader.pages[:10]).strip()
        elif fname.endswith((".txt", ".md", ".csv", ".py", ".js")):
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
        return jsonify({"error": str(e)}), 500

@app.route("/chat", methods=["POST"])
def chat():
    message = ""
    file_content = ""
    if request.content_type and "multipart/form-data" in request.content_type:
        message = request.form.get("message", "").strip()
        file = request.files.get("file")
        if file and file.filename:
            fname = file.filename.lower()
            try:
                raw = file.read()
                if fname.endswith(".pdf"):
                    reader = PyPDF2.PdfReader(io.BytesIO(raw))
                    file_content = "\n".join(p.extract_text() or "" for p in reader.pages[:10]).strip()
                    file_content = f"\n\n[Attached PDF: {file.filename}]\n{file_content[:6000]}"
                elif fname.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
                    return jsonify({"reply": "Image analysis is not supported in this version. Please upload PDF or text files for analysis."})
                elif fname.endswith((".txt", ".md", ".csv", ".py", ".js", ".html", ".css", ".json", ".xml")):
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
        return jsonify({"error": str(e)}), 500

@app.route("/quiz", methods=["POST"])
def quiz():
    data = request.json or {}
    text = data.get("text", "").strip()
    num_questions = data.get("num_questions", 5)
    difficulty = data.get("difficulty", "medium")
    if not text:
        return jsonify({"error": "Please enter content first."}), 400
    difficulty_prompt = {
        "easy": "Create straightforward, basic questions testing core concepts.",
        "medium": "Create moderate difficulty questions testing understanding and application.",
        "hard": "Create challenging questions requiring deep analysis and critical thinking."
    }.get(difficulty, "Create moderate difficulty questions.")
    try:
        result = ask_groq(
            f"""Generate exactly {num_questions} multiple choice questions from the content below.
Difficulty: {difficulty_prompt}

Format STRICTLY as:
Q1. [Question]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Answer: [Letter]) [Answer text]

Leave one blank line between questions.

Content:
{text[:8000]}""",
            system="You are a quiz generator. Create clear, educational MCQs.")
        topic = text[:60].strip().replace("\n", " ")
        return jsonify({"quiz": result, "topic": topic})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/quiz-from-file", methods=["POST"])
def quiz_from_file():
    file = request.files.get("file")
    instruction = request.form.get("instruction", "").strip()
    num_questions = int(request.form.get("num_questions", 5))
    difficulty = request.form.get("difficulty", "medium")
    if not file:
        return jsonify({"error": "No file uploaded."}), 400
    fname = file.filename.lower()
    difficulty_prompt = {
        "easy": "Create straightforward, basic questions testing core concepts.",
        "medium": "Create moderate difficulty questions testing understanding and application.",
        "hard": "Create challenging questions requiring deep analysis and critical thinking."
    }.get(difficulty, "Create moderate difficulty questions.")
    try:
        raw = file.read()
        text = ""
        if fname.endswith(".pdf"):
            reader = PyPDF2.PdfReader(io.BytesIO(raw))
            text = "\n".join(p.extract_text() or "" for p in reader.pages[:15]).strip()
        elif fname.endswith((".txt", ".md", ".csv")):
            text = raw.decode("utf-8", errors="ignore")
        else:
            return jsonify({"error": "Unsupported file. Use PDF, TXT, MD, or CSV."}), 400
        if not text or len(text) < 30:
            return jsonify({"error": "Could not extract enough text."}), 400
        focus = f" Focus specifically on: {instruction}." if instruction else ""
        result = ask_groq(
            f"""Generate exactly {num_questions} multiple choice questions from the content below.{focus}
Difficulty: {difficulty_prompt}

Format STRICTLY as:
Q1. [Question]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Answer: [Letter]) [Answer text]

Leave one blank line between questions.

Content:
{text[:8000]}""",
            system="You are a quiz generator. Create clear, educational MCQs.")
        topic = (instruction or file.filename)[:60]
        return jsonify({"quiz": result, "topic": topic})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/submit-quiz-score", methods=["POST"])
def submit_quiz_score():
    if "user" not in session:
        return jsonify({"error": "Not logged in."}), 401
    data = request.json or {}
    score = data.get("score")
    total = data.get("total", 5)
    topic = data.get("topic", "General")[:80]
    if score is None or not isinstance(score, int):
        return jsonify({"error": "Invalid score."}), 400
    if not (0 <= score <= total):
        return jsonify({"error": "Score out of range."}), 400
    pct = round((score / total) * 100, 1)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        conn = get_db()
        conn.execute(
            "INSERT INTO quiz_attempts (user_email,topic,score,total,percentage,taken_at) VALUES (?,?,?,?,?,?)",
            (session["user"], topic, score, total, pct, now))
        conn.commit(); conn.close()
        if pct >= 80:
            grade, msg = "Excellent! 🏆", "Outstanding! Keep it up!"
        elif pct >= 60:
            grade, msg = "Good job! 👍", "Solid work."
        elif pct >= 40:
            grade, msg = "Keep going! 💪", "Revise weak areas."
        else:
            grade, msg = "Needs work 📚", "Don't give up!"
        return jsonify({"saved": True, "percentage": pct, "grade": grade, "message": msg})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analyzer", methods=["POST"])
def analyzer():
    text = (request.json or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "Please enter content."}), 400
    if len(text) < 20:
        return jsonify({"error": "Content too short (minimum 20 characters)."}), 400
    if len(text) > 50000:
        return jsonify({"error": "Too long. Max 50,000 chars."}), 400
    try:
        result = ask_groq(
            f"""Analyze this content and return EXACTLY this structure:

## 📋 Summary
[2-3 clear sentences]

## 🔑 Key Points
- [Point 1]
- [Minimum 4 points]

## 🏷️ Keywords
[Keywords, comma-separated]

## 📊 Difficulty Level
**[Beginner / Intermediate / Advanced]**
[One sentence why]

## 💡 Study Tips
- [Tip 1]
- [Tip 2]
- [Tip 3]

Content:
{text}""",
            system="You are an expert educational content analyzer.")
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/analyzer-file", methods=["POST"])
def analyzer_file():
    file = request.files.get("file")
    text = request.form.get("text", "").strip()
    if not file and not text:
        return jsonify({"error": "No file or text provided."}), 400
    content = text
    if file:
        fname = file.filename.lower()
        raw = file.read()
        if fname.endswith(".pdf"):
            reader = PyPDF2.PdfReader(io.BytesIO(raw))
            content = "\n".join(p.extract_text() or "" for p in reader.pages[:10]).strip()
        elif fname.endswith((".txt", ".md", ".csv", ".py", ".js")):
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
- [Minimum 4 points]

## 🏷️ Keywords
[Keywords, comma-separated]

## 📊 Difficulty Level
**[Beginner / Intermediate / Advanced]**
[One sentence why]

## 💡 Study Tips
- [Tip 1]
- [Tip 2]
- [Tip 3]

Content:
{content[:8000]}""",
            system="You are an expert educational content analyzer.")
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/pdf-summarize", methods=["POST"])
def pdf_summarize():
    if "pdf" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400
    f = request.files["pdf"]
    fname = f.filename.lower().strip() if f.filename else ""
    if not fname:
        return jsonify({"error": "No file selected."}), 400
    if not fname.endswith(".pdf"):
        ext = fname.split(".")[-1].upper() if "." in fname else "unknown"
        return jsonify({"error": f"{ext} files not supported. Upload PDF only."}), 400
    try:
        raw = f.read()
        if len(raw) == 0:
            return jsonify({"error": "File is empty."}), 400
        if len(raw) > 10 * 1024 * 1024:
            return jsonify({"error": "File too large. Max 10MB."}), 400
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(raw))
        except Exception:
            return jsonify({"error": "Could not read PDF."}), 400
        total_pages = len(reader.pages)
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
            return jsonify({"error": "No text found."}), 400
        if len(text) < 50:
            return jsonify({"error": "Very little text found."}), 400
        result = ask_groq(
            f"""Create comprehensive study notes from this PDF.
PDF: {total_pages} pages, reading {pages_to_read}.

Return EXACTLY:

# 📚 Study Notes

## Overview
[2-3 sentences]

## 📖 Section Breakdown
### [Section Name]
- [Key point]

## 🔑 Key Concepts
- [Concept]

## 📝 Important Terms
- **[Term]**: [Definition]

## ✅ Quick Revision Checklist
- [ ] [Item]

PDF Content:
{text[:8000]}""",
            system="You are an expert study notes creator.")
        return jsonify({"summary": result, "pages": total_pages, "extracted": pages_to_read})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
    attempts = [dict(r) for r in rows]
    scores = [r["percentage"] for r in rows]
    total_attempts = len(scores)
    avg_score = round(float(np.mean(scores)), 1)
    best_score = round(float(np.max(scores)), 1)
    worst_score = round(float(np.min(scores)), 1)
    pass_rate = round(sum(1 for s in scores if s >= 60) / total_attempts * 100, 1)
    improving = scores[-1] > scores[0] if len(scores) > 1 else None
    trend = "Improving" if improving else "Declining" if improving is False else "N/A"
    grade_dist = {"Excellent (80-100)":0, "Good (60-79)":0, "Average (40-59)":0, "Needs Work (<40)":0}
    for s in scores:
        if s >= 80:
            grade_dist["Excellent (80-100)"] += 1
        elif s >= 60:
            grade_dist["Good (60-79)"] += 1
        elif s >= 40:
            grade_dist["Average (40-59)"] += 1
        else:
            grade_dist["Needs Work (<40)"] += 1

    # Generate chart (full matplotlib)
    BG, AX = "#050508", "#0a0a12"
    CYAN, VIOLET, GREEN, AMBER, RED = "#00f5ff", "#a78bfa", "#39ff14", "#ffaa00", "#ff4d6d"
    TXT, GRID, BORDER = "#6b7aaa", "#1a1a2e", "#141420"
    fig = plt.figure(figsize=(14,10), facecolor=BG)
    gs = fig.add_gridspec(2,3, hspace=0.48, wspace=0.36, left=0.08, right=0.96, top=0.88, bottom=0.1)
    def style_ax(ax):
        ax.set_facecolor(AX)
        ax.tick_params(colors=TXT, labelsize=8)
        for sp in ax.spines.values():
            sp.set_color(BORDER)
        ax.grid(color=GRID, linewidth=0.55, linestyle="--", alpha=0.8)
    idx = list(range(1, len(scores)+1))
    ax1 = fig.add_subplot(gs[0,:2]); style_ax(ax1)
    ax1.plot(idx, scores, color=CYAN, linewidth=2.4, zorder=3)
    ax1.fill_between(idx, scores, alpha=0.12, color=CYAN)
    pc = [GREEN if s>=80 else AMBER if s>=60 else RED for s in scores]
    for xi,yi,c in zip(idx,scores,pc):
        ax1.scatter(xi,yi,color=c,s=55,zorder=5,edgecolors=BG,linewidths=1.2)
    ax1.axhline(60, color=AMBER, linewidth=1.2, linestyle="--", alpha=0.7, label="Pass (60%)")
    ax1.axhline(avg_score, color=VIOLET, linewidth=1.2, linestyle="--", alpha=0.7, label=f"Avg ({avg_score}%)")
    ax1.set_title("Score Trend", color="white", fontsize=11, fontweight="bold", pad=12)
    ax1.set_ylabel("Score (%)", color=TXT, fontsize=9)
    ax1.set_xlabel("Attempt #", color=TXT, fontsize=9)
    ax1.set_ylim(0,110)
    ax1.legend(facecolor=AX, edgecolor=BORDER, labelcolor=TXT, fontsize=8)

    ax2 = fig.add_subplot(gs[0,2])
    ax2.set_facecolor(BG)
    for sp in ax2.spines.values():
        sp.set_visible(False)
    ax2.tick_params(left=False,bottom=False,labelleft=False,labelbottom=False)
    ax2.grid(False)
    gkeys = list(grade_dist.keys()); gvals = list(grade_dist.values()); gcolors = [GREEN, CYAN, AMBER, RED]
    nz = [(k,v,c) for k,v,c in zip(gkeys,gvals,gcolors) if v>0]
    if nz:
        wl,wv,wc = zip(*nz)
        wedges,_,at = ax2.pie(wv, colors=wc, autopct="%1.0f%%", startangle=90, pctdistance=0.72,
                              wedgeprops=dict(width=0.52, edgecolor=BG, linewidth=2.5))
        for a in at:
            a.set_color("white"); a.set_fontsize(8); a.set_fontweight("bold")
        ax2.set_title("Grade Distribution", color="white", fontsize=11, fontweight="bold", pad=12)
        ax2.legend(wedges, [f"{l}: {v}" for l,v in zip(wl,wv)], loc="lower center",
                   bbox_to_anchor=(0.5,-0.2), fontsize=7, facecolor=AX, edgecolor=BORDER, labelcolor=TXT, ncol=1)

    ax3 = fig.add_subplot(gs[1,:2]); style_ax(ax3)
    bc = [GREEN if s>=80 else CYAN if s>=60 else AMBER if s>=40 else RED for s in scores]
    bars = ax3.bar(idx, scores, color=bc, alpha=0.85, width=0.65, zorder=3)
    ax3.axhline(60, color=AMBER, linewidth=1.2, linestyle="--", alpha=0.7)
    ax3.set_title("Score Per Attempt", color="white", fontsize=11, fontweight="bold", pad=12)
    ax3.set_ylabel("Score (%)", color=TXT, fontsize=9)
    ax3.set_xlabel("Attempt #", color=TXT, fontsize=9)
    ax3.set_ylim(0,115)
    for bar,sc in zip(bars,scores):
        ax3.text(bar.get_x()+bar.get_width()/2, bar.get_height()+2, f"{sc:.0f}%",
                 ha="center", va="bottom", color="white", fontsize=7.5, fontweight="bold")

    ax4 = fig.add_subplot(gs[1,2]); ax4.set_facecolor(AX)
    for sp in ax4.spines.values():
        sp.set_color(BORDER)
    ax4.tick_params(left=False,bottom=False,labelleft=False,labelbottom=False)
    ax4.grid(False)
    ax4.set_xlim(0,1); ax4.set_ylim(0,1)
    ax4.set_title("Your Stats", color="white", fontsize=11, fontweight="bold", pad=12)
    tc = GREEN if improving else RED if improving is False else TXT
    sr = [("Total Quizzes", str(total_attempts), CYAN), ("Average Score", f"{avg_score}%", CYAN),
          ("Best Score", f"{best_score}%", GREEN), ("Worst Score", f"{worst_score}%", RED),
          ("Pass Rate", f"{pass_rate}%", AMBER), ("Trend", trend, tc)]
    for i,(lbl,val,col) in enumerate(sr):
        y = 0.88 - i*0.145
        ax4.text(0.05,y,lbl, color=TXT, fontsize=8, va="center")
        ax4.text(0.95,y,val, color=col, fontsize=9, va="center", ha="right", fontweight="bold")
        if i < len(sr)-1:
            ax4.axhline(y-0.06, color=BORDER, linewidth=0.5, alpha=0.6)

    fig.suptitle(f"Quiz Performance — {session.get('name','Student')}", color="white", fontsize=13, fontweight="bold", y=0.97)
    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=110, bbox_inches="tight", facecolor=fig.get_facecolor())
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode()
    plt.close()

    return jsonify({
        "empty": False,
        "chart": f"data:image/png;base64,{b64}",
        "total_attempts": total_attempts,
        "avg_score": avg_score,
        "best_score": best_score,
        "worst_score": worst_score,
        "pass_rate": pass_rate,
        "trend": trend,
        "recent": attempts[-5:][::-1]
    })

if __name__ == "__main__":
    app.run(debug=False)