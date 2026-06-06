# 🏠 HostelOps — AI-Powered Hostel Maintenance Dashboard

> An intelligent, real-time hostel maintenance management platform that uses AI to prioritize, classify, assign, and predict maintenance issues — built for hackathons and real deployments.

---

## 🚨 Problem Statement

Hostels across India face a massive operational gap in maintenance management:

- Students report issues verbally or on paper — **no structured tracking**
- Wardens manually decide what to fix first — **no data-driven prioritization**
- Technicians are assigned randomly — **skills are wasted, workloads unbalanced**
- Recurring issues in the same rooms go unnoticed — **no pattern detection**
- Emergency hazards (electrical sparks, fire, gas leaks) are not flagged urgently — **safety risk**
- Nobody can predict upcoming complaint surges — **reactive rather than proactive**

The result: delayed repairs, student dissatisfaction, safety incidents, and warden burnout.

---

## 💡 Solution

**HostelOps** is a full-stack AI operations platform that replaces chaotic manual processes with a smart, explainable, and real-time system:

| Pain Point | AI Solution |
|---|---|
| No prioritization | AI scoring engine (Safety × Disruption × Age × Cost) |
| Random technician assignment | Recommendation engine with confidence % |
| No complaint classification | NLP keyword classifier (6 categories) |
| Recurring issues missed | Duplicate complaint detection |
| Emergencies not flagged | Real-time emergency keyword alert system |
| No forecasting | Predictive complaint surge model |
| Can't explain AI decisions | Full explainability panel with "Why?" bullets |

---

## ✨ Key Features

### 🧠 AI Core
- **NLP Keyword Classifier** — auto-detects category (Plumbing, Electrical, HVAC, Furniture, Cleaning, Security) from complaint text
- **Priority Scoring Engine** — weighted formula: `(Safety × w1) + (Disruption × w2) + (Age × w3) + (Cost × w4)`
- **AI Explainability Panel** — "Why this priority?" with detected keywords, safety %, similar past cases, estimated damage cost
- **Technician Recommendation Engine** — matches specialty, calculates confidence %, shows reasons

### 📊 Warden Dashboard
- **Live Ticket Queue** — sorted by AI priority score, filterable by category/priority/search
- **Hostel Floor Heatmap** — color-coded complaint hotspots per block & floor (🔴🟠🟡🟢)
- **Predictive Forecast** — next-week complaint surge predictions with ↑↓ % per category
- **Technician Leaderboard** — Top 5 ranked by resolution rate with animated bars
- **AI Weight Tuning** — sliders to adjust how much Safety, Disruption, Age, Cost affect score
- **Smart Auto-Assign** — one-click AI dispatch to best-available specialist

### 🎓 Student Portal
- **Live NLP Analysis** — real-time classification as student types
- **🎤 Voice Input** — speak your complaint, Web Speech API transcribes it
- **📷 AI Image Damage Detection** — upload a photo → detects Water Leakage, Rust, Electrical Damage + Risk Level
- **💸 Cost Prediction** — estimated repair cost in ₹ with confidence %
- **🧠 "Why?" Explainability** — shows students why AI classified their issue the way it did
- **🚨 Emergency Alert** — full-screen critical alert for fire/smoke/shock/gas/electrocution
- **⚠️ Duplicate Detection** — warns if a similar open ticket already exists for that room

### 💬 AI Chat Assistant
- Floating "Ask Hostel AI" widget on every page
- Answers natural language queries: *"Which room has most complaints?"*, *"Who is overloaded?"*, *"Show unresolved electrical issues"*

### 📋 Complaint Timeline
- Every ticket shows a step-by-step lifecycle in the explanation modal:
  `Submitted → AI Classified → Dispatched → Tech Accepted → Resolved`

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5, Vanilla CSS, JavaScript (ES6+) | Full UI — no framework needed |
| **Backend** | Python 3.10+ with **FastAPI** | REST API server |
| **Database** | **SQLite** (via `sqlite3`) | Persistent ticket & technician storage |
| **Validation** | **Pydantic** v2 | Request body models and type safety |
| **ASGI Server** | **Uvicorn** | Serves the FastAPI app |
| **Charts** | **Chart.js** (CDN) | Analytics doughnut + bar charts |
| **Fonts** | **Google Fonts** (Outfit + JetBrains Mono) | Premium typography |
| **Voice** | **Web Speech API** (browser built-in) | Voice complaint input |
| **NLP** | Custom rule-based keyword engine | Category + risk classification |
| **No external AI API** | All AI logic is client/server-side | Works offline after install |

### 🔌 APIs Used (All Internal — No External Keys Needed)

| Endpoint | Method | What it does |
|---|---|---|
| `GET /api/tickets` | GET | Fetch all tickets, recalculate priority scores live |
| `POST /api/tickets` | POST | Submit new complaint (NLP classifies on server) |
| `POST /api/tickets/{id}/assign` | POST | Assign a technician to a ticket |
| `POST /api/tickets/{id}/resolve` | POST | Mark ticket as resolved |
| `GET /api/technicians` | GET | Fetch all technicians with live active task counts |
| `GET /api/weights` | GET | Get current AI priority weight configuration |
| `POST /api/weights` | POST | Update AI weights (live re-sort triggers) |
| `POST /api/smart-assign` | POST | AI auto-assigns all pending tickets to best-fit technicians |
| `GET /` | GET | Serves the main HTML dashboard |

