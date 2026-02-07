/* ========== Patient_Dashboard.js ========== */

// Add these to the top of Patient_Dashboard.js
import { auth, db } from "../../Firebase/Firebase.js";
import { 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

console.log("Patient_Dashboard.js LOADED");

/* =========================
   GLOBAL HELPERS 
========================= */
function setupReminderListener(patientId) {
  console.log("Reminder listener not implemented yet for:", patientId);
}

function hideWelcomeOverlay() {
  const welcome = document.getElementById('welcome');
  if (!welcome) return;

  welcome.classList.add('hidden');
  welcome.setAttribute('aria-hidden', 'true');

  setTimeout(() => {
    welcome.style.display = 'none';
  }, 500);
}


let currentPatientId = null;
let currentPatientData = {};

/* =========================
   SETTINGS LOGIC
========================= */
const settingsName = document.getElementById('settings-name');
const settingsEmail = document.getElementById('settings-email');
const saveProfileBtn = document.getElementById('save-profile');
const settingsDarkToggle = document.getElementById('settings-dark');

/* -------------------------
   User Verification & Data Initialization
------------------------- */
(function checkAuthAndLoad() {
    onAuthStateChanged(auth, async (user) => {
        // const welcome = document.getElementById('welcome');

       // User is NOT logged in: redirect them back to the login page 
         if (!user) {
      window.location.href = './Patient_Login_Page.html';
      return;
    }
            currentPatientId = user.uid;
            
            // 1. Load Patient Profile from Firestore
            const docSnap = await getDoc(doc(db, "patients", user.uid));
            if (docSnap.exists()) {
                currentPatientData = docSnap.data();
               
                // Use full name, fallback to email prefix if needed
                const userName = currentPatientData.fullName || user.email.split('@')[0];
                // Update UI placeholders
                document.getElementById('display-name').innerText = userName;
                document.getElementById('welcome-name').innerText = `Welcome, ${userName}`;
                 loadSettings();
            }

            // 2. Load all dynamic data (Doctors, Reminders, Reports)
            loadPatientPrescriptions(user.uid);
            loadPatientDashboardStats(user.uid);
            await loadDashboardData(user.uid);
            //  hide welcome AFTER data is ready
             hideWelcomeOverlay(); 
    });
})();

/* -------------------------
   Util / DOM helpers
   ------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));


let doctorsDataset = [];

/* UI-only mock doctors */
const mockDoctors = [
  {
    id: "mock-sharma",
    name: "Dr. Sharma",
    spec: "Cardiologist",
    avail: "Demo · UI only",
    number: "+910000000000",
    isMock: true
  }
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

art.dataset.doctor = d.name;
art.dataset.number = d.number || '';
art.dataset.specialty = d.spec;
art.dataset.doctorId = d.id;   


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
       <input type="date" class="appt-date" />
<select class="appt-time">
  <option value="">Select Time</option>
  <option value="09:00">09:00 AM</option>
  <option value="10:00">10:00 AM</option>
  <option value="11:00">11:00 AM</option>
  <option value="12:00">12:00 PM</option>
  <option value="14:00">02:00 PM</option>
  <option value="15:00">03:00 PM</option>
  <option value="16:00">04:00 PM</option>
</select>
<button 
  class="btn small book-btn" 
  ${d.isMock ? "disabled" : ""}
>
  ${d.isMock ? "Demo Only" : "Book"}
</button>
          <button class="btn small ghost open-wachat" data-number="${d.number}" data-doc="${d.name}">WhatsApp</button>
        </div>
      </div>
    `;
    searchResults.appendChild(art);
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

// Add this helper function to Patient_Dashboard.js
async function loadDashboardData(patientId) {
  console.log(`Loading data for patient: ${patientId}`);

  const doctorsCol = collection(db, "doctors");
  const doctorSnapshot = await getDocs(doctorsCol);

  const realDoctors = doctorSnapshot.docs.map(d => ({
    id: d.id,
    name: d.data().fullName || "Dr. Demo Doctor",
    spec: d.data().specialty || "General Physician",
    avail: d.data().availability || "Mon–Fri · 10:00–17:00",
    number: d.data().phone || "",
    isMock: false
  }));

  const primaryDoctor = realDoctors.slice(0, 1);

  doctorsDataset = [...primaryDoctor, ...mockDoctors];

  // ✅ CRITICAL RENDERS
  renderDashboardDoctors(doctorsDataset);
  renderSearchResults(doctorsDataset);

  setupReminderListener(patientId);
}

function renderDashboardDoctors(list) {
  const grid = document.getElementById('dashboard-doctors');
  if (!grid) return;

  grid.innerHTML = '';

  list.forEach(d => {
    const card = document.createElement('article');
    card.className = 'doctor-card flippable';
    card.dataset.doctor = d.name;
    card.dataset.specialty = d.spec;
    card.dataset.number = d.number || '';
    card.dataset.disease = '—';
    card.dataset.doctorId = d.id;   

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-front">
          <div class="doctor-thumb">
            <video class="small-anim" autoplay loop muted playsinline>
              <source src="../assets/animations/Doctor_animated.mp4" type="video/mp4" />
            </video>
          </div>

          <div class="front-meta">
            <h3 class="doctor-name">${d.name}</h3>
            <p class="doctor-specialty">${d.spec}</p>
            <p class="doctor-brief muted">${d.avail}</p>

            <div class="doctor-actions">
              <button class="flip-btn">View Details</button>
              ${
                d.isMock
                  ? `<button class="prescribe-btn" disabled>Demo Only</button>`
                  : `<button class="prescribe-btn">View Prescriptions</button>`
              }
            </div>
          </div>
        </div>

        <div class="card-back">
          <h3>${d.name}</h3>
          <p class="muted">${d.spec}</p>

          <div class="book-section">
            <label>Book appointment:</label>
            <div class="book-controls">
              <input type="date" class="appt-date" />
<select class="appt-time">
  <option value="">Select Time</option>
  <option value="09:00">09:00 AM</option>
  <option value="10:00">10:00 AM</option>
  <option value="11:00">11:00 AM</option>
  <option value="12:00">12:00 PM</option>
  <option value="14:00">02:00 PM</option>
  <option value="15:00">03:00 PM</option>
  <option value="16:00">04:00 PM</option>
</select>
<button class="book-btn">Book</button>
            </div>
          </div>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// 4. Implement the Logout button listener
const logoutBtn = document.getElementById('logout-btn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // signOut triggers onAuthStateChanged(user=null), which redirects
        } catch (error) {
            console.error("Logout failed:", error);
            alert("Logout failed. Please try again.");
        }
    });
}


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

    if (view === 'prescriptions') {
  loadPatientPrescriptions(currentPatientId);
}
    if (view === 'reports') renderReports();
    if (view === 'payments') renderPayments();
    if (view === 'chat') renderChatList();
    if (view === 'appointments') renderSearchResults(doctorsDataset);
  });
});

/* =========================
   Dashboard Quick Actions
========================= */
const openAppointmentsBtn = document.getElementById('open-appointments');
const openPrescriptionsBtn = document.getElementById('open-prescriptions');

function switchView(viewName) {
  // sidebar active state
  $$('.nav-item').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (navBtn) navBtn.classList.add('active');

  // views
  $$('.view').forEach(v => v.classList.remove('active-view'));
  const viewEl = document.getElementById(`view-${viewName}`);
  if (viewEl) viewEl.classList.add('active-view');

  // accessibility focus
  const main = document.getElementById('main-content');
  if (main) main.focus();
}

if (openAppointmentsBtn) {
  openAppointmentsBtn.addEventListener('click', () => {
    switchView('appointments');
  });
}

if (openPrescriptionsBtn) {
  openPrescriptionsBtn.addEventListener('click', () => {
    switchView('prescriptions');
    populatePrescriptionSample(); // keep existing logic
  });
}


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
   Flip cards & right drawer (DYNAMIC)
------------------------- */

const rightDrawer = document.getElementById('right-drawer');
const drawerClose = document.getElementById('drawer-close');

document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('flip-btn')) return;

  const card = e.target.closest('.doctor-card');
  if (!card) return;


  // unflip others
  $$('.doctor-card.flipped').forEach(c => {
    if (c !== card) c.classList.remove('flipped');
  });

  card.classList.toggle('flipped');

  const doc = card.dataset.doctor || 'Doctor';
  const spec = card.dataset.specialty || '';
  const number = card.dataset.number || '';

  $('#drawer-doctor-name').innerText = doc;
  $('#drawer-specialty').innerText = spec;
  $('#drawer-disease').innerText = '—';

  if (rightDrawer) {
    rightDrawer.classList.add('visible');
    rightDrawer.setAttribute('aria-hidden','false');
  }

  const waBtn = $('#drawer-whatsapp');
  if (waBtn) {
    waBtn.onclick = () => {
      if (!number) return alert('Doctor contact not available');
      window.open(`https://wa.me/${number.replace(/[^+\d]/g,'')}`, '_blank');
    };
  }
});

