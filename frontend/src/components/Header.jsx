import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import SOSModal from './SOSModal';

const TITLES = {
  '/':          'Home',
  '/chat':      'AI Consultation',
  '/ocr':       'Document Scanner',
  '/medicine':  'Medicine Interaction Checker',
  '/patient':   'Patient Records',
  '/dashboard': 'Health Analytics',
  '/about':     'About This Project',
};

export default function Header() {
  const location = useLocation();
  const [showSOS, setShowSOS] = useState(false);

  return (
    <>
      <header className="header">
        <div className="header-left">
          <div className="header-title">{TITLES[location.pathname] || 'Health Companion'}</div>
        </div>
        <div className="header-right">
          <button className="sos-button" onClick={() => setShowSOS(true)}>
            Emergency
          </button>
        </div>
      </header>
      {showSOS && <SOSModal onClose={() => setShowSOS(false)} />}
    </>
  );
}
