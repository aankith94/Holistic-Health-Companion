import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ApiProvider } from './context/ApiContext';
import Sidebar       from './components/Sidebar';
import Header        from './components/Header';
import HomePage      from './pages/HomePage';
import ChatPage      from './pages/ChatPage';
import OcrPage       from './pages/OcrPage';
import MedicinePage  from './pages/MedicinePage';
import PatientPage   from './pages/PatientPage';
import DashboardPage from './pages/DashboardPage';
import AboutPage     from './pages/AboutPage';
import SettingsPage  from './pages/SettingsPage';
import './styles/global.css';

function Shell() {
  return (
    <div className="shell">
      <Sidebar />
      <div className="content">
        <Header />
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/chat"      element={<ChatPage />} />
          <Route path="/ocr"       element={<OcrPage />} />
          <Route path="/medicine"  element={<MedicinePage />} />
          <Route path="/patient"   element={<PatientPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/about"     element={<AboutPage />} />
          <Route path="/settings"  element={<SettingsPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ApiProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ApiProvider>
  );
}
