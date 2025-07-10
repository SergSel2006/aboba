// main.js
import { initAuth } from './auth.js';
import { setupProfileUI } from './profile.js';
import { setupMessageForm } from './chat.js';

document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');

  setTimeout(() => {
    splash.style.display = 'none';
    app.style.display = 'flex';
  }, 2500);

  initAuth();
  setupProfileUI();
  setupMessageForm();
});
