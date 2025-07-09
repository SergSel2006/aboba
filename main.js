import { db } from './firebase-config.js';
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
const logoutBtn = document.getElementById('logoutBtn');

const splashTexts = ["абобушка", "Типа ДС для своих", "Ты знаешь Комп Мастера?", "🅰️🅱️🅾️🅱️🅰️", "окак", "#кириллнечитер", "ML+RRR", "йоу", "абобус", "лабобу"];
let dotCount = 0;
const splashDuration = 3000 + Math.random() * 3000;

let currentUser = null;
let profilesCache = {}; // кеш всех профилей

const auth = getAuth();
const provider = new GoogleAuthProvider();

// Сплеш-эффект
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

// Вход и автологин
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadOrCreateProfile();
    loginForm.style.display = 'none';
    chatDiv.style.display = 'flex';
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

// Загрузка или создание профиля в Firestore
async function loadOrCreateProfile() {
  const profileRef = doc(db, "profiles", currentUser.uid);
  const snap = await getDoc(profileRef);

  if (!snap.exists()) {
    // создаём профиль по умолчанию
    await setDoc(profileRef, {
      nick: currentUser.displayName || "Безымянный",
      avatar: currentUser.photoURL || 'https://i.imgur.com/4AiXzf8.png',
      color: '#ffffff'
    });
  }
  await refreshProfileUI();
}

// Обновляем настройки в UI
async function refreshProfileUI() {
  const snap = await getDoc(doc(db, "profiles", currentUser.uid));
  const data = snap.data();
  profileNick.value = data.nick;
  profileAvatar.value = data.avatar;
  profileColor.value = data.color || '#ffffff';
}

// Сохраняем профиль (нажатие сохранить)
profileForm.onsubmit = async (e) => {
  e.preventDefault();
  const updatedProfile = {
    nick: profileNick.value.trim() || "Безымянный",
    avatar: profileAvatar.value.trim() || 'https://i.imgur.com/4AiXzf8.png',
    color: profileColor.value || '#ffffff'
  };
  await setDoc(doc(db, "profiles", currentUser.uid), updatedProfile);
};

// Открытие/закрытие панели профиля
profileBtn.onclick = () => {
  profilePanel.style.display = profilePanel.style.display === 'block' ? 'none' : 'block';
};

// Отправка сообщения
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

// Отправка серверного сообщения
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

// Формат времени "чч:мм"
function formatTime(date) {
  return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Формат даты "Сегодня", "Вчера", или дата
function formatDate(date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return date.toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'});
}

profileBtn.style.display = 'block'; //НАДО ПРОВЕРИТЬ

// Запускаем чат: слушаем сообщения и профили (для обновления цвета/ника)
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

        div.appendChild(ava);
        div.appendChild(name);
        div.appendChild(text);
        div.appendChild(time);
      }

      messagesDiv.appendChild(div);
    });

    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 0);
  });
}
