import { app, db, storage } from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const auth = getAuth(app);

const splash = document.getElementById('splash');
const appDiv = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const chatDiv = document.getElementById('chat');
const messagesDiv = document.getElementById('messages');
const chatInputForm = document.getElementById('chatInput');
const messageInput = document.getElementById('messageInput');
const loginMsg = document.getElementById('loginMsg');
const sendServerMsgBtn = document.getElementById('sendServerMsgBtn');
const serverMsgInput = document.getElementById('serverMsgInput');
const serverMsgPanel = document.getElementById('serverMsgPanel');

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
    // Пробуем зарегистрировать пользователя
    await createUserWithEmailAndPassword(auth, email, pass);
  } catch (regError) {
    // Если уже зарегистрирован, пробуем войти
    if (regError.code === 'auth/email-already-in-use') {
      try {
        await signInWithEmailAndPassword(auth, email, pass);
      } catch (signInError) {
        loginMsg.textContent = 'Ошибка входа: ' + signInError.message;
        return;
      }
    } else {
      loginMsg.textContent = 'Ошибка регистрации: ' + regError.message;
      return;
    }
  }

  // Успешный вход или регистрация
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

  if (userNick === 'Campie') {
    serverMsgPanel.style.display = 'block';
  }

  startChat();
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
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error);
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
  } catch (error) {
    console.error('Ошибка отправки серверного сообщения:', error);
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
