// js/pages/series-detail/MangaReader/ui.js
import { qs, qsa, slugify } from "../../../utils/domUtils.js";
import { state, dom, domImages } from "./state.js";
import {
  setupDropdown,
  populateChapterSelect,
  populatePageSelect,
  updateActiveButtons,
  updateSliderStates,
} from "./settings.js";
import { timeAgo } from "../../../utils/dateUtils.js";

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
export function handleError(message) {
  console.error(message);
  const root = qs("#manga-reader-root");
  if (root)
    root.innerHTML = `<p style="padding: 2rem; text-align: center;">${message}</p>`;
}

export async function setupUI() {
  dom.root = qs("#manga-reader-root");
  dom.root.innerHTML = `
        <div id="reader-mobile-header">
            <button id="mobile-settings-toggle" class="reader-button" title="Ouvrir les options"><i class="fas fa-cog"></i></button>
            <div class="mobile-header-info">
                <a href="#" class="mobile-header-series-link"><span class="mobile-header-series"></span></a>
                <div class="mobile-header-details">
                    <span class="mobile-header-chapter"></span>
                    <div class="mobile-header-stats"></div>
                    <span class="mobile-header-page"></span>
                </div>
            </div>
        </div>
        <div id="reader-sidebar-overlay"></div>
        <aside class="reader-controls-sidebar ${
          state.isSidebarOpen ? "open" : ""
        } ${state.settings.direction}-mode"></aside>
        <div class="reader-viewer-container"></div>
        <div id="webtoon-interactions-placeholder"></div>
        <div class="reader-progress-bar"></div>
    `;
  Object.assign(dom, {
    sidebar: qs(".reader-controls-sidebar"),
    viewerContainer: qs(".reader-viewer-container"),
    progressBar: qs(".reader-progress-bar"),
    mobileHeader: qs("#reader-mobile-header"),
    mobileSettingsBtn: qs("#mobile-settings-toggle"),
    sidebarOverlay: qs("#reader-sidebar-overlay"),
    mobileSeriesTitle: qs(".mobile-header-series"),
    mobileChapterInfo: qs(".mobile-header-chapter"),
    mobilePageInfo: qs(".mobile-header-page"),
    mobileHeaderStats: qs(".mobile-header-stats"),
    webtoonInteractionsPlaceholder: qs("#webtoon-interactions-placeholder"),
  });
  setupSidebarControls();
}

