// --- File: js/pages/series-detail/AnimePlayer/components/playerFrame.js ---

import { qs, slugify } from "../../../../utils/domUtils.js";
import { state } from "../state.js";

export function render() {
  const container = qs(".reader-container");
  if (!container) return;

  const { seriesData, currentEpisode, allEpisodes } = state;
  const seriesSlug = slugify(seriesData.title);

  // - Debut modification (Utilisation de la nouvelle URL d'intégration)
  let embedUrl = "";
  if (currentEpisode.type === "gdrive" && currentEpisode.id) {
    // On utilise la nouvelle URL "embeddedplayer" qui est plus robuste pour le plein écran
    embedUrl = `https://drive.google.com/embeddedplayer/v1/embed?id=${currentEpisode.id}`;
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

  // La balise iframe est conservée, seule sa source change.
  container.innerHTML = `
    <div class="player-main-content">
      <div class="video-player-wrapper">
        ${
          embedUrl
            ? `<iframe src="${embedUrl}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe>`
            : "<p>Source vidéo non disponible.</p>"
        }
      </div>
      ${mobileNavHtml}
    </div>
  `;
}
