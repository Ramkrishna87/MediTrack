import { db } from "../Firebase/Firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const viaQR = params.get("via") === "qr";

if (!id) {
  document.body.innerHTML = "Invalid prescription";
}

const snap = await getDoc(doc(db, "prescriptions", id));
if (!snap.exists()) {
  document.body.innerHTML = "Prescription not found";
}

const p = snap.data();
// 🔐 QR EXPIRY CHECK (ONLY FOR QR USERS)
if (viaQR) {
  const now = new Date();
  const expiresAt = p.qrExpiresAt?.toDate?.();

  if (!expiresAt || now > expiresAt) {
    document.body.innerHTML = `
      <div style="padding:40px;text-align:center">
        <h2>Prescription Expired</h2>
        <p class="muted">This QR code is no longer valid.</p>
        <p>Please ask the doctor for an updated prescription.</p>
      </div>
    `;
    throw new Error("QR expired");
  }
}

document.getElementById("pres-id").innerText = id;
document.getElementById("pres-date").innerText =
  p.createdAt?.toDate?.().toLocaleDateString();

document.getElementById("pres-patient").innerText = p.patientName;
document.getElementById("pres-age").innerText =
  p.patientAge || "—";
document.getElementById("pres-sex").innerText =
  p.patientSex || "—";
document.getElementById("doc-name").innerText = p.doctorName;
document.getElementById("clinicName").innerText =
  p.clinicName || "Clinic";
document.getElementById("clinicAddress").innerText =
  p.clinicAddress || "";
document.getElementById("doc-sign").innerText = p.doctorName;

document.getElementById("qrImage").src = p.qr;

const role = localStorage.getItem("role");

// Show edit only to pharmacy
if (role === "pharmacy") {
  document.getElementById("editPresBtn").style.display = "inline-block";
}
const editBtn = document.getElementById("editPresBtn");
if (editBtn) editBtn.style.display = "none";

// Edit click logic
document.getElementById("editPresBtn").addEventListener("click", () => {
  if (role !== "pharmacy") {
    window.location.href =
      "/MediTrack/Pharmacy_Login/login.html?redirect=edit&prescriptionId=" + id;
    return;
  }

  // pharmacy logged in
  window.location.href =
    "/MediTrack/Pharmacy_Dashboard/edit_prescription.html?id=" + id;
});

// medicines
const tbody = document.getElementById("meds-body");

p.medicines.forEach(line => {
  const [name, dose, frequency, duration] =
    line.split('|').map(s => s.trim());

  tbody.innerHTML += `
    <tr>
      <td>${name || ''}</td>
      <td>${dose || ''}</td>
      <td>${duration || ''}</td>
      <td>${frequency || ''}</td>
    </tr>
  `;

// DOWNLOAD BUTTON — ONLY ONCE
document.getElementById("downloadBtn").addEventListener("click", () => {
  window.print();
});

  // Download PDF
document.getElementById("downloadBtn")?.addEventListener("click", () => {
  window.print();
});
});
