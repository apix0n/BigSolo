export function renderPlayerUI(view, seriesData, episodeNumber) {
  const playerWrapper = view.querySelector("#video-player-wrapper");
  const playlistContainer = view.querySelector("#playlist-container");
  const titleElem = view.querySelector("#player-episode-title");

  const episodes = seriesData.episodes || [];
  const currentEpisode = episodes.find((ep) => String(ep.indice_ep) === String(episodeNumber));
  if (!currentEpisode) {
    playerWrapper.innerHTML = "<p>Épisode non trouvé.</p>";
    return;
  }

  // Détermine l'URL d'intégration vidéo
  let embedUrl = "";
  if (currentEpisode.type === "vidmoly" && currentEpisode.id) {
    embedUrl = `https://vidmoly.net/embed-${currentEpisode.id}.html`;
  } else if (currentEpisode.type === "gdrive" && currentEpisode.id) {
    embedUrl = `https://drive.google.com/file/d/${currentEpisode.id}/preview`;
  }

  playerWrapper.innerHTML = embedUrl
    ? `<iframe src="${embedUrl}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture"></iframe>`
    : "<p>Format vidéo non supporté.</p>";

  if (titleElem) {
    titleElem.textContent = `Épisode ${currentEpisode.indice_ep} : ${currentEpisode.title_ep || ""}`;
  }

  // Playlist
  if (playlistContainer) {
    playlistContainer.innerHTML = episodes
      .map(
        (ep) => `<a href="/${seriesData.slug}/episodes/${ep.indice_ep}" class="playlist-episode${ep.indice_ep == episodeNumber ? " active" : ""}" data-episode-id="${ep.indice_ep}">
          Ép. ${ep.indice_ep} ${ep.title_ep ? `: ${ep.title_ep}` : ""}
        </a>`
      )
      .join("");
  }
}