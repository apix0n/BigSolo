// js/pages/series-detail/animeView.js
import { qs } from '../../utils/domUtils.js';
import { timeAgo } from '../../utils/dateUtils.js';
import { generateNavTabs, generateAnimeHeader } from './components.js';
import { initMainScrollObserver } from '../../components/observer.js'; // <-- IMPORT AJOUTÉ

// --- FONCTIONS DE GESTION DE LA LECTURE (POUR ANIME) ---
function saveReadingProgress(seriesSlug, episodeNumber) {
    if (!seriesSlug || !episodeNumber) return;
    try {
        localStorage.setItem(`reading_progress_anime_${seriesSlug}`, episodeNumber.toString());
    } catch (e) {
        console.error("Erreur lors de la sauvegarde de la progression de l'anime:", e);
    }
}

function getReadingProgress(seriesSlug) {
    try {
        return localStorage.getItem(`reading_progress_anime_${seriesSlug}`);
    } catch (e) {
        console.error("Erreur lors de la lecture de la progression de l'anime:", e);
        return null;
    }
}

function renderReadingActions(seriesData, seriesSlug) {
    const container = qs("#reading-actions-container");
    if (!container) return;

    const episodes = (seriesData.episodes || []).sort((a, b) => a.indice_ep - b.indice_ep);

    if (episodes.length === 0) {
        container.innerHTML = '';
        return;
    }

    const lastWatchedEpisode = getReadingProgress(seriesSlug);
    const lastEpisode = episodes[episodes.length - 1];
    let nextEpisode = null;

    if (lastWatchedEpisode) {
        const lastWatchedIndex = episodes.findIndex(ep => ep.indice_ep == lastWatchedEpisode);
        if (lastWatchedIndex !== -1 && lastWatchedIndex < episodes.length - 1) {
            nextEpisode = episodes[lastWatchedIndex + 1];
        }
    }

    const lastEpisodeUrl = `/${seriesSlug}/episodes/${lastEpisode.indice_ep}`;
    const nextEpisodeUrl = nextEpisode ? `/${seriesSlug}/episodes/${nextEpisode.indice_ep}` : null;

    let buttonsHtml = '';

    if (nextEpisodeUrl) {
        buttonsHtml += `<a href="${nextEpisodeUrl}" class="reading-action-button continue"><i class="fas fa-play"></i> Continuer (Ép. ${nextEpisode.indice_ep})</a>`;
    } else if (lastWatchedEpisode && lastWatchedEpisode == lastEpisode.indice_ep) {
        buttonsHtml += `<span class="reading-action-button disabled"><i class="fas fa-check"></i> À jour</span>`;
    }
    
    if (!lastWatchedEpisode || lastWatchedEpisode != lastEpisode.indice_ep) {
        buttonsHtml += `<a href="${lastEpisodeUrl}" class="reading-action-button start"><i class="fas fa-fast-forward"></i> Dernier Épisode (Ép. ${lastEpisode.indice_ep})</a>`;
    }
    
    container.innerHTML = buttonsHtml;
}


// --- Fonctions de rendu ---
export function renderEpisodesListView(seriesData, seriesSlug) {
    const container = qs("#series-detail-section");
    if (!container || !seriesData) return;
  
    const navTabsHtml = generateNavTabs(seriesData, seriesSlug, 'anime');
    const episodes = seriesData.episodes || [];
  
    let episodeListHtml = '<p>Aucun épisode disponible pour le moment.</p>';
    if (episodes.length > 0) {
      episodeListHtml = episodes.sort((a, b) => b.indice_ep - a.indice_ep)
        .map(ep => `
          <a href="/${seriesSlug}/episodes/${ep.indice_ep}" class="detail-episode-item" data-episode-number="${ep.indice_ep}">
            <div class="episode-main-info">
              <span class="detail-episode-number">Épisode ${ep.indice_ep}</span>
              <span class="detail-episode-title">${ep.title_ep || 'Titre inconnu'}</span>
            </div>
            <span class="detail-episode-date">${timeAgo(ep.date_ep)}</span>
          </a>
        `).join('');
    }
  
    const episodesViewHtml = `
      ${generateAnimeHeader(seriesData, { 
          primaryInfoWrapperClasses: 'no-bottom-margin',
          additionalMetadataClasses: 'no-top-margin' 
      })}
      <div id="reading-actions-container"></div>
      ${navTabsHtml}
      <div id="chapters-list-section" class="episodes-main-header">
          <h3 class="section-title">Liste des Épisodes</h3>
      </div>
      <div class="episode-list-container">
          ${episodeListHtml}
      </div>
    `;
  
    container.innerHTML = episodesViewHtml;
    document.title = `BigSolo – Épisodes de ${seriesData.title}`;
    
    renderReadingActions(seriesData, seriesSlug);

    const episodeListContainer = qs('.episode-list-container');
    if (episodeListContainer) {
        episodeListContainer.addEventListener('click', (e) => {
            const episodeLink = e.target.closest('a.detail-episode-item');
            if (episodeLink && episodeLink.dataset.episodeNumber) {
                saveReadingProgress(seriesSlug, episodeLink.dataset.episodeNumber);
            }
        });
    }

    initMainScrollObserver(); // <-- APPEL AJOUTÉ
}
  
