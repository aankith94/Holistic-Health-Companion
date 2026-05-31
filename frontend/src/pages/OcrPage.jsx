import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../context/ApiContext';

const LANGS = [
  { code:'english',  label:'English' },
  { code:'hindi',    label:'Hindi — हिंदी' },
  { code:'bengali',  label:'Bengali — বাংলা' },
  { code:'tamil',    label:'Tamil — தமிழ்' },
  { code:'telugu',   label:'Telugu — తెలుగు' },
  { code:'marathi',  label:'Marathi — मराठी' },
  { code:'gujarati', label:'Gujarati — ગુજરાતી' },
  { code:'punjabi',  label:'Punjabi — ਪੰਜਾਬੀ' },
];

const STATUS_STYLE = {
  NORMAL:     { bg:'#f0fdf4', color:'#15803d', border:'#bbf7d0', label:'Normal' },
  LOW:        { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca', label:'Low' },
  HIGH:       { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca', label:'High' },
  BORDERLINE: { bg:'#fffbeb', color:'#b45309', border:'#fde68a', label:'Borderline' },
  CRITICAL:   { bg:'#fef2f2', color:'#7f1d1d', border:'#fecaca', label:'Critical' },
};

const URGENCY_STYLE = {
  ROUTINE:   { bg:'#f0fdf4', color:'#15803d', border:'#bbf7d0' },
  SOON:      { bg:'#fffbeb', color:'#b45309', border:'#fde68a' },
  URGENT:    { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa' },
  EMERGENCY: { bg:'#fef2f2', color:'#b91c1c', border:'#fecaca' },
};

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, children, style }) {
  return (
    <div style={{ marginBottom:20, ...style }}>
      <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12, fontFamily:"'Inter',sans-serif" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Download helpers ──────────────────────────────────────────
function buildTextReport(result, fileName, language) {
  const langLabel = LANGS.find(l => l.code === language)?.label || language;
  const lines = [
    'HEALTH COMPANION — DOCUMENT ANALYSIS REPORT',
    '='.repeat(50),
    `File         : ${fileName}`,
    `Document Type: ${result.documentType || '—'}`,
    `Language     : ${langLabel}`,
    `Analysed on  : ${new Date().toLocaleString('en-IN')}`,
    '',
  ];

  if (result.patientName) lines.push(`Patient : ${result.patientName}`);
  if (result.patientAge)  lines.push(`Age     : ${result.patientAge}`);
  if (result.doctorName)  lines.push(`Doctor  : ${result.doctorName}`);
  if (result.hospitalName)lines.push(`Hospital: ${result.hospitalName}`);
  if (result.documentDate)lines.push(`Date    : ${result.documentDate}`);
  lines.push('');

  if (result.testResults?.length) {
    lines.push('TEST RESULTS', '-'.repeat(40));
    result.testResults.forEach(t => {
      lines.push(`${t.testName}: ${t.value} [${t.status}]`);
      if (t.normalRange) lines.push(`  Normal range : ${t.normalRange}`);
      if (t.simpleMeaning) lines.push(`  What it means: ${t.simpleMeaning}`);
      lines.push('');
    });
  }

  if (result.medications?.length) {
    lines.push('MEDICINES PRESCRIBED', '-'.repeat(40));
    result.medications.forEach(m => {
      lines.push(`${m.name} ${m.dose || ''}`);
      if (m.frequency) lines.push(`  How often : ${m.frequency}`);
      if (m.duration)  lines.push(`  For how long: ${m.duration}`);
      if (m.instructions) lines.push(`  Instructions: ${m.instructions}`);
      lines.push('');
    });
  }

  if (result.keyFindings) {
    lines.push('KEY FINDINGS', '-'.repeat(40));
    lines.push(result.keyFindings, '');
  }

  if (result.whatToDo?.length) {
    lines.push('WHAT YOU SHOULD DO', '-'.repeat(40));
    result.whatToDo.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
  }

  if (result.doctorAdvice) {
    lines.push('DOCTOR\'S ADVICE', '-'.repeat(40));
    lines.push(result.doctorAdvice, '');
  }

  if (result.warningSigns?.length) {
    lines.push('GO TO HOSPITAL IMMEDIATELY IF YOU HAVE', '-'.repeat(40));
    result.warningSigns.forEach(w => lines.push(`• ${w}`));
    lines.push('');
  }

  if (result.simpleSummary) {
    lines.push('SIMPLE SUMMARY', '-'.repeat(40));
    lines.push(result.simpleSummary, '');
  }

  lines.push('='.repeat(50));
  lines.push('DISCLAIMER: This analysis is for general information only.');
  lines.push('Always consult a qualified doctor for medical decisions.');
  lines.push('Health Companion — AI Medical Assistant for Rural India');

  return lines.join('\n');
}

function downloadTxt(result, fileName, language) {
  const text = buildTextReport(result, fileName, language);
  const blob  = new Blob([text], { type:'text/plain;charset=utf-8' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `${fileName.replace(/\.[^.]+$/, '')}_analysis.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function printReport(result, fileName, language) {
  const langLabel = LANGS.find(l => l.code === language)?.label || language;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<title>Document Analysis — ${result.patientName || fileName}</title>
<style>
  body { font-family: Arial, sans-serif; padding: 32px; color: #111; max-width: 700px; margin: 0 auto; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .sub { font-size: 13px; color: #666; margin-bottom: 24px; }
  h2 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 24px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f5f5f5; text-align: left; padding: 8px 10px; font-weight: 700; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
  .NORMAL { background:#dcfce7; color:#15803d; }
  .LOW, .HIGH, .CRITICAL { background:#fee2e2; color:#b91c1c; }
  .BORDERLINE { background:#fef3c7; color:#b45309; }
  .med-item { margin-bottom: 10px; padding: 10px; background: #f9fafb; border-radius: 6px; font-size: 13px; }
  .step { padding: 5px 0; font-size: 13px; }
  .warn { color: #b91c1c; font-size: 13px; padding: 4px 0; }
  .summary { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px; border-radius: 8px; font-size: 14px; line-height: 1.7; }
  .footer { margin-top: 32px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<h1>Document Analysis Report</h1>
<div class="sub">
  ${result.documentType || 'Medical Document'} &nbsp;|&nbsp;
  ${langLabel} &nbsp;|&nbsp;
  Analysed: ${new Date().toLocaleDateString('en-IN')}
  ${result.patientName ? ' &nbsp;|&nbsp; Patient: ' + result.patientName : ''}
  ${result.doctorName  ? ' &nbsp;|&nbsp; Doctor: '  + result.doctorName  : ''}
</div>`);

  if (result.testResults?.length) {
    win.document.write(`<h2>Test Results</h2>
<table>
<tr><th>Test</th><th>Result</th><th>Normal Range</th><th>Status</th><th>What it means</th></tr>
${result.testResults.map(t => `<tr>
  <td>${t.testName}</td>
  <td><strong>${t.value}</strong></td>
  <td>${t.normalRange || '—'}</td>
  <td><span class="badge ${t.status}">${t.status}</span></td>
  <td>${t.simpleMeaning || '—'}</td>
</tr>`).join('')}
</table>`);
  }

  if (result.medications?.length) {
    win.document.write(`<h2>Medicines Prescribed</h2>
${result.medications.map(m => `<div class="med-item">
  <strong>${m.name} ${m.dose || ''}</strong><br/>
  ${m.frequency ? 'How often: ' + m.frequency + '<br/>' : ''}
  ${m.duration  ? 'Duration: '  + m.duration  + '<br/>' : ''}
  ${m.instructions ? 'Instructions: ' + m.instructions : ''}
</div>`).join('')}`);
  }

  if (result.keyFindings) {
    win.document.write(`<h2>Key Findings</h2><p style="font-size:13px;line-height:1.7">${result.keyFindings}</p>`);
  }

  if (result.whatToDo?.length) {
    win.document.write(`<h2>What You Should Do</h2>
${result.whatToDo.map((s, i) => `<div class="step">${i + 1}. ${s}</div>`).join('')}`);
  }

  if (result.doctorAdvice) {
    win.document.write(`<h2>Doctor's Advice</h2>
<p style="font-size:13px;line-height:1.7;font-style:italic">"${result.doctorAdvice}"
${result.doctorName ? '<br/>— ' + result.doctorName : ''}</p>`);
  }

  if (result.warningSigns?.length) {
    win.document.write(`<h2>Go to Hospital Immediately If</h2>
${result.warningSigns.map(w => `<div class="warn">• ${w}</div>`).join('')}`);
  }

  if (result.simpleSummary) {
    win.document.write(`<h2>Simple Summary</h2>
<div class="summary">${result.simpleSummary}</div>`);
  }

  win.document.write(`
<div class="footer">
  This report is for general information only and does not replace professional medical advice.<br/>
  Generated by Health Companion — AI Medical Assistant for Rural India
</div>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ── Main Component ────────────────────────────────────────────
export default function OcrPage() {
  const { ocr, saveOcrDoc, patient, apiKey } = useApi();
  const navigate = useNavigate();

  const [drag, setDrag]         = useState(false);
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [lang, setLang]         = useState('english');
  const [saved, setSaved]       = useState(false);
  const fileRef = useRef(null);

  const MAX_MB   = 8;
  const MAX_SIZE = MAX_MB * 1024 * 1024;

  const process = useCallback(async f => {
    if (!f) return;

    const isPdf = f.type === 'application/pdf';

    // Client-side size check — gives instant feedback before upload
    if (f.size > MAX_SIZE) {
      setError(`File is too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is ${MAX_MB} MB. Please compress or split the PDF and try again.`);
      return;
    }

    setFile(f); setResult(null); setError(''); setSaved(false);

    if (!isPdf) {
      const r = new FileReader();
      r.onload = e => setPreview(e.target.result);
      r.readAsDataURL(f);
    } else {
      setPreview(null); // no preview for PDF
    }

    const key = apiKey || sessionStorage.getItem('hc_key');
    if (!key) { setError('API key not configured. Visit /settings to enter your Gemini API key.'); return; }

    setAnalyzing(true); setProgress(10);
    const timer = setInterval(() => {
      setProgress(p => { if (p >= 85) { clearInterval(timer); return p; } return p + Math.random() * 10; });
    }, 300);

    try {
      const fd = new FormData();
      fd.append('document', f);
      fd.append('language', lang);
      const data = await ocr(fd);
      clearInterval(timer); setProgress(100);
      setResult(data.result);
      if (patient?.patientId && data.result) {
        try { await saveOcrDoc(patient.patientId, f.name, lang, data.result); setSaved(true); }
        catch {}
      }
    } catch (err) {
      clearInterval(timer); setProgress(0);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
      setTimeout(() => setProgress(0), 800);
    }
  }, [lang, ocr, patient, saveOcrDoc]);

  const onDrop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) process(f); };
  const reset  = () => { setResult(null); setFile(null); setPreview(null); setError(''); setProgress(0); setSaved(false); };
  const langLabel = LANGS.find(l => l.code === lang)?.label || lang;

  return (
    <div className="ocr-page page">
      <h2 className="page-title">Document Scanner</h2>
      <p className="page-desc">
        Upload a photograph of a prescription, blood report, lab report, or medical certificate.
        The AI extracts all information and explains it in simple language with download options.
        {patient && <span style={{ color:'var(--primary)', fontWeight:500 }}> Reports are automatically saved to {patient.profile?.name}'s records.</span>}
      </p>

      {/* Controls */}
      <div style={{ display:'flex', gap:16, alignItems:'flex-end', marginBottom:20, flexWrap:'wrap' }}>
        <div className="form-field" style={{ minWidth:220 }}>
          <label>Report Language</label>
          <select className="input" value={lang} onChange={e => setLang(e.target.value)}>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        {!patient && (
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/patient')}>
            Create Patient Profile
          </button>
        )}
      </div>

      {/* Upload zone */}
      {!result && (
        <div
          className={`drop-zone ${drag ? 'drag' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color:'var(--text-4)', marginBottom:14 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <h3>{analyzing ? 'Analysing document…' : file ? file.name : 'Click to upload or drag and drop'}</h3>
          <p>{analyzing ? `Reading in ${langLabel}…` : file
            ? `${file.type === 'application/pdf' ? '📄 PDF' : '🖼️ Image'} · ${(file.size / 1024).toFixed(1)} KB — click to change`
            : 'Images or PDF · max 8 MB · prescription, lab report, discharge summary'}</p>
          <div className="file-types">
            {['JPG','PNG','WEBP','PDF'].map(t => <span key={t} className="ft-badge">{t}</span>)}
          </div>
          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display:'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) process(f); }} />
        </div>
      )}

      {/* Progress bar */}
      {(analyzing || (progress > 0 && progress < 100)) && (
        <div style={{ marginBottom:16 }}>
          <div className="prog-bar"><div className="prog-fill" style={{ width:`${Math.min(progress,100)}%` }}/></div>
          <p style={{ fontSize:12, color:'var(--text-3)', marginTop:5 }}>Extracting and analysing in {langLabel}…</p>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={reset} style={{ marginLeft:10, fontWeight:600, color:'var(--primary)', background:'none', border:'none', cursor:'pointer', fontSize:12 }}>
            Try again
          </button>
        </div>
      )}

      {preview && !result && <img src={preview} alt="Preview" className="doc-preview" />}

      {/* ── Result ── */}
      {result && (
        <div>

          {/* Report header card */}
          <div className="card" style={{ padding:'20px 24px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:4, fontFamily:"'Inter',sans-serif" }}>
                  {result.documentType || 'Medical Document'}
                </div>
                <div style={{ fontSize:13, color:'var(--text-3)', display:'flex', gap:16, flexWrap:'wrap' }}>
                  {result.patientName  && <span>Patient: <strong style={{ color:'var(--text-2)' }}>{result.patientName}</strong></span>}
                  {result.patientAge   && <span>Age: <strong style={{ color:'var(--text-2)' }}>{result.patientAge}</strong></span>}
                  {result.doctorName   && <span>Doctor: <strong style={{ color:'var(--text-2)' }}>{result.doctorName}</strong></span>}
                  {result.hospitalName && <span>{result.hospitalName}</span>}
                  {result.documentDate && <span>Date: {result.documentDate}</span>}
                </div>
                <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                  <span className="badge badge-blue">{langLabel}</span>
                  {saved && <span className="badge" style={{ background:'#dcfce7', color:'#15803d' }}>Saved to profile</span>}
                  {result.urgencyLevel && (() => {
                    const us = URGENCY_STYLE[result.urgencyLevel] || URGENCY_STYLE.ROUTINE;
                    return (
                      <span className="badge" style={{ background:us.bg, color:us.color, border:`1px solid ${us.border}` }}>
                        {result.urgencyLevel}
                        {result.urgencyReason ? ` — ${result.urgencyReason}` : ''}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Download buttons */}
              <div style={{ display:'flex', gap:8, flexShrink:0, flexWrap:'wrap' }}>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => downloadTxt(result, file?.name || 'report', lang)}
                  title="Download as text file">
                  Download TXT
                </button>
                <button className="btn btn-primary btn-sm"
                  onClick={() => printReport(result, file?.name || 'report', lang)}
                  title="Print or save as PDF">
                  Print / PDF
                </button>
                <button className="btn btn-secondary btn-sm" onClick={reset}>
                  Scan another
                </button>
              </div>
            </div>
          </div>

          {/* Preview thumbnail */}
          {preview && (
            <img src={preview} alt="Document" style={{ maxWidth:180, borderRadius:'var(--radius)', border:'1px solid var(--border)', marginBottom:16, display:'block' }} />
          )}

          {/* Simple summary box */}
          {result.simpleSummary && (
            <div style={{ padding:'16px 20px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'var(--radius-lg)', marginBottom:20, fontSize:14, lineHeight:1.8, color:'var(--text-2)' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Simple Summary</p>
              {result.simpleSummary}
            </div>
          )}

          {/* Test results table */}
          {result.testResults?.length > 0 && (
            <Section title="Your Test Results">
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {result.testResults.map((t, i) => {
                  const st = STATUS_STYLE[t.status] || STATUS_STYLE.NORMAL;
                  return (
                    <div key={i} style={{ padding:'14px 18px', background:st.bg, border:`1px solid ${st.border}`, borderRadius:'var(--radius-lg)' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'var(--text)', fontFamily:"'Inter',sans-serif" }}>{t.testName}</span>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:15, fontWeight:700, color:st.color }}>{t.value}</span>
                          <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:st.border, color:st.color }}>
                            {st.label}
                          </span>
                        </div>
                      </div>
                      {t.normalRange && (
                        <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:5 }}>
                          Normal range: {t.normalRange}
                        </div>
                      )}
                      {t.simpleMeaning && (
                        <div style={{ fontSize:13.5, color:'var(--text-2)', lineHeight:1.65 }}>
                          {t.simpleMeaning}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Medicines */}
          {result.medications?.length > 0 && (
            <Section title="Medicines Prescribed">
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {result.medications.map((m, i) => (
                  <div key={i} style={{ padding:'12px 16px', background:'var(--primary-bg)', border:'1px solid var(--primary-bd)', borderRadius:'var(--radius)' }}>
                    <div style={{ fontWeight:700, fontSize:14, color:'var(--accent)', marginBottom:4 }}>
                      {m.name} {m.dose && <span style={{ fontWeight:400, color:'var(--text-2)' }}>— {m.dose}</span>}
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-2)', display:'flex', gap:16, flexWrap:'wrap' }}>
                      {m.frequency    && <span>How often: <strong>{m.frequency}</strong></span>}
                      {m.duration     && <span>For: <strong>{m.duration}</strong></span>}
                      {m.instructions && <span style={{ color:'var(--text-3)' }}>{m.instructions}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Key findings */}
          {result.keyFindings && (
            <Section title="Key Findings">
              <p style={{ fontSize:13.5, color:'var(--text-2)', lineHeight:1.8 }}>{result.keyFindings}</p>
            </Section>
          )}

          {/* What to do */}
          {result.whatToDo?.length > 0 && (
            <Section title="What You Should Do">
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {result.whatToDo.map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)' }}>
                    <span style={{ width:24, height:24, borderRadius:'50%', background:'var(--primary)', color:'white', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:"'Inter',sans-serif" }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize:13.5, color:'var(--text-2)', lineHeight:1.65, paddingTop:2 }}>{s}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Doctor's advice */}
          {result.doctorAdvice && (
            <Section title="Doctor's Advice">
              <div style={{ padding:'14px 18px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius)', fontSize:14, lineHeight:1.75, color:'var(--text-2)', fontStyle:'italic' }}>
                "{result.doctorAdvice}"
                {result.doctorName && (
                  <div style={{ fontStyle:'normal', fontSize:12, color:'var(--text-3)', marginTop:8 }}>
                    — {result.doctorName}
                    {result.hospitalName ? `, ${result.hospitalName}` : ''}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Warning signs */}
          {result.warningSigns?.length > 0 && (
            <Section title="Go to Hospital Immediately If You Have">
              <div style={{ padding:'16px 20px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'var(--radius-lg)' }}>
                {result.warningSigns.map((w, i) => (
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom: i < result.warningSigns.length - 1 ? 8 : 0 }}>
                    <span style={{ color:'#b91c1c', fontSize:16, flexShrink:0 }}>•</span>
                    <span style={{ fontSize:13.5, color:'#7f1d1d', lineHeight:1.65 }}>{w}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Extracted raw text (collapsed) */}
          {result.extractedText && (
            <Section title="Extracted Raw Text">
              <div className="extracted-text">{result.extractedText}</div>
            </Section>
          )}

          {/* Disclaimer */}
          <div className="alert alert-warning">
            This analysis is for general information only. Always consult a qualified doctor before making any medical decisions.
          </div>

          {/* Bottom download buttons */}
          <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap' }}>
            <button className="btn btn-secondary"
              onClick={() => downloadTxt(result, file?.name || 'report', lang)}>
              Download as TXT
            </button>
            <button className="btn btn-primary"
              onClick={() => printReport(result, file?.name || 'report', lang)}>
              Print / Save as PDF
            </button>
            <button className="btn btn-secondary" onClick={reset}>
              Scan another document
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
