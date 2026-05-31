import React, { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';

const SEV_STYLE = {
  SAFE:      { borderColor:'#bbf7d0', bg:'#f0fdf4', textColor:'#14532d', label:'Safe' },
  CAUTION:   { borderColor:'#fde68a', bg:'#fffbeb', textColor:'#78350f', label:'Caution' },
  DANGEROUS: { borderColor:'#fecaca', bg:'#fef2f2', textColor:'#7f1d1d', label:'Dangerous' },
  UNKNOWN:   { borderColor:'#bfdbfe', bg:'#eff6ff', textColor:'#1e3a8a', label:'Unknown' },
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13.5 }}>
      <span style={{ minWidth:160, fontWeight:600, color:'var(--text-3)', flexShrink:0 }}>{label}</span>
      <span style={{ color:'var(--text-2)', lineHeight:1.6 }}>{value}</span>
    </div>
  );
}

function SingleMedicineResult({ med, onReset }) {
  const m = med;
  return (
    <div>
      {/* Fuzzy match notice */}
      {m._fuzzyNote && (
        <div className="alert alert-warning" style={{ marginBottom:14 }}>
          🔍 {m._fuzzyNote}
        </div>
      )}
      {/* AI-generated notice */}
      {m._aiGenerated && (
        <div style={{ padding:'10px 14px', background:'#eff6ff', border:'1px solid #bfdbfe',
          borderRadius:'var(--radius)', marginBottom:14, fontSize:13, color:'#1d4ed8' }}>
          ✨ <strong>AI-generated result</strong> — not found in local database. Information sourced from Gemini AI. Always verify with a pharmacist.
        </div>
      )}
      {/* Header */}
      <div style={{ padding:'20px 24px', borderRadius:'var(--radius-lg)', marginBottom:20,
        background:'var(--primary-bg)', border:'1.5px solid var(--primary-bd)' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div>
            <h3 style={{ margin:0, fontSize:20, color:'var(--accent)', fontWeight:800 }}>{m.generic_name}</h3>
            <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text-3)' }}>
              Brand names: {m.brand_names?.join(', ')}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <span style={{
              padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700,
              background: m.otc_available ? '#dcfce7' : '#fee2e2',
              color: m.otc_available ? '#15803d' : '#b91c1c',
            }}>
              {m.otc_available ? '✓ OTC — No prescription needed' : `Rx — ${m.schedule || 'Prescription required'}`}
            </span>
            <span style={{ padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:600,
              background:'#dbeafe', color:'#1d4ed8' }}>
              {m.category}
            </span>
          </div>
        </div>
      </div>

      {/* Usage & Dosage */}
      <div className="card" style={{ padding:'18px 20px', marginBottom:16 }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase',
          letterSpacing:'.06em', marginBottom:12 }}>Usage & Dosage</p>
        <InfoRow label="Indications (Used for)" value={m.indications?.join(', ')} />
        <InfoRow label="Adult Dose" value={m.standard_dose?.adult} />
        <InfoRow label="Child Dose" value={m.standard_dose?.child} />
        <InfoRow label="Max Daily Dose" value={m.standard_dose?.max_daily_adult} />
        <InfoRow label="How to Take" value={m.how_to_take || 'Take as directed by your doctor or pharmacist.'} />
        <InfoRow label="Onset of Action" value={m.onset_of_action} />
        <InfoRow label="Duration of Effect" value={m.duration_of_effect} />
      </div>

      {/* Side Effects */}
      {(m.common_side_effects?.length > 0 || m.serious_side_effects?.length > 0) && (
        <div className="card" style={{ padding:'18px 20px', marginBottom:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase',
            letterSpacing:'.06em', marginBottom:12 }}>Side Effects</p>
          {m.common_side_effects?.length > 0 && (
            <InfoRow label="Common Side Effects" value={m.common_side_effects.join(', ')} />
          )}
          {m.serious_side_effects?.length > 0 && (
            <InfoRow label="Serious Side Effects" value={m.serious_side_effects.join(', ')} />
          )}
        </div>
      )}

      {/* Safety Info */}
      <div className="card" style={{ padding:'18px 20px', marginBottom:16 }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase',
          letterSpacing:'.06em', marginBottom:12 }}>Safety Information</p>
        {m.contraindications?.length > 0 && (
          <InfoRow label="Do NOT use if" value={m.contraindications.join('; ')} />
        )}
        {m.cautions?.length > 0 && (
          <InfoRow label="Use with Caution if" value={m.cautions.join('; ')} />
        )}
        <InfoRow
          label="Safe in Pregnancy"
          value={`${m.safe_in_pregnancy ? 'Generally yes' : 'Use with caution / avoid'}${m.pregnancy_note ? ' — ' + m.pregnancy_note : ''}`}
        />
        {m.interactions?.length > 0 && (
          <InfoRow label="Known Drug Interactions" value={m.interactions.slice(0, 6).join('; ')} />
        )}
      </div>

      {/* Prescription note */}
      {m.prescription_note && (
        <div className="alert alert-error" style={{ marginBottom:14 }}>
          <strong>Prescription note: </strong>{m.prescription_note}
        </div>
      )}

      {/* Source */}
      {m.source && (
        <div style={{ padding:'10px 14px', background:'var(--bg)', border:'1px solid var(--border)',
          borderRadius:'var(--radius)', marginBottom:16, fontSize:12, color:'var(--text-4)' }}>
          Source: {m.source}
        </div>
      )}

      <div className="alert alert-warning" style={{ marginBottom:16 }}>
        This information is for general guidance only. Always consult a licensed doctor or pharmacist before taking any medicine.
      </div>

      <button className="btn btn-secondary" onClick={onReset}>Search another medicine</button>
    </div>
  );
}

