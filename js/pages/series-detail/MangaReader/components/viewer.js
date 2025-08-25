// --- File: js/pages/series-detail/MangaReader/components/viewer.js ---

import { qs } from "../../../../utils/domUtils.js";
import { state, dom, domImages } from "../state.js";
import { changeSpread } from "../navigation.js";

/**
 * Initialise le composant de la visionneuse d'images.
 */
export function init() {
  console.log("[ViewerComponent] Initialisation.");
  if (dom.viewerContainer) {
    dom.viewerContainer.addEventListener("click", handleViewerClick);
  }
}

/**
 * Gère le rendu des images dans la visionneuse en fonction de l'état actuel.
 */
export function render() {
  console.log(
    "[ViewerComponent] Rendu des images pour la planche :",
    state.currentSpreadIndex
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
  const currentSpread = state.spreads[state.currentSpreadIndex] || [];
  const isSingleImageSpread = currentSpread.length === 1;
  let isLandscape = false;
  if (isSingleImageSpread) {
    const imgElement = domImages[currentSpread[0]];
    if (imgElement) {
      isLandscape = imgElement.naturalWidth > imgElement.naturalHeight;
    }
  }

  // Ajoute une classe spéciale si c'est une seule image paysage en mode double
  if (mode === "double" && isSingleImageSpread && isLandscape) {
    viewer.classList.add("single-landscape-spread");
  }

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
    // Applique les styles en ligne QUE si le mode est "Personnalisé"
    if (fit === "custom") {
      imgClone.style.maxHeight = limitHeight ? `${customMaxHeight}px` : "none";
    }
    if (mode === "double" && imagesToRender.length === 1) {
      const isLandscape = imgClone.naturalWidth > imgClone.naturalHeight;
      if (!isLandscape) {
        imgClone.classList.add("single-page-spread");
      }
    }
    viewer.appendChild(imgClone);
  });

  dom.viewerContainer.innerHTML = "";
  dom.viewerContainer.appendChild(viewer);
}

/**
 * Gère les clics sur la visionneuse pour la navigation.
 * @param {MouseEvent} e
 */
function handleViewerClick(e) {
  if (state.settings.mode === "webtoon") return;
  const rect = dom.viewerContainer.getBoundingClientRect();
  const zone = (e.clientX - rect.left) / rect.width;
  const direction = state.settings.direction;
  if (zone < 0.45) {
    changeSpread(direction === "ltr" ? -1 : 1);
  } else if (zone > 0.55) {
    changeSpread(direction === "ltr" ? 1 : -1);
  }
}
