/*********************************
 * MS_Dashboard.js (REALTIME)
 *********************************/
console.log("✅ MS_Dashboard.js loaded");

// ===== FIREBASE IMPORTS =====
import { auth, db } from "../../Firebase/Firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { addDoc, collection } from 
"https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


// ===== HELPERS =====
const $ = id => document.getElementById(id);
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');

let currentPrescriptionId = null;
let currentDoctorId = null;
let autoApproveTimer = null;

// ===== AUTH CHECK =====
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = '../Pharmacy_Login_Page/MS_Login.html';
  }
});

// ===== SIDEBAR NAV =====
navItems.forEach(btn => {
  btn.onclick = () => {
    navItems.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    views.forEach(v => v.classList.remove('active-view'));
    document
      .getElementById('view-' + btn.dataset.view)
      .classList.add('active-view');
  };
});

// ===== LOAD PRESCRIPTION (QR / MANUAL) =====
async function loadPrescription(prescriptionId) {
  try {
    const ref = doc(db, "prescriptions", prescriptionId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("❌ Invalid Prescription ID");
      return;
    }

    const data = snap.data();

    if (data.status === "dispensed") {
      alert("⚠️ Prescription already dispensed");
      return;
    }

    currentPrescriptionId = prescriptionId;
    currentDoctorId = data.doctorId;

    // Populate UI
    $('pid').innerText = prescriptionId;
    $('pname').innerText = data.patientName;
    $('dname').innerText = data.doctorName;

    const tbody = $('medsBody');
    tbody.innerHTML = "";

    data.medicines.forEach(line => {
  const parts = line.split('|').map(p => p.trim());

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${parts[0] || '—'}</td>
    <td>${parts[1] || '—'}</td>
    <td>${parts[3] || parts[2] || '—'}</td>
  `;
  tbody.appendChild(tr);
});

    document.querySelector('[data-view="prescription"]').click();

  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
}

// ===== QR SCAN (SIMULATED) =====
let qrScanner;

$('scanQrBtn').onclick = async () => {
  const reader = document.getElementById("qr-reader");
  reader.innerHTML = "<p class='muted'>Opening camera…</p>";

  try {
    qrScanner = new Html5Qrcode("qr-reader");

    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 220 },
      qrText => {
  qrScanner.stop();

  try {
    const url = new URL(qrText);
    const id = url.searchParams.get("id");
    if (!id) throw "Invalid QR";
    loadPrescription(id);
  } catch {
    alert("❌ Invalid prescription QR");
  }
}
    );

  } catch (err) {
    console.error("QR CAMERA ERROR:", err);
    reader.innerHTML = `
      <p class="muted">
        ❌ Camera access blocked<br>
        Use HTTPS or allow camera permission
      </p>
    `;
  }
};

// ===== MANUAL INPUT =====
$('scanBtn').onclick = () => {
  const pid = $('scanInput').value.trim();
  if (!pid) return alert("Enter Prescription ID");
  loadPrescription(pid);
};

// ===== APPROVE & DISPENSE =====
$('approveBtn').onclick = async () => {
  if (!currentPrescriptionId) return;

  if (!confirm("Confirm medicine dispensing?")) return;

  await updateDoc(
    doc(db, "prescriptions", currentPrescriptionId),
    {
      status: "dispensed",
      pharmacyAction: {
        type: "approved",
        approvedAt: serverTimestamp()
      }
    }
  );

  alert("✅ Medicines dispensed\nDoctor notified");
  location.reload();
};

// ===== REQUEST ALTERNATIVE =====
$('altBtn').onclick = async () => {
  if (!currentPrescriptionId) return;

  const reason = prompt("Enter alternative medicine details");
  if (!reason) return;

  const firstRow = document.querySelector('#medsBody tr td');
  const originalMed = firstRow ? firstRow.innerText : "Unknown";
  // 1️⃣ Update prescription
  await updateDoc(
    doc(db, "prescriptions", currentPrescriptionId),
    {
      pharmacyAction: {
        type: "alternative",
        changes: [
        { old: originalMed, new: reason }
      ],
        requestedAt: serverTimestamp()
      }
    }
  );


  $('approveBtn').disabled = true;
  $('approveBtn').innerText = "Waiting for doctor approval";

   // AUTO APPROVE TIMER (30s)
   // 1️⃣ CREATE NOTIFICATION FIRST
await addDoc(collection(db, "notifications"), {
  type: "pharmacy",
  prescriptionId: currentPrescriptionId,
  doctorId: currentDoctorId,
  message: "Pharmacy requested alternative medicine",
  createdAt: serverTimestamp(),
  status: "pending"
});
  autoApproveTimer = setTimeout(async () => {
    const ref = doc(db, "prescriptions", currentPrescriptionId);
    const snap = await getDoc(ref);

    if (
  snap.exists() &&
  snap.data().pharmacyAction?.type === "alternative" &&
  snap.data().pharmacyAction?.approvedAt == null &&
  snap.data().status !== "dispensed"
) {
      await updateDoc(ref, {
        status: "dispensed",
        pharmacyAction: {
          type: "auto-approved",
          approvedAt: serverTimestamp()
        }
      });

      const q = query(
  collection(db, "notifications"),
  where("prescriptionId", "==", currentPrescriptionId),
  where("status", "==", "pending")
);

const snapN = await getDocs(q);
snapN.forEach(n => {
  updateDoc(doc(db, "notifications", n.id), {
    status: "auto-approved",
    resolvedAt: serverTimestamp()
  });
});

      alert("⏱ Auto-approved by system");
      location.reload();
    }
  }, 30000);

  // 3️⃣ LISTEN FOR DOCTOR APPROVAL
onSnapshot(
  doc(db, "prescriptions", currentPrescriptionId),
  snap => {
    const p = snap.data();
    if (p?.pharmacyAction?.type === "approved-by-doctor") {
      alert("✅ Doctor approved alternative");
      clearTimeout(autoApproveTimer);
      location.reload();
    }

if (p?.pharmacyAction?.type === "rejected-by-doctor") {
  alert("❌ Doctor rejected alternative. Please dispense original medicine.");
  clearTimeout(autoApproveTimer);
  $('approveBtn').disabled = false;
  $('approveBtn').innerText = "Approve & Dispense";
}
  }
);

  alert("🔄 Alternative request sent to doctor");
};


// ===== LOGOUT =====
$('logoutBtn').onclick = async () => {
  if (confirm("Logout from pharmacy dashboard?")) {
    await signOut(auth);
    location.href = '../Pharmacy_Login_Page/MS_Login.html';
  }
};

// ===== DARK MODE =====
const toggle = $('themeToggle');
toggle.onchange = () => {
  document.body.classList.toggle('dark', toggle.checked);
  localStorage.setItem(
    'pharmacy-theme',
    toggle.checked ? 'dark' : 'light'
  );
};

if (localStorage.getItem('pharmacy-theme') === 'dark') {
  toggle.checked = true;
  document.body.classList.add('dark');
}
