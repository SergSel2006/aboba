// app.js
import { db, storage } from './firebase-config.js';
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
  doc, setDoc, getDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const splash = document.getElementById('splash');
const appDiv = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const chatDiv = document.getElementById('chat');
const messagesDiv = document.getElementById('messages');
const chatInputForm = document.getElementById('chatInput');
const messageInput = document.getElementById('messageInput');
const loginMsg = document.getElementById('loginMsg');

let userNick = null;
let userColor = null;
let userAvatar = null;

const splashTexts = ["Абоба", "Абобушка", "АбоБаБа", "Абобатор", "Абобяра"];
let dotCount = 0;
setInterval(() => {
  dotCount = (dotCount + 1) % 4;
  splash.innerText = splashTexts[Math.floor(Math.random() * splashTexts.length)] + '.'.repeat(dotCount);
}, 1000);
setTimeout(() => {
  splash.style.display = 'none';
  appDiv.style.display = 'flex';
}, 3000);

async function isColorUsed(color) {
  const snap = await getDocs(collection(db, "usedColors"));
  return snap.docs.some(doc => doc.data().color === color);
}

loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const nick = document.getElementById('nick').value.trim();
  const pass = document.getElementById('password').value.trim();
  const captcha = document.getElementById('captcha').value.trim().toLowerCase();
  const color = document.getElementById('colorPicker').value;
  const file = document.getElementById('avatarFile').files[0];

  if (captcha !== 'абоба') return loginMsg.textContent = 'Неверное проверочное слово';
  if (await isColorUsed(color)) return loginMsg.textContent = 'Цвет уже занят';

  userNick = nick;
  userColor = color;

  if (file) {
    const avatarRef = ref(storage, 'avatars/' + nick);
    await uploadBytes(avatarRef, file);
    userAvatar = await getDownloadURL(avatarRef);
  } else {
    userAvatar = 'https://i.imgur.com/4AiXzf8.png';
  }

  await addDoc(collection(db, "usedColors"), { color });

  loginForm.style.display = 'none';
  chatDiv.style.display = 'flex';
  if (userNick === "Лев") document.getElementById('serverMsgPanel').style.display = 'block';
  document.getElementById('bgUploadPanel').style.display = 'block';

  startChat();
};

chatInputForm.onsubmit = async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  await addDoc(collection(db, "messages"), {
    nick: userNick,
    text,
    avatar: userAvatar,
    color: userColor,
    created: serverTimestamp(),
    isServerMessage: false
  });
  messageInput.value = '';
};

document.getElementById('sendServerMsgBtn').onclick = async () => {
  const text = document.getElementById('serverMsgInput').value.trim();
  if (!text) return;
  await addDoc(collection(db, "messages"), {
    text,
    isServerMessage: true,
    created: serverTimestamp()
  });
  document.getElementById('serverMsgInput').value = '';
};

document.getElementById('uploadBgBtn').onclick = async () => {
  const file = document.getElementById('bgFile').files[0];
  if (!file) return;
  const bgRef = ref(storage, 'backgrounds/mainBg');
  await uploadBytes(bgRef, file);
  const url = await getDownloadURL(bgRef);
  await setDoc(doc(db, "settings", "background"), { url });
};

onSnapshot(doc(db, "settings", "background"), (snap) => {
  if (snap.exists()) {
    document.getElementById('chat').style.backgroundImage = `url(${snap.data().url})`;
  }
});

function startChat() {
  const q = query(collection(db, "messages"), orderBy("created", "asc"));
  onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(doc => {
      const d = doc.data();
      const div = document.createElement('div');
      div.classList.add('msg');
      if (d.isServerMessage) {
        div.classList.add('server');
        div.textContent = d.text;
      } else {
        div.style.backgroundColor = d.color;
        const ava = document.createElement('div');
        ava.className = 'avatar';
        ava.style.backgroundImage = `url(${d.avatar})`;
        const name = document.createElement('div');
        name.className = 'username';
        name.textContent = d.nick;
        const text = document.createElement('div');
        text.textContent = d.text;
        div.appendChild(ava);
        div.appendChild(name);
        div.appendChild(text);
      }
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  });
}