export function renderEpisodePlayerView(seriesData, seriesSlug, episodeNumber) {
    const container = qs("#series-detail-section");
    if (!container || !seriesData) return;
  
    const episodes = seriesData.episodes || [];
    const currentEpisode = episodes.find(ep => ep.indice_ep == episodeNumber);
  
    if (!currentEpisode) {
      container.innerHTML = `<div class="episode-player-page error"><p>Épisode non trouvé.</p><a href="/${seriesSlug}/episodes">Retour à la liste des épisodes</a></div>`;
      return;
    }
  
    const sortedEpisodes = [...episodes].sort((a, b) => a.indice_ep - b.indice_ep);
    const episodeListHtml = sortedEpisodes.map(ep => {
      const isActive = ep.indice_ep == episodeNumber ? 'active' : '';
      return `
        <a href="/${seriesSlug}/episodes/${ep.indice_ep}" class="player-episode-item ${isActive}" data-episode-number="${ep.indice_ep}">
          <span class="player-episode-number">Épisode ${ep.indice_ep}</span>
          <span class="player-episode-title">${ep.title_ep || 'Titre inconnu'}</span>
        </a>
      `;
    }).join('');
  
    const currentIndex = sortedEpisodes.findIndex(ep => ep.indice_ep == episodeNumber);
    const prevEpisode = currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;
    const nextEpisode = currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null;
  
    const prevButton = prevEpisode ? `<a href="/${seriesSlug}/episodes/${prevEpisode.indice_ep}" class="episode-nav-button"><i class="fas fa-chevron-left"></i> Précédent</a>` : `<span class="episode-nav-button disabled"><i class="fas fa-chevron-left"></i> Précédent</span>`;
    const nextButton = nextEpisode ? `<a href="/${seriesSlug}/episodes/${nextEpisode.indice_ep}" class="episode-nav-button">Suivant <i class="fas fa-chevron-right"></i></a>` : `<span class="episode-nav-button disabled">Suivant <i class="fas fa-chevron-right"></i></span>`;
  
    let embedUrl = '';
    if (currentEpisode.type === 'vidmoly' && currentEpisode.id) {
      embedUrl = `https://vidmoly.net/embed-${currentEpisode.id}.html`;
    }
  
    if (!embedUrl) {
      container.innerHTML = `<div class="episode-player-page error"><p>Le format de la vidéo n'est pas supporté.</p></div>`;
      return;
    }
  
    const playerViewHtml = `
      <div class="episode-player-page">
        <div class="player-header">
          <a href="/${seriesSlug}/episodes" class="player-series-title">${seriesData.title}</a>
          <h1 class="player-episode-main-title">Épisode ${currentEpisode.indice_ep} : ${currentEpisode.title_ep || ''}</h1>
        </div>
        <div class="player-layout-grid">
          <aside class="player-sidebar">
            <h3 class="sidebar-title">Épisodes</h3>
            <div class="player-episode-list-wrapper">
              ${episodeListHtml}
            </div>
          </aside>
          <div class="player-main-content">
            <div class="video-player-wrapper">
              <iframe src="${embedUrl}" scrolling="no" frameborder="0" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"></iframe>
            </div>
            <div class="episode-navigation">
                ${prevButton}
                <a href="/${seriesSlug}/episodes" class="episode-nav-button list-button"><i class="fas fa-list-ul"></i> Liste</a>
                ${nextButton}
            </div>
          </div>
        </div>
      </div>
    `;
  
    container.innerHTML = playerViewHtml;
    document.title = `BigSolo – ${seriesData.title} - Épisode ${currentEpisode.indice_ep}`;
  
    qs('.player-episode-item.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    container.addEventListener('click', (e) => {
        const navLink = e.target.closest('a.episode-nav-button:not(.disabled), a.player-episode-item:not(.active)');
        if (navLink) {
            const epNum = navLink.dataset.episodeNumber || navLink.href.split('/').pop();
            saveReadingProgress(seriesSlug, epNum);
        }
    });
}