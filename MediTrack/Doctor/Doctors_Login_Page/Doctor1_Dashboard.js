// /* doctor_dashboard.js
//    Option A — Firebase-powered Doctor Dashboard
//    - Real Firebase mode (auth + firestore + storage) expected
//    - Realtime listeners for appointments & notifications
//    - Charts (Chart.js) powered by Firestore data
// */

// /* -------------------------
//    Firebase config — REPLACE if you want
//    ------------------------- */
// const FIREBASE_CONFIG = {
//   apiKey: "AIzaSyBN7f6nmjr4xg3mW4e0X5E_loNVlXvmpWs",
//   authDomain: "meditrack-1a325.firebaseapp.com",
//   projectId: "meditrack-1a325",
//   storageBucket: "meditrack-1a325.firebasestorage.app",
//   messagingSenderId: "203548219971",
//   appId: "1:203548219971:web:aad75f729aa5d4f1eb92f6"
// };
// firebase.initializeApp(FIREBASE_CONFIG);
// const auth = firebase.auth();
// const db = firebase.firestore();
// const storage = firebase.storage();

// /* -------------------------
//    DOM helpers
//    ------------------------- */
// const $ = (s, r=document) => r.querySelector(s);
// const $$ = (s, r=document) => Array.from((r||document).querySelectorAll(s));
// const create = (t, a={}, html='') => { const e=document.createElement(t); for(const k in a){ if(k==='class') e.className=a[k]; else e.setAttribute(k,a[k]); } if(html)e.innerHTML=html; return e; };

// /* -------------------------
//    App state
//    ------------------------- */
// let currentDoctor = null;
// let patientsChart=null, appointmentsChart=null;

// /* -------------------------
//    Boot: require auth
//    ------------------------- */
// document.addEventListener('DOMContentLoaded', () => {
//   initUI();
//   // Protect dashboard: if not logged in, send to doctor login page
//   auth.onAuthStateChanged(user => {
//     if(!user){
//       // not logged in -> redirect to login (relative path)
//       window.location.href = "../Doctors Login Page/doctor_LoginPage.html";
//       return;
//     }
//     currentDoctor = { uid: user.uid, email: user.email, name: user.displayName || user.email };
//     // load profile & start app
//     loadDoctorProfile().then(startApp);
//   });
// });

// /* -------------------------
//    UI init: sidebar, toggles, inject tools
//    ------------------------- */
// function initUI(){
//   // sidebar indicator
//   const sidebar = document.querySelector('.sidebar');
//   if(sidebar){
//     const nav = sidebar.querySelector('nav');
//     const items = Array.from(nav.querySelectorAll('ul li[data-view]'));
//     const indicator = sidebar.querySelector('.sidebar-indicator');
//     function placeIndicator(el){
//       if(!el || !indicator) return;
//       indicator.style.top = el.offsetTop + 'px';
//       indicator.style.height = el.offsetHeight + 'px';
//     }
//     const initial = items.find(i=>i.classList.contains('active')) || items[0];
//     setTimeout(()=>placeIndicator(initial), 40);
//     items.forEach(it => {
//       it.addEventListener('click', ()=> {
//         items.forEach(x=>x.classList.remove('active')); it.classList.add('active');
//         placeIndicator(it);
//         // basic view switching by data-view
//         const view = it.dataset.view;
//         document.querySelectorAll('main[id^="view-"], main[id^="view"]').forEach(v=> v.classList.add('hidden'));
//         const target = document.getElementById('view-' + view) || document.getElementById('view-' + view) || document.getElementById(view);
//         if(target) target.classList.remove('hidden'); // show if exists
//       });
//     });
//     sidebar.addEventListener('mouseenter', ()=> sidebar.classList.add('expanded'));
//     sidebar.addEventListener('mouseleave', ()=> sidebar.classList.remove('expanded'));
//   }

//   // dark toggle
//   const darkToggle = $('#darkToggle');
//   try {
//     if(localStorage.getItem('doctor_dark') === 'true') document.body.classList.add('dark');
//     darkToggle && darkToggle.addEventListener('click', ()=> {
//       document.body.classList.toggle('dark');
//       localStorage.setItem('doctor_dark', document.body.classList.contains('dark') ? 'true' : 'false');
//     });
//   } catch(e){}

//   // notifications dropdown
//   const dropdown = document.querySelector('.dropdown');
//   if(dropdown) dropdown.addEventListener('click', () => {
//     const menu = dropdown.querySelector('.dropdown-menu');
//     if(menu) menu.classList.toggle('show');
//   });

//   // inject topbar tools (Scan QR, Settings)
//   injectTopbarTools();

//   // logout
//   const logoutBtn = document.getElementById('logoutBtn');
//   if(logoutBtn) logoutBtn.addEventListener('click', async ()=> {
//     try{ await auth.signOut(); window.location.href="../Doctors Login Page/doctor_LoginPage.html"; } catch(e){ console.error(e); alert('Logout failed'); }
//   });
// }

// /* -------------------------
//    Inject Scan & Settings
//    ------------------------- */
// function injectTopbarTools(){
//   const userMenu = document.getElementById('userMenu');
//   if(!userMenu) return;
//   if($('#doctorTools')) return;
//   const tools = create('div',{id:'doctorTools', style:'display:flex;gap:8px;align-items:center;margin-right:6px'});
//   const scanBtn = create('button',{id:'btnScanQR', class:'btn-gold-small'}, 'Scan QR');
//   const settingsBtn = create('button',{id:'btnSettings', class:'btn-outline-gold'}, 'Settings');
//   tools.appendChild(scanBtn);
//   tools.appendChild(settingsBtn);
//   userMenu.parentNode.insertBefore(tools, userMenu);

//   scanBtn.addEventListener('click', openQRScannerModal);
//   settingsBtn.addEventListener('click', openSettingsModal);
// }

// /* -------------------------
//    Load doctor profile from Firestore
//    ------------------------- */
// async function loadDoctorProfile(){
//   try {
//     const docRef = db.collection('doctors').doc(currentDoctor.uid);
//     const docSnap = await docRef.get();
//     if(docSnap.exists){
//       const data = docSnap.data();
//       currentDoctor.name = data.name || currentDoctor.email;
//       currentDoctor.specialty = data.specialization || data.specialty || '';
//       currentDoctor.phone = data.phone || '';
//       currentDoctor.profilePic = data.profilePic || '';
//       setDoctorName(currentDoctor.name);
//     } else {
//       // if not exists, create minimal profile
//       await docRef.set({ name: currentDoctor.name, email: currentDoctor.email, specialization: '', createdAt: new Date() });
//       setDoctorName(currentDoctor.name);
//     }
//   } catch(e){ console.error('loadDoctorProfile', e); }
// }

// /* -------------------------
//    Start app: load data and attach listeners
//    ------------------------- */
// async function startApp(){
//   attachQuickActions();
//   await Promise.all([ loadStats(), loadAppointments(), loadDoctorsOnDuty(), loadRecentActivity(), loadPatients(), setupCharts() ]);
//   setupRealtimeListeners();
// }

// /* -------------------------
//    Quick actions
//    ------------------------- */
// function attachQuickActions(){
//   const addBtn = $('#btnAddPatient');
//   if(addBtn) addBtn.addEventListener('click', async ()=> {
//     const name = prompt('Patient full name'); if(!name) return;
//     const phone = prompt('Phone (with country code)') || '';
//     const obj = { name, phone, createdAt:new Date().toISOString(), doctorId: currentDoctor.uid };
//     try{
//       await db.collection('patients').add(obj);
//       showToast('Patient added');
//       loadPatients();
//     } catch(e){ console.error(e); showToast('Add patient failed'); }
//   });

//   const newAppt = $('#btnNewAppt');
//   if(newAppt) newAppt.addEventListener('click', async ()=> {
//     const patient = prompt('Patient name or id'); if(!patient) return;
//     const date = prompt('Date (YYYY-MM-DD)', new Date().toISOString().slice(0,10)); if(!date) return;
//     const time = prompt('Time (HH:MM)', '11:00'); if(!time) return;
//     const ap = { doctorId: currentDoctor.uid, patientName: patient, date, time, status:'pending', createdAt:new Date().toISOString() };
//     try{
//       await db.collection('appointments').add(ap);
//       showToast('Appointment created');
//       loadAppointments();
//     } catch(e){ console.error(e); showToast('Appointment failed'); }
//   });
// }

// /* -------------------------
//    Loaders
//    ------------------------- */
// async function loadStats(){
//   const elOnline = document.getElementById('stat-online');
//   const elOffline = document.getElementById('stat-offline');
//   const elToday = document.getElementById('stat-today-appt');
//   const elPres = document.getElementById('stat-prescribed');

//   try{
//     const pSnap = await db.collection('patients').where('doctorId','==',currentDoctor.uid).get();
//     elOnline && (elOnline.innerText = pSnap.size);
//     elOffline && (elOffline.innerText = 0); // can be extended

//     const today = new Date().toISOString().slice(0,10);
//     const apSnap = await db.collection('appointments').where('doctorId','==',currentDoctor.uid).where('date','==',today).get();
//     elToday && (elToday.innerText = apSnap.size);

//     const presSnap = await db.collection('prescriptions').where('doctorId','==',currentDoctor.uid).get();
//     elPres && (elPres.innerText = presSnap.size);
//   } catch(e){ console.error('loadStats', e); }
// }

// async function loadAppointments(){
//   const tbody = $('#upcomingApptBody');
//   if(!tbody) return;
//   tbody.innerHTML = '<tr><td colspan="4" class="muted">Loading…</td></tr>';
//   try{
//     const snap = await db.collection('appointments').where('doctorId','==',currentDoctor.uid).orderBy('date').limit(12).get();
//     const list = snap.docs.map(d=>({ id:d.id, ...d.data() }));
//     if(!list.length){ tbody.innerHTML = '<tr><td colspan="4" class="muted">No upcoming appointments</td></tr>'; return; }
//     tbody.innerHTML = '';
//     for(const a of list){
//       const tr = create('tr');
//       tr.innerHTML = `<td>${escapeHtml(a.patientName||a.patient||'Unknown')}</td><td>${escapeHtml(a.date)}</td><td>${escapeHtml(a.time)}</td><td><button class="btn small view-appt" data-id="${a.id}" data-patient="${escapeHtml(a.patientName||'')}">Open</button></td>`;
//       tbody.appendChild(tr);
//     }
//     $$('.view-appt').forEach(b=> b.addEventListener('click', ()=> openPatientModal(b.dataset.patient)));
//   } catch(e){ console.error(e); tbody.innerHTML = '<tr><td colspan="4" class="muted">Error loading</td></tr>'; }
// }

// async function loadDoctorsOnDuty(){
//   const grid = $('#doctorsGrid'); if(!grid) return;
//   grid.innerHTML = '';
//   try{
//     const snap = await db.collection('doctors').where('isOnDuty','==',true).get();
//     if(snap.empty){ grid.innerHTML = '<div class="muted">No doctors on duty</div>'; return; }
//     snap.docs.forEach(d=> {
//       const data = d.data();
//       grid.appendChild(renderDoctorMini({ name: data.name || 'Doctor', spec: data.specialization || '', photo: data.profilePic || '' }));
//     });
//   } catch(e){ console.error(e); }
// }

// function renderDoctorMini(d){
//   const initial = d.name.split(' ').map(n=>n[0]).slice(0,2).join('');
//   const card = create('div',{class:'doctor-card hover-tilt'}, `<div style="width:100%;height:78px;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#1abc9c,#3498db);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${initial}</div>`);
//   const h = create('h4',{}, d.name);
//   const p = create('p',{}, d.spec);
//   card.appendChild(h); card.appendChild(p);
//   return card;
// }

// async function loadRecentActivity(){
//   const ul = $('#activityList'); if(!ul) return;
//   ul.innerHTML = '';
//   try{
//     const snap = await db.collection('activityLogs').where('doctorId','==',currentDoctor.uid).orderBy('timestamp','desc').limit(6).get();
//     if(snap.empty){ ul.innerHTML = '<li class="muted">No recent activity</li>'; return; }
//     snap.docs.forEach(d => {
//       const dd = d.data();
//       ul.appendChild(create('li',{class:'muted'}, `${dd.action} · ${new Date(dd.timestamp).toLocaleString()}`));
//     });
//   } catch(e){ console.error(e); const demo = ['Prescription updated for John Doe','New appointment scheduled for Jane','Lab result uploaded']; demo.forEach(t=> ul.appendChild(create('li',{class:'muted'}, t))); }
// }

