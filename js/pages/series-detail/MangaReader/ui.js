// js/pages/series-detail/MangaReader/ui.js
import { qs, qsa, slugify } from "../../../utils/domUtils.js";
import { state, dom, domImages } from "./state.js";
import { timeAgo } from "../../../utils/dateUtils.js";
import { settingsConfig, updateAllSettingsUI } from "./settings.js";

export function handleError(message) {
  console.error(message);
  const root = qs("#manga-reader-root");
  if (root)
    root.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--clr-text-sub);">${message}</p>`;
}

export function setupUI() {
  console.log("[MangaReader][setupUI] Appelée à l'initialisation du lecteur");
  console.log("[MangaReader][setupUI] state.seriesData:", state.seriesData);
  console.log(
    "[MangaReader][setupUI] state.currentChapter:",
    state.currentChapter
  );

  // --- Correction : déduction du slug si absent ---
  let seriesSlug = state.seriesData && state.seriesData.slug;
  if (!seriesSlug && state.seriesData && state.seriesData.title) {
    // Utilise la même logique que le backend pour slugify
    seriesSlug = state.seriesData.title
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[\s\u3000]+/g, "_")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "_");
    console.log(
      "[MangaReader][setupUI] Slug déduit depuis le titre :",
      seriesSlug
    );
  }
  const chapterNumber = state.currentChapter && state.currentChapter.number;

  console.log("[MangaReader][setupUI] seriesSlug utilisé :", seriesSlug);
  console.log(
    "[MangaReader][setupUI] state.currentChapter.number:",
    chapterNumber
  );

  // --- LOG DEBUG : Affiche tout ce qui concerne la récupération des stats serveur ---
  if (
    seriesSlug &&
    typeof seriesSlug === "string" &&
    seriesSlug.length > 0 &&
    chapterNumber !== undefined &&
    chapterNumber !== null &&
    chapterNumber !== ""
  ) {
    console.log(
      "[setupUI] Lancement du fetch /api/series-stats?slug=" + seriesSlug
    );
    fetch(`/api/series-stats?slug=${encodeURIComponent(seriesSlug)}`)
      .then(async (r) => {
        const raw = await r.clone().text();
        console.log(
          "[MangaReader][series-stats] HTTP status:",
          r.status,
          "Raw body:",
          raw
        );
        let stats = {};
        try {
          stats = JSON.parse(raw);
        } catch (e) {
          console.warn(
            "[MangaReader][series-stats] Erreur de parsing JSON stats",
            e
          );
        }
        window._lastSeriesStats = stats;
        // Log détaillé sur la clé et la valeur
        const chapterKey = String(chapterNumber);
        console.log(
          "[setupUI] window._lastSeriesStats:",
          window._lastSeriesStats
        );
        console.log(
          "[setupUI] window._lastSeriesStats[chapterKey]:",
          window._lastSeriesStats && window._lastSeriesStats[chapterKey]
        );
        if (stats && stats[chapterKey]) {
          state.chapterStats = stats[chapterKey];
          console.log(
            "[setupUI] state.chapterStats mis à jour:",
            state.chapterStats
          );
        } else {
          console.log(
            "[setupUI] Pas de stats serveur pour chapterKey",
            chapterKey,
            stats
          );
        }
        setTimeout(() => {
          const activeLink = document.querySelector(".chapter-list a.active");
          if (activeLink) {
            console.log(
              "[setupUI] Appel de activateChapterStats après fetch stats serveur"
            );
            activateChapterStats(activeLink, true);
          } else {
            console.log(
              "[setupUI] Aucun .chapter-list a.active trouvé après fetch stats serveur"
            );
          }
        }, 0);
      })
      .catch((e) => {
        console.warn(
          "[MangaReader][series-stats] Erreur récupération stats serveur",
          e
        );
      });
  } else {
    console.warn(
      "[MangaReader][setupUI] Données serveur non requêtées car seriesSlug ou chapterNumber est indéfini ou vide.",
      {
        seriesSlug,
        chapterNumber,
      }
    );
  }

  dom.root = qs("#manga-reader-root");
  dom.root.innerHTML = `
    <div id="global-reader-controls">
        <button id="toggle-info-sidebar-btn" title="Informations"><i class="fas fa-info-circle"></i></button>
        <button id="toggle-settings-sidebar-btn" title="Paramètres"><i class="fas fa-cog"></i></button>
        <button id="toggle-chapters-like" title="J'aime ce chapitre"><i class="fas fa-heart"></i></button>
        <span id="live-page-counter"></span>
    </div>
    <div class="reader-layout-container">
        <aside id="info-sidebar" class="reader-sidebar"></aside>
        <aside id="settings-sidebar" class="reader-sidebar"></aside>
        <div class="reader-container">
            <div class="reader-viewer-container"><p style="color: var(--clr-text-sub);">Chargement des pages...</p></div>
        </div>
    </div>`;

  Object.assign(dom, {
    infoSidebar: qs("#info-sidebar"),
    settingsSidebar: qs("#settings-sidebar"),
    viewerContainer: qs(".reader-viewer-container"),
    toggleInfoBtn: qs("#toggle-info-sidebar-btn"),
    toggleSettingsBtn: qs("#toggle-settings-sidebar-btn"),
    toggleLikeBtn: qs("#toggle-chapters-like"),
    pageCounter: qs("#live-page-counter"),
  });

  dom.infoSidebar.classList.toggle("is-open", state.settings.infoSidebarOpen);
  dom.toggleInfoBtn.classList.toggle("active", state.settings.infoSidebarOpen);
  dom.settingsSidebar.classList.toggle(
    "is-open",
    state.settings.settingsSidebarOpen
  );
  dom.toggleSettingsBtn.classList.toggle(
    "active",
    state.settings.settingsSidebarOpen
  );

  renderSidebarsContent();

  // --- Ajout : synchronisation affichage like global au chargement ---
  syncGlobalLikeButton();
}

