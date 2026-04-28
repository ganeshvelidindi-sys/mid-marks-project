# 🎓 VEMU Institute of Technology — Student Mid Marks Management System

A full-stack web application for managing student mid-term marks at VEMU Institute of Technology (Autonomous), P. Kotha Kota.

---

## 🏗️ Project Structure

```
vemu-project/
├── backend/          ← Node.js + Express + MongoDB API
│   ├── models/       ← Mongoose schemas
│   ├── routes/       ← API routes
│   ├── middleware/   ← JWT auth middleware
│   ├── server.js     ← Main entry point
│   └── .env          ← Environment variables
│
└── frontend/         ← React JS application
    ├── public/
    └── src/
        ├── api/      ← Axios API calls
        ├── assets/   ← VEMU logos/images
        ├── components/ ← Reusable components
        ├── context/  ← Auth context
        └── pages/    ← Dashboard pages
```

---

## 🚀 Setup & Run Instructions

### Prerequisites
- Node.js v18+ installed
- MongoDB Atlas account (already configured)
- npm or yarn

---

### Step 1: Setup Backend

```bash
cd vemu-project/backend
npm install
```

The `.env` file is already configured with:
```
MONGO_URI=mongodb+srv://Ganesh:Ganesh1117@cluster0.9m3lrmy.mongodb.net/vemu_marks
JWT_SECRET=vemu_institute_technology_jwt_secret_2025
PORT=5000
```

Run the backend:
```bash
npm start
# OR for development with auto-reload:
npm run dev
```

> ✅ On first run, admin user is auto-created: **admin / admin123**

---

### Step 2: Setup Frontend

```bash
cd vemu-project/frontend
npm install
npm start
```

Opens at: **http://localhost:3000**

---

## 👥 User Roles & Default Credentials

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Admin | `admin` | `admin123` | Full system control |
| HOD | Created by Admin | `password123` | Department oversight |
| Faculty | Created by Admin | `password123` | Marks entry |
| Class Teacher | Created by Admin | `password123` | Class monitoring |
| Student | Created by Admin | `password123` | View marks only |

---

## 📋 Feature Overview

### 🔐 Authentication
- JWT-based secure login
- Role-based access control (5 roles)
- Password encryption with bcryptjs

### ⚙️ Admin
- Create/Edit/Delete users (HOD, Faculty, Class Teacher, Student)
- Add students individually
- Configure mark limits and academic settings
- View institution-wide reports

### 🎓 HOD (Head of Department)
- View all submitted marks for their department
- Approve or reject mark submissions with remarks
- Approved marks are **locked** (cannot be edited)
- View department-wise performance reports

### 📚 Faculty
- Select branch, semester, section, and subject
- Enter marks question-wise (Q1-Q5 × 10 marks each per mid)
- Enter assignment marks (max 5)
- Save as draft or submit to HOD
- System auto-calculates internal marks

### 📋 Class Teacher
- View all students in their class
- Monitor marks status across subjects
- View class performance summary

### 🎒 Student
- View their own marks (read-only)
- See detailed question-wise breakdown
- View internal marks calculation
- Print marks report

---

## 🧮 Internal Marks Formula

```
Mid Exam Total = Q1 + Q2 + Q3 + Q4 + Q5  (max 25)
Grand Total = Mid Exam Total + Assignment  (max 30)

Best Mid  = MAX(Grand Total Mid1, Grand Total Mid2)
Second Mid = MIN(Grand Total Mid1, Grand Total Mid2)

Internal Marks = (Best Mid × 80%) + (Second Mid × 20%)
               → Rounded to nearest 0.5
```

---

## 🔄 Marks Workflow

```
Faculty enters marks (Draft)
        ↓
Faculty submits to HOD (Submitted)
        ↓
HOD reviews marks
   ↓              ↓
Approve         Reject
(Locked)    (Back to Faculty)
```

---

## 🛠️ Technology Stack

### Backend
- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **JWT** (jsonwebtoken) — Authentication
- **bcryptjs** — Password encryption
- **CORS** — Cross-origin support

### Frontend
- **React JS** (Create React App)
- **React Router DOM** — Navigation
- **Axios** — HTTP client
- **React Hot Toast** — Notifications

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/users` | Get all users (admin) |
| POST | `/api/users` | Create user (admin) |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/students` | Get students |
| POST | `/api/students` | Add student |
| POST | `/api/students/bulk` | Bulk import |
| GET | `/api/marks` | Get marks |
| POST | `/api/marks/save` | Save marks |
| POST | `/api/marks/submit` | Submit to HOD |
| POST | `/api/marks/approve` | Approve (HOD) |
| POST | `/api/marks/reject` | Reject (HOD) |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |
| GET | `/api/reports/class` | Class report |
| GET | `/api/reports/department` | Dept report |

---

## 📦 Departments Configured
CSE | ECE | EEE | MECH | CIVIL | AI&ML | IT

## 📅 Semesters
I | II | III | IV | V | VI | VII | VIII (8 Semesters, 4-year B.Tech)

---

## 🏫 About VEMU Institute of Technology
- Affiliated to JNTUA
- Approved by AICTE
- Accredited by NAAC with A+
- NBA Accredited: CSE, ECE & EEE
- P. Kotha Kota, Chittoor, AP — 517112

---

*Developed for VEMU Institute of Technology (Autonomous) — Academic Year 2025-26*
