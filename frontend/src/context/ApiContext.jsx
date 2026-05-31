import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const Ctx  = createContext(null);
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const ApiProvider = ({ children }) => {
  const [apiKey, setApiKeyState] = useState(() => sessionStorage.getItem('hc_key') || '');
  const [patient, setPatient] = useState(() => { try { return JSON.parse(localStorage.getItem('hc_pt')||'null'); } catch { return null; } });

  const savePatient = useCallback((d) => { setPatient(d); localStorage.setItem('hc_pt', JSON.stringify(d)); }, []);
  const clearPatient = useCallback(() => { setPatient(null); localStorage.removeItem('hc_pt'); }, []);

  // On load, try to resync patient from server
  const fetchPatient = useCallback(async (id) => {
    const res  = await fetch(`${BASE}/patient/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    savePatient(data.patient); return data.patient;
  }, [savePatient]);

  useEffect(() => {
    if (patient?.patientId) fetchPatient(patient.patientId).catch(()=>{});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getKey = () => sessionStorage.getItem('hc_key') || '';

  const setKey = useCallback((k) => {
    sessionStorage.setItem('hc_key', k);
    setApiKeyState(k);
  }, []);

  const validateKey = useCallback(async (k) => {
    const res  = await fetch(`${BASE}/health/validate-key`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ apiKey:k }) });
    return res.json();
  }, []);

  const createPatient = useCallback(async (profile) => {
    const res  = await fetch(`${BASE}/patient/create`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ profile }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    savePatient(data.patient); return data.patient;
  }, [savePatient]);

  const updateProfile = useCallback(async (id, profile) => {
    const res  = await fetch(`${BASE}/patient/${id}/profile`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ profile }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    savePatient(data.patient); return data.patient;
  }, [savePatient]);

  const saveSession = useCallback(async (id, messages, summary, title) => {
    const res  = await fetch(`${BASE}/patient/${id}/session`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ messages, summary, title }) });
    const data = await res.json();
    if (data.patient) savePatient(data.patient); return data;
  }, [savePatient]);

  const deleteSession = useCallback(async (id, sid) => {
    const res  = await fetch(`${BASE}/patient/${id}/session/${sid}`, { method:'DELETE' });
    const data = await res.json();
    if (data.patient) savePatient(data.patient); return data;
  }, [savePatient]);

  const saveOcrDoc = useCallback(async (id, fileName, language, result) => {
    const res  = await fetch(`${BASE}/patient/${id}/ocr-document`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ fileName, language, result }) });
    const data = await res.json();
    if (data.patient) savePatient(data.patient); return data;
  }, [savePatient]);

  const chat = useCallback(async (messages) => {
    const res  = await fetch(`${BASE}/chat/message`, { method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ messages, apiKey:getKey(), patientProfile: patient ? {...patient.profile, healthSummary:patient.healthSummary} : null }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error||'Chat failed');
    return data;
  }, [patient]);

  const summarize = useCallback(async (messages, existingSummary) => {
    const res  = await fetch(`${BASE}/chat/summarize-session`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ messages, apiKey:getKey(), existingSummary }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.summary;
  }, []);

  const getSymptoms = useCallback(async () => { const res=await fetch(`${BASE}/chat/symptoms`); return res.json(); }, []);

  const ocr = useCallback(async (fd) => {
    fd.append('apiKey', getKey());
    if (patient?.patientId) fd.append('patientId', patient.patientId);
    const res  = await fetch(`${BASE}/ocr/analyze`, { method:'POST', body:fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error||'OCR failed');
    return data;
  }, [patient]);

  const medicineCheck = useCallback(async (medicines) => {
    const res  = await fetch(`${BASE}/medicine/check-interaction`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ medicines, apiKey:getKey() }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error||'Check failed');
    return data;
  }, []);

  const getCommonMeds = useCallback(async () => { const res=await fetch(`${BASE}/medicine/common`); return res.json(); }, []);

  return (
    <Ctx.Provider value={{ apiKey, setKey, validateKey, patient, savePatient, clearPatient, fetchPatient, createPatient, updateProfile, saveSession, deleteSession, saveOcrDoc, chat, summarize, getSymptoms, ocr, medicineCheck, getCommonMeds }}>
      {children}
    </Ctx.Provider>
  );
};

export const useApi = () => { const c=useContext(Ctx); if(!c) throw new Error('useApi outside ApiProvider'); return c; };
