# ⚡ AI Study Hub

> An AI-powered web application that helps students study smarter — built with Flask + Groq LLM.

---

## 🚀 Features

| Tool | Description |
|------|-------------|
| 🧠 AI Text Summarizer | Paste any text or upload a file — get sharp bullet-point summaries |
| 📄 PDF Summarizer | Upload a PDF (up to 15 pages) — get structured study notes |
| 🤖 AI Chatbot | 24/7 study assistant — upload files, ask questions, generate quizzes |
| 📝 Quiz Generator | Auto-generate MCQs from any content with instant feedback |
| 🔍 Content Analyzer | Keywords, difficulty rating, key points, and study tips |
| 📊 My Performance | Analytics dashboard with trend charts and quiz history |

---

## 🛠️ Tech Stack

- **Backend:** Python, Flask
- **AI:** Groq API (LLaMA 3.3 70B)
- **Database:** SQLite
- **Frontend:** Vanilla HTML/CSS/JS (Neural Cosmos design system)
- **Auth:** OTP email verification, bcrypt password hashing, math CAPTCHA

---

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/ai-study-hub.git
cd ai-study-hub
```

### 2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate        # Linux / macOS
venv\Scripts\activate           # Windows
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `GROQ_API_KEY` — get a free key at [console.groq.com](https://console.groq.com)
- `GMAIL_USER` + `GMAIL_PASS` — Gmail + App Password for OTP emails
- `DEV_MODE=True` — run without email/API key (uses mock responses)

### 5. Generate the secret key
```bash
python -c "import secrets; open('secret.key','w').write(secrets.token_hex(32))"
```

### 6. Run the app
```bash
python app.py
```
Open [http://localhost:5000](http://localhost:5000)

---

## 📁 Project Structure

```
AI_STUDY_HUB/
├── app.py                  # Flask application & all routes
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── .gitignore
├── static/
│   ├── style.css           # Neural Cosmos design system
│   ├── feature.css         # Feature page styles
│   └── script.js           # All frontend logic
└── templates/
    ├── dashboard.html      # Main dashboard (all 6 tools)
    ├── feature.html        # Individual feature landing pages
    ├── login.html
    ├── signup.html
    ├── otp.html            # Email OTP verification
    ├── reset_otp.html      # Password reset OTP
    ├── forgot_password.html
    └── new_password.html
```

---

## 🔐 Security Features

- Passwords hashed with `werkzeug` (bcrypt)
- OTP email verification with 10-minute expiry
- Math CAPTCHA on login and signup
- Secret key stored in `secret.key` (not committed)
- All secrets in `.env` (not committed)

---

## 📸 Screenshots

> Login page · Dashboard · Quiz in action · Performance analytics

---

## 👨‍💻 Author

Built as a Python web development assignment.
