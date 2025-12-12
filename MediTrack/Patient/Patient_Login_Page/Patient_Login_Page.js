/* Patient login interactive logic (client-side + Firebase OAuth for Google/Facebook/Twitter)
   - Save this as Patient_Login_Page.js next to the HTML/CSS files.
   - IMPORTANT: enable providers in Firebase console and set correct OAuth credentials & Redirect URIs.
*/

/* ============================
   DOM helpers & toast
   ============================ */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const toast = (msg, t = 2000) => {
  const el = document.getElementById('toast');
  if (!el) return console.warn('Toast missing:', msg);
  el.innerText = msg;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  el.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.setAttribute('aria-hidden', 'true');
  }, t);
};

/* ============================
   Firebase config & loader
   - I used your project config you posted earlier (meditrack-1a325).
   - If you want to use a different project, replace(firebaseConfig) below.
   - Make sure Google, Facebook, Twitter providers are enabled in Firebase Console.
   ============================ */

/* Replace with your own firebaseConfig if needed */
const firebaseConfig = {
  apiKey: "AIzaSyBN7f6nmjr4xg3mW4e0X5E_loNVlXvmpWs",
  authDomain: "meditrack-1a325.firebaseapp.com",
  projectId: "meditrack-1a325",
  storageBucket: "meditrack-1a325.firebasestorage.app",
  messagingSenderId: "203548219971",
  appId: "1:203548219971:web:aad75f729aa5d4f1eb92f6",
  measurementId: "G-3XWDM6VHS4"
};

async function loadFirebase() {
  if (window.firebase) return; // already loaded
  await new Promise((resolve) => {
    const s1 = document.createElement('script');
    s1.src = "https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js";
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js";
      s2.onload = () => resolve();
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  });

  try {
    window.firebaseApp = firebase.initializeApp(firebaseConfig);
    window.firebaseAuth = firebase.auth();
    console.info('Firebase initialised.');
  } catch (e) {
    console.warn('Firebase init failed:', e);
  }
}

// load firebase in background (non-blocking)
loadFirebase().catch((e) => console.warn('Firebase load error', e));

/* ============================
   UI wiring: forms, toggles, navigation
   ============================ */
const loginForm = $('#loginForm');
const signupForm = $('#signupForm');
const forgotForm = $('#forgotForm');

$('#show-signup').addEventListener('click', (e) => { e.preventDefault(); showForm('signup'); });
$('#show-login').addEventListener('click', (e) => { e.preventDefault(); showForm('login'); });
$('#show-forgot').addEventListener('click', (e) => { e.preventDefault(); showForm('forgot'); });
$('#forgot-cancel').addEventListener('click', (e) => { e.preventDefault(); showForm('login'); });

function showForm(name) {
  $$('.auth-form').forEach(f => f.classList.remove('active-form'));
  if (name === 'signup') {
    signupForm.classList.add('active-form');
    $('#auth-heading').innerText = 'Join MediTrack';
    $('#auth-sub').innerHTML = 'Create your MediTrack account to manage your health';
  } else if (name === 'forgot') {
    forgotForm.classList.add('active-form');
    $('#auth-heading').innerText = 'Reset password';
    $('#auth-sub').innerHTML = 'We will send a link to your email to reset password';
  } else {
    loginForm.classList.add('active-form');
    $('#auth-heading').innerText = 'Welcome back';
    $('#auth-sub').innerHTML = 'Login to continue to <strong>⚕️ MediTrack</strong>';
  }
  setTimeout(() => { const focusEl = document.querySelector('.auth-form.active-form input'); if (focusEl) focusEl.focus(); }, 120);
}

/* password show/hide wiring */
function wireEye(toggleId, inputId) {
  const t = $(toggleId);
  if (!t) return;
  const input = $(inputId);
  t.addEventListener('click', toggleInput);
  t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleInput(); } });
  function toggleInput() {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    t.classList.toggle('bx-eye');
    t.classList.toggle('bx-eye-slash');
  }
}
wireEye('#toggle-login-eye', '#loginPassword');
wireEye('#toggle-signup-eye', '#signupPassword');

