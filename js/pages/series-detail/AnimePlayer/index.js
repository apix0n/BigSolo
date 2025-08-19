import { renderPlayerUI } from "./ui.js";
import { initEventListeners } from "./events.js";

export async function render(seriesData, episodeNumber) {
  const response = await fetch("/templates/AnimePlayer.html");
  const html = await response.text();
  const view = document.createElement("div");
  view.innerHTML = html;

  renderPlayerUI(view, seriesData, episodeNumber);
  initEventListeners(view, seriesData);

  return view;
}