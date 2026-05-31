require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://holistic-health-companion.vercel.app',
    /\.vercel\.app$/,
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false }));

app.use('/api/chat',     require('./routes/chat'));
app.use('/api/ocr',      require('./routes/ocr'));
app.use('/api/health',   require('./routes/health'));
app.use('/api/patient',  require('./routes/patient'));
app.use('/api/medicine', require('./routes/medicine'));

app.get('/', (req,res) => res.json({ message: 'Health Companion API v3.0', status: 'running' }));
app.use((err,req,res,next) => res.status(err.status||500).json({ error: err.message||'Server Error' }));
app.use((req,res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`\n  Health Companion Backend — http://localhost:${PORT}`);
  console.log(`  Gemini: ${process.env.GEMINI_API_KEY ? 'Configured ✓' : 'Not set in .env (key can be entered via /settings)'}\n`);
});
module.exports = app;
