import { db } from './firebase-config.js';
import {
  collection, addDoc, query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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
const googleLoginBtn = document.getElementById('googleLoginBtn');

let userNick = null;
let userAvatar = null;

const auth = getAuth();
const provider = new GoogleAuthProvider();

const splashMain = document.getElementById('splashMain');
const splashSubs = document.getElementById('splashSubs');

const splashTexts = ["Абобушка", "Типа ДС для своих", "Ты знаешь Комп Мастера?", "🅰️🅱️🅾️🅱️🅰️", "окак", "#кириллнечитер", "ML+RRR", "йоу"];
let dotCount = 0;

// Рандомное время от 3 до 6 секунд (в миллисекундах)
const splashDuration = 3000 + Math.random() * 3000;

const dotInterval = setInterval(() => {
  dotCount = (dotCount + 1) % 4;
  splashMain.innerText = `Абоба${'.'.repeat(dotCount)}`;
  // Обновляем нижний мелкий текст случайным из массива
  splashSubs.innerText = splashTexts[Math.floor(Math.random() * splashTexts.length)];
}, 1000);

setTimeout(() => {
  clearInterval(dotInterval); // останавливаем интервал
  splashMain.parentElement.style.display = 'none'; // прячем весь контейнер заставки
  appDiv.style.display = 'flex'; // показываем приложение
}, splashDuration);

googleLoginBtn.onclick = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    userNick = user.displayName || "Безымянный";
    userAvatar = user.photoURL || 'https://i.imgur.com/4AiXzf8.png';

    loginForm.style.display = 'none';
    chatDiv.style.display = 'flex';

    if (userNick === "Campie") {
      serverMsgPanel.style.display = 'block';
    }

    startChat();
  } catch (error) {
    loginMsg.textContent = "Ошибка входа: " + error.message;
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
    });

    // Вынес скролл в setTimeout чтобы DOM обновился
    setTimeout(() => {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, 0);
  });
}
