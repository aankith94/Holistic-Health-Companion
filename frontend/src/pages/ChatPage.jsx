/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../context/ApiContext';

const fmt = d => d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

const SEV = {
  MILD:      { label:'Mild',      cls:'sev-MILD' },
  MODERATE:  { label:'Moderate',  cls:'sev-MODERATE' },
  HIGH:      { label:'High',      cls:'sev-HIGH' },
  EMERGENCY: { label:'Emergency', cls:'sev-EMERGENCY' },
};

// ── Markdown renderer (no external deps) ──────────────────────
function renderMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ## Heading 2
    if (trimmed.startsWith('## ')) {
      elements.push(
        <div key={i} style={{
          fontWeight: 700, fontSize: 13, color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: '.06em',
          margin: '16px 0 6px', paddingBottom: 5,
          borderBottom: '1.5px solid var(--primary-bd)',
        }}>
          {trimmed.replace(/^##\s+/, '')}
        </div>
      );
      i++; continue;
    }

    // ### Heading 3
    if (trimmed.startsWith('### ')) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 13.5, margin: '10px 0 4px', color: 'var(--text-1)' }}>
          {trimmed.replace(/^###\s+/, '')}
        </div>
      );
      i++; continue;
    }

    // ALL-CAPS line (AI fallback — treat as heading)
    if (
      trimmed.length > 4 &&
      trimmed.length < 60 &&
      trimmed === trimmed.toUpperCase() &&
      /[A-Z]/.test(trimmed) &&
      !trimmed.startsWith('SEVERITY:') &&
      !/^\d/.test(trimmed)
    ) {
      elements.push(
        <div key={i} style={{
          fontWeight: 700, fontSize: 13, color: 'var(--accent)',
          textTransform: 'uppercase', letterSpacing: '.06em',
          margin: '16px 0 6px', paddingBottom: 5,
          borderBottom: '1.5px solid var(--primary-bd)',
        }}>
          {trimmed}
        </div>
      );
      i++; continue;
    }

    // Bullet point
    if (trimmed.match(/^[*-]\s+/)) {
      elements.push(
        <div key={i} style={{ display:'flex', gap:8, margin:'3px 0', paddingLeft:4 }}>
          <span style={{ color:'var(--accent)', fontWeight:700, flexShrink:0, marginTop:1 }}>•</span>
          <span style={{ lineHeight:1.65 }}>{inlineFormat(trimmed.replace(/^[*-]\s+/, ''))}</span>
        </div>
      );
      i++; continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={i} style={{ display:'flex', gap:8, margin:'3px 0', paddingLeft:4 }}>
          <span style={{ color:'var(--accent)', fontWeight:700, flexShrink:0, minWidth:18 }}>{numMatch[1]}.</span>
          <span style={{ lineHeight:1.65 }}>{inlineFormat(numMatch[2])}</span>
        </div>
      );
      i++; continue;
    }

    // Empty line → small gap
    if (trimmed === '') {
      elements.push(<div key={i} style={{ height:6 }} />);
      i++; continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} style={{ margin:'4px 0', lineHeight:1.7 }}>
        {inlineFormat(trimmed)}
      </p>
    );
    i++;
  }

  return elements;
}

