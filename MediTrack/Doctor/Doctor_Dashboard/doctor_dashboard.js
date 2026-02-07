/* doctor_dashboard.js  */

import { auth, db } from "../../Firebase/Firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  addDoc,
   query,          
   where,          
   orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// ✅ INIT FIREBASE STORAGE
const storage = getStorage();

let currentDoctorId = null;
let currentDoctorData = null;

function setupPharmacyNotifications() {
  if (!currentDoctorId) return;

  const q = query(
    collection(db, "prescriptions"),
    where("doctorId", "==", currentDoctorId)
  );

  onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      if (change.type !== "modified") return;

      const p = change.doc.data();

      if (p.pharmacyAction?.type === "alternative") {
  if (notifExists(change.doc.id)) return;

  window.__mock.notifications.unshift({
  id: change.doc.id,
  type: "pharmacy",
  title: "Pharmacy requested alternative",
  body: `Prescription ${change.doc.id}`
});

  showToast("💊 Pharmacy requested alternative");
  renderNotifications();
}
    });
  });
}
function loadNotificationHistory() {
  if (!currentDoctorId) return;

  const q = query(
    collection(db, "notifications"),
    where("doctorId", "==", currentDoctorId),
  );

  onSnapshot(q, snap => {
    snap.forEach(d => {
  const n = d.data();
  if (notifExists(n.prescriptionId)) return;

  window.__mock.notifications.unshift({
    id: n.prescriptionId,
    type: "pharmacy",
    title: "Pharmacy Alternative Request",
    body: `${n.message} (ID: ${n.id.slice(0,6)})`
  });
});
    renderNotifications();
  });
}
function notifExists(id) {
  return window.__mock.notifications.some(n => n.id === id);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../Doctor_Login_Page/Doctor_Login_Page.html";
    return;
  }

  currentDoctorId = user.uid;

  const snap = await getDoc(doc(db, "doctors", user.uid));
  if (!snap.exists()) {
    alert("Doctor profile not found");
    return;
  }

  currentDoctorData = snap.data();

  const name = currentDoctorData.fullName || "Doctor";
  document.getElementById("signedInUser").innerText = name;
  document.querySelector(".welcome-text").innerText = `Good day, ${name}`;
  document.getElementById("welcomeSubtitle").innerText =
    "Quick access to patient data, schedule, and prescriptions";

  // ✅ NOW THESE FUNCTIONS EXIST
  loadAppointments();
  setupAppointmentNotifications();
  setupPharmacyNotifications();
  loadNotificationHistory();
  loadPatients();
  loadPrescriptions();
  loadChatList();
});

window.__mock = window.__mock || {
  appts: [],
  patients: [],
  prescriptions: [],
  notifications: []
};

(function() { // Start IIFE for scope safety

/* ===== utilities ===== */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from((r||document).querySelectorAll(s));
const create = (t, attrs = {}, html='') => {
  const e = document.createElement(t);
  for(const k in attrs) {
    if(k === 'class') e.className = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  if(html) e.innerHTML = html;
  return e;
};
const escapeHtml = s => { if(s==null) return ''; return String(s).replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); };

/* 7. Effects: Toast/Modal Helpers (using .show class for CSS transition) */
const showToast = (t, ms=1800) => {
  const el = create('div',{style:'position:fixed;right:20px;bottom:20px;z-index:9999;padding:12px;border-radius:8px;box-shadow:0 12px 30px rgba(0,0,0,0.12);background:var(--card);opacity:0;transform:translateY(10px);transition:all 0.3s ease'}, `<strong>${escapeHtml(t)}</strong>`);
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = 1; el.style.transform = 'translateY(0)'; }, 10);
  setTimeout(()=> { el.style.opacity = 0; el.style.transform = 'translateY(10px)'; }, ms - 300);
  setTimeout(()=> el.remove(), ms);
};
function showModal(el) {
  history.pushState({ modal: true }, "");
  el.classList.add('show');
  const card = el.querySelector('.card');
  if (card) card.classList.add('show');
  el.classList.remove('hidden');
}
function hideModal(el) {
    el.classList.remove('show');
    const card = el.querySelector('.card');
    if (card) card.classList.remove('show');
    // Hide completely after transition
    setTimeout(() => el.classList.add('hidden'), 300);
}

/* ===== boot ===== */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  wireSidebar();
  wireTopbar();
  bindActions();

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = "../Doctor_Login_Page/Doctor_Login_Page.html";
  } catch (err) {
    console.error("SIGN OUT ERROR:", err);
    alert("Failed to sign out");
  }
});
  loadAll();
  initCharts();
});

/* ===== sidebar & routing ===== */
function wireSidebar() {
  const items = $$('#menuList .nav-item');

  items.forEach(it => {

    // ripple
    it.addEventListener('mousedown', (e) => {
      const rect = it.getBoundingClientRect();
      if (it.querySelector('.ripple')) return;

      const ripple = create('span', {
        class: 'ripple',
        style: `top:${e.clientY - rect.top}px; left:${e.clientX - rect.left}px;`
      });
      it.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });

    // navigation
    it.addEventListener('click', () => {
      if (it.id === 'logout-btn') return; // logout handled separately

      items.forEach(x => x.classList.remove('active'));
      it.classList.add('active');
      navigateTo(it.dataset.view);
    });

  });

  setTimeout(() => placeIndicator($('#menuList .nav-item.active')), 30);
  window.addEventListener('resize', () =>
    placeIndicator($('#menuList .nav-item.active'))
  );
}

function placeIndicator(el){
  if(!el) return;
  const ind = $('#sidebarIndicator');
  ind.style.top = (el.offsetTop) + 'px';
  ind.style.height = el.offsetHeight + 'px';
}

