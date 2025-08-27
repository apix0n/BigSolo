// --- File: js/pages/series-detail/MangaReader/reader.js ---

import { qs, qsa, slugify } from "../../../utils/domUtils.js";
import { state, dom } from "./state.js";
import { fetchAndLoadPages } from "./data.js";
import {
  getInitialPageNumberFromUrl,
  updateUIOnPageChange,
  updateUrlForCurrentPage,
} from "./navigation.js";
import { loadSettings, saveSettings } from "./settings.js";
import { fetchSeriesStats } from "../../../utils/interactions.js";

import {
  init as initInfoSidebar,
  updateChapterList,
  updateCommentsSection,
  updateGlobalLikeButton,
  handleGlobalLike,
  moveCommentsForMobile,
  updateMobileBarStats,
} from "./components/infoSidebar.js";
import {
  init as initSettingsSidebar,
  moveChaptersForMobile,
} from "./components/settingsSidebar.js";
import {
  init as initViewer,
  render as renderViewer,
} from "./components/viewer.js";

let isMobileView = false;

function updateBarsInteractivity() {
  const isWebtoonMobile = isMobileView && state.settings.mode === "webtoon";
  document.body.classList.toggle("bars-interactive", isWebtoonMobile);
  if (!isWebtoonMobile && dom.barsWrapper) {
    dom.barsWrapper.classList.remove("is-hidden");
    document.body.classList.remove("bars-hidden");
  }
}

let savedScrollY = 0;

export async function initMangaReader() {
  const dataPlaceholder = qs("#reader-data-placeholder");
  if (
    !dataPlaceholder?.textContent ||
    dataPlaceholder.textContent.includes("READER_DATA_PLACEHOLDER")
  ) {
    return handleError(
      "Les données du lecteur n'ont pas été trouvées dans la page."
    );
  }

  try {
    const readerData = JSON.parse(dataPlaceholder.textContent);
    state.seriesData = readerData.series;
    state.currentChapter = {
      ...readerData.series.chapters[readerData.chapterNumber],
      number: readerData.chapterNumber,
    };
    state.allChapterKeys = Object.keys(readerData.series.chapters)
      .filter((key) => readerData.series.chapters[key].groups?.Big_herooooo)
      .sort((a, b) => parseFloat(a) - parseFloat(b));

    document.title = `${state.seriesData.title} - Ch. ${state.currentChapter.number} | BigSolo`;
    saveReadingProgress();
    loadSettings();

    isMobileView = window.innerWidth <= 768;
    setupBaseLayout();
    initInfoSidebar();
    initSettingsSidebar();
    initViewer();

    renderViewer();

    if (isMobileView) {
      moveCommentsForMobile();
      moveChaptersForMobile();
    }

    const seriesSlug = slugify(state.seriesData.title);
    const serverStats = await fetchSeriesStats(seriesSlug);
    state.chapterStats = serverStats[state.currentChapter.number] || {
      likes: 0,
      comments: [],
    };
    updateChapterList();
    updateCommentsSection();
    updateGlobalLikeButton();
    if (isMobileView) {
      updateMobileBarStats();
    }

    initializeGlobalEvents();
    updateBarsInteractivity();

    const initialPageNumber = getInitialPageNumberFromUrl();
    await fetchAndLoadPages(initialPageNumber);

    if (isMobileView) {
      setupMobileCommentsObserver();
    }
  } catch (error) {
    handleError(`Impossible de charger le lecteur : ${error.message}`);
    console.error(error.stack);
  }
}

