// --- REQUIRED FIREBASE IMPORTS ---
import { auth } from '../Patient_Firebase.js';
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { db } from '../Patient_Firebase.js';

let currentPatientId = null;
let currentPatientData = {};


// -------------------------
//  AUTH CHECK + DASHBOARD LOAD
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
// -------------------------
(function checkAuthAndLoad() {

    onAuthStateChanged(auth, async (user) => {

        const welcome = document.getElementById('welcome');
        try {
          if (user) {
                currentPatientId = user.uid;

                // ---- Load Patient Details ----
                // const docRef = doc(db, "patients", user.uid);
                // const docSnap = await getDoc(docRef);
                alert(document)
                document.getElementById('display-name').innerText = user.email;
                document.getElementById('welcome-name').innerText = `Welcome, ${user.email}`;
                if (docSnap.exists()) {
                    currentPatientData = docSnap.data();

                    const userName =
                        currentPatientData.fullName ||
                        user.email?.split('@')[0] ||
                        "Patient";

                    alert(userName)
                }

                // ---- Load Dashboard Items ----
                if (typeof loadDashboardData === "function") {
                    await loadDashboardData(user.uid);
                } else {
                    console.warn("loadDashboardData() is missing!");
                }

            } else {
                // Not logged in → Redirect to login
                window.location.href = "../Patient_Login_Page/Patient_Login_Page.html";
                return; // stop further execution
            }

        } catch (error) {
            console.error("Auth/Dashboard Error:", error);
            alert("An error occurred loading your dashboard. Check console.");
        }

        // ---- Hide welcome overlay ----
        if (welcome) welcome.classList.add('hidden');
    });

})();
























/* ========== Patient_Dashboard.js ========== */
alert("HID")
/* -------------------------
   Util / DOM helpers
   ------------------------- */

/* -------------------------
   Sidebar routing
   ------------------------- */
$$('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const view = btn.getAttribute('data-view');
    $$('.view').forEach(v => v.classList.remove('active-view'));
    const el = document.getElementById(`view-${view}`);
    if (el) el.classList.add('active-view');

    // focus main content for accessibility
    const main = $('#main-content');
    if (main) main.focus();

    if (view === 'prescriptions') populatePrescriptionSample();
    if (view === 'reports') renderReports();
    if (view === 'payments') renderPayments();
    if (view === 'chat') renderChatList();
  });
});

/* -------------------------
   Theme toggle (unchanged)
   ------------------------- */
const themeToggle = document.getElementById("toggle");
if (themeToggle) {
  themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode");
    // update aria for screen readers
    const label = document.querySelector('.toggle-label');
    if (label) label.setAttribute('aria-checked', document.body.classList.contains('dark-mode'));
  });
}

/* -------------------------
   Welcome overlay - robust
   Waits for video to be ready or times out (max 2s)
   ------------------------- */
(function hideWelcomeRobustly() {
  const welcome = document.getElementById('welcome');
  const vid = document.getElementById('welcome-anim');
  const displayName = document.getElementById('display-name');
  const welcomeName = document.getElementById('welcome-name');
  const userName = 'Patient Name'; // placeholder
  if (displayName) displayName.innerText = userName;
  if (welcomeName) welcomeName.innerText = `Welcome, ${userName}`;

  let done = false;
  function hideNow(){
    if (done || !welcome) return;
    done = true;
    welcome.classList.add('hidden');
    welcome.setAttribute('aria-hidden', 'true');
    setTimeout(()=> { if (welcome) welcome.style.display = 'none'; }, 520);
  }

  if (vid) {
    // if video canplay quickly -> hide
    if (vid.readyState >= 3) hideNow();
    else {
      const onCan = () => { vid.removeEventListener('canplay', onCan); hideNow(); };
      vid.addEventListener('canplay', onCan);
    }
  }
  // fallback
  setTimeout(hideNow, 2000);
})();

/* -------------------------
   Flip cards & right drawer
   ------------------------- */
const flippableCards = $$('.doctor-card.flippable');
const rightDrawer = document.getElementById('right-drawer');
const drawerClose = document.getElementById('drawer-close');

