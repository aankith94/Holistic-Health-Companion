const express  = require('express');
const router   = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path     = require('path');
const db       = require(path.join(__dirname, '..', 'medicines.json'));

// ── Fuzzy helpers ─────────────────────────────────────────────

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

// Score a medicine against a query — lower = better match
function scoreMatch(med, q) {
  const qLen = q.length;
  const targets = [
    med.generic_name.toLowerCase(),
    med.id.toLowerCase(),
    ...med.brand_names.map(b => b.toLowerCase()),
    // also try first word of generic name (e.g. "paracetamol" from "Paracetamol (Acetaminophen)")
    med.generic_name.toLowerCase().split(/[\s(]/)[0],
  ];

  let best = Infinity;
  for (const t of targets) {
    // Exact contains — highest priority
    if (t === q) return -3;
    if (t.startsWith(q)) return -2;
    if (t.includes(q)) return -1;
    // Fuzzy — only worth trying if lengths are close
    if (Math.abs(t.length - qLen) <= 4) {
      const dist = levenshtein(q, t.slice(0, Math.min(t.length, qLen + 3)));
      best = Math.min(best, dist);
    }
    // Also try word-by-word for multi-word queries
    const words = t.split(/\s+/);
    for (const w of words) {
      if (w.startsWith(q)) best = Math.min(best, 0.5);
      if (Math.abs(w.length - qLen) <= 3)
        best = Math.min(best, levenshtein(q, w) * 0.8);
    }
  }
  return best;
}

// Returns best local DB match + its score
function findMedicineWithScore(name) {
  const q = name.toLowerCase().trim();
  let bestMed = null, bestScore = Infinity;
  for (const med of db.medicines) {
    const s = scoreMatch(med, q);
    if (s < bestScore) { bestScore = s; bestMed = med; }
  }
  // Accept if: exact/prefix/contains (-3 to -1), or fuzzy distance ≤ 2
  if (bestScore <= 2) return { med: bestMed, score: bestScore, fuzzy: bestScore > -1 };
  return { med: null, score: bestScore, fuzzy: false };
}

function findMedicine(name) {
  return findMedicineWithScore(name).med;
}

function findAllMedicines(names) {
  return names.map(name => ({ name, data: findMedicine(name) }));
}

// ── AI lookup fallback ────────────────────────────────────────
async function aiMedicineLookup(name, apiKey) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;

  const prompt = `You are a clinical pharmacologist. A patient in rural India is asking about the medicine: "${name}"

This could be a brand name (e.g. Sumo, Dolo, Combiflam, Crocin, Pan, Allegra), generic name, or a misspelling.

Return ONLY a valid JSON object — no markdown, no extra text:
{
  "found": true,
  "generic_name": "full generic/scientific name",
  "brand_names": ["Brand1", "Brand2", "Brand3"],
  "category": "medicine category e.g. Analgesic, Antibiotic, Antacid",
  "schedule": "OTC or Schedule H or Schedule H1 or Schedule X",
  "otc_available": true or false,
  "indications": ["condition 1", "condition 2", "condition 3"],
  "standard_dose": {
    "adult": "e.g. 500mg every 6-8 hours",
    "child": "e.g. 10-15mg/kg every 6 hours",
    "max_daily_adult": "e.g. 4g per day"
  },
  "how_to_take": "e.g. Take with or after food. Swallow whole with water.",
  "common_side_effects": ["side effect 1", "side effect 2"],
  "serious_side_effects": ["serious effect 1"],
  "contraindications": ["do not use if condition 1", "do not use if condition 2"],
  "cautions": ["use with caution if condition 1"],
  "interactions": ["interacts with drug 1", "interacts with drug 2"],
  "safe_in_pregnancy": true or false,
  "pregnancy_note": "brief pregnancy safety note",
  "prescription_note": "note about prescription requirement or null",
  "source": "Standard medical reference (AI-generated — verify with pharmacist)"
}

If this medicine truly does not exist or you are not confident, return: {"found": false}

Be accurate and India-specific. Common Indian brands: Sumo = Nimesulide+Paracetamol, Dolo 650 = Paracetamol 650mg, Combiflam = Ibuprofen+Paracetamol, Pan = Pantoprazole, Allegra = Fexofenadine, Montair = Montelukast, Augmentin = Amoxicillin+Clavulanate.`;

  const genAI  = new GoogleGenerativeAI(key);
  const model  = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', generationConfig: { temperature: 0.1 } });
  const result = await model.generateContent(prompt);
  return parseJSON(result.response.text().trim());
}

function parseJSON(raw) {
  try { return JSON.parse(raw); } catch {}
  const fm = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fm) { try { return JSON.parse(fm[1].trim()); } catch {} }
  const om = raw.match(/\{[\s\S]*\}/);
  if (om) { try { return JSON.parse(om[0]); } catch {} }
  return null;
}

