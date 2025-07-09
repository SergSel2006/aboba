// main.js — обновлённый, рабочий

// Firebase
import { db } from './firebase-config.js';

import {
  collection, doc, getDoc, getDocs, query, where, onSnapshot,
  updateDoc, arrayUnion, addDoc, orderBy, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// DOM-элементы
const splashMain = document.getElementById('splashMain');
const splashSubs = document.getElementById('splashSubs');
const appDiv = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const chatDiv = document.getElementById('chat');
const messagesDiv = document.getElementById('messages');
const chatInputForm = document.getElementById('chatInput');
const messageInput = document.getElementById('messageInput');
const loginMsg = document.getElementById('loginMsg');
const serverMsgPanel = document.getElementById('serverMsgPanel');
const serverMsgInput = document.getElementById('serverMsgInput');
const sendServerMsgBtn = document.getElementById('sendServerMsgBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');

const profileBtn = document.getElementById('profileBtn');
const profilePanel = document.getElementById('profilePanel');
const profileForm = document.getElementById('profileForm');
const profileNick = document.getElementById('profileNick');
const profileAvatar = document.getElementById('profileAvatar');
const profileColor = document.getElementById('profileColor');
const profileStatus = document.getElementById('profileStatus');
const statusCounter = document.getElementById('statusCounter');
const logoutBtn = document.getElementById('logoutBtn');

const userProfileModal = document.getElementById('userProfileModal');
const userModalAvatar = document.getElementById('userModalAvatar');
const userModalNick = document.getElementById('userModalNick');
const userModalStatus = document.getElementById('userModalStatus');
const closeProfileModal = document.getElementById('closeProfileModal');

let currentUser = null;
let profilesCache = {};

closeProfileModal.onclick = () => {
  userProfileModal.style.display = 'none';
};

function showUserProfileModal(uid) {
  const prof = profilesCache[uid];
  if (!prof) return;

  userModalAvatar.style.backgroundImage = `url(${prof.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
  userModalNick.textContent = prof.nick || 'Безымянный';
  userModalNick.style.color = prof.color || '#fff';
  userModalStatus.textContent = prof.status || 'Нет статуса';

  userProfileModal.style.display = 'block';
}

profileBtn.style.display = 'none';

const splashTexts = ["абобушка", "Типа ДС для своих", "Ты знаешь Комп Мастера?", "🅰️🅱️🅾️🅱️🅰️", "окак", "#кириллнечитер", "ML+RRR", "йоу", "абобус", "лабобу", "ладно", "абобно"];
let dotCount = 0;
const splashDuration = 3000 + Math.random() * 3000;

const auth = getAuth();
const provider = new GoogleAuthProvider();

const dotInterval = setInterval(() => {
  dotCount = (dotCount + 1) % 4;
  splashMain.innerText = `абоба${'.'.repeat(dotCount)}`;
  splashSubs.innerText = splashTexts[Math.floor(Math.random() * splashTexts.length)];
}, 1700);

setTimeout(() => {
  clearInterval(dotInterval);
  splashMain.parentElement.style.display = 'none';
  appDiv.style.display = 'flex';
}, splashDuration);

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadOrCreateProfile();
    loginForm.style.display = 'none';
    chatDiv.style.display = 'flex';
    profileBtn.style.display = 'block';
    if (currentUser.displayName === "Campie") serverMsgPanel.style.display = 'block';
    startChat();
  }
});

googleLoginBtn.onclick = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    await loadOrCreateProfile();
    loginForm.style.display = 'none';
    chatDiv.style.display = 'flex';
    profileBtn.style.display = 'block';
    if (currentUser.displayName === "Campie") serverMsgPanel.style.display = 'block';
    startChat();
  } catch (error) {
    loginMsg.textContent = "Ошибка входа: " + error.message;
  }
};

logoutBtn.onclick = async () => {
  await signOut(auth);
  location.reload();
};

async function loadOrCreateProfile() {
  const profileRef = doc(db, "profiles", currentUser.uid);
  const snap = await getDoc(profileRef);

  if (!snap.exists()) {
    await setDoc(profileRef, {
      nick: currentUser.displayName || "Безымянный",
      avatar: currentUser.photoURL || 'https://i.imgur.com/4AiXzf8.png',
      color: '#ffffff',
      status: ''
    });
  }

  await refreshProfileUI();
}

async function refreshProfileUI() {
  const snap = await getDoc(doc(db, "profiles", currentUser.uid));
  const data = snap.data();
  profileNick.value = data.nick;
  profileAvatar.value = data.avatar;
  profileColor.value = data.color || '#ffffff';
  profileStatus.value = data.status || '';
  statusCounter.textContent = `Осталось ${80 - profileStatus.value.length} символов`;
}

profileForm.onsubmit = async (e) => {
  e.preventDefault();
  const updatedProfile = {
    nick: profileNick.value.trim() || "Безымянный",
    avatar: profileAvatar.value.trim() || 'https://i.imgur.com/4AiXzf8.png',
    color: profileColor.value || '#ffffff',
    status: profileStatus.value.trim().slice(0, 80)
  };
  await setDoc(doc(db, "profiles", currentUser.uid), updatedProfile);
};

profileStatus.oninput = () => {
  const remaining = 80 - profileStatus.value.length;
  statusCounter.textContent = `Осталось ${remaining} символов`;
};

profileBtn.onclick = () => {
  profilePanel.style.display = profilePanel.style.display === 'block' ? 'none' : 'block';
};

chatInputForm.onsubmit = async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  const userProfile = profilesCache[currentUser.uid] || {};
  try {
    await addDoc(collection(db, "messages"), {
      uid: currentUser.uid,
      nick: userProfile.nick || "Безымянный",
      avatar: userProfile.avatar || 'https://i.imgur.com/4AiXzf8.png',
      color: userProfile.color || '#ffffff',
      text,
      created: serverTimestamp(),
      isServerMessage: false
    });
    messageInput.value = '';
  } catch (err) {
    console.error("Ошибка отправки:", err);
  }
};

sendServerMsgBtn.onclick = async () => {
  const text = serverMsgInput.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "messages"), {
      text,
      isServerMessage: true,
      created: serverTimestamp()
    });
    serverMsgInput.value = '';
  } catch (err) {
    console.error("Ошибка серверного сообщения:", err);
  }
};

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function startChat() {
  onSnapshot(collection(db, "profiles"), (snap) => {
    profilesCache = {};
    snap.forEach(doc => profilesCache[doc.id] = doc.data());
  });

  const q = query(collection(db, "messages"), orderBy("created", "asc"));
  let lastDateStr = null;

  onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    lastDateStr = null;

    snapshot.forEach(doc => {
      const d = doc.data();
      const createdDate = d.created ? d.created.toDate() : new Date();
      const dateStr = createdDate.toDateString();

      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        const dateDiv = document.createElement('div');
        dateDiv.classList.add('date-divider');
        dateDiv.textContent = formatDate(createdDate);
        messagesDiv.appendChild(dateDiv);
      }

      const div = document.createElement('div');
      div.classList.add('msg');

      if (d.isServerMessage) {
        div.classList.add('server');
        div.textContent = d.text;
      } else {
        const prof = profilesCache[d.uid] || d;

        div.style.backgroundColor = '#2a2a2a';

        const ava = document.createElement('div');
        ava.className = 'avatar';
        ava.style.backgroundImage = `url(${prof.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
        ava.style.cursor = 'pointer';
        ava.onclick = () => showUserProfileModal(d.uid);

        const content = document.createElement('div');
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.maxWidth = '100%';

        const name = document.createElement('div');
        name.className = 'username';
        name.textContent = prof.nick || 'Безымянный';
        name.style.color = prof.color || '#fff';

        const text = document.createElement('div');
        text.textContent = d.text;

        const time = document.createElement('div');
        time.className = 'msg-time';
        time.textContent = formatTime(createdDate);
        time.style.marginLeft = 'auto';
        time.style.fontSize = '0.75rem';
        time.style.color = '#aaa';

        content.appendChild(name);
        content.appendChild(text);

        div.appendChild(ava);
        div.appendChild(content);
        div.appendChild(time);
      }

      messagesDiv.appendChild(div);
    });

    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 0);
  });
}
