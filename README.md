# SkipSmart – Smart Attendance Tracker

> **Know if you can skip today in 3 seconds.**

<img width="3420" height="1962" alt="image" src="https://github.com/user-attachments/assets/8fd8e282-e5d4-43d7-8b02-4b4ab95ba6eb" />


SkipSmart is a smart, student-focused attendance management web application that helps users track subject-wise attendance, receive alerts, view analytics, and **make informed decisions about skipping classes without violating minimum attendance rules**.

🌐 **Live Demo:** https://skipsmart.vercel.app

---

## 🚀 Problem Statement

Students often:
- Lose track of subject-wise attendance
- Skip classes without knowing the impact
- Realize attendance shortages only before exams
- Manually calculate attendance percentages

This leads to **academic penalties, exam restrictions, and stress**.

---

## 💡 Solution Overview

SkipSmart provides:
- Real-time subject-wise attendance tracking
- “Can I Skip Today?” decision simulation
- Safe skip calculation while maintaining minimum attendance (e.g., 75%)
- Attendance zone classification (Safe / Caution / Danger)
- Analytics dashboard with insights and trends
- Optional reminders & alerts

⚠️ **SkipSmart does NOT promote skipping classes.**  
It promotes **responsible, data-driven decision-making**.

---

## 🎯 Key Features

### ✅ Subject-wise Attendance Tracking
- Track attended classes, total classes, and percentage in real time.

### 🧮 Safe Skip Calculator
- Calculates how many classes can be skipped safely.
- Simulates attendance **before and after skipping**.

### 🚦 Attendance Zones
- 🟢 Safe Zone (≥ 80%)
- 🟡 Caution Zone (75–79%)
- 🔴 Danger Zone (< 75%)

### 📊 Analytics Dashboard
- Best & worst attended subjects
- Total skips
- Attendance streaks
- Subjects at risk

### 🔔 Alerts & Reminders
- Warnings when attendance approaches danger levels
- Optional reminder toggle

### 📅 Semester Planning (Optional)
- Total skips allowed
- Skips used
- Skips remaining

---

## 🔄 Application Workflow

1. **Add Subjects** – Initialize subjects with optional semester data  
2. **Mark Attendance** – Mark present/absent after each class  
3. **Real-time Calculation** – Attendance % and risk updated instantly  
4. **Skip Simulation** – Check impact before skipping a class  
5. **Alerts & Warnings** – Get notified when attendance is low  
6. **Analytics & Insights** – View trends and performance summaries  

---

## 🔧 Tech Stack Used

### Frontend
- **HTML5** – Semantic structure & accessibility
- **CSS3** – Responsive UI, dashboards, zones
- **JavaScript (ES6)** – Core logic, calculations, analytics

### Browser & Storage
- **LocalStorage** – Persistent subject-wise data
- **Web Notifications API** – Attendance alerts

### Design & UX
- Responsive grid layout
- Color-coded risk zones
- Minimal input, student-first UI

---

## 🧠 Why SkipSmart is Different

| Traditional Tracking | SkipSmart |
|----------------------|----------|
| Manual calculations | Automatic & real-time |
| Guess-based skipping | Data-driven decisions |
| Late realization | Proactive alerts |
| No insights | Actionable analytics |

---

## 👥 Target Users

- College & university students
- Students under strict attendance rules
- Students balancing academics with internships, hackathons, or travel

---

## 📈 Impact

- Prevents students from falling below **75% attendance**
- Reduces academic penalties
- Encourages responsible attendance behavior
- Saves time and mental effort

---

## 🚀 Future Scope

### 🔹 Short-Term Enhancements
- Login-based profiles
- Cloud sync (Firebase / Supabase)

### 🔹 Advanced Features
- AI-based attendance risk prediction
- Timetable-based auto reminders
- Smart recovery plan generator

### 🔹 Institutional Scale
- Integration with college ERP/LMS
- Official attendance sync
- Admin dashboards for departments

### 🔹 Platform Expansion
- Mobile app (Flutter / React Native)
- Progressive Web App (PWA)
- Multi-university configuration support

### 🔹 Data & Intelligence Expansion
- Semester-wise attendance trends
- Personalized recommendations
- Early-warning system for chronic low attendance

---

## 🧪 Running the Project Locally

```bash
git clone https://github.com/your-username/skipsmart.git
cd skipsmart
open index.html