> **Interactive API Docs** are auto-generated by FastAPI — visit `http://localhost:8000/docs` after startup.

---

## 📦 Prerequisites

Make sure you have the following installed:

- **Python 3.10+** → [python.org/downloads](https://www.python.org/downloads/)
- **pip** (comes with Python)

---

## ⚙️ Setup & Installation

### Step 1 — Clone / Download the project

```bash
# If using git
git clone <your-repo-url>
cd hostel-maintenance-dashboard

# Or just navigate to the folder
cd hostel-maintenance-dashboard
```

### Step 2 — Install Python dependencies

```bash
pip install -r requirements.txt
```

### Step 3 — Run the server

```bash
python main.py
```

You should see:
```
AI Hostels database initialized.
Starting FastAPI dashboard server at http://localhost:8000...
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Step 4 — Open the app

Open your browser and go to:
```
http://localhost:8000
```

---

## 🌐 Deploying to Render (Cloud Hosting)

This project is fully configured for a 1-click cloud deployment on **Render**:

1. Push your code to your **GitHub** repository.
2. Go to **[Render.com](https://render.com/)** and sign in.
3. Click **New +** ➔ **Web Service** and connect your repository.
4. Render will automatically detect the **Dockerfile** and configure the environment.
5. Choose the **Free** tier and click **Deploy**.
6. Render will build and launch your container, providing a permanent `https://<your-app>.onrender.com` link.

---

## 🎮 Demo Instructions 

### Demo Flow 1 — AI Classification & Explainability
1. Click **Student Reporting** in the sidebar
2. Enter Room: `A-304`, Urgency: `High`
3. Type in the description: `water leaking from washroom pipe, causing flooding`
4. Watch the **Live AI Assessment** panel update in real-time:
   - Category auto-detects as **Plumbing**
   - Safety Risk, Priority Score, Cost Prediction appear
   - **"Why this classification?"** panel shows bullet reasons
5. Click **Submit** → switches to Warden Dashboard, ticket appears at top of queue
6. Click **Explain AI** on the ticket → see the **two-column modal** with Timeline + Technician Recommendation

### Demo Flow 2 — Emergency Alert System
1. Go to **Student Reporting**
2. Type: `fire in my room, smoke everywhere`
3. Watch the 🚨 **full-screen emergency overlay** appear immediately
4. Click Acknowledge → the red banner persists until text is changed

### Demo Flow 3 — Voice Input
1. In Student Reporting, click the 🎤 **Voice Input** button (requires Chrome/Edge)
2. Say: *"Water leaking from the bathroom tap"*
3. Speech is transcribed automatically → NLP analyzes it

### Demo Flow 4 — Image Damage Detection
1. In Student Reporting, click the upload area
2. Upload any image (name it `pipe_leak.jpg` or `sparking_fusebox.jpg` for specific results)
3. AI scans for 1.8s → shows detected labels: **✓ Water Leakage ✓ Corrosion**, Risk Level, Confidence %

### Demo Flow 5 — AI Chat Assistant
1. Click **"Ask Hostel AI"** floating button (bottom-right)
2. Ask: *"Which room has most complaints?"*
3. Ask: *"Which technician is overloaded?"*
4. Ask: *"Show unresolved electrical issues"*

### Demo Flow 6 — Warden Dashboard Features
1. View the **Floor Heatmap** — shows complaint hotspots per floor per block
2. View **Predicted Issues Next Week** — Electrical ↑18%, Plumbing ↑12%
3. View **Top Technicians** leaderboard
4. Adjust the **AI Weight Tuning** sliders → ticket queue re-sorts live
5. Click ⚡ (Smart Assign) to auto-dispatch all pending tickets

### Demo Flow 7 — Duplicate Detection
1. Submit a complaint for Room `A-304` with category `Plumbing`
2. Submit again for the same Room + Category
3. See the ⚠️ **"Similar Issue Already Reported"** warning banner

---

## 📁 Project Structure

```
hostel-maintenance-dashboard/
│
├── main.py              # FastAPI backend — REST API + NLP engine + SQLite
├── app.js               # Frontend logic — all AI features, UI interactions
├── index.html           # Dashboard UI — 3 views (Warden, Student, Analytics)
├── style.css            # Styling — Glassmorphism dark theme
├── hostel_maintenance.db  # SQLite database (auto-created on first run)
└── README.md            # This file
```

---

## 🔑 No API Keys Required

All AI functionality is **self-contained**:
- NLP classification: custom rule-based keyword engine (no OpenAI/Gemini needed)
- Image detection: simulated analysis (no YOLO/Roboflow API key needed)
- Voice input: browser's built-in Web Speech API (no cloud STT needed)
- Forecasting: statistical trend simulation (no ML model hosting needed)

This means the app works **fully offline** after the Python packages are installed.

---

## 👥 Team

Built for a hackathon to demonstrate how AI can transform hostel facility management from reactive chaos into a proactive, data-driven operation.

---

## 📄 License

MIT License — free to use, modify, and deploy.
