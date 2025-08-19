function createEpisodeItem(episode) {
  const item = document.createElement("a");
  item.href = `${window.location.pathname.replace(/\/episodes\/?$/, "")}/episodes/${episode.indice_ep}`;
  item.className = "episode-item";
  item.dataset.episodeId = episode.indice_ep;
  item.innerHTML = `
    <span>${episode.title_ep || "Épisode " + episode.indice_ep}</span>
    <span class="episode-date">${episode.date_ep || ""}</span>
  `;
  return item;
}

export function populateEpisodeList(container, episodes) {
  container.innerHTML = "";
  episodes.forEach((episode) => {
    const episodeElement = createEpisodeItem(episode);
    container.appendChild(episodeElement);
  });
}