/* booking inside card */
document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('book-btn')) return;

  const card = e.target.closest('.doctor-card');
  if (!card) return;

  const doctorName = card.dataset.doctor;
  if (!doctorName) {
    alert("Doctor information missing. Please refresh the page.");
    return;
  }

  const doctorId = card.dataset.doctorId;
  if (!doctorId) {
    alert("Doctor ID missing. Please refresh the page.");
    console.error("❌ doctorId missing on card:", card);
    return;
  }

  const dateInput = card.querySelector('.appt-date');
  const timeSelect = card.querySelector('.appt-time');

  if (!dateInput || !timeSelect || !dateInput.value || !timeSelect.value) {
    alert("Please select date and time");
    return;
  }

  console.log("BOOKING WITH:");
  console.log("doctorId (dataset):", card.dataset.doctorId);
  console.log("doctorName:", card.dataset.doctor);
  console.log("currentPatientId:", currentPatientId);

  const appointmentData = {
    patientId: currentPatientId,
    patientName: currentPatientData.fullName || "Patient",
    doctorId: doctorId,
    doctorName: doctorName,
    doctorPhone: card.dataset.number || "",
    date: dateInput.value,
    time: timeSelect.value,
    status: "pending",
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "appointments"), appointmentData);
    showSuccessModal(
      `Appointment booked on ${appointmentData.date} at ${appointmentData.time}`
    );
    dateInput.value = "";
    timeSelect.value = "";
  } catch (err) {
    console.error("BOOK ERROR:", err);
    alert(err.message);
  }
});