function DbMatchCard({ match }) {
  if (!match.found) return (
    <div style={{ padding:'10px 14px', background:'#fffbeb', border:'1px solid #fde68a',
      borderRadius:'var(--radius)', fontSize:13, color:'#78350f' }}>
      <strong>{match.searched}</strong> — not found in local database. AI will use general knowledge.
    </div>
  );
  return (
    <div style={{ padding:'14px 16px', background:'var(--primary-bg)', border:'1px solid var(--primary-bd)',
      borderRadius:'var(--radius)', fontSize:13 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6, marginBottom:6 }}>
        <div>
          <span style={{ fontWeight:700, color:'var(--accent)', fontSize:14 }}>{match.genericName}</span>
          <span style={{ color:'var(--text-3)', marginLeft:8 }}>({match.brands?.slice(0,3).join(', ')})</span>
        </div>
        <span className="badge" style={{
          background: match.otcAvailable ? '#dcfce7' : '#fee2e2',
          color: match.otcAvailable ? '#15803d' : '#b91c1c',
          padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
        }}>
          {match.otcAvailable ? 'OTC — No prescription needed' : match.schedule}
        </span>
      </div>
      {match.prescriptionNote && (
        <div style={{ fontSize:12, color:'#b91c1c', fontWeight:600, marginTop:4 }}>
          {match.prescriptionNote}
        </div>
      )}
    </div>
  );
}

