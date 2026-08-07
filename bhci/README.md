# Brain Health Check-In — Server

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
node server.js
```

Or with a custom port and admin password:
```bash
PORT=8080 ADMIN_PASSWORD=mysecretpw node server.js
```

### 3. Access the app
| URL | Page |
|-----|------|
| `http://localhost:3000/` | Survey app |
| `http://localhost:3000/admin.html` | Admin dashboard |

### Admin login
Default password: **btladmin2024**
Change it by setting the `ADMIN_PASSWORD` environment variable.

---

## What gets logged

**Every page visit:**
- IP address
- User agent (browser/device)
- Date & time (UTC)

**Every completed submission:**
- IP address
- Date & time
- Total score (0–15)
- Result band
- Each of the 15 Yes/No answers individually

---

## Admin Dashboard Sections
- **Stats cards** — total visits, completions, completion rate, average score
- **14-day trend** — visits vs submissions over time
- **Band breakdown** — Flourishing / Under Pressure / Needs Support
- **Symptom frequency** — % of users who said Yes to each question
- **Score distribution** — bar chart of 0–15 scores
- **Recent submissions** — last 20 entries with IP, timestamp, score, band

---

## Files
```
bhci/
├── server.js          ← Express + SQLite backend
├── bhci.db            ← SQLite database (auto-created on first run)
├── package.json
├── README.md
└── public/
    ├── index.html     ← Survey app
    └── admin.html     ← Admin dashboard
```

## Production deployment
For production, use [PM2](https://pm2.keymetrics.io/) to keep the server running:
```bash
npm install -g pm2
pm2 start server.js --name bhci
pm2 save
pm2 startup
```
