import React, { useState } from 'react';
import { useApi } from '../context/ApiContext';

export default function SettingsPage() {
  const { setKey, validateKey } = useApi();
  const [input, setInput]     = useState(sessionStorage.getItem('hc_key') || '');
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const k = input.trim();
    if (!k) return setStatus('error:Please enter a key.');
    setLoading(true); setStatus('');
    try {
      setKey(k);
      const r = await validateKey(k);
      setStatus(r.valid ? 'success:Gemini API key saved and validated.' : 'error:Key invalid — check and retry.');
    } catch {
      setStatus('error:Connection failed. Is the backend running on port 5000?');
    } finally { setLoading(false); }
  };

  const [type, msg] = status.split(':');

  return (
    <div className="page" style={{ padding:32 }}>
      <h2 style={{ marginBottom:8 }}>Configuration</h2>
      <p style={{ color:'var(--text-3)', fontSize:13.5, marginBottom:24, lineHeight:1.7 }}>
        Internal settings page — not linked from the main navigation.
      </p>

      <div className="card" style={{ padding:24, maxWidth:480 }}>
        <div className="form-field" style={{ marginBottom:16 }}>
          <label>Google Gemini API Key</label>
          <input className="input" type="password" placeholder="AIzaSy…"
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()} />
        </div>
        <p style={{ fontSize:12, color:'var(--text-4)', marginBottom:16, lineHeight:1.6 }}>
          Get your free key from <strong>aistudio.google.com</strong> → Get API Key.
          No credit card required. Key starts with <strong>AIzaSy</strong>.
        </p>

        {status && (
          <div className={`alert alert-${type === 'success' ? 'success' : 'error'}`} style={{ marginBottom:16 }}>
            {msg}
          </div>
        )}

        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-primary" onClick={save} disabled={loading}>
            {loading ? <><span className="spin" />Validating…</> : 'Save Key'}
          </button>
          <button className="btn btn-secondary" onClick={() => { setKey(''); setInput(''); setStatus('success:Key cleared.'); }}>
            Clear
          </button>
        </div>
      </div>

      <div style={{ marginTop:24, padding:'14px 18px', background:'var(--primary-bg)', border:'1px solid var(--primary-bd)', borderRadius:'var(--radius)', maxWidth:480, fontSize:13, color:'var(--primary)', lineHeight:1.7 }}>
        <strong>Free tier limits:</strong> 15 requests per minute, 1500 requests per day.
        This is more than enough for demos and project use.
        The key can also be set in <code>backend/.env</code> as <code>GEMINI_API_KEY</code>.
      </div>
    </div>
  );
}