// Parse inline **bold** and *italic*
function inlineFormat(text) {
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function MessageBubble({ m, patientName }) {
  const isBot = m.role === 'bot';
  return (
    <div className={`msg-row ${m.role}`}>
      <div className={`msg-av ${m.role}`}>{isBot ? 'H' : (patientName?.[0] || 'U')}</div>
      <div className="msg-col">
        <span className="msg-sender">{isBot ? 'Health Companion' : (patientName || 'You')}</span>
        <div className={`bubble ${m.role}`} style={isBot ? { fontSize:13.5, lineHeight:1.7 } : {}}>
          {m.image && (
            <img src={m.image} alt="Uploaded symptom" style={{
              maxWidth:'100%', maxHeight:220, borderRadius:8, marginBottom:8, display:'block'
            }} />
          )}
          {isBot ? renderMarkdown(m.text) : m.text}
        </div>
        {isBot && m.severity && m.id !== 'w' && (
          <span className={`sev-badge ${SEV[m.severity]?.cls || 'sev-MILD'}`}>
            Severity: {SEV[m.severity]?.label || 'Mild'}
          </span>
        )}
        <span className="msg-time">{fmt(m.time)}</span>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="msg-row bot">
      <div className="msg-av bot">H</div>
      <div className="msg-col">
        <span className="msg-sender">Health Companion</span>
        <div className="typing"><div className="tdot"/><div className="tdot"/><div className="tdot"/></div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { chat, summarize, saveSession, getSymptoms, patient, apiKey } = useApi();
  const navigate = useNavigate();

  const [messages, setMessages] = useState(() => [{
    id:'w', role:'bot', time:new Date(), severity:null,
    text: patient
      ? `Hello ${patient.profile?.name}. I have loaded your health profile including any known allergies and conditions. Please describe your symptoms and I will do my best to assist you.\n\nIf this is an emergency, please call 108 immediately.`
      : `Hello. I am Health Companion, an AI medical assistant.\n\nPlease describe the health problem you or your family member is facing and I will guide you. Use the quick symptom buttons below or type directly.\n\nIf this is an emergency, call 108 immediately.`,
  }]);

  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [symptoms, setSymptoms]         = useState([]);
  const [isListening, setIsListening]   = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [saveLoading, setSaveLoading]   = useState(false);
  const [savedMsg, setSavedMsg]         = useState('');
  const [voiceOk] = useState('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const endRef    = useRef(null);
  const taRef     = useRef(null);
  const recognRef = useRef(null);

  useEffect(() => { getSymptoms().then(d => setSymptoms(d.symptoms||[])).catch(()=>{}); }, [getSymptoms]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, loading]);

  const resize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const startListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = 'en-IN'; r.continuous = false; r.interimResults = false;
    r.onstart  = () => setIsListening(true);
    r.onresult = e => { setInput(e.results[0][0].transcript); setIsListening(false); };
    r.onerror  = () => setIsListening(false);
    r.onend    = () => setIsListening(false);
    recognRef.current = r;
    r.start();
  };

  const stopListen  = () => { recognRef.current?.stop(); setIsListening(false); };

  const speak = useCallback(text => {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[^\w\s.,?!;:'"()-]/g, '');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'en-IN'; u.rate = 0.9; u.pitch = 1;
    u.onstart = () => setIsSpeaking(true);
    u.onend   = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  const stopSpeak = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };

  const [photoLoading, setPhotoLoading] = useState(false);
  const photoRef = useRef(null);

  const handleSave = useCallback(async () => {
    if (!patient?.patientId) return navigate('/patient');
    const hist = messages.filter(m=>m.id!=='w').map(m=>({ role:m.role==='bot'?'assistant':'user', content:m.text }));
    if (!hist.length) return;
    setSaveLoading(true);
    try {
      const summary = await summarize(hist, patient.healthSummary);
      await saveSession(patient.patientId, hist, summary,
        `Session — ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`);
      setSavedMsg('Session saved to patient records.');
      setTimeout(() => setSavedMsg(''), 3000);
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaveLoading(false); }
  }, [messages, patient, summarize, saveSession, navigate]);

  // ── Prescription PDF Generator ────────────────────────────
  const generatePrescription = useCallback(() => {
    const now  = new Date();
    const date = now.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
    const time = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

    // Extract bot messages for prescription content
    const botMsgs = messages.filter(m => m.role === 'bot' && m.id !== 'w');
    const userMsgs = messages.filter(m => m.role === 'user');

    if (!botMsgs.length) return alert('No consultation to generate prescription for. Please have a consultation first.');

    const profile = patient?.profile || {};
    const lastBotMsg = botMsgs[botMsgs.length - 1];
    const lastUserMsg = userMsgs[userMsgs.length - 1];

    // Parse sections from last AI response
    const text = lastBotMsg.text;
    const sections = {};
    const sectionRegex = /##\s*([^\n]+)\n([\s\S]*?)(?=##|$)/g;
    let match;
    while ((match = sectionRegex.exec(text)) !== null) {
      sections[match[1].trim()] = match[2].trim();
    }
    // fallback — if AI used ALL CAPS headings
    if (!Object.keys(sections).length) {
      const lines = text.split('\n');
      let current = '';
      for (const line of lines) {
        const t = line.trim();
        if (t.length > 4 && t === t.toUpperCase() && /[A-Z]/.test(t) && !t.startsWith('SEVERITY')) {
          current = t; sections[current] = '';
        } else if (current) {
          sections[current] += line + '\n';
        }
      }
    }

    const severity = lastBotMsg.severity || 'MILD';
    const symptoms = lastUserMsg?.text || 'Not specified';

    // Build HTML prescription
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Prescription — ${profile.name || 'Patient'}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 30px; max-width: 750px; margin: auto; }
  .header { text-align: center; border-bottom: 3px solid #16a34a; padding-bottom: 16px; margin-bottom: 20px; }
  .header h1 { font-size: 22px; color: #16a34a; font-weight: 800; letter-spacing: 0.5px; }
  .header p { font-size: 12px; color: #555; margin-top: 4px; }
  .rx-symbol { font-size: 36px; color: #16a34a; font-weight: 900; float: left; margin-right: 12px; line-height: 1; }
  .patient-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; }
  .patient-box .row { font-size: 13px; }
  .patient-box .row span { font-weight: 700; color: #16a34a; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #16a34a; border-bottom: 1.5px solid #bbf7d0; padding-bottom: 5px; margin-bottom: 8px; }
  .section-body { font-size: 13px; line-height: 1.8; color: #333; white-space: pre-wrap; }
  .severity-badge { display: inline-block; padding: 3px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
    background: ${ severity==='EMERGENCY'?'#fef2f2': severity==='HIGH'?'#fff7ed': severity==='MODERATE'?'#fefce8':'#f0fdf4'};
    color: ${ severity==='EMERGENCY'?'#b91c1c': severity==='HIGH'?'#c2410c': severity==='MODERATE'?'#a16207':'#15803d'};
    border: 1px solid ${ severity==='EMERGENCY'?'#fecaca': severity==='HIGH'?'#fed7aa': severity==='MODERATE'?'#fde68a':'#bbf7d0'};
  }
  .footer { margin-top: 30px; border-top: 1.5px solid #e5e7eb; padding-top: 14px; font-size: 11px; color: #888; text-align: center; line-height: 1.7; }
  .sign-box { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sign-line { border-top: 1px solid #333; width: 180px; text-align: center; padding-top: 4px; font-size: 11px; color: #555; }
  @media print { body { padding: 15px; } }
</style>
</head>
<body>
  <div class="header">
    <h1>🏥 AI Holistic Companion Chatbot</h1>
    <p>Rural AI Healthcare Assistant &nbsp;|&nbsp; AI-Generated Consultation Report</p>
    <p style="margin-top:6px; font-size:11px; color:#888;">Date: ${date} &nbsp;|&nbsp; Time: ${time}</p>
  </div>

  <div style="margin-bottom:14px">
    <span class="rx-symbol">℞</span>
    <div style="overflow:hidden">
      <div style="font-weight:700; font-size:15px; margin-bottom:4px">Consultation Prescription</div>
      <span class="severity-badge">Severity: ${severity.charAt(0)+severity.slice(1).toLowerCase()}</span>
    </div>
  </div>

  <div class="patient-box">
    <div class="row"><span>Patient:</span> ${profile.name || '—'}</div>
    <div class="row"><span>Age / Gender:</span> ${profile.age || '—'} / ${profile.gender || '—'}</div>
    <div class="row"><span>Blood Group:</span> ${profile.bloodGroup || '—'}</div>
    <div class="row"><span>Village:</span> ${profile.village || '—'}</div>
    <div class="row"><span>Allergies:</span> ${profile.allergies || 'None'}</div>
    <div class="row"><span>Conditions:</span> ${profile.chronicConditions || 'None'}</div>
  </div>

  <div class="section">
    <div class="section-title">Presenting Symptoms</div>
    <div class="section-body">${symptoms}</div>
  </div>

  ${Object.entries(sections).map(([title, body]) => `
  <div class="section">
    <div class="section-title">${title}</div>
    <div class="section-body">${body.replace(/\*\*/g,'').replace(/^[\-\*]\s/gm,'• ')}</div>
  </div>`).join('')}

  <div class="sign-box">
    <div class="sign-line">Patient Signature</div>
    <div style="text-align:right">
      <div style="font-size:12px; color:#555; margin-bottom:4px">Generated by</div>
      <div style="font-weight:700; color:#16a34a; font-size:14px">AI Holistic Companion</div>
      <div style="font-size:11px; color:#888">${date}</div>
    </div>
  </div>

  <div class="footer">
    ⚠️ This is an AI-generated consultation report and is NOT a substitute for professional medical advice.<br>
    Always consult a licensed doctor before taking any medicine. For emergencies call <strong>108</strong>.<br>
    AI Holistic Companion Chatbot — Rural Healthcare AI Assistant
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    // Auto-trigger print dialog so user can save as PDF
    if (win) {
      win.onload = () => {
        win.focus();
        win.print();
      };
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [messages, patient, apiKey]);

  // ── Photo Symptom Analysis ────────────────────────────────
  const handlePhotoUpload = useCallback(async (file) => {
    if (!file) return;
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (!allowed.includes(file.type)) return alert('Please upload a JPG, PNG or WEBP image.');
    if (file.size > 5 * 1024 * 1024) return alert('Image too large. Please use an image under 5 MB.');

    const key = apiKey || sessionStorage.getItem('hc_key');
    if (!key) {
      setMessages(p => [...p, { id:Date.now()+'e', role:'bot', time:new Date(), severity:null,
        text:'API key not configured. Please visit /settings.' }]);
      return;
    }

    // Show image preview in chat as user message
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      const mimeType = file.type;
      const previewUrl = e.target.result;

      const userMsg = {
        id: Date.now()+'u',
        role: 'user',
        text: '📷 Photo shared for symptom analysis',
        image: previewUrl,
        time: new Date(),
        severity: null,
      };
      setMessages(p => [...p, userMsg]);
      setLoading(true);

      try {
        const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${API}/chat/analyze-photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            mimeType,
            apiKey: key,
            patientProfile: patient?.profile || null,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Photo analysis failed.');
        const bot = { id:Date.now()+'b', role:'bot', text:data.message, time:new Date(), severity:data.severity||'MILD' };
        setMessages(p => [...p, bot]);
        speak(data.message);
      } catch (err) {
        setMessages(p => [...p, { id:Date.now()+'err', role:'bot', time:new Date(), severity:null,
          text:`Photo analysis failed: ${err.message}` }]);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, [apiKey, patient, speak]);



  const send = useCallback(async text => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const key = apiKey || sessionStorage.getItem('hc_key');
    if (!key) {
      setMessages(p => [...p, { id:Date.now()+'e', role:'bot', time:new Date(), severity:null,
        text:'The API key has not been configured. Please visit /settings to enter your Gemini API key.' }]);
      return;
    }

    const userMsg = { id:Date.now()+'u', role:'user', text:msg, time:new Date(), severity:null };
    setMessages(p => [...p, userMsg]);
    setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
    setLoading(true);

    const history = messages
      .filter(m => m.id !== 'w')
      .map(m => ({ role:m.role==='bot'?'assistant':'user', content:m.text }));
    history.push({ role:'user', content:msg });

    try {
      const data = await chat(history);
      const bot  = { id:Date.now()+'b', role:'bot', text:data.message, time:new Date(), severity:data.severity||'MILD' };
      setMessages(p => [...p, bot]);
      speak(data.message);
    } catch (err) {
      setMessages(p => [...p, { id:Date.now()+'err', role:'bot', time:new Date(), severity:null,
        text:`An error occurred: ${err.message}\n\nPlease check that a valid API key is configured in /settings.` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, chat, speak]);

  const onKey = e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="chat-wrap">
      {patient && (
        <div className="chat-patient-bar">
          <span>
            Profile active: <strong>{patient.profile?.name}</strong>
            {patient.profile?.allergies ? ` — Allergies: ${patient.profile.allergies}` : ''}
            {patient.profile?.chronicConditions ? ` — Conditions: ${patient.profile.chronicConditions}` : ''}
          </span>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            {savedMsg && <span style={{ fontSize:12, color:'#14532d' }}>{savedMsg}</span>}
            <button className="btn btn-secondary btn-sm" onClick={generatePrescription}>📄 Prescription</button>
            <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={saveLoading}>
              {saveLoading ? <><span className="spin dark"/>Saving…</> : 'Save Session'}
            </button>
          </div>
        </div>
      )}

      <div className="chat-body">
        {messages.map(m => (
          <MessageBubble key={m.id} m={m} patientName={patient?.profile?.name} />
        ))}
        {loading && <Typing />}
        <div ref={endRef} />
      </div>

      <div className="disclaimer">
        This AI provides general health information only and is not a substitute for professional medical advice. For emergencies, call 108.
      </div>

      {!patient && (
        <div className="no-patient-bar">
          <span>Create a patient profile for personalised advice based on your medical history.</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/patient')}>Create Profile</button>
        </div>
      )}

      <div className="chat-input-area">
        {symptoms.length > 0 && (
          <div className="chip-row">
            {symptoms.map(s => (
              <button key={s.id} className="chip" onClick={() => send(s.text)} disabled={loading}>
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="input-row">
          <textarea
            ref={taRef}
            className="chat-input"
            value={input}
            onChange={e => { setInput(e.target.value); resize(); }}
            onKeyDown={onKey}
            placeholder="Describe your symptoms here…"
            disabled={loading}
            rows={1}
          />
          {/* Hidden photo input */}
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            style={{ display:'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) handlePhotoUpload(f); e.target.value=''; }}
          />
          {/* Photo upload button */}
          <button
            className="mic-btn"
            onClick={() => photoRef.current?.click()}
            disabled={loading || photoLoading}
            title="Upload photo of symptom (skin rash, wound, eye etc.)"
            style={{ fontSize:16 }}
          >
            📷
          </button>
          {voiceOk && (
            <button className={`mic-btn ${isListening?'on':isSpeaking?'speaking':''}`}
              onClick={isListening ? stopListen : isSpeaking ? stopSpeak : startListen}
              disabled={loading}
              title={isListening?'Stop recording':isSpeaking?'Stop speaking':'Record voice'}>
              {isListening ? '■' : isSpeaking ? '◀◀' : '🎤'}
            </button>
          )}
          <button className="send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
            {loading
              ? <span className="spin" style={{ width:14, height:14 }}/>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            }
          </button>
        </div>
      </div>
    </div>
  );
}