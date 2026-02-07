/* ======================
   Helpers
====================== */
const $ = s => document.querySelector(s);
const toast = (msg, t = 2200) => {
  const el = $('#toast');
  el.textContent = msg;
  el.style.opacity = 1;
  setTimeout(() => el.style.opacity = 0, t);
};

/* ======================
   Password eye toggle
====================== */
function wireEye(eyeId, inputId){
  const eye = $(eyeId);
  const input = $(inputId);
  if(!eye || !input) return;

  eye.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.classList.toggle('bx-eye');
    eye.classList.toggle('bx-eye-slash');
  });
}

wireEye('#toggle-login-eye', '#loginPassword');
wireEye('#toggle-signup-eye', '#signupPassword');
wireEye('#toggle-confirm-eye', '#confirmPassword');

/* ======================
   Firebase Init (UNCHANGED)
====================== */
const firebaseConfig = {
  apiKey: "AIzaSyBN7f6nmjr4xg3mW4e0X5E_loNVlXvmpWs",
  authDomain: "meditrack-5cc0c.firebaseapp.com",
  projectId: "meditrack-5cc0c",
  storageBucket: "meditrack-5cc0c.firebasestorage.app",
  messagingSenderId: "502198602638",
  appId: "1:502198602638:web:aad75f729aa5d4f1eb92f6"
};

async function loadFirebase(){
  if(window.firebase) return;
  await new Promise(res => {
    const s1 = document.createElement('script');
    s1.src = "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js";
    s1.onload = () => {
      const s2 = document.createElement('script');
s2.src = "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js";
s2.onload = () => {
  const s3 = document.createElement('script');
  s3.src = "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js";
  s3.onload = res;
  document.head.appendChild(s3);
};
document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });
  firebase.initializeApp(firebaseConfig);
  window.auth = firebase.auth();
}
loadFirebase();

/* ======================
   Form switching
====================== */
const loginForm = $('#loginForm');
const signupForm = $('#signupForm');
const forgotForm = $('#forgotForm');

$('#showSignup').onclick = () => {
  loginForm.classList.remove('active-form');
  signupForm.classList.add('active-form');
};

$('#showLogin').onclick = () => {
  signupForm.classList.remove('active-form');
  loginForm.classList.add('active-form');
};

$('#showForgot').onclick = () => {
  loginForm.classList.remove('active-form');
  forgotForm.classList.add('active-form');
};

$('#cancelForgot').onclick = () => {
  forgotForm.classList.remove('active-form');
  loginForm.classList.add('active-form');
};

/* ======================
   Login (Firebase)
====================== */
loginForm.addEventListener('submit', async e => {
   e.preventDefault(); 
  try{ 
    await auth.signInWithEmailAndPassword( 
  $('#loginEmail').value.trim(), 
  $('#loginPassword').value.trim() ); 
  toast('Login successful');
   setTimeout(() => location.href = 'MS_Dashboard.html', 900);
 }
 catch(err){ toast(err.message); 
 } 
});

/* ======================
   Forgot password
====================== */
forgotForm.addEventListener('submit', async e => {
  e.preventDefault();
  try{
    await auth.sendPasswordResetEmail($('#forgotEmail').value.trim());
    toast('Reset link sent');
    $('#cancelForgot').click();
  }catch(err){
    toast(err.message);
  }
});

/* ======================
   Signup (REQUEST ONLY)
====================== */
signupForm.addEventListener('submit', e => {
  e.preventDefault();
  if($('#signupPassword').value !== $('#confirmPassword').value){
    toast('Passwords do not match');
    return;
  }
  toast('Request submitted. Admin will verify.');
  signupForm.reset();
  $('#showLogin').click();
});