function navigateTo(view){
  $$('.view').forEach(v=> v.classList.remove('active-view'));
  const id = 'view-' + view;
  const el = document.getElementById(id);
  if(el) el.classList.add('active-view');
  $('#pageTitle').innerText = view.charAt(0).toUpperCase()+view.slice(1);
  placeIndicator($('#menuList .nav-item.active'));
  if (view === 'documents') {
  loadDocuments();
  
    // ✅ BIND DOCUMENT UPLOAD EVENTS HERE
    const uploadBtn = document.getElementById('uploadDocBtn');
    const fileInput = document.getElementById('docFileInput');

    if (uploadBtn && fileInput) {
      uploadBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) handleDocumentUpload(file);
        e.target.value = '';
      };
    }
  }
}

/* ===== topbar ===== */
function wireTopbar(){
  const notifRoot = $('#notifRoot'), notifMenu = $('#notifMenu');
  notifRoot.addEventListener('click', e => { 
      notifMenu.classList.toggle('show'); 
      if (notifMenu.classList.contains('show')) renderNotifications();
      e.stopPropagation(); 
  });
  document.addEventListener('click', ()=> notifMenu.classList.remove('show'));
  $('#btnScanQR').addEventListener('click', openQRScannerModal);
  $('#btnSettings').addEventListener('click', openSettingsModal); 
  
  // Theme Toggle: Linked to new HTML structure
  const toggleDark = $('#toggleDark');
  if (toggleDark) {
      toggleDark.addEventListener('change', ()=> {
          document.body.classList.toggle('dark');
          localStorage.setItem('meditrack_dark', document.body.classList.contains('dark'));
          // Sync with settings view checkbox
          const settingDark = $('#settingDark');
          if (settingDark) settingDark.checked = document.body.classList.contains('dark');
      });
  }

  $('#topSearch').addEventListener('keypress', e => { if(e.key==='Enter') doSearch($('#topSearch').value.trim()); });
}


/* ===== actions (buttons) ===== */
function bindActions(){
  $('#openAppointments').addEventListener('click', ()=> document.querySelector('#menuList .nav-item[data-view="appointments"]').click());
  $('#openPrescriptions').addEventListener('click', ()=> document.querySelector('#menuList .nav-item[data-view="prescriptions"]').click());
  $('#btnAddPatient').addEventListener('click', openAddPatientModal);
  $('#btnAddAppt').addEventListener('click', openAddApptModal);
  $('#btnResetPass')?.addEventListener('click', ()=> { const e = prompt('Enter email for password reset'); if(e) showToast('Mock reset sent'); });
  $('#filterAppt')?.addEventListener('input', e=> filterAppts(e.target.value));
  $('#filterPatient')?.addEventListener('input', e=> filterPatients(e.target.value));
  $('#filterPres')?.addEventListener('input', e=> filterPres(e.target.value));
  

  // Sync Dark Mode from Settings to Topbar
  const settingDark = $('#settingDark');
  if(settingDark){
    settingDark.addEventListener('change', ()=> { 
        $('#toggleDark').checked = settingDark.checked; 
        $('#toggleDark').dispatchEvent(new Event('change')); 
    });
  }
  
  // Edit Appointment Modal Handlers
  $('#cancelEditAppt')?.addEventListener('click', ()=> hideModal($('#editApptModal')));
  $('#saveEditAppt')?.addEventListener('click', handleSaveEditAppt);
}

/* ===== theme init ===== */
function initTheme(){
  if(localStorage.getItem('meditrack_dark') === 'true') {
    document.body.classList.add('dark');
    const toggleDark = $('#toggleDark');
    if (toggleDark) toggleDark.checked = true;
    const settingDark = $('#settingDark');
    if (settingDark) settingDark.checked = true;
  }
}

/* ===== data loaders ===== */
async function loadAll(){
  await Promise.all([
    loadStats(),
    loadPatients(),
  //loadPrescriptions(),
    loadChatList(),
    renderNotifications(),
    loadDashboardMetrics()
  ]);
  animateCounters();
}

async function loadDocuments() {
  const wrap = document.getElementById('docsList');
  if (!wrap || !currentDoctorId) return;

  wrap.innerHTML = '<div class="muted">Loading documents…</div>';

  const q = query(
    collection(db, "documents"),
    where("doctorId", "==", currentDoctorId)
  );

  onSnapshot(q, snap => {
    wrap.innerHTML = '';

    if (snap.empty) {
      wrap.innerHTML = '<div class="muted">No documents uploaded</div>';
      return;
    }

    snap.forEach(docSnap => {
      const d = docSnap.data();

      wrap.innerHTML += `
        <div class="card hover-tilt">
          <strong>${escapeHtml(d.fileName)}</strong>
          <div class="muted small">
            ${escapeHtml(d.patientName)} · ${d.type}
          </div>
          <a class="btn small ghost" href="${d.fileUrl}" target="_blank">
            Open
          </a>
        </div>
      `;
    });
  });
}


/* 5. Reports & Analytics in Dashboard: Load metrics */
async function loadDashboardMetrics(){
    const patients = window.__mock.patients || [];
    const htnCount = patients.filter(p => p.disease === 'Hypertension' || p.notes === 'HTN').length;
    const dmCount = patients.filter(p => p.disease === 'Diabetes' || p.notes === 'Diabetes').length;
    const migCount = patients.filter(p => p.disease === 'Migraine' || p.notes === 'Migraine').length;

    $('#metricHTN').innerText = htnCount;
    $('#metricDM').innerText = dmCount;
    $('#metricMIG').innerText = migCount;
}

/* stats */
async function loadStats() {
  const apptSnap = await getDocs(
    query(
      collection(db, "appointments"),
      where("doctorId", "==", currentDoctorId)
    )
  );

  const patients = new Set();
  let todayCount = 0;

  apptSnap.forEach(d => {
    const a = d.data();
    if (a.patientName) patients.add(a.patientName);
    if (a.date === getToday()) todayCount++;
  });

  $('#statToday').innerText = todayCount;
  $('#statPatients').innerText = patients.size;
}

