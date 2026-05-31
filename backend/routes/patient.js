const express = require('express');
const router  = express.Router();
const { v4: uuid } = require('uuid');
const store   = new Map();

const get404 = (id,res) => { const d=store.get(id); if(!d){res.status(404).json({error:'Patient not found.'});return null;} return d; };

router.post('/create', (req,res) => {
  const { profile } = req.body;
  if (!profile?.name) return res.status(400).json({ error:'Name required.' });
  const id  = uuid();
  const now = new Date().toISOString();
  const d   = { patientId:id, profile:{ name:'',age:'',gender:'',bloodGroup:'',allergies:'',chronicConditions:'',currentMedications:'',emergencyContact:'',phone:'',village:'',...profile }, healthSummary:'', sessions:[], ocrDocuments:[], createdAt:now, updatedAt:now };
  store.set(id,d);
  res.json({ success:true, patientId:id, patient:d });
});

router.get('/:id', (req,res) => { const d=get404(req.params.id,res); if(d) res.json({success:true,patient:d}); });

router.put('/:id/profile', (req,res) => {
  const d=get404(req.params.id,res); if(!d) return;
  d.profile={...d.profile,...req.body.profile}; d.updatedAt=new Date().toISOString();
  store.set(req.params.id,d); res.json({success:true,patient:d});
});

router.post('/:id/session', (req,res) => {
  const d=get404(req.params.id,res); if(!d) return;
  const { messages, summary, title } = req.body;
  const s={ sessionId:uuid(), title:title||`Session — ${new Date().toLocaleDateString('en-IN')}`, date:new Date().toISOString(), messageCount:messages?.length||0, messages:messages||[], summary:summary||'' };
  d.sessions.unshift(s); if(d.sessions.length>20) d.sessions=d.sessions.slice(0,20);
  if(summary) d.healthSummary=summary; d.updatedAt=new Date().toISOString();
  store.set(req.params.id,d); res.json({success:true,session:s,patient:d});
});

router.delete('/:id/session/:sid', (req,res) => {
  const d=get404(req.params.id,res); if(!d) return;
  d.sessions=d.sessions.filter(s=>s.sessionId!==req.params.sid); d.updatedAt=new Date().toISOString();
  store.set(req.params.id,d); res.json({success:true,patient:d});
});

router.post('/:id/ocr-document', (req,res) => {
  const d=get404(req.params.id,res); if(!d) return;
  const doc={ docId:uuid(), fileName:req.body.fileName||'document', language:req.body.language||'english', date:new Date().toISOString(), result:req.body.result };
  d.ocrDocuments.unshift(doc); if(d.ocrDocuments.length>15) d.ocrDocuments=d.ocrDocuments.slice(0,15);
  d.updatedAt=new Date().toISOString(); store.set(req.params.id,d); res.json({success:true,doc,patient:d});
});

router.delete('/:id', (req,res) => {
  if(!store.has(req.params.id)) return res.status(404).json({error:'Not found.'});
  store.delete(req.params.id); res.json({success:true});
});

module.exports = router;