/* forms: mock email/password flows (we'll keep this local for now) */
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const pass = $('#loginPassword').value.trim();
  if (!email || !pass) { toast('Please fill email & password'); return; }

  // If firebase is available and you want to use email/password auth:
  if (window.firebaseAuth && firebaseAuth) {
    // NOTE: you must enable Email/Password sign-in provider in Firebase console
    firebaseAuth.signInWithEmailAndPassword(email, pass).then(() => {
      toast('Logged in. Redirecting…', 1200);
      setTimeout(() => { window.location.href = 'Patient_Dashboard.html'; }, 900);
    }).catch(err => {
      console.warn('Firebase email login err', err);
      toast('Login failed: ' + (err.message || 'check console'));
    });
    return;
  }

  // Fallback mock
  toast('Logged in (mock). Redirecting…', 1200);
  setTimeout(() => { window.location.href = 'Patient_Dashboard.html'; }, 900);
});

signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#signupName').value.trim();
  const email = $('#signupEmail').value.trim();
  const pass = $('#signupPassword').value.trim();
  if (!name || !email || pass.length < 6) { toast('Complete fields. Password ≥ 6 chars'); return; }

  if (window.firebaseAuth && firebaseAuth) {
    // Create user with Firebase Auth (email/password)
    firebaseAuth.createUserWithEmailAndPassword(email, pass).then(async (userCred) => {
      // optionally save profile displayName
      try { await userCred.user.updateProfile({ displayName: name }); } catch(e){/*nonfatal*/}
      toast('Account created. Redirecting…', 1400);
      setTimeout(()=> showForm('login'), 1000);
    }).catch(err => {
      console.warn('Firebase signup err', err);
      toast('Signup failed: ' + (err.message || 'check console'));
    });
    return;
  }

  // fallback mock
  toast('Account created (mock). You can login now', 1800);
  setTimeout(() => { showForm('login'); }, 900);
});

forgotForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#forgotEmail').value.trim();
  if (!email) { toast('Please enter your email'); return; }

  if (window.firebaseAuth && firebaseAuth) {
    firebaseAuth.sendPasswordResetEmail(email).then(() => {
      toast('Reset link sent. Check your email.', 2200);
      setTimeout(() => { showForm('login'); }, 1400);
    }).catch(err => {
      console.warn('Reset err', err);
      toast('Reset failed: ' + (err.message || 'check console'));
    });
    return;
  }

  toast('Reset link sent (mock). Check your email.', 2200);
  setTimeout(() => { showForm('login'); }, 1400);
});

/* ============================
   SOCIAL OAUTH (Google, Facebook, Twitter)
   - These use firebaseAuth.signInWithPopup(provider).
   - Make sure:
     - You enabled the provider in Firebase Console (Auth > Sign-in method).
     - For Facebook/Twitter you configured app IDs/secrets in Firebase console and the provider pages.
     - For FB/Twitter you must configure App Domains & Valid OAuth redirect URIs in provider dev portals.
   ============================ */

$('#btn-google').addEventListener('click', async () => {
  await loadFirebase();
  if (window.firebaseAuth && firebaseAuth) {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await firebaseAuth.signInWithPopup(provider);
      toast('Signed in with Google. Redirecting…', 1200);
      setTimeout(()=> window.location.href = 'Patient_Dashboard.html', 900);
    } catch (err) {
      console.warn('Google sign-in error:', err);
      toast('Google login failed (check console).');
    }
    return;
  }
  window.open('https://accounts.google.com/signin', '_blank');
  toast('Google login opened (mock).');
});

$('#btn-facebook').addEventListener('click', async () => {
  await loadFirebase();
  if (window.firebaseAuth && firebaseAuth) {
    const provider = new firebase.auth.FacebookAuthProvider();
    try {
      await firebaseAuth.signInWithPopup(provider);
      toast('Signed in with Facebook. Redirecting…', 1200);
      setTimeout(()=> window.location.href = 'Patient_Dashboard.html', 900);
    } catch (err) {
      console.warn('Facebook sign-in error:', err);
      toast('Facebook login failed (check console).');
    }
    return;
  }
  window.open('https://www.facebook.com/login', '_blank');
  toast('Facebook login opened (mock).');
});

