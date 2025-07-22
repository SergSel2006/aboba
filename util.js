"use strict";
export const formatTime = (d) =>
d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const formatDate = (d) => {
    const now = new Date();
    const diff = now - d;
    const day = 86400000;
    if (diff < day) return "Сегодня"; // + && now.getDate() === d.getDate()
    if (diff < 2 * day) return "Вчера"; // + && now.getDate() - 1 === d.getDate()
    return d.toLocaleDateString();
};
