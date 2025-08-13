// globals.js

// константные значения
export const CHAR_LIMIT = 1000
export const VERSION = "0.0.1-alpha"

// DOM-элементы
export const loginForm = document.getElementById("loginForm");
export const googleLoginBtn = document.getElementById("googleLoginBtn");
export const loginMsg = document.getElementById("loginMsg");
export const mainLayout = document.getElementById('mainLayout');
export const chatLayout = document.getElementById("chatLayout");
export const groupList = document.getElementById("groupList");
export const groupNameDisplay = document.getElementById("groupNameDisplay");
export const messagesDiv = document.getElementById("messages");
export const chatInputForm = document.getElementById("chatInput");
export const messageInput = document.getElementById("messageInput");
export const charCount = document.getElementById("charCount");
export const profileBtn = document.getElementById("profileBtn");
export const profilePanel = document.getElementById("profilePanel");
export const profileForm = document.getElementById("profileForm");
export const profileNick = document.getElementById("profileNick");
export const profileNickError = document.getElementById("profileNickError");
export const profileAvatar = document.getElementById("profileAvatar");
export const profileColor = document.getElementById("profileColor");
export const profileStatus = document.getElementById("profileStatus");
export const statusCounter = document.getElementById("statusCounter");
export const logoutBtn = document.getElementById("logoutBtn");

export const userProfileModal = document.getElementById("userProfileModal");
export const closeUserModalBtn = document.getElementById("closeUserModal");
export const userModalAvatar = document.getElementById("userModalAvatar");
export const userModalNick = document.getElementById("userModalNick");
export const userModalStatus = document.getElementById("userModalStatus");
export const userModalMsgBtn = document.getElementById("userModalMsgBtn");

export const joinModal = document.getElementById("joinGroupModal");
export const closeJoinModal = document.getElementById("closeJoinModal");
export const openJoinModalBtn = document.getElementById("openJoinModalBtn");
export const joinGroupForm = document.getElementById("joinGroupForm");
export const joinGroupName = document.getElementById("joinGroupName");
export const joinGroupCode = document.getElementById("joinGroupCode");
export const joinGroupPassword = document.getElementById("joinGroupPassword");
export const joinGroupError = document.getElementById("joinGroupError");

// @ts-check
// Состояния
export let currentUser;
export let groups = [];
export let selectedGroup = null;
export let selectedChat = { "id": null, "isGroup": false };
export let currentDM = null;
export let unsubscribe = null;
export let drafts = {};
export let dmChats = [];
export let profilesCache = {};

// Флаги
export const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

// Функции обновления состояний (для других модулей)
export function setCurrentUser(user) {
    currentUser = user;
}

export function setGroups(g) {
    groups = g;
}

export function addGroup(g) {
    groups.push(g)
}

export function setSelectedGroup(sg) {
    selectedGroup = sg;
}

export function setCurrentDM(dm) {
    currentDM = dm;
}

export function setUnsubscribe(fn) {
    unsubscribe = fn;
}

export function setDrafts(dr) {
    drafts = dr
}

export function setDMChats(dmc) {
    dmChats = dmc
}

export function addDMchat(dmc) {
    dmChats.push(dmc)
}

export function setProfilesCache(pc) {
    profilesCache = pc
}

export function addProfileCache(key, pc) {
    profilesCache[key] = pc
}
