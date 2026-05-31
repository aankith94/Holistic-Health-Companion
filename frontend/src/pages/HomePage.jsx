import React from 'react';
import { useNavigate } from 'react-router-dom';

const CARDS = [
  {
    tag: 'Symptom Diagnosis',
    title: 'AI Consultation',
    icon: '🩺',
    desc: 'Describe your symptoms and get structured health guidance, home remedies, medicine suggestions, and severity assessment — personalised to your health profile.',
    path: '/chat',
    color: 'var(--accent)',
  },
  {
    tag: 'Drug Safety',
    title: 'Medicine Checker',
    icon: '💊',
    desc: 'Look up any medicine — brand or generic — for dosage, side effects, and safety info. Check if two or more medicines are safe to take together.',
    path: '/medicine',
    color: '#7c3aed',
  },
  {
    tag: 'Document Analysis',
    title: 'Prescription Scanner',
    icon: '📄',
    desc: 'Photograph a prescription or lab report. AI reads doctor handwriting, explains each medicine, and summarises your test results in plain language.',
    path: '/ocr',
    color: '#0891b2',
  },
  {
    tag: 'Health Records',
    title: 'Patient Profile',
    icon: '👤',
    desc: 'Store allergies, chronic conditions, and current medications so every AI response is tailored specifically to your medical history.',
    path: '/patient',
    color: '#059669',
  },
  {
    tag: 'Insights',
    title: 'Health Analytics',
    icon: '📊',
    desc: 'View trends across your consultation history, symptom patterns, and document records over time.',
    path: '/dashboard',
    color: '#d97706',
  },
];

const STATS = [
  { n: '500M+', l: 'Rural Indians targeted' },
  { n: '70%',   l: 'Villages without doctors' },
  { n: '24/7',  l: 'Always available' },
  { n: '108',   l: 'Emergency helpline integrated' },
];

const FEATURES = [
  {
    icon: '🔍',
    title: 'Smart Symptom Assessment',
    desc: 'Reports symptoms with severity levels — MILD, MODERATE, HIGH, or EMERGENCY — and recommends specific home remedies and OTC medicines with exact dosages.',
  },
  {
    icon: '💊',
    title: 'Universal Medicine Lookup',
    desc: 'Search any Indian brand (Sumo, Dolo, Combiflam, Pan, Allegra) or generic name. Fuzzy search handles typos. AI fills in any medicine not in the local database.',
  },
  {
    icon: '📄',
    title: 'Prescription & Lab Interpreter',
    desc: 'Decodes doctor handwriting, explains each medicine prescribed, and translates lab report values into plain language any patient can understand.',
  },
  {
    icon: '🧠',
    title: 'Personalised Health Memory',
    desc: 'Remembers your allergies, chronic conditions, and current medications. Every AI response is cross-checked against your profile for safety.',
  },
  {
    icon: '🎙️',
    title: 'Voice Interface',
    desc: 'Speak your symptoms — no typing needed. AI replies are read aloud, making the tool accessible to patients with limited literacy.',
  },
  {
    icon: '🚨',
    title: 'Emergency SOS',
    desc: 'One-tap access to Ambulance 108, Poison Control, Child Helpline, Women Helpline, and other national emergency services.',
  },
];

const HOW = [
  { step: '1', title: 'Create Your Profile', desc: 'Add your name, age, allergies, and medical conditions once. The AI uses this every session.' },
  { step: '2', title: 'Describe Your Problem', desc: 'Type or speak your symptoms. Use quick-select buttons for common issues like fever, cold, or stomach pain.' },
  { step: '3', title: 'Get Structured Guidance', desc: 'Receive home remedies, OTC medicine names with exact doses, and clear advice on when to see a doctor.' },
  { step: '4', title: 'Save & Export', desc: 'Save the session to your patient record and export a report to share with a doctor or ASHA worker.' },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="page">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="home-hero">
        <p className="home-eyebrow">Major Project — AI Healthcare for Rural India</p>
        <h2 className="home-title">
          AI Holistic Companion Chatbot
        </h2>
        <p className="home-sub">
          Bridging the rural healthcare gap using Gemini AI — providing symptom diagnosis,
          medicine information, prescription interpretation, and health record management to
          communities where qualified doctors are scarce.
        </p>

        {/* Feature cards */}
        <div className="home-cards">
          {CARDS.map(c => (
            <div
              key={c.title}
              className="home-card"
              onClick={() => navigate(c.path)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(c.path)}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
              <span className="home-card-tag">{c.tag}</span>
              <div className="home-card-title">{c.title}</div>
              <div className="home-card-desc">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div className="stats-row">
        {STATS.map(s => (
          <div key={s.n} className="stat-cell">
            <span className="stat-n">{s.n}</span>
            <span className="stat-l">{s.l}</span>
          </div>
        ))}
      </div>

      {/* ── How it works ─────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <h3 className="section-heading">How It Works</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {HOW.map(h => (
            <div key={h.step} className="card" style={{ padding: '20px 18px', position: 'relative' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)',
                color: '#fff', fontWeight: 800, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
              }}>{h.step}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: 'var(--text-1)' }}>{h.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>{h.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Core capabilities ─────────────────────────────────── */}
      <section className="features-section">
        <h3 className="section-heading">Core Capabilities</h3>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="card feature-item">
              <div style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <h3 style={{ marginBottom: 4 }}>{f.title}</h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '10px 0 20px' }}>
        <button className="btn btn-primary" style={{ fontSize: 15, padding: '12px 32px' }}
          onClick={() => navigate('/chat')}>
          Start Consultation →
        </button>
      </section>

    </div>
  );
}