function setupBaseLayout() {
  dom.root = qs("#manga-reader-root");

  if (isMobileView) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `
      <div id="reader-bars-wrapper" class="mobile-only">
        <div id="mobile-reader-controls"></div>
      </div>
    `
    );
    const header = qs("body > #main-header");
    const wrapper = qs("#reader-bars-wrapper");
    if (header && wrapper) {
      wrapper.prepend(header);
    }

    dom.root.innerHTML = `
      <div class="reader-layout-container">
          <aside id="info-sidebar" class="reader-sidebar"></aside>
          <aside id="settings-sidebar" class="reader-sidebar"></aside>
          <div class="reader-container">
              <div class="reader-viewer-container">
                  <p style="color: var(--clr-text-sub);">Chargement...</p>
              </div>
          </div>
      </div>
      <div class="mobile-sidebar-overlay mobile-only"></div>
      <div id="webtoon-page-bubble" class="mobile-only"></div>
    `;
  } else {
    dom.root.innerHTML = `
      <div id="global-reader-controls" class="desktop-only">
          <button id="toggle-info-sidebar-btn" title="Informations"><i class="fas fa-info-circle"></i></button>
          <button id="toggle-settings-sidebar-btn" title="Paramètres"><i class="fas fa-cog"></i></button>
          <button id="toggle-chapters-like" title="J'aime ce chapitre"><i class="fas fa-heart"></i></button>
          <span id="live-page-counter"></span>
      </div>
      <div class="reader-layout-container">
          <aside id="info-sidebar" class="reader-sidebar"></aside>
          <aside id="settings-sidebar" class="reader-sidebar"></aside>
          <div class="reader-container">
              <div class="reader-viewer-container">
                  <p style="color: var(--clr-text-sub);">Chargement...</p>
              </div>
          </div>
      </div>
    `;
  }

  Object.assign(dom, {
    infoSidebar: qs("#info-sidebar"),
    settingsSidebar: qs("#settings-sidebar"),
    viewerContainer: qs(".reader-viewer-container"),
    mobileSidebarOverlay: qs(".mobile-sidebar-overlay"),
  });

  if (isMobileView) {
    Object.assign(dom, {
      barsWrapper: qs("#reader-bars-wrapper"),
      mobileControls: qs("#mobile-reader-controls"),
      webtoonPageBubble: qs("#webtoon-page-bubble"),
    });
    renderMobileControls();
  } else {
    Object.assign(dom, {
      toggleInfoBtn: qs("#toggle-info-sidebar-btn"),
      toggleSettingsBtn: qs("#toggle-settings-sidebar-btn"),
      toggleLikeBtn: qs("#toggle-chapters-like"),
      pageCounter: qs("#live-page-counter"),
    });
    updateLayout();
  }
}

function renderMobileControls() {
  if (!dom.mobileControls) return;
  dom.mobileControls.innerHTML = `
      <button id="mobile-toggle-settings-btn" title="Paramètres et Chapitres">
          <i class="fas fa-bars"></i>
      </button>
      <div class="mrc-info-wrapper">
          <div class="mrc-top-row">
              <span class="mrc-series-title">${state.seriesData.title}</span>
              <span class="mrc-page-counter">Page ? / ?</span>
          </div>
          <div class="mrc-bottom-row">
              <div class="mrc-chapter-details">
                  <span class="mrc-chapter-number">${
                    state.currentChapter.number
                  }</span>
                  <span class="mrc-chapter-title">${
                    state.currentChapter.title || ""
                  }</span>
              </div>
              <div class="mrc-stats-group">
                  <span id="mobile-like-stat" class="mrc-stat-item" title="J'aime ce chapitre">
                      <i class="fas fa-heart"></i>
                      <span class="mrc-likes-count">0</span>
                  </span>
                  <span id="mobile-comments-stat" class="mrc-stat-item" title="Commentaires">
                      <i class="fas fa-comments"></i>
                      <span class="mrc-comments-count">0</span>
                  </span>
              </div>
          </div>
      </div>
  `;

  Object.assign(dom, {
    mobileSettingsBtn: qs("#mobile-toggle-settings-btn"),
    mobileLikeStat: qs("#mobile-like-stat"),
    mobileCommentsStat: qs("#mobile-comments-stat"),
    pageCounter: qs(".mrc-page-counter"),
    mobileLikesCount: qs(".mrc-likes-count"),
    mobileCommentsCount: qs(".mrc-comments-count"),
  });
}

function updateLayout() {
  if (isMobileView) return;
  let infoWidth = 0,
    settingsWidth = 0;
  const rootStyle = getComputedStyle(document.documentElement);
  const infoWidthRem = parseFloat(
    rootStyle.getPropertyValue("--sidebar-info-width")
  );
  const settingsWidthRem = parseFloat(
    rootStyle.getPropertyValue("--sidebar-settings-width")
  );
  const baseFontSize = parseFloat(rootStyle.fontSize);
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
  const totalMargin = infoWidth + settingsWidth;
  const readerContainer = dom.viewerContainer?.parentElement;
  if (readerContainer) {
    readerContainer.style.marginLeft = `${totalMargin}px`;
  }
}

