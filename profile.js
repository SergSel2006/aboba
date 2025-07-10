import { db } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let currentUser = null;

export function setCurrentUser(user) {
  currentUser = user;
}

export function getCurrentUser() {
  return currentUser;
}

export async function loadOrCreateProfile() {
  if (!currentUser) throw new Error('currentUser не установлен!');

  const profileRef = doc(db, 'profiles', currentUser.uid);
  const snap = await getDoc(profileRef);

  if (!snap.exists()) {
    await setDoc(profileRef, {
      nick: currentUser.displayName || 'Безымянный',
      avatar: currentUser.photoURL || 'https://i.imgur.com/4AiXzf8.png',
      color: '#ffffff',
      status: ''
    });
  }

  const data = (await getDoc(profileRef)).data();

  document.getElementById('profileNick').value = data.nick;
  document.getElementById('profileAvatar').value = data.avatar;
  document.getElementById('profileColor').value = data.color;
  document.getElementById('profileStatus').value = data.status;
  document.getElementById('statusCounter').textContent = `Осталось ${80 - data.status.length}`;
}

export function setupProfileUI() {
  const profileBtn = document.getElementById('profileBtn');
  const profilePanel = document.getElementById('profilePanel');
  const profileForm = document.getElementById('profileForm');
  const profileStatus = document.getElementById('profileStatus');

  profileBtn.onclick = () => {
    profilePanel.style.display = profilePanel.style.display === 'block' ? 'none' : 'block';
  };

  profileStatus.oninput = () => {
    document.getElementById('statusCounter').textContent =
      `Осталось ${80 - profileStatus.value.length}`;
  };

  profileForm.onsubmit = async e => {
    e.preventDefault();

    if (!currentUser) {
      alert('Пользователь не авторизован');
      return;
    }

    await setDoc(doc(db, 'profiles', currentUser.uid), {
      nick: document.getElementById('profileNick').value,
      avatar: document.getElementById('profileAvatar').value,
      color: document.getElementById('profileColor').value,
      status: document.getElementById('profileStatus').value.slice(0, 80)
    });

    profilePanel.style.display = 'none';
  };
}

