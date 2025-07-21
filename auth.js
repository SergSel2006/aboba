import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.3.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js"
import { googleLoginBtn, logoutBtn } from "./globals.js"

"use strict";
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

googleLoginBtn.onclick = () => {
    loginMsg.textContent = "";
    signInWithPopup(auth, new GoogleAuthProvider()).catch(
        (e) => (loginMsg.textContent = "Ошибка входа: " + e.message)
    );
};

logoutBtn.onclick = () => {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
    signOut(auth);

    profileBtn.style.display = "none";
    profilePanel.style.display = "none";
    openJoinModalBtn.style.display = "none";
    profileBtn.setAttribute("aria-expanded", "false");

    updateChatInputVisibility();
};
