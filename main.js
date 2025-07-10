import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, query, orderBy,
  serverTimestamp, addDoc, onSnapshot, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  // DOM элементы
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  const loginForm = document.getElementById('loginForm');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const mainLayout = document.getElementById('mainLayout');
  const groupList = document.getElementById('groupList');
  const dmList = document.getElementById('dmList'); // для будущих ЛС
  const groupNameDisplay = document.getElementById('groupNameDisplay');
  const messagesDiv = document.getElementById('messages');
  const chatInputForm = document.getElementById('chatInput');
  const messageInput = document.getElementById('messageInput');
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

  // Предустановленные группы
  const groups = [
    { name: "aboba global", id: "aboba_global", password: null },
    { name: "закрытая 1", id: "private_1", password: "1234" },
    { name: "закрытая 2", id: "private_2", password: "abcd" }
  ];

  let currentUser = null;
  let profilesCache = {};
  let selectedGroupId = null;
  let unsubscribeMessages = null;

  // === Сплэш (показать 2.5 секунды, потом перейти в приложение)
  setTimeout(() => {
    splash.style.display = 'none';
    app.style.display = 'flex';
  }, 2500);

  // === Слежение за авторизацией
  onAuthStateChanged(auth, async user => {
    if (user) {
      currentUser = user;
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      mainLayout.style.display = 'flex';
      profileBtn.style.display = 'block';
      renderGroupList();
      // Автоматически зайти в первую группу (чтобы чат показывался)
      if (!selectedGroupId) joinGroup(groups[0]);
    } else {
      currentUser = null;
      if (unsubscribeMessages) unsubscribeMessages();
      loginForm.style.display = 'block';
      mainLayout.style.display = 'none';
      profileBtn.style.display = 'none';
      messagesDiv.innerHTML = '';
      groupNameDisplay.textContent = '';
      selectedGroupId = null;
    }
  });

  // === Кнопки логина/логаута
  googleLoginBtn.onclick = () => signInWithPopup(auth, provider);
  logoutBtn.onclick = async () => {
    await signOut(auth);
    location.reload();
  };

  // === Загрузка или создание профиля пользователя
  async function loadOrCreateProfile() {
    const ref = doc(db, 'profiles', currentUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        nick: currentUser.displayName || "Безымянный",
        avatar: currentUser.photoURL || 'https://i.imgur.com/4AiXzf8.png',
        color: '#ffffff',
        status: ''
      });
    }
    const data = (await getDoc(ref)).data();
    profileNick.value = data.nick;
    profileAvatar.value = data.avatar;
    profileColor.value = data.color || '#ffffff';
    profileStatus.value = data.status || '';
    statusCounter.textContent = `Осталось ${80 - (data.status?.length || 0)}`;
  }

  // === Сохранение профиля
  profileForm.onsubmit = async e => {
    e.preventDefault();
    await setDoc(doc(db, 'profiles', currentUser.uid), {
      nick: profileNick.value.trim() || "Безымянный",
      avatar: profileAvatar.value.trim() || 'https://i.imgur.com/4AiXzf8.png',
      color: profileColor.value || '#ffffff',
      status: profileStatus.value.trim().substring(0, 80)
    });
    profilePanel.style.display = 'none';
  };

  // Обновление счетчика символов в статусе
  profileStatus.oninput = () => {
    statusCounter.textContent = `Осталось ${80 - profileStatus.value.length}`;
  };

  // Переключение панели профиля
  profileBtn.onclick = () => {
    profilePanel.style.display = profilePanel.style.display === 'block' ? 'none' : 'block';
  };

  // === Рендер списка групп
  function renderGroupList() {
    groupList.innerHTML = '';
    groups.forEach(g => {
      const btn = document.createElement('button');
      btn.textContent = g.name;
      btn.className = 'group-btn';
      if (selectedGroupId === g.id) btn.classList.add('active');
      btn.onclick = () => joinGroup(g);
      groupList.append(btn);
    });
  }

  // === Присоединение к группе с проверкой пароля
  async function joinGroup(g) {
    if (g.password) {
      const pass = prompt(`Введите пароль для группы "${g.name}"`);
      if (pass !== g.password) {
        alert("Неверный пароль");
        return;
      }
    }
    selectedGroupId = g.id;
    groupNameDisplay.textContent = g.name;
    if (unsubscribeMessages) unsubscribeMessages();
    startChat();
    renderGroupList();
  }

  // === Форматирование времени
  function formatTime(dt) {
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // === Форматирование даты
  function formatDate(dt) {
    const d = new Date(dt);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (d.toDateString() === now.toDateString()) return 'Сегодня';
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString();
  }

  // === Запуск чата, подписка на обновления сообщений
  async function startChat() {
    messagesDiv.innerHTML = '';
    if (!selectedGroupId) return;

    const q = query(
      collection(db, 'groups', selectedGroupId, 'messages'),
      orderBy('createdAt')
    );

    unsubscribeMessages = onSnapshot(q, snap => {
      messagesDiv.innerHTML = '';
      let lastDate = '';
      snap.forEach(docSnap => {
        const m = docSnap.data();
        const dt = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
        const dateStr = dt.toDateString();

        if (dateStr !== lastDate) {
          const dd = document.createElement('div');
          dd.className = 'date-divider';
          dd.textContent = formatDate(dt);
          messagesDiv.append(dd);
          lastDate = dateStr;
        }

        const md = document.createElement('div');
        md.className = m.type === 'server' ? 'msg server' : 'msg';

        if (m.type === 'server') {
          md.textContent = m.text;
        } else {
          md.innerHTML = `
            <div class="avatar" title="${m.nick}"></div>
            <div class="content">
              <span class="username" style="color:${m.color || '#fff'}">${m.nick}</span>
              <span class="text">${escapeHtml(m.text)}</span>
              <span class="msg-time">${formatTime(dt)}</span>
            </div>
          `;
          md.querySelector('.avatar').style.backgroundImage = `url(${m.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
        }
        messagesDiv.append(md);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }

  // === Отправка сообщения
  chatInputForm.onsubmit = async e => {
    e.preventDefault();
    if (!messageInput.value.trim()) return;
    if (!selectedGroupId) {
      alert('Выберите группу');
      return;
    }
    const profileSnap = await getDoc(doc(db, 'profiles', currentUser.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};
    await addDoc(
      collection(db, 'groups', selectedGroupId, 'messages'),
      {
       type: 'user',
uid: currentUser.uid,
nick: profile.nick || "Безымянный",
avatar: profile.avatar || 'https://i.imgur.com/4AiXzf8.png',
color: profile.color || '#ffffff',
text: messageInput.value.trim(),
createdAt: serverTimestamp()
}
);
messageInput.value = '';
};

// Защита от XSS
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[match]));
}
});
