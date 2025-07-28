// js/pages/series-detail.js
// SUPPRESSION : import { fetchSeriesDataBySlug } from '../utils/fetchUtils.js';
import { slugify, qs } from '../utils/domUtils.js';
import { renderMangaView } from './series-detail/mangaView.js';
import { renderEpisodesListView, renderEpisodePlayerView } from './series-detail/animeView.js';

export async function initSeriesDetailPage() {
  const seriesDetailSection = qs("#series-detail-section");
  if (!seriesDetailSection) return;

  try {
    // --- NOUVELLE LOGIQUE : LIRE LES DONNÉES DEPUIS LE HTML ---
    const dataPlaceholder = qs("#series-data-placeholder");
    if (!dataPlaceholder || !dataPlaceholder.textContent || dataPlaceholder.textContent.includes("SERIES_DATA_PLACEHOLDER")) {
        throw new Error("Les données de la série n'ont pas été injectées dans la page.");
    }
    const currentSeriesData = JSON.parse(dataPlaceholder.textContent);
    const seriesSlug = slugify(currentSeriesData.title);
    // --- FIN DE LA NOUVELLE LOGIQUE ---

    if (!currentSeriesData) {
      seriesDetailSection.innerHTML = `<p>Données de la série non valides.</p>`;
      document.title = `BigSolo – Série non trouvée`;
      return;
    }

    const initialPath = window.location.pathname;

    /**
     * Le routeur principal de la page.
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
            } else if (segments[1] !== 'cover') {
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
    seriesDetailSection.addEventListener('click', (e) => {
        const navLink = e.target.closest('a.detail-nav-button');
        if (!navLink) return;
        if (navLink.classList.contains('active')) {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        const path = navLink.getAttribute('href');
        history.pushState({ path }, '', path);
        handleRouting(path);
    });

    window.addEventListener('popstate', () => {
        handleRouting(window.location.pathname);
    });

    // --- CHARGEMENT INITIAL ---
    handleRouting(initialPath);

  } catch (error) {
    console.error("🚨 Erreur lors de l'initialisation de la page de détail de série:", error);
    seriesDetailSection.innerHTML = `<p>Erreur lors du chargement des détails de la série. ${error.message}</p>`;
  }
}