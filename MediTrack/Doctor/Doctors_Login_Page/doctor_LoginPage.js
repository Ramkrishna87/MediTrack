
/****************************************************
 * MediTrack - Doctor Login & Signup System (Firebase)
 ****************************************************/

/*************************************
 * Firebase Configuration & Init
 *************************************/
var firebaseConfig = {
  apiKey: "AIzaSyBuIibcaDVQITxabmh7ZkrVAp9uvCjzfw0",
  authDomain: "meditrack-5cc0c.firebaseapp.com",
  projectId: "meditrack-5cc0c",
  storageBucket: "meditrack-5cc0c.firebasestorage.app",
  messagingSenderId: "502198602638",
  appId: "1:502198602638:web:0a189d9dfba9cc17adb2df",
  measurementId: "G-D4FE4D2PJE"
};

// Initialize Firebase (v8 syntax)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 👁️ Password visibility toggle (SAFE, MODULE-FRIENDLY)
document.addEventListener("click", (e) => {
  const icon = e.target.closest(".eye-icon");
  if (!icon) return;

  const inputId = icon.dataset.target;
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    icon.style.opacity = "0.6";
  } else {
    input.type = "password";
    icon.style.opacity = "1";
  }
});

/****************************************************
 * 👁️ Toggle Password Visibility
 ****************************************************/
// function togglePassword(id, iconRef) {
//   const input = document.getElementById(id);
//   if (input.type === "password") {
//     input.type = "text";
//     iconRef.style.opacity = "0.6";
//   } else {
//     input.type = "password";
//     iconRef.style.opacity = "1";
//   }
// }

window.togglePassword = function (id, iconRef) {
  const input = document.getElementById(id);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    iconRef.style.opacity = "0.6";
  } else {
    input.type = "password";
    iconRef.style.opacity = "1";
  }
};



/****************************************************
 * 📌 Navigation Between Login / Signup / Forgot
 ****************************************************/
function showSignup() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("signupSection").classList.remove("hidden");
}

function showLogin() {
  document.getElementById("signupSection").classList.add("hidden");
  document.getElementById("forgotSection").classList.add("hidden");
  document.getElementById("loginSection").classList.remove("hidden");
}

function showForgot() {
  document.getElementById("loginSection").classList.add("hidden");
  document.getElementById("forgotSection").classList.remove("hidden");
}


/****************************************************
 * 👨‍⚕️ Doctor Login
 ****************************************************/
document.getElementById("doctorLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);

    alert("Login Successful!");

    // Redirect to your Doctor Dashboard
    window.location.href = "../Doctor_Dashboard/Doctor_Dashboard.html";

  } catch (error) {
    console.error("Login Error:", error.message);

    if (error.code === "auth/user-not-found") {
      alert("No account found. Please sign up.");
    } else if (error.code === "auth/wrong-password") {
      alert("Incorrect password!");
    } else {
      alert(error.message);
    }
  }
});


/****************************************************
 * 📝 Doctor Signup (with Firestore Storage)
 ****************************************************/
document.getElementById("doctorSignupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const specialty = document.getElementById("specialty").value.trim();
  const degree = document.getElementById("degree").value.trim();
  const license = document.getElementById("license").value.trim();
  const issuingAuthority = document.getElementById("issuingAuthority").value.trim();
  const dob = document.getElementById("dob").value;
  const location = document.getElementById("location").value.trim();

  try {
    // Create auth user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // Save extra info in Firestore
    await db.collection("doctors").doc(uid).set({
      name,
      email,
      specialty,
      degree,
      license,
      issuingAuthority,
      dob,
      location,
      isVerified: false,  // Admin will verify manually
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Signup Successful! Admin will verify your account.");

    showLogin();

  } catch (error) {
    console.error("Signup Error:", error.message);

    if (error.code === "auth/email-already-in-use") {
      alert("Email already registered!");
    } else if (error.code === "auth/weak-password") {
      alert("Password must be at least 6 characters!");
    } else {
      alert(error.message);
    }
  }
});


/****************************************************
 * 🔑 Forgot Password (Send Email)
 ****************************************************/
document.getElementById("forgotForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("forgotEmail").value.trim();

  try {
    await auth.sendPasswordResetEmail(email);
    alert("Password reset link sent to " + email);
    showLogin();
  } catch (error) {
    console.error("Forgot Password Error:", error);
    alert(error.message);
  }
});
