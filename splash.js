//СПЛЭШИ

// @ts-check
const splashScreen = document.getElementById("splashScreen");
const splashText = document.getElementById("splashText");
const splashSubText = document.getElementById("splashSubText");

const baseText = "абоба";
const dots = [".", "..", "..."];
let dotIndex = 0;

const subTexts = ["абобус", "лабобу", "абоба", "ладно", "окак", "абобик", "баобаб"];
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
    showOnboarding()
}

function showOnboarding() {
    const onboardingShown = localStorage.getItem("onboardingShown");
    const onboarding = document.getElementById("onboarding");
    const onboardingOk = document.getElementById("onboardingOk");
    const dontShowAgain = document.getElementById("dontShowAgain");

    if (!onboardingShown) {
        onboarding.style.display = "flex";
    }

    onboardingOk.addEventListener("click", () => {
        if (dontShowAgain.checked) {
            localStorage.setItem("onboardingShown", "true");
        }
        onboarding.style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}