// async function loadPatients(){
//   const wrap = $('#patientsList'); if(!wrap) return;
//   wrap.innerHTML = '<div class="muted">Loading…</div>';
//   try{
//     const snap = await db.collection('patients').where('doctorId','==',currentDoctor.uid).get();
//     if(snap.empty){ wrap.innerHTML = '<div class="muted">No patients yet</div>'; return; }
//     wrap.innerHTML = '';
//     snap.docs.forEach(d => {
//       const data = d.data();
//       const card = create('div',{class:'card'}, `<div style="display:flex;justify-content:space-between;align-items:center">
//         <div><strong>${escapeHtml(data.name)}</strong><div class="muted">${escapeHtml(data.phone||'')}</div></div>
//         <div style="display:flex;gap:8px">
//           <button class="btn small view-patient" data-id="${d.id}" data-name="${escapeHtml(data.name)}">View</button>
//           <a class="btn small ghost" href="https://wa.me/${encodeURIComponent((data.phone||'').replace(/[^+\\d]/g,''))}" target="_blank">WhatsApp</a>
//         </div>
//       </div>`);
//       wrap.appendChild(card);
//     });
//     $$('.view-patient').forEach(b => b.addEventListener('click', ()=> openPatientModal(b.dataset.name)));
//   } catch(e){ console.error(e); wrap.innerHTML = '<div class="muted">Error loading patients</div>'; }
// }

// /* -------------------------
//    Notifications & realtime
//    ------------------------- */
// function setupRealtimeListeners(){
//   try{
//     db.collection('notifications').where('doctorId','==',currentDoctor.uid).orderBy('timestamp','desc').limit(20)
//       .onSnapshot(snap => renderNotifications(snap.docs.map(d=>({ id:d.id, ...d.data() }))));

//     db.collection('appointments').where('doctorId','==',currentDoctor.uid).onSnapshot(()=> {
//       loadAppointments();
//       loadStats();
//       refreshChartsData();
//     });

//     db.collection('patients').where('doctorId','==',currentDoctor.uid).onSnapshot(()=> {
//       loadPatients();
//       loadStats();
//     });
//   } catch(e){ console.error('realtime', e); }
// }

// function renderNotifications(items){
//   const listEl = document.querySelector('.dropdown .dropdown-menu');
//   if(!listEl) return;
//   listEl.innerHTML = '';
//   if(!items || !items.length) { listEl.innerHTML = '<div class="muted">No notifications</div>'; return; }
//   items.forEach(n=>{
//     const row = create('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid rgba(0,0,0,0.04)'});
//     const left = create('div',{}, `<strong>${escapeHtml(n.title||'Notification')}</strong><div class="muted" style="font-size:13px">${escapeHtml(n.body||'')}</div>`);
//     const actions = create('div',{style:'display:flex;gap:6px'});
//     if(n.type === 'appointment'){
//       const a = create('button',{class:'btn small'}, 'Accept'); a.addEventListener('click', ()=> handleNotifAppointment(n.id,'accept',n));
//       const r = create('button',{class:'btn small ghost'}, 'Decline'); r.addEventListener('click', ()=> handleNotifAppointment(n.id,'decline',n));
//       actions.appendChild(a); actions.appendChild(r);
//     } else if(n.type === 'pharmacy'){
//       const a = create('button',{class:'btn small'}, 'Approve'); a.addEventListener('click', ()=> handlePharmacy(n.id,'approve',n));
//       const r = create('button',{class:'btn small ghost'}, 'Reject'); r.addEventListener('click', ()=> handlePharmacy(n.id,'reject',n));
//       actions.appendChild(a); actions.appendChild(r);
//     } else {
//       const d = create('button',{class:'btn small ghost'}, 'Dismiss'); d.addEventListener('click', ()=> dismissNotif(n.id));
//       actions.appendChild(d);
//     }
//     row.appendChild(left); row.appendChild(actions);
//     listEl.appendChild(row);
//   });
// }

// async function handleNotifAppointment(id, action, data){
//   try{
//     const nRef = db.collection('notifications').doc(id);
//     const nSnap = await nRef.get();
//     if(!nSnap.exists) return showToast('Already handled');
//     const payload = nSnap.data();
//     if(payload.meta && payload.meta.apptId){
//       const apRef = db.collection('appointments').doc(payload.meta.apptId);
//       if(action === 'accept') await apRef.set({ status:'confirmed' }, { merge:true});
//       else await apRef.set({ status:'declined' }, { merge:true});
//       await nRef.delete();
//       showToast('Appointment ' + (action==='accept' ? 'confirmed' : 'declined'));
//       loadAppointments();
//     } else {
//       await nRef.delete(); showToast('Notification handled');
//     }
//   } catch(e){ console.error(e); showToast('Handle failed'); }
// }
// async function handlePharmacy(id, action, data){ try{ await db.collection('notifications').doc(id).delete(); showToast('Processed'); }catch(e){console.error(e);} }
// async function dismissNotif(id){ try{ await db.collection('notifications').doc(id).delete(); showToast('Dismissed'); }catch(e){console.error(e);} }

// /* -------------------------
//    Charts
//    ------------------------- */
// async function setupCharts(){
//   const pc = document.getElementById('patientsChart')?.getContext('2d');
//   const ac = document.getElementById('appointmentsChart')?.getContext('2d');
//   if(pc){
//     patientsChart = new Chart(pc, { type:'line', data:{ labels:[], datasets:[{ label:'Appointments (last 7 days)', data:[], borderColor:'#28a745', backgroundColor:'rgba(40,167,69,0.12)', fill:true }] }, options:{ responsive:true, plugins:{ legend:{ display:false } } }});
//   }
//   if(ac){
//     appointmentsChart = new Chart(ac, { type:'pie', data:{ labels:['Confirmed','Pending','Cancelled'], datasets:[{ data:[0,0,0], backgroundColor:['#28a745','#f1c40f','#dc3545'] }] }, options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } }});
//   }
//   await refreshChartsData();
// }

// async function refreshChartsData(){
//   if(!patientsChart || !appointmentsChart) return;
//   try{
//     const now = new Date();
//     const labels=[]; const values=[];
//     for(let i=6;i>=0;i--){
//       const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
//       const key = d.toISOString().slice(0,10);
//       labels.push(key);
//       const snap = await db.collection('appointments').where('doctorId','==',currentDoctor.uid).where('date','==',key).get();
//       values.push(snap.size);
//     }
//     patientsChart.data.labels = labels; patientsChart.data.datasets[0].data = values; patientsChart.update();
//     const allSnap = await db.collection('appointments').where('doctorId','==',currentDoctor.uid).get();
//     const confirmed = allSnap.docs.filter(d=>d.data().status==='confirmed').length;
//     const pending = allSnap.docs.filter(d=>d.data().status==='pending').length;
//     const cancelled = allSnap.docs.filter(d=>d.data().status==='cancelled').length;
//     appointmentsChart.data.datasets[0].data = [confirmed,pending,cancelled]; appointmentsChart.update();
//   } catch(e){ console.error('refreshChartsData', e); }
// }

// /* -------------------------
//    Prescription creation + QR
//    ------------------------- */
// function openCreatePrescriptionModal(patientName='Patient'){
//   const existing = document.getElementById('prescriptionModal'); if(existing) existing.remove();
//   const modal = create('div',{id:'prescriptionModal', class:'modal'});
//   const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>New Prescription — ${escapeHtml(patientName)}</h3>
//     <div style="display:flex;gap:12px;flex-direction:column;margin-top:8px">
//       <label class="muted">Upload Doctor Template (optional)</label>
//       <input id="presTemplateInput" type="file" accept="image/*,.pdf"/>
//       <label class="muted">Medicines (one per line: Name | Dosage | Duration | Notes)</label>
//       <textarea id="presMeds" style="width:100%;height:120px;padding:8px;border-radius:8px;border:1px solid #eee"></textarea>
//       <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
//         <button id="savePres" class="btn">Save & Generate QR</button>
//         <button id="cancelPres" class="btn small ghost">Cancel</button>
//       </div>
//     </div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#cancelPres').addEventListener('click', ()=> modal.remove());
//   $('#savePres').addEventListener('click', async ()=> {
//     const medsText = $('#presMeds').value.trim();
//     if(!medsText){ alert('Add at least one medicine'); return; }
//     const file = $('#presTemplateInput').files && $('#presTemplateInput').files[0];
//     const presObj = { doctorId: currentDoctor.uid, patientName, medicines: medsText.split('\n').map(x=>x.trim()).filter(Boolean), createdAt: new Date().toISOString() };
//     try{
//       let url='';
//       if(file){
//         const path = `prescription_templates/${currentDoctor.uid}/${Date.now()}_${file.name}`;
//         const ref = storage.ref().child(path);
//         await ref.put(file);
//         url = await ref.getDownloadURL();
//       }
//       const docRef = await db.collection('prescriptions').add({...presObj, templateUrl: url});
//       const presUrl = `${location.origin}/view_prescription.html?id=${docRef.id}`;
//       const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(presUrl)}`;
//       await db.collection('prescriptions').doc(docRef.id).set({ qrUrl: qr }, { merge:true });
//       modal.remove();
//       showPrescriptionResult(docRef.id, presUrl, qr);
//       loadStats();
//     } catch(e){ console.error(e); alert('Save failed'); }
//   });
// }

// function showPrescriptionResult(id, presUrl, qrSrc){
//   const modal = create('div',{class:'modal'});
//   const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>Prescription Created</h3><p class="muted">ID: ${escapeHtml(id)}</p><div style="margin-top:8px"><img src="${escapeHtml(qrSrc)}" alt="QR" style="width:220px;height:220px;border-radius:8px"></div><div style="display:flex;justify-content:center;gap:8px;margin-top:12px"><a class="btn" href="${escapeHtml(presUrl)}" target="_blank">Open</a><button class="btn small ghost" id="closePres">Close</button></div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#closePres').addEventListener('click', ()=> modal.remove());
// }

// /* -------------------------
//    Patient modal (view reports & pres)
//    ------------------------- */
// async function openPatientModal(patientName){
//   try{
//     const pSnap = await db.collection('patients').where('name','==',patientName).limit(1).get();
//     let patient = null;
//     if(!pSnap.empty) patient = { id:pSnap.docs[0].id, ...pSnap.docs[0].data() };
//     else patient = { name: patientName, phone:'', age:'', sex:'', reports:[], prescriptions:[] };

//     const presSnap = await db.collection('prescriptions').where('patientName','==',patientName).get();
//     const pres = presSnap.docs.map(d=>({ id:d.id, ...d.data() }));
//     const repSnap = await db.collection('reports').where('patientName','==',patientName).get();
//     const reps = repSnap.docs.map(d=>({ id:d.id, ...d.data() }));
//     renderPatientModal({ ...patient, reports: reps, prescriptions: pres });
//   } catch(e){ console.error(e); alert('Open patient failed'); }
// }

// function renderPatientModal(data){
//   const modal = create('div',{class:'modal'});
//   const card = create('div',{class:'card'});
//   card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
//     <div>
//       <h3>${escapeHtml(data.name)}</h3>
//       <div class="muted">${escapeHtml(data.age||'')} · ${escapeHtml(data.sex||'')}</div>
//       <div class="muted" style="margin-top:6px">${escapeHtml(data.phone||'')}</div>
//     </div>
//     <div style="display:flex;gap:8px;align-items:center">
//       <a class="btn small" href="https://wa.me/${encodeURIComponent((data.phone||'').replace(/[^+\\d]/g,''))}" target="_blank">WhatsApp</a>
//       <button class="btn small" id="createPresBtn">+ Prescription</button>
//     </div>
//   </div>
//   <hr style="margin:12px 0">
//   <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
//     <div>
//       <h4>Reports</h4>
//       <div id="patientReports">${(data.reports||[]).length ? data.reports.map(r=>`<div class="card" style="padding:8px;margin-bottom:8px"><strong>${escapeHtml(r.title)}</strong><div class="muted">${escapeHtml(r.date)}</div><div class="muted">${escapeHtml(r.notes||'')}</div></div>`).join('') : '<div class="muted">No reports</div>'}</div>
//     </div>
//     <div>
//       <h4>Prescriptions</h4>
//       <div id="patientPres">${(data.prescriptions||[]).length ? data.prescriptions.map(p=>`<div class="card" style="padding:8px;margin-bottom:8px"><strong>${escapeHtml(p.createdAt||'')}</strong><div class="muted">${escapeHtml((p.medicines||[]).join(', '))}</div></div>`).join('') : '<div class="muted">No prescriptions</div>'}</div>
//     </div>
//   </div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#createPresBtn').addEventListener('click', ()=> openCreatePrescriptionModal(data.name));
//   modal.addEventListener('click', (e)=> { if(e.target===modal) modal.remove(); });
// }

// /* -------------------------
//    Chat (lightweight) - opens floating chat
//    ------------------------- */
// function openChatView(){
//   let chatC = $('#chatContainer');
//   if(!chatC){
//     chatC = create('div',{id:'chatContainer', style:'position:fixed;bottom:12px;right:12px;width:360px;height:520px;background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.12);z-index:9999;overflow:hidden;display:flex;flex-direction:column'});
//     document.body.appendChild(chatC);
//   }
//   chatC.innerHTML = `<div style="padding:12px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;justify-content:space-between;align-items:center"><strong>Chat</strong><button id="closeChat" class="btn small ghost">Close</button></div><div id="chatList" style="padding:12px;flex:1;overflow:auto"></div><div style="padding:10px;border-top:1px solid rgba(0,0,0,0.06);display:flex;gap:8px"><input id="chatMessage" placeholder="Message..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #eee"><button id="sendMsg" class="btn small">Send</button></div>`;
//   $('#closeChat').addEventListener('click', ()=> chatC.remove());
// }

