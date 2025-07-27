// Хотя кажется, что этот файл управляет всем хранилищем,
// на самом деле тут всег лишь управление сохранением и загрузкой
// всякой всячиной...
// @ts-check
import { setDrafts, setCurrentDM, currentDM, profilesCache, setProfilesCache, drafts, messageInput } from "./globals.js";
window.addEventListener("beforeunload", () => {
    const txt = messageInput.value.trim();
    if (txt) {
        if (currentDM?.chatId) {drafts[currentDM.chatId] = txt;} else {drafts[selectedGroup] = txt}
    }
    localStorage.setItem("drafts", JSON.stringify(drafts)) // ИИ явно сделал какую-то дичь, когда можно было бы просто сохранить тескт черновиков)))
    localStorage.setItem("currentDM", JSON.stringify(currentDM))
    localStorage.setItem("profilesCache", JSON.stringify(profilesCache))
});

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("drafts")) {
        setDrafts(JSON.parse(localStorage.getItem("drafts")));
    }
    setCurrentDM(JSON.parse(localStorage.getItem("currentDM")));
    if (localStorage.getItem("profilesCache")) {
        setProfilesCache(JSON.parse(localStorage.getItem("profilesCache")));
    }

});