// Normalise a raw DB record to the shape SingleMedicineResult expects
function normaliseMed(med) {
  return {
    ...med,
    // map used_for → indications
    indications: med.indications || med.used_for || [],
    // fill missing fields with sensible defaults
    how_to_take: med.how_to_take ||
      (med.otc_available
        ? 'Take as directed on the pack or by your pharmacist. Swallow with water.'
        : 'Take exactly as prescribed by your doctor.'),
    common_side_effects: med.common_side_effects || [],
    serious_side_effects: med.serious_side_effects || [],
    onset_of_action: med.onset_of_action || null,
    duration_of_effect: med.duration_of_effect || null,
    prescription_note: med.prescription_note ||
      (!med.otc_available ? `${med.schedule} — requires a valid doctor's prescription.` : null),
  };
}

// ── GET /api/medicine/lookup/:name ───────────────────────────
router.get('/lookup/:name', async (req, res) => {
  const name   = req.params.name;
  const apiKey = req.query.apiKey || req.headers['x-api-key'] || process.env.GEMINI_API_KEY;

  // 1. Try local DB with fuzzy matching
  const { med, fuzzy } = findMedicineWithScore(name);
  if (med) {
    return res.json({
      found: true,
      medicine: normaliseMed(med),
      source: med.source,
      fromDatabase: true,
      fuzzyMatch: fuzzy,
      fuzzyNote: fuzzy ? `Showing result for "${med.generic_name}" — closest match found.` : null,
    });
  }

  // 2. Fall back to AI
  try {
    const aiResult = await aiMedicineLookup(name, apiKey);
    if (!aiResult || !aiResult.found) {
      return res.status(404).json({
        found: false,
        message: `"${name}" not found. Please check the spelling or try the generic name.`,
      });
    }
    return res.json({
      found: true,
      medicine: aiResult,
      source: aiResult.source || 'AI-generated — verify with pharmacist',
      fromDatabase: false,
      aiGenerated: true,
    });
  } catch (err) {
    console.error('AI lookup error:', err.message);
    return res.status(404).json({
      found: false,
      message: `"${name}" not found in database. ${apiKey ? 'AI lookup also failed — check your connection.' : 'Add your Gemini API key in /settings to enable AI lookup for any medicine.'}`,
    });
  }
});