/* prescribe button open prescription view */
function loadPatientPrescriptions(patientId) {
  if (!patientId) return;

  const historyEl = document.getElementById('pres-history');
  const tbody = document.getElementById('meds-body');

  const q = query(
    collection(db, "prescriptions"),
    where("patientId", "==", patientId)
  );

  onSnapshot(q, snap => {
    historyEl.innerHTML = '';
    tbody.innerHTML = '';

    if (snap.empty) {
      historyEl.innerHTML = `<div class="muted">No prescriptions yet</div>`;
      return;
    }

    // Sort newest → oldest
    const docs = snap.docs.sort(
      (a, b) =>
        (b.data().createdAt?.seconds || 0) -
        (a.data().createdAt?.seconds || 0)
    );

    // 1️⃣ RENDER HISTORY LIST
    docs.forEach((d, idx) => {
      const p = d.data();
      const card = document.createElement('div');
      card.className = 'card small';

      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <strong>${p.doctorName || 'Doctor'}</strong><br/>
            <span class="muted">
              ${p.createdAt?.toDate?.().toLocaleDateString() || ''}
            </span>
          </div>
          <button class="btn small ghost" data-id="${d.id}">
            View
          </button>
        </div>
      `;

      card.querySelector('button').onclick = () => {
        renderPrescriptionDetails(d.id, p);
      };

      historyEl.appendChild(card);

      // Auto-open latest prescription
      if (idx === 0) {
        renderPrescriptionDetails(d.id, p);
      }
    });
  });
}

function renderPrescriptionDetails(id, p) {
  const tbody = document.getElementById('meds-body');
  const qrImg = document.getElementById('pres-qr');

  // Header
  document.querySelector('.doc-name').innerText = p.doctorName || 'Doctor';
  document.getElementById('pres-date').innerText =
    p.createdAt?.toDate?.().toLocaleDateString() || '';
  document.getElementById('pres-patient').innerText = p.patientName || '';
  document.getElementById('pres-id').innerText = id;
  document.getElementById('pres-age').innerText =
    `${p.patientAge || '--'} / ${p.patientSex || '--'}`;

  // QR (patient CAN see it)
  if (qrImg && p.qr) {
    qrImg.src = p.qr;
    qrImg.style.display = 'block';
  }

  // Medicines
  tbody.innerHTML = '';
  (p.medicines || []).forEach(line => {
    const [name, dose, freq, duration] = line.split('|').map(s => s.trim());
    tbody.innerHTML += `
      <tr>
        <td>${name}</td>
        <td>${dose || ''}</td>
        <td>${duration || ''}</td>
        <td>${freq || ''}</td>
      </tr>
    `;
  });
}

// document.addEventListener('click', (e) => {
//   if (!e.target.classList.contains('prescribe-btn') || e.target.disabled) return;

//   const card = e.target.closest('.doctor-card');
//   const doctorName = card?.dataset.doctor || 'Doctor';

//   switchView('prescriptions');

//   document.getElementById('pres-patient').innerText =
//     currentPatientData.fullName || 'Patient';

//   document.getElementById('pres-date').innerText =
//     new Date().toLocaleDateString();

//   showSuccessModal(`Showing prescriptions from ${doctorName}`);
// });


/* drawer close */
if (drawerClose) {
  drawerClose.addEventListener('click', () => {
    if (rightDrawer) {
      rightDrawer.classList.remove('visible');
      rightDrawer.setAttribute('aria-hidden','true');
    }
    $$('.doctor-card.flipped').forEach(c => c.classList.remove('flipped'));
  });
}

const drawerBook = document.getElementById('drawer-book');
const drawerPrescribe = document.getElementById('drawer-prescribe');

if (drawerBook) {
  drawerBook.addEventListener('click', () => {
    switchView('appointments');
  });
}

if (drawerPrescribe) {
  drawerPrescribe.addEventListener('click', () => {
    switchView('prescriptions');
  });
}


function loadPatientDashboardStats(patientId) {
  // Appointments
  onSnapshot(
    query(
      collection(db, "appointments"),
      where("patientId", "==", patientId),
      where("status", "in", ["pending", "confirmed"])
    ),
    snap => {
      document.getElementById('stat-upcoming').innerText =
        `${snap.size} Appointments`;
    }
  );

  // Prescriptions
  onSnapshot(
    query(
      collection(db, "prescriptions"),
      where("patientId", "==", patientId)
    ),
    snap => {
      document.getElementById('stat-pres').innerText =
        `${snap.size} Prescriptions`;
    }
  );

  // Reports (for now mock count)
  document.getElementById('stat-reports').innerText = `1 Report`;
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
    const animSrc = `../assets/animations/${encodeURIComponent(animFile)}`;
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
    if (d.isMock) return; // ADD THIS LINE
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
// renderChatList();



/* Populate settings when patient loads */
function loadSettings() {
  if (!currentPatientData) return;

  if (settingsName) settingsName.value = currentPatientData.fullName || '';
  if (settingsEmail) settingsEmail.value = currentPatientData.email || '';

  if (settingsDarkToggle) {
    settingsDarkToggle.checked = document.body.classList.contains('dark-mode');
  }
}

/* Save profile */
if (saveProfileBtn) {
  saveProfileBtn.addEventListener('click', async () => {
    const newName = settingsName.value.trim();
    if (!newName) {
      alert("Name cannot be empty");
      return;
    }

    try {
      const { updateDoc, doc } = await import(
        "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js"
      );

      await updateDoc(doc(db, "patients", currentPatientId), {
        fullName: newName
      });

      document.getElementById('display-name').innerText = newName;
      document.getElementById('welcome-name').innerText = `Welcome, ${newName}`;
      document.querySelector('.sidebar-footer .user').innerText = newName;

      currentPatientData.fullName = newName;

      showSuccessModal("Profile updated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    }
  });
}

/* Dark mode toggle */
if (settingsDarkToggle) {
  settingsDarkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', settingsDarkToggle.checked);
  });
}


/* expose reminders for debugging */
window.remindersData = reminders;