// /* -------------------------
//    QR Scanner modal (html5-qrcode fallback)
//    ------------------------- */
// function openQRScannerModal(){
//   const modal = create('div',{class:'modal'}); const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>Scan QR</h3><p class="muted">Scan a prescription / patient QR to access data.</p><div id="qr-reader" style="width:100%;height:360px;background:#f6f6f6;border-radius:8px;display:flex;align-items:center;justify-content:center">Camera not available</div><div style="text-align:right;margin-top:10px"><button class="btn small" id="closeQR">Close</button></div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#closeQR').addEventListener('click', ()=> modal.remove());

//   if(window.Html5Qrcode){
//     const qreader = new Html5Qrcode("qr-reader");
//     Html5Qrcode.getCameras().then(cams => {
//       if(cams && cams.length){
//         qreader.start(cams[0].id, { fps:10, qrbox:250 }, (decoded)=> { handleScannedQR(decoded); qreader.stop().then(()=>qreader.clear()).catch(()=>{}); modal.remove(); }, (err)=>{}).catch(e=>{ document.getElementById('qr-reader').innerText = 'Camera error'; });
//         modal.querySelector('#closeQR').addEventListener('click', ()=> qreader.stop().then(()=>qreader.clear()).catch(()=>{}));
//       } else document.getElementById('qr-reader').innerText = 'No camera found';
//     }).catch(e=> document.getElementById('qr-reader').innerText = 'Camera permission denied or not supported');
//   } else {
//     const reader = document.getElementById('qr-reader');
//     reader.innerHTML = `<div style="padding:12px"><input id="qrPaste" placeholder="Paste QR URL or code" style="width:100%;padding:8px;border-radius:6px;border:1px solid #eee"><div style="text-align:right;margin-top:8px"><button id="qrPasteBtn" class="btn small">Open</button></div></div>`;
//     $('#qrPasteBtn').addEventListener('click', ()=> { const val = $('#qrPaste').value.trim(); if(!val) return; modal.remove(); handleScannedQR(val); });
//   }
// }

// async function handleScannedQR(payload){
//   try{
//     if(payload.includes('/view_prescription.html?id=')){
//       const id = new URL(payload).searchParams.get('id');
//       if(id){
//         const snap = await db.collection('prescriptions').doc(id).get();
//         if(snap.exists) { previewPrescription(snap.data(), id); return; }
//       }
//     } else if(payload.startsWith('patient:')){
//       const pid = payload.split(':')[1]; if(pid) openPatientModal(pid); return;
//     } else if(payload.startsWith('pres:')){
//       const pid = payload.split(':')[1]; alert('Open prescription ' + pid); return;
//     }
//     if(payload.startsWith('http')) window.open(payload,'_blank'); else showToast('Scanned: ' + payload);
//   } catch(e){ console.error(e); showToast('Invalid QR payload'); }
// }

// function previewPrescription(p, id){
//   const modal = create('div',{class:'modal'}); const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>Prescription Preview</h3><div class="muted">ID: ${escapeHtml(id)}</div><div style="margin-top:12px"><strong>Patient:</strong> ${escapeHtml(p.patientName||'')}</div><div style="margin-top:8px"><strong>Medicines:</strong><div class="muted">${escapeHtml((p.medicines||[]).join(', '))}</div></div><div style="margin-top:12px;text-align:right"><a class="btn" href="${escapeHtml(p.qrUrl||('#'))}" target="_blank">Open QR</a><button class="btn small ghost" id="closePreview">Close</button></div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#closePreview').addEventListener('click', ()=> modal.remove());
// }

// /* -------------------------
//    Settings modal
//    ------------------------- */
// function openSettingsModal(){
//   const modal = create('div',{class:'modal'}); const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>Settings</h3>
//     <div style="margin-top:8px">
//       <label class="muted">Profile name</label>
//       <input id="docProfileName" style="width:100%;padding:8px;border-radius:8px;border:1px solid #eee" value="${escapeHtml(currentDoctor?.name||'')}" />
//       <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
//         <button class="btn" id="saveSettings">Save</button>
//         <button class="btn small ghost" id="closeSettings">Close</button>
//       </div>
//     </div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#closeSettings').addEventListener('click', ()=> modal.remove());
//   $('#saveSettings').addEventListener('click', async ()=> {
//     const name = $('#docProfileName').value.trim();
//     if(!name) return alert('Name required');
//     try{
//       await db.collection('doctors').doc(currentDoctor.uid).set({ name }, { merge:true });
//       currentDoctor.name = name; setDoctorName(name);
//       showToast('Saved');
//       modal.remove();
//     } catch(e){ console.error(e); showToast('Save failed'); }
//   });
// }

// /* -------------------------
//    Helpers
//    ------------------------- */
// function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
// function showToast(text, ms=1800){ const t=create('div',{style:'position:fixed;right:20px;bottom:20px;z-index:9999;padding:12px;border-radius:8px;box-shadow:0 12px 30px rgba(0,0,0,0.12);background:#fff'}, `<strong>${escapeHtml(text)}</strong>`); document.body.appendChild(t); setTimeout(()=>t.remove(), ms); }

// /* -------------------------
//    Utility: set doctor name in UI
//    ------------------------- */
// function setDoctorName(name){
//   const el = document.querySelector('.welcome-text h2');
//   if(el) el.innerText = `Good day, ${name} 👩‍⚕️`;
//   // subtitle
//   const sub = $('#welcomeSubtitle'); if(sub) sub.innerText = `${currentDoctor.specialty ? currentDoctor.specialty + ' • ' : ''}${currentDoctor.email || ''}`;
// }

// /* -------------------------
//    Expose essentials
//    ------------------------- */
// window.openCreatePrescriptionModal = openCreatePrescriptionModal;
// window.openPatientModal = openPatientModal;
// window.openChatView = openChatView;






















/* doctor_dashboard.js
   Replacement for your existing doctor dashboard JS.
   - Uses Firebase compat (paste config below)
   - Mock mode fallback if no Firebase config provided
   - Adds topbar tools: Scan QR (gold), Settings (gold-outline)
   - Notifications rendering (dropdown)
   - Appointments, Patients, Doctors-on-duty loaders (mock & firebase)
   - Prescription modal (upload template, create prescription, generate QR)
   - Chat hooks (lightweight)
   - QR scanning hook (html5-qrcode optional)
*/

/* =========================
   CONFIG
   ========================= */
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  // Add other keys if you have them
};
const USE_FIREBASE = FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY';

/* -------------------------
   DOM helpers
   ------------------------- */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from((root||document).querySelectorAll(s));
