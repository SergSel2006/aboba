//СПЛЭШИ
"use strict";
const splashScreen = document.getElementById("splashScreen");
const splashText = document.getElementById("splashText");
const splashSubText = document.getElementById("splashSubText");

const baseText = "абоба";
const dots = [".", "..", "..."];
let dotIndex = 0;

const subTexts = ["абобус", "лабобу", "абоба", "ладно", "окак", "абобик"];
let subIndex = 0;

function updateSplash() {
    splashText.textContent = baseText + dots[dotIndex];
    dotIndex = (dotIndex + 1) % dots.length;

    splashSubText.textContent = subTexts[subIndex];
    subIndex = Math.floor(Math.random() * subTexts.length);
}

const splashInterval = setInterval(updateSplash, 1000);

// Функция скрытия сплэша, вызывай после загрузки
export function hideSplash() {
    clearInterval(splashInterval);
    splashScreen.style.display = "none";
}
