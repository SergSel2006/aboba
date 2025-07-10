// chat.js
import { db } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUser } from './profile.js';
import { formatDate, formatTime, escapeHtml } from './utils.js';
import { selectedGroupId } from './groups.js';

let unsubscribeMessages = null;

export function startChat() {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.innerHTML = '';
  if (unsubscribeMessages) unsubscribeMessages();

  const q = query(collection(db, 'groups', selectedGroupId.value, 'messages'), orderBy('createdAt'));
  unsubscribeMessages = onSnapshot(q, snapshot => {
    messagesDiv.innerHTML = '';
    let lastDate = '';
    snapshot.forEach(docSnap => {
      const m = docSnap.data();
      const dt = m.createdAt?.toDate?.() || new Date();
      const dateStr = dt.toDateString();

      if (dateStr !== lastDate) {
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date-divider';
        dateDiv.textContent = formatDate(dt);
        messagesDiv.appendChild(dateDiv);
        lastDate = dateStr;
      }

      const msgDiv = document.createElement('div');
      msgDiv.className = m.type === 'server' ? 'msg server' : 'msg';

      if (m.type === 'server') {
        msgDiv.textContent = m.text;
      } else {
        msgDiv.innerHTML = `
          <div class="avatar" title="${escapeHtml(m.nick)}" style="background-image: url(${m.avatar})"></div>
          <div class="content">
            <span class="username" style="color:${m.color}">${escapeHtml(m.nick)}</span>
            <span class="text">${escapeHtml(m.text)}</span>
            <span class="msg-time">${formatTime(dt)}</span>
          </div>`;
      }

      messagesDiv.appendChild(msgDiv);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

export async function setupMessageForm() {
  const chatInput = document.getElementById('chatInput');
  const messageInput = document.getElementById('messageInput');

  chatInput.onsubmit = async e => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !selectedGroupId.value) return;

    const profileSnap = await getDoc(doc(db, 'profiles', getCurrentUser().uid));
    const profile = profileSnap.data();

    await addDoc(collection(db, 'groups', selectedGroupId.value, 'messages'), {
      uid: getCurrentUser().uid,
      type: 'user',
      nick: profile.nick,
      avatar: profile.avatar,
      color: profile.color,
      text,
      createdAt: serverTimestamp()
    });

    messageInput.value = '';
  };
}
