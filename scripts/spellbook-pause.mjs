const MODULE_ID = "spellbook-pause";
const DEFAULT_IMAGE_PATH = `modules/${MODULE_ID}/assets/spellbook-pause.gif`;
const OVERLAY_ID = "spellbook-pause-overlay";
const SOURCE_CLASS = "spellbook-pause-source";
const ACTIVE_CLASS = "spellbook-pause-active";
const ENTER_CLASS = "spellbook-pause-entering";
const EXIT_CLASS = "spellbook-pause-exiting";
const FADE_DURATION_MS = 450;
const FORCE_SYNC_DELAYS_MS = [50, 250, 1000, 3000];

const SETTINGS = {
  position: "position"
};

const DEFAULT_MESSAGES = [
  "故事由你们书写",
  "火光仍在地城深处摇曳",
  "命运正在等待骰子的裁决",
  "冒险暂时停驻",
  "旅途尚未结束",
  "英雄们正在扎营",
  "下一页传奇尚未展开。"
];

let wasPaused = false;
let lastMessage = "";
let exitTimer = null;

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  ensureOverlay();
  forceSyncPauseState({ randomize: game.paused });

  Hooks.on("pauseGame", (paused) => {
    forceSyncPauseState({ randomize: paused, fadeOut: !paused });
  });

  Hooks.on("renderPause", () => {
    forceSyncPauseState();
  });

  Hooks.on("canvasReady", () => {
    forceSyncPauseState();
  });

  game.socket?.on("pause", (paused) => {
    forceSyncPauseState({ fadeOut: !paused });
  });

  window.addEventListener("focus", () => {
    forceSyncPauseState();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") forceSyncPauseState();
  });
});

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.position, {
    name: "暂停动画位置",
    hint: "选择法术书暂停动画显示在屏幕中央，或显示在屏幕下方 1/4 的位置。",
    scope: "world",
    config: true,
    type: String,
    choices: {
      center: "屏幕中央",
      lowerQuarter: "屏幕下方 1/4"
    },
    default: "center",
    onChange: () => updateOverlayPosition()
  });
}

function forceSyncPauseState({ randomize = false, fadeOut = false } = {}) {
  syncPauseState({ randomize, fadeOut });

  const delays = fadeOut ? [FADE_DURATION_MS + 50, 1000, 3000] : FORCE_SYNC_DELAYS_MS;
  for (const delay of delays) {
    window.setTimeout(() => syncPauseState(), delay);
  }
}

function syncPauseState({ randomize = false, fadeOut = false } = {}) {
  hideFoundryPause();
  if (isPauseActive()) showSpellbookPause({ randomize });
  else if (fadeOut) startFadeOut();
  else hideSpellbookPause();
}

function ensureOverlay() {
  let overlay = getOverlay();
  if (!overlay) {
    overlay = document.createElement("figure");
    overlay.id = OVERLAY_ID;
    overlay.className = "spellbook-pause-overlay";

    const image = document.createElement("img");
    image.className = "spellbook-pause__image";
    image.src = DEFAULT_IMAGE_PATH;
    image.alt = "Spellbook pause";
    image.draggable = false;

    const caption = document.createElement("figcaption");
    caption.className = "spellbook-pause__caption";

    overlay.append(image, caption);
    document.body.append(overlay);
  }

  updateOverlayPosition(overlay);
  return overlay;
}

function getOverlay() {
  return document.getElementById(OVERLAY_ID);
}

function hideFoundryPause() {
  const pause = document.getElementById("pause");
  if (!pause) return;

  pause.classList.remove("spellbook-pause", ACTIVE_CLASS, ENTER_CLASS, EXIT_CLASS);
  pause.classList.add(SOURCE_CLASS);
}

function showSpellbookPause({ randomize = false } = {}) {
  const overlay = ensureOverlay();
  window.clearTimeout(exitTimer);
  exitTimer = null;

  if (!wasPaused || randomize || !overlay.dataset.spellbookPauseMessage) {
    setPauseMessage(overlay, pickMessage());
  }

  const wasActive = overlay.classList.contains(ACTIVE_CLASS) && !overlay.classList.contains(EXIT_CLASS);
  overlay.classList.remove(EXIT_CLASS);
  overlay.classList.add(ACTIVE_CLASS);
  if (!wasActive) {
    restartClassAnimation(overlay, ENTER_CLASS);
  }

  wasPaused = true;
}

function startFadeOut() {
  const overlay = getOverlay();
  if (!overlay || (!wasPaused && !overlay.classList.contains(ACTIVE_CLASS))) return;

  window.clearTimeout(exitTimer);
  overlay.classList.remove(ENTER_CLASS);
  overlay.classList.add(ACTIVE_CLASS, EXIT_CLASS);
  hideFoundryPause();
  wasPaused = false;

  exitTimer = window.setTimeout(() => {
    hideSpellbookPause();
  }, FADE_DURATION_MS);
}

function hideSpellbookPause() {
  const overlay = getOverlay();
  if (!overlay) return;

  window.clearTimeout(exitTimer);
  exitTimer = null;
  overlay.classList.remove(ACTIVE_CLASS, ENTER_CLASS, EXIT_CLASS);
  delete overlay.dataset.spellbookPauseMessage;
  wasPaused = false;
}

function restartClassAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function setPauseMessage(overlay, message) {
  const caption = overlay.querySelector(".spellbook-pause__caption");
  if (!caption) return;

  overlay.dataset.spellbookPauseMessage = message;
  caption.textContent = message;
}

function pickMessage() {
  if (DEFAULT_MESSAGES.length === 1) return DEFAULT_MESSAGES[0];

  let message = DEFAULT_MESSAGES[Math.floor(Math.random() * DEFAULT_MESSAGES.length)];
  if (message === lastMessage) {
    const index = (DEFAULT_MESSAGES.indexOf(message) + 1) % DEFAULT_MESSAGES.length;
    message = DEFAULT_MESSAGES[index];
  }
  lastMessage = message;
  return message;
}

function updateOverlayPosition(overlay = getOverlay()) {
  if (!overlay) return;
  overlay.dataset.spellbookPausePosition = getPosition();
}

function getPosition() {
  const value = game.settings.get(MODULE_ID, SETTINGS.position);
  return value === "lowerQuarter" ? "lowerQuarter" : "center";
}

function isPauseActive() {
  const pause = document.getElementById("pause");
  if (game.paused) return true;
  if (pause?.classList.contains("paused")) return true;
  return false;
}
