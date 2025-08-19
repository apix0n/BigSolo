// js/pages/series-detail/MangaReader/events.js
import { qs, qsa, slugify } from "../../../utils/domUtils.js";
import { state, dom, domImages } from "./state.js";
import {
  renderViewer,
  activateChapterStats,
  renderInteractionsSection,
  updateUIOnPageChange,
  refreshChapterStatsUI,
} from "./ui.js";
import { calculateSpreads } from "./data.js";
import { changeSpread, navigateToChapter } from "./navigation.js";
import {
  saveSettings,
  settingsConfig,
  updateAllSettingsUI,
} from "./settings.js";
import {
  queueAction,
  getLocalInteractionState,
  setLocalInteractionState,
  addPendingComment,
} from "../../../utils/interactions.js";
import { assignUserIdentityForChapter } from "../../../utils/usernameGenerator.js";

let scrollTimeout = null;

export function updateLayout() {
  let infoWidth = 0;
  let settingsWidth = 0;
  const rootStyle = getComputedStyle(document.documentElement);
  const infoWidthRem = parseFloat(
    rootStyle.getPropertyValue("--sidebar-info-width")
  );
  const settingsWidthRem = parseFloat(
    rootStyle.getPropertyValue("--sidebar-settings-width")
  );
  const baseFontSize = parseFloat(rootStyle.fontSize);

  // --- NOUVELLE LOGIQUE DE POSITIONNEMENT ---
  if (state.settings.infoSidebarOpen && dom.infoSidebar) {
    infoWidth = infoWidthRem * baseFontSize;
    dom.infoSidebar.style.transform = "translateX(0)";
  } else if (dom.infoSidebar) {
    dom.infoSidebar.style.transform = "translateX(-100%)";
  }

  if (state.settings.settingsSidebarOpen && dom.settingsSidebar) {
    settingsWidth = settingsWidthRem * baseFontSize;
    dom.settingsSidebar.style.transform = `translateX(${infoWidth}px)`;
  } else if (dom.settingsSidebar) {
    const totalOffset = infoWidth + settingsWidthRem * baseFontSize;
    dom.settingsSidebar.style.transform = `translateX(-${totalOffset}px)`;
  }

  // Décale le container du manga
  const totalMargin = infoWidth + settingsWidth;
  const readerContainer = dom.viewerContainer?.parentElement;
  if (readerContainer) {
    readerContainer.style.marginLeft = `${totalMargin}px`;
  }
}