function syncGlobalLikeButton() {
  // Synchronise l'état du bouton like global selon le localStorage
  if (!dom.toggleLikeBtn) return;
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
  let localState = {};
  try {
    localState = JSON.parse(localStorage.getItem(interactionKey)) || {};
  } catch {}
  const isLiked = !!localState.liked;
  dom.toggleLikeBtn.classList.toggle("liked", isLiked);
}

function renderSidebarsContent() {
  dom.infoSidebar.innerHTML = `<div class="sidebar-content-wrapper">
        <div id="info-series-link-group" class="control-group"><a id="info-series-link" href="/${slugify(
          state.seriesData.title
        )}"><i class="fas fa-arrow-left"></i> ${
    state.seriesData.title
  }</a></div>
        <div id="info-chapters-group" class="control-group"><h4 class="group-title">Chapitres</h4><div class="chapter-list-wrapper"><div class="chapter-list"></div></div></div>
        <div id="info-comments-group" class="control-group"><h4 class="group-title">Commentaires</h4><div class="add-comment-box"><textarea id="comment-textarea" placeholder="Ajouter un commentaire..." rows="1"></textarea><div class="add-comment-actions"><button class="send-btn">Envoyer <i class="fas fa-paper-plane"></i></button></div></div><div class="comments-list"></div></div>
    </div>`;

  dom.settingsSidebar.innerHTML = `<div class="sidebar-content-wrapper">
    <div id="settings-mode-group" class="control-group"><h4 class="group-title">Mode de lecture</h4><button class="main-setting-btn" data-setting="mode"></button><div class="options-panel" id="mode-options-panel"><button class="secondary-toggle-btn" data-sub-setting="doublePageOffset"><i class="check-icon far fa-square"></i> Décalage double page</button><button class="secondary-toggle-btn" data-sub-setting="direction"></button></div></div>
    <div id="settings-fit-group" class="control-group"><h4 class="group-title">Ajustement</h4><button class="main-setting-btn" data-setting="fit"></button><div class="options-panel" id="fit-options-panel"><button class="secondary-toggle-btn" data-sub-setting="stretch"><i class="check-icon far fa-square"></i> Étirer les petites pages</button>
      <div class="slider-control" data-sub-setting="limitWidth">
        <div class="slider-header">
          <i class="check-icon far fa-square"></i>
          <span class="slider-label">Limiter la largeur</span>
        </div>
        <div class="slider-body">
          <div class="PB-range-slider-div">
            <input type="range" min="400" max="3000" class="PB-range-slider" id="width-slider" step="10" disabled>
            <p class="PB-range-slidervalue">1200px</p>
          </div>
        </div>
      </div>
      <div class="slider-control" data-sub-setting="limitHeight">
        <div class="slider-header">
          <i class="check-icon far fa-square"></i>
          <span class="slider-label">Limiter la hauteur</span>
        </div>
        <div class="slider-body">
          <div class="PB-range-slider-div">
            <input type="range" min="400" max="3000" class="PB-range-slider" id="height-slider" step="10" disabled>
            <p class="PB-range-slidervalue">1080px</p>
          </div>
        </div>
      </div>
    </div></div>
  </div>`;

  Object.assign(dom, {
    chapterList: qs("#info-chapters-group .chapter-list"),
    commentsList: qs("#info-comments-group .comments-list"),
    commentTextarea: qs("#comment-textarea"),
    commentSendBtn: qs("#info-comments-group .send-btn"),
  });

  renderChapterList();
  updateAllSettingsUI();
}

