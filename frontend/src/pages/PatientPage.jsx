import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../context/ApiContext';

const BLOOD  = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'];
const GENDER = ['Male','Female','Other','Prefer not to say'];

function F({ label, value, onChange, placeholder, type='text', options }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {options
        ? <select className="input" value={value||''} onChange={e=>onChange(e.target.value)}>
            <option value="">Select…</option>
            {options.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        : <input className="input" type={type} placeholder={placeholder} value={value||''} onChange={e=>onChange(e.target.value)} />
      }
    </div>
  );
}

function SetupForm() {
  const { createPatient } = useApi();
  const [form, setForm]   = useState({ name:'',age:'',gender:'',bloodGroup:'',allergies:'',chronicConditions:'',currentMedications:'',emergencyContact:'',phone:'',village:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const s = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    if (!form.name.trim()) return setError('Patient name is required.');
    setLoading(true); setError('');
    try { await createPatient(form); }
    catch (err) { setError(err.message || 'Failed to create profile. Ensure the backend is running on port 5000.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="patient-page page">
      <div className="setup-banner">
        <h2>Create Patient Profile</h2>
        <p>Setting up a profile enables the AI to give personalised health advice based on your allergies, chronic conditions, and past consultation history.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding:24, marginBottom:20 }}>
        <span className="section-label">Personal Information</span>
        <div className="form-grid">
          <F label="Full Name *"        value={form.name}   onChange={v=>s('name',v)}   placeholder="e.g. Ram Prasad" />
          <F label="Age"                value={form.age}    onChange={v=>s('age',v)}    placeholder="e.g. 45" type="number" />
          <F label="Gender"             value={form.gender} onChange={v=>s('gender',v)} options={GENDER} />
          <F label="Blood Group"        value={form.bloodGroup} onChange={v=>s('bloodGroup',v)} options={BLOOD} />
          <F label="Phone Number"       value={form.phone}   onChange={v=>s('phone',v)} placeholder="e.g. 9876543210" />
          <F label="Village / Location" value={form.village} onChange={v=>s('village',v)} placeholder="e.g. Rampur, UP" />
        </div>

        <span className="section-label">Medical Information</span>
        <div className="form-grid">
          <F label="Known Allergies"     value={form.allergies}          onChange={v=>s('allergies',v)}          placeholder="e.g. Penicillin, Peanuts" />
          <F label="Chronic Conditions"  value={form.chronicConditions}  onChange={v=>s('chronicConditions',v)}  placeholder="e.g. Diabetes, Hypertension" />
          <F label="Current Medications" value={form.currentMedications} onChange={v=>s('currentMedications',v)} placeholder="e.g. Metformin 500mg" />
          <F label="Emergency Contact"   value={form.emergencyContact}   onChange={v=>s('emergencyContact',v)}   placeholder="Name and phone number" />
        </div>

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
          <button className="btn btn-primary btn-lg" onClick={submit} disabled={loading}>
            {loading ? <><span className="spin"/>Creating profile…</> : 'Create Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileView() {
  const { patient, clearPatient, deleteSession, updateProfile } = useApi();
  const navigate = useNavigate();
  const [editing, setEditing]   = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  if (!patient) return null;
  const { profile, sessions=[], ocrDocuments=[], healthSummary, patientId, createdAt } = patient;
  const ef = (k,v) => setEditForm(f=>({...f,[k]:v}));

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(patientId, editForm);
      setEditing(false);
      setMsg('Profile updated successfully.');
      setTimeout(()=>setMsg(''),3000);
    } catch (err) { setMsg('Update failed: ' + err.message); }
    finally { setSaving(false); }
  };

  const delSession = async sid => {
    if (!window.confirm('Delete this session?')) return;
    await deleteSession(patientId, sid);
  };

  const exportReport = () => {
    const lines = [
      'HEALTH COMPANION — PATIENT REPORT',
      `Generated: ${new Date().toLocaleString('en-IN')}`,
      '='.repeat(48),'',
      `Patient     : ${profile.name}`,
      `Age / Gender: ${profile.age||'—'} / ${profile.gender||'—'}`,
      `Blood Group : ${profile.bloodGroup||'—'}`,
      `Village     : ${profile.village||'—'}`,
      `Phone       : ${profile.phone||'—'}`,'',
      'Medical Information:',
      `  Allergies  : ${profile.allergies||'None'}`,
      `  Conditions : ${profile.chronicConditions||'None'}`,
      `  Medications: ${profile.currentMedications||'None'}`,
      `  Emergency  : ${profile.emergencyContact||'None'}`,'',
      'AI Health Summary:',
      healthSummary||'No summary recorded.','',
      `Consultation History (${sessions.length} sessions):`,
      ...sessions.map((s,i)=>`\n${i+1}. ${s.title}\n   Date: ${new Date(s.date).toLocaleDateString('en-IN')}\n   ${s.summary||'—'}`),
      '','─'.repeat(48),
      'Health Companion — AI Medical Assistant for Rural India',
    ];
    const blob = new Blob([lines.join('\n')],{type:'text/plain'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href=url; a.download=`${profile.name.replace(/\s+/g,'_')}_report.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="patient-page page">
      {msg && <div className={`alert ${msg.startsWith('Update failed')?'alert-error':'alert-success'}`}>{msg}</div>}

      <div className="card" style={{ padding:24, marginBottom:20 }}>
        <div className="profile-header">
          <div>
            <div className="profile-name">{profile.name}</div>
            <div className="profile-meta">
              {[profile.age&&`Age ${profile.age}`, profile.gender, profile.bloodGroup, profile.village].filter(Boolean).join(' · ')}
            </div>
            <div style={{ fontSize:11, color:'var(--text-4)', marginTop:4 }}>
              ID: {patientId?.slice(0,8)}… · Created {new Date(createdAt).toLocaleDateString('en-IN')}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(!editing); setEditForm({...profile}); }}>
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportReport}>Export Report</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/chat')}>New Consultation</button>
            <button className="btn btn-danger btn-sm" onClick={() => { if(window.confirm('Remove patient profile from this device?')) clearPatient(); }}>Remove</button>
          </div>
        </div>

        {editing ? (
          <div style={{ marginTop:20 }}>
            <div className="form-grid">
              {[{k:'name',l:'Full Name',p:'Full name'},{k:'age',l:'Age',p:'Age',t:'number'},{k:'phone',l:'Phone',p:'Phone'},{k:'village',l:'Village',p:'Village'},{k:'allergies',l:'Allergies',p:'Allergies'},{k:'chronicConditions',l:'Chronic Conditions',p:'Conditions'},{k:'currentMedications',l:'Medications',p:'Medications'},{k:'emergencyContact',l:'Emergency Contact',p:'Name & number'}]
                .map(f=>(
                  <div key={f.k} className="form-field">
                    <label>{f.l}</label>
                    <input className="input" type={f.t||'text'} placeholder={f.p} value={editForm[f.k]||''} onChange={e=>ef(f.k,e.target.value)} />
                  </div>
                ))}
              <div className="form-field">
                <label>Gender</label>
                <select className="input" value={editForm.gender||''} onChange={e=>ef('gender',e.target.value)}>
                  <option value="">Select</option>{GENDER.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Blood Group</label>
                <select className="input" value={editForm.bloodGroup||''} onChange={e=>ef('bloodGroup',e.target.value)}>
                  <option value="">Select</option>{BLOOD.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
              <button className="btn btn-secondary" onClick={()=>setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving?<><span className="spin"/>Saving…</>:'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-grid">
            {[{l:'Phone',v:profile.phone},{l:'Allergies',v:profile.allergies},{l:'Conditions',v:profile.chronicConditions},{l:'Medications',v:profile.currentMedications},{l:'Emergency Contact',v:profile.emergencyContact}]
              .filter(i=>i.v).map(item=>(
                <div key={item.l} className="profile-field">
                  <label>{item.l}</label>
                  <p>{item.v}</p>
                </div>
              ))}
          </div>
        )}
      </div>

      {healthSummary && (
        <div className="card" style={{ padding:20, marginBottom:20 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>AI Health Summary</p>
          <p style={{ fontSize:13.5, color:'var(--text-2)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{healthSummary}</p>
        </div>
      )}

      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <h3 style={{ fontSize:16, fontWeight:600, color:'var(--text)', fontFamily:"'Inter',sans-serif" }}>Consultations ({sessions.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={()=>navigate('/chat')}>New Consultation</button>
        </div>
        {sessions.length===0 ? (
          <div className="empty-block">
            <h3>No consultations yet</h3>
            <p>Start an AI consultation and click Save Session to record it here.</p>
            <button className="btn btn-primary" onClick={()=>navigate('/chat')}>Start Consultation</button>
          </div>
        ) : sessions.map(s=>(
          <div key={s.sessionId} className="session-item">
            <div style={{ flex:1, minWidth:0 }}>
              <div className="session-title">{s.title}</div>
              <div className="session-meta">
                {new Date(s.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} · {s.messageCount} messages
              </div>
              {s.summary && <div className="session-sum">{s.summary}</div>}
            </div>
            <button className="btn btn-danger btn-sm" onClick={()=>delSession(s.sessionId)}>Delete</button>
          </div>
        ))}
      </div>

      {ocrDocuments.length > 0 && (
        <div>
          <h3 style={{ fontSize:16, fontWeight:600, color:'var(--text)', fontFamily:"'Inter',sans-serif", marginBottom:14 }}>Scanned Documents ({ocrDocuments.length})</h3>
          {ocrDocuments.map(doc=>(
            <div key={doc.docId} className="card" style={{ padding:14, marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{doc.fileName}</div>
                  <div style={{ fontSize:12, color:'var(--text-3)' }}>
                    {new Date(doc.date).toLocaleDateString('en-IN')} · {doc.language} · {doc.result?.documentType||'Medical Document'}
                  </div>
                </div>
                <span className="badge badge-blue">{doc.language}</span>
              </div>
              {doc.result?.simpleSummary && (
                <p style={{ fontSize:12.5, color:'var(--text-3)', marginTop:8, lineHeight:1.55, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {doc.result.simpleSummary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PatientPage() {
  const { patient } = useApi();
  return patient ? <ProfileView /> : <SetupForm />;
}
