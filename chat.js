
import { db, currentUser, drafts, profilesCache } from "./globals.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  getDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";

import { loadProfile } from "./sidebar.js";
import { renderDraft, updateCharCount, clearMessages, addSystemMessage } from "./utils.js";

const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const chatInputForm = document.getElementById("chatInput");

export let unsubscribe = null;
export let selectedGroup = null;
export let currentDM = null;

export async function startChat() {
  if (unsubscribe) unsubscribe();
  clearMessages();
  renderDraft();

  if (currentDM) {
    const q = query(
      collection(db, "dmChats", currentDM.chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    unsubscribe = onSnapshot(q, async (snap) => {
      clearMessages();
      for (const docSnap of snap.docs) {
        const d = docSnap.data();
        const prof = await loadProfile(d.uid || "");

        const msgDiv = document.createElement("div");
        msgDiv.className = "msg";

        const avatar = document.createElement("div");
        avatar.className = "avatar clickable";
        avatar.style.backgroundImage = `url(${prof.avatar || "https://i.imgur.com/4AiXzf8.png"})`;
        avatar.onclick = () => openUserModal(d.uid);
        avatar.tabIndex = 0;

        const cont = document.createElement("div");
        cont.className = "content";

        const head = document.createElement("div");
        head.className = "msg-header";

        const nick = document.createElement("span");
        nick.textContent = prof.nick || "Безымянный";
        nick.style.color = prof.color || "#ccc";

        const time = document.createElement("span");
        time.textContent = formatTime(d.createdAt?.toDate?.() || new Date());
        time.title = d.createdAt?.toDate?.()?.toLocaleString() || "";

        head.append(nick, time);
        cont.append(head, document.createTextNode(d.text || ""));
        msgDiv.append(avatar, cont);
        messagesDiv.appendChild(msgDiv);
      }
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  } else if (selectedGroup) {
    const q = query(
      collection(db, "groups", selectedGroup, "messages"),
      orderBy("createdAt", "asc")
    );
    let lastDate = "";

    unsubscribe = onSnapshot(q, async (snap) => {
      clearMessages();
      lastDate = "";
      for (const docSnap of snap.docs) {
        const d = docSnap.data();
        if (!d.createdAt) continue;

        const createdAt = d.createdAt.toDate();
        const dateStr = formatDate(createdAt);

        if (dateStr !== lastDate) {
          lastDate = dateStr;
          const div = document.createElement("div");
          div.className = "date-divider";
          div.textContent = dateStr;
          messagesDiv.appendChild(div);
        }

        const msgDiv = document.createElement("div");
        msgDiv.className = "msg";

        const avatar = document.createElement("div");
        avatar.className = "avatar clickable";
        const prof = await loadProfile(d.uid || "");
        avatar.style.backgroundImage = `url(${prof.avatar || "https://i.imgur.com/4AiXzf8.png"})`;
        avatar.title = prof.nick || "Безымянный";
        avatar.onclick = () => openUserModal(d.uid);
        avatar.tabIndex = 0;

        const cont = document.createElement("div");
        cont.className = "content";

        const head = document.createElement("div");
        head.className = "msg-header";

        const nick = document.createElement("span");
        nick.textContent = prof.nick || "Безымянный";
        nick.style.color = prof.color || "#ccc";

        const time = document.createElement("span");
        time.textContent = formatTime(createdAt);
        time.title = createdAt.toLocaleString();

        head.append(nick, time);

        if (d.edited) {
          const ed = document.createElement("span");
          ed.className = "msg-edited";
          ed.textContent = "(ред.)";
          head.appendChild(ed);
        }

        const body = document.createElement("div");
        body.textContent = d.text || "";

        cont.append(head, body);
        msgDiv.append(avatar, cont);
        messagesDiv.appendChild(msgDiv);
      }
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }
}

// Отправка сообщений
chatInputForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || (!selectedGroup && !currentDM)) return;

  const text = messageInput.value.trim();
  if (!text) return;

  const data = {
    text,
    uid: currentUser.uid,
    createdAt: serverTimestamp(),
    edited: false,
    type: selectedGroup ? "user" : "dm",
  };

  try {
    if (selectedGroup) {
      await addDoc(
        collection(db, "groups", selectedGroup, "messages"),
        data
      );
      drafts[selectedGroup] = "";
    } else if (currentDM?.chatId) {
      await setDoc(
        doc(db, "dmChats", currentDM.chatId),
        { uids: [currentUser.uid, currentDM.otherUid] },
        { merge: true }
      );

      await addDoc(
        collection(db, "dmChats", currentDM.chatId, "messages"),
        data
      );
      drafts[currentDM.chatId] = "";
    }

    messageInput.value = "";
    updateCharCount();
  } catch (err) {
    alert("Ошибка отправки: " + err.message);
  }
});