const create = (tag, attrs={}, html='') => {
  const e = document.createElement(tag);
  for(const k in attrs) {
    if(k === 'class') e.className = attrs[k];
    else if(k === 'style') e.style.cssText = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  if(html) e.innerHTML = html;
  return e;
};

/* -------------------------
   Firebase handles
   ------------------------- */
let firebaseApp=null, auth=null, db=null, storage=null;
function initFirebase(){
  if(!USE_FIREBASE) { console.warn('Firebase not configured — mock mode'); return; }
  firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
  auth = firebase.auth();
  db = firebase.firestore();
  storage = firebase.storage();
}

/* -------------------------
   Boot
   ------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  initFirebase();
  initUI();
  if(USE_FIREBASE) {
    auth.onAuthStateChanged(user => {
      if(user) {
        window.currentDoctor = { uid: user.uid, name: user.displayName || user.email };
        startApp();
      } else {
        // in real app you'd show login; for now fallback to mock
        console.warn('No firebase user; falling back to mock');
        setupMockAndStart();
      }
    });
  } else {
    setupMockAndStart();
  }
});

/* -------------------------
   UI Init: sidebar indicator, dark toggle, inject topbar tools
   ------------------------- */
function initUI(){
  // sidebar indicator (keeps original behaviour)
  const sidebar = document.querySelector('.sidebar');
  if(sidebar){
    const nav = sidebar.querySelector('nav');
    const items = Array.from(nav.querySelectorAll('ul li'));
    const indicator = sidebar.querySelector('.sidebar-indicator');
    function placeIndicator(el){
      if(!el || !indicator) return;
      indicator.style.top = el.offsetTop + 'px';
      indicator.style.height = el.offsetHeight + 'px';
    }
    const initial = items.find(i=>i.classList.contains('active')) || items[0];
    setTimeout(()=>placeIndicator(initial), 40);
    items.forEach(it => {
      it.addEventListener('click', ()=> {
        items.forEach(x=>x.classList.remove('active')); it.classList.add('active');
        placeIndicator(it);
        // basic view switching can be implemented here if you have views with ids
      });
    });
    window.addEventListener('resize', ()=>placeIndicator(nav.querySelector('li.active')||items[0]));
    sidebar.addEventListener('mouseenter', ()=>sidebar.classList.add('expanded'));
    sidebar.addEventListener('mouseleave', ()=>sidebar.classList.remove('expanded'));
  }

  // dark toggle
  const darkToggle = $('#darkToggle');
  try {
    if(localStorage.getItem('doctor_dark') === 'true') document.body.classList.add('dark');
    darkToggle && darkToggle.addEventListener('click', ()=> {
      document.body.classList.toggle('dark');
      localStorage.setItem('doctor_dark', document.body.classList.contains('dark') ? 'true' : 'false');
    });
  } catch(e){}

  // notifications dropdown toggle
  const dropdown = document.querySelector('.dropdown');
  dropdown && dropdown.addEventListener('click', () => {
    const menu = dropdown.querySelector('.dropdown-menu');
    if(menu) menu.classList.toggle('show');
  });

  // inject topbar tools: Scan QR (gold) and Settings (gold-outline)
  injectTopbarTools();
}

/* -------------------------
   Inject topbar tools
   ------------------------- */
function injectTopbarTools(){
  const userMenu = document.getElementById('userMenu');
  if(!userMenu) return;
  if($('#doctorTools')) return; // already injected

  const tools = create('div',{id:'doctorTools', style:'display:flex;gap:8px;align-items:center;margin-right:10px'});
  const scanBtn = create('button',{id:'btnScanQR', class:'btn small'}, 'Scan QR');
  const settingsBtn = create('button',{id:'btnSettings', class:'btn small ghost'}, 'Settings');
  tools.appendChild(scanBtn);
  tools.appendChild(settingsBtn);
  userMenu.parentNode.insertBefore(tools, userMenu);

  // listeners
  scanBtn.addEventListener('click', openQRScannerModal);
  settingsBtn.addEventListener('click', openSettingsModal);
}

/* -------------------------
   Mock data & start
   ------------------------- */
function setupMockAndStart(){
  window.__mock = window.__mock || {};
  if(!window.__mock.patients) {
    window.__mock.patients = [
      { id:'p1', name:'John Doe', phone:'+919000000001', age:34, sex:'M', notes:'Hypertension', reports:[{id:'r1',title:'Blood Test',date:'2025-10-12',notes:'Hb low'}], prescriptions:[] },
      { id:'p2', name:'Jane Smith', phone:'+919000000002', age:29, sex:'F', notes:'Migraine', reports:[], prescriptions:[] }
    ];
    window.__mock.appts = [
      { id:'a1', doctorId:'doc-demo', patientId:'p1', patientName:'John Doe', date: new Date().toISOString().slice(0,10), time:'11:00', status:'pending' },
      { id:'a2', doctorId:'doc-demo', patientId:'p2', patientName:'Jane Smith', date: new Date(Date.now()+86400000).toISOString().slice(0,10), time:'15:00', status:'confirmed' }
    ];
    window.__mock.doctors = [
      { id:'doc-demo', name:'Dr. Johanna', specialty:'General', isOnDuty:true }
    ];
    window.__mock.notifications = [
      { id:'n1', doctorId:'doc-demo', type:'appointment', title:'New appointment request', body:'John Doe requested appointment at 11:00', meta:{apptId:'a1'}, timestamp: Date.now() - 60000 }
    ];
    window.__mock.prescriptions = [];
  }

  window.currentDoctor = { uid:'doc-demo', name:'Dr. Johanna' };
  setDoctorName(window.currentDoctor.name);
  startApp();
}

/* -------------------------
   Start app: load everything
   ------------------------- */
async function startApp(){
  attachQuickActions();
  await Promise.all([ loadStats(), loadAppointments(), loadDoctorsOnDuty(), loadRecentActivity(), loadPatients(), setupCharts() ]);
  if(USE_FIREBASE) setupRealtimeListeners();
  else { // mock periodic refresh
    setInterval(()=> {
      maybeAddMockNotification();
      loadAppointments();
      refreshChartsMock();
    }, 7000);
  }
}

/* -------------------------
   Quick actions (Add patient, New appointment)
   ------------------------- */
function attachQuickActions(){
  const addBtn = $('#btnAddPatient');
  if(addBtn) addBtn.addEventListener('click', async ()=> {
    const name = prompt('Patient full name'); if(!name) return;
    const phone = prompt('Phone (with country code)'); if(!phone) return;
    const obj = { name, phone, createdAt:new Date().toISOString(), doctorId: window.currentDoctor.uid };
    if(USE_FIREBASE) {
      await db.collection('patients').add(obj);
      showToast('Patient added');
    } else {
      const id = 'p'+Date.now(); window.__mock.patients.push({ id, ...obj, reports:[], prescriptions:[] });
      showToast('Patient added (mock)');
    }
    loadPatients();
  });

  const newAppt = $('#btnNewAppt');
  if(newAppt) newAppt.addEventListener('click', async ()=> {
    const patient = prompt('Patient name or id'); if(!patient) return;
    const date = prompt('Date (YYYY-MM-DD)', new Date().toISOString().slice(0,10)); if(!date) return;
    const time = prompt('Time (HH:MM)', '11:00'); if(!time) return;
    const ap = { doctorId: window.currentDoctor.uid, patientName: patient, date, time, status:'pending', createdAt:new Date().toISOString() };
    if(USE_FIREBASE) {
      await db.collection('appointments').add(ap);
      showToast('Appointment created');
    } else {
      window.__mock.appts.push({ id:'a'+Date.now(), ...ap});
      window.__mock.notifications = window.__mock.notifications || [];
      window.__mock.notifications.unshift({ id:'n'+Date.now(), doctorId: window.currentDoctor.uid, type:'appointment', title:'New appointment', body: `${patient} requested appointment`, meta:{ apptId: 'a'+Date.now() }, timestamp: Date.now() });
      showToast('Appointment (mock)');
    }
    loadAppointments();
  });
}

/* -------------------------
   Loaders: stats, appointments, doctors on duty, activity, patients
   ------------------------- */
async function loadStats(){
  const elOnline = document.querySelector('.stats .card.green h3');
  const elOffline = document.querySelector('.stats .card.red h3');
  const elToday = document.querySelector('.stats .card.blue h3');
  const elPres = document.querySelector('.stats .card.purple h3');
  if(USE_FIREBASE){
    // firebase counts (light)
    const pSnap = await db.collection('patients').get();
    const online = pSnap.size;
    elOnline && (elOnline.innerText = online);
    elOffline && (elOffline.innerText = Math.max(0, pSnap.size - 0));
    const today = new Date().toISOString().slice(0,10);
    const apSnap = await db.collection('appointments').where('doctorId','==',window.currentDoctor.uid).where('date','==',today).get();
    elToday && (elToday.innerText = apSnap.size);
    const presSnap = await db.collection('prescriptions').where('doctorId','==',window.currentDoctor.uid).get();
    elPres && (elPres.innerText = presSnap.size);
  } else {
    const p = window.__mock.patients.length;
    elOnline && (elOnline.innerText = p);
    elOffline && (elOffline.innerText = 0);
    const today = new Date().toISOString().slice(0,10);
    elToday && (elToday.innerText = (window.__mock.appts||[]).filter(a=>a.date===today).length);
    elPres && (elPres.innerText = (window.__mock.prescriptions||[]).length);
  }
}

async function loadAppointments(){
  const tbody = $('#upcomingApptBody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="muted">Loading…</td></tr>';
  let list = [];
  if(USE_FIREBASE){
    const snap = await db.collection('appointments').where('doctorId','==',window.currentDoctor.uid).orderBy('date').limit(12).get();
    list = snap.docs.map(d=>({ id:d.id, ...d.data() }));
  } else {
    list = (window.__mock.appts||[]).slice().sort((a,b)=> a.date.localeCompare(b.date));
  }
  if(!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="muted">No upcoming appointments</td></tr>'; return; }
  tbody.innerHTML = '';
  list.forEach(a=> {
    const tr = create('tr');
    tr.innerHTML = `<td>${escapeHtml(a.patientName||a.patient||'Unknown')}</td><td>${escapeHtml(a.date)}</td><td>${escapeHtml(a.time)}</td><td><button class="btn small view-appt" data-id="${a.id||''}" data-patient="${escapeHtml(a.patientName||'')}">Open</button></td>`;
    tbody.appendChild(tr);
  });
  $$('.view-appt').forEach(b=> b.addEventListener('click', (e)=> {
    const pid = b.dataset.patient;
    openPatientModal(pid);
  }));
}

async function loadDoctorsOnDuty(){
  const grid = $('#doctorsGrid');
  if(!grid) return;
  grid.innerHTML = '';
  if(USE_FIREBASE){
    const snap = await db.collection('doctors').where('isOnDuty','==',true).get();
    snap.docs.forEach(d=> {
      const data = d.data();
      grid.appendChild(renderDoctorMini({ name: data.name || 'Doctor', spec: data.specialty || '', photo: data.photoURL || '' }));
    });
  } else {
    (window.__mock.doctors||[]).forEach(d => grid.appendChild(renderDoctorMini({ name: d.name, spec: d.specialty, photo: '' })));
  }
}

function renderDoctorMini(d){
  const card = create('div',{class:'doctor-card hover-tilt'}, `<div style="width:100%;height:84px;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#1abc9c,#3498db);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${d.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>`);
  const h = create('h4',{}, d.name);
  const p = create('p',{}, d.spec);
  card.appendChild(h); card.appendChild(p);
  return card;
}

async function loadRecentActivity(){
  const ul = $('#activityList');
  if(!ul) return;
  ul.innerHTML = '';
  if(USE_FIREBASE){
    const snap = await db.collection('activityLogs').where('doctorId','==',window.currentDoctor.uid).orderBy('timestamp','desc').limit(6).get();
    snap.docs.forEach(d=> {
      const dd = d.data();
      ul.appendChild(create('li',{class:'muted'}, `${dd.action} · ${new Date(dd.timestamp).toLocaleString()}`));
    });
  } else {
    const demo = ['Prescription updated for John Doe','New appointment scheduled for Jane','Lab result: Blood Test uploaded'];
    demo.forEach(t=> ul.appendChild(create('li',{class:'muted'}, t)));
  }
}

async function loadPatients(){
  const wrap = $('#patientsList');
  if(!wrap) return;
  wrap.innerHTML = '';
  if(USE_FIREBASE){
    const snap = await db.collection('patients').where('doctorId','==',window.currentDoctor.uid).get();
    if(snap.empty) { wrap.innerHTML = '<div class="muted">No patients yet</div>'; return; }
    snap.docs.forEach(d=> {
      const data = d.data();
      const id = d.id;
      const card = create('div',{class:'card', style:'margin-bottom:8px'});
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${escapeHtml(data.name)}</strong><div class="muted">${escapeHtml(data.phone||'')}</div></div>
          <div style="display:flex;gap:8px">
            <button class="btn small view-patient" data-id="${id}" data-name="${escapeHtml(data.name)}">View</button>
            <a class="btn small ghost" href="https://wa.me/${encodeURIComponent((data.phone||'').replace(/[^+\\d]/g,''))}" target="_blank">WhatsApp</a>
          </div>
        </div>`;
      wrap.appendChild(card);
    });
    $$('.view-patient').forEach(b => b.addEventListener('click', ()=> openPatientModal(b.dataset.name)));
  } else {
    (window.__mock.patients||[]).forEach(p => {
      const card = create('div',{class:'card', style:'margin-bottom:8px'});
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
        <div><strong>${escapeHtml(p.name)}</strong><div class="muted">${escapeHtml(p.phone||'')}</div></div>
        <div style="display:flex;gap:8px">
          <button class="btn small" data-patient="${escapeHtml(p.name)}">View</button>
          <a class="btn small ghost" href="https://wa.me/${encodeURIComponent((p.phone||'').replace(/[^+\\d]/g,''))}" target="_blank">WhatsApp</a>
        </div>
      </div>`;
      wrap.appendChild(card);
    });
    // attach mock view buttons
    $$('.card .btn.small').forEach(b => {
      b.addEventListener('click', (e)=> {
        const name = b.getAttribute('data-patient') || b.parentNode.querySelector('strong')?.innerText;
        if(name) openPatientModal(name);
      });
    });
  }
}

/* -------------------------
   Notifications (render & handlers)
   ------------------------- */
function setupRealtimeListeners(){
  if(!USE_FIREBASE) { renderNotifications(window.__mock.notifications || []); return; }
  db.collection('notifications').where('doctorId','==',window.currentDoctor.uid).orderBy('timestamp','desc').limit(20)
    .onSnapshot(snap => {
      const items = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      renderNotifications(items);
    });
}

function renderNotifications(items){
  const listEl = document.querySelector('.dropdown .dropdown-menu');
  if(!listEl) return;
  listEl.innerHTML = '';
  if(!items || !items.length) { listEl.innerHTML = '<div class="muted">No notifications</div>'; return; }
  items.forEach(n=>{
    const row = create('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid rgba(0,0,0,0.04)'});
    const left = create('div',{}, `<strong>${escapeHtml(n.title||'Notification')}</strong><div class="muted" style="font-size:13px">${escapeHtml(n.body||'')}</div>`);
    const actions = create('div',{style:'display:flex;flex-direction:column;gap:6px'});
    if(n.type === 'appointment'){
      const a = create('button',{class:'btn small'}, 'Accept'); a.addEventListener('click', ()=> handleNotifAppointment(n.id,'accept',n));
      const r = create('button',{class:'btn small ghost'}, 'Decline'); r.addEventListener('click', ()=> handleNotifAppointment(n.id,'decline',n));
      actions.appendChild(a); actions.appendChild(r);
    } else if(n.type === 'pharmacy'){
      const a = create('button',{class:'btn small'}, 'Approve'); a.addEventListener('click', ()=> handlePharmacy(n.id,'approve',n));
      const r = create('button',{class:'btn small ghost'}, 'Reject'); r.addEventListener('click', ()=> handlePharmacy(n.id,'reject',n));
      actions.appendChild(a); actions.appendChild(r);
    } else {
      const d = create('button',{class:'btn small ghost'}, 'Dismiss'); d.addEventListener('click', ()=> dismissNotif(n.id));
      actions.appendChild(d);
    }
    row.appendChild(left); row.appendChild(actions);
    listEl.appendChild(row);
  });
}

async function handleNotifAppointment(id, action, data){
  if(!USE_FIREBASE){ showToast('Mock ' + action); return; }
  const nRef = db.collection('notifications').doc(id);
  const nSnap = await nRef.get();
  if(!nSnap.exists) return showToast('Already handled');
  const payload = nSnap.data();
  if(payload.meta && payload.meta.apptId){
    const apRef = db.collection('appointments').doc(payload.meta.apptId);
    if(action === 'accept') await apRef.set({ status:'confirmed' }, { merge:true});
    else await apRef.set({ status:'declined' }, { merge:true});
    await nRef.delete();
    showToast('Appointment ' + (action==='accept' ? 'confirmed' : 'declined'));
    loadAppointments();
  } else {
    await nRef.delete();
    showToast('Notification handled');
  }
}
async function handlePharmacy(id, action, data){
  if(!USE_FIREBASE){ showToast('Mock pharmacy ' + action); return; }
  await db.collection('notifications').doc(id).delete();
  showToast('Pharmacy request processed');
}
async function dismissNotif(id){
  if(!USE_FIREBASE){ showToast('Dismissed (mock)'); return; }
  await db.collection('notifications').doc(id).delete();
  showToast('Dismissed');
}

/* -------------------------
   Charts (Chart.js)
   ------------------------- */
let patientsChart=null, appointmentsChart=null;
async function setupCharts(){
  const pc = document.getElementById('patientsChart')?.getContext('2d');
  const ac = document.getElementById('appointmentsChart')?.getContext('2d');
  if(pc) {
    patientsChart = new Chart(pc, { type:'line', data:{ labels:[], datasets:[{ label:'Patients', data:[], borderColor:'#28a745', backgroundColor:'rgba(40,167,69,0.12)', fill:true }] }, options:{ responsive:true, plugins:{ legend:{ display:false } } } });
  }
  if(ac) {
    appointmentsChart = new Chart(ac, { type:'pie', data:{ labels:['Confirmed','Pending','Cancelled'], datasets:[{ data:[0,0,0], backgroundColor:['#28a745','#f1c40f','#dc3545'] }] }, options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } } });
  }
  refreshChartsData();
}
async function refreshChartsData(){
  if(!patientsChart || !appointmentsChart) return;
  if(USE_FIREBASE){
    const now = new Date();
    const labels=[]; const values=[];
    for(let i=6;i>=0;i--){
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
      const key = d.toISOString().slice(0,10);
      labels.push(key);
      const snap = await db.collection('appointments').where('doctorId','==',window.currentDoctor.uid).where('date','==',key).get();
      values.push(snap.size);
    }
    patientsChart.data.labels = labels; patientsChart.data.datasets[0].data = values; patientsChart.update();
    const allSnap = await db.collection('appointments').where('doctorId','==',window.currentDoctor.uid).get();
    const confirmed = allSnap.docs.filter(d=>d.data().status==='confirmed').length;
    const pending = allSnap.docs.filter(d=>d.data().status==='pending').length;
    const cancelled = allSnap.docs.filter(d=>d.data().status==='cancelled').length;
    appointmentsChart.data.datasets[0].data = [confirmed,pending,cancelled]; appointmentsChart.update();
  } else {
    patientsChart.data.labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; patientsChart.data.datasets[0].data = [120,135,150,160,145,170,210]; patientsChart.update();
    appointmentsChart.data.datasets[0].data = [18,6,4]; appointmentsChart.update();
  }
}

