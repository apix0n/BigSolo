import { renderMangaInfo } from "./MangaList/ui.js";

/**
 * Gère le routage et l'affichage de la fiche série.
 * @param {object} seriesData - Les données de la série (déjà parsées).
 */
export async function handleRouteChange(seriesData) {
  const main = document.getElementById("series-detail-main");
  if (!main) {
    console.error("Main #series-detail-main introuvable.");
    return;
  }

  // Charge le template HTML (sans <main>)
  const res = await fetch("/templates/MangaList.html");
  const templateHtml = await res.text();

  // Injecte le contenu du template dans <main>
  main.innerHTML = templateHtml;

  // Remplit les infos principales
  renderMangaInfo(main, seriesData);
}

// Pas de redirection JS vers le lecteur ici, le middleware s'en charge côté backend