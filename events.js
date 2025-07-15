import { drafts } from './globals.js';
import { selectedGroup, currentDM } from './globals.js';
import { autoResizeTextarea, updateCharCount } from './utils.js';
import { messageInput } from './globals.js';

// Обработка ввода текста
messageInput.addEventListener("input", () => {
  autoResizeTextarea();
  updateCharCount();

  if (selectedGroup) {
    drafts[selectedGroup] = messageInput.value;
  } else if (currentDM?.chatId) {
    drafts[currentDM.chatId] = messageInput.value;
  }
});

// Обработка клавиш Enter и Shift+Enter
const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
messageInput.addEventListener("keydown", (e) => {
  if (isMobile) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const start = messageInput.selectionStart;
      const end = messageInput.selectionEnd;
      messageInput.value =
        messageInput.value.substring(0, start) + "\n" + messageInput.value.substring(end);
      messageInput.selectionStart = messageInput.selectionEnd = start + 1;
      autoResizeTextarea();
      updateCharCount();
    }
  } else {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const submitButton = document.querySelector("#chatInput button[type=submit]");
      if (!submitButton.disabled) {
        document.getElementById("chatInput").dispatchEvent(
          new Event("submit", { cancelable: true })
        );
      }
    }
  }
});

// Перед выгрузкой страницы сохраняем черновик
window.addEventListener("beforeunload", () => {
  const txt = messageInput.value.trim();
  if (!txt) return;
  if (selectedGroup) drafts[selectedGroup] = txt;
  else if (currentDM?.chatId) drafts[currentDM.chatId] = txt;
});
