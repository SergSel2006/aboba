import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, query, orderBy, addDoc, onSnapshot, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
  // Элементы страницы
  const splash = document.getElementById('splash'),
        splashMain = document.getElementById('splashMain'),
        splashSubs = document.getElementById('splashSubs'),
        app = document.getElementById('app'),
        loginForm = document.getElementById('loginForm'),
        googleLoginBtn = document.getElementById('googleLoginBtn'),
        loginMsg = document.getElementById('loginMsg'),
        chatLayout = document.getElementById('chatLayout'),
        groupList = document.getElementById('groupList'),
        groupNameDisplay = document.getElementById('groupNameDisplay'),
        messagesDiv = document.getElementById('messages'),
        chatInput = document.getElementById('chatInput'),
        messageInput = document.getElementById('messageInput'),
        profileBtn = document.getElementById('profileBtn'),
        profilePanel = document.getElementById('profilePanel'),
        profileForm = document.getElementById('profileForm'),
        profileNick = document.getElementById('profileNick'),
        profileAvatar = document.getElementById('profileAvatar'),
        profileColor = document.getElementById('profileColor'),
        profileStatus = document.getElementById('profileStatus'),
        statusCounter = document.getElementById('statusCounter'),
        logoutBtn = document.getElementById('logoutBtn'),

        userProfileModal = document.getElementById('userProfileModal'),
        userModalAvatar = document.getElementById('userModalAvatar'),
        userModalNick = document.getElementById('userModalNick'),
        userModalStatus = document.getElementById('userModalStatus'),
        closeUserModal = document.getElementById('closeUserModal');

  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  const groups = [
    { name:"aboba global", id:"aboba_global", password:null },
    { name:"закрытая 1", id:"private1", password:"1234" },
    { name:"закрытая 2", id:"private2", password:"abcd" },
  ];

  let currentUser = null, profilesCache = {}, selectedGroup="aboba_global", unsubscribe=null;

  // Сплэш-анимация
  let dot=0;
  const subs=["абобушка","ДС для своих","окак","йоу","лабобус"];
  const iv = setInterval(()=>{
    dot=(dot+1)%4;
    splashMain.innerText=`абоба${'.'.repeat(dot)}`;
    splashSubs.innerText = subs[Math.floor(Math.random()*subs.length)];
  },1700);

  // Аутентификация
  onAuthStateChanged(auth, async user => {
    clearInterval(iv);
    splash.style.display='none';
    app.style.display='block';

    if(user) {
      currentUser = user;
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      profileBtn.style.display = 'block';
      chatLayout.style.display = 'flex';
      renderGroups();
      startChat();
    } else {
      loginForm.style.display = 'block';
      chatLayout.style.display = 'none';
      profileBtn.style.display = 'none';
    }
  });

  googleLoginBtn.onclick = () => signInWithPopup(auth,provider).catch(e=>loginMsg.innerText=e.message);
  logoutBtn.onclick = () => signOut(auth);

  // Профиль
  profileBtn.onclick = () => {
    profilePanel.style.display = profilePanel.style.display==='block' ? 'none' : 'block';
  };
  profileStatus.oninput = () => {
    statusCounter.innerText = 80 - profileStatus.value.length;
  };
  profileForm.onsubmit = async e => {
    e.preventDefault();
    await setDoc(doc(db,"profiles",currentUser.uid),{
      nick: profileNick.value.trim() || "Безымянный",
      avatar: profileAvatar.value.trim() || 'https://i.imgur.com/4AiXzf8.png',
      color: profileColor.value,
      status: profileStatus.value.trim().slice(0,80)
    });
    profilePanel.style.display = 'none';
  };

  async function loadOrCreateProfile(){
    const ref = doc(db,"profiles",currentUser.uid);
    const snap = await getDoc(ref);
    if(!snap.exists()) {
      await setDoc(ref,{
        nick: currentUser.displayName || "Безымянный",
        avatar: currentUser.photoURL || 'https://i.imgur.com/4AiXzf8.png',
        color:"#ffffff", status:''
      });
    }
    const data = (await getDoc(ref)).data();
    profileNick.value=data.nick;
    profileAvatar.value=data.avatar;
    profileColor.value=data.color;
    profileStatus.value=data.status;
    statusCounter.innerText = 80 - profileStatus.value.length;
  }

  // Группы
  function renderGroups(){
    groupList.innerHTML = '';
    groups.forEach(g => {
      const div = document.createElement('div');
      div.className = 'group-item';
      div.innerText = g.name;
      if(g.id === selectedGroup) div.classList.add('active');
      div.onclick = () => {
        if(g.password && prompt("Пароль:") !== g.password) return alert("Неверный пароль");
        selectedGroup = g.id;
        if(unsubscribe) unsubscribe();
        renderGroups();
        startChat();
      };
      groupList.appendChild(div);
    });
  }

  // Чат
  function startChat(){
    messagesDiv.innerHTML = '';
    groupNameDisplay.innerText = groups.find(g => g.id === selectedGroup).name;
    const q = query(collection(db,"groups",selectedGroup,"messages"), orderBy("createdAt"));
    unsubscribe = onSnapshot(q, snap => {
      messagesDiv.innerHTML = '';
      let lastDate = '';
      snap.forEach(docSnap => {
        const m = docSnap.data();
        const date = m.createdAt?.toDate?.() || new Date();
        const dateStr = date.toDateString();
        if(dateStr !== lastDate){
          const d = document.createElement('div');
          d.className = 'date-divider';
          d.innerText = formatDate(date);
          messagesDiv.appendChild(d);
          lastDate = dateStr;
        }
        const msgDiv = document.createElement('div');
        msgDiv.className = m.type === 'server' ? 'msg server' : 'msg';
        msgDiv.innerHTML = `
          ${m.type === 'user' ? `<div class="avatar" style="background-image:url(${m.avatar})" data-uid="${m.uid}"></div>` : ''}
          <div class="content">
            ${m.type === 'user'
              ? `<div class="msg-header">
                  <span class="username" style="color:${m.color}">${m.nick}</span>
                  <span class="msg-time">${formatTime(date)}</span>
                </div>`
              : ''}
            <div>${m.text}</div>
          </div>`;
        messagesDiv.appendChild(msgDiv);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;

      // Открытие профиля по аватарке
      messagesDiv.querySelectorAll('.avatar').forEach(avatar => {
        avatar.onclick = async () => {
          const uid = avatar.dataset.uid;
          if (!uid) return;

          const snap = await getDoc(doc(db, "profiles", uid));
          if (!snap.exists()) return;

          const data = snap.data();
          userModalAvatar.style.backgroundImage = `url(${data.avatar || ''})`;
          userModalNick.innerText = data.nick || 'Безымянный';
          userModalNick.style.color = data.color || '#fff';
          userModalStatus.innerText = data.status || '—';

          userProfileModal.style.display = 'flex';
        };
      });
    });
  }

  chatInput.onsubmit = async e => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if(!text) return;
    const prof = (await getDoc(doc(db,"profiles",currentUser.uid))).data();
    await addDoc(collection(db,"groups",selectedGroup,"messages"), {
      type: 'user',
      uid: currentUser.uid,
      nick: prof.nick, avatar: prof.avatar,
      color: prof.color, text,
      createdAt: serverTimestamp()
    });
    messageInput.value = '';
  };

  // Вспомогалки
  function formatTime(d){
    return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }
  function formatDate(d){
    const now = new Date(), yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if(d.toDateString() === now.toDateString()) return "Сегодня";
    if(d.toDateString() === yesterday.toDateString()) return "Вчера";
    return d.toLocaleDateString();
  }

  closeUserModal.onclick = () => {
    userProfileModal.style.display = 'none';
  };
  window.onclick = (e) => {
    if (e.target === userProfileModal) {
      userProfileModal.style.display = 'none';
    }
  };
});