function setupSidebarControls() {
  const statsHtml = `<div class="reader-stats-box"><span class="stat-item" id="reader-likes-stat"><i class="fas fa-heart"></i> 0</span><span class="stat-item" id="reader-comments-stat"><i class="fas fa-comment"></i> 0</span><span class="stat-item" id="reader-date-stat"></span></div>`;
  dom.sidebar.innerHTML = `<div class="reader-info-box"><h2 class="reader-chapter-title">Chapitre ${
    state.currentChapter.number
  } : ${
    state.currentChapter.title || ""
  }</h2><p class="reader-series-title"><a href="/${slugify(
    state.seriesData.title
  )}">${
    state.seriesData.title
  }</a></p>${statsHtml}</div><div class="control-group"><label>Chapitre</label><div class="nav-controls"><button id="prev-chapter-btn" title="Chapitre précédent"><i class="fas fa-angle-left"></i></button><div class="custom-dropdown" id="chapter-dropdown"><button class="dropdown-toggle"><span class="chapter-text"></span><i class="fas fa-chevron-down dropdown-arrow"></i></button><div class="dropdown-menu"></div></div><button id="next-chapter-btn" title="Chapitre suivant"><i class="fas fa-angle-right"></i></button></div></div><div class="control-group"><label>Page</label><div class="nav-controls"><button id="first-page-btn" title="Première page"><i class="fas fa-angle-double-left"></i></button><button id="prev-page-btn" title="Page précédente"><i class="fas fa-angle-left"></i></button><div class="custom-dropdown" id="page-dropdown"><button class="dropdown-toggle"><span class="page-text"></span><i class="fas fa-chevron-down dropdown-arrow"></i></button><div class="dropdown-menu"></div></div><button id="next-page-btn" title="Page suivante"><i class="fas fa-angle-right"></i></button><button id="last-page-btn" title="Dernière page"><i class="fas fa-angle-double-right"></i></button></div></div><div class="control-group"><label>Mode de lecture</label><div class="setting-options" data-setting="mode"><button data-value="single"><i class="fas fa-file"></i> Simple</button><button data-value="double"><i class="fas fa-book-open"></i> Double</button><button data-value="webtoon"><i class="fa-solid fa-scroll"></i> Webtoon</button></div></div><div id="mode-options-group" class="sub-control-group"><div class="control-group" id="double-page-controls"><label>Décalage double page</label><div class="setting-options" data-setting="doublePageOffset"><button data-value="false">Non</button><button data-value="true">Oui</button></div></div><div class="control-group" id="direction-control-group"><label>Sens de lecture</label><div class="setting-options" data-setting="direction"><button data-value="rtl">Droite à Gauche</button><button data-value="ltr">Gauche à Droite</button></div></div></div><div class="control-group" id="fit-control-group"><label>Ajustement de l'image</label><div class="setting-options"><button id="fit-mode-btn"></button></div></div><div id="custom-fit-controls" class="sub-control-group"><div class="control-group"><label><input type="checkbox" id="stretch-toggle"><span class="custom-checkbox-box"></span><span class="label-text">Étirez les petites pages</span></label></div><div class="control-group"><label><input type="checkbox" id="limit-width-toggle"><span class="custom-checkbox-box"></span><span class="label-text">Limiter la largeur</span></label><div class="modal-slider-container"><input type="range" id="custom-width-slider" min="400" max="3000" step="10"><input type="number" id="custom-width-input" min="400" max="3000"><span class="slider-unit">px</span></div></div><div class="control-group"><label><input type="checkbox" id="limit-height-toggle"><span class="custom-checkbox-box"></span><span class="label-text">Limiter la hauteur</span></label><div class="modal-slider-container"><input type="range" id="custom-height-slider" min="400" max="3000" step="10"><input type="number" id="custom-height-input" min="400" max="3000"><span class="slider-unit">px</span></div></div></div><div id="sidebar-interactions-placeholder"></div>`;
  Object.assign(dom, {
    modeOptionsGroup: qs("#mode-options-group"),
    customFitControls: qs("#custom-fit-controls"),
    stretchToggle: qs("#stretch-toggle"),
    limitWidthToggle: qs("#limit-width-toggle"),
    limitHeightToggle: qs("#limit-height-toggle"),
    customWidthSlider: qs("#custom-width-slider"),
    customHeightSlider: qs("#custom-height-slider"),
    customWidthInput: qs("#custom-width-input"),
    customHeightInput: qs("#custom-height-input"),
    sidebarInteractionsPlaceholder: qs("#sidebar-interactions-placeholder"),
  });
  setupDropdown("chapter-dropdown");
  setupDropdown("page-dropdown");
  updateActiveButtons();
}

