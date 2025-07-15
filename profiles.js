import { db } from './globals.js';
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js';
import { currentUser, profilesCache } from './globals.js';
import { addSystemMessage } from './utils.js';

const profileForm = document.getElementById("profileForm");
const profileBtn = document.getElementById("profileBtn");
const profilePanel = document.getElementById("profilePanel");
const profileNick = document.getElementById("profileNick");
const profileNickError = document.getElementById("profileNickError");
const profileAvatar = document.getElementById("profileAvatar");
const profileColor = document.getElementById("profileColor");
const profileStatus = document.getElementById("profileStatus");
const statusCounter = document.getElementById("statusCounter");

export async function loadUserProfile() {
  const snap = await getDoc(doc(db, "profiles", currentUser.uid));
  const d = snap.exists() ? snap.data() : {};
  profileNick.value = d.nick || "";
  profileAvatar.value = d.avatar || "";
  profileColor.value = d.color || "#cccccc";
  profileStatus.value = d.status || "";
  statusCounter.textContent = 80 - profileStatus.value.length;

  profileNick.addEventListener("input", () => {
    profileNickError.style.display = "none";
  });
}

export async function loadProfile(uid) {
  if (!uid) return {};
  if (profilesCache[uid]) return profilesCache[uid];
  try {
    const snap = await getDoc(doc(db, "profiles", uid));
    const data = snap.exists() ? snap.data() : {};
    profilesCache[uid] = data;
    return data;
  } catch (e) {
    console.warn("Ошибка загрузки профиля", e);
    return {};
  }
}

profileBtn.onclick = () => {
  const open = profilePanel.style.display === "block";
  profilePanel.style.display = open ? "none" : "block";
  profileBtn.setAttribute("aria-expanded", String(!open));
  if (!open) profilePanel.focus();
};

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  profileNickError.style.display = "none";

  const newNick = profileNick.value.trim();
  if (!newNick) {
    profileNickError.textContent = "Ник не может быть пустым.";
    profileNickError.style.display = "block";
    return;
  }
  if (newNick.length > 30) {
    profileNickError.textContent = "Ник слишком длинный (макс. 30 символов).";
    profileNickError.style.display = "block";
    return;
  }

  const currentNick = profilesCache[currentUser.uid]?.nick || "";
  if (newNick !== currentNick) {
    const q = query(collection(db, "profiles"), where("nick", "==", newNick));
    const res = await getDocs(q);
    if (!res.empty && res.docs.some(doc => doc.id !== currentUser.uid)) {
      profileNickError.textContent = "Ник уже занят. Попробуйте другой.";
      profileNickError.style.display = "block";
      return;
    }
  }

  await setDoc(doc(db, "profiles", currentUser.uid), {
    nick: newNick,
    avatar: profileAvatar.value.trim() || "https://i.imgur.com/4AiXzf8.png",
    color: profileColor.value,
    status: profileStatus.value.trim()
  }, { merge: true });

  profilePanel.style.display = "none";
  profileBtn.setAttribute("aria-expanded", "false");
  profilesCache[currentUser.uid] = {
    nick: newNick,
    avatar: profileAvatar.value.trim(),
    color: profileColor.value,
    status: profileStatus.value.trim(),
  };
  addSystemMessage("Профиль сохранён");
  location.reload(); // ⬅️ можно убрать, если надо без перезагрузки
});
