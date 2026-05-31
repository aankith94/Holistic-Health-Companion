import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../context/ApiContext';

const COLORS = ['#2d6a4f','#2563eb','#b45309','#7c3aed','#0891b2','#dc2626'];

function BarChart({ data }) {
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div className="bar-chart">
      {data.map((d,i)=>(
        <div key={i} className="bar-row">
          <span className="bar-label">{d.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width:`${(d.value/max)*100}%`, background:COLORS[i%COLORS.length] }}/>
          </div>
          <span className="bar-val">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function PieChart({ data, size=120 }) {
  const total = data.reduce((s,d)=>s+d.value,0);
  if (!total) return <div style={{ width:size,height:size,background:'var(--bg)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'var(--text-4)' }}>No data</div>;
  let cum=0;
  const slices = data.map((d,i)=>{
    const pct=d.value/total, s=cum, e=cum+pct; cum=e;
    const a1=s*2*Math.PI-Math.PI/2, a2=e*2*Math.PI-Math.PI/2;
    const r=size/2-4, cx=size/2, cy=size/2;
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    return {...d, path:`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${pct>.5?1:0},1 ${x2},${y2} Z`, color:COLORS[i%COLORS.length]};
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius:'50%' }}>
      {slices.map((s,i)=><path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2"/>)}
    </svg>
  );
}

export default function DashboardPage() {
  const { patient } = useApi();
  const navigate    = useNavigate();

  const data = useMemo(()=>{
    if (!patient) return null;
    const { sessions=[], ocrDocuments=[] } = patient;
    const KW = ['fever','cough','pain','headache','vomiting','rash','cold','diarrhea','weakness','infection'];
    const sf  = {}; KW.forEach(k=>sf[k]=0);
    sessions.forEach(s=>{ const t=(s.summary+' '+s.title).toLowerCase(); KW.forEach(k=>{ if(t.includes(k)) sf[k]++; }); });
    const symptoms = Object.entries(sf).map(([l,v])=>({label:l,value:v})).sort((a,b)=>b.value-a.value).filter(d=>d.value>0).slice(0,6);

    const sev = {Mild:0,Moderate:0,High:0,Emergency:0};
    sessions.forEach(s=>{ const t=(s.summary||'').toLowerCase();
      if(t.includes('emergency')) sev.Emergency++;
      else if(t.includes('high')||t.includes('serious')) sev.High++;
      else if(t.includes('moderate')||t.includes('caution')) sev.Moderate++;
      else sev.Mild++;
    });
    const severity = Object.entries(sev).filter(([,v])=>v>0).map(([label,value])=>({label,value}));

    const dt={};
    ocrDocuments.forEach(d=>{ const t=d.result?.documentType||'Unknown'; dt[t]=(dt[t]||0)+1; });
    const docTypes = Object.entries(dt).map(([label,value])=>({label,value}));

    const mm={};
    sessions.forEach(s=>{ const m=new Date(s.date).toLocaleDateString('en-IN',{month:'short',year:'2-digit'}); mm[m]=(mm[m]||0)+1; });
    const monthly = Object.entries(mm).slice(-6).map(([label,value])=>({label,value}));

    const timeline = sessions.slice(0,5).map(s=>({
      date: new Date(s.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}),
      title: s.title,
      summary: (s.summary||'No summary').slice(0,90)+'…',
    }));

    return { sessions, ocrDocuments, symptoms, severity, docTypes, monthly, timeline };
  }, [patient]);

  if (!patient) return (
    <div className="dashboard-page page">
      <div className="empty-block" style={{ marginTop:60 }}>
        <h3>No data available</h3>
        <p>Create a patient profile and complete some AI consultations to see your health analytics here.</p>
        <button className="btn btn-primary" onClick={()=>navigate('/patient')}>Create Patient Profile</button>
      </div>
    </div>
  );

  const { sessions, ocrDocuments, symptoms, severity, docTypes, monthly, timeline } = data;

  return (
    <div className="dashboard-page page">
      <h2 style={{ marginBottom:6 }}>Health Analytics</h2>
      <p style={{ fontSize:13.5, color:'var(--text-3)', marginBottom:24 }}>
        Overview for <strong>{patient.profile?.name}</strong> based on consultation history and scanned documents.
      </p>

      <div className="kpi-row">
        {[
          { n:sessions.length,              l:'Consultations' },
          { n:ocrDocuments.length,          l:'Documents Scanned' },
          { n:patient.profile?.age||'—',    l:'Patient Age' },
          { n:patient.profile?.bloodGroup||'—', l:'Blood Group' },
        ].map((k,i)=>(
          <div key={i} className="kpi">
            <span className="kpi-n">{k.n}</span>
            <span className="kpi-l">{k.l}</span>
          </div>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div className="card" style={{ padding:40, textAlign:'center', maxWidth:520 }}>
          <h3 style={{ fontFamily:"'Inter',sans-serif", marginBottom:10, fontSize:16 }}>No consultations recorded</h3>
          <p style={{ color:'var(--text-3)', marginBottom:18, lineHeight:1.65, fontSize:13.5 }}>Start an AI consultation and save it to see detailed health analytics here.</p>
          <button className="btn btn-primary" onClick={()=>navigate('/chat')}>Start Consultation</button>
        </div>
      ) : (
        <>
          <div className="charts-grid">
            {symptoms.length > 0 && (
              <div className="card chart-card">
                <div className="chart-title">Symptom Frequency</div>
                <BarChart data={symptoms}/>
              </div>
            )}
            {severity.length > 0 && (
              <div className="card chart-card">
                <div className="chart-title">Severity Distribution</div>
                <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
                  <PieChart data={severity} size={120}/>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    {severity.map((d,i)=>(
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }}/>
                        <span>{d.label}: <strong>{d.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {monthly.length > 0 && (
              <div className="card chart-card">
                <div className="chart-title">Monthly Consultations</div>
                <BarChart data={monthly}/>
              </div>
            )}
            {docTypes.length > 0 && (
              <div className="card chart-card">
                <div className="chart-title">Document Types</div>
                <div style={{ display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
                  <PieChart data={docTypes} size={120}/>
                  <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                    {docTypes.map((d,i)=>(
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }}/>
                        <span>{d.label}: <strong>{d.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {timeline.length > 0 && (
            <div className="card" style={{ padding:24, maxWidth:640, marginTop:4 }}>
              <div className="chart-title" style={{ marginBottom:20 }}>Recent Activity</div>
              {timeline.map((t,i)=>(
                <div key={i} className="tl-item">
                  <span className="tl-date">{t.date}</span>
                  <div>
                    <div className="tl-title">{t.title}</div>
                    <div className="tl-sum">{t.summary}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
