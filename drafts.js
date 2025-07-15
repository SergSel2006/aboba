import { messageInput, chatInputForm, selectedGroup, currentDM, drafts } from "./globals.js";

function autoResizeTextarea() {
  messageInput.style.height = "auto";
  messageInput.style.height = messageInput.scrollHeight + "px";
}

messageInput.addEventListener("input", () => {
  autoResizeTextarea();
  updateCharCount();
  if (selectedGroup) {
    drafts[selectedGroup] = messageInput.value;
  } else if (currentDM?.chatId) {
    drafts[currentDM.chatId] = messageInput.value;
  }
});

window.addEventListener("beforeunload", () => {
  const txt = messageInput.value.trim();
  if (!txt) return;
  if (selectedGroup) drafts[selectedGroup] = txt;
  else if (currentDM?.chatId) drafts[currentDM.chatId] = txt;
});

export function renderDraft() {
  if (selectedGroup) {
    messageInput.value = drafts[selectedGroup] || "";
  } else if (currentDM?.chatId) {
    messageInput.value = drafts[currentDM.chatId] || "";
  } else {
    messageInput.value = "";
  }
  autoResizeTextarea();
  updateCharCount();
}

export function updateCharCount() {
  const len = messageInput.value.length;
  const left = 1000 - len;
  document.getElementById("charCount").textContent = left;
  chatInputForm.querySelector("button[type=submit]").disabled =
    !len || len > 1000;
}
