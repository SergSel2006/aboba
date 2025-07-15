import { loadProfile, openDMChat, startChat, renderSidebar } from "./chat.js";
import { currentDM, groups, selectedGroup, localStorage, addSystemMessage } from "./globals.js";


const groupList = document.getElementById("groupList");
const groupNameDisplay = document.getElementById("groupNameDisplay");
const openJoinModalBtn = document.getElementById("openJoinModalBtn");

export async function renderSidebar() {
  groupList.innerHTML = "";

  // ЛС
  const dms = await loadDMChats();

  if (dms.length) {
    const dmHeader = document.createElement("div");
    dmHeader.className = "sidebar-divider";
    dmHeader.textContent = "ЛС";
    groupList.appendChild(dmHeader);

    for (const dm of dms) {
      const prof = await loadProfile(dm.otherUid);
      const item = document.createElement("div");
      item.className =
        "group-item" +
        (currentDM?.chatId === dm.chatId ? " active" : "");
      item.tabIndex = 0;

      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.style.backgroundImage = `url(${prof.avatar || "https://i.imgur.com/4AiXzf8.png"})`;

      const nick = document.createElement("span");
      nick.textContent = prof.nick || "Безымянный";
      nick.style.color = prof.color || "#ccc";
      nick.className = "nick";

      item.append(avatar, nick);

      item.onclick = () => {
        selectedGroup = null;
        currentDM = { chatId: dm.chatId, otherUid: dm.otherUid };
        localStorage.setItem("selectedGroup", "");
        startChat();
        renderSidebar();
      };

      item.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          item.onclick();
        }
      };

      groupList.appendChild(item);
    }
  }

  // Группы
  if (groups.length) {
    const groupHeader = document.createElement("div");
    groupHeader.className = "sidebar-divider";
    groupHeader.textContent = "Группы";
    groupList.appendChild(groupHeader);

    groups.forEach((g) => {
      const div = document.createElement("div");
      div.className =
        "group-item" + (g.id === selectedGroup ? " active" : "");
      div.textContent = g.name;
      div.tabIndex = 0;

      div.onclick = () => {
        if (g.id !== selectedGroup) {
          selectedGroup = g.id;
          currentDM = null;
          localStorage.setItem("selectedGroup", selectedGroup);
          renderSidebar();
          startChat();
        }
      };

      div.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          div.onclick();
        }
      };

      groupList.appendChild(div);
    });
  }

  groupList.appendChild(openJoinModalBtn);

  groupNameDisplay.textContent =
    selectedGroup
      ? groups.find((g) => g.id === selectedGroup)?.name || "—"
      : currentDM
      ? "ЛС с " + (await loadProfile(currentDM.otherUid)).nick || "Безымянный"
      : "—";
}

// Для получения ЛС-чатов (перенесём сюда из auth.js)
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";
import { db, currentUser } from "./globals.js";

export async function loadDMChats() {
  const q = query(
    collection(db, "dmChats"),
    where("uids", "array-contains", currentUser.uid)
  );
  const snap = await getDocs(q);
  const dmChats = [];

  snap.forEach((docSnap) => {
    const { uids } = docSnap.data();
    const otherUid = uids.find((u) => u !== currentUser.uid);
    if (otherUid) dmChats.push({ chatId: docSnap.id, otherUid });
  });

  return dmChats;
}
