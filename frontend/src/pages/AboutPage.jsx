import React from 'react';

const TECH = ['React 18','React Router 6','Node.js','Express.js','OpenAI GPT-4o','OpenAI Vision API','Multer','UUID','Web Speech API','Rate Limiting'];

const CARDS = [
  { label:'Problem Statement', title:'The Rural Healthcare Gap',
    body:'Over 500 million rural Indians lack easy access to qualified doctors. Villagers routinely self-medicate from local pharmacies without prescriptions, leading to antibiotic resistance, incorrect dosages, and preventable fatalities. Health Companion addresses this directly.' },
  { label:'Solution', title:'AI-Guided Health Support',
    body:'A full-stack platform that assesses symptoms with severity classification, recommends safe over-the-counter medicines, scans and interprets medical documents in 8 Indian languages, checks drug interactions, and maintains patient health history for personalised advice.' },
  { label:'Patient Memory', title:'Personalised Healthcare',
    body:'Patients create a profile storing allergies, chronic conditions, and current medications. Every consultation is AI-summarised and stored. The system uses this history to provide safer, more accurate guidance in subsequent sessions.' },
  { label:'Architecture', title:'Secure Full-Stack Design',
    body:'React frontend communicates with an Express.js REST API. All OpenAI API calls are handled server-side — the API key is never exposed in frontend code. Rate limiting prevents abuse. Every data mutation returns the full updated patient object for immediate UI sync.' },
  { label:'Impact', title:'Social Relevance',
    body:"This project targets one of India's most persistent public health problems. By providing 24/7 AI medical guidance in local languages with voice support for users with limited literacy, it can meaningfully reduce preventable harm from self-medication in underserved communities." },
  { label:'Future Scope', title:'Planned Extensions',
    body:'MongoDB for persistent storage · Offline PWA mode for low-connectivity villages · WhatsApp and SMS integration · Doctor referral with geolocation · Multi-language voice input and output · Integration with ASHA healthcare workers · Telemedicine booking' },
];

const ENDPOINTS = [
  {m:'GET',    p:'/api/health/status',              d:'Server health check'},
  {m:'POST',   p:'/api/health/validate-key',        d:'Validate OpenAI API key'},
  {m:'GET',    p:'/api/chat/symptoms',              d:'Quick symptom suggestions'},
  {m:'POST',   p:'/api/chat/message',               d:'AI chat with patient context and severity'},
  {m:'POST',   p:'/api/chat/summarize-session',     d:'Summarise session for patient memory'},
  {m:'POST',   p:'/api/ocr/analyze',                d:'OCR and multilingual document analysis'},
  {m:'POST',   p:'/api/medicine/check-interaction', d:'Drug interaction check'},
  {m:'GET',    p:'/api/medicine/common',            d:'Common medicine list'},
  {m:'POST',   p:'/api/patient/create',             d:'Create patient profile'},
  {m:'GET',    p:'/api/patient/:id',                d:'Retrieve patient with all data'},
  {m:'PUT',    p:'/api/patient/:id/profile',        d:'Update patient profile'},
  {m:'POST',   p:'/api/patient/:id/session',        d:'Save session — returns updated patient'},
  {m:'DELETE', p:'/api/patient/:id/session/:sid',   d:'Delete session — returns updated patient'},
  {m:'POST',   p:'/api/patient/:id/ocr-document',   d:'Save OCR document — returns updated patient'},
];

const MC = { GET:{bg:'#dbeafe',c:'#1d4ed8'}, POST:{bg:'#dcfce7',c:'#15803d'}, PUT:{bg:'#fef3c7',c:'#b45309'}, DELETE:{bg:'#fee2e2',c:'#b91c1c'} };

export default function AboutPage() {
  return (
    <div className="about-page page">
      <div className="about-hero">
        <h2>Health Companion — Major Project</h2>
        <p>
          A full-stack AI-powered medical assistant built for rural India, where 70% of villages lack access to qualified doctors.
          The system provides intelligent symptom assessment, safe medication guidance, multilingual OCR document analysis, drug interaction checking,
          patient memory, voice input and output, health dashboard analytics, and emergency SOS — all secured through a Node.js backend with the OpenAI GPT-4o API.
        </p>
        <div className="tech-tags" style={{ marginTop:20 }}>
          {TECH.map(t => <span key={t} className="tech-tag">{t}</span>)}
        </div>
      </div>

      <div className="about-grid">
        {CARDS.map(c => (
          <div key={c.label} className="card about-card">
            <div className="about-card-label">{c.label}</div>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:24, maxWidth:760, marginBottom:20 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:16 }}>REST API Reference</p>
        <div className="endpoint-list">
          {ENDPOINTS.map(ep => (
            <div key={ep.p} className="endpoint">
              <span className="method" style={{ background:MC[ep.m]?.bg, color:MC[ep.m]?.c }}>{ep.m}</span>
              <code style={{ fontSize:12, color:'var(--text)', flex:1 }}>{ep.p}</code>
              <span style={{ fontSize:12, color:'var(--text-3)' }}>{ep.d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
