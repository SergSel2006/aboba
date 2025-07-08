// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC-en4T_Vozvrz7o5dyuYRpZ_4j_ACX3pA",
  authDomain: "abobaserver-49923.firebaseapp.com",
  projectId: "abobaserver-49923",
  storageBucket: "abobaserver-49923.appspot.com",
  messagingSenderId: "364642279962",
  appId: "1:364642279962:web:d383373e63e81353d067a3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