function truncateText(text, maxLength) {
  if (text.length > maxLength) {
    return text.substring(0, maxLength - 3) + "...";
  }
  return text;
}

export function renderChapterList() {
  if (!dom.chapterList) return;
  const CHAPTER_TITLE_MAX_LENGTH = 28;

  dom.chapterList.innerHTML = state.allChapterKeys
    .slice()
    .sort((a, b) => parseFloat(b) - parseFloat(a))
    .map((key) => {
      const chapterTitle = state.seriesData.chapters[key].title || "";
      const truncatedTitle = truncateText(
        chapterTitle,
        CHAPTER_TITLE_MAX_LENGTH
      );
      return `<a href="#" data-chapter-id="${key}" class="${
        key === state.currentChapter.number ? "active" : ""
      }" title="${chapterTitle}">
                <div class="chapter-info-main">
                  <span class="chapter-number">${key}</span>
                  <span class="chapter-title">${truncatedTitle}</span>
                </div>
              </a>`;
    })
    .join("");

  const activeLink = dom.chapterList.querySelector(".active");
  if (activeLink) {
    activateChapterStats(activeLink, true);
    // Fait défiler la liste pour que le chapitre actif soit visible au centre
    activeLink.scrollIntoView({ behavior: "auto", block: "center" });
  }
}

export function renderInteractionsSection(localState) {
  if (!dom.commentsList) return;
  const comments = (state.chapterStats.comments || []).sort(
    (a, b) => b.timestamp - a.timestamp
  );

  if (comments.length > 0) {
    dom.commentsList.innerHTML = comments
      .map((comment) => {
        // Utilise l'avatar si présent, sinon icône par défaut
        const avatarUrl = comment.avatarUrl
          ? comment.avatarUrl
          : "/img/profil.png";
        return `<div class="comment-item" data-comment-id="${comment.id}">
        <div class="comment-header">
          <div class="user">
            <div class="user-pic">
              <img src="${avatarUrl}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />
            </div>
            <div class="user-info">
              <span class="username">${comment.username || "Visiteur"}</span>
              <span class="timestamp">${timeAgo(comment.timestamp)}</span>
            </div>
          </div>
          <button class="comment-like-action" title="Aimer le commentaire">
            <i class="fas fa-heart"></i><span>${comment.likes || 0}</span>
          </button>
        </div>
        <p class="comment-content">${comment.comment}</p>
      </div>`;
      })
      .join("");
  } else {
    dom.commentsList.innerHTML = `<p style="font-size: 0.9rem; color: var(--clr-text-sub);">Aucun commentaire pour le moment.</p>`;
  }
  // --- AJOUT : applique l'état visuel des likes sur les commentaires ---
  if (window.updateCommentLikesUI) window.updateCommentLikesUI();

  // --- AJOUT : bloque le bouton "Envoyer" si déjà commenté + message explicatif + style ---
  if (dom.commentSendBtn && dom.commentTextarea) {
    const seriesSlug = slugify(state.seriesData.title);
    const chapterNumber = state.currentChapter.number;
    const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;
    let alreadyCommented = false;
    try {
      const local = JSON.parse(localStorage.getItem(interactionKey)) || {};
      if (
        Array.isArray(local.pendingComments) &&
        local.pendingComments.length > 0
      ) {
        alreadyCommented = true;
      }
    } catch {}
    dom.commentSendBtn.disabled = alreadyCommented;
    if (alreadyCommented) {
      dom.commentSendBtn.title =
        "Vous avez déjà envoyé un commentaire pour ce chapitre.";
      dom.commentSendBtn.style.opacity = "0.5";
      dom.commentSendBtn.style.pointerEvents = "none";
      dom.commentSendBtn.style.cursor = "not-allowed";
      dom.commentTextarea.value =
        "Limité à un commentaire par personne pour ce chapitre.";
      dom.commentTextarea.readOnly = true;
      dom.commentTextarea.style.opacity = "0.7";
      dom.commentTextarea.style.cursor = "not-allowed";
    } else {
      dom.commentSendBtn.title = "";
      dom.commentSendBtn.style.opacity = "";
      dom.commentSendBtn.style.pointerEvents = "";
      dom.commentSendBtn.style.cursor = "";
      dom.commentTextarea.readOnly = false;
      dom.commentTextarea.style.opacity = "";
      dom.commentTextarea.style.cursor = "";
      dom.commentTextarea.value = "";
    }
  }
}