function initializeGlobalEvents() {
  // - Debut modification (Fonction entièrement réécrite)
  console.log("[initializeGlobalEvents] Début de la fonction.");

  if (isMobileView) {
    console.log(
      "[initializeGlobalEvents] Initialisation des événements pour MOBILE."
    );
    initializeMobileEvents();
    // Sur mobile, l'élément qui scroll est la fenêtre (window)
    window.addEventListener(
      "scroll",
      () => {
        if (state.settings.mode === "webtoon") handleWebtoonScroll(window);
      },
      { passive: true }
    );
  } else {
    console.log(
      "[initializeGlobalEvents] Initialisation des événements pour DESKTOP."
    );
    initializeDesktopEvents();
    // Sur desktop, l'élément qui scroll est .reader-viewer-container (dom.viewerContainer)
    const scrollContainer = dom.viewerContainer;
    if (scrollContainer) {
      console.log(
        "[initializeGlobalEvents] [DESKTOP] Écouteur de scroll attaché à",
        scrollContainer
      );
      scrollContainer.addEventListener(
        "scroll",
        (event) => {
          if (state.settings.mode === "webtoon") {
            handleWebtoonScroll(event.currentTarget);
          }
        },
        { passive: true }
      );
    } else {
      console.error(
        "[initializeGlobalEvents] [DESKTOP] Erreur: dom.viewerContainer non trouvé pour l'écouteur de scroll."
      );
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("readerModeChanged", updateBarsInteractivity);
  console.log("[initializeGlobalEvents] Fin de la fonction.");
  // - Fin modification
}

function initializeDesktopEvents() {
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
  dom.toggleLikeBtn.addEventListener("click", handleGlobalLike);
}

function initializeMobileEvents() {
  const readerContainer = dom.viewerContainer?.parentElement;
  const barsWrapper = dom.barsWrapper;
  let lastScrollY = window.scrollY;

  if (barsWrapper) barsWrapper.classList.remove("is-hidden");
  document.body.classList.remove("bars-hidden");

  if (readerContainer) {
    readerContainer.addEventListener("click", (e) => {
      if (!document.body.classList.contains("bars-interactive")) return;
      if (e.target.closest("#reader-bars-wrapper")) return;
      const shouldBeHidden = !barsWrapper.classList.contains("is-hidden");
      barsWrapper.classList.toggle("is-hidden", shouldBeHidden);
      document.body.classList.toggle("bars-hidden", shouldBeHidden);
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!document.body.classList.contains("bars-interactive")) return;
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > lastScrollY;
      const scrollThreshold = 10;
      if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) {
        lastScrollY = currentScrollY;
        return;
      }
      if (
        dom.settingsSidebar &&
        !dom.settingsSidebar.classList.contains("is-open")
      ) {
        const shouldBeHidden = isScrollingDown && currentScrollY > 150;
        if (barsWrapper)
          barsWrapper.classList.toggle("is-hidden", shouldBeHidden);
        document.body.classList.toggle("bars-hidden", shouldBeHidden);
      }
      lastScrollY = currentScrollY;
    },
    { passive: true }
  );

  dom.mobileSettingsBtn.addEventListener("click", () =>
    toggleSidebar(dom.settingsSidebar)
  );
  dom.mobileLikeStat.addEventListener("click", handleGlobalLike);
  dom.mobileCommentsStat.addEventListener("click", () => {
    const commentsSection = qs("#comments-mobile-section");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" });
    }
  });
  dom.mobileSidebarOverlay.addEventListener("click", closeAllSidebars);
  document.addEventListener("close-sidebars", closeAllSidebars);
}

function toggleSidebar(sidebarToOpen) {
  const isAlreadyOpen = sidebarToOpen.classList.contains("is-open");
  closeAllSidebars();
  if (!isAlreadyOpen) {
    sidebarToOpen.classList.add("is-open");
    dom.mobileSidebarOverlay.classList.add("is-visible");
    savedScrollY = window.scrollY;
    document.documentElement.classList.add("sidebar-is-open");
    document.body.classList.add("sidebar-is-open");
    document.body.style.top = `-${savedScrollY}px`;
  }
}

