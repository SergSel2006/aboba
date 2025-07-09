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
  const scrollDownBtn = document.getElementById('scrollDownBtn');

messagesDiv.addEventListener('scroll', () => {
  // Показываем кнопку, если прокручено выше 200px от низа
  const threshold = 200;
  const isScrolledUp = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight > threshold;
  scrollDownBtn.style.display = isScrolledUp ? 'block' : 'none';
});

scrollDownBtn.onclick = () => {
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  scrollDownBtn.style.display = 'none';
};


  (() => {
const auth = getAuth();
let currentUser = null;
let currentGroupId = null;

// DOM
const groupsList = document.getElementById('groupsList');
const joinGroupBtn = document.getElementById('joinGroupBtn');
const joinGroupModal = document.getElementById('joinGroupModal');
const joinGroupForm = document.getElementById('joinGroupForm');
const joinGroupCode = document.getElementById('joinGroupCode');
const joinGroupPassword = document.getElementById('joinGroupPassword');
const joinGroupError = document.getElementById('joinGroupError');
const joinGroupCancel = document.getElementById('joinGroupCancel');
const messagesDiv = document.getElementById('messages');
const chatInputForm = document.getElementById('chatInput');
const messageInput = document.getElementById('messageInput');

// Подключаем слушатель на кнопку "Присоединиться"
joinGroupBtn.onclick = () => {
  joinGroupError.textContent = '';
  joinGroupCode.value = '';
  joinGroupPassword.value = '';
  joinGroupModal.style.display = 'block';
};
joinGroupCancel.onclick = () => {
  joinGroupModal.style.display = 'none';
};

// Простой sha256 через Web Crypto API
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadUserGroups();
  } else {
    currentUser = null;
    groupsList.innerHTML = '';
    messagesDiv.innerHTML = '';
  }
});

async function loadUserGroups() {
  groupsList.innerHTML = 'Загрузка...';
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('members', 'array-contains', currentUser.uid));
  const snapshot = await getDocs(q);

  groupsList.innerHTML = '';
  if (snapshot.empty) {
    groupsList.textContent = 'Пока нет групп, присоединяйся!';
    return;
  }

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const groupId = docSnap.id;
    const btn = document.createElement('button');
    btn.textContent = data.name;
    btn.style.width = '100%';
    btn.style.marginBottom = '8px';
    btn.style.padding = '8px';
    btn.style.background = currentGroupId === groupId ? '#6200ee' : '#333';
    btn.style.color = '#eee';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';

    btn.onclick = () => {
      currentGroupId = groupId;
      highlightSelectedGroup();
      loadMessages(groupId);
    };

    groupsList.appendChild(btn);
  });
}

function highlightSelectedGroup() {
  Array.from(groupsList.children).forEach(btn => {
    btn.style.background = (btn.textContent === getCurrentGroupName()) ? '#6200ee' : '#333';
  });
}

function getCurrentGroupName() {
  for (const btn of groupsList.children) {
    if (btn.style.background === 'rgb(98, 0, 238)' || btn.style.background === '#6200ee') {
      return btn.textContent;
    }
  }
  return null;
}

async function loadMessages(groupId) {
  messagesDiv.innerHTML = 'Загрузка сообщений...';

  const messagesRef = collection(db, 'messages');
  const q = query(messagesRef, where('groupId', '==', groupId), orderBy('created', 'asc'));

  onSnapshot(q, snapshot => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement('div');
      div.textContent = data.text;
      div.style.padding = '8px';
      div.style.marginBottom = '6px';
      div.style.background = '#2a2a2a';
      div.style.borderRadius = '8px';
      div.style.color = '#eee';

      messagesDiv.appendChild(div);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

chatInputForm.onsubmit = async (e) => {
  e.preventDefault();
  if (!messageInput.value.trim() || !currentGroupId) return;

  try {
    await addDoc(collection(db, 'messages'), {
      uid: currentUser.uid,
      text: messageInput.value.trim(),
      created: serverTimestamp(),
      groupId: currentGroupId,
      isServerMessage: false,
    });
    messageInput.value = '';
  } catch (err) {
    console.error('Ошибка отправки сообщения:', err);
  }
};

joinGroupForm.onsubmit = async (e) => {
  e.preventDefault();
  joinGroupError.textContent = '';

  const code = joinGroupCode.value.trim().toLowerCase();
  const password = joinGroupPassword.value.trim();

  if (!code || !password) {
    joinGroupError.textContent = 'Заполни код и пароль.';
    return;
  }

  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('code', '==', code));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    joinGroupError.textContent = 'Группа с таким кодом не найдена.';
    return;
  }

  const groupDoc = snapshot.docs[0];
  const groupData = groupDoc.data();

  const enteredHash = await sha256(password);

  if (enteredHash !== groupData.passwordHash) {
    joinGroupError.textContent = 'Неверный пароль.';
    return;
  }

  // Добавляем пользователя в members, если ещё нет
  if (!groupData.members.includes(currentUser.uid)) {
    await updateDoc(groupDoc.ref, {
      members: arrayUnion(currentUser.uid)
    });
  }

  joinGroupModal.style.display = 'none';

  // Обновляем список групп и грузим новую группу
  await loadUserGroups();
  currentGroupId = groupDoc.id;
  loadMessages(currentGroupId);
};

})();
  
}
