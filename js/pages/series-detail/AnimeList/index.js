import { populateEpisodeList } from "./ui.js";
import { initEventListeners } from "./events.js";

export async function render(seriesData) {
  const response = await fetch("/templates/AnimeList.html");
  const html = await response.text();
  const view = document.createElement("div");
  view.innerHTML = html;

  const episodesContainer = view.querySelector("#episodes-container");
  if (episodesContainer && Array.isArray(seriesData.episodes)) {
    // Tri décroissant par numéro d'épisode
    const episodesSorted = [...seriesData.episodes].sort((a, b) => b.indice_ep - a.indice_ep);
    populateEpisodeList(episodesContainer, episodesSorted);
  }

  initEventListeners(view, seriesData);

  return view;
}