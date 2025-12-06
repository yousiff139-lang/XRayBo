# 🦷 XRayBo - Dental X-Ray AI Analysis

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green?style=for-the-badge&logo=fastapi)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)

**AI-powered dental X-ray analysis for cavity and periapical lesion detection**

</div>

---

## ✨ Features

- 🔍 **AI Detection** - Detects cavities, periapical lesions, and other dental conditions using Roboflow AI
- 📝 **Smart Diagnosis Reports** - Generates comprehensive diagnostic reports with treatment recommendations using Google Gemini
- 🤖 **Interactive 3D Robot** - Features an animated 3D robot assistant with contextual chat bubbles
- 📊 **PDF Export** - Export detailed diagnostic reports as PDF documents
- 🎨 **Modern UI** - Beautiful glassmorphism design with smooth animations

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18.0.0 or higher
- **Python** 3.12 or higher
- **pnpm** (recommended) or npm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yousiff139-lang/XRayBo.git
   cd XRayBo
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend && pnpm install && cd ..
   ```

4. **Install backend dependencies**
   ```bash
   cd backend && uv sync && cd ..
   ```

5. **Configure environment variables**

   Create `backend/.env`:
   ```env
   ROBOFLOW_API_KEY=your_roboflow_api_key
   GEMINI_API_KEY=your_gemini_api_key
   DEBUG=true
   ```

### Running the Application

**Single command to start everything:**
```bash
npm run dev
```

This starts:
- 🌐 **Frontend**: http://localhost:3000
- ⚙️ **Backend**: http://localhost:8000

---

## 🏗️ Project Structure

```
XRayBo/
├── frontend/           # Next.js 15 + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── app/        # App router pages
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom hooks
│   │   └── lib/        # Utilities
│   └── package.json
│
├── backend/            # FastAPI + Python
│   ├── app/
│   │   ├── api/        # API routes
│   │   ├── core/       # Config & settings
│   │   ├── models/     # Data models
│   │   └── services/   # Business logic
│   └── pyproject.toml
│
└── package.json        # Root config (runs both)
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript**
- **TailwindCSS v4**
- **Spline** for 3D graphics
- **Framer Motion** for animations
- **TanStack Query** for data fetching

### Backend
- **FastAPI** - High-performance Python API
- **Google Gemini** - AI diagnostic reports
- **Roboflow** - Computer vision detection
- **LangChain** - AI orchestration

---

## 📸 Screenshots

| Upload X-Ray | AI Detection | Diagnosis Report |
|:------------:|:------------:|:----------------:|
| Upload dental X-rays (DICOM, PNG, JPEG) | AI detects cavities & lesions | Comprehensive treatment recommendations |

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/detect` | Upload & detect conditions |
| `POST` | `/api/v1/generate-diagnostic-report` | Generate AI diagnosis |

---

## 👥 Authors

- **Karrar Al-Mayaly**
- **Mohammed Majed**

---

## 📄 License

This project is for educational purposes.

---

<div align="center">

Made with ❤️ for better dental diagnostics

</div>
