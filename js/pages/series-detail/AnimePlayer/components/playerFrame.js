// --- File: js/pages/series-detail/AnimePlayer/components/playerFrame.js ---

import { qs, slugify } from "../../../../utils/domUtils.js";
import { state } from "../state.js";

export function render() {
  const container = qs(".reader-container");
  if (!container) return;

  const { seriesData, currentEpisode, allEpisodes } = state;
  const seriesSlug = slugify(seriesData.title);

  // - Debut modification (Correction de l'URL d'intégration Sibnet)
  let embedUrl = "";
  if (currentEpisode.type === "sibnet" && currentEpisode.id) {
    // On construit l'URL correcte avec shell.php
    embedUrl = `https://video.sibnet.ru/shell.php?videoid=${currentEpisode.id}`;
  }
  // On garde la logique pour Google Drive en fallback
  else if (currentEpisode.type === "gdrive" && currentEpisode.id) {
    embedUrl = `https://drive.google.com/file/d/${currentEpisode.id}/preview`;
  }
  // - Fin modification

  const currentIndex = allEpisodes.findIndex(
    (ep) => ep.absolute_index === currentEpisode.absolute_index
  );
  const prevEpisode = allEpisodes[currentIndex - 1];
  const nextEpisode = allEpisodes[currentIndex + 1];

  const mobileNavHtml = `
    <div class="episode-navigation mobile-only">
      ${
        prevEpisode
          ? `<a href="/${seriesSlug}/episodes/${prevEpisode.absolute_index}" class="episode-nav-button" data-episode-id="${prevEpisode.absolute_index}"><i class="fas fa-chevron-left"></i> Précédent</a>`
          : '<span class="episode-nav-button disabled"><i class="fas fa-chevron-left"></i> Précédent</span>'
      }
      ${
        nextEpisode
          ? `<a href="/${seriesSlug}/episodes/${nextEpisode.absolute_index}" class="episode-nav-button" data-episode-id="${nextEpisode.absolute_index}">Suivant <i class="fas fa-chevron-right"></i></a>`
          : '<span class="episode-nav-button disabled">Suivant <i class="fas fa-chevron-right"></i></span>'
      }
    </div>
  `;

  const iframeHtml = embedUrl
    ? `
    <iframe 
      src="${embedUrl}" 
      frameborder="0" 
      allowfullscreen="true" 
      allow="autoplay; fullscreen; picture-in-picture"
    ></iframe>
  `
    : "<p>Source vidéo non disponible.</p>";

  container.innerHTML = `
    <div class="player-main-content">
      <div class="video-player-wrapper">
        ${iframeHtml}
      </div>
      ${mobileNavHtml}
    </div>
  `;
}
