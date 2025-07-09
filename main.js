import { db } from './firebase-config.js';

import {
  collection, doc, getDoc, getDocs, query, where, onSnapshot,
  updateDoc, arrayUnion, addDoc, orderBy, serverTimestamp, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
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
  const groupNameDisplay = document.getElementById('groupNameDisplay');

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

  const groups = [
    { name: "aboba global", password: null },
    { name: "домашка", password: "1234" },
    { name: "секретный клуб", password: "4321" }
  ];

  let currentUser = null;
  let profilesCache = {};
  let currentGroupId = null;
  let unsubChat = null;

  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  // Сплэш
  const splashTexts = ["абобушка", "Типа ДС для своих", "🅰️🅱️🅾️🅱️🅰️", "#кириллнечитер"];
  let dotCount = 0;
  const splashDuration = 2000 + Math.random() * 2000;
  const dotInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    splashMain.innerText = `абоба${'.'.repeat(dotCount)}`;
    splashSubs.innerText = splashTexts[Math.floor(Math.random() * splashTexts.length)];
  }, 1600);
  setTimeout(() => {
    clearInterval(dotInterval);
    splashMain.parentElement.style.display = 'none';
    appDiv.style.display = 'block';
  }, splashDuration);

  closeProfileModal.onclick = () => userProfileModal.style.display = 'none';

  function showUserProfileModal(uid) {
    const prof = profilesCache[uid];
    if (!prof) return;
    userModalAvatar.style.backgroundImage = `url(${prof.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
    userModalNick.textContent = prof.nick || 'Безымянный';
    userModalNick.style.color = prof.color || '#fff';
    userModalStatus.textContent = prof.status || 'Нет статуса';
    userProfileModal.style.display = 'block';
  }

  profileBtn.onclick = () => {
    profilePanel.style.display = profilePanel.style.display === 'block' ? 'none' : 'block';
  };

  logoutBtn.onclick = async () => {
    await signOut(auth);
    location.reload();
  };

  profileForm.onsubmit = async (e) => {
    e.preventDefault();
    const updated = {
      nick: profileNick.value.trim() || "Безымянный",
      avatar: profileAvatar.value.trim() || 'https://i.imgur.com/4AiXzf8.png',
      color: profileColor.value || '#ffffff',
      status: profileStatus.value.trim().slice(0, 80)
    };
    await setDoc(doc(db, "profiles", currentUser.uid), updated);
  };

  profileStatus.oninput = () => {
    statusCounter.textContent = `Осталось ${80 - profileStatus.value.length} символов`;
  };

  googleLoginBtn.onclick = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      currentUser = result.user;
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      showGroupSelector();
    } catch (error) {
      loginMsg.textContent = "Ошибка входа: " + error.message;
    }
  };

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      showGroupSelector();
    }
  });

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
    const newSnap = await getDoc(profileRef);
    const data = newSnap.data();
    profileNick.value = data.nick;
    profileAvatar.value = data.avatar;
    profileColor.value = data.color || '#ffffff';
    profileStatus.value = data.status || '';
    statusCounter.textContent = `Осталось ${80 - profileStatus.value.length} символов`;
  }

  function sanitizeGroupName(name) {
    return name.toLowerCase().replace(/\s+/g, "_");
  }

  function showGroupSelector() {
    const selector = document.createElement('div');
    selector.style.padding = '20px';
    selector.style.textAlign = 'center';
    selector.innerHTML = '<h2>Выбери группу</h2>';
    groups.forEach(g => {
      const btn = document.createElement('button');
      btn.textContent = g.name;
      btn.style.margin = '10px';
      btn.style.padding = '10px 20px';
      btn.style.cursor = 'pointer';
      btn.onclick = async () => {
        if (g.password) {
          const input = prompt(`Пароль для "${g.name}"`);
          if (input !== g.password) {
            alert("Неверный пароль.");
            return;
          }
        }
        currentGroupId = sanitizeGroupName(g.name);
        selector.remove();
        startChat();
      };
      selector.appendChild(btn);
    });
    document.body.appendChild(selector);
  }

  chatInputForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !currentGroupId) return;
    const userProfile = profilesCache[currentUser.uid] || {};
    await addDoc(collection(db, "groups", currentGroupId, "messages"), {
      uid: currentUser.uid,
      nick: userProfile.nick || "Безымянный",
      avatar: userProfile.avatar || 'https://i.imgur.com/4AiXzf8.png',
      color: userProfile.color || '#ffffff',
      text,
      created: serverTimestamp(),
      isServerMessage: false
    });
    messageInput.value = '';
  };

  sendServerMsgBtn.onclick = async () => {
    const text = serverMsgInput.value.trim();
    if (!text || !currentGroupId) return;
    await addDoc(collection(db, "groups", currentGroupId, "messages"), {
      text,
      isServerMessage: true,
      created: serverTimestamp()
    });
    serverMsgInput.value = '';
  };

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function startChat() {
    groupNameDisplay.textContent = `Группа: ${groups.find(g => sanitizeGroupName(g.name) === currentGroupId)?.name || "???"}`;
    chatDiv.style.display = 'flex';
    profileBtn.style.display = 'block';
    if (currentUser.displayName === "Campie") serverMsgPanel.style.display = 'block';

    if (unsubChat) unsubChat(); // если было

    onSnapshot(collection(db, "profiles"), (snap) => {
      profilesCache = {};
      snap.forEach(doc => profilesCache[doc.id] = doc.data());
    });

    const q = query(collection(db, "groups", currentGroupId, "messages"), orderBy("created", "asc"));
    unsubChat = onSnapshot(q, async (snapshot) => {
      messagesDiv.innerHTML = '';
      let lastDateStr = null;

      snapshot.forEach(doc => {
        const d = doc.data();
        const createdDate = d.created?.toDate?.() || new Date();
        const dateStr = createdDate.toDateString();

        if (dateStr !== lastDateStr) {
          lastDateStr = dateStr;
          const dateDiv = document.createElement('div');
          dateDiv.classList.add('date-divider');
          dateDiv.textContent = dateStr;
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

    // Системное сообщение "ник присоединился"
    const userProfile = profilesCache[currentUser.uid] || {};
    const welcomeMsg = `${userProfile.nick || currentUser.displayName || "Пользователь"} присоединился!`;
    addDoc(collection(db, "groups", currentGroupId, "messages"), {
      text: welcomeMsg,
      isServerMessage: true,
      created: serverTimestamp()
    });
  }
});