export function initializeEvents() {
  console.log("Initialisation des événements du lecteur...");

  dom.toggleInfoBtn.addEventListener("click", () => {
    state.settings.infoSidebarOpen = !state.settings.infoSidebarOpen;
    dom.toggleInfoBtn.classList.toggle(
      "active",
      state.settings.infoSidebarOpen
    );
    saveSettings();
    updateLayout();
  });

  dom.toggleSettingsBtn.addEventListener("click", () => {
    state.settings.settingsSidebarOpen = !state.settings.settingsSidebarOpen;
    dom.toggleSettingsBtn.classList.toggle(
      "active",
      state.settings.settingsSidebarOpen
    );
    saveSettings();
    updateLayout();
  });

  // --- AJOUT : Gestion du bouton global like ---
  if (dom.toggleLikeBtn) {
    dom.toggleLikeBtn.addEventListener("click", () => {
      const seriesSlug = slugify(state.seriesData.title);
      const chapterNumber = state.currentChapter.number;
      const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
      let localState = getLocalInteractionState(interactionKey) || {};
      const isLiked = !!localState.liked;

      // Toggle like
      localState.liked = !isLiked;
      setLocalInteractionState(interactionKey, localState);

      // Ajoute à la file d'attente
      queueAction(seriesSlug, {
        type: localState.liked ? "like" : "unlike",
        chapter: chapterNumber,
      });

      // Met à jour l'UI (bouton global + stats sidebar)
      updateLikeUI();
    });
  }

  // --- AJOUT : Gestion du bouton like dans la sidebar (chapter-stats-details) ---
  document.addEventListener("click", (e) => {
    const likeBtn = e.target.closest(".chapter-like-btn");
    if (likeBtn) {
      const seriesSlug = slugify(state.seriesData.title);
      const chapterNumber = state.currentChapter.number;
      const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
      let localState = getLocalInteractionState(interactionKey) || {};
      const isLiked = !!localState.liked;

      // Toggle like
      localState.liked = !isLiked;
      setLocalInteractionState(interactionKey, localState);

      // Ajoute à la file d'attente
      queueAction(seriesSlug, {
        type: localState.liked ? "like" : "unlike",
        chapter: chapterNumber,
      });

      // Met à jour l'UI (bouton global + stats sidebar)
      updateLikeUI();
    }
  });

  // --- AJOUT : Gestion du like sur les commentaires ---
  document.addEventListener("click", (e) => {
    const commentLikeBtn = e.target.closest(".comment-like-action");
    if (commentLikeBtn) {
      const commentItem = commentLikeBtn.closest(".comment-item");
      if (!commentItem) return;
      const commentId = commentItem.dataset.commentId;
      const seriesSlug = slugify(state.seriesData.title);
      const chapterNumber = state.currentChapter.number;
      const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
      let localState = getLocalInteractionState(interactionKey) || {};
      if (!localState.likedComments) localState.likedComments = [];
      const idx = localState.likedComments.indexOf(commentId);
      const isLiked = idx !== -1;

      // Toggle like
      if (isLiked) {
        localState.likedComments.splice(idx, 1);
      } else {
        localState.likedComments.push(commentId);
      }
      setLocalInteractionState(interactionKey, localState);

      // Ajoute à la file d'attente
      queueAction(seriesSlug, {
        type: isLiked ? "unlike_comment" : "like_comment",
        chapter: chapterNumber,
        commentId,
      });

      // Met à jour l'UI
      updateCommentLikesUI();
    }
  });

  if (dom.chapterList) {
    dom.chapterList.addEventListener("click", (e) => {
      e.preventDefault();
      const link = e.target.closest("a");
      if (link) {
        const chapterId = link.dataset.chapterId;
        if (chapterId && chapterId !== state.currentChapter.number) {
          // Redirige vers l'URL du chapitre (reload propre)
          const seriesSlug = slugify(state.seriesData.title);
          window.location.href = `/${seriesSlug}/${chapterId}`;
        } else {
          activateChapterStats(link);
        }
      }
    });
  }

  setupSettingsEvents();

  document.addEventListener("keydown", handleKeyDown);
  dom.viewerContainer.addEventListener("click", handleViewerClick);
  dom.viewerContainer.addEventListener("scroll", handleWebtoonScroll, {
    passive: true,
  });

  console.log("Événements du lecteur initialisés.");
}