/* appointments */
async function loadAppointments() {
  const body = document.getElementById('apptBody');
  const dashBody = document.getElementById('dashboardApptsBody');

  console.log("loadAppointments() CALLED");

  body.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
  dashBody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';

  const q = query(
  collection(db, "appointments"),
  where("doctorId", "==", currentDoctorId)
);

  onSnapshot(
    q,
    (snap) => {
      console.log("SNAPSHOT SIZE:", snap.size);

      body.innerHTML = '';
      dashBody.innerHTML = '';

      if (snap.empty) {
        body.innerHTML = '<tr><td colspan="5">No appointments in DB</td></tr>';
        dashBody.innerHTML = '<tr><td colspan="5">No appointments in DB</td></tr>';
        return;
      }

      snap.forEach(docSnap => {
        const d = docSnap.data();
        console.log("APPOINTMENT DOC:", docSnap.id, d);

        body.innerHTML += `
          <tr>
            <td>${d.patientName || '—'}</td>
            <td>${d.date || '—'}</td>
            <td>${d.time || '—'}</td>
            <td>${d.status || '—'}</td>
            <td>—</td>
          </tr>
        `;

        dashBody.innerHTML += `
          <tr>
            <td>${d.patientName || '—'}</td>
            <td>${d.date || '—'}</td>
            <td>${d.time || '—'}</td>
            <td>${d.status || '—'}</td>
            <td>—</td>
          </tr>
        `;
      });
    },
    (err) => {
      console.error("SNAPSHOT ERROR:", err);
      alert(err.message);
    }
  );
}

/* patients */
async function loadPatients() {
  const wrap = $('#patientsList');
  if (!wrap || !currentDoctorId) return;

  wrap.innerHTML = '<div class="muted">Loading patients…</div>';

  const q = query(
  collection(db, "appointments"),
  where("doctorId", "==", currentDoctorId),
);

  onSnapshot(q, snap => {
    const map = new Map();

    snap.forEach(docSnap => {
      const a = docSnap.data();
      if (!a.patientName) return;

      const key = a.patientId || a.patientName;

      if (!map.has(key)) {
        map.set(key, {
          id: a.patientId || '',
          name: a.patientName
        });
      }
    });

    wrap.innerHTML = '';

    if (map.size === 0) {
      wrap.innerHTML = '<div class="muted">No patients yet</div>';
      return;
    }

    map.forEach(p => {
      wrap.innerHTML += `
        <div class="card hover-tilt">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <strong>${escapeHtml(p.name)}</strong>
              <div class="muted">Appointment confirmed</div>
            </div>

            <div style="display:flex;gap:8px">
              <button
                class="btn small prescribe"
                data-id="${p.id}"
                data-name="${escapeHtml(p.name)}">
                Prescribe
              </button>

              <button
                class="btn small ghost view-history"
                data-id="${p.id}"
                data-name="${escapeHtml(p.name)}">
                History
              </button>
            </div>
          </div>
        </div>
      `;
    });

    //  ATTACH HANDLERS AFTER HTML EXISTS
    wrap.querySelectorAll('.view-history').forEach(btn => {
      btn.onclick = () => {
        openPatientHistory(btn.dataset.id, btn.dataset.name);
      };
    });

    wrap.querySelectorAll('.prescribe').forEach(btn => {
      btn.onclick = () => {
        openCreatePrescriptionModal(btn.dataset.name, btn.dataset.id);
      };
    });
  });
}