// --- Ajout : désactive le textarea et le bouton immédiatement après envoi d'un commentaire ---
export function lockCommentInputAfterSend() {
  if (dom.commentSendBtn && dom.commentTextarea) {
    dom.commentSendBtn.disabled = true;
    dom.commentSendBtn.title =
      "Vous avez déjà envoyé un commentaire pour ce chapitre.";
    dom.commentSendBtn.style.opacity = "0.5";
    dom.commentSendBtn.style.pointerEvents = "none";
    dom.commentSendBtn.style.cursor = "not-allowed";
    dom.commentTextarea.value =
      "Limité à un commentaire par personne pour ce chapitre.";
    dom.commentTextarea.readOnly = true;
    dom.commentTextarea.style.opacity = "0.7";
    dom.commentTextarea.style.cursor = "not-allowed";
  }
}

// --- Ajout : hook à appeler juste après l'envoi d'un commentaire ---
if (window && !window._commentSendLockHooked) {
  window._commentSendLockHooked = true;
  document.addEventListener(
    "click",
    function (e) {
      if (
        e.target &&
        e.target.classList &&
        e.target.classList.contains("send-btn")
      ) {
        // On attend un court délai pour laisser le localStorage se mettre à jour
        setTimeout(() => {
          if (typeof window.renderInteractionsSection === "function") {
            window.renderInteractionsSection();
          } else if (typeof lockCommentInputAfterSend === "function") {
            lockCommentInputAfterSend();
          }
        }, 100);
      }
    },
    true
  );
}

export function updateUIOnPageChange() {
  const currentSpread = state.spreads[state.currentSpreadIndex] || [];
  const firstPage = currentSpread.length > 0 ? currentSpread[0] + 1 : 0;
  dom.pageCounter.textContent = `Page ${firstPage} / ${state.pages.length}`;
}

export function renderViewer() {
  console.log(
    "renderViewer: Rendu avec les paramètres :",
    JSON.parse(JSON.stringify(state.settings))
  );
  const viewer = document.createElement("div");
  const {
    mode,
    fit,
    direction,
    stretch,
    limitWidth,
    customMaxWidth,
    limitHeight,
    customMaxHeight,
  } = state.settings;

  viewer.className = `reader-viewer ${mode}-mode fit-${fit} ${direction}-mode`;
  if (stretch) viewer.classList.add("stretch");

  // Applique max-width au conteneur UNIQUEMENT si nécessaire
  if (fit === "custom") {
    viewer.style.maxWidth = limitWidth ? `${customMaxWidth}px` : "none";
  } else {
    viewer.style.maxWidth = ""; // On retire le style en ligne pour laisser le CSS gérer
  }

  let imagesToRender = [];
  if (mode === "webtoon") {
    imagesToRender = domImages.filter(Boolean);
  } else {
    const currentSpread = state.spreads[state.currentSpreadIndex] || [];
    imagesToRender = currentSpread
      .map((pageIndex) => domImages[pageIndex])
      .filter(Boolean);
  }

  imagesToRender.forEach((img) => {
    const imgClone = img.cloneNode(true);

    // On n'applique des styles en ligne QUE si le mode est "Personnalisé".
    if (fit === "custom") {
      imgClone.style.maxHeight = limitHeight ? `${customMaxHeight}px` : "";
    }
    // Pas de else: on laisse le CSS gérer pour les autres modes

    viewer.appendChild(imgClone);
  });

  // Placeholder pour double page (inchangé)
  if (
    mode === "double" &&
    imagesToRender.length === 1 &&
    state.spreads[state.currentSpreadIndex]?.length === 1
  ) {
    const isLandscape =
      imagesToRender[0].naturalWidth > imagesToRender[0].naturalHeight;
    if (!isLandscape) {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      if (direction === "rtl") viewer.append(placeholder);
      else viewer.prepend(placeholder);
    }
  }

  dom.viewerContainer.innerHTML = "";
  dom.viewerContainer.appendChild(viewer);
}

