const express = require('express');
const router  = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.get('/status', (req, res) => res.json({
  status: 'online',
  timestamp: new Date().toISOString(),
  version: '3.0.0',
  aiProvider: 'Google Gemini',
  geminiConfigured: !!process.env.GEMINI_API_KEY,
}));

router.post('/validate-key', async (req, res) => {
  const key = req.body.apiKey || process.env.GEMINI_API_KEY;
  if (!key) return res.json({ valid: false, message: 'No API key provided.' });
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
    await model.generateContent('Hello');
    res.json({ valid: true, message: 'Gemini API key is valid!' });
  } catch (err) {
    res.json({ valid: false, message: 'Invalid Gemini API key or connection error.' });
  }
});

module.exports = router;