export function renderInteractionsSection(localState) {
  const { hasLiked, hasCommented } = localState;
  const stats = state.chapterStats;
  const commentsHtml = (stats.comments || [])
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((comment) => {
      const userLikedComment =
        localState.likedComments && localState.likedComments[comment.id];
      // MODIFIÉ : Utilisation d'une image pour l'avatar
      const avatarHtml = comment.avatarUrl
        ? `<img src="${comment.avatarUrl}" alt="Avatar" class="comment-avatar">`
        : `<div class="comment-avatar">${comment.username.charAt(0)}</div>`;
      return `<div class="comment-item" data-comment-id="${
        comment.id
      }">${avatarHtml}<div class="comment-content"><div class="comment-header"><span class="comment-username">${
        comment.username
      }</span><span class="comment-timestamp">${timeAgo(
        comment.timestamp
      )}</span></div><p class="comment-text">${
        comment.comment
      }</p><div class="comment-actions"><button class="comment-like-button ${
        userLikedComment ? "liked" : ""
      }"><i class="fas fa-heart"></i> <span class="comment-like-count">${
        comment.likes || 0
      }</span></button></div></div></div>`;
    })
    .join("");
  const formDisabled = hasCommented ? "disabled" : "";
  const formMessage = hasCommented
    ? '<p class="form-message">Vous avez déjà commenté ce chapitre.</p>'
    : "";
  // MODIFIÉ : Ajout de la classe spoiler-hidden par défaut
  const interactionsHtml = `<div class="chapter-interactions-container"><div class="comments-section spoiler-hidden"><h3 class="comments-section-header">Commentaires (${
    stats.comments?.length || 0
  })</h3><form class="comment-form" ${formDisabled}><textarea placeholder="Ajouter un commentaire..." maxlength="150" rows="3" ${formDisabled}></textarea><div class="comment-form-actions"><button class="chapter-like-button ${
    hasLiked ? "liked" : ""
  }"><i class="fas fa-heart"></i> J'aime</button><button type="submit" ${formDisabled}>Envoyer</button></div>${formMessage}</form><div class="comment-list">${
    commentsHtml || "<p>Aucun commentaire pour le moment.</p>"
  }</div></div></div>`;

  if (window.innerWidth <= 992 && state.settings.mode === "webtoon") {
    dom.sidebarInteractionsPlaceholder.innerHTML = "";
    dom.webtoonInteractionsPlaceholder.innerHTML = interactionsHtml;
  } else {
    dom.webtoonInteractionsPlaceholder.innerHTML = "";
    dom.sidebarInteractionsPlaceholder.innerHTML = interactionsHtml;
  }
}

// ... le reste du fichier ui.js reste identique ...
export function render(isInitializing = false) {
  renderViewer();
  updateUIOnPageChange();
  if (!isInitializing && state.settings.mode !== "webtoon") {
    dom.viewerContainer.scrollTop = 0;
  }
}
export function renderViewer() {
  const viewer = document.createElement("div");
  const currentSpread = state.spreads[state.currentSpreadIndex] || [];
  const isLandscapeSpread =
    currentSpread.length === 1 &&
    domImages[currentSpread[0]]?.naturalWidth >
      domImages[currentSpread[0]]?.naturalHeight;
  viewer.className = `reader-viewer ${state.settings.mode}-mode fit-${state.settings.fit} ${state.settings.direction}-mode`;
  if (isLandscapeSpread) viewer.classList.add("single-landscape-spread");
  if (state.settings.stretchSmallPages) viewer.classList.add("stretch");
  dom.viewerContainer.className = `reader-viewer-container ${state.settings.mode}-mode`;
  dom.viewerContainer.innerHTML = "";
  domImages.forEach((img) => {
    img.style.maxWidth = null;
    img.style.maxHeight = null;
  });
  if (state.settings.mode === "webtoon") {
    domImages.forEach((img) => {
      if (state.settings.fit === "custom" && state.settings.limitWidth) {
        img.style.maxWidth = `${state.settings.customMaxWidth}px`;
      }
      viewer.appendChild(img);
    });
  } else if (state.settings.mode === "double") {
    const pageIndices = currentSpread;
    pageIndices.forEach((pageIndex) => {
      const img = domImages[pageIndex];
      if (img && state.settings.fit === "custom") {
        if (state.settings.limitWidth)
          img.style.maxWidth = isLandscapeSpread
            ? `${state.settings.customMaxWidth}px`
            : `${state.settings.customMaxWidth / 2}px`;
        if (state.settings.limitHeight)
          img.style.maxHeight = `${state.settings.customMaxHeight}px`;
      }
    });
    if (pageIndices.length === 1 && state.settings.doublePageOffset) {
      const placeholder = document.createElement("div");
      const image = domImages[pageIndices[0]];
      if (image) {
        if (pageIndices[0] === 0)
          state.settings.direction === "ltr"
            ? viewer.append(placeholder, image)
            : viewer.append(image, placeholder);
        else
          state.settings.direction === "ltr"
            ? viewer.append(image, placeholder)
            : viewer.append(placeholder, image);
      }
    } else {
      const page1 = domImages[pageIndices[0]];
      const page2 = domImages[pageIndices[1]];
      if (state.settings.direction === "rtl") {
        if (page2) viewer.appendChild(page2);
        if (page1) viewer.appendChild(page1);
      } else {
        if (page1) viewer.appendChild(page1);
        if (page2) viewer.appendChild(page2);
      }
    }
  } else {
    const image = domImages[state.spreads[state.currentSpreadIndex][0]];
    if (image) {
      if (state.settings.fit === "custom") {
        if (state.settings.limitWidth)
          image.style.maxWidth = `${state.settings.customMaxWidth}px`;
        if (state.settings.limitHeight)
          image.style.maxHeight = `${state.settings.customMaxHeight}px`;
      }
      viewer.appendChild(image);
    }
  }
  dom.viewerContainer.appendChild(viewer);
}
export function renderProgressBar() {
  dom.progressBar.className = `reader-progress-bar ${state.settings.direction}-mode`;
  if (state.spreads.length === 0) return;
  dom.progressBar.innerHTML = state.spreads
    .map((_, index) => {
      const isCurrent = index === state.currentSpreadIndex;
      const isRead = index < state.currentSpreadIndex;
      return `<div class="progress-tick ${isCurrent ? "current" : ""} ${
        isRead ? "read" : ""
      }" data-spread-index="${index}"></div>`;
    })
    .join("");
}
export function updateUIOnPageChange() {
  renderProgressBar();
  updateControlsState();
}
function updateControlsState() {
  updateActiveButtons();
  populateChapterSelect();
  populatePageSelect();
  updateSliderStates();
  updateMobileHeader();
  updateStatsDisplay();
}

