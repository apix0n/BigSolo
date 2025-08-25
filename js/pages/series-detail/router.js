// --- File: js/pages/series-detail/router.js ---

import { slugify } from "../../utils/domUtils.js";

/**
 * Gère le routage et l'affichage de la fiche série en fonction de l'URL.
 * C'est le point d'entrée principal pour la page series-detail.
 * @param {object} seriesData - Les données complètes de la série.
 */
export async function handleRouteChange(seriesData) {
  const main = document.getElementById("series-detail-main");
  if (!main) {
    console.error(
      "[Router] Élément <main> #series-detail-main introuvable. Arrêt."
    );
    return;
  }

  // Ajoute le slug aux données de la série pour un accès facile
  if (!seriesData.slug) {
    seriesData.slug = slugify(seriesData.title);
  }

  // Affiche un état de chargement
  main.innerHTML = '<p class="loading-message">Chargement de la vue...</p>';

  const path = window.location.pathname;
  console.log(`[Router] Gestion de la route : ${path}`);

  // Détermine la vue à charger en fonction de l'URL
  const isAnimeView = path.includes("/episodes");

  try {
    // 1. Charger le template HTML de base (commun aux deux vues)
    const response = await fetch("/templates/MangaList.html"); // On réutilise ce template car il est très similaire
    if (!response.ok)
      throw new Error(
        "Impossible de charger le template de la page de détail."
      );
    const templateHtml = await response.text();
    main.innerHTML = templateHtml;

    // 2. Appeler le module de rendu approprié
    if (isAnimeView) {
      console.log(
        "[Router] Détection de la vue Anime. Chargement de AnimeView.js..."
      );
      const { render: renderAnimeView } = await import("./AnimeView.js");
      await renderAnimeView(main, seriesData);
    } else {
      console.log(
        "[Router] Détection de la vue Manga. Chargement de MangaView.js..."
      );
      const { render: renderMangaView } = await import("./MangaView.js");
      await renderMangaView(main, seriesData);
    }

    // 3. Gérer l'affichage des onglets Manga/Épisodes
    const chaptersTab = main.querySelector(
      '.chapter-tab-btn[data-tab="chapters"]'
    );
    const episodesTab = main.querySelector(
      '.chapter-tab-btn[data-tab="episodes"]'
    );

    if (chaptersTab && episodesTab) {
      const hasAnime = seriesData.episodes && seriesData.episodes.length > 0;

      // N'afficher l'onglet Épisodes que si l'anime existe
      episodesTab.style.display = hasAnime ? "flex" : "none";

      // Activer le bon onglet
      chaptersTab.classList.toggle("active", !isAnimeView);
      episodesTab.classList.toggle("active", isAnimeView);

      // Ajouter les liens de navigation
      chaptersTab.href = `/${seriesData.slug}`;
      episodesTab.href = `/${seriesData.slug}/episodes`;

      // Changer le libellé du tri si on est sur la vue anime
      const sortBtn = main.querySelector(".sort-chapter-btn");
      if (sortBtn && isAnimeView) {
        sortBtn.parentElement.previousElementSibling.querySelector(
          "input"
        ).placeholder = "Rechercher un épisode...";
      }
    }

    // 4. Envoyer un événement pour que le header mette à jour sa navigation contextuelle
    document.body.dispatchEvent(
      new CustomEvent("routeChanged", { detail: { path } })
    );
  } catch (error) {
    console.error("[Router] Erreur critique lors du rendu de la vue :", error);
    main.innerHTML = `<p class="loading-message">Erreur lors du chargement de la page : ${error.message}</p>`;
  }
}
