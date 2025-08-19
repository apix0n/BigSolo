console.log(
  "[DEBUG][MangaList][PAGE LOAD] bigsolo_action_queue =",
  localStorage.getItem("bigsolo_action_queue")
);
console.log(
  "[DEBUG][MangaList][PAGE LOAD] bigsolo_internal_nav =",
  sessionStorage.getItem("bigsolo_internal_nav")
);

import { renderMangaInfo } from "./ui.js";
import { initEventListeners } from "./events.js";

export async function render(seriesData) {
  const response = await fetch("/templates/MangaList.html");
  const html = await response.text();
  const view = document.createElement("div");
  view.innerHTML = html;

  // Ajoute le slug à seriesData si absent
  if (!seriesData.slug) {
    const path = window.location.pathname.split("/").filter(Boolean);
    seriesData.slug = path[0];
  }

  renderMangaInfo(view, seriesData);

  initEventListeners(view, seriesData);

  return view;
}