function setupSettingsEvents() {
  console.log("Configuration des événements de paramètres...");

  // --- Logique pour les boutons principaux (Mode, Ajustement) ---
  qsa(".main-setting-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const settingName = btn.dataset.setting;
      const config = settingsConfig[settingName];
      const currentValue = state.settings[settingName];
      const currentIndex = config.options.findIndex(
        (opt) => opt.value === currentValue
      );
      const nextIndex = (currentIndex + 1) % config.options.length;
      state.settings[settingName] = config.options[nextIndex].value;

      if (settingName === "mode") {
        calculateSpreads();
      }

      renderViewer();
      saveSettings();
      updateAllSettingsUI();
    });
  });

  // --- Logique pour les boutons secondaires (Décalage, Direction, Étirer) ---
  qsa(".secondary-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const subSetting = btn.dataset.subSetting;
      if (subSetting === "direction") {
        state.settings.direction =
          state.settings.direction === "ltr" ? "rtl" : "ltr";
      } else {
        state.settings[subSetting] = !state.settings[subSetting];
      }

      if (subSetting === "doublePageOffset") {
        calculateSpreads();
      }

      renderViewer();
      saveSettings();
      updateAllSettingsUI();
    });
  });

  // --- NOUVELLE LOGIQUE POUR LES SLIDERS INTERACTIFS ---
  qsa(".slider-control").forEach((control) => {
    const header = control.querySelector(".slider-header");
    const slider = control.querySelector(".PB-range-slider");
    const valueDisplay = control.querySelector(".PB-range-slidervalue");
    const settingName = control.dataset.subSetting; // 'limitWidth' ou 'limitHeight'
    const valueSettingName =
      settingName === "limitWidth" ? "customMaxWidth" : "customMaxHeight";

    // 1. Écouteur pour le clic sur l'en-tête (la "checkbox")
    if (header) {
      header.addEventListener("click", () => {
        state.settings[settingName] = !state.settings[settingName];
        renderViewer();
        saveSettings();
        updateAllSettingsUI();
      });
    }

    // 2. Écouteur pour le mouvement du slider
    if (slider && valueDisplay) {
      slider.addEventListener("input", () => {
        const newValue = slider.value;
        valueDisplay.textContent = `${newValue}px`;
        state.settings[valueSettingName] = parseInt(newValue, 10);
        renderViewer();
      });

      slider.addEventListener("change", saveSettings);

      // Empêche le contrôle du slider avec les flèches du clavier
      slider.addEventListener("keydown", (e) => {
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        ) {
          e.preventDefault();
        }
      });
    }
  });
  console.log("Événements de paramètres configurés.");
}

export function attachInteractionListeners() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;

  if (dom.commentSendBtn) {
    const newSendBtn = dom.commentSendBtn.cloneNode(true);
    dom.commentSendBtn.parentNode.replaceChild(newSendBtn, dom.commentSendBtn);
    dom.commentSendBtn = newSendBtn;

    dom.commentSendBtn.addEventListener("click", async () => {
      const commentText = dom.commentTextarea.value.trim();
      if (commentText.length === 0) return;

      const userIdentity = await assignUserIdentityForChapter(interactionKey);
      const newComment = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        username: userIdentity.username,
        avatarUrl: userIdentity.avatarUrl,
        comment: commentText,
        timestamp: Date.now(),
        likes: 0,
      };

      addPendingComment(interactionKey, newComment);
      state.chapterStats.comments.unshift(newComment);
      renderInteractionsSection(getLocalInteractionState(interactionKey));
      attachInteractionListeners();
      queueAction(seriesSlug, {
        type: "add_comment",
        chapter: chapterNumber,
        payload: newComment,
      });
      dom.commentTextarea.value = "";
      dom.commentTextarea.style.height = "auto";

      // --- Ajout : refresh dynamique du compteur de commentaires dans la sidebar ---
      console.log(
        "[MangaReader][events] Comment added, refreshing chapter stats UI"
      );
      if (typeof refreshChapterStatsUI === "function") {
        refreshChapterStatsUI();
      } else if (window.refreshChapterStatsUI) {
        window.refreshChapterStatsUI();
      }
    });
  }

  if (dom.commentTextarea) {
    dom.commentTextarea.addEventListener("input", () => {
      dom.commentTextarea.style.height = "auto";
      const newHeight = Math.min(dom.commentTextarea.scrollHeight, 120);
      dom.commentTextarea.style.height = `${newHeight}px`;
    });
  }
}

function handleKeyDown(e) {
  if (state.settings.mode === "webtoon") return;
  const direction = state.settings.direction;
  if (e.key === "ArrowRight") changeSpread(direction === "ltr" ? 1 : -1);
  if (e.key === "ArrowLeft") changeSpread(direction === "ltr" ? -1 : 1);
}