function closeAllSidebars() {
  if (dom.infoSidebar) dom.infoSidebar.classList.remove("is-open");
  if (dom.settingsSidebar) dom.settingsSidebar.classList.remove("is-open");
  if (dom.mobileSidebarOverlay)
    dom.mobileSidebarOverlay.classList.remove("is-visible");
  if (document.body.classList.contains("sidebar-is-open")) {
    document.documentElement.style.scrollBehavior = "auto";
    document.documentElement.classList.remove("sidebar-is-open");
    document.body.classList.remove("sidebar-is-open");
    document.body.style.top = "";
    window.scrollTo(0, savedScrollY);
    setTimeout(() => {
      document.documentElement.style.scrollBehavior = "";
    }, 0);
  }
}

function setupMobileCommentsObserver() {
  const viewer = qs(".reader-viewer");
  if (!viewer) return;
  const images = qsa("img", viewer);
  if (images.length < 2) {
    qs("#comments-mobile-section")?.classList.add("is-visible");
    return;
  }
  const targetImage = images[images.length - 2];
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        qs("#comments-mobile-section")?.classList.add("is-visible");
        observer.unobserve(targetImage);
      }
    },
    { threshold: 0.1 }
  );
  observer.observe(targetImage);
}

function handleKeyDown(e) {
  if (e.target.tagName === "TEXTAREA") return;
  const { mode, direction } = state.settings;
  if (mode === "webtoon") return;
  import("./navigation.js").then(({ changeSpread }) => {
    if (e.key === "ArrowRight") changeSpread(direction === "ltr" ? 1 : -1);
    if (e.key === "ArrowLeft") changeSpread(direction === "ltr" ? -1 : 1);
  });
}

let scrollTimeout = null;
function handleWebtoonScroll(scrollTarget) {
  // - Debut modification (Fonction entièrement réécrite)
  if (document.documentElement.classList.contains("sidebar-is-open")) {
    return;
  }
  if (state.settings.mode !== "webtoon") return;
  if (scrollTimeout) window.cancelAnimationFrame(scrollTimeout);

  scrollTimeout = window.requestAnimationFrame(() => {
    let scrollTop, clientHeight;

    if (isMobileView) {
      scrollTop = window.scrollY;
      clientHeight = window.innerHeight;
    } else {
      scrollTop = scrollTarget.scrollTop;
      clientHeight = scrollTarget.clientHeight;
    }

    // Log pour le débogage sur desktop
    if (!isMobileView) {
    }

    const triggerPoint = scrollTop + clientHeight * 0.25;
    let closestImageIndex = -1;

    // Utilisons une simple boucle for pour plus de performance et de clarté
    const imagesInViewer = qsa(".reader-viewer img");
    for (let i = 0; i < imagesInViewer.length; i++) {
      const img = imagesInViewer[i];
      // Si le point de déclenchement est passé le haut de l'image, elle est candidate
      if (img.offsetTop <= triggerPoint) {
        closestImageIndex = i;
      } else {
        // Comme les images sont ordonnées, on peut s'arrêter dès qu'on a dépassé le point
        break;
      }
    }

    if (closestImageIndex !== -1) {
      const newSpreadIndex = state.pageToSpreadMap[closestImageIndex];
      if (
        newSpreadIndex !== undefined &&
        newSpreadIndex !== state.currentSpreadIndex
      ) {
        if (!isMobileView) {
        }
        state.currentSpreadIndex = newSpreadIndex;
        updateUIOnPageChange();
        updateUrlForCurrentPage();
      }
    }
  });
  // - Fin modification
}

function saveReadingProgress() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  if (seriesSlug && chapterNumber) {
    try {
      localStorage.setItem(`reading-progress-${seriesSlug}`, chapterNumber);
    } catch (e) {
      console.warn(
        "[Reader] Erreur lors de la sauvegarde de la progression:",
        e
      );
    }
  }
}

function handleError(message) {
  console.error(message);
  const root = qs("#manga-reader-root");
  if (root) {
    root.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--clr-text-sub);">${message}</p>`;
  }
}