export function render(isInitializing = false) {
  renderViewer();
  updateUIOnPageChange();
  if (!isInitializing && state.settings.mode !== "webtoon") {
    dom.viewerContainer.scrollTop = 0;
  }
}

// --- Correction : fetch stats serveur et rafraîchir le compteur après réception ---
export function activateChapterStats(linkElement, forceOpen = false) {
  if (!linkElement) return;
  const isActive = linkElement.classList.contains("active");
  if (!forceOpen && isActive) return;

  const currentActive = qs(".chapter-list a.active");
  if (currentActive && currentActive !== linkElement) {
    currentActive.classList.remove("active");
    const stats = currentActive.querySelector(".chapter-stats-details");
    if (stats) stats.remove();
    currentActive.style.maxHeight = "42px";
  }

  linkElement.classList.add("active");

  // --- Correction : supprimer l'ancien bloc stats avant d'en créer un nouveau ---
  const oldStats = linkElement.querySelector(".chapter-stats-details");
  if (oldStats) {
    oldStats.remove();
    console.log(
      "[activateChapterStats] Ancienne div .chapter-stats-details supprimée"
    );
  }

  // --- Correction : récupération des stats serveur à jour pour le chapitre courant ---
  let seriesSlug = state.seriesData && state.seriesData.slug;
  if (!seriesSlug && state.seriesData && state.seriesData.title) {
    seriesSlug = state.seriesData.title
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[\s\u3000]+/g, "_")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "_");
  }
  const chapterNumber = state.currentChapter.number;
  const chapterKey = String(chapterNumber);

  // LOG DEBUG : Affiche tout ce qui concerne la récupération des stats pour ce chapitre
  console.log(
    "[activateChapterStats] window._lastSeriesStats:",
    window._lastSeriesStats
  );
  console.log("[activateChapterStats] state.chapterStats:", state.chapterStats);
  console.log(
    "[activateChapterStats] chapterNumber:",
    chapterNumber,
    "chapterKey:",
    chapterKey
  );

  let statsData =
    window._lastSeriesStats && window._lastSeriesStats[chapterKey]
      ? window._lastSeriesStats[chapterKey]
      : state.chapterStats || { likes: 0, comments: [], date: "N/A" };

  console.log("[activateChapterStats] statsData utilisé:", statsData);

  const interactionKey = `interactions_${seriesSlug}_${chapterKey}`;
  let localState = {};
  try {
    localState = JSON.parse(localStorage.getItem(interactionKey)) || {};
  } catch {}
  const isLiked = !!localState.liked;

  let serverComments = 0;
  let serverCommentIds = null;
  if (Array.isArray(statsData.comments)) {
    serverComments = statsData.comments.length;
    serverCommentIds = new Set(statsData.comments.map((c) => c.id));
  } else {
    serverComments =
      typeof statsData.comments === "number" ? statsData.comments : 0;
    serverCommentIds = null;
  }
  console.log(
    "[activateChapterStats] serverComments:",
    serverComments,
    "serverCommentIds:",
    serverCommentIds
  );

  const localPending = getLocalPendingCommentsCount(
    seriesSlug,
    chapterKey,
    serverCommentIds
  );
  console.log(
    "[activateChapterStats] localPending (non doublons):",
    localPending
  );

  const displayComments = serverComments + localPending;
  console.log(
    "[activateChapterStats] displayComments (final):",
    displayComments
  );

  // Correction : compteur de likes = likes serveur + like local si non déjà compté
  let displayLikes = statsData.likes || 0;
  if (isLiked) displayLikes += 1;

  // Log final avant affichage
  console.log(
    "[activateChapterStats] Affichage compteur : likes =",
    displayLikes,
    ", commentaires =",
    displayComments
  );

  const statsDiv = document.createElement("div");
  statsDiv.className = "chapter-stats-details";
  statsDiv.innerHTML = `
        <span title="J'aime" class="chapter-like-btn">
          <i class="fas fa-heart${isLiked ? " liked" : ""}"></i>
          <span class="chapter-likes-count${
            isLiked ? " liked" : ""
          }">${displayLikes}</span>
        </span>
        <span title="Commentaires"><i class="fas fa-comment"></i> ${displayComments}</span>
        <span title="Date de sortie"><i class="fas fa-clock"></i> ${timeAgo(
          state.currentChapter.last_updated
        )}</span>`;
  linkElement.appendChild(statsDiv);

  const baseHeight =
    linkElement.querySelector(".chapter-info-main").offsetHeight;
  const statsHeight = statsDiv.offsetHeight;
  linkElement.style.maxHeight = `${baseHeight + statsHeight + 26}px`;
}

