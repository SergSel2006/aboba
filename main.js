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
  // DOM elements
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');
  const loginForm = document.getElementById('loginForm');
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const mainLayout = document.getElementById('mainLayout');
  const groupList = document.getElementById('groupList');
  const dmList = document.getElementById('dmList');
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
    { name: "закрытая 1",    id: "private_1",   password: "1234" },
    { name: "закрытая 2",    id: "private_2",   password: "abcd" }
  ];

  let currentUser = null;
  let profilesCache = {};
  let selectedGroupId = null;
  let unsubscribeMessages = null;

  // Splash
  setTimeout(() => {
    splash.style.display = 'none';
    app.style.display = 'flex';
  }, 2500);

  // Auth state
  onAuthStateChanged(auth, async user => {
    if (user) {
      currentUser = user;
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      mainLayout.style.display = 'flex';
      profileBtn.style.display = 'block';
      renderGroupList();
    } else {
      loginForm.style.display = 'block';
      mainLayout.style.display = 'none';
      profileBtn.style.display = 'none';
    }
  });

  // Login/out
  googleLoginBtn.onclick = () => signInWithPopup(auth, provider);
  logoutBtn.onclick = () => signOut(auth);

  // Profiles
  async function loadOrCreateProfile() {
    const ref = doc(db, 'profiles', currentUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        nick: currentUser.displayName,
        avatar: currentUser.photoURL,
        color: '#ffffff',
        status: ''
      });
    }
    const data = await getDoc(ref).then(x => x.data());
    profileNick.value = data.nick;
    profileAvatar.value = data.avatar;
    profileColor.value = data.color;
    profileStatus.value = data.status;
    statusCounter.textContent = `Осталось ${80 - data.status.length}`;
  }

  profileForm.onsubmit = async e => {
    e.preventDefault();
    await setDoc(doc(db, 'profiles', currentUser.uid), {
      nick: profileNick.value,
      avatar: profileAvatar.value,
      color: profileColor.value,
      status: profileStatus.value.substring(0,80)
    });
    profilePanel.style.display = 'none';
  };

  profileStatus.oninput = () => {
    statusCounter.textContent = `Осталось ${80 - profileStatus.value.length}`;
  };

  profileBtn.onclick = () => {
    profilePanel.style.display = profilePanel.style.display === 'block' ? 'none' : 'block';
  };

  // Groups
  function renderGroupList() {
    groupList.innerHTML = '';
    groups.forEach(g => {
      const btn = document.createElement('button');
      btn.textContent = g.name;
      btn.onclick = () => joinGroup(g);
      groupList.append(btn);
    });
  }

  async function joinGroup(g) {
    if (g.password) {
      const pass = prompt(`Пароль для ${g.name}`);
      if (pass !== g.password) return;
    }
    selectedGroupId = g.id;
    groupNameDisplay.textContent = g.name;
    if (unsubscribeMessages) unsubscribeMessages();
    startChat();
  }

  // Chat logic
  function formatTime(dt) {
    return new Date(dt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  }

  function formatDate(dt) {
    const d = new Date(dt);
    return d.toLocaleDateString();
  }

  async function startChat() {
    messagesDiv.innerHTML = '';
    const q = query(
      collection(db, 'groups', selectedGroupId, 'messages'),
      orderBy('createdAt')
    );
    unsubscribeMessages = onSnapshot(q, snap => {
      messagesDiv.innerHTML = '';
      let lastDate = '';
      snap.forEach(msgDoc => {
        const m = msgDoc.data();
        const dt = m.createdAt?.toDate();
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
              <span class="username">${m.nick}</span>
              <span class="text">${m.text}</span>
              <span class="msg-time">${formatTime(dt)}</span>
            </div>`;
          md.querySelector('.avatar').style.backgroundImage = `url(${m.avatar})`;
        }
        messagesDiv.append(md);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }

  // Send message
  chatInputForm.onsubmit = async e => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    const profile = await getDoc(doc(db,'profiles',currentUser.uid)).then(r=>r.data());
    await addDoc(
      collection(db,'groups',selectedGroupId,'messages'),
      {
        type: 'user',
        uid: currentUser.uid,
        nick: profile.nick,
        avatar: profile.avatar,
        color: profile.color,
        text,
        createdAt: serverTimestamp()
      }
    );
    messageInput.value = '';
  };
});
