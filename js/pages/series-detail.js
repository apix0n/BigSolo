// js/pages/series-detail.js
import { fetchSeriesDataBySlug } from '../utils/fetchUtils.js';
import { slugify, qs } from '../utils/domUtils.js';
import { renderMangaView } from './series-detail/mangaView.js';
import { renderEpisodesListView, renderEpisodePlayerView } from './series-detail/animeView.v2.js';

export async function initSeriesDetailPage() {
  const seriesDetailSection = qs("#series-detail-section");
  if (!seriesDetailSection) return;

  const initialPath = window.location.pathname;
  const pathSegments = initialPath.split('/').filter(p => p !== '');
  const seriesSlug = pathSegments[0];
  
  if (!seriesSlug) {
      seriesDetailSection.innerHTML = `<p>URL de la série non valide.</p>`;
      return;
  }

  try {
    const currentSeriesData = await fetchSeriesDataBySlug(seriesSlug);

    if (!currentSeriesData) {
      seriesDetailSection.innerHTML = `<p>Série avec l'identifiant "${seriesSlug}" non trouvée.</p>`;
      document.title = `BigSolo – Série non trouvée`;
      return;
    }

    /**
     * Le routeur principal de la page. Analyse un chemin et appelle la fonction de rendu appropriée.
     * @param {string} path - Le chemin à router (ex: "/kaoru_hana_wa_rin_to_saku/episodes").
     */
    function handleRouting(path) {
        const segments = path.split('/').filter(p => p !== '');
        let view = 'manga';
        let subViewIdentifier = null;

        if (segments.length > 1) {
            if (segments[1] === 'episodes') {
                view = 'episodes_list';
                if (segments.length > 2) {
                    view = 'episode_player';
                    subViewIdentifier = segments[2];
                }
            } else {
                view = 'chapter_redirect';
                subViewIdentifier = segments[1];
            }
        }

        switch (view) {
            case 'manga':
                renderMangaView(currentSeriesData, seriesSlug);
                break;
            case 'episodes_list':
                renderEpisodesListView(currentSeriesData, seriesSlug);
                break;
            case 'episode_player':
                renderEpisodePlayerView(currentSeriesData, seriesSlug, subViewIdentifier);
                break;
            case 'chapter_redirect':
                seriesDetailSection.innerHTML = `<p class="loading-message">Redirection vers le chapitre ${subViewIdentifier}...</p>`;
                const chapterUrl = `https://cubari.moe/read/gist/${currentSeriesData.base64Url}/${String(subViewIdentifier).replaceAll(".", "-")}/1/`;
                window.location.href = chapterUrl;
                break;
        }
    }

    // --- GESTION DES ÉVÉNEMENTS DE NAVIGATION ---

    // 1. Gère les clics sur les onglets de navigation (Manga/Anime)
    seriesDetailSection.addEventListener('click', (e) => {
        const navLink = e.target.closest('a.detail-nav-button');
        if (!navLink) return;

        // Empêche l'action si on clique sur l'onglet déjà actif
        if (navLink.classList.contains('active')) {
            e.preventDefault();
            return;
        }

        e.preventDefault(); // Annule le rechargement de la page
        const path = navLink.getAttribute('href');
        
        // Met à jour l'URL dans la barre d'adresse sans recharger
        history.pushState({ path }, '', path);
        
        // Appelle le routeur pour afficher le nouveau contenu
        handleRouting(path);
    });

    // 2. Gère les clics sur les boutons Précédent/Suivant du navigateur
    window.addEventListener('popstate', (e) => {
        // Quand l'URL change via les boutons du navigateur, on reroute pour afficher le bon contenu.
        handleRouting(window.location.pathname);
    });

    // --- CHARGEMENT INITIAL ---
    // Appelle le routeur une première fois pour afficher le contenu correspondant à l'URL d'arrivée.
    handleRouting(initialPath);

  } catch (error) {
    console.error("🚨 Erreur lors de l'initialisation de la page de détail de série:", error);
    seriesDetailSection.innerHTML = "<p>Erreur lors du chargement des détails de la série.</p>";
  }
}