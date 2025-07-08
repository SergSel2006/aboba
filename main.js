// main.js
import { db, storage } from './firebase-config.js';
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const splash = document.getElementById('splash');
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

let userNick = null;
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

loginForm.onsubmit = async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const nick = document.getElementById('nick').value.trim();
  const pass = document.getElementById('password').value.trim();
  const file = document.getElementById('avatarFile').files[0];

  if (!email || !nick || !pass) {
    loginMsg.textContent = 'Заполните все поля!';
    return;
  }

  try {
    userNick = nick;

    if (file) {
      const avatarRef = ref(storage, 'avatars/' + nick);
      await uploadBytes(avatarRef, file);
      userAvatar = await getDownloadURL(avatarRef);
    } else {
      userAvatar = 'https://i.imgur.com/4AiXzf8.png';
    }

    loginForm.style.display = 'none';
    chatDiv.style.display = 'flex';

    if (userNick === "Campie") {
      serverMsgPanel.style.display = 'block';
    }

    startChat();
  } catch (error) {
    loginMsg.textContent = 'Ошибка при входе: ' + error.message;
  }
};

chatInputForm.onsubmit = async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "messages"), {
      nick: userNick,
      text,
      avatar: userAvatar,
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
        div.style.backgroundColor = '#2a2a2a';
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
