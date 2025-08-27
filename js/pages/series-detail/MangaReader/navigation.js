// --- File: js/pages/series-detail/MangaReader/navigation.js ---

import { qs, slugify } from "../../../utils/domUtils.js";
import { state, dom, domImages } from "./state.js";
import { render as renderViewer } from "./components/viewer.js";

let urlUpdateTimeout = null;

export function getInitialPageNumberFromUrl() {
  if (window.location.hash === "#last") return "last";
  const pathSegments = window.location.pathname.split("/").filter(Boolean);
  if (pathSegments.length === 3) {
    const pageNumber = parseInt(pathSegments[2], 10);
    if (!isNaN(pageNumber) && pageNumber > 0) return pageNumber;
  }
  return 1;
}

export function updateUrlForCurrentPage() {
  clearTimeout(urlUpdateTimeout);
  urlUpdateTimeout = setTimeout(() => {
    const seriesSlug = slugify(state.seriesData.title);
    const chapterNumber = state.currentChapter.number;
    const currentSpread = state.spreads[state.currentSpreadIndex];
    if (!currentSpread || currentSpread.length === 0) return;

    const firstPageIndexInSpread = currentSpread[0];
    const pageNumberForUrl = firstPageIndexInSpread + 1;
    const newPath = `/${seriesSlug}/${chapterNumber}/${pageNumberForUrl}`;

    if (window.location.pathname !== newPath) {
      history.replaceState({ page: pageNumberForUrl }, "", newPath);
    }
  }, 150);
}

export function goToSpread(spreadIndex, isInitializing = false) {
  state.currentSpreadIndex = Math.max(
    0,
    Math.min(spreadIndex, state.spreads.length - 1)
  );

  if (state.settings.mode === "webtoon") {
    // En mode webtoon, on ne re-render pas, on scroll directement
    const pageIndex = state.spreads[state.currentSpreadIndex]?.[0];
    if (pageIndex !== undefined && domImages[pageIndex]) {
      // Utilise 'auto' pour un positionnement instantané au chargement
      const behavior = isInitializing ? "auto" : "smooth";
      console.log(
        `[Navigation] Webtoon: Scrolling vers l'image index ${pageIndex}`
      );
      // On s'assure que l'image est bien dans le DOM avant de scroller
      const imageInDom = qs(`.reader-viewer img:nth-child(${pageIndex + 1})`);
      if (imageInDom) {
        const isMobile = window.innerWidth <= 768;
        if (isInitializing && isMobile) {
          // --- NOUVELLE LOGIQUE DE SCROLL POUR MOBILE ---
          // On calcule la position exacte de l'image par rapport au document.
          const imageTopOffset =
            imageInDom.getBoundingClientRect().top + window.scrollY;
          // On calcule la hauteur totale des barres sticky.
          const barsHeight =
            (document.getElementById("main-header")?.offsetHeight || 0) +
            (dom.mobileControls?.offsetHeight || 0);
          // On scrolle à la position de l'image MOINS la hauteur des barres.
          window.scrollTo({
            top: imageTopOffset - barsHeight,
            behavior: "auto", // Comportement instantané au chargement
          });
          console.log(
            `[Navigation] Mobile Init: Scrolling manuel vers ${
              imageTopOffset - barsHeight
            }px`
          );
        } else {
          // --- LOGIQUE ORIGINELLE POUR DESKTOP OU SCROLL MANUEL ---
          const behavior = isInitializing ? "auto" : "smooth";
          imageInDom.scrollIntoView({ behavior, block: "start" });
        }
        // - Fin modification
      } else {
        console.warn(
          `[Navigation] Tentative de scroll vers une image non trouvée dans le DOM (index ${pageIndex})`
        );
      }
    }
  } else {
    // Pour les autres modes, on re-render la planche
    renderViewer();
  }
  updateUIOnPageChange();

  if (!isInitializing && state.settings.mode !== "webtoon") {
    dom.viewerContainer.scrollTop = 0;
  }
  updateUrlForCurrentPage();
}

export function changeSpread(delta) {
  const isLastSpread = state.currentSpreadIndex >= state.spreads.length - 1;
  if (delta > 0 && isLastSpread) {
    navigateToChapter(1);
  } else if (delta < 0 && state.currentSpreadIndex === 0) {
    navigateToChapter(-1, true);
  } else {
    goToSpread(state.currentSpreadIndex + delta);
  }
}

export function navigateToChapter(delta, goToLastPage = false) {
  const currentChapterIndex = state.allChapterKeys.indexOf(
    state.currentChapter.number
  );
  const nextChapterIndex = currentChapterIndex + delta;
  if (nextChapterIndex >= 0 && nextChapterIndex < state.allChapterKeys.length) {
    const nextChapterKey = state.allChapterKeys[nextChapterIndex];
    let url = `/${slugify(state.seriesData.title)}/${nextChapterKey}`;
    if (goToLastPage) url += "#last";
    window.location.href = url;
  } else {
    const message =
      delta > 0
        ? "Vous êtes au dernier chapitre disponible."
        : "Ceci est le premier chapitre.";
    console.log(message);
  }
}

export function updateUIOnPageChange() {
  const currentSpread = state.spreads[state.currentSpreadIndex] || [];
  const firstPage = currentSpread.length > 0 ? currentSpread[0] + 1 : 0;
  const pageCounterText = `Page ${firstPage} / ${state.pages.length}`;
  const webtoonBubbleText = `${firstPage}/${state.pages.length}`;

  if (dom.pageCounter) {
    dom.pageCounter.textContent = pageCounterText;
  }

  if (dom.webtoonPageBubble) {
    dom.webtoonPageBubble.textContent = webtoonBubbleText;
  }
}
