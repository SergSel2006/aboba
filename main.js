import { db } from './firebase-config.js';

import {
  collection, doc, getDoc, query, orderBy, serverTimestamp, addDoc, onSnapshot, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  const splashMain = document.getElementById('splashMain');
  const splashSubs = document.getElementById('splashSubs');
  const splash = document.getElementById('splash');
  const appDiv = document.getElementById('app');
  const loginForm = document.getElementById('loginForm');
  const chatLayout = document.getElementById('chatLayout');
  const groupList = document.getElementById('groupList');
  const groupNameDisplay = document.getElementById('groupNameDisplay');
  const messagesDiv = document.getElementById('messages');
  const chatInputForm = document.getElementById('chatInput');
  const messageInput = document.getElementById('messageInput');
  const loginMsg = document.getElementById('loginMsg');
  const profileBtn = document.getElementById('profileBtn');
  const profilePanel = document.getElementById('profilePanel');
  const profileForm = document.getElementById('profileForm');
  const profileNick = document.getElementById('profileNick');
  const profileAvatar = document.getElementById('profileAvatar');
  const profileColor = document.getElementById('profileColor');
  const profileStatus = document.getElementById('profileStatus');
  const statusCounter = document.getElementById('statusCounter');
  const logoutBtn = document.getElementById('logoutBtn');

  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  // Группы с паролями
  const groups = [
    { name: "aboba global", id: "aboba_global", password: null },
    { name: "закрытая 1", id: "private_1", password: "1234" },
    { name: "закрытая 2", id: "private_2", password: "abcd" }
  ];

  let currentUser = null;
  let profilesCache = {};
  let selectedGroupId = "aboba_global";
  let unsubscribeMessages = null;

  // Сплэш и тексты
  const splashTexts = ["абобушка", "Типа ДС для своих", "Ты знаешь Комп Мастера?", "🅰️🅱️🅾️🅱️🅰️", "окак", "#кириллнечитер", "ML+RRR", "йоу", "абобус", "лабобу", "ладно", "абобно"];
  let dotCount = 0;
  const splashDuration = 3000 + Math.random() * 3000;

  const dotInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    splashMain.innerText = `абоба${'.'.repeat(dotCount)}`;
    splashSubs.innerText = splashTexts[Math.floor(Math.random() * splashTexts.length)];
  }, 1700);

  setTimeout(() => {
    clearInterval(dotInterval);
    splash.style.display = 'none';
    appDiv.style.display = 'flex';
    loginForm.style.display = 'block';
  }, splashDuration);

  // Аутентификация и профиль
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      chatLayout.style.display = 'flex';
      profileBtn.style.display = 'block';
      startChat();
      renderGroupList();
    } else {
      loginForm.style.display = 'block';
      chatLayout.style.display = 'none';
      profileBtn.style.display = 'none';
    }
  });

  googleLoginBtn.onclick = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      currentUser = result.user;
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      chatLayout.style.display = 'flex';
      profileBtn.style.display = 'block';
      renderGroupList();
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

  // Рендер списка групп
  function renderGroupList() {
    groupList.innerHTML = '';
    groups.forEach(group => {
      const item = document.createElement('div');
      item.className = 'group-item';
      item.textContent = `# ${group.name}`;
      if (group.id === selectedGroupId) item.classList.add('active');

      item.onclick = async () => {
        if (group.password) {
          const pass = prompt(`Введите пароль для группы "${group.name}"`);
          if (pass !== group.password) {
            alert("Неверный пароль");
            return;
          }
        }
        if (unsubscribeMessages) unsubscribeMessages(); // отписываемся от старого чата
        selectedGroupId = group.id;
        renderGroupList();
        startChat();
      };

      groupList.appendChild(item);
    });
  }

  // Форматирование времени и даты
  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(date) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === now.toDateString()) return "Сегодня";
    if (date.toDateString() === yesterday.toDateString()) return "Вчера";
    return date.toLocaleDateString();
  }

  // Загрузка и рендер сообщений
  async function startChat() {
    messagesDiv.innerHTML = '';
    groupNameDisplay.textContent = `# ${groups.find(g => g.id === selectedGroupId).name}`;

    const messagesQuery = query(
      collection(db, "groups", selectedGroupId, "messages"),
      orderBy("createdAt")
    );

    unsubscribeMessages = onSnapshot(messagesQuery, async (snapshot) => {
      messagesDiv.innerHTML = '';

      let lastDate = null;

      for (const docSnap of snapshot.docs) {
        const msg = docSnap.data();

        // Добавляем разделитель по дате
        const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
        if (!lastDate || msgDate.toDateString() !== lastDate.toDateString()) {
          const dateDivider = document.createElement('div');
          dateDivider.className = 'date-divider';
          dateDivider.textContent = formatDate(msgDate);
          messagesDiv.appendChild(dateDivider);
          lastDate = msgDate;
        }

        // Создаем элемент сообщения
        const msgDiv = document.createElement('div');
        msgDiv.className = 'msg';

        // Серверные сообщения
        if (msg.type === 'server') {
          msgDiv.classList.add('server');
          msgDiv.textContent = msg.text;
          messagesDiv.appendChild(msgDiv);
          continue;
        }

        // Пользовательские
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.style.backgroundImage = `url(${msg.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
        avatarDiv.title = msg.nick;

        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.textContent = msg.nick;

        const textSpan = document.createElement('span');
        textSpan.textContent = msg.text;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'msg-time';
        timeSpan.textContent = formatTime(msgDate);

        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(usernameSpan);
        msgDiv.appendChild(textSpan);
        msgDiv.appendChild(timeSpan);

        messagesDiv.appendChild(msgDiv);
      }

      // Скролл вниз
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }

  // Отправка сообщения
  chatInputForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!messageInput.value.trim()) return;

    const profileSnap = await getDoc(doc(db, "profiles", currentUser.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    const msgData = {
      uid: currentUser.uid,
      nick: profile.nick || "Безымянный",
      avatar: profile.avatar || 'https://i.imgur.com/4AiXzf8.png',
      color: profile.color || '#ffffff',
      text: messageInput.value.trim(),
      createdAt: serverTimestamp(),
      type: 'user'
    };

    await addDoc(collection(db, "groups", selectedGroupId, "messages"), msgData);
    messageInput.value = '';
  };

});
