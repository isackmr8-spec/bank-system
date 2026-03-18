# 🏦 CRDB-like Professional Banking System

**Full-stack banking app with AI Chat, Bills, Savings, Loans** - Backend API ready.

## ✨ **Live Features (Customer Post-Register)**
| Feature | API Endpoint | Description |
|---------|--------------|-------------|
| **Accounts** | GET/POST `/api/accounts` | List/create accounts, balance check |
| **Transfers** | POST `/api/transactions/transfer` | Send money between accounts |
| **Loans** | POST `/api/loans/apply` | Apply for personal/business loans |
| **Bills** | POST `/api/bills/pay` | Pay TANESCO, Vodacom, water (instant) |
| **Statements** | GET `/api/accounts/:id/statement` | Transaction history + balance |
| **Savings** | POST `/api/savings/deposit` | Bonus interest 2.5% (>50k TZS) |
| **AI Chat** | POST `/api/chat/message` | GPT-powered banking assistant (EN/Swahili) |
| **Admin** | `/api/admin/*` | Reports, customer management |

## 🚀 **Quick Start (Local)**
```
cd backend
npm install
npm start  # http://localhost:3000
```
Or double-click `backend/start.bat` (SQLite auto-setup).

**Test Flow:**
1. `POST /api/auth/register` → OTP → Login → JWT
2. `POST /api/bills/pay` → Pay electricity
3. `POST /api/chat/message` {"message": "how to check balance?"} → AI guides
4. `GET /api/accounts/1/statement` → PDF-ready history

## ☁️ **Deploy to Render.com (FREE, 2 min)**
1. Zip this folder → Upload to GitHub repo
2. render.com → New Web Service → Connect GitHub
3. Build: `npm install` | Start: `npm start`
4. Add env vars: `JWT_SECRET=...` (DB auto-provisioned)

**Hosted URL:** `https://your-bank.onrender.com`

## 🛠 **Tech Stack**
```
Backend: Express.js + SQLite (prod: Postgres)
AI: OpenAI GPT-3.5 (fallback rule-based)
Security: JWT, Helmet, Validation
Email: Nodemailer
DB: Auto-migrate tables + triggers
```

## 📁 **Structure**
```
backend/ → API server
html main/ → Frontend pages (static)
db/ → Schema + seeds
assets/ → CSS/JS
```

## 🔑 **Environment (.env)**
```
JWT_SECRET=your-secret
OPENAI_API_KEY=sk-... (optional)
DATABASE_URL=postgres://... (Render provides)
```

## 🧪 **API Playground**
```
# Chat AI
curl -X POST /api/chat/message -H "Authorization: Bearer jwt" -d '{"message":"msaada na bills"}'

# Pay bill
curl -X POST /api/bills/pay -d '{"account_id":1, "bill_type":"VODACOM", "amount":1000}'

# Savings interest calc
curl "/api/savings/interest?principal=100000&months=12"
```

**Production-ready Tanzanian banking system** with AI assistant! 🇹🇿✨

⭐ **Star on GitHub** · [Deploy to Render](render.com)

