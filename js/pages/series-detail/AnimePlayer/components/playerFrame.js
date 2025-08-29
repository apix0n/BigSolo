// --- File: js/pages/series-detail/AnimePlayer/components/playerFrame.js ---

import { qs, slugify } from "../../../../utils/domUtils.js";
import { state } from "../state.js";

export function render() {
  const container = qs(".reader-container");
  if (!container) return;

  const { seriesData, currentEpisode, allEpisodes } = state;
  const seriesSlug = slugify(seriesData.title);

  let embedUrl = "";
  if (currentEpisode.type === "gdrive" && currentEpisode.id) {
    embedUrl = `https://drive.google.com/file/d/${currentEpisode.id}/preview`;
  }

  // - Debut modification
  // On trouve l'index de l'épisode actuel pour déterminer le précédent et le suivant
  const currentIndex = allEpisodes.findIndex(
    (ep) => ep.absolute_index === currentEpisode.absolute_index
  );
  const prevEpisode = allEpisodes[currentIndex - 1];
  const nextEpisode = allEpisodes[currentIndex + 1];

  // On construit les boutons de navigation mobile
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
  // - Fin modification

  container.innerHTML = `
    <div class="player-main-content">
      <div class="video-player-wrapper">
        ${
          embedUrl
            ? `<iframe src="${embedUrl}" scrolling="no" frameborder="0" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"></iframe>`
            : "<p>Source vidéo non disponible.</p>"
        }
      </div>
      ${mobileNavHtml}
    </div>
  `;
}