/* prescriptions */
async function loadPrescriptions() {
  const wrap = document.getElementById('presList');
  if (!wrap) return;

  wrap.innerHTML = '<div class="muted">Loading prescriptions…</div>';

  if (!currentDoctorId) {
    wrap.innerHTML = '<div class="muted">Doctor not ready</div>';
    return;
  }

  const q = query(
  collection(db, "prescriptions"),
  where("doctorId", "==", currentDoctorId),
  // orderBy("createdAt", "desc")
);

  onSnapshot(
    q,
    (snap) => {
      wrap.innerHTML = '';

      if (snap.empty) {
        wrap.innerHTML = '<div class="muted">No prescriptions yet</div>';
        return;
      }

      snap.forEach(docSnap => {
        const p = docSnap.data();

        const card = document.createElement('div');
        card.className = 'card hover-tilt';

        card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
        <strong>${escapeHtml(p.patientName || '—')}</strong>
        <div class="muted small">
        ${p.createdAt?.toDate?.().toLocaleString() || ''}
        </div>
      </div>

    <button class="btn small open-pres" data-id="${docSnap.id}">
      Open
    </button>
      </div>
          </div>
        `;

        wrap.appendChild(card);
      });

      document.querySelectorAll('.open-pres').forEach(btn => {
  btn.onclick = () => {
    window.open(
      '../../Prescription_View/prescription.html?id=' + btn.dataset.id,
      '_blank'
    );
  };
});
    },
    (err) => {
  console.error("PRESCRIPTION SNAPSHOT ERROR:", err);
  wrap.innerHTML = '<div class="muted">Permission denied for prescriptions</div>';
}
  );
}

/* notifications */
function renderNotifications(){
  const root = $('#notifMenu'); if(!root) return;
  const items = (window.__mock.notifications||[]);
  root.innerHTML = '';
  if(!items.length){ root.innerHTML = '<p class="muted">No new notifications</p>'; return; }
  items.forEach(n => {
    const div = create('div',{style:'margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(0,0,0,0.04)'}, `<div style="display:flex;justify-content:space-between;align-items:center">
      <div><strong>${escapeHtml(n.title)}</strong><div class="muted small">${escapeHtml(n.body)}</div></div>
      <div style="display:flex;flex-direction:column;gap:6px">
       ${
  n.type === 'appointment'
    ? `
      <button class="btn small accept" data-id="${n.id}">Accept</button>
      <button class="btn small ghost decline" data-id="${n.id}">Decline</button>
    `
    : n.type === 'pharmacy'
      ? `
        <button class="btn small success approve-alt" data-id="${n.id}">Approve</button>
        <button class="btn small warning reject-alt" data-id="${n.id}">Reject</button>
      `
      : `
        <button class="btn small ghost dismiss" data-id="${n.id}">
          Dismiss
        </button>
      `
}
      </div>
    </div>`);
    root.appendChild(div);
  });
  $$('.accept').forEach(b => b.addEventListener('click', ()=> { handleNotifAppointment(b.dataset.id,'accept'); }));
  $$('.decline').forEach(b => b.addEventListener('click', ()=> { handleNotifAppointment(b.dataset.id,'decline'); }));
  $$('.dismiss').forEach(b => b.addEventListener('click', ()=> { dismissNotif(b.dataset.id); }));
  // APPROVE ALTERNATIVE
$$('.approve-alt').forEach(btn => {
  btn.onclick = async () => {
    const prescriptionId = btn.dataset.id;

    await updateDoc(
      doc(db, "prescriptions", prescriptionId),
      {
        status: "dispensed",
        pharmacyAction: {
          type: "approved-by-doctor",
          approvedAt: serverTimestamp()
        }
      }
    );

    const q = query(
      collection(db, "notifications"),
      where("prescriptionId", "==", prescriptionId),
      where("status", "==", "pending")
    );

    const snapN = await getDocs(q);
    await Promise.all(
      snapN.docs.map(n =>
        updateDoc(doc(db, "notifications", n.id), {
          status: "approved",
          resolvedAt: serverTimestamp(),
          resolvedBy: "doctor"
        })
      )
    );

    showToast("✅ Alternative approved");
    dismissNotif(prescriptionId);
  };
});

}

// REJECT ALTERNATIVE
$$('.reject-alt').forEach(btn => {
  btn.onclick = async () => {
    const prescriptionId = btn.dataset.id;

    await updateDoc(
      doc(db, "prescriptions", prescriptionId),
      {
        pharmacyAction: {
          type: "rejected-by-doctor",
          rejectedAt: serverTimestamp()
        }
      }
    );

    const q = query(
      collection(db, "notifications"),
      where("prescriptionId", "==", prescriptionId),
      where("status", "==", "pending")
    );

    const snapN = await getDocs(q);
    await Promise.all(
      snapN.docs.map(n =>
        updateDoc(doc(db, "notifications", n.id), {
          status: "rejected",
          resolvedAt: serverTimestamp(),
          resolvedBy: "doctor"
        })
      )
    );

    showToast("❌ Alternative rejected");
    dismissNotif(prescriptionId);
  };
});

  
async function handleNotifAppointment(apptId, action){
  const status = action === 'accept' ? 'confirmed' : 'cancelled';

  await updateDoc(doc(db, "appointments", apptId), {
    status
  });

  showToast(`Appointment ${status}`);
}

function setupAppointmentNotifications() {
  if (!currentDoctorId) return;

  const q = query(
  collection(db, "appointments"),
  where("doctorId", "==", currentDoctorId)
);

  onSnapshot(q, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type !== "added") return;

      const d = change.doc.data();
      if (d.doctorId !== currentDoctorId) return;
      if (d.status !== "pending") return;

      if (notifExists(change.doc.id)) return;

      window.__mock.notifications.unshift({
        id: change.doc.id,
        type: "appointment",
        title: "New Appointment Request",
        body: `${d.patientName} · ${d.date} ${d.time}`
      });

      showToast("🗓 New appointment request");
    });
  });
}


/* chat */
async function loadChatList() {
  const root = $('#chatList');
  if (!root || !currentDoctorId) return;

  root.innerHTML = '<div class="muted">Loading chats…</div>';

  const q = query(
    collection(db, "appointments"),
    where("doctorId", "==", currentDoctorId),
    where("status", "in", ["confirmed", "completed"])
  );

  onSnapshot(q, snap => {
    const map = new Map();
    snap.forEach(docSnap => {
      const a = docSnap.data();
      if (!a.patientName) return;
      map.set(a.patientName, a);
    });

    root.innerHTML = '';
    if (map.size === 0) {
      root.innerHTML = '<div class="muted">No patients yet</div>';
      return;
    }

   map.forEach(p => {
  const phoneRaw = (
  p.patientPhone ||
  p.phone ||               // fallback if stored differently
  ''
).replace(/[^0-9]/g, '');
  const phone = phoneRaw
    ? (phoneRaw.startsWith('91') ? phoneRaw : '91' + phoneRaw)
    : null;

  root.innerHTML += `
    <div class="card hover-tilt">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong>${escapeHtml(p.patientName)}</strong>
          <div class="muted small">Last visit: ${p.date || '—'}</div>
        </div>

        ${
          phone
            ? `<button
                 class="btn small ghost"
                 onclick="window.open('https://wa.me/${phone}','_blank')">
                 WhatsApp
               </button>`
            : `<button class="btn small ghost" disabled>No phone</button>`
        }
      </div>
    </div>
  `;
});
 });
}

/* ===== patient history ===== */
function openPatientHistory(patientId, patientName) {
  const mm = create('div',{class:'modal hidden fullscreen'});
  const card = create('div',{class:'card'});

  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px">
  <button class="btn small ghost" id="backToPatients">← Back</button>
  <h2>${escapeHtml(patientName)} — History</h2>
</div>
    <div id="historyList" class="card-list"></div>
  `;

  mm.appendChild(card);
  document.getElementById('modalsRoot').appendChild(mm);

  const q = query(
  collection(db,"prescriptions"),
  where("doctorId","==",currentDoctorId),
  (patientId && patientId !== "")
    ? where("patientId","==",patientId)
    : where("patientName","==",patientName)
);

  onSnapshot(q, snap => {
    const list = card.querySelector('#historyList');
    list.innerHTML = '';

    if (snap.empty) {
      list.innerHTML = '<div class="muted">No prescriptions yet</div>';
      return;
    }

    snap.forEach(d => {
      const p = d.data();
      list.innerHTML += `
        <div class="card">
          <div><strong>${p.createdAt?.toDate?.().toLocaleDateString() || ''}</strong></div>
          <div class="muted">${p.medicines?.length || 0} medicines</div>
          <button class="btn small" onclick="showPrescriptionResult('${d.id}','${p.qr}')">
            Open
          </button>
        </div>
      `;
    });
  });

  showModal(mm);
card.querySelector('#backToPatients').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  hideModal(mm);
});
}

/* ===== modals & forms ===== */
function openAddPatientModal(){
  const mm = create('div',{class:'modal hidden'}); const card = create('div',{class:'card'});
  card.innerHTML = `<h3>Add Patient</h3>
    <input id="mName" placeholder="Name" style="width:100%;padding:10px;margin-top:8px;border-radius:8px;border:1px solid rgba(0,0,0,0.08)"/>
    <input id="mPhone" placeholder="Phone" style="width:100%;padding:10px;margin-top:8px;border-radius:8px;border:1px solid rgba(0,0,0,0.08)"/>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px">
      <button id="mSave" class="btn">Save</button><button id="mClose" class="btn small ghost">Cancel</button>
    </div>`;
  mm.appendChild(card); document.getElementById('modalsRoot').appendChild(mm);
  $('#mClose').addEventListener('click', ()=> hideModal(mm));
  $('#mSave').addEventListener('click', async () => {
    const name = $('#mName').value.trim(), phone = $('#mPhone').value.trim();
    if(!name||!phone) return alert('Name & phone required');
    const id = 'p'+Date.now(); 
  await addDoc(collection(db, "appointments"), {
  patientName: name,
  patientPhone: String(phone),
  date: getToday(),
  time: "10:00",
  status: "confirmed",
  doctorId: currentDoctorId,
  doctorName: currentDoctorData.fullName,
  createdAt: serverTimestamp()
});

showToast("Patient added via appointment");
hideModal(mm);
loadStats();
  });
  mm.addEventListener('click', (e)=> { if(e.target===mm) hideModal(mm); });
  showModal(mm);
}

function openAddApptModal() {
  const mm = create('div', { class: 'modal hidden' });
  const card = create('div', { class: 'card' });

  card.innerHTML = `
    <h3>New Appointment</h3>
    <input id="apPatient" placeholder="Patient name"/>
    <input id="apDate" type="date" value="${getToday()}"/>
    <input id="apTime" type="time" value="11:00"/>
    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button id="apSave" class="btn">Save</button>
      <button id="apClose" class="btn ghost">Cancel</button>
    </div>
  `;

  mm.appendChild(card);
  document.getElementById('modalsRoot').appendChild(mm);

  // close modal
  $('#apClose').addEventListener('click', () => hideModal(mm));

  // save appointment
// save appointment (WRITE TO FIRESTORE)
$('#apSave').addEventListener('click', async () => {
  try {
    const patientName = $('#apPatient').value.trim();
    const date = $('#apDate').value;
    const time = $('#apTime').value;

    if (!patientName || !date || !time) {
      alert('All fields required');
      return;
    }

    await addDoc(collection(db, "appointments"), {
      patientName,
      date,
      time,
      status: "confirmed",           // doctor-created = confirmed
      doctorId: currentDoctorId,     // logged-in doctor
      doctorName: currentDoctorData?.fullName || "Dr. Demo Doctor",
      createdAt: serverTimestamp()
    });

    showToast("Appointment created");
    hideModal(mm);

  } catch (err) {
    console.error("ADD APPOINTMENT ERROR:", err);
    alert(err.message);
  }
});

  // click outside to close
  mm.addEventListener('click', e => {
    if (e.target === mm) hideModal(mm);
  });

  showModal(mm);
}

// 3. Improvement: Dedicated Edit Modal for appointments
async function openEditApptModal(id){
  const snap = await getDoc(doc(db, "appointments", id));
  if (!snap.exists()) {
    alert("Appointment not found");
    return;
  }

  const ap = snap.data();
  const mm = $('#editApptModal');

  mm.dataset.apptId = id;
  $('#editApptPatientName').innerText = `Patient: ${ap.patientName}`;
  $('#editApptDate').value = ap.date;
  $('#editApptTime').value = ap.time;
  $('#editApptStatus').value = ap.status;

  showModal(mm);
}


async function handleSaveEditAppt(){
  const mm = $('#editApptModal');
  const id = mm.dataset.apptId;

  try {
    const newDate = $('#editApptDate').value;
    const newTime = $('#editApptTime').value;
    const newStatus = $('#editApptStatus').value;

    const dt = new Date(`${newDate}T${newTime}`);

    await updateDoc(doc(db, "appointments", id), {
    date: newDate,
    time: newTime,
    status: newStatus
});

    showToast("Appointment updated");
    hideModal(mm);
  } catch (e) {
    console.error(e);
    alert("Failed to update appointment");
  }
}

/* patient modal */
function openPatientModal(patientName){
  const p = (window.__mock.patients||[]).find(x=>x.name===patientName) || { name:patientName, phone:'', age:'', sex:'', notes:'No notes found.' };
  const mm = create('div',{class:'modal hidden'}); const card = create('div',{class:'card'});
  const reportsHtml = 'No reports on file.'; 
  card.innerHTML = `<h3>${escapeHtml(p.name)}</h3><div class="muted">${escapeHtml(p.age||'--')} · ${escapeHtml(p.sex||'--')}</div>
    <div style="margin-top:12px"><strong>Contact:</strong> ${escapeHtml(p.phone||'--')}</div>
    <div style="margin-top:8px"><strong>Notes</strong><p class="muted">${escapeHtml(p.notes||'')}</p></div>
    <hr style="margin:12px 0"/>
    <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn small" id="createPresForPatient">Create Prescription</button>
        <a class="btn small ghost" href="https://wa.me/${encodeURIComponent((p.phone||'').replace(/[^+\\d]/g,''))}" target="_blank">WhatsApp</a>
    </div>
    <h4 style="margin-top:12px">Reports</h4>
    <div class="card" style="padding:10px;background:#fafafa">${reportsHtml}</div>`;
  mm.appendChild(card); document.getElementById('modalsRoot').appendChild(mm);
  $('#createPresForPatient').addEventListener('click', () => {
  hideModal(mm);
  openCreatePrescriptionModal(p.name, p.id);
});
  showModal(mm);
}

/* create prescription - FULLSCREEN popup */

function openCreatePrescriptionModal(patientName='Patient', patientId=null){
  const mm = create('div',{class:'modal hidden fullscreen'}); const card=create('div',{class:'card'});
  card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <h2>Prescription — ${escapeHtml(patientName)}</h2>
      <div style="display:flex;gap:8px"><button id="closePresFull" class="btn small ghost">Close</button></div>
    </div>
    <hr/>
    <div style="display:grid;grid-template-columns:1fr 320px;gap:16px">
      <div>
        <label style="margin-top:12px;display:block">Patient Details</label>

<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
  <input
    id="presPatientName"
    placeholder="Patient Name"
    value="${escapeHtml(patientName)}"
    style="flex:2;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08)"
  />

  <input
    id="presPatientAge"
    type="number"
    placeholder="Age"
    min="0"
    style="width:90px;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08)"
  />

  <select
    id="presPatientSex"
    style="width:120px;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08)"
  >
    <option value="">Sex</option>
    <option value="Male">Male</option>
    <option value="Female">Female</option>
    <option value="Other">Other</option>
  </select>

  <input
    id="presDate"
    type="date"
    style="width:160px;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08)"
    value="${getToday()}"
  />
</div>
        <label style="margin-top:12px;display:block">Diagnosis / Notes</label>
        <input id="presDiag" placeholder="Diagnosis or notes" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);margin-top:8px"/>

        <label style="margin-top:12px;display:block">Medicines (one per line: Name | Dose | Frequency | Duration)</label>
        <textarea id="presMeds" style="width:100%;height:240px;padding:10px;border-radius:8px;border:1px solid rgba(0,0,0,0.08);margin-top:8px" placeholder="Paracetamol | 500mg | TDS | 5 days"></textarea>

        <div style="display:flex;gap:8px;margin-top:12px">
          <button id="savePresFull" class="btn">Save & Generate QR</button>
          <button id="attachImg" class="btn ghost">Attach Photo</button>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px">
        <div class="card" style="padding:12px">
          <strong>Preview</strong>
          <div id="presPreview" style="margin-top:8px" class="muted small">Empty</div>
        </div>

        <div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center">
          <div id="qrPreview" style="width:200px;height:200px;border-radius:8px;background:#fafafa;display:flex;align-items:center;justify-content:center" class="muted">QR</div>
          <div style="display:flex;gap:8px"><button id="downloadPres" class="btn small">Download</button><button id="closePres2" class="btn small ghost">Close</button></div>
        </div>
      </div>
    </div>`;
  mm.appendChild(card); document.getElementById('modalsRoot').appendChild(mm);

  // events
  $('#presMeds').addEventListener('input', updatePresPreview);
  $('#presDiag').addEventListener('input', updatePresPreview);
  $('#presPatientName').addEventListener('input', updatePresPreview);
  $('#savePresFull').onclick = async () => {
  console.log(" BUTTON CLICKED");

  try {
    const meds = $('#presMeds').value.trim();
    if (!meds) {
      alert("Add medicines");
      return;
    }

    const patientName = $('#presPatientName').value || "Demo Patient";

  const now = new Date();
const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

const prescriptionData = {
  patientId: patientId || null,
  patientName: patientName,
  patientAge: $('#presPatientAge').value || "",
  patientSex: $('#presPatientSex').value || "",
  doctorId: currentDoctorId,
  doctorName: currentDoctorData.fullName || "Doctor",
  clinicName: currentDoctorData.clinicName || "Clinic",
  clinicAddress: currentDoctorData.clinicAddress || "",
  medicines: meds.split('\n'),
  status: "active",
  // QR LOGIC
  isLatest: true,
  qrCreatedAt: serverTimestamp(),
  qrExpiresAt: expiresAt,

  createdAt: serverTimestamp()
};

    console.log(" Saving to Firestore:", prescriptionData);

    // Mark old prescriptions as NOT latest
if (patientId) {
  const oldQ = query(
    collection(db, "prescriptions"),
    where("patientId", "==", patientId),
    where("doctorId", "==", currentDoctorId),
    where("isLatest", "==", true)
  );

  const oldSnap = await getDocs(oldQ);
  oldSnap.forEach(async (d) => {
    await updateDoc(doc(db, "prescriptions", d.id), {
      isLatest: false
    });
  });
}

    const docRef = await addDoc(
      collection(db, "prescriptions"),
      prescriptionData
    );

    console.log(" Firestore ID:", docRef.id);

   const qrPayload =
  window.location.origin +
  '/MediTrack/Prescription_View/prescription.html?id=' +
  docRef.id +
  '&via=qr';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}`;

    await updateDoc(doc(db, "prescriptions", docRef.id), { qr: qrUrl });

    alert(" Prescription saved");
    hideModal(mm);
    loadPrescriptions();
    document.querySelector('#menuList .nav-item[data-view="prescriptions"]')?.click();
    showPrescriptionResult(docRef.id, qrUrl);

  } catch (err) {
    console.error(" FIRESTORE ERROR:", err);
    alert(err.message);
  }
};

  $('#attachImg').addEventListener('click', ()=> alert('Attach image (mock) — handled in backend step)'));
  $('#closePresFull').addEventListener('click', ()=> hideModal(mm));
  $('#closePres2').addEventListener('click', ()=> hideModal(mm));
  mm.addEventListener('click', (e)=> { if(e.target===mm) hideModal(mm); });

  updatePresPreview();
  showModal(mm);

  function updatePresPreview(){
    const pt = escapeHtml($('#presPatientName').value || 'Patient');
    const dt = escapeHtml($('#presDate').value || getToday());
    const diag = escapeHtml($('#presDiag').value || '');
    const meds = escapeHtml($('#presMeds').value || '');
    $('#presPreview').innerHTML = `<strong>${pt}</strong><div class="muted">${dt}</div><div style="margin-top:8px"><strong>Diagnosis</strong><div class="muted">${diag||'—'}</div></div>
      <div style="margin-top:8px"><strong>Medicines</strong><div class="muted" style="white-space:pre-wrap">${meds||'—'}</div></div>`;
    const id = 'preview_'+Date.now();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent('preview:'+id)}`;
    $('#qrPreview').innerHTML = `<img src="${qrUrl}" alt="qr" style="width:180px;height:180px;border-radius:6px;object-fit:cover">`;
  }
}

/* show created prescription */
function showPrescriptionResult(id, qr){
  const mm = create('div',{class:'modal hidden'}); const card = create('div',{class:'card'});
  // The 'Open QR' button functionality is kept for the doctor to easily share or verify.
  card.innerHTML = `<h3>Prescription Created</h3><div style="display:flex;gap:12px;align-items:center"><img src="${qr}" style="width:160px;height:160px;border-radius:8px"/><div><div class="muted">ID: ${escapeHtml(id)}</div><div style="margin-top:12px"><button class="btn" onclick="window.open('${qr}','_blank')">Open QR Link</button><button class="btn small ghost" id="closePres2">Close</button></div></div></div>`;
  mm.appendChild(card); document.getElementById('modalsRoot').appendChild(mm);
  $('#closePres2').addEventListener('click', ()=> hideModal(mm));
  mm.addEventListener('click', (e)=> { if(e.target===mm) hideModal(mm); });
  showModal(mm);
}

/* QR Scanner (dummy + paste, camera if available) */
function openQRScannerModal(){
  const mm = create('div',{class:'modal hidden'}); const card = create('div',{class:'card'});
  card.innerHTML = `<h3>Scan QR</h3><p class="muted">Scan a prescription / patient QR to access data.</p><div id="qrReader" style="width:100%;height:360px;border-radius:8px;background:#f6f6f6;display:flex;align-items:center;justify-content:center">Camera not available</div><div style="text-align:right;margin-top:10px"><button class="btn small" id="closeQR">Close</button></div>`;
  mm.appendChild(card); document.getElementById('modalsRoot').appendChild(mm);
  $('#closeQR').addEventListener('click', ()=> hideModal(mm));
  mm.addEventListener('click', (e)=> { if(e.target===mm) hideModal(mm); });

  // Simplified QR scan logic (using paste fallback directly since html5-qrcode is external)
  const reader = document.getElementById('qrReader');
  reader.innerHTML = `<div style="padding:12px"><input id="qrPaste" placeholder="Paste QR content or URL (e.g., pres:pres1)" style="width:100%;padding:8px;border-radius:6px;border:1px solid rgba(0,0,0,0.08)"/><div style="text-align:right;margin-top:8px"><button id="qrPasteBtn" class="btn small">Open</button></div></div>`;
  $('#qrPasteBtn').addEventListener('click', ()=> { const v = $('#qrPaste').value.trim(); if(!v) return; hideModal(mm); handleScannedQR(v); });
  showModal(mm);
}

async function handleScannedQR(payload){
  try {
    if(payload.includes('pres:')){
      const id = payload.split(':')[1];
      const p = (window.__mock.prescriptions||[]).find(x=>x.id===id);
      if(p) showPrescriptionResult(p.id, p.qr); else showToast('Prescription not found (mock)');
      return;
    }
    if(payload.startsWith('http')) window.open(payload,'_blank'); else showToast('Scanned: ' + payload);
  } catch(e){ console.error(e); showToast('Invalid QR payload'); }
}

/* Settings modal */
function openSettingsModal(){
  const mm = create('div',{class:'modal hidden'}); const card = create('div',{class:'card'});
  // Clone content from hidden view
  const settingsContent = $('#view-settings').cloneNode(true);
  const tempCard = settingsContent.querySelector('.settings-grid');
  
  card.innerHTML = `<h3>Settings</h3><p class="muted">App preferences and security</p>` + tempCard.outerHTML;
  
  mm.appendChild(card); document.getElementById('modalsRoot').appendChild(mm);

  // Re-attach listeners for the new elements inside the modal
  const closeBtn = card.querySelector('#closeSettings');
  if (closeBtn) closeBtn.addEventListener('click', ()=> hideModal(mm));
  
  // Re-link save button (since it was cloned)
  card.querySelector('#saveSettings')?.addEventListener('click', ()=> {
    const newName = card.querySelector('#docProfileName')?.value.trim() || 'Dr. Johanna';
    $('#signedInUser').innerText = newName;
    $('.welcome-text h2').innerText = `Good day, ${newName} 👩‍⚕️`;
    showToast('Settings saved (mock)');
    hideModal(mm);
  });
  
  mm.addEventListener('click', (e)=> { if(e.target===mm) hideModal(mm); });
  showModal(mm);
}


/* charts */
let patientsChart=null, appointmentsChart=null, appointmentsChartDash=null;
function initCharts(){
  const pCtx = document.getElementById('patientsChart')?.getContext('2d');
  const aCtx = document.getElementById('appointmentsChart')?.getContext('2d');
  const dCtx = document.getElementById('appointmentsChartDash')?.getContext('2d');
  
  const colors = ['#1abc9c','#f1c40f','#e74c3c', '#2575fc'];

  if(pCtx) {
    patientsChart = new Chart(pCtx, { type:'bar', data:{ labels:['20-30','30-40','40-50','50+'], datasets:[{ label:'Patients by Age', data:[20, 35, 25, 40], backgroundColor: 'rgba(37,117,252,0.6)', borderColor: 'var(--accent-blue)', borderWidth: 1 }] }, options:{ responsive:true, plugins:{ legend:{ display:false } }, scales: { y: { beginAtZero: true } } } });
  }
  if(aCtx) {
    appointmentsChart = new Chart(aCtx, { 
      type:'doughnut', 
      data:{ labels:['Confirmed','Pending','Cancelled', 'Completed'], datasets:[{ data:[12,4,2, 10], backgroundColor:colors }] }, 
      options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } }
    });
  }
  if(dCtx) {
    appointmentsChartDash = new Chart(dCtx, { 
      type:'bar', 
      data:{ labels:['M','T','W','Th','F','S','Su'], datasets:[{ label:'Daily Appts', data:[5,8,6,10,9,12,7], backgroundColor:'rgba(26,188,156,0.8)' }] }, 
      options:{ responsive:true, plugins:{ legend:{ display:false } }, scales: { y: { beginAtZero: true } } }
    });
  }
}

/* helpers & small features */
function getToday(){ return new Date().toISOString().slice(0,10); }
function getTodayOffset(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }

async function openPrescriptionViewer(prescriptionId) {
  const snap = await getDoc(doc(db, "prescriptions", prescriptionId));

  if (!snap.exists()) {
    alert("Prescription not found");
    return;
  }

  const p = snap.data();

  const mm = create('div', { class: 'modal hidden fullscreen' });
  const card = create('div', { class: 'card paper' });

  let medsRows = "";

// 1️⃣ NORMAL medicines
(p.medicines || []).forEach(line => {
  const parts = line.split('|').map(s => s.trim());

  medsRows += `
    <tr>
      <td>${escapeHtml(parts[0] || '')}</td>
      <td>${escapeHtml(parts[1] || '')}</td>
      <td>${escapeHtml(parts[3] || parts[2] || '')}</td>
      <td>—</td>
    </tr>
  `;
});

// 2️⃣ PHARMACY CHANGES (OLD ❌ → NEW ✅)
if (p.pharmacyAction?.changes?.length) {
  p.pharmacyAction.changes.forEach(change => {
    medsRows += `
      <tr>
        <td>
          <del style="color:#c0392b">
            ${escapeHtml(change.old)}
          </del><br>
          <strong style="color:#27ae60">
            ${escapeHtml(change.new)}
          </strong>
        </td>
        <td colspan="3" class="muted">
          Pharmacy substitution (approved)
        </td>
      </tr>
    `;
  });
}

  card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h2>Prescription</h2>
      <button class="btn small ghost" id="closePresView">Close</button>
    </div>

    <header class="pres-header">
      <div class="hospital">
        <div class="h-name">City Health Clinic</div>
        <div class="h-sub muted">General & Specialized Care</div>
      </div>
      <div class="doc-meta">
        <div class="doc-name">${escapeHtml(p.doctorName)}</div>
        <div class="pres-meta muted">
          Date: ${p.createdAt?.toDate?.().toLocaleDateString() || ''}
          · ID: ${prescriptionId.slice(0, 6).toUpperCase()}
        </div>
      </div>
    </header>

    <section class="patient-block">
      <div><strong>Patient:</strong> ${escapeHtml(p.patientName)}</div>
      <div><strong>Ref:</strong> OPD-${prescriptionId.slice(0,4)}</div>
    </section>

    <section class="meds-block">
      <table class="med-table">
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Dosage</th>
            <th>Duration</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${medsRows || `<tr><td colspan="4" class="muted">No medicines</td></tr>`}
        </tbody>
      </table>
    </section>

    <section class="advice-block">
      <h4>Advice</h4>
      <p class="muted">${escapeHtml(p.diagnosis || 'Follow doctor instructions')}</p>
    </section>

    ${
      p.qr
        ? `<div style="margin-top:20px;display:flex;justify-content:flex-end">
             <img src="${p.qr}" style="width:160px;height:160px"/>
           </div>`
        : ''
    }
  `;

  mm.appendChild(card);
  document.getElementById('modalsRoot').appendChild(mm);

  card.querySelector('#closePresView').onclick = () => hideModal(mm);
  showModal(mm);
}