function handleViewerClick(e) {
  if (state.settings.mode === "webtoon") return;
  const rect = dom.viewerContainer.getBoundingClientRect();
  const zone = (e.clientX - rect.left) / rect.width;
  const direction = state.settings.direction;
  if (zone < 0.35) changeSpread(direction === "ltr" ? -1 : 1);
  else if (zone > 0.65) changeSpread(direction === "ltr" ? 1 : -1);
}

function handleWebtoonScroll() {
  if (state.settings.mode !== "webtoon") return;
  if (scrollTimeout) window.cancelAnimationFrame(scrollTimeout);
  scrollTimeout = window.requestAnimationFrame(() => {
    const triggerPoint = window.innerHeight * 0.4;
    let closestImageIndex = -1;
    let minDistance = Infinity;
    const imagesInViewer = qsa(".reader-viewer-container img");

    imagesInViewer.forEach((img, index) => {
      const rect = img.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const distance = Math.abs(rect.top - triggerPoint);
        if (distance < minDistance) {
          minDistance = distance;
          closestImageIndex = index;
        }
      }
    });

    if (closestImageIndex !== -1) {
      const newSpreadIndex = state.pageToSpreadMap[closestImageIndex];
      if (
        newSpreadIndex !== undefined &&
        newSpreadIndex !== state.currentSpreadIndex
      ) {
        state.currentSpreadIndex = newSpreadIndex;
        updateUIOnPageChange();
      }
    }
  });
}

// --- AJOUT : Fonction pour mettre à jour l'état visuel des likes (global + sidebar) ---
function updateLikeUI() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  const localState = getLocalInteractionState(interactionKey) || {};
  const isLiked = !!localState.liked;

  // Bouton global
  if (dom.toggleLikeBtn) {
    dom.toggleLikeBtn.classList.toggle("liked", isLiked);
  }

  // Sidebar (chapter-stats-details)
  const stats = document.querySelector(".chapter-stats-details");
  if (stats) {
    const heart = stats.querySelector(".fa-heart");
    const count = stats.querySelector(".chapter-likes-count");
    if (heart) heart.classList.toggle("liked", isLiked);
    if (count) count.classList.toggle("liked", isLiked);

    // Compteur optimiste (+1 si like local)
    let baseLikes =
      state.chapterStats && typeof state.chapterStats.likes === "number"
        ? state.chapterStats.likes
        : 0;
    count.textContent = isLiked ? baseLikes + 1 : baseLikes;
  }

  // Bouton like dans la liste des chapitres (si besoin, à ajouter si multi-chapitre)
}

// --- AJOUT : Fonction pour mettre à jour l'état visuel des likes sur les commentaires ---
function updateCommentLikesUI() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  const localState = getLocalInteractionState(interactionKey) || {};
  const likedComments = localState.likedComments || [];

  document.querySelectorAll(".comment-item").forEach((item) => {
    const commentId = item.dataset.commentId;
    const btn = item.querySelector(".comment-like-action");
    const heart = btn?.querySelector(".fa-heart");
    const countSpan = btn?.querySelector("span");
    if (!btn || !heart || !countSpan) return;
    const baseLikes =
      parseInt(countSpan.dataset.baseLikes || countSpan.textContent, 10) || 0;
    const isLiked = likedComments.includes(commentId);

    btn.classList.toggle("liked", isLiked);
    heart.classList.toggle("liked", isLiked);
    countSpan.classList.toggle("liked", isLiked);
    // Stocke la valeur de base pour éviter d'empiler les +1 à chaque update
    countSpan.dataset.baseLikes = baseLikes;
    countSpan.textContent = isLiked ? baseLikes + 1 : baseLikes;
  });
}

// À la fin de renderInteractionsSection dans ui.js, appeler updateCommentLikesUI pour appliquer l'état visuel après chaque rendu
// (À ajouter dans ui.js, pas ici, mais rappel pour intégration)
