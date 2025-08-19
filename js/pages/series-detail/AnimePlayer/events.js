import { handleRouteChange } from "../router.js";

function handlePlaylistClick(event, seriesData) {
  const target = event.target.closest(".playlist-episode");
  if (!target) return;
  event.preventDefault();
  const url = target.href;
  history.pushState({}, "", url);
  // On extrait l'épisode depuis l'URL
  const episodeNumber = target.dataset.episodeId;
  handleRouteChange(seriesData, episodeNumber);
}

export function initEventListeners(viewElement, seriesData) {
  const playlist = viewElement.querySelector("#playlist-container");
  if (playlist) {
    playlist.addEventListener("click", (e) => handlePlaylistClick(e, seriesData));
  }
}