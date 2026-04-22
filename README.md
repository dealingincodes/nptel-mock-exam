# 📝 NPTEL Mock Exam Portal

A fully-featured **NPTEL/SWAYAM-style mock exam platform** built with pure HTML, CSS, and JavaScript — no frameworks, no backend, no installation needed.

![Landing Page](https://img.shields.io/badge/Pages-4-blue) ![License](https://img.shields.io/badge/License-MIT-green) ![No Framework](https://img.shields.io/badge/Framework-None-orange)

---

## ✨ Features

### 🎓 Student / Exam Interface
- **NPTEL-style exam UI** — identical layout, color scheme, and question palette
- **Live countdown timer** — turns yellow at 10 min, red at 5 min, auto-submits on timeout
- **Color-coded question palette** (exactly like NPTEL/SWAYAM):
  - 🩶 Grey — Not Visited
  - 🔴 Red — Visited but Not Answered
  - 🟢 Green — Answered
  - 🟣 Purple — Marked for Review
  - 🟣🟢 Purple+Green — Answered & Marked for Review
- **Mark for Review** and **Clear Response** buttons
- **Submit confirmation modal** with answer summary
- **Session persistence** — refreshing the page mid-exam resumes your session
- Mobile responsive

### ⚙️ Admin Panel
- **CSV Upload** — drag-and-drop or file picker
- **Live preview table** of parsed questions before saving
- **Validation** — highlights rows with missing fields or invalid correct answer
- **Exam configuration** — name, duration, description, shuffle options
- **Download sample CSV** — get a working template instantly
- **Manage exams** — view, start, or delete saved exams

### 📊 Results Page
- Score summary with pass/fail verdict (≥40% = Pass)
- Correct / Wrong / Skipped / Accuracy / Time Taken stats
- **Full question review table** — color-coded rows per result
- Filter by: All / Correct / Wrong / Skipped
- Search questions by text
- Explanations shown per question (if provided in CSV)

---

## 🗂️ Project Structure

```
nptel-quiz/
├── index.html          # Landing page — lists available exams
├── admin.html          # Admin panel — upload & manage exams
├── exam.html           # NPTEL-style exam interface
├── results.html        # Results & question review
├── css/
│   ├── style.css       # Shared design system & global styles
│   ├── admin.css       # Admin panel styles
│   └── exam.css        # Exam interface styles
└── js/
    ├── admin.js        # CSV parsing, exam storage, management
    ├── exam.js         # Timer, navigation, palette, submit logic
    └── results.js      # Score calculation & review rendering
```

---

## 📋 CSV Format

Upload a CSV file with the following columns:

| Column | Required | Description |
|---|---|---|
| `question_no` | No | Row number (auto-assigned if missing) |
| `question` | ✅ Yes | Question text |
| `option_a` | ✅ Yes | Option A text |
| `option_b` | ✅ Yes | Option B text |
| `option_c` | ✅ Yes | Option C text |
| `option_d` | ✅ Yes | Option D text |
| `correct_answer` | ✅ Yes | `A`, `B`, `C`, or `D` |
| `explanation` | No | Shown in results review |

### Example CSV:

```csv
question_no,question,option_a,option_b,option_c,option_d,correct_answer,explanation
1,"What is the full form of NPTEL?","National Programme on Technology Enhanced Learning","National Programme on Technology Enhanced Library","National Project on Technology Enhanced Learning","Not a real acronym","A","NPTEL stands for National Programme on Technology Enhanced Learning."
2,"Which organization launched NPTEL?","AICTE","IITs and IISc","UGC","MHRD","B","NPTEL was launched by the IITs and IISc."
```

---

## 🚀 How to Use

### Option 1: Open directly (GitHub Pages / local)
Just open `index.html` in your browser — no server needed for basic use.

### Option 2: Local development server
```bash
# Python 3
python -m http.server 7890

# Then open http://localhost:7890
```

### Option 3: GitHub Pages
1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, root folder
4. Your site will be live at `https://<username>.github.io/<repo-name>`

---

## 💾 Data Storage

All exam data is stored in the **browser's localStorage** — no backend or database required. Each user's exam data is local to their own browser.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Structure |
| CSS3 (Vanilla) | Styling & animations |
| JavaScript (ES6+) | All logic |
| [PapaParse](https://www.papaparse.com/) | CSV parsing (CDN) |
| Google Fonts | Typography (Inter) |
| localStorage | Exam data persistence |
| sessionStorage | In-progress session + results |

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

> **Disclaimer:** This project is not officially affiliated with NPTEL, IITs, or SWAYAM. It is an independent mock exam tool built for practice purposes.