function updateStatsDisplay() {
  const likes = state.chapterStats.likes || 0;
  const commentsCount = state.chapterStats.comments?.length || 0;
  const sidebarLikes = qs("#reader-likes-stat");
  const sidebarComments = qs("#reader-comments-stat");
  const sidebarDate = qs("#reader-date-stat");
  if (sidebarLikes)
    sidebarLikes.innerHTML = `<i class="fas fa-heart"></i> ${likes}`;
  if (sidebarComments)
    sidebarComments.innerHTML = `<i class="fas fa-comment"></i> ${commentsCount}`;
  if (sidebarDate && state.currentChapter.last_updated) {
    sidebarDate.innerHTML = `<i class="fas fa-clock"></i> ${timeAgo(
      state.currentChapter.last_updated
    )}`;
  } else if (sidebarDate) {
    sidebarDate.style.display = "none";
  }
  if (dom.mobileHeaderStats) {
    dom.mobileHeaderStats.innerHTML = `<span class="stat-item"><i class="fas fa-heart"></i> ${likes}</span><span class="stat-item"><i class="fas fa-comment"></i> ${commentsCount}</span>`;
  }
}

function updateMobileHeader() {
  if (dom.mobileHeader) {
    qs(".mobile-header-series-link", dom.mobileHeader).href = `/${slugify(
      state.seriesData.title
    )}`;
    dom.mobileSeriesTitle.textContent = truncateText(
      state.seriesData.title,
      35
    );
    const chapterTitle = `Ch. ${state.currentChapter.number} : ${
      state.currentChapter.title || ""
    }`;
    dom.mobileChapterInfo.textContent = truncateText(chapterTitle, 30);
    const currentSpread = state.spreads[state.currentSpreadIndex] || [];
    const firstPageInSpread =
      currentSpread.length > 0 ? currentSpread[0] + 1 : 0;
    const lastPageInSpread =
      currentSpread.length > 0
        ? currentSpread[currentSpread.length - 1] + 1
        : 0;
    let pageText = `Pg. ${firstPageInSpread}`;
    if (lastPageInSpread > firstPageInSpread)
      pageText += `-${lastPageInSpread}`;
    dom.mobilePageInfo.textContent = `${pageText} / ${state.pages.length}`;
  }
}
