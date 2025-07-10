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
        // Модалка профиля другого пользователя
        userProfileModal = document.getElementById('userProfileModal'),
        userModalAvatar = document.getElementById('userModalAvatar'),
        userModalNick = document.getElementById('userModalNick'),
        userModalStatus = document.getElementById('userModalStatus'),
        userModalMsgBtn = document.getElementById('userModalMsgBtn'),
        closeUserModal = document.getElementById('closeUserModal');

  const auth = getAuth();
  const provider = new GoogleAuthProvider();

  const groups = [
    { name:"aboba global", id:"aboba_global", password:null },
    { name:"закрытая 1", id:"private1", password:"1234" },
    { name:"закрытая 2", id:"private2", password:"abcd" },
  ];

  let currentUser = null, profilesCache = {}, selectedGroup="aboba_global", unsubscribe=null;

  // Сплэш
  let dot=0;
  const subs=["абобушка","ДС для своих","окак","йоу","лабобус"];
  const iv = setInterval(()=>{
    dot=(dot+1)%4;
    splashMain.innerText=`абоба${'.'.repeat(dot)}`;
    splashSubs.innerText = subs[Math.floor(Math.random()*subs.length)];
  },1700);
  setTimeout(()=>{
    clearInterval(iv);
    splash.style.display='none';
    app.style.display='block';
    loginForm.style.display='none'; // по умолчанию спрячем
  },2500);

  // Аутентификация
  onAuthStateChanged(auth, async user => {
    currentUser = user;
    if(user) {
      await loadOrCreateProfile();
      loginForm.style.display = 'none';
      profileBtn.style.display = 'block';
      chatLayout.style.display = 'flex';
      renderGroups();
      startChat();
    } else {
      loginForm.style.display = 'block';
      profileBtn.style.display = 'none';
      chatLayout.style.display = 'none';
    }
  });

  googleLoginBtn.onclick = () => signInWithPopup(auth,provider).catch(e=>loginMsg.innerText=e.message);
  logoutBtn.onclick = () => signOut(auth);

  // Профиль
  profileBtn.onclick = () => {
    profilePanel.style.display = profilePanel.style.display==='block'?'none':'block';
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
        nick: currentUser.displayName||"Безымянный",
        avatar: currentUser.photoURL || 'https://i.imgur.com/4AiXzf8.png',
        color:"#ffffff", status:''
      });
    }
    const data = (await getDoc(ref)).data();
    profilesCache[currentUser.uid] = data; // кешируем
    profileNick.value=data.nick;
    profileAvatar.value=data.avatar;
    profileColor.value=data.color;
    profileStatus.value=data.status;
    statusCounter.innerText=80-profileStatus.value.length;
  }

  // Группы
  function renderGroups(){
    groupList.innerHTML='';
    groups.forEach(g => {
      const div = document.createElement('div');
      div.className='group-item';
      div.innerText = g.name;
      if(g.id===selectedGroup) div.classList.add('active');
      div.onclick = ()=> {
        if(g.password && prompt("Пароль:")!==g.password) return alert("Неверный пароль");
        selectedGroup=g.id;
        if(unsubscribe) unsubscribe();
        renderGroups();
        startChat();
      };
      groupList.appendChild(div);
    });
  }

  // Чат
  function startChat(){
    messagesDiv.innerHTML='';
    groupNameDisplay.innerText = groups.find(g=>g.id===selectedGroup).name;
    const q = query(collection(db,"groups",selectedGroup,"messages"),orderBy("createdAt"));
    unsubscribe = onSnapshot(q, snap=>{
      messagesDiv.innerHTML='';
      let lastDate='';
      snap.forEach(docSnap=>{
        const m = docSnap.data();
        const date = m.createdAt?.toDate?.() || new Date();
        const dateStr = date.toDateString();
        if(dateStr!==lastDate){
          const d = document.createElement('div');
          d.className='date-divider';
          d.innerText = formatDate(date);
          messagesDiv.appendChild(d);
          lastDate=dateStr;
        }
        const msgDiv = document.createElement('div');
        msgDiv.className = m.type==='server'?'msg server':'msg';

        // Аватар с кликом на профиль
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.style.backgroundImage = `url(${m.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
        if(m.type==='user') {
          avatarDiv.style.cursor = 'pointer';
          avatarDiv.onclick = () => openUserModal(m.uid);
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        let headerHTML = '';
        if(m.type==='user') {
          headerHTML = `
            <div class="msg-header">
              <span class="username" style="color:${m.color}">${m.nick}</span>
              <span class="msg-time">${formatTime(date)}</span>
            </div>`;
        }
        contentDiv.innerHTML = headerHTML + `<div>${m.text}</div>`;

        msgDiv.appendChild(avatarDiv);
        msgDiv.appendChild(contentDiv);

        messagesDiv.appendChild(msgDiv);
      });
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }

  chatInput.onsubmit = async e => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if(!text) return;
    const prof = profilesCache[currentUser.uid] || (await getDoc(doc(db,"profiles",currentUser.uid))).data();
    profilesCache[currentUser.uid] = prof; // кешируем если не было
    await addDoc(collection(db,"groups",selectedGroup,"messages"), {
      type:'user',
      uid:currentUser.uid,
      nick:prof.nick,
      avatar:prof.avatar,
      color:prof.color,
      text,
      createdAt: serverTimestamp()
    });
    messageInput.value = '';
  };

  // Модалка профиля пользователя
  function openUserModal(uid){
    if(!profilesCache[uid]) {
      getDoc(doc(db,"profiles",uid)).then(snap=>{
        if(snap.exists()){
          profilesCache[uid] = snap.data();
          showUserModal(profilesCache[uid]);
        } else {
          alert("Профиль не найден");
        }
      });
    } else {
      showUserModal(profilesCache[uid]);
    }
  }

  function showUserModal(profile){
    userModalAvatar.style.backgroundImage = `url(${profile.avatar || 'https://i.imgur.com/4AiXzf8.png'})`;
    userModalNick.innerText = profile.nick || "Безымянный";
    userModalStatus.innerText = profile.status || "";
    userModalMsgBtn.disabled = true; // кнопка неактивна, как просил
    userProfileModal.style.display = 'flex';
  }

  closeUserModal.onclick = () => {
    userProfileModal.style.display = 'none';
  };

  // Вспомогалки
  function formatTime(d){
    return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  }
  function formatDate(d){
    const now= new Date(), yesterday = new Date(now);
    yesterday.setDate(now.getDate()-1);
    if(d.toDateString()===now.toDateString()) return "Сегодня";
    if(d.toDateString()===yesterday.toDateString()) return "Вчера";
    return d.toLocaleDateString();
  }
});
