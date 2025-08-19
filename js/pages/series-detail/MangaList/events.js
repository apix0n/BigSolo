import { handleRouteChange } from "../router.js";

export function initEventListeners(viewElement, seriesData) {
  // N'ajoute l'écouteur que sur la liste des chapitres
  const container = viewElement.querySelector(
    "#chapters-container, .chapters-list-container"
  );
  if (container) {
    container.addEventListener("click", (e) =>
      handleChapterClick(e, seriesData)
    );
  }
}
