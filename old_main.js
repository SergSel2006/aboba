import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js";
import {
  getFirestore, collection, query, orderBy,
  onSnapshot, addDoc, serverTimestamp, doc,
  getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";

// === Firebase config и инициализация ===
const firebaseConfig = {
  // твои данные Firebase
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// === Элементы DOM ===
const splash = document.getElementById("splash");
const loginForm = document.getElementById("loginForm");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const loginMsg = document.getElementById("loginMsg");
const chatLayout = document.getElementById("chatLayout");
const groupList = document.getElementById("groupList");
const groupNameDisplay = document.getElementById("groupNameDisplay");
const messagesDiv = document.getElementById("messages");
const chatInputForm = document.getElementById("chatInput");
const messageInput = document.getElementById("messageInput");
const profileBtn = document.getElementById("profileBtn");
const profilePanel = document.getElementById("profilePanel");
const profileForm = document.getElementById("profileForm");
const profileNick = document.getElementById("profileNick");
const profileAvatar = document.getElementById("profileAvatar");
const profileColor = document.getElementById("profileColor");
const profileStatus = document.getElementById("profileStatus");
const statusCounter = document.getElementById("statusCounter");
const logoutBtn = document.getElementById("logoutBtn");

// Модалка другого пользователя
const userProfileModal = document.getElementById("userProfileModal");
const closeUserModalBtn = document.getElementById("closeUserModal");
const userModalAvatar = document.getElementById("userModalAvatar");
const userModalNick = document.getElementById("userModalNick");
const userModalStatus = document.getElementById("userModalStatus");
const userModalMsgBtn = document.getElementById("userModalMsgBtn");

// === Глобальные переменные ===
let currentUser = null;
let groups = [];
let selectedGroup = null;
let unsubscribe = null;
const profilesCache = {}; // кеш профилей, key = uid, value = профиль

// --- Вспомогательные функции ---
function formatTime(date){
  return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}
function formatDate(date){
  return date.toLocaleDateString();
}

// --- Загрузка профиля и кеширование ---
async function loadProfile(uid){
  if(profilesCache[uid]) return profilesCache[uid];
  try {
    const snap = await getDoc(doc(db,"profiles",uid));
    if(snap.exists()){
      profilesCache[uid] = snap.data();
      return profilesCache[uid];
    }
  } catch(e) {
    console.error("Ошибка загрузки профиля:", e);
  }
  return {
    nick: "Безымянный",
    avatar: "https://i.imgur.com/4AiXzf8.png",
    color: "#ccc",
    status: ""
  };
}

// --- Отображение сообщений ---
async function startChat(){
  messagesDiv.innerHTML = "";
  if(!selectedGroup) return;

  groupNameDisplay.innerText = groups.find(g => g.id === selectedGroup)?.name || "Группа";

  const q = query(collection(db,"groups",selectedGroup,"messages"), orderBy("createdAt"));
  if(unsubscribe) unsubscribe();

  unsubscribe = onSnapshot(q, async (snap) => {
    messagesDiv.innerHTML = "";
    let lastDate = "";
    for(const docSnap of snap.docs){
      const m = docSnap.data();
      const date = m.createdAt?.toDate?.() || new Date();
      const dateStr = date.toDateString();

      // Разделитель по дате
      if(dateStr !== lastDate){
        const d = document.createElement('div');
        d.className = 'date-divider';
        d.innerText = formatDate(date);
        messagesDiv.appendChild(d);
        lastDate = dateStr;
      }

      // Получаем профиль для сообщения
      const profile = await loadProfile(m.uid);

      // Создаем сообщение
      const msgDiv = document.createElement('div');
      msgDiv.className = m.type === 'server' ? 'msg server' : 'msg';

      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'avatar';
      avatarDiv.style.backgroundImage = `url(${profile.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
      if(m.type === 'user'){
        avatarDiv.style.cursor = 'pointer';
        avatarDiv.onclick = () => openUserModal(m.uid);
      }

      const contentDiv = document.createElement('div');
      contentDiv.className = 'content';

      let headerHTML = "";
      if(m.type === 'user'){
        headerHTML = `
          <div class="msg-header">
            <span class="username" style="color:${profile.color}">${profile.nick}</span>
            <span class="msg-time">${formatTime(date)}</span>
          </div>`;
      }
      contentDiv.innerHTML = headerHTML + `<div>${m.text}</div>`;

      msgDiv.appendChild(avatarDiv);
      msgDiv.appendChild(contentDiv);

      messagesDiv.appendChild(msgDiv);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// --- Отображение списка групп ---
function renderGroups(){
  groupList.innerHTML = "";
  groups.forEach(g => {
    const el = document.createElement('div');
    el.className = 'group-item' + (g.id === selectedGroup ? ' active' : '');
    el.textContent = g.name;
    el.onclick = () => {
      selectedGroup = g.id;
      startChat();
      renderGroups();
    };
    groupList.appendChild(el);
  });
}

// --- Открыть модалку профиля другого пользователя ---
async function openUserModal(uid){
  const profile = await loadProfile(uid);
  userModalAvatar.style.backgroundImage = `url(${profile.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
  userModalNick.textContent = profile.nick || "Безымянный";
  userModalStatus.textContent = profile.status || "Пользователь без статуса";
  userModalMsgBtn.disabled = true; // пока без функционала отправки сообщений
  userProfileModal.style.display = "flex";
}
closeUserModalBtn.onclick = () => {
  userProfileModal.style.display = "none";
};

// --- Обновление счётчика символов для статуса ---
profileStatus.addEventListener('input', () => {
  statusCounter.textContent = 80 - profileStatus.value.length;
});

// --- Вход с Google ---
googleLoginBtn.onclick = () => {
  loginMsg.textContent = "";
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .catch(e => loginMsg.textContent = "Ошибка входа: " + e.message);
};

// --- Выход ---
logoutBtn.onclick = () => {
  signOut(auth);
};

// --- Отслеживание авторизации ---
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if(user){
    loginForm.style.display = "none";
    chatLayout.style.display = "flex";
    profileBtn.style.display = "block";
    splash.style.display = "none";
    await loadUserProfile(); // загружаем профиль пользователя

    // Загружаем группы (жёстко, для примера)
    groups = [
      {id: "group1", name: "Общий чат"},
      {id: "group2", name: "Фан-зона"}
    ];
    if(!selectedGroup) selectedGroup = groups[0].id;
    renderGroups();
    startChat();
  } else {
    loginForm.style.display = "block";
    chatLayout.style.display = "none";
    profileBtn.style.display = "none";
    splash.style.display = "flex";
  }
});

// --- Загрузка профиля текущего пользователя в форму ---
async function loadUserProfile(){
  if(!currentUser) return;
  const snap = await getDoc(doc(db, "profiles", currentUser.uid));
  if(snap.exists()){
    const p = snap.data();
    profilesCache[currentUser.uid] = p;
    profileNick.value = p.nick || "";
    profileAvatar.value = p.avatar || "";
    profileColor.value = p.color || "#cccccc";
    profileStatus.value = p.status || "";
    statusCounter.textContent = 80 - (profileStatus.value.length);
  } else {
    profileNick.value = "";
    profileAvatar.value = "";
    profileColor.value = "#cccccc";
    profileStatus.value = "";
    statusCounter.textContent = 80;
  }
}

// --- Сохранение профиля ---
profileForm.onsubmit = async (e) => {
  e.preventDefault();
  if(!currentUser) return;

  const newProfile = {
    nick: profileNick.value.trim() || "Безымянный",
    avatar: profileAvatar.value.trim() || "https://i.imgur.com/4AiXzf8.png",
    color: profileColor.value || "#cccccc",
    status: profileStatus.value.trim()
  };

  await setDoc(doc(db,"profiles",currentUser.uid), newProfile);
  profilesCache[currentUser.uid] = newProfile;
  alert("Профиль сохранён!");
};

// --- Отправка сообщений ---
chatInputForm.onsubmit = async (e) => {
  e.preventDefault();
  if(!currentUser) return;
  const text = messageInput.value.trim();
  if(!text) return;

  const msgData = {
    uid: currentUser.uid,
    text,
    createdAt: serverTimestamp(),
    type: "user"
  };

  try {
    await addDoc(collection(db,"groups",selectedGroup,"messages"), msgData);
    messageInput.value = "";
  } catch(e){
    alert("Ошибка отправки: " + e.message);
  }
};

// --- Кнопка открытия/закрытия панели профиля ---
profileBtn.onclick = () => {
  profilePanel.style.display = profilePanel.style.display === "block" ? "none" : "block";
};

// --- Закрытие панели при клике вне ---
document.addEventListener('click', e => {
  if(!profilePanel.contains(e.target) && e.target !== profileBtn){
    profilePanel.style.display = "none";
  }
});
