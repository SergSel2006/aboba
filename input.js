import { messageInput, chatInputForm, charCount, isMobile, CHAR_LIMIT } from "./globals.js";


// Обработка нажатия клавиш Enter и Shift+Enter с учётом мобильных и ПК
messageInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    if (!isMobile) {
        e.preventDefault();
        // На десктопах: Enter без Shift — отправляем сообщение
        if (!chatInputForm.querySelector("button[type=submit]").disabled) {
            chatInputForm.dispatchEvent(new Event("submit", { cancelable: true }));
        }
    }
});



export function updateCharCount() {
    const len = messageInput.value.length;
    const left = CHAR_LIMIT - len;
    charCount.textContent = left;
    chatInputForm.querySelector("button[type=submit]").disabled = !len || len > CHAR_LIMIT;
};
messageInput.addEventListener("keyup", updateCharCount)
