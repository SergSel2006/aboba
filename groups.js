// groups.js
import { startChat } from './chat.js';

export const selectedGroupId = { value: null };

const groups = [
  { name: "aboba global", id: "aboba_global", password: null },
  { name: "закрытая 1", id: "private_1", password: "1234" },
  { name: "закрытая 2", id: "private_2", password: "abcd" }
];

export function renderGroupList() {
  const groupList = document.getElementById('groupList');
  groupList.innerHTML = '';
  groups.forEach(g => {
    const btn = document.createElement('button');
    btn.textContent = g.name;
    btn.onclick = () => joinGroup(g);
    groupList.appendChild(btn);
  });
}

async function joinGroup(g) {
  if (g.password) {
    const pass = prompt(`Пароль для ${g.name}`);
    if (pass !== g.password) return;
  }
  selectedGroupId.value = g.id;
  document.getElementById('groupNameDisplay').textContent = g.name;
  startChat();
}