$('#btn-twitter').addEventListener('click', async () => {
  // Twitter provider is available in Firebase (compat). Ensure Twitter sign-in enabled.
  await loadFirebase();
  if (window.firebaseAuth && firebaseAuth) {
    const provider = new firebase.auth.TwitterAuthProvider();
    try {
      await firebaseAuth.signInWithPopup(provider);
      toast('Signed in with Twitter. Redirecting…', 1200);
      setTimeout(()=> window.location.href = 'Patient_Dashboard.html', 900);
    } catch (err) {
      console.warn('Twitter sign-in error:', err);
      toast('Twitter login failed (check console).');
    }
    return;
  }
  window.open('https://twitter.com/login', '_blank');
  toast('Twitter login opened (mock).');
});

/* ============================
   LINKEDIN & INSTAGRAM BUTTONS
   - LinkedIn & Instagram require server-side token exchange / safe client_secret usage.
   - I provide a graceful fallback and instructions:
     - If you want full LinkedIn/Instagram OAuth, add a small server endpoint that performs the exchange
       and returns a Firebase Custom Token (or completes server-side sign-in).
     - For now, provide a link to their auth page (user will login but you won't get tokens client-side).
   ============================ */

$('#btn-linkedin').addEventListener('click', (e) => {
  // Recommend backend flow — for now open LinkedIn auth doc / login
  toast('LinkedIn requires backend setup. See console for guidance.', 2600);
  console.info('LinkedIn note: Implement server-side OAuth exchange. Options:\n' +
    '- Implement OAuth on server (store client_secret securely), exchange code for access token, then create Firebase Custom Token.\n' +
    '- Or use your backend to handle the full sign-in flow and return authenticated session.\n' +
    'Client-only LinkedIn flows are not secure and often blocked by provider.');
  window.open('https://www.linkedin.com/login', '_blank');
});

$('#btn-instagram').addEventListener('click', (e) => {
  // Instagram Basic Display or Graph API both need server steps.
  toast('Instagram requires backend setup. See console for guidance.', 2600);
  console.info('Instagram note: Instagram login requires server-side exchange per Instagram policy. Consider backend exchange or use Facebook Login to access IG data.');
  window.open('https://www.instagram.com/accounts/login/', '_blank');
});

/* ============================
   Footer small icons (make them same style & color)
   - color them visually to match platform brand (done via CSS class change)
   ============================ */
const styleSmallSocials = () => {
  const ig = $('#btn-instagram'); if (ig) ig.style.background = 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)';
  const tw = $('#btn-twitter'); if (tw) tw.style.background = 'linear-gradient(90deg,#1DA1F2,#1DA1F2)'; tw.style.color = '#fff';
  const ln = $('#btn-linkedin'); if (ln) ln.style.background = 'linear-gradient(90deg,#0077B5,#0077B5)'; ln.style.color = '#fff';
};
styleSmallSocials();

/* ============================
   Optional: enable location for signup (mock)
   ============================ */
$('#enableLocation')?.addEventListener('change', (e) => {
  if (navigator.geolocation && e.target.checked) {
    toast('Requesting location…', 1200);
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      const addr = `Lat:${latitude.toFixed(3)}, Lon:${longitude.toFixed(3)}`;
      $('#signupAddress').value = addr;
      toast('Location added (mock).', 1400);
    }, (err) => {
      toast('Location blocked or unavailable', 1600);
      e.target.checked = false;
    }, { timeout: 8000 });
  }
});

/* ============================
   Small accessibility & UX helpers
   ============================ */
$$('.link-btn').forEach(b => b.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.click(); }));
// Pause big background video on mobile to save battery
(function mobileBgTweak() {
  try {
    const vid = document.getElementById('bgVideo');
    if (!vid) return;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    if (isMobile) { vid.playbackRate = 1.0; /* keep; optionally vid.pause(); */ }
  } catch (e) { }
})();
