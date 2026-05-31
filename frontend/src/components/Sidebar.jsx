import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApi } from '../context/ApiContext';

const Icon = ({ d, size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p,i)=><path key={i} d={p}/>) : <path d={d}/>}
  </svg>
);

const NAV = [
  { to:'/', label:'Home', end:true, icon:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { to:'/chat', label:'AI Consultation', icon:'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { to:'/ocr', label:'Document Scanner', icon:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
  { to:'/medicine', label:'Medicine Checker', icon:'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18' },
  { to:'/patient', label:'Patient Records', icon:'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z' },
  { to:'/dashboard', label:'Health Analytics', icon:'M18 20V10M12 20V4M6 20v-6' },
  { to:'/about', label:'About', icon:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01' },
];

export default function Sidebar() {
  const { patient } = useApi();
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>AI Holistic Companion</h1>
        <p>Rural AI Healthcare Chatbot</p>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-group-label">Navigation</span>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => `nav-link${isActive?' active':''}`}>
            <Icon d={n.icon.split('M').filter(Boolean).map(p=>'M'+p)} />
            {n.label}
          </NavLink>
        ))}

        {patient && (
          <>
            <span className="nav-group-label" style={{ marginTop:12 }}>Active Patient</span>
            <div className="patient-chip" onClick={() => navigate('/patient')} role="button">
              <div className="patient-chip-name">{patient.profile?.name}</div>
              <div className="patient-chip-meta">
                {[patient.profile?.age && `Age ${patient.profile.age}`, patient.profile?.gender, patient.profile?.bloodGroup].filter(Boolean).join(' · ')}
              </div>
              <div className="patient-chip-meta" style={{ marginTop:3 }}>
                {patient.sessions?.length||0} sessions · {patient.ocrDocuments?.length||0} documents
              </div>
            </div>
          </>
        )}
      </nav>

      <div className="sidebar-bottom">
        <strong>Medical Disclaimer</strong>
        This tool provides general health information only. It does not replace professional medical advice. Always consult a licensed doctor for serious conditions.
      </div>
    </aside>
  );
}