export default function MedicinePage() {
  const { medicineCheck, getCommonMeds, apiKey } = useApi();
  const [mode, setMode]           = useState('single'); // 'single' | 'interaction'
  const [medInput, setMedInput]   = useState('');
  const [medicines, setMedicines] = useState([]);
  const [common, setCommon]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [singleResult, setSingleResult] = useState(null); // single lookup result
  const [dbMatches, setDbMatches] = useState([]);
  const [sources, setSources]     = useState([]);
  const [error, setError]         = useState('');

  useEffect(() => {
    getCommonMeds().then(d => setCommon(d.medicines || [])).catch(() => {});
  }, [getCommonMeds]);

  const reset = () => {
    setResult(null); setSingleResult(null); setMedicines([]);
    setError(''); setDbMatches([]); setSources([]); setMedInput('');
  };

  const switchMode = (m) => { setMode(m); reset(); };

  // ── Single medicine lookup ─────────────────────────────────
  const lookupSingle = async () => {
    const name = medInput.trim();
    if (!name) return setError('Please enter a medicine name.');
    setLoading(true); setSingleResult(null); setError('');
    try {
      const key = apiKey || sessionStorage.getItem('hc_key') || '';
      const url = `http://localhost:5000/api/medicine/lookup/${encodeURIComponent(name)}${key ? `?apiKey=${encodeURIComponent(key)}` : ''}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (!data.found) return setError(data.message || `"${name}" not found. Try the generic name or check the spelling.`);
      setSingleResult({ ...data.medicine, _fuzzyNote: data.fuzzyNote, _aiGenerated: data.aiGenerated });
    } catch (err) {
      setError(err.message || 'Lookup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Interaction checker ────────────────────────────────────
  const add = name => {
    const m = name.trim();
    if (!m || medicines.includes(m)) return;
    if (medicines.length >= 6) return setError('Maximum 6 medicines at a time.');
    setMedicines(p => [...p, m]);
    setMedInput('');
    setError('');
  };

  const remove = m => setMedicines(p => p.filter(x => x !== m));

  const checkInteraction = async () => {
    if (medicines.length < 2) return setError('Please add at least 2 medicines.');
    const key = apiKey || sessionStorage.getItem('hc_key');
    if (!key) return setError('API key not configured. Visit /settings to enter your Gemini API key.');
    setLoading(true); setResult(null); setDbMatches([]); setSources([]); setError('');
    try {
      const data = await medicineCheck(medicines);
      setResult(data.result);
      setDbMatches(data.databaseMatches || []);
      setSources(data.sources || []);
    } catch (err) {
      setError(err.message || 'Check failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const overall = result?.overallSafety;
  const overallStyle = SEV_STYLE[overall] || SEV_STYLE.UNKNOWN;

  return (
    <div className="medicine-page page">
      <h2 className="page-title">Medicine Checker</h2>

      {/* Mode tabs */}
      {!singleResult && !result && (
        <div style={{ display:'flex', gap:0, marginBottom:24, borderRadius:'var(--radius)', overflow:'hidden',
          border:'1.5px solid var(--primary-bd)', width:'fit-content' }}>
          {[
            { key:'single', label:'🔍 Look Up a Medicine' },
            { key:'interaction', label:'⚡ Check Interactions' },
          ].map(tab => (
            <button key={tab.key} onClick={() => switchMode(tab.key)}
              style={{
                padding:'10px 22px', border:'none', cursor:'pointer', fontSize:13.5, fontWeight:600,
                background: mode === tab.key ? 'var(--accent)' : 'var(--card)',
                color: mode === tab.key ? '#fff' : 'var(--text-2)',
                transition:'all .15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── SINGLE LOOKUP MODE ─────────────────────────────── */}
      {mode === 'single' && !singleResult && (
        <div className="card" style={{ padding:24, marginBottom:20 }}>
          <p className="page-desc" style={{ marginBottom:16 }}>
            Search for any medicine to see its <strong>uses, dosage, side effects, safety information</strong>, and more — verified against WHO Essential Medicines &amp; NLEM India databases.
          </p>
          <div className="form-field" style={{ marginBottom:16 }}>
            <label>Medicine name (generic or brand)</label>
            <div style={{ display:'flex', gap:8 }}>
              <input
                className="input"
                value={medInput}
                onChange={e => setMedInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupSingle(); } }}
                placeholder="e.g. Paracetamol, Dolo 650, Metformin, Cetirizine…"
                style={{ flex:1 }}
              />
              <button className="btn btn-primary" onClick={lookupSingle}
                disabled={loading || !medInput.trim()}>
                {loading ? <><span className="spin" />Looking up…</> : 'Look Up'}
              </button>
            </div>
          </div>

          <div>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', marginBottom:8,
              textTransform:'uppercase', letterSpacing:'.05em' }}>
              Common medicines — click to look up
            </p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {common.slice(0, 24).map(m => (
                <button key={m.id} className="chip"
                  onClick={() => { setMedInput(m.generic_name); }}
                  title={m.brand_names?.join(', ')}>
                  {m.generic_name.split(' ')[0]}
                  <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:4 }}>
                    {m.otc ? 'OTC' : 'Rx'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-error" style={{ marginTop:16 }}>{error}</div>}
        </div>
      )}

      {/* Single result */}
      {mode === 'single' && singleResult && (
        <SingleMedicineResult med={singleResult} onReset={reset} />
      )}

      {/* ── INTERACTION MODE ───────────────────────────────── */}
      {mode === 'interaction' && !result && (
        <div className="card" style={{ padding:24, marginBottom:20 }}>
          <p className="page-desc" style={{ marginBottom:16 }}>
            Add <strong>two or more medicines</strong> to check for dangerous drug interactions, verified against WHO/NLEM/CIMS databases.
          </p>
          <div className="form-field" style={{ marginBottom:16 }}>
            <label>Add a medicine name (generic or brand)</label>
            <div style={{ display:'flex', gap:8 }}>
              <input
                className="input"
                value={medInput}
                onChange={e => setMedInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(medInput); } }}
                placeholder="e.g. Paracetamol, Dolo 650, Metformin, Atenolol…"
                style={{ flex:1 }}
              />
              <button className="btn btn-primary" onClick={() => add(medInput)} disabled={!medInput.trim()}>
                Add
              </button>
            </div>
          </div>

          {medicines.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', marginBottom:8,
                textTransform:'uppercase', letterSpacing:'.05em' }}>
                Medicines to check ({medicines.length}/6)
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {medicines.map(m => (
                  <div key={m} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px',
                    background:'var(--primary-bg)', border:'1px solid var(--primary-bd)', borderRadius:20 }}>
                    <span style={{ fontWeight:600, color:'var(--accent)', fontSize:13 }}>{m}</span>
                    <button onClick={() => remove(m)}
                      style={{ background:'none', border:'none', color:'var(--text-4)', cursor:'pointer', fontSize:15, padding:0, lineHeight:1 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', marginBottom:8,
              textTransform:'uppercase', letterSpacing:'.05em' }}>
              Common medicines — click to add
            </p>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {common.slice(0, 20).map(m => (
                <button key={m.id} className="chip"
                  onClick={() => add(m.generic_name)}
                  disabled={medicines.some(med => med.toLowerCase().includes(m.generic_name.toLowerCase().split(' ')[0].toLowerCase()))}
                  style={{ opacity: medicines.some(med => med.toLowerCase().includes(m.generic_name.toLowerCase().split(' ')[0].toLowerCase())) ? 0.4 : 1 }}
                  title={m.brand_names?.join(', ')}>
                  {m.generic_name.split(' ')[0]}
                  <span style={{ fontSize:10, color:'var(--text-3)', marginLeft:4 }}>
                    {m.otc ? 'OTC' : 'Rx'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-primary btn-lg" onClick={checkInteraction}
            disabled={loading || medicines.length < 2}>
            {loading
              ? <><span className="spin" />Checking against medical database…</>
              : 'Check Interactions'}
          </button>

          <p style={{ fontSize:12, color:'var(--text-4)', marginTop:12 }}>
            Results are first checked against our local verified database (WHO/NLEM/CIMS), then supplemented by AI analysis.
          </p>
        </div>
      )}

      {/* Interaction Results */}
      {mode === 'interaction' && result && (
        <div>
          <div style={{
            display:'flex', alignItems:'center', gap:12, padding:'16px 20px',
            borderRadius:'var(--radius-lg)', marginBottom:20,
            background: overallStyle.bg,
            border: `1.5px solid ${overallStyle.borderColor}`,
            color: overallStyle.textColor,
          }}>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700, fontSize:16 }}>Overall: {overallStyle.label}</div>
              <div style={{ fontSize:13, opacity:.85, marginTop:2 }}>
                Medicines checked: {medicines.join(', ')}
              </div>
            </div>
          </div>

          {dbMatches.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase',
                letterSpacing:'.05em', marginBottom:10 }}>Database lookup results</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {dbMatches.map((m, i) => <DbMatchCard key={i} match={m} />)}
              </div>
            </div>
          )}

          {result.interactions?.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase',
                letterSpacing:'.05em', marginBottom:12 }}>Interaction details</p>
              {result.interactions.map((item, i) => {
                const s = SEV_STYLE[item.severity] || SEV_STYLE.UNKNOWN;
                return (
                  <div key={i} style={{ padding:'16px 18px', marginBottom:10,
                    borderRadius:'var(--radius-lg)', background:s.bg, border:`1px solid ${s.borderColor}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:14, color:s.textColor }}>{item.drugs?.join(' + ')}</span>
                      <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                        background:s.borderColor, color:s.textColor }}>{s.label}</span>
                      {(item.verified || item.fromDatabase) && (
                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                          background:'#dbeafe', color:'#1d4ed8' }}>Database verified</span>
                      )}
                    </div>
                    <p style={{ fontSize:13.5, color:'var(--text-2)', lineHeight:1.7,
                      marginBottom: item.advice ? 8 : 0 }}>{item.description}</p>
                    {item.advice && (
                      <div style={{ borderLeft:`3px solid ${s.borderColor}`, paddingLeft:10, fontSize:13, color:'var(--text-3)' }}>
                        <strong>Advice:</strong> {item.advice}
                      </div>
                    )}
                    {item.source && (
                      <div style={{ fontSize:11, color:'var(--text-4)', marginTop:8 }}>Source: {item.source}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {result.prescriptionWarnings?.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom:14 }}>
              <strong>Prescription required: </strong>{result.prescriptionWarnings.join(' · ')}
            </div>
          )}

          {result.pregnancyWarnings?.filter(Boolean).length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom:14 }}>
              <strong>Pregnancy caution: </strong>{result.pregnancyWarnings.filter(Boolean).join(' · ')}
            </div>
          )}

          {result.summary && (
            <div className="card" style={{ padding:18, marginBottom:14 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase',
                letterSpacing:'.05em', marginBottom:8 }}>Summary</p>
              <p style={{ fontSize:13.5, color:'var(--text-2)', lineHeight:1.75 }}>{result.summary}</p>
            </div>
          )}

          {result.recommendation && (
            <div className="alert alert-info" style={{ marginBottom:14 }}>
              <strong>Recommendation: </strong>{result.recommendation}
            </div>
          )}

          <div className="alert alert-warning" style={{ marginBottom:14 }}>
            This information is for general guidance only and is verified against published medical references.
            Always consult a licensed pharmacist or doctor before combining medicines.
          </div>

          {sources.length > 0 && (
            <div style={{ padding:'12px 16px', background:'var(--bg)', border:'1px solid var(--border)',
              borderRadius:'var(--radius)', marginBottom:16 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase',
                letterSpacing:'.05em', marginBottom:8 }}>References</p>
              <ul style={{ paddingLeft:16, display:'flex', flexDirection:'column', gap:4 }}>
                {sources.map((s, i) => (
                  <li key={i} style={{ fontSize:12, color:'var(--text-3)' }}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <button className="btn btn-secondary" onClick={reset}>Check another combination</button>
        </div>
      )}
    </div>
  );
}