function doSearch(q){ if(!q) return; if(/\d/.test(q)) { document.querySelector('#menuList .nav-item[data-view="patients"]').click(); $('#filterPatient').value=q; filterPatients(q); } else { document.querySelector('#menuList .nav-item[data-view="appointments"]').click(); $('#filterAppt').value=q; filterAppts(q); } }
function filterAppts(q){ $$('#apptBody tr').forEach(r=> r.style.display = r.innerText.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'); }
function filterPatients(q){ $$('#patientsList .card').forEach(c=> c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'); }
function filterPres(q){ $$('#presList .card').forEach(c=> c.style.display = c.innerText.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'); }

async function handleDocumentUpload(file) {
  console.log("📤 Upload started:", file.name);
  if (!file || !currentDoctorId) return;

  try {
    const safeName = file.name.replace(/\s+/g, '_');
    const path = `documents/${currentDoctorId}/${Date.now()}_${safeName}`;

    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(storageRef);
    console.log("📄 Writing document to Firestore");

    await addDoc(collection(db, "documents"), {
      doctorId: currentDoctorId,
      patientName: "General",
      fileName: file.name,
      fileUrl,
      type: file.type.includes("pdf") ? "PDF" : "Image",
      createdAt: serverTimestamp()
    });

    showToast("Document uploaded");
    loadDocuments();

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert("Failed to upload document");
  }
}

/* animate counters */
function animateCounters(){
  const els = [$('#statToday'), $('#statPres'), $('#statPatients')].filter(Boolean);
  els.forEach(el => { 
    el.classList.add('counter-up'); 
    setTimeout(()=> el.classList.remove('counter-up'), 900); 
  });
}

// Global functions for potential external use/debugging (optional)
window.openCreatePrescriptionModal = openCreatePrescriptionModal;
window.openPatientModal = openPatientModal;
window.openPatientHistory = openPatientHistory;
window.openQRScannerModal = openQRScannerModal;

// 🔓 Expose functions globally (REQUIRED)
window.loadAppointments = loadAppointments;
window.setupAppointmentNotifications = setupAppointmentNotifications;
window.loadPatients = loadPatients;
window.loadPrescriptions = loadPrescriptions;
window.loadChatList = loadChatList;
window.loadDocuments = loadDocuments;
window.addEventListener('popstate', () => {
  document.querySelectorAll('.modal.show').forEach(m => hideModal(m));
});

window.showToast = showToast;
})(); // End IIFE

