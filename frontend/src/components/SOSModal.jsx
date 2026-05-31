import React from 'react';

const CONTACTS = [
  { num:'108',           desc:'Ambulance Service' },
  { num:'112',           desc:'National Emergency' },
  { num:'102',           desc:'Maternal Helpline' },
  { num:'104',           desc:'Health Helpline' },
  { num:'1098',          desc:'Child Helpline' },
  { num:'1091',          desc:'Women Helpline' },
  { num:'1800-116-117',  desc:'Poison Control' },
  { num:'9152987821',    desc:'Mental Health (iCall)' },
];

const TIPS = [
  'For chest pain or difficulty breathing, call 108 immediately.',
  'For dehydration, give ORS every 5 minutes.',
  'Never self-medicate with antibiotics or steroids.',
  'Keep your blood group and allergy information accessible.',
  'Know your nearest Primary Health Centre (PHC) location.',
];

export default function SOSModal({ onClose }) {
  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="sos-header">
          <h2>Emergency Contacts</h2>
          <p>Tap a number to call immediately</p>
        </div>

        <div className="sos-grid">
          {CONTACTS.map(c => (
            <a key={c.num} href={`tel:${c.num.replace(/\D/g,'')}`} className="sos-tile">
              <span className="sos-num">{c.num}</span>
              <span className="sos-desc">{c.desc}</span>
            </a>
          ))}
        </div>

        <div className="alert alert-warning" style={{ marginBottom:16 }}>
          <strong style={{ display:'block', marginBottom:6 }}>First Aid Reminders</strong>
          <ul style={{ paddingLeft:16, display:'flex', flexDirection:'column', gap:4 }}>
            {TIPS.map((t,i) => <li key={i} style={{ fontSize:12.5 }}>{t}</li>)}
          </ul>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" style={{ width:'100%', justifyContent:'center' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