flippableCards.forEach(card => {
  const flipBtn = card.querySelector('.flip-btn');
  if (!flipBtn) return;
  flipBtn.addEventListener('click', () => {
    // unflip others
    $$('.doctor-card.flipped').forEach(c => { if (c !== card) c.classList.remove('flipped'); });
    card.classList.toggle('flipped');

    // populate and show drawer
    const doc = card.getAttribute('data-doctor') || 'Doctor';
    const spec = card.getAttribute('data-specialty') || '';
    const disease = card.getAttribute('data-disease') || '';
    const number = card.getAttribute('data-number') || '';
    $('#drawer-doctor-name').innerText = doc;
    $('#drawer-specialty').innerText = spec;
    $('#drawer-disease').innerText = disease;
    // show drawer
    if (rightDrawer) { rightDrawer.classList.add('visible'); rightDrawer.setAttribute('aria-hidden','false'); }
    // set whatsapp action
    const waBtn = $('#drawer-whatsapp');
    if (waBtn) {
      waBtn.onclick = () => {
        if (number) {
          const url = `https://wa.me/${encodeURIComponent(number.replace(/[^+\d]/g,''))}`;
          window.open(url, '_blank');
        } else alert('Doctor contact not available');
      };
    }
  });
});

if (drawerClose) drawerClose.addEventListener('click', () => {
  if (rightDrawer) { rightDrawer.classList.remove('visible'); rightDrawer.setAttribute('aria-hidden','true'); }
  $$('.doctor-card.flipped').forEach(c => c.classList.remove('flipped'));
});

/* booking inside card */
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('book-btn')) {
    const input = e.target.closest('.card-back').querySelector('.appt-input');
    if (input && input.value) {
      showSuccessModal(`Appointment booked for ${new Date(input.value).toLocaleString()}`);
    } else {
      alert('Please choose a time before booking.');
    }
  }
});

/* prescribe button open prescription view */
$$('.prescribe-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-item').forEach(b => b.classList.remove('active'));
    const presNav = document.querySelector('.nav-item[data-view="prescriptions"]');
    if (presNav) presNav.classList.add('active');
    $$('.view').forEach(v => v.classList.remove('active-view'));
    const presView = document.getElementById('view-prescriptions');
    if (presView) presView.classList.add('active-view');

    const patientName = btn.getAttribute('data-patient') || 'Patient Name';
    const presPatient = document.getElementById('pres-patient');
    const presDate = document.getElementById('pres-date');
    if (presPatient) presPatient.innerText = patientName;
    if (presDate) presDate.innerText = new Date().toLocaleDateString();
  });
});

/* populate prescription sample/back */
function populatePrescriptionSample(){
  const presPatient = document.getElementById('pres-patient');
  const presDate = document.getElementById('pres-date');
  const presId = document.getElementById('pres-id');
  if (presPatient) presPatient.innerText = 'Patient Name';
  if (presDate) presDate.innerText = new Date().toLocaleDateString();
  if (presId) presId.innerText = '#0001';
}

const presBack = document.getElementById('pres-back');
if (presBack) presBack.addEventListener('click', () => {
  $$('.view').forEach(v => v.classList.remove('active-view'));
  const dash = document.getElementById('view-dashboard'); if (dash) dash.classList.add('active-view');
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  const navDash = document.querySelector('.nav-item[data-view="dashboard"]'); if (navDash) navDash.classList.add('active');
});

