# 🎯 WebClient Hunter AI

> AI-powered SaaS that helps freelancers and agencies find businesses with poor websites, audit them instantly, and generate personalized outreach to close more clients.

---

## 📋 Project Overview

**WebClient Hunter AI** is a full-stack SaaS application that:
- Finds businesses by niche and location that need website improvements
- Runs AI-powered website audits (SEO, speed, mobile, security)
- Generates personalized cold outreach emails using GPT-4o-mini
- Manages leads through a built-in CRM pipeline

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS (ES6+) |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | OpenAI API (GPT-4o-mini) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render / Railway |

---

## 📁 Folder Structure

```
webclient-hunter-ai/
├── frontend/               # Static frontend (Vercel)
│   ├── index.html          # Landing page
│   ├── dashboard.html      # Main dashboard
│   ├── search.html         # Lead search
│   ├── reports.html        # Website audit reports
│   ├── crm.html            # Lead CRM
│   ├── settings.html       # User settings
│   ├── css/style.css       # All styles
│   └── js/main.js          # All JavaScript
├── backend/                # Express API (Render/Railway)
│   ├── server.js           # Express entry point
│   ├── routes/             # Route definitions
│   ├── controllers/        # Business logic
│   ├── services/           # Supabase, OpenAI, Audit
│   ├── middleware/         # Auth, error handling
│   └── utils/              # Validators
├── supabase/
│   └── schema.sql          # Database schema + RLS policies
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/webclient-hunter-ai.git
cd webclient-hunter-ai
```

### 2. Frontend (runs without backend)

The frontend works standalone with demo data using localStorage. Just open in a browser:

```bash
# Option A: VS Code Live Server (recommended)
# Install the Live Server extension, right-click index.html → Open with Live Server

# Option B: Python simple server
cd frontend
python3 -m http.server 3000
# Open http://localhost:3000

# Option C: npx serve
npx serve frontend -p 3000
```

All pages work out of the box with demo data. No backend needed to explore the UI.

---

## ⚙️ Backend Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
PORT=3001
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

OPENAI_API_KEY=sk-your-openai-api-key

ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
```

### 3. Run the backend

```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Backend will run at `http://localhost:3001`.

**Health check:** `GET http://localhost:3001/health`

---

## 🗄️ Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)

2. In your project dashboard, go to **SQL Editor**

3. Paste and run the contents of `supabase/schema.sql`

4. Copy your credentials from **Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

5. Add them to your `.env` file

---

## 🔑 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `PORT` | Backend server port | No (default: 3001) |
| `NODE_ENV` | `development` or `production` | No |
| `SUPABASE_URL` | Your Supabase project URL | Yes (for DB) |
| `SUPABASE_ANON_KEY` | Supabase public key | Yes (for DB) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key | Yes (for backend) |
| `OPENAI_API_KEY` | OpenAI API key | Yes (for AI features) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Yes |

> Without Supabase/OpenAI keys, the app runs in **demo mode** — all features work with sample data.

---

## 🌐 Deployment

### Frontend → Vercel

1. Push your repo to GitHub

2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo

3. Set the **Root Directory** to `frontend`

4. Deploy — Vercel will auto-detect it's a static site

5. Update `ALLOWED_ORIGINS` in your backend `.env` with your Vercel URL

### Backend → Render

1. Go to [render.com](https://render.com) → New → Web Service

2. Connect your GitHub repo

3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node

4. Add all environment variables from `.env` in the Render dashboard

5. Deploy

### Backend → Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
cd backend
railway login
railway init
railway up
```

Set environment variables in the Railway dashboard.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Server health check |
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/leads/search` | Search leads by niche/location |
| GET | `/api/leads` | Get all saved leads |
| POST | `/api/leads` | Save a new lead |
| PATCH | `/api/leads/:id` | Update lead (status, notes) |
| DELETE | `/api/leads/:id` | Delete a lead |
| POST | `/api/audit` | Run a website audit |
| POST | `/api/outreach/generate` | Generate outreach email |

---

## 🎨 Frontend Features

- ✅ Full demo mode — works without any backend
- ✅ Dark / light mode toggle (persisted in localStorage)
- ✅ Mobile-first responsive design
- ✅ Lead search with filters (niche, location, keyword)
- ✅ Save leads to localStorage
- ✅ CRM with status management and inline editing
- ✅ Website audit demo report with scores
- ✅ Toast notifications
- ✅ Smooth animations
- ✅ Accessible (WCAG 2.1 AA)
- ✅ SEO optimized meta tags

---

## 🔒 Security Features

- Helmet.js (HTTP security headers)
- CORS whitelist
- Rate limiting (100 req / 15 min)
- Input validation on all endpoints
- JWT authentication via Supabase
- Row Level Security on all database tables
- Environment variables for all secrets

---

## 📄 License

MIT — free to use and modify.

---

## 🙋 Support

Open an issue on GitHub or email support@yourapp.com
