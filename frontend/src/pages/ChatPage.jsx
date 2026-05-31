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
    if (trimmed.match(/^[\*\-]\s+/)) {
      elements.push(
        <div key={i} style={{ display:'flex', gap:8, margin:'3px 0', paddingLeft:4 }}>
          <span style={{ color:'var(--accent)', fontWeight:700, flexShrink:0, marginTop:1 }}>•</span>
          <span style={{ lineHeight:1.65 }}>{inlineFormat(trimmed.replace(/^[\*\-]\s+/, ''))}</span>
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
    const clean = text.replace(/[^\w\s.,?!;:'"()\-]/g, '');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'en-IN'; u.rate = 0.9; u.pitch = 1;
    u.onstart = () => setIsSpeaking(true);
    u.onend   = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  const stopSpeak = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); };

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

  const exportReport = useCallback(() => {
    if (!patient) return;
    const { profile, healthSummary, sessions=[] } = patient;
    const lines = [
      'HEALTH COMPANION — PATIENT REPORT',
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      '='.repeat(48), '',
      `Patient     : ${profile.name}`,
      `Age / Gender: ${profile.age||'—'} / ${profile.gender||'—'}`,
      `Blood Group : ${profile.bloodGroup||'—'}`,
      `Village     : ${profile.village||'—'}`,
      `Phone       : ${profile.phone||'—'}`, '',
      'Medical Information:',
      `  Allergies  : ${profile.allergies||'None'}`,
      `  Conditions : ${profile.chronicConditions||'None'}`,
      `  Medications: ${profile.currentMedications||'None'}`,
      `  Emergency  : ${profile.emergencyContact||'None'}`, '',
      'AI Health Summary:',
      healthSummary || 'No summary recorded.', '',
      `Consultation History (${sessions.length} sessions):`,
      ...sessions.map((s,i) => `\n${i+1}. ${s.title}\n   Date: ${new Date(s.date).toLocaleDateString('en-IN')}\n   ${s.summary||'—'}`),
      '', '-'.repeat(48),
      'Health Companion — AI Medical Assistant for Rural India',
    ];
    const blob = new Blob([lines.join('\n')], { type:'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${(profile.name||'patient').replace(/\s+/g,'_')}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [patient]);

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
        text:`An error occurred: ${err.message}\n\nPlease check that the backend is running on port 5000 and that a valid API key is configured.` }]);
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
            <button className="btn btn-secondary btn-sm" onClick={exportReport}>Export Report</button>
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
