// --- File: js/pages/series-detail/AnimePlayer/components/playerFrame.js ---

import { qs } from "../../../../utils/domUtils.js";
import { state } from "../state.js";

// - Debut modification (on exporte 'render' et on supprime 'init')
export function render() {
  // - Fin modification
  const container = qs(".reader-container");
  if (!container) return;

  const { currentEpisode } = state;

  let embedUrl = "";
  if (currentEpisode.type === "gdrive" && currentEpisode.id) {
    embedUrl = `https://drive.google.com/file/d/${currentEpisode.id}/preview`;
  }

  container.innerHTML = `
    <div class="player-main-content">
      <div class="video-player-wrapper">
        ${
          embedUrl
            ? `<iframe src="${embedUrl}" scrolling="no" frameborder="0" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"></iframe>`
            : "<p>Source vidéo non disponible.</p>"
        }
      </div>
    </div>
  `;
}
