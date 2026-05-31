require('dotenv').config();
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/pdf',
];

const MAX_SIZE_MB  = 8;
const MAX_SIZE_B   = MAX_SIZE_MB * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_B },
  fileFilter: (req, file, cb) => {
    ALLOWED_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only JPG, PNG, WEBP images and PDF files are supported.'));
  },
});

const LANG = {
  english:  'Respond entirely in English.',
  hindi:    'पूरा जवाब हिंदी में दें।',
  bengali:  'সম্পূর্ণ উত্তর বাংলায় দিন।',
  tamil:    'முழு பதிலையும் தமிழில் கொடுங்கள்.',
  telugu:   'మొత్తం సమాధానం తెలుగులో ఇవ్వండి.',
  marathi:  'संपूर्ण उत्तर मराठीत द्या.',
  gujarati: 'સંપૂર્ણ જવાબ ગુજરાતીમાં આપો.',
  punjabi:  'ਪੂਰਾ ਜਵਾਬ ਪੰਜਾਬੀ ਵਿੱਚ ਦਿਓ।',
};

const buildPrompt = (language) => `You are a medical document analysis expert helping rural Indian patients understand their medical documents.

${LANG[language] || LANG.english}

Carefully examine this medical document image and extract ALL information. Explain everything in very simple language that a person with basic literacy can understand.

Return ONLY a valid JSON object with NO markdown, NO code fences, NO extra text:

{
  "documentType": "Type of document (e.g. Blood Test Report, Prescription, X-Ray Report, Discharge Summary)",
  "patientName": "Patient name if visible, else null",
  "patientAge": "Patient age if visible, else null",
  "doctorName": "Doctor name if visible, else null",
  "hospitalName": "Hospital or lab name if visible, else null",
  "documentDate": "Date on document if visible, else null",
  "extractedText": "Complete raw text extracted from the document exactly as written",
  "testResults": [
    {
      "testName": "Name of the test (e.g. Haemoglobin)",
      "value": "Result value with unit (e.g. 8.2 g/dL)",
      "normalRange": "Normal range if printed on report (e.g. 13.0 - 17.0 g/dL)",
      "status": "NORMAL or LOW or HIGH or BORDERLINE or CRITICAL",
      "simpleMeaning": "What this result means in very simple words a villager can understand"
    }
  ],
  "medications": [
    {
      "name": "Medicine name",
      "dose": "Dose (e.g. 500mg)",
      "frequency": "How often (e.g. 3 times daily)",
      "duration": "How long (e.g. 5 days)",
      "instructions": "Special instructions (e.g. take after meals)"
    }
  ],
  "doctorAdvice": "Doctor advice or instructions if written on document, else null",
  "keyFindings": "Most important findings explained in simple language",
  "whatToDo": [
    "Step 1 action the patient should take",
    "Step 2 action",
    "Step 3 action"
  ],
  "warningSigns": [
    "Symptom that means go to hospital immediately"
  ],
  "simpleSummary": "Overall plain language summary — what it means and what the patient should do. Write as if explaining to a village elder. Maximum 5 sentences.",
  "urgencyLevel": "ROUTINE or SOON or URGENT or EMERGENCY",
  "urgencyReason": "Why this urgency level was assigned"
}

If any field is not found in the document use null for that field or empty array [] for array fields. Only extract what is clearly visible.`;

function parseJSON(raw) {
  try { return JSON.parse(raw); } catch {}
  const fm = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fm) { try { return JSON.parse(fm[1].trim()); } catch {} }
  const om = raw.match(/\{[\s\S]*\}/);
  if (om) { try { return JSON.parse(om[0]); } catch {} }
  return {
    documentType: 'Medical Document',
    extractedText: raw,
    testResults: [],
    medications: [],
    keyFindings: 'Could not parse structured results. See extracted text.',
    whatToDo: ['Please consult a doctor for interpretation.'],
    warningSigns: [],
    simpleSummary: raw,
    urgencyLevel: 'ROUTINE',
  };
}

router.post('/analyze', upload.single('document'), async (req, res) => {
  try {
    const { apiKey, language = 'english' } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    if (req.file.size > MAX_SIZE_B)
      return res.status(413).json({ error: `File too large. Maximum allowed size is ${MAX_SIZE_MB} MB. Please compress or split the PDF and try again.` });

    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) return res.status(401).json({ error: 'Gemini API key required.' });

    const isPdf    = req.file.mimetype === 'application/pdf';
    const mimeType = isPdf ? 'application/pdf' : req.file.mimetype;

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const filePart = {
      inlineData: {
        data: req.file.buffer.toString('base64'),
        mimeType,
      },
    };

    const result = await model.generateContent([buildPrompt(language), filePart]);
    const raw    = result.response.text().trim();
    const parsed = parseJSON(raw);

    if (!Array.isArray(parsed.testResults))  parsed.testResults  = [];
    if (!Array.isArray(parsed.medications))  parsed.medications  = [];
    if (!Array.isArray(parsed.whatToDo))     parsed.whatToDo     = [];
    if (!Array.isArray(parsed.warningSigns)) parsed.warningSigns = [];

    res.json({
      success: true,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      isPdf,
      language,
      result: parsed,
    });

  } catch (err) {
    console.error('OCR Error:', err.message);
    if (err.message?.includes('API_KEY_INVALID'))
      return res.status(401).json({ error: 'Invalid Gemini API key.' });
    if (err.message?.includes('429') || err.message?.includes('quota'))
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment.' });
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(413).json({ error: `File too large. Maximum allowed size is ${MAX_SIZE_MB} MB. Please compress or split the PDF and try again.` });
    if (err.message?.includes('429') || err.message?.includes('quota'))
      return res.status(429).json({ error: 'Rate limit reached. Please wait a moment.' });
    res.status(500).json({ error: err.message || 'OCR analysis failed.' });
  }
});

module.exports = router;
