
// modals.js
import {
  joinModal,
  closeJoinModal,
  openJoinModalBtn,
  joinGroupError,
  joinGroupName,
  joinGroupCode,
  joinGroupPassword,
  userProfileModal,
  closeUserModalBtn,
} from "./globals.js";

// Открыть модалку добавления группы
export function openJoinModal() {
  joinModal.style.display = "flex";
  joinModal.setAttribute("aria-hidden", "false");
  joinGroupError.style.display = "none";
  joinGroupName.value = "";
  joinGroupCode.value = "";
  joinGroupPassword.value = "";
  joinGroupName.focus();
}

// Закрыть модалку добавления группы
export function closeJoinModalFunc() {
  joinModal.style.display = "none";
  joinModal.setAttribute("aria-hidden", "true");
}

// Навешиваем слушатели для модалки добавления группы
export function setupJoinModalHandlers() {
  openJoinModalBtn.onclick = openJoinModal;
  closeJoinModal.onclick = closeJoinModalFunc;
  joinModal.onclick = (e) => {
    if (e.target === joinModal) closeJoinModalFunc();
  };
  joinModal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeJoinModalFunc();
  });
}

// Закрытие модалки профиля пользователя
export function closeUserModal() {
  userProfileModal.style.display = "none";
  userProfileModal.setAttribute("aria-hidden", "true");
}

// Навешиваем слушатели для модалки профиля пользователя
export function setupUserModalHandlers() {
  closeUserModalBtn.onclick = closeUserModal;
  userProfileModal.onclick = (e) => {
    if (e.target === userProfileModal) closeUserModal();
  };
  userProfileModal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeUserModal();
  });
}