/* -------------------------
   Prescription creation + QR
   ------------------------- */
function openCreatePrescriptionModal(patientName='Patient'){
  // remove existing
  const existing = document.getElementById('prescriptionModal');
  if(existing) existing.remove();
  const modal = create('div',{id:'prescriptionModal', class:'modal'});
  const card = create('div',{class:'card'}, '');
  card.innerHTML = `<h3>New Prescription — ${escapeHtml(patientName)}</h3>
    <div style="display:flex;gap:12px;flex-direction:column;margin-top:8px">
      <label class="muted">Upload Doctor Template (optional)</label>
      <input id="presTemplateInput" type="file" accept="image/*,.pdf"/>
      <label class="muted">Medicines (one per line: Name | Dosage | Duration | Notes)</label>
      <textarea id="presMeds" style="width:100%;height:120px;padding:8px;border-radius:8px;border:1px solid #eee"></textarea>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
        <button id="savePres" class="btn">Save & Generate QR</button>
        <button id="cancelPres" class="btn small ghost">Cancel</button>
      </div>
    </div>`;
  modal.appendChild(card); document.body.appendChild(modal);
  $('#cancelPres').addEventListener('click', ()=> modal.remove());
  $('#savePres').addEventListener('click', async ()=> {
    const medsText = $('#presMeds').value.trim();
    if(!medsText){ alert('Add at least one medicine'); return; }
    const file = $('#presTemplateInput').files && $('#presTemplateInput').files[0];
    const presObj = { doctorId: window.currentDoctor.uid, patientName, medicines: medsText.split('\n').map(x=>x.trim()).filter(Boolean), createdAt: new Date().toISOString() };
    if(USE_FIREBASE){
      let url='';
      if(file){
        const path = `prescription_templates/${window.currentDoctor.uid}/${Date.now()}_${file.name}`;
        const ref = storage.ref().child(path);
        await ref.put(file);
        url = await ref.getDownloadURL();
      }
      const docRef = await db.collection('prescriptions').add({...presObj, templateUrl: url});
      const presUrl = `${location.origin}/view_prescription.html?id=${docRef.id}`;
      const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(presUrl)}`;
      await db.collection('prescriptions').doc(docRef.id).set({ qrUrl: qr }, { merge:true });
      modal.remove();
      showPrescriptionResult(docRef.id, presUrl, qr);
    } else {
      const id = 'mock-pres-'+Date.now();
      window.__mock.prescriptions.push({ id, ...presObj, templateUrl: '' });
      modal.remove();
      showPrescriptionResult(id, '#', `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent('mock:'+id)}`);
    }
  });
}

function showPrescriptionResult(id, presUrl, qrSrc){
  const modal = create('div',{class:'modal'});
  const card = create('div',{class:'card'}, '');
  card.innerHTML = `<h3>Prescription Created</h3><p class="muted">ID: ${escapeHtml(id)}</p><div style="margin-top:8px"><img src="${escapeHtml(qrSrc)}" alt="QR" style="width:220px;height:220px;border-radius:8px"></div><div style="display:flex;justify-content:center;gap:8px;margin-top:12px"><a class="btn" href="${escapeHtml(presUrl)}" target="_blank">Open</a><button class="btn small ghost" id="closePres">Close</button></div>`;
  modal.appendChild(card); document.body.appendChild(modal);
  $('#closePres').addEventListener('click', ()=> modal.remove());
}

/* -------------------------
   Patient modal (view reports & pres)
   ------------------------- */
function openPatientModal(patientName){
  // fetch details from firebase or mock
  if(USE_FIREBASE){
    db.collection('patients').where('name','==',patientName).limit(1).get().then(snap => {
      if(snap.empty) renderPatientModal({ name:patientName, phone:'', age:'', sex:'', reports:[], prescriptions:[] });
      else {
        const d = snap.docs[0]; const data = d.data();
        Promise.all([
          db.collection('prescriptions').where('patientName','==',patientName).get(),
          db.collection('reports').where('patientName','==',patientName).get()
        ]).then(([presSnap, repSnap]) => {
          const prescriptions = presSnap.docs.map(x=> ({ id:x.id, ...x.data() }));
          const reports = repSnap.docs.map(x=> ({ id:x.id, ...x.data() }));
          renderPatientModal({ name: data.name, phone: data.phone, age: data.age, sex: data.sex, reports, prescriptions });
        });
      }
    });
  } else {
    const p = (window.__mock.patients||[]).find(x=>x.name===patientName) || { name:patientName, phone:'', age:'', sex:'', reports:[], prescriptions:[] };
    renderPatientModal(p);
  }
}
function renderPatientModal(data){
  const modal = create('div',{class:'modal'});
  const card = create('div',{class:'card'}, '');
  card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
    <div>
      <h3>${escapeHtml(data.name)}</h3>
      <div class="muted">${escapeHtml(data.age||'')} · ${escapeHtml(data.sex||'')}</div>
      <div class="muted" style="margin-top:6px">${escapeHtml(data.phone||'')}</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <a class="btn small" href="https://wa.me/${encodeURIComponent((data.phone||'').replace(/[^+\\d]/g,''))}" target="_blank">WhatsApp</a>
      <button class="btn small" id="createPresBtn">+ Prescription</button>
    </div>
  </div>
  <hr style="margin:12px 0">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div>
      <h4>Reports</h4>
      <div id="patientReports">${(data.reports||[]).length ? data.reports.map(r=>`<div class="card" style="padding:8px;margin-bottom:8px"><strong>${escapeHtml(r.title)}</strong><div class="muted">${escapeHtml(r.date)}</div><div class="muted">${escapeHtml(r.notes||'')}</div></div>`).join('') : '<div class="muted">No reports</div>'}</div>
    </div>
    <div>
      <h4>Prescriptions</h4>
      <div id="patientPres">${(data.prescriptions||[]).length ? data.prescriptions.map(p=>`<div class="card" style="padding:8px;margin-bottom:8px"><strong>${escapeHtml(p.createdAt||'')}</strong><div class="muted">${escapeHtml((p.medicines||[]).join(', '))}</div></div>`).join('') : '<div class="muted">No prescriptions</div>'}</div>
    </div>
  </div>`;
  modal.appendChild(card); document.body.appendChild(modal);
  $('#createPresBtn').addEventListener('click', ()=> openCreatePrescriptionModal(data.name));
  modal.addEventListener('click', (e)=> { if(e.target===modal) modal.remove(); });
}

/* -------------------------
   Chat hooks (lightweight)
   ------------------------- */
function openChatView(){
  let chatC = $('#chatContainer');
  if(!chatC){
    chatC = create('div',{id:'chatContainer', style:'position:fixed;bottom:12px;right:12px;width:360px;height:520px;background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.12);z-index:9999;overflow:hidden;display:flex;flex-direction:column'});
    document.body.appendChild(chatC);
  }
  chatC.innerHTML = `<div style="padding:12px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;justify-content:space-between;align-items:center"><strong>Chat</strong><button id="closeChat" class="btn small ghost">Close</button></div><div id="chatList" style="padding:12px;flex:1;overflow:auto"></div><div style="padding:10px;border-top:1px solid rgba(0,0,0,0.06);display:flex;gap:8px"><input id="chatMessage" placeholder="Message..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #eee"><button id="sendMsg" class="btn small">Send</button></div>`;
  $('#closeChat').addEventListener('click', ()=> chatC.remove());
  $('#sendMsg').addEventListener('click', sendChatMessage);
  loadChatThreads();
}
async function loadChatThreads(){
  const list = $('#chatList'); list.innerHTML = '';
  if(USE_FIREBASE){
    const snap = await db.collection('chats').where('doctorId','==',window.currentDoctor.uid).orderBy('lastAt','desc').limit(12).get();
    snap.docs.forEach(d=> {
      const data = d.data();
      const row = create('div',{class:'card', style:'margin-bottom:8px'}, `<strong>${escapeHtml(data.patientName||'Patient')}</strong><div class="muted">${escapeHtml(data.lastMessage||'')}</div>`);
      row.addEventListener('click', ()=> openChatRoom(d.id, data.patientName));
      list.appendChild(row);
    });
  } else {
    (window.__mock.patients||[]).slice(0,6).forEach(p=> {
      const row = create('div',{class:'card', style:'margin-bottom:8px'}, `<strong>${escapeHtml(p.name)}</strong><div class="muted">Tap to chat (mock)</div>`);
      row.addEventListener('click', ()=> openChatRoom('mock-'+p.id, p.name));
      list.appendChild(row);
    });
  }
}
function openChatRoom(roomId, patientName){
  const chatC = $('#chatContainer'); if(!chatC) return;
  const chatList = $('#chatList');
  chatList.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><strong>${escapeHtml(patientName)}</strong><button id="backToThreads" class="btn small ghost">Back</button></div><div id="messages" style="height:380px;overflow:auto"></div>`;
  $('#backToThreads').addEventListener('click', loadChatThreads);
  const messagesEl = $('#messages'); messagesEl.innerHTML = '<div class="muted">Loading messages…</div>';
  if(USE_FIREBASE){
    db.collection('chats').doc(roomId).collection('messages').orderBy('ts','asc').get().then(snap => {
      messagesEl.innerHTML = '';
      snap.docs.forEach(m => {
        const mm = m.data();
        messagesEl.appendChild(create('div',{}, `<div style="font-weight:600">${escapeHtml(mm.fromName||'')}</div><div class="muted">${escapeHtml(mm.text||'')}</div>`));
      });
    });
    $('#sendMsg').onclick = async () => {
      const text = $('#chatMessage').value.trim(); if(!text) return;
      await db.collection('chats').doc(roomId).collection('messages').add({ fromId: window.currentDoctor.uid, fromName: window.currentDoctor.name, text, ts: Date.now() });
      $('#chatMessage').value = '';
      db.collection('chats').doc(roomId).set({ lastMessage: text, lastAt: Date.now() }, { merge:true });
      loadChatRoomMessages(roomId, messagesEl);
    };
  } else {
    messagesEl.innerHTML = `<div class="muted">Mock chat with ${escapeHtml(patientName)}</div>`;
    $('#sendMsg').onclick = ()=> { const t = $('#chatMessage').value.trim(); if(!t) return; messagesEl.innerHTML += `<div style="margin-top:8px"><strong>You</strong><div class="muted">${escapeHtml(t)}</div></div>`; $('#chatMessage').value=''; messagesEl.scrollTop = messagesEl.scrollHeight; };
  }
}
function loadChatRoomMessages(roomId, messagesEl){
  if(!USE_FIREBASE) return;
  db.collection('chats').doc(roomId).collection('messages').orderBy('ts','asc').get().then(snap => {
    messagesEl.innerHTML = '';
    snap.docs.forEach(m => { const mm = m.data(); messagesEl.appendChild(create('div',{}, `<div style="font-weight:600">${escapeHtml(mm.fromName||'')}</div><div class="muted">${escapeHtml(mm.text||'')}</div>`)); });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}
function sendChatMessage(){ /* used by smaller flows; implemented inside openChatRoom */ }

/* -------------------------
   QR Scanner modal (html5-qrcode optional)
   ------------------------- */
function openQRScannerModal(){
  const modal = create('div',{class:'modal'}); const card = create('div',{class:'card'});
  card.innerHTML = `<h3>Scan QR</h3><p class="muted">Scan a prescription / patient QR to access data.</p><div id="qr-reader" style="width:100%;height:360px;background:#f6f6f6;border-radius:8px;display:flex;align-items:center;justify-content:center">Camera not available</div><div style="text-align:right;margin-top:10px"><button class="btn small" id="closeQR">Close</button></div>`;
  modal.appendChild(card); document.body.appendChild(modal);
  $('#closeQR').addEventListener('click', ()=> modal.remove());

  if(window.Html5Qrcode){
    const qreader = new Html5Qrcode("qr-reader");
    Html5Qrcode.getCameras().then(cams => {
      if(cams && cams.length){
        qreader.start(cams[0].id, { fps:10, qrbox:250 }, (decoded)=> { handleScannedQR(decoded); qreader.stop().then(()=>qreader.clear()).catch(()=>{}); modal.remove(); }, (err)=>{}).catch(e=>{ document.getElementById('qr-reader').innerText = 'Camera error'; });
        modal.querySelector('#closeQR').addEventListener('click', ()=> qreader.stop().then(()=>qreader.clear()).catch(()=>{}));
      } else document.getElementById('qr-reader').innerText = 'No camera found';
    }).catch(e=> document.getElementById('qr-reader').innerText = 'Camera permission denied or not supported');
  } else {
    // fallback: paste
    const reader = document.getElementById('qr-reader');
    reader.innerHTML = `<div style="padding:12px"><input id="qrPaste" placeholder="Paste QR URL or code" style="width:100%;padding:8px;border-radius:6px;border:1px solid #eee"><div style="text-align:right;margin-top:8px"><button id="qrPasteBtn" class="btn small">Open</button></div></div>`;
    $('#qrPasteBtn').addEventListener('click', ()=> { const val = $('#qrPaste').value.trim(); if(!val) return; modal.remove(); handleScannedQR(val); });
  }
}

async function handleScannedQR(payload){
  try {
    if(payload.includes('/view_prescription.html?id=')){
      const id = new URL(payload).searchParams.get('id');
      if(id && USE_FIREBASE){
        const snap = await db.collection('prescriptions').doc(id).get();
        if(snap.exists) { previewPrescription(snap.data(), id); return; }
      }
    } else if(payload.startsWith('patient:')) {
      const pid = payload.split(':')[1]; if(pid) openPatientModal(pid); return;
    } else if(payload.startsWith('pres:')) { const pid = payload.split(':')[1]; alert('Open prescription ' + pid); return; }
    if(payload.startsWith('http')) window.open(payload,'_blank'); else showToast('Scanned: ' + payload);
  } catch(e){ console.error(e); showToast('Invalid QR payload'); }
}

function previewPrescription(p, id){
  const modal = create('div',{class:'modal'}); const card = create('div',{class:'card'});
  card.innerHTML = `<h3>Prescription Preview</h3><div class="muted">ID: ${escapeHtml(id)}</div><div style="margin-top:12px"><strong>Patient:</strong> ${escapeHtml(p.patientName||'')}</div><div style="margin-top:8px"><strong>Medicines:</strong><div class="muted">${escapeHtml((p.medicines||[]).join(', '))}</div></div><div style="margin-top:12px;text-align:right"><a class="btn" href="${escapeHtml(p.qrUrl||('#'))}" target="_blank">Open QR</a><button class="btn small ghost" id="closePreview">Close</button></div>`;
  modal.appendChild(card); document.body.appendChild(modal);
  $('#closePreview').addEventListener('click', ()=> modal.remove());
}

/* -------------------------
   Settings modal (small)
   ------------------------- */
function openSettingsModal(){
  const modal = create('div',{class:'modal'}); const card = create('div',{class:'card'});
  card.innerHTML = `<h3>Settings</h3>
    <div style="margin-top:8px">
      <label class="muted">Profile name</label>
      <input id="docProfileName" style="width:100%;padding:8px;border-radius:8px;border:1px solid #eee" value="${escapeHtml(window.currentDoctor?.name||'')}" />
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
        <button class="btn" id="saveSettings">Save</button>
        <button class="btn small ghost" id="closeSettings">Close</button>
      </div>
    </div>`;
  modal.appendChild(card); document.body.appendChild(modal);
  $('#closeSettings').addEventListener('click', ()=> modal.remove());
  $('#saveSettings').addEventListener('click', async ()=> {
    const name = $('#docProfileName').value.trim();
    if(!name) return alert('Name required');
    if(USE_FIREBASE){
      await db.collection('doctors').doc(window.currentDoctor.uid).set({ name }, { merge:true });
      showToast('Saved');
    } else {
      window.currentDoctor.name = name;
      setDoctorName(name);
      showToast('Saved (mock)');
    }
    modal.remove();
  });
}

/* -------------------------
   Helpers & utils
   ------------------------- */
function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
function showToast(text, ms=1800){
  const t = create('div',{style:'position:fixed;right:20px;bottom:20px;z-index:9999;padding:12px;border-radius:8px;box-shadow:0 12px 30px rgba(0,0,0,0.12);background:#fff'}, `<strong>${escapeHtml(text)}</strong>`);
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), ms);
}

/* -------------------------
   Misc small mock utilities
   ------------------------- */
function maybeAddMockNotification(){
  if(Math.random() > 0.9){
    const p = window.__mock.patients[Math.floor(Math.random()*window.__mock.patients.length)];
    const id = 'n'+Date.now();
    window.__mock.appts.push({ id:'a'+Date.now(), doctorId:'doc-demo', patientId:p.id, patientName:p.name, date:new Date().toISOString().slice(0,10), time:'16:00', status:'pending' });
    window.__mock.notifications.unshift({ id, doctorId: 'doc-demo', type:'appointment', title:'New appointment', body:`${p.name} requested appointment`, meta:{ apptId: 'a'+Date.now() }, timestamp: Date.now() });
    renderNotifications(window.__mock.notifications);
  }
}
function refreshChartsMock(){
  if(!patientsChart || !appointmentsChart) return;
  patientsChart.data.datasets[0].data = patientsChart.data.datasets[0].data.map(v => Math.max(10, Math.floor(v + (Math.random()*20-10))));
  patientsChart.update();
}

/* -------------------------
   Realtime listeners (if firebase used)
   ------------------------- */
function setupRealtimeListeners(){
  if(!USE_FIREBASE) return;
  db.collection('notifications').where('doctorId','==',window.currentDoctor.uid).orderBy('timestamp','desc').limit(20)
    .onSnapshot(snap => renderNotifications(snap.docs.map(d=>({ id:d.id, ...d.data() }))));

  db.collection('appointments').where('doctorId','==',window.currentDoctor.uid).onSnapshot(()=> loadAppointments());
}

/* -------------------------
   Small helper, show doctor name
   ------------------------- */
function setDoctorName(name){
  const el = document.querySelector('.welcome-text h2');
  if(el) el.innerText = `Good day, ${name} 👩‍⚕️`;
}

/* -------------------------
   Small helper: maybe show patient modal externally
   ------------------------- */
window.openCreatePrescriptionModal = openCreatePrescriptionModal;
window.openPatientModal = openPatientModal;
window.openChatView = openChatView;

/* =========================
   End of JS file
   ========================= */

















// /* doctor_dashboard.js
//    Option A — Firebase-powered Doctor Dashboard
//    - Real Firebase mode (auth + firestore + storage) expected
//    - Realtime listeners for appointments & notifications
//    - Charts (Chart.js) powered by Firestore data
// */

// /* -------------------------
//    Firebase config — REPLACE if you want
//    ------------------------- */
// const FIREBASE_CONFIG = {
//   apiKey: "AIzaSyBN7f6nmjr4xg3mW4e0X5E_loNVlXvmpWs",
//   authDomain: "meditrack-1a325.firebaseapp.com",
//   projectId: "meditrack-1a325",
//   storageBucket: "meditrack-1a325.firebasestorage.app",
//   messagingSenderId: "203548219971",
//   appId: "1:203548219971:web:aad75f729aa5d4f1eb92f6"
// };
// firebase.initializeApp(FIREBASE_CONFIG);
// const auth = firebase.auth();
// const db = firebase.firestore();
// const storage = firebase.storage();

// /* -------------------------
//    DOM helpers
//    ------------------------- */
// const $ = (s, r=document) => r.querySelector(s);
// const $$ = (s, r=document) => Array.from((r||document).querySelectorAll(s));
// const create = (t, a={}, html='') => { const e=document.createElement(t); for(const k in a){ if(k==='class') e.className=a[k]; else e.setAttribute(k,a[k]); } if(html)e.innerHTML=html; return e; };

// /* -------------------------
//    App state
//    ------------------------- */
// let currentDoctor = null;
// let patientsChart=null, appointmentsChart=null;

// /* -------------------------
//    Boot: require auth
//    --- MODIFIED FOR DIRECT ACCESS --- */
// document.addEventListener('DOMContentLoaded', () => {
//   initUI();
//   
//   // **START OF MODIFICATION**
//   // Bypass auth check and use a dummy doctor profile for testing
//   currentDoctor = { 
//     uid: 'testDoctorId123', 
//     email: 'test.doctor@meditrack.com', 
//     name: 'Dr. Test Bypass',
//     specialization: 'General Practice',
//     phone: 'N/A',
//     profilePic: ''
//   };
//   
//   // Directly call startApp without waiting for Firebase auth state
//   // We also call setDoctorName immediately to populate the welcome section
//   setDoctorName(currentDoctor.name);
//   startApp();
//   
//   // **END OF MODIFICATION**
//   
//   /* Original code block for reference (commented out):
//   auth.onAuthStateChanged(user => {
//     if(!user){
//       // not logged in -> redirect to login (relative path)
//       window.location.href = "../Doctors Login Page/doctor_LoginPage.html";
//       return;
//     }
//     currentDoctor = { uid: user.uid, email: user.email, name: user.displayName || user.email };
//     // load profile & start app
//     loadDoctorProfile().then(startApp);
//   });
//   */
// });

// /* -------------------------
//    UI init: sidebar, toggles, inject tools
//    ------------------------- */
// function initUI(){
//   // sidebar indicator
//   const sidebar = document.querySelector('.sidebar');
//   if(sidebar){
//     const nav = sidebar.querySelector('nav');
//     const items = Array.from(nav.querySelectorAll('ul li[data-view]'));
//     const indicator = sidebar.querySelector('.sidebar-indicator');
//     function placeIndicator(el){
//       if(!el || !indicator) return;
//       indicator.style.top = el.offsetTop + 'px';
//       indicator.style.height = el.offsetHeight + 'px';
//     }
//     const initial = items.find(i=>i.classList.contains('active')) || items[0];
//     setTimeout(()=>placeIndicator(initial), 40);
//     items.forEach(it => {
//       it.addEventListener('click', ()=> {
//         items.forEach(x=>x.classList.remove('active')); it.classList.add('active');
//         placeIndicator(it);
//         // basic view switching by data-view
//         const view = it.dataset.view;
//         document.querySelectorAll('main[id^="view-"], main[id^="view"]').forEach(v=> v.classList.add('hidden'));
//         const target = document.getElementById('view-' + view) || document.getElementById('view-' + view) || document.getElementById(view);
//         if(target) target.classList.remove('hidden'); // show if exists
//       });
//     });
//     sidebar.addEventListener('mouseenter', ()=> sidebar.classList.add('expanded'));
//     sidebar.addEventListener('mouseleave', ()=> sidebar.classList.remove('expanded'));
//   }

//   // dark toggle
//   const darkToggle = $('#darkToggle');
//   try {
//     if(localStorage.getItem('doctor_dark') === 'true') document.body.classList.add('dark');
//     darkToggle && darkToggle.addEventListener('click', ()=> {
//       document.body.classList.toggle('dark');
//       localStorage.setItem('doctor_dark', document.body.classList.contains('dark') ? 'true' : 'false');
//     });
//   } catch(e){}

//   // notifications dropdown
//   const dropdown = document.querySelector('.dropdown');
//   if(dropdown) dropdown.addEventListener('click', () => {
//     const menu = dropdown.querySelector('.dropdown-menu');
//     if(menu) menu.classList.toggle('show');
//   });

//   // inject topbar tools (Scan QR, Settings)
//   injectTopbarTools();

//   // logout
//   const logoutBtn = document.getElementById('logoutBtn');
//   // **LOGOUT MODIFICATION** (Just show a message since we bypassed login)
//   if(logoutBtn) logoutBtn.addEventListener('click', async ()=> {
//     alert('You are in bypass mode. Logout is disabled.');
//     // Original code: try{ await auth.signOut(); window.location.href="../Doctors Login Page/doctor_LoginPage.html"; } catch(e){ console.error(e); alert('Logout failed'); }
//   });
// }

// /* -------------------------
//    Inject Scan & Settings
//    ------------------------- */
// function injectTopbarTools(){
//   const userMenu = document.getElementById('userMenu');
//   if(!userMenu) return;
//   if($('#doctorTools')) return;
//   const tools = create('div',{id:'doctorTools', style:'display:flex;gap:8px;align-items:center;margin-right:6px'});
//   const scanBtn = create('button',{id:'btnScanQR', class:'btn-gold-small'}, 'Scan QR');
//   const settingsBtn = create('button',{id:'btnSettings', class:'btn-outline-gold'}, 'Settings');
//   tools.appendChild(scanBtn);
//   tools.appendChild(settingsBtn);
//   userMenu.parentNode.insertBefore(tools, userMenu);

//   scanBtn.addEventListener('click', openQRScannerModal);
//   settingsBtn.addEventListener('click', openSettingsModal);
// }

// /* -------------------------
//    Load doctor profile from Firestore
//    --- MODIFIED: Skips actual loading, uses mock data ---
//    ------------------------- */
// async function loadDoctorProfile(){
//   // Since we are in bypass mode, we assume the dummy profile is sufficient
//   setDoctorName(currentDoctor.name);
//   // Original Firebase logic is bypassed.
//   return;
//   /* Original code block for reference (commented out):
//   try {
//     const docRef = db.collection('doctors').doc(currentDoctor.uid);
//     const docSnap = await docRef.get();
//     if(docSnap.exists){
//       const data = docSnap.data();
//       currentDoctor.name = data.name || currentDoctor.email;
//       currentDoctor.specialty = data.specialization || data.specialty || '';
//       currentDoctor.phone = data.phone || '';
//       currentDoctor.profilePic = data.profilePic || '';
//       setDoctorName(currentDoctor.name);
//     } else {
//       // if not exists, create minimal profile
//       await docRef.set({ name: currentDoctor.name, email: currentDoctor.email, specialization: '', createdAt: new Date() });
//       setDoctorName(currentDoctor.name);
//     }
//   } catch(e){ console.error('loadDoctorProfile', e); }
//   */
// }

// /* -------------------------
//    Start app: load data and attach listeners
//    ------------------------- */
// async function startApp(){
//   attachQuickActions();
//   // loadDoctorProfile is essentially skipped/mocked for bypass mode
//   // loadStats, loadAppointments, etc. will now try to use the 'testDoctorId123' UID
//   await Promise.all([ loadStats(), loadAppointments(), loadDoctorsOnDuty(), loadRecentActivity(), loadPatients(), setupCharts() ]);
//   setupRealtimeListeners();
// }

// /* -------------------------
//    Quick actions
//    ------------------------- */
// function attachQuickActions(){
//   const addBtn = $('#btnAddPatient');
//   if(addBtn) addBtn.addEventListener('click', async ()=> {
//     const name = prompt('Patient full name'); if(!name) return;
//     const phone = prompt('Phone (with country code)') || '';
//     const obj = { name, phone, createdAt:new Date().toISOString(), doctorId: currentDoctor.uid };
//     try{
//       await db.collection('patients').add(obj);
//       showToast('Patient added');
//       loadPatients();
//     } catch(e){ console.error(e); showToast('Add patient failed'); }
//   });

//   const newAppt = $('#btnNewAppt');
//   if(newAppt) newAppt.addEventListener('click', async ()=> {
//     const patient = prompt('Patient name or id'); if(!patient) return;
//     const date = prompt('Date (YYYY-MM-DD)', new Date().toISOString().slice(0,10)); if(!date) return;
//     const time = prompt('Time (HH:MM)', '11:00'); if(!time) return;
//     const ap = { doctorId: currentDoctor.uid, patientName: patient, date, time, status:'pending', createdAt:new Date().toISOString() };
//     try{
//       await db.collection('appointments').add(ap);
//       showToast('Appointment created');
//       loadAppointments();
//     } catch(e){ console.error(e); showToast('Appointment failed'); }
//   });
// }

// /* -------------------------
//    Loaders
//    ------------------------- */
// async function loadStats(){
//   const elOnline = document.getElementById('stat-online');
//   const elOffline = document.getElementById('stat-offline');
//   const elToday = document.getElementById('stat-today-appt');
//   const elPres = document.getElementById('stat-prescribed');

//   try{
//     const pSnap = await db.collection('patients').where('doctorId','==',currentDoctor.uid).get();
//     elOnline && (elOnline.innerText = pSnap.size);
//     elOffline && (elOffline.innerText = 0); // can be extended

//     const today = new Date().toISOString().slice(0,10);
//     const apSnap = await db.collection('appointments').where('doctorId','==',currentDoctor.uid).where('date','==',today).get();
//     elToday && (elToday.innerText = apSnap.size);

//     const presSnap = await db.collection('prescriptions').where('doctorId','==',currentDoctor.uid).get();
//     elPres && (elPres.innerText = presSnap.size);
//   } catch(e){ console.error('loadStats', e); }
// }

// async function loadAppointments(){
//   const tbody = $('#upcomingApptBody');
//   if(!tbody) return;
//   tbody.innerHTML = '<tr><td colspan="4" class="muted">Loading…</td></tr>';
//   try{
//     const snap = await db.collection('appointments').where('doctorId','==',currentDoctor.uid).orderBy('date').limit(12).get();
//     const list = snap.docs.map(d=>({ id:d.id, ...d.data() }));
//     if(!list.length){ tbody.innerHTML = '<tr><td colspan="4" class="muted">No upcoming appointments</td></tr>'; return; }
//     tbody.innerHTML = '';
//     for(const a of list){
//       const tr = create('tr');
//       tr.innerHTML = `<td>${escapeHtml(a.patientName||a.patient||'Unknown')}</td><td>${escapeHtml(a.date)}</td><td>${escapeHtml(a.time)}</td><td><button class="btn small view-appt" data-id="${a.id}" data-patient="${escapeHtml(a.patientName||'')}">Open</button></td>`;
//       tbody.appendChild(tr);
//     }
//     $$('.view-appt').forEach(b=> b.addEventListener('click', ()=> openPatientModal(b.dataset.patient)));
//   } catch(e){ console.error(e); tbody.innerHTML = '<tr><td colspan="4" class="muted">Error loading</td></tr>'; }
// }

// async function loadDoctorsOnDuty(){
//   const grid = $('#doctorsGrid'); if(!grid) return;
//   grid.innerHTML = '';
//   try{
//     const snap = await db.collection('doctors').where('isOnDuty','==',true).get();
//     if(snap.empty){ grid.innerHTML = '<div class="muted">No doctors on duty</div>'; return; }
//     snap.docs.forEach(d=> {
//       const data = d.data();
//       grid.appendChild(renderDoctorMini({ name: data.name || 'Doctor', spec: data.specialization || '', photo: data.profilePic || '' }));
//     });
//   } catch(e){ console.error(e); }
// }

// function renderDoctorMini(d){
//   const initial = d.name.split(' ').map(n=>n[0]).slice(0,2).join('');
//   const card = create('div',{class:'doctor-card hover-tilt'}, `<div style="width:100%;height:78px;border-radius:8px;overflow:hidden;background:linear-gradient(135deg,#1abc9c,#3498db);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${initial}</div>`);
//   const h = create('h4',{}, d.name);
//   const p = create('p',{}, d.spec);
//   card.appendChild(h); card.appendChild(p);
//   return card;
// }

// async function loadRecentActivity(){
//   const ul = $('#activityList'); if(!ul) return;
//   ul.innerHTML = '';
//   try{
//     const snap = await db.collection('activityLogs').where('doctorId','==',currentDoctor.uid).orderBy('timestamp','desc').limit(6).get();
//     if(snap.empty){ ul.innerHTML = '<li class="muted">No recent activity</li>'; return; }
//     snap.docs.forEach(d => {
//       const dd = d.data();
//       ul.appendChild(create('li',{class:'muted'}, `${dd.action} · ${new Date(dd.timestamp).toLocaleString()}`));
//     });
//   } catch(e){ console.error(e); const demo = ['Prescription updated for John Doe','New appointment scheduled for Jane','Lab result uploaded']; demo.forEach(t=> ul.appendChild(create('li',{class:'muted'}, t))); }
// }

// async function loadPatients(){
//   const wrap = $('#patientsList'); if(!wrap) return;
//   wrap.innerHTML = '<div class="muted">Loading…</div>';
//   try{
//     const snap = await db.collection('patients').where('doctorId','==',currentDoctor.uid).get();
//     if(snap.empty){ wrap.innerHTML = '<div class="muted">No patients yet</div>'; return; }
//     wrap.innerHTML = '';
//     snap.docs.forEach(d => {
//       const data = d.data();
//       const card = create('div',{class:'card'}, `<div style="display:flex;justify-content:space-between;align-items:center">
//         <div><strong>${escapeHtml(data.name)}</strong><div class="muted">${escapeHtml(data.phone||'')}</div></div>
//         <div style="display:flex;gap:8px">
//           <button class="btn small view-patient" data-id="${d.id}" data-name="${escapeHtml(data.name)}">View</button>
//           <a class="btn small ghost" href="https://wa.me/${encodeURIComponent((data.phone||'').replace(/[^+\\d]/g,''))}" target="_blank">WhatsApp</a>
//         </div>
//       </div>`);
//       wrap.appendChild(card);
//     });
//     $$('.view-patient').forEach(b => b.addEventListener('click', ()=> openPatientModal(b.dataset.name)));
//   } catch(e){ console.error(e); wrap.innerHTML = '<div class="muted">Error loading patients</div>'; }
// }

// /* -------------------------
//    Notifications & realtime
//    ------------------------- */
// function setupRealtimeListeners(){
//   try{
//     db.collection('notifications').where('doctorId','==',currentDoctor.uid).orderBy('timestamp','desc').limit(20)
//       .onSnapshot(snap => renderNotifications(snap.docs.map(d=>({ id:d.id, ...d.data() }))));

//     db.collection('appointments').where('doctorId','==',currentDoctor.uid).onSnapshot(()=> {
//       loadAppointments();
//       loadStats();
//       refreshChartsData();
//     });

//     db.collection('patients').where('doctorId','==',currentDoctor.uid).onSnapshot(()=> {
//       loadPatients();
//       loadStats();
//     });
//   } catch(e){ console.error('realtime', e); }
// }

// function renderNotifications(items){
//   const listEl = document.querySelector('.dropdown .dropdown-menu');
//   if(!listEl) return;
//   listEl.innerHTML = '';
//   if(!items || !items.length) { listEl.innerHTML = '<div class="muted">No notifications</div>'; return; }
//   items.forEach(n=>{
//     const row = create('div',{style:'display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid rgba(0,0,0,0.04)'});
//     const left = create('div',{}, `<strong>${escapeHtml(n.title||'Notification')}</strong><div class="muted" style="font-size:13px">${escapeHtml(n.body||'')}</div>`);
//     const actions = create('div',{style:'display:flex;gap:6px'});
//     if(n.type === 'appointment'){
//       const a = create('button',{class:'btn small'}, 'Accept'); a.addEventListener('click', ()=> handleNotifAppointment(n.id,'accept',n));
//       const r = create('button',{class:'btn small ghost'}, 'Decline'); r.addEventListener('click', ()=> handleNotifAppointment(n.id,'decline',n));
//       actions.appendChild(a); actions.appendChild(r);
//     } else if(n.type === 'pharmacy'){
//       const a = create('button',{class:'btn small'}, 'Approve'); a.addEventListener('click', ()=> handlePharmacy(n.id,'approve',n));
//       const r = create('button',{class:'btn small ghost'}, 'Reject'); r.addEventListener('click', ()=> handlePharmacy(n.id,'reject',n));
//       actions.appendChild(a); actions.appendChild(r);
//     } else {
//       const d = create('button',{class:'btn small ghost'}, 'Dismiss'); d.addEventListener('click', ()=> dismissNotif(n.id));
//       actions.appendChild(d);
//     }
//     row.appendChild(left); row.appendChild(actions);
//     listEl.appendChild(row);
//   });
// }

// async function handleNotifAppointment(id, action, data){
//   try{
//     const nRef = db.collection('notifications').doc(id);
//     const nSnap = await nRef.get();
//     if(!nSnap.exists) return showToast('Already handled');
//     const payload = nSnap.data();
//     if(payload.meta && payload.meta.apptId){
//       const apRef = db.collection('appointments').doc(payload.meta.apptId);
//       if(action === 'accept') await apRef.set({ status:'confirmed' }, { merge:true});
//       else await apRef.set({ status:'declined' }, { merge:true});
//       await nRef.delete();
//       showToast('Appointment ' + (action==='accept' ? 'confirmed' : 'declined'));
//       loadAppointments();
//     } else {
//       await nRef.delete(); showToast('Notification handled');
//     }
//   } catch(e){ console.error(e); showToast('Handle failed'); }
// }
// async function handlePharmacy(id, action, data){ try{ await db.collection('notifications').doc(id).delete(); showToast('Processed'); }catch(e){console.error(e);} }
// async function dismissNotif(id){ try{ await db.collection('notifications').doc(id).delete(); showToast('Dismissed'); }catch(e){console.error(e);} }

// /* -------------------------
//    Charts
//    ------------------------- */
// async function setupCharts(){
//   const pc = document.getElementById('patientsChart')?.getContext('2d');
//   const ac = document.getElementById('appointmentsChart')?.getContext('2d');
//   if(pc){
//     patientsChart = new Chart(pc, { type:'line', data:{ labels:[], datasets:[{ label:'Appointments (last 7 days)', data:[], borderColor:'#28a745', backgroundColor:'rgba(40,167,69,0.12)', fill:true }] }, options:{ responsive:true, plugins:{ legend:{ display:false } } }});
//   }
//   if(ac){
//     appointmentsChart = new Chart(ac, { type:'pie', data:{ labels:['Confirmed','Pending','Cancelled'], datasets:[{ data:[0,0,0], backgroundColor:['#28a745','#f1c40f','#dc3545'] }] }, options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } }});
//   }
//   await refreshChartsData();
// }

// async function refreshChartsData(){
//   if(!patientsChart || !appointmentsChart) return;
//   try{
//     const now = new Date();
//     const labels=[]; const values=[];
//     for(let i=6;i>=0;i--){
//       const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()-i);
//       const key = d.toISOString().slice(0,10);
//       labels.push(key);
//       const snap = await db.collection('appointments').where('doctorId','==',currentDoctor.uid).where('date','==',key).get();
//       values.push(snap.size);
//     }
//     patientsChart.data.labels = labels; patientsChart.data.datasets[0].data = values; patientsChart.update();
//     const allSnap = await db.collection('appointments').where('doctorId','==',currentDoctor.uid).get();
//     const confirmed = allSnap.docs.filter(d=>d.data().status==='confirmed').length;
//     const pending = allSnap.docs.filter(d=>d.data().status==='pending').length;
//     const cancelled = allSnap.docs.filter(d=>d.data().status==='cancelled').length;
//     appointmentsChart.data.datasets[0].data = [confirmed,pending,cancelled]; appointmentsChart.update();
//   } catch(e){ console.error('refreshChartsData', e); }
// }

// /* -------------------------
//    Prescription creation + QR
//    ------------------------- */
// function openCreatePrescriptionModal(patientName='Patient'){
//   const existing = document.getElementById('prescriptionModal'); if(existing) existing.remove();
//   const modal = create('div',{id:'prescriptionModal', class:'modal'});
//   const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>New Prescription — ${escapeHtml(patientName)}</h3>
//     <div style="display:flex;gap:12px;flex-direction:column;margin-top:8px">
//       <label class="muted">Upload Doctor Template (optional)</label>
//       <input id="presTemplateInput" type="file" accept="image/*,.pdf"/>
//       <label class="muted">Medicines (one per line: Name | Dosage | Duration | Notes)</label>
//       <textarea id="presMeds" style="width:100%;height:120px;padding:8px;border-radius:8px;border:1px solid #eee"></textarea>
//       <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px">
//         <button id="savePres" class="btn">Save & Generate QR</button>
//         <button id="cancelPres" class="btn small ghost">Cancel</button>
//       </div>
//     </div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#cancelPres').addEventListener('click', ()=> modal.remove());
//   $('#savePres').addEventListener('click', async ()=> {
//     const medsText = $('#presMeds').value.trim();
//     if(!medsText){ alert('Add at least one medicine'); return; }
//     const file = $('#presTemplateInput').files && $('#presTemplateInput').files[0];
//     const presObj = { doctorId: currentDoctor.uid, patientName, medicines: medsText.split('\n').map(x=>x.trim()).filter(Boolean), createdAt: new Date().toISOString() };
//     try{
//       let url='';
//       if(file){
//         const path = `prescription_templates/${currentDoctor.uid}/${Date.now()}_${file.name}`;
//         const ref = storage.ref().child(path);
//         await ref.put(file);
//         url = await ref.getDownloadURL();
//       }
//       const docRef = await db.collection('prescriptions').add({...presObj, templateUrl: url});
//       const presUrl = `${location.origin}/view_prescription.html?id=${docRef.id}`;
//       const qr = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(presUrl)}`;
//       await db.collection('prescriptions').doc(docRef.id).set({ qrUrl: qr }, { merge:true });
//       modal.remove();
//       showPrescriptionResult(docRef.id, presUrl, qr);
//       loadStats();
//     } catch(e){ console.error(e); alert('Save failed'); }
//   });
// }

// function showPrescriptionResult(id, presUrl, qrSrc){
//   const modal = create('div',{class:'modal'});
//   const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>Prescription Created</h3><p class="muted">ID: ${escapeHtml(id)}</p><div style="margin-top:8px"><img src="${escapeHtml(qrSrc)}" alt="QR" style="width:220px;height:220px;border-radius:8px"></div><div style="display:flex;justify-content:center;gap:8px;margin-top:12px"><a class="btn" href="${escapeHtml(presUrl)}" target="_blank">Open</a><button class="btn small ghost" id="closePres">Close</button></div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#closePres').addEventListener('click', ()=> modal.remove());
// }

// /* -------------------------
//    Patient modal (view reports & pres)
//    ------------------------- */
// async function openPatientModal(patientName){
//   try{
//     const pSnap = await db.collection('patients').where('name','==',patientName).limit(1).get();
//     let patient = null;
//     if(!pSnap.empty) patient = { id:pSnap.docs[0].id, ...pSnap.docs[0].data() };
//     else patient = { name: patientName, phone:'', age:'', sex:'', reports:[], prescriptions:[] };

//     const presSnap = await db.collection('prescriptions').where('patientName','==',patientName).get();
//     const pres = presSnap.docs.map(d=>({ id:d.id, ...d.data() }));
//     const repSnap = await db.collection('reports').where('patientName','==',patientName).get();
//     const reps = repSnap.docs.map(d=>({ id:d.id, ...d.data() }));
//     renderPatientModal({ ...patient, reports: reps, prescriptions: pres });
//   } catch(e){ console.error(e); alert('Open patient failed'); }
// }

// function renderPatientModal(data){
//   const modal = create('div',{class:'modal'});
//   const card = create('div',{class:'card'});
//   card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
//     <div>
//       <h3>${escapeHtml(data.name)}</h3>
//       <div class="muted">${escapeHtml(data.age||'')} · ${escapeHtml(data.sex||'')}</div>
//       <div class="muted" style="margin-top:6px">${escapeHtml(data.phone||'')}</div>
//     </div>
//     <div style="display:flex;gap:8px;align-items:center">
//       <a class="btn small" href="https://wa.me/${encodeURIComponent((data.phone||'').replace(/[^+\\d]/g,''))}" target="_blank">WhatsApp</a>
//       <button class="btn small" id="createPresBtn">+ Prescription</button>
//     </div>
//   </div>
//   <hr style="margin:12px 0">
//   <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
//     <div>
//       <h4>Reports</h4>
//       <div id="patientReports">${(data.reports||[]).length ? data.reports.map(r=>`<div class="card" style="padding:8px;margin-bottom:8px"><strong>${escapeHtml(r.title)}</strong><div class="muted">${escapeHtml(r.date)}</div><div class="muted">${escapeHtml(r.notes||'')}</div></div>`).join('') : '<div class="muted">No reports</div>'}</div>
//     </div>
//     <div>
//       <h4>Prescriptions</h4>
//       <div id="patientPres">${(data.prescriptions||[]).length ? data.prescriptions.map(p=>`<div class="card" style="padding:8px;margin-bottom:8px"><strong>${escapeHtml(p.createdAt||'')}</strong><div class="muted">${escapeHtml((p.medicines||[]).join(', '))}</div></div>`).join('') : '<div class="muted">No prescriptions</div>'}</div>
//     </div>
//   </div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#createPresBtn').addEventListener('click', ()=> openCreatePrescriptionModal(data.name));
//   modal.addEventListener('click', (e)=> { if(e.target===modal) modal.remove(); });
// }

// /* -------------------------
//    Chat (lightweight) - opens floating chat
//    ------------------------- */
// function openChatView(){
//   let chatC = $('#chatContainer');
//   if(!chatC){
//     chatC = create('div',{id:'chatContainer', style:'position:fixed;bottom:12px;right:12px;width:360px;height:520px;background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.12);z-index:9999;overflow:hidden;display:flex;flex-direction:column'});
//     document.body.appendChild(chatC);
//   }
//   chatC.innerHTML = `<div style="padding:12px;border-bottom:1px solid rgba(0,0,0,0.06);display:flex;justify-content:space-between;align-items:center"><strong>Chat</strong><button id="closeChat" class="btn small ghost">Close</button></div><div id="chatList" style="padding:12px;flex:1;overflow:auto"></div><div style="padding:10px;border-top:1px solid rgba(0,0,0,0.06);display:flex;gap:8px"><input id="chatMessage" placeholder="Message..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #eee"><button id="sendMsg" class="btn small">Send</button></div>`;
//   $('#closeChat').addEventListener('click', ()=> chatC.remove());
// }

// /* -------------------------
//    QR Scanner modal (html5-qrcode fallback)
//    ------------------------- */
// function openQRScannerModal(){
//   const modal = create('div',{class:'modal'}); const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>Scan QR</h3><p class="muted">Scan a prescription / patient QR to access data.</p><div id="qr-reader" style="width:100%;height:360px;background:#f6f6f6;border-radius:8px;display:flex;align-items:center;justify-content:center">Camera not available</div><div style="text-align:right;margin-top:10px"><button class="btn small" id="closeQR">Close</button></div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#closeQR').addEventListener('click', ()=> modal.remove());

//   if(window.Html5Qrcode){
//     const qreader = new Html5Qrcode("qr-reader");
//     Html5Qrcode.getCameras().then(cams => {
//       if(cams && cams.length){
//         qreader.start(cams[0].id, { fps:10, qrbox:250 }, (decoded)=> { handleScannedQR(decoded); qreader.stop().then(()=>qreader.clear()).catch(()=>{}); modal.remove(); }, (err)=>{}).catch(e=>{ document.getElementById('qr-reader').innerText = 'Camera error'; });
//         modal.querySelector('#closeQR').addEventListener('click', ()=> qreader.stop().then(()=>qreader.clear()).catch(()=>{}));
//       } else document.getElementById('qr-reader').innerText = 'No camera found';
//     }).catch(e=> document.getElementById('qr-reader').innerText = 'Camera permission denied or not supported');
//   } else {
//     const reader = document.getElementById('qr-reader');
//     reader.innerHTML = `<div style="padding:12px"><input id="qrPaste" placeholder="Paste QR URL or code" style="width:100%;padding:8px;border-radius:6px;border:1px solid #eee"><div style="text-align:right;margin-top:8px"><button id="qrPasteBtn" class="btn small">Open</button></div></div>`;
//     $('#qrPasteBtn').addEventListener('click', ()=> { const val = $('#qrPaste').value.trim(); if(!val) return; modal.remove(); handleScannedQR(val); });
//   }
// }

// async function handleScannedQR(payload){
//   try{
//     if(payload.includes('/view_prescription.html?id=')){
//       const id = new URL(payload).searchParams.get('id');
//       if(id){
//         const snap = await db.collection('prescriptions').doc(id).get();
//         if(snap.exists) { previewPrescription(snap.data(), id); return; }
//       }
//     } else if(payload.startsWith('patient:')){
//       const pid = payload.split(':')[1]; if(pid) openPatientModal(pid); return;
//     } else if(payload.startsWith('pres:')){
//       const pid = payload.split(':')[1]; alert('Open prescription ' + pid); return;
//     }
//     if(payload.startsWith('http')) window.open(payload,'_blank'); else showToast('Scanned: ' + payload);
//   } catch(e){ console.error(e); showToast('Invalid QR payload'); }
// }

// function previewPrescription(p, id){
//   const modal = create('div',{class:'modal'}); const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>Prescription Preview</h3><div class="muted">ID: ${escapeHtml(id)}</div><div style="margin-top:12px"><strong>Patient:</strong> ${escapeHtml(p.patientName||'')}</div><div style="margin-top:8px"><strong>Medicines:</strong><div class="muted">${escapeHtml((p.medicines||[]).join(', '))}</div></div><div style="margin-top:12px;text-align:right"><a class="btn" href="${escapeHtml(p.qrUrl||('#'))}" target="_blank">Open QR</a><button class="btn small ghost" id="closePreview">Close</button></div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#closePreview').addEventListener('click', ()=> modal.remove());
// }

// /* -------------------------
//    Settings modal
//    ------------------------- */
// function openSettingsModal(){
//   const modal = create('div',{class:'modal'}); const card = create('div',{class:'card'});
//   card.innerHTML = `<h3>Settings</h3>
//     <div style="margin-top:8px">
//       <label class="muted">Profile name</label>
//       <input id="docProfileName" style="width:100%;padding:8px;border-radius:8px;border:1px solid #eee" value="${escapeHtml(currentDoctor?.name||'')}" />
//       <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
//         <button class="btn" id="saveSettings">Save</button>
//         <button class="btn small ghost" id="closeSettings">Close</button>
//       </div>
//     </div>`;
//   modal.appendChild(card); document.body.appendChild(modal);
//   $('#closeSettings').addEventListener('click', ()=> modal.remove());
//   $('#saveSettings').addEventListener('click', async ()=> {
//     const name = $('#docProfileName').value.trim();
//     if(!name) return alert('Name required');
//     try{
//       await db.collection('doctors').doc(currentDoctor.uid).set({ name }, { merge:true });
//       currentDoctor.name = name; setDoctorName(name);
//       showToast('Saved');
//       modal.remove();
//     } catch(e){ console.error(e); showToast('Save failed'); }
//   });
// }

// /* -------------------------
//    Helpers
//    ------------------------- */
// function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
// function showToast(text, ms=1800){ const t=create('div',{style:'position:fixed;right:20px;bottom:20px;z-index:9999;padding:12px;border-radius:8px;box-shadow:0 12px 30px rgba(0,0,0,0.12);background:#fff'}, `<strong>${escapeHtml(text)}</strong>`); document.body.appendChild(t); setTimeout(()=>t.remove(), ms); }

// /* -------------------------
//    Utility: set doctor name in UI
//    ------------------------- */
// function setDoctorName(name){
//   const el = document.querySelector('.welcome-text h2');
//   if(el) el.innerText = `Good day, ${name} 👩‍⚕️`;
//   // subtitle
//   const sub = $('#welcomeSubtitle'); if(sub) sub.innerText = `${currentDoctor.specialty ? currentDoctor.specialty + ' • ' : ''}${currentDoctor.email || ''}`;
// }

// /* -------------------------
//    Expose essentials
//    ------------------------- */
// window.openCreatePrescriptionModal = openCreatePrescriptionModal;
// window.openPatientModal = openPatientModal;
// window.openChatView = openChatView;