// Helper pour compter les commentaires locaux (optimistes) qui ne sont pas déjà sur le serveur
function getLocalPendingCommentsCount(seriesSlug, chapterId, serverCommentIds) {
  const key = `interactions_${seriesSlug}_${chapterId}`;
  let localState = {};
  try {
    localState = JSON.parse(localStorage.getItem(key)) || {};
  } catch {}
  const pending = Array.isArray(localState.pendingComments)
    ? localState.pendingComments
    : [];
  if (!serverCommentIds) {
    // Pas de log ici, c'est du flux normal
    return pending.length;
  }
  // Ne compte que ceux qui ne sont pas déjà sur le serveur
  const filtered = pending.filter((c) => !serverCommentIds.has(c.id));
  // Pas de log ici non plus
  return filtered.length;
}

// Fonction pour rafraîchir dynamiquement le compteur de commentaires dans la sidebar
export function refreshChapterStatsUI() {
  const activeLink = document.querySelector(".chapter-list a.active");
  if (activeLink) {
    // Log utile seulement si aucun lien actif trouvé
    // Supprime l'ancien bloc stats s'il existe
    const oldStats = activeLink.querySelector(".chapter-stats-details");
    if (oldStats) oldStats.remove();
    activateChapterStats(activeLink, true);
  }
  // else {
  //   console.log('[MangaReader][refreshChapterStatsUI] No active chapter link found');
  // }
}

// --- Ajout : stocke les stats serveur globalement pour usage dans activateChapterStats ---
(function patchSeriesStatsFetch() {
  const origSetupUI = window.setupUI;
  window.setupUI = function patchedSetupUI(...args) {
    // --- Correction : déduction du slug si absent ---
    let seriesSlug = state.seriesData && state.seriesData.slug;
    if (!seriesSlug && state.seriesData && state.seriesData.title) {
      // Utilise la même logique que le backend pour slugify
      seriesSlug = state.seriesData.title
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[\s\u3000]+/g, "_")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "_");
    }
    const chapterNumber = state.currentChapter && state.currentChapter.number;
    if (
      seriesSlug &&
      typeof seriesSlug === "string" &&
      seriesSlug.length > 0 &&
      chapterNumber !== undefined &&
      chapterNumber !== null &&
      chapterNumber !== ""
    ) {
      fetch(`/api/series-stats?slug=${encodeURIComponent(seriesSlug)}`)
        .then(async (r) => {
          const raw = await r.clone().text();
          let stats = {};
          try {
            stats = JSON.parse(raw);
          } catch {}
          window._lastSeriesStats = stats;
          // Correction : forcer le refresh du compteur APRÈS réception des stats serveur
          setTimeout(() => {
            // Ajoute un log pour confirmer le refresh
            console.log(
              "[setupUI] Refresh activateChapterStats après fetch stats serveur"
            );
            // On doit aussi forcer le recalcul de state.chapterStats pour que renderInteractionsSection soit correct
            const chapterKey = String(chapterNumber);
            if (stats && stats[chapterKey]) {
              state.chapterStats = stats[chapterKey];
            }
            const activeLink = document.querySelector(".chapter-list a.active");
            if (activeLink) activateChapterStats(activeLink, true);
          }, 0);
        })
        .catch(() => {});
    }
    // --- Correction : fetch stats serveur, stocke, et force refresh du compteur ---
    if (origSetupUI) return origSetupUI.apply(this, args);
  };
})();