/* print/download flows (prescription not heavily changed) */
const printBtn = document.getElementById('print-pres');
if (printBtn) {
  printBtn.addEventListener('click', () => {
    const presEl = document.getElementById('prescription');
    if (!presEl) return;
    const w = window.open('', '', 'height=700,width=900');
    w.document.write('<html><head><title>Print Prescription</title>');
    w.document.write('<style>body{font-family:Inter,Arial,sans-serif;padding:20px;color:#222}.paper{background:#fff;padding:18px;border-radius:6px}</style>');
    w.document.write('</head><body>');
    w.document.write(presEl.outerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      createDownloadablePrescription(presEl);
    }, 500);
  });
}
function createDownloadablePrescription(el) {
  const blob = new Blob([`<html><head><meta charset="utf-8"><title>Prescription</title></head><body>${el.outerHTML}</body></html>`], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prescription-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/* success modal helper */
function showSuccessModal(text) {
  const modal = document.getElementById('success-modal');
  const msg = modal ? modal.querySelector('.modal-content p') : null;
  if (msg) msg.innerText = text || 'Done';
  if (modal) modal.classList.remove('hidden');
  setTimeout(() => { if (modal) modal.classList.add('hidden'); }, 2200);
}
const modalOk = document.getElementById('modal-ok');
if (modalOk) modalOk.addEventListener('click', () => {
  const modal = document.getElementById('success-modal');
  if (modal) modal.classList.add('hidden');
});

/* small hover tilt */
$$('.hover-tilt').forEach(el => {
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${(-y*3)}deg) rotateY(${(x*3)}deg)`;
  });
  el.addEventListener('mouseleave', () => el.style.transform = '');
});

/* =================================================
   MEDICATION REMINDER LOGIC
   ================================================= */
let reminders = [
  { id: 1, medicine: 'Paracetamol 500mg', time: '10:00', status: 'pending' },
  { id: 2, medicine: 'Amoxicillin 250mg', time: '15:00', status: 'pending' },
  { id: 3, medicine: 'Vitamin D 1000IU', time: '20:00', status: 'pending' }
];

const medListEl = document.getElementById('med-list');
const alarmModal = document.getElementById('med-alarm');
const alarmTitle = document.getElementById('alarm-title');
const alarmSub = document.getElementById('alarm-sub');
const markTakenBtn = document.getElementById('mark-taken');
const snoozeSelect = document.getElementById('snooze-select');
const snoozeBtn = document.getElementById('snooze-btn');
const snoozeCustom = document.getElementById('snooze-custom');
const medSound = document.getElementById('med-sound');

let activeReminder = null;
let beepOsc = null;

/* Animations assets names (used for thumbnails) */
const medAnimations = [
  'medicine online.webm',
  'Patient_animated.mp4',
  'Doctor_animated.mp4',
  'Loading_Doctor.webm',
  'Scanning Prescription.webm',
  'Appoinments.webm',
  'Success.webm',
  'Doc and Patient.webm'
];

function renderMedList() {
  if (!medListEl) return;
  medListEl.innerHTML = '';
  reminders.forEach((r, idx) => {
    const animFile = medAnimations[idx % medAnimations.length];
    const animSrc = `assets/animations/${encodeURIComponent(animFile)}`;
    const div = document.createElement('div');
    div.className = 'med-item';
    div.dataset.id = r.id;
    div.innerHTML = `
      <div class="meta" style="display:flex;gap:10px;align-items:center;">
        <div style="width:54px;height:46px;border-radius:8px;overflow:hidden;background:#f0f0f0;flex-shrink:0;">
          <video autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;">
            <source src="${animSrc}" type="${animFile.endsWith('.mp4') ? 'video/mp4' : 'video/webm'}">
          </video>
        </div>
        <div>
          <div class="name">${r.medicine}</div>
          <div class="time">${formatTimeDisplay(r.time)}</div>
        </div>
      </div>
      <div class="status">${r.status === 'taken' ? '✅ Taken' : '⏳ Pending'}</div>
    `;
    medListEl.appendChild(div);
  });
}
renderMedList();

function formatTimeDisplay(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
}
function getTimeHHMM(date = new Date()) {
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

/* periodic check */
setInterval(checkReminders, 15000);
checkReminders();
function checkReminders() {
  const now = getTimeHHMM();
  const due = reminders.find(r => r.time === now && r.status === 'pending');
  if (due && !activeReminder) triggerReminder(due);
}

function triggerReminder(reminder) {
  activeReminder = reminder;
  if (alarmTitle) alarmTitle.innerText = 'Time to take medicine';
  if (alarmSub) alarmSub.innerText = `${reminder.medicine} — ${formatTimeDisplay(reminder.time)}`;
  if (alarmModal) { alarmModal.classList.remove('hidden'); alarmModal.setAttribute('aria-hidden','false'); }
  playAlarmSound();
  setTimeout(()=> { if (markTakenBtn) markTakenBtn.focus(); }, 120);
}

/* play alarm sound with fallback */
function playAlarmSound() {
  const hostedMp3 = 'https://actions.google.com/sounds/v1/alarms/alarm_clock.mp3';
  function startOscillator() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.02;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      beepOsc = { osc, ctx };
    } catch (e) { console.warn('osc fail', e); }
  }

  if (medSound && medSound.getAttribute('src')) {
    medSound.loop = true; medSound.currentTime = 0;
    medSound.play().catch(() => {
      medSound.src = hostedMp3;
      medSound.play().catch(() => startOscillator());
    });
  } else {
    const audio = new Audio(hostedMp3); audio.loop = true; audio.volume = 0.8;
    audio.play().catch(()=> startOscillator());
    medSound._hostedInstance = audio;
  }
}

function stopAlarmAudio() {
  try {
    if (medSound) { medSound.pause(); medSound.currentTime = 0; if (medSound._hostedInstance) { medSound._hostedInstance.pause(); medSound._hostedInstance = null; } }
  } catch(e){}
  try { if (beepOsc && beepOsc.osc && beepOsc.ctx) { beepOsc.osc.stop(); beepOsc.ctx.close(); } } catch(e){}
  beepOsc = null;
}

/* mark taken */
if (markTakenBtn) {
  markTakenBtn.addEventListener('click', () => {
    if (!activeReminder) return;
    reminders = reminders.map(r => r.id === activeReminder.id ? {...r, status:'taken'} : r);
    renderMedList();
    hideAlarm();
    showSuccessModal(`${activeReminder.medicine} marked as taken`);
    activeReminder = null;
  });
}

/* snooze */
if (snoozeSelect) {
  snoozeSelect.addEventListener('change', () => {
    if (snoozeSelect.value === 'custom' && snoozeCustom) snoozeCustom.classList.remove('hidden');
    else if (snoozeCustom) snoozeCustom.classList.add('hidden');
  });
}
if (snoozeBtn) {
  snoozeBtn.addEventListener('click', () => {
    if (!activeReminder) return;
    let mins = parseInt(snoozeSelect.value, 10);
    if (snoozeSelect.value === 'custom') mins = parseInt(snoozeCustom.value, 10) || 1;
    const next = new Date(Date.now() + (mins * 60000));
    const newHHMM = `${String(next.getHours()).padStart(2,'0')}:${String(next.getMinutes()).padStart(2,'0')}`;
    const tempId = Date.now();
    reminders.push({ id: tempId, medicine: activeReminder.medicine + ' (Snooze)', time: newHHMM, status: 'pending', temp:true });
    renderMedList();
    hideAlarm();
    showSuccessModal(`Snoozed for ${mins} minutes`);
    activeReminder = null;
  });
}

function hideAlarm(){
  if (alarmModal) alarmModal.classList.add('hidden');
  if (alarmModal) alarmModal.setAttribute('aria-hidden','true');
  stopAlarmAudio();
}

/* quick add reminder */
const openAddBtn = document.getElementById('open-add-reminder');
if (openAddBtn) {
  openAddBtn.addEventListener('click', () => {
    const med = prompt('Medicine name (example: Paracetamol 500mg)', 'Paracetamol 500mg');
    if (!med) return;
    const time = prompt('Time (24-hour HH:MM) — set to NOW for immediate test', getTimeHHMM());
    if (!time) return;
    const id = Date.now();
    reminders.push({ id, medicine: med, time: time, status: 'pending' });
    renderMedList();
    showSuccessModal('Reminder added (mock)');
  });
}

/* =================================================
   APPOINTMENT SEARCH (mock)
   - search uses mock dataset and displays results
   - includes "Book" and "WhatsApp QR" generation
   ================================================= */
const doctorsDataset = [
  { name: 'Dr. Sharma', spec: 'Cardiology', avail: 'Mon, Wed 10:00-13:00', number: '+919000000001' },
  { name: 'Dr. Mehta', spec: 'Neurology', avail: 'Tue, Thu 14:00-17:00', number: '+919000000002' },
  { name: 'Dr. Kapoor', spec: 'Orthopedics', avail: 'Fri 09:00-12:00', number: '+919000000003' }
];

const searchBtn = document.getElementById('search-btn');
const docSearch = document.getElementById('doc-search');
const searchResults = document.getElementById('search-results');

function renderSearchResults(list) {
  if (!searchResults) return;
  searchResults.innerHTML = '';
  list.forEach(d => {
    const art = document.createElement('article');
    art.className = 'doctor-card flippable';
    art.innerHTML = `
      <div class="card-inner" style="height:150px;display:flex;align-items:center;gap:12px;padding:12px">
        <div style="width:64px;height:64px;border-radius:10px;background:linear-gradient(135deg,var(--accent-2),var(--accent-1));display:flex;align-items:center;justify-content:center;color:#fff;">
          ${d.name.split(' ').map(n=>n[0]).slice(0,2).join('')}
        </div>
        <div style="flex:1">
          <div style="font-weight:700">${d.name}</div>
          <div class="muted">${d.spec} · ${d.avail}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button class="btn small book-now" data-doc="${d.name}">Book</button>
          <button class="btn small ghost open-wachat" data-number="${d.number}" data-doc="${d.name}">WhatsApp</button>
        </div>
      </div>
    `;
    searchResults.appendChild(art);
  });

  // attach actions
  $$('.book-now').forEach(b => {
    b.addEventListener('click', (e) => {
      const doc = b.dataset.doc;
      const time = prompt(`Book appointment with ${doc}\nEnter date & time (YYYY-MM-DD HH:MM)`, '');
      if (time) showSuccessModal(`Booked ${doc} at ${time} (mock)`);
    });
  });
  $$('.open-wachat').forEach(b => {
    b.addEventListener('click', () => {
      const num = b.dataset.number;
      const doc = b.dataset.doc;
      // open wa link
      const waUrl = `https://wa.me/${encodeURIComponent(num.replace(/[^+\d]/g,''))}?text=${encodeURIComponent('Hello '+doc+', I am your patient.')}`;
      // open in new tab and also show QR (for scanning)
      window.open(waUrl, '_blank');
      // show QR in reports area temporarily
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(waUrl)}`;
      showSuccessModal(`WhatsApp opened for ${doc}. (You can also scan the QR that was generated.)`);
      // optionally show QR in chat area
      renderChatList(); // ensure chat list available
    });
  });
}

if (searchBtn) {
  searchBtn.addEventListener('click', () => {
    const q = (docSearch.value || '').toLowerCase().trim();
    const res = doctorsDataset.filter(d => d.name.toLowerCase().includes(q) || d.spec.toLowerCase().includes(q));
    renderSearchResults(res.length ? res : doctorsDataset);
  });
}
/* run default */
renderSearchResults(doctorsDataset);

/* =================================================
   REPORTS (mock)
   - view & download report client-side
   ================================================= */
const reportsList = [
  { id: 1, title: 'Blood Test', date: '2025-10-12', file: null, notes: 'Hemoglobin low' },
  { id: 2, title: 'Chest X-Ray', date: '2025-09-28', file: null, notes: 'Clear' }
];
function renderReports() {
  const el = document.getElementById('reports-list');
  if (!el) return;
  el.innerHTML = '';
  reportsList.forEach(r => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = `
      <div>
        <div style="font-weight:700">${r.title}</div>
        <div class="muted">${r.date} · ${r.notes}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn small view-report" data-id="${r.id}">View</button>
        <button class="btn small ghost download-report" data-id="${r.id}">Download</button>
      </div>
    `;
    el.appendChild(d);
  });

  $$('.view-report').forEach(b => {
    b.addEventListener('click', () => {
      const id = parseInt(b.dataset.id,10);
      const rep = reportsList.find(x=>x.id===id);
      alert(`Viewing report (mock): ${rep.title}\nNotes: ${rep.notes}`);
    });
  });

  $$('.download-report').forEach(b => {
    b.addEventListener('click', () => {
      const id = parseInt(b.dataset.id,10);
      const rep = reportsList.find(x=>x.id===id);
      const content = `Report: ${rep.title}\nDate: ${rep.date}\nNotes: ${rep.notes}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${rep.title.replace(/\s+/g,'_')}_${rep.date}.txt`; a.click();
      URL.revokeObjectURL(url);
    });
  });
}

/* =================================================
   PAYMENTS (history only)
   ================================================= */
const paymentsData = [
  { date: '2025-10-01', purpose: 'Consultation - Dr. Sharma', amount: '₹500', status: 'Paid' },
  { date: '2025-09-15', purpose: 'Lab Test - Blood', amount: '₹350', status: 'Paid' }
];
function renderPayments() {
  const body = document.getElementById('payments-body');
  if (!body) return;
  body.innerHTML = '';
  paymentsData.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.date}</td><td>${p.purpose}</td><td>${p.amount}</td><td>${p.status}</td>`;
    body.appendChild(tr);
  });
}

/* =================================================
   CHAT (QR) view generation
   - For each doctor, generate a WhatsApp URL and QR (api.qrserver)
   ================================================= */
function renderChatList() {
  const container = document.getElementById('chat-grid');
  if (!container) return;
  container.innerHTML = '';
  doctorsDataset.forEach(d => {
    const waUrl = `https://wa.me/${encodeURIComponent(d.number.replace(/[^+\d]/g,''))}?text=${encodeURIComponent('Hello '+d.name+', I am your patient regarding my appointment.')}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(waUrl)}`;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div>
        <div style="font-weight:700">${d.name}</div>
        <div class="muted">${d.spec} · ${d.avail}</div>
        <div class="muted" style="font-size:12px;margin-top:6px">Scan to chat on WhatsApp</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <img src="${qrSrc}" alt="QR for ${d.name}" style="width:110px;height:110px;border-radius:8px;object-fit:cover"/>
        <a class="btn small" href="${waUrl}" target="_blank">Open WhatsApp</a>
      </div>
    `;
    container.appendChild(card);
  });
}

/* initial renders */
renderReports();
renderPayments();
renderChatList();

/* expose reminders for debugging */
window.remindersData = reminders;
