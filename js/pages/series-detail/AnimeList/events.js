import { handleRouteChange } from "../router.js";

function handleEpisodeClick(event, seriesData) {
  const target = event.target.closest(".episode-item");
  if (!target) return;
  event.preventDefault();
  const url = target.href;
  history.pushState({}, "", url);
  handleRouteChange(seriesData);
}

export function initEventListeners(viewElement, seriesData) {
  const container = viewElement.querySelector("#episodes-container");
  if (container) {
    container.addEventListener("click", (e) => handleEpisodeClick(e, seriesData));
  }
}