// ── POST /api/medicine/check-interaction ─────────────────────
router.post('/check-interaction', async (req, res) => {
  try {
    const { medicines, apiKey } = req.body;
    if (!medicines || medicines.length < 2)
      return res.status(400).json({ error: 'At least 2 medicines required.' });

    const dbResults      = findAllMedicines(medicines);
    const dbInteractions = checkDatabaseInteractions(dbResults);

    const dbData = dbResults.map(r => r.data ? {
      name: r.data.generic_name,
      brands: r.data.brand_names.join(', '),
      category: r.data.category,
      schedule: r.data.schedule,
      contraindications: r.data.contraindications,
      cautions: r.data.cautions,
      interactions: r.data.interactions,
      prescriptionRequired: !r.data.otc_available,
      pregnancySafe: r.data.safe_in_pregnancy,
      pregnancyNote: r.data.pregnancy_note,
      source: r.data.source,
    } : null).filter(Boolean);

    const key = apiKey || process.env.GEMINI_API_KEY;
    let aiResult = null;

    if (key) {
      const dbContext = dbData.length > 0
        ? `LOCAL VERIFIED DATABASE:\n${dbData.map(d =>
            `${d.name} (${d.brands}):
  Category: ${d.category} | Schedule: ${d.schedule}
  Contraindications: ${d.contraindications.join('; ')}
  Cautions: ${d.cautions.join('; ')}
  Known Interactions: ${d.interactions.join('; ')}
  Pregnancy Safe: ${d.pregnancySafe ? 'Yes' : 'No'} — ${d.pregnancyNote}
  Source: ${d.source}`).join('\n\n')}`
        : 'No local database entries found.';

      const dbIntContext = dbInteractions.length > 0
        ? `DATABASE-VERIFIED INTERACTIONS:\n${dbInteractions.map(i => `${i.drugs.join(' + ')}: [${i.severity}] ${i.description}`).join('\n')}`
        : 'No interactions found in local database for these pairs.';

      const prompt = `You are a clinical pharmacologist checking drug interactions for rural Indian patients.
Use the provided verified database as PRIMARY reference. Only add interactions you are highly confident about. Do not fabricate.
Return ONLY valid JSON with no markdown:
{
  "interactions": [{"drugs":["A","B"],"severity":"SAFE|CAUTION|DANGEROUS","description":"explanation","advice":"what to do","fromDatabase":false}],
  "overallSafety": "SAFE|CAUTION|DANGEROUS",
  "summary": "plain language summary",
  "recommendation": "final advice for patient",
  "prescriptionWarnings": ["medicines needing prescription"],
  "pregnancyWarnings": ["pregnancy unsafe medicines"]
}

Check interactions for: ${medicines.join(', ')}

${dbContext}

${dbIntContext}

Use database as primary reference. Add only well-established additional interactions.`;

      const genAI  = new GoogleGenerativeAI(key);
      const model  = genAI.getGenerativeModel({ model: 'gemini-3.5-flash', generationConfig: { temperature: 0.1 } });
      const result = await model.generateContent(prompt);
      aiResult     = parseJSON(result.response.text().trim());
    }

    if (aiResult && dbInteractions.length > 0) {
      dbInteractions.forEach(dbi => {
        const exists = aiResult.interactions?.some(ai =>
          ai.drugs.some(d => dbi.drugs.some(dd => d.toLowerCase().includes(dd.toLowerCase())))
        );
        if (!exists) {
          aiResult.interactions = [{ ...dbi, verified: true }, ...(aiResult.interactions || [])];
        } else {
          aiResult.interactions = aiResult.interactions?.map(ai =>
            ai.drugs.some(d => dbi.drugs.some(dd => d.toLowerCase().includes(dd.toLowerCase())))
              ? { ...ai, fromDatabase: true, verified: true, source: dbi.source }
              : ai
          );
        }
      });
    }

    const finalResult = aiResult || {
      interactions: dbInteractions,
      overallSafety: dbInteractions.some(i => i.severity === 'DANGEROUS') ? 'DANGEROUS'
        : dbInteractions.some(i => i.severity === 'CAUTION') ? 'CAUTION' : 'SAFE',
      summary: dbInteractions.length > 0
        ? 'Interactions found in verified medical database.'
        : 'No significant interactions found in verified database.',
      recommendation: 'Always consult a licensed pharmacist or doctor before combining medicines.',
      prescriptionWarnings: dbData.filter(d => d.prescriptionRequired).map(d => `${d.name} requires a prescription`),
      pregnancyWarnings: dbData.filter(d => !d.pregnancySafe).map(d => d.pregnancyNote),
    };

    res.json({
      success: true,
      medicines,
      databaseMatches: dbResults.map(r => ({
        searched: r.name,
        found: !!r.data,
        genericName: r.data?.generic_name,
        brands: r.data?.brand_names,
        schedule: r.data?.schedule,
        otcAvailable: r.data?.otc_available,
        prescriptionNote: r.data?.prescription_note,
      })),
      result: finalResult,
      sources: db.metadata.sources,
    });

  } catch (err) {
    console.error('Medicine check error:', err.message);
    if (err.message?.includes('API_KEY_INVALID'))
      return res.status(401).json({ error: 'Invalid Gemini API key.' });
    res.status(500).json({ error: err.message || 'Medicine check failed.' });
  }
});

function checkDatabaseInteractions(list) {
  const interactions = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (!a.data || !b.data) continue;
      const aHit = a.data.interactions.find(x =>
        b.data.brand_names.some(bn => x.toLowerCase().includes(bn.toLowerCase())) ||
        x.toLowerCase().includes(b.data.generic_name.toLowerCase().split(' ')[0]) ||
        x.toLowerCase().includes(b.data.id)
      );
      const bHit = b.data.interactions.find(x =>
        a.data.brand_names.some(bn => x.toLowerCase().includes(bn.toLowerCase())) ||
        x.toLowerCase().includes(a.data.generic_name.toLowerCase().split(' ')[0]) ||
        x.toLowerCase().includes(a.data.id)
      );
      if (aHit || bHit) {
        const desc = aHit || bHit;
        const severity = (desc.toLowerCase().includes('dangerous') || desc.toLowerCase().includes('fatal') || desc.toLowerCase().includes('contraindicated'))
          ? 'DANGEROUS' : 'CAUTION';
        interactions.push({
          drugs: [a.data.generic_name.split(' ')[0], b.data.generic_name.split(' ')[0]],
          severity, description: desc,
          source: db.metadata.sources[0],
          fromDatabase: true, verified: true,
        });
      }
    }
  }
  return interactions;
}

// ── GET /api/medicine/common ─────────────────────────────────
router.get('/common', (req, res) => {
  res.json({
    medicines: db.medicines.map(m => ({
      id: m.id,
      generic_name: m.generic_name,
      brand_names: m.brand_names.slice(0, 3),
      category: m.category,
      otc: m.otc_available,
      schedule: m.schedule,
    })),
  });
});

// ── GET /api/medicine/list ────────────────────────────────────
router.get('/list', (req, res) => {
  res.json({
    total: db.medicines.length,
    sources: db.metadata.sources,
    medicines: db.medicines.map(m => m.generic_name + ' — ' + m.brand_names.slice(0,2).join(', ')),
  });
});

module.exports = router;
