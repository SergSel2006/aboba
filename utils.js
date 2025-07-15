// utils.js
// Формат времени для сообщений (часы:минуты)
export function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Формат даты (Сегодня, Вчера, или дата)
export function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const day = 86400000;

  if (diff < day && now.getDate() === date.getDate()) return "Сегодня";
  if (diff < 2 * day && now.getDate() - 1 === date.getDate()) return "Вчера";
  return date.toLocaleDateString();
}

// Стабильный айди для ЛС, сортируем массив uid'ов, чтобы порядок не влиял
export function getDMChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}
