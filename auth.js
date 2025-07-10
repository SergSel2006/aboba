// auth.js
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { loadOrCreateProfile, renderGroupList, startChat, currentUser, setCurrentUser } from './profile.js';

const auth = getAuth();
const provider = new GoogleAuthProvider();

export function initAuth() {
  const loginForm = document.getElementById('loginForm');
  const mainLayout = document.getElementById('mainLayout');
  const profileBtn = document.getElementById('profileBtn');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  onAuthStateChanged(auth, async user => {
    if (user) {
      setCurrentUser(user);
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      mainLayout.style.display = 'flex';
      profileBtn.style.display = 'block';
      renderGroupList();
      startChat();
    } else {
      loginForm.style.display = 'block';
      mainLayout.style.display = 'none';
      profileBtn.style.display = 'none';
    }
  });

  googleLoginBtn.onclick = () => signInWithPopup(auth, provider);
  logoutBtn.onclick = () => signOut(auth);
}
