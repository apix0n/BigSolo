import { qs, slugify } from "../../../utils/domUtils.js";
import { state, dom } from "./state.js";
import { fetchAndLoadPages } from "./data.js";
import {
  getInitialPageNumberFromUrl,
  updateUIOnPageChange,
} from "./navigation.js";
import { loadSettings, saveSettings } from "./settings.js";
import { fetchSeriesStats } from "../../../utils/interactions.js";

// Importe les initialiseurs et les fonctions de mise à jour des composants
import {
  init as initInfoSidebar,
  updateChapterList,
  updateCommentsSection,
  updateGlobalLikeButton,
  handleGlobalLike,
} from "./components/infoSidebar.js";
import { init as initSettingsSidebar } from "./components/settingsSidebar.js";
import { init as initViewer } from "./components/viewer.js";

/**
 * Point d'entrée principal pour initialiser le lecteur de manga.
 */
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
    // 1. Initialisation de l'état global
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

    // 2. Chargement des paramètres utilisateur
    loadSettings();

    // 3. Mise en place de la structure HTML de base
    setupBaseLayout();

    // 4. Initialisation des composants UI (Sidebars, Viewer)
    initInfoSidebar();
    initSettingsSidebar();
    initViewer();

    // 5. Chargement des stats et mise à jour de l'UI
    const seriesSlug = slugify(state.seriesData.title);
    const serverStats = await fetchSeriesStats(seriesSlug);
    state.chapterStats = serverStats[state.currentChapter.number] || {
      likes: 0,
      comments: [],
    };

    // Mettre à jour les composants qui dépendent des stats
    updateChapterList();
    updateCommentsSection();
    updateGlobalLikeButton();

    // 6. Initialisation des événements globaux
    initializeGlobalEvents();

    // 7. Chargement des images du manga
    const initialPageNumber = getInitialPageNumberFromUrl();
    await fetchAndLoadPages(initialPageNumber);
  } catch (error) {
    handleError(`Impossible de charger le lecteur : ${error.message}`);
    console.error(error);
  }
}

/**
 * Crée la structure HTML de base du lecteur.
 */
function setupBaseLayout() {
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

  // Stocke les références DOM globales
  Object.assign(dom, {
    infoSidebar: qs("#info-sidebar"),
    settingsSidebar: qs("#settings-sidebar"),
    viewerContainer: qs(".reader-viewer-container"),
    toggleInfoBtn: qs("#toggle-info-sidebar-btn"),
    toggleSettingsBtn: qs("#toggle-settings-sidebar-btn"),
    toggleLikeBtn: qs("#toggle-chapters-like"),
    pageCounter: qs("#live-page-counter"),
  });

  // Applique l'état initial des sidebars
  updateLayout();
}

/**
 * Gère l'ouverture/fermeture et le positionnement des sidebars.
 */
function updateLayout() {
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

/**
 * Initialise les événements globaux du lecteur.
 */
function initializeGlobalEvents() {
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

  document.addEventListener("keydown", handleKeyDown);
  dom.viewerContainer.addEventListener(
    "scroll",
    (event) => {
      if (event.target.classList.contains("reader-viewer")) {
        handleWebtoonScroll();
      }
    },
    { passive: true }
  );
}

function handleKeyDown(e) {
  if (e.target.tagName === "TEXTAREA") return; // Ne pas naviguer si on écrit un commentaire

  const { mode, direction } = state.settings;
  if (mode === "webtoon") return;

  // Importation dynamique pour éviter une dépendance cyclique
  import("./navigation.js").then(({ changeSpread }) => {
    if (e.key === "ArrowRight") changeSpread(direction === "ltr" ? 1 : -1);
    if (e.key === "ArrowLeft") changeSpread(direction === "ltr" ? -1 : 1);
  });
}

let scrollTimeout = null;
function handleWebtoonScroll() {
  if (state.settings.mode !== "webtoon") return;
  if (scrollTimeout) window.cancelAnimationFrame(scrollTimeout);

  scrollTimeout = window.requestAnimationFrame(() => {
    const viewer = qs(".reader-viewer");
    if (!viewer) return;

    // On définit un "point de lecture" au 1/4 supérieur de l'écran.
    const triggerPoint =
      viewer.getBoundingClientRect().top + viewer.clientHeight * 0.25;
    let closestImageIndex = -1;
    let minDistance = Infinity;

    qsa(".reader-viewer-container img").forEach((img, index) => {
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

/**
 * Sauvegarde la progression de lecture dans le localStorage.
 */
function saveReadingProgress() {
  const seriesSlug = slugify(state.seriesData.title);
  const chapterNumber = state.currentChapter.number;
  if (seriesSlug && chapterNumber) {
    try {
      localStorage.setItem(`reading-progress-${seriesSlug}`, chapterNumber);
      console.log(
        `[Reader] Progression sauvegardée : ${seriesSlug} -> Ch. ${chapterNumber}`
      );
    } catch (e) {
      console.warn(
        "[Reader] Erreur lors de la sauvegarde de la progression:",
        e
      );
    }
  }
}

/**
 * Affiche un message d'erreur dans le lecteur.
 * @param {string} message
 */
function handleError(message) {
  console.error(message);
  const root = qs("#manga-reader-root");
  if (root) {
    root.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--clr-text-sub);">${message}</p>`;
  }
}
