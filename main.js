import { db } from './firebase-config.js';

import {
  collection, doc, getDoc, getDocs, query, where, onSnapshot,
  updateDoc, arrayUnion, addDoc, orderBy, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  // === Элементы ===
  const splashMain = document.getElementById('splashMain');
  const splashSubs = document.getElementById('splashSubs');
  const appDiv = document.getElementById('app');
  const loginForm = document.getElementById('loginForm');
  const chatDiv = document.getElementById('chatSection');
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

  // Новые для групп
  const groupsList = document.getElementById('groupsList');
  const joinGroupBtn = document.getElementById('joinGroupBtn');
  const joinGroupModal = document.getElementById('joinGroupModal');
  const joinGroupForm = document.getElementById('joinGroupForm');
  const joinGroupCancel = document.getElementById('joinGroupCancel');
  const joinGroupError = document.getElementById('joinGroupError');

  // --- Переменные ---
  let currentUser = null;
  let profilesCache = {};
  let currentGroupId = null;  // активная группа, чтобы фильтровать чат

  // --- Сплэш ---
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

  // --- Авторизация ---
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      chatDiv.style.display = 'flex';
      profileBtn.style.display = 'block';
      if (currentUser.displayName === "Campie") serverMsgPanel.style.display = 'block';
      await loadUserGroups();
      // если есть группы, выбираем первую
      if (groupsList.children.length > 0) {
        currentGroupId = groupsList.children[0].dataset.groupId;
        highlightActiveGroup();
        startChat();
      }
    } else {
      loginForm.style.display = 'block';
      chatDiv.style.display = 'none';
      profileBtn.style.display = 'none';
      serverMsgPanel.style.display = 'none';
      currentUser = null;
      currentGroupId = null;
      profilesCache = {};
      messagesDiv.innerHTML = '';
      groupsList.innerHTML = '';
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
      await loadUserGroups();
      if (groupsList.children.length > 0) {
        currentGroupId = groupsList.children[0].dataset.groupId;
        highlightActiveGroup();
        startChat();
      }
    } catch (error) {
      loginMsg.textContent = "Ошибка входа: " + error.message;
    }
  };

  logoutBtn.onclick = async () => {
    await signOut(auth);
    location.reload();
  };

  // --- Загрузка или создание профиля ---
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

  // --- Группы ---

  // Загрузка групп пользователя
  async function loadUserGroups() {
    groupsList.innerHTML = '';
    if (!currentUser) return;

    // Запрос групп, где ты в members
    const q = query(collection(db, "groups"), where("members", "array-contains", currentUser.uid));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      addGroupToUI(docSnap.id, docSnap.data());
    });
  }

  // Добавляем группу в список слева
  function addGroupToUI(groupId, groupData) {
    const div = document.createElement('div');
    div.textContent = groupData.name || groupId;
    div.dataset.groupId = groupId;
    div.style.padding = '6px 10px';
    div.style.cursor = 'pointer';
    div.style.borderRadius = '6px';
    div.style.marginBottom = '4px';
    div.style.backgroundColor = '#333';

    div.onclick = () => {
      currentGroupId = groupId;
      highlightActiveGroup();
      startChat();
    };

    groupsList.appendChild(div);
  }

  // Подсветка активной группы
  function highlightActiveGroup() {
    Array.from(groupsList.children).forEach(div => {
      if (div.dataset.groupId === currentGroupId) {
        div.style.backgroundColor = '#6200ee';
        div.style.color = '#fff';
      } else {
        div.style.backgroundColor = '#333';
        div.style.color = '#eee';
      }
    });
  }

  // --- Чат ---

  let unsubscribeMessages = null;

  function startChat() {
    if (unsubscribeMessages) unsubscribeMessages();

    if (!currentGroupId) {
      messagesDiv.innerHTML = '<p style="color:#888; padding:20px;">Выбери группу, чтобы увидеть сообщения</p>';
      return;
    }

    messagesDiv.innerHTML = '';

    const messagesRef = collection(db, "groups", currentGroupId, "messages");
    const q = query(messagesRef, orderBy("timestamp"));

    unsubscribeMessages = onSnapshot(q, async (querySnapshot) => {
      messagesDiv.innerHTML = '';
      for (const docSnap of querySnapshot.docs) {
        const msg = docSnap.data();
        await addMessageToUI(msg);
      }
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }

  async function addMessageToUI(msg) {
    // Подгружаем профили, если надо
    if (!profilesCache[msg.uid]) {
      const profSnap = await getDoc(doc(db, "profiles", msg.uid));
      if (profSnap.exists()) {
        profilesCache[msg.uid] = profSnap.data();
      } else {
        profilesCache[msg.uid] = { nick: 'Неизвестный', avatar: '', color: '#ccc', status: '' };
      }
    }

    const prof = profilesCache[msg.uid];

    const div = document.createElement('div');
    div.style.marginBottom = '8px';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.gap = '10px';

    const avatar = document.createElement('div');
    avatar.style.width = '36px';
    avatar.style.height = '36px';
    avatar.style.borderRadius = '50%';
    avatar.style.backgroundImage = `url(${prof.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
    avatar.style.backgroundSize = 'cover';
    avatar.style.backgroundPosition = 'center';
    avatar.style.cursor = 'pointer';
    avatar.title = prof.nick;
    avatar.onclick = () => showUserProfileModal(msg.uid);

    const content = document.createElement('div');
    content.style.flexGrow = '1';

    const nick = document.createElement('b');
    nick.textContent = prof.nick || 'Безымянный';
    nick.style.color = prof.color || '#fff';

    const text = document.createElement('p');
    text.textContent = msg.text;
    text.style.margin = '2px 0 0 0';
    text.style.whiteSpace = 'pre-wrap';

    content.appendChild(nick);
    content.appendChild(text);

    div.appendChild(avatar);
    div.appendChild(content);

    messagesDiv.appendChild(div);
  }

  // Отправка сообщения в чат
  chatInputForm.onsubmit = async (e) => {
    e.preventDefault();
    if (!messageInput.value.trim() || !currentGroupId) return;

    const msg = {
      uid: currentUser.uid,
      text: messageInput.value.trim(),
      timestamp: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "groups", currentGroupId, "messages"), msg);
      messageInput.value = '';
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    }
  };

  // --- Кнопка "Присоединиться" и модалка ---

  joinGroupBtn.onclick = () => {
    joinGroupModal.style.display = 'block';
    joinGroupError.textContent = '';
    joinGroupForm.reset();
  };

  joinGroupCancel.onclick = () => {
    joinGroupModal.style.display = 'none';
    joinGroupError.textContent = '';
  };

  joinGroupForm.onsubmit = async (e) => {
    e.preventDefault();
    const code = document.getElementById('joinGroupCode').value.trim();
    const password = document.getElementById('joinGroupPassword').value;

    if (!code || !password) {
      joinGroupError.textContent = 'Заполни оба поля';
      return;
    }

    try {
      // Проверяем группу
      const groupRef = doc(db, "groups", code);
      const groupSnap = await getDoc(groupRef);

      if (!groupSnap.exists()) {
        joinGroupError.textContent = 'Такой группы нет';
        return;
      }

      const groupData = groupSnap.data();

      if (groupData.password !== password) {
        joinGroupError.textContent = 'Неверный пароль';
        return;
      }

      // Добавляем пользователя в группу (если его там нет)
      if (!groupData.members.includes(currentUser.uid)) {
        await updateDoc(groupRef, {
          members: arrayUnion(currentUser.uid)
        });
      }

      // Обновляем список групп
      await loadUserGroups();

      // Выбираем эту группу
      currentGroupId = code;
      highlightActiveGroup();
      startChat();

      joinGroupModal.style.display = 'none';
    } catch (error) {
      joinGroupError.textContent = 'Ошибка при подключении к группе';
      console.error(error);
    }
  };

  // --- Отправка серверных сообщений (для Campie) ---

  sendServerMsgBtn.onclick = async () => {
    if (!currentGroupId || !serverMsgInput.value.trim()) return;

    try {
      await addDoc(collection(db, "groups", currentGroupId, "messages"), {
        uid: 'server',
        text: serverMsgInput.value.trim(),
        timestamp: serverTimestamp()
      });
      serverMsgInput.value = '';
    } catch (error) {
      alert('Ошибка отправки серверного сообщения');
      console.error(error);
    }
  };

});
