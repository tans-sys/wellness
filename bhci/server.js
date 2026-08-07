const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'btladmin2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── DATABASE SETUP ──────────────────────────────────────────
const db = new Database(path.join(__dirname, 'bhci.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_score INTEGER,
    band TEXT,
    sleep_tired INTEGER,
    mind_cluttered INTEGER,
    hard_focus INTEGER,
    scrolling INTEGER,
    hard_recover INTEGER,
    switch_off INTEGER,
    mentally_drained INTEGER,
    forget_things INTEGER,
    mood_updown INTEGER,
    problems_bigger INTEGER,
    hard_motivated INTEGER,
    procrastinate INTEGER,
    eating_control INTEGER,
    rely_distractions INTEGER,
    hard_optimistic INTEGER
  );
`);

// ── HELPERS ─────────────────────────────────────────────────
function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function requireAdmin(req, res, next) {
  const auth = req.headers['x-admin-password'];
  if (auth !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── PUBLIC ROUTES ────────────────────────────────────────────

// Log a page visit
app.post('/api/visit', (req, res) => {
  const ip = getIP(req);
  const ua = req.headers['user-agent'] || '';
  db.prepare('INSERT INTO visits (ip, user_agent) VALUES (?, ?)').run(ip, ua);
  res.json({ ok: true });
});

// Log a completed submission
app.post('/api/submit', (req, res) => {
  const ip = getIP(req);
  const { total, band, answers } = req.body;
  // answers = array of 15 scores (0 or 1) in question order
  if (!Array.isArray(answers) || answers.length !== 15) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  db.prepare(`
    INSERT INTO submissions (
      ip, total_score, band,
      sleep_tired, mind_cluttered, hard_focus, scrolling,
      hard_recover, switch_off, mentally_drained, forget_things,
      mood_updown, problems_bigger, hard_motivated, procrastinate,
      eating_control, rely_distractions, hard_optimistic
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ip, total, band, ...answers);
  res.json({ ok: true });
});

// ── ADMIN ROUTES ─────────────────────────────────────────────

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: 'Wrong password' });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const totalVisits     = db.prepare('SELECT COUNT(*) as c FROM visits').get().c;
  const todayVisits     = db.prepare("SELECT COUNT(*) as c FROM visits WHERE date(timestamp)=date('now')").get().c;
  const totalSubmissions = db.prepare('SELECT COUNT(*) as c FROM submissions').get().c;
  const todaySubmissions = db.prepare("SELECT COUNT(*) as c FROM submissions WHERE date(timestamp)=date('now')").get().c;

  // Band breakdown
  const bands = db.prepare(`
    SELECT band, COUNT(*) as count FROM submissions GROUP BY band ORDER BY count DESC
  `).all();

  // Score distribution (0-15 buckets)
  const scoreDist = db.prepare(`
    SELECT total_score, COUNT(*) as count FROM submissions GROUP BY total_score ORDER BY total_score
  `).all();

  // Per-question Yes rate
  const cols = [
    'sleep_tired','mind_cluttered','hard_focus','scrolling',
    'hard_recover','switch_off','mentally_drained','forget_things',
    'mood_updown','problems_bigger','hard_motivated','procrastinate',
    'eating_control','rely_distractions','hard_optimistic'
  ];
  const labels = [
    'Wake up tired','Mind cluttered','Hard to focus','Excess scrolling',
    'Hard to recover','Cant switch off','Mentally drained','Forgetting things',
    'Mood up & down','Problems feel big','Low motivation','Procrastinating',
    'Eating out of control','Rely on distractions','Hard to be optimistic'
  ];
  const questionStats = cols.map((col, i) => {
    const row = db.prepare(`SELECT SUM(${col}) as yes, COUNT(*) as total FROM submissions`).get();
    return {
      label: labels[i],
      yes: row.yes || 0,
      total: row.total || 0,
      pct: row.total > 0 ? Math.round((row.yes / row.total) * 100) : 0
    };
  });

  // Visits over last 14 days
  const visitTrend = db.prepare(`
    SELECT date(timestamp) as day, COUNT(*) as count
    FROM visits
    WHERE timestamp >= date('now', '-13 days')
    GROUP BY day ORDER BY day
  `).all();

  // Submissions over last 14 days
  const submitTrend = db.prepare(`
    SELECT date(timestamp) as day, COUNT(*) as count
    FROM submissions
    WHERE timestamp >= date('now', '-13 days')
    GROUP BY day ORDER BY day
  `).all();

  // Recent submissions (last 20)
  const recent = db.prepare(`
    SELECT id, ip, timestamp, total_score, band FROM submissions
    ORDER BY timestamp DESC LIMIT 20
  `).all();

  res.json({
    totalVisits, todayVisits,
    totalSubmissions, todaySubmissions,
    bands, scoreDist, questionStats,
    visitTrend, submitTrend, recent
  });
});

// ── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BHCI server running on http://localhost:${PORT}`);
  console.log(`Admin password: ${ADMIN_PASSWORD}`);
});
