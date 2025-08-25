// --- File: js/pages/series-detail/AnimeView.js ---

import { qs } from "../../utils/domUtils.js";
import { timeAgo, parseDateToTimestamp } from "../../utils/dateUtils.js";
import {
  queueAction,
  getLocalInteractionState,
  setLocalInteractionState,
} from "../../utils/interactions.js";
import { renderSeriesInfo } from "./shared/infoRenderer.js";
import { renderActionButtons } from "./shared/actionButtons.js";
import { initListControls } from "./shared/listControls.js";
import { fetchStats } from "./shared/statsManager.js";

let currentSeriesData = null;
let currentSeriesStats = null;
let viewContainer = null;

/**
 * Point d'entrée pour le rendu de la vue Anime.
 * @param {HTMLElement} mainContainer - L'élément <main> de la page.
 * @param {object} seriesData - Les données de la série.
 */
export async function render(mainContainer, seriesData) {
  console.log("[AnimeView] Début du rendu.");
  currentSeriesData = seriesData;
  viewContainer = mainContainer;

  const statsPromise = fetchStats(currentSeriesData.slug);

  renderSeriesInfo(viewContainer, currentSeriesData, {}, "anime");
  renderActionButtons(viewContainer, currentSeriesData, "anime");

  currentSeriesStats = await statsPromise;

  renderSeriesInfo(
    viewContainer,
    currentSeriesData,
    currentSeriesStats,
    "anime"
  );

  initListControls(viewContainer, handleFilterOrSortChange);

  displayEpisodeList({
    sort: { type: "number", order: "desc" },
    search: "",
  });
}

function handleFilterOrSortChange(controls) {
  displayEpisodeList(controls);
}

function displayEpisodeList({ sort, search }) {
  const container = qs(".chapters-list-container", viewContainer);
  if (!container) {
    console.error("[AnimeView] Conteneur de liste d'épisodes introuvable.");
    return;
  }

  let episodes = currentSeriesData.episodes || [];

  if (search.trim()) {
    const searchTerm = search.trim().toLowerCase();
    episodes = episodes.filter(
      (ep) =>
        String(ep.indice_ep).toLowerCase().includes(searchTerm) ||
        (ep.title_ep && ep.title_ep.toLowerCase().includes(searchTerm))
    );
  }

  episodes.sort((a, b) => {
    if (sort.type === "date") {
      const dateA = parseDateToTimestamp(a.date_ep);
      const dateB = parseDateToTimestamp(b.date_ep);
      return sort.order === "desc" ? dateB - dateA : dateA - dateB;
    }
    return sort.order === "desc"
      ? b.indice_ep - a.indice_ep
      : a.indice_ep - b.indice_ep;
  });

  if (episodes.length === 0) {
    container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 1rem;">Aucun épisode ne correspond à votre recherche.</p>`;
  } else {
    container.innerHTML = episodes.map((ep) => renderEpisodeItem(ep)).join("");
  }

  attachEpisodeItemEventListeners(container);
}

function renderEpisodeItem(episodeData) {
  const seriesSlug = currentSeriesData.slug;
  const episodeId = `ep-${episodeData.indice_ep}`;
  const interactionKey = `interactions_${seriesSlug}_${episodeId}`;
  const localState = getLocalInteractionState(interactionKey);
  const isLiked = !!localState.liked;

  const episodeStats = currentSeriesStats?.[episodeId] || { likes: 0 };
  let displayLikes = episodeStats.likes || 0;
  if (isLiked) {
    displayLikes++;
  }

  // Note: La vue Anime n'a pas de compteur de vues ou de commentaires pour l'instant.
  return `
    <a href="/${seriesSlug}/episodes/${
    episodeData.indice_ep
  }" class="chapter-card-list-item" data-episode-id="${episodeData.indice_ep}">
      <div class="chapter-card-list-top">
        <div class="chapter-card-list-left">
          <span class="chapter-card-list-number">Épisode ${
            episodeData.indice_ep
          }</span>
        </div>
      </div>
      <div class="chapter-card-list-bottom">
        <div class="chapter-card-list-left">
          <span class="chapter-card-list-title">${
            episodeData.title_ep || ""
          }</span>
        </div>
        <div class="chapter-card-list-right">
          <span class="chapter-card-list-likes${
            isLiked ? " liked" : ""
          }" data-base-likes="${episodeStats.likes || 0}">
            <i class="fas fa-heart"></i>
            <span class="likes-count">${displayLikes}</span>
          </span>
        </div>
      </div>
    </a>
  `;
}

function attachEpisodeItemEventListeners(container) {
  container
    .querySelectorAll(".chapter-card-list-likes")
    .forEach((likeButton) => {
      likeButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const card = likeButton.closest(".chapter-card-list-item");
        const episodeNum = card.dataset.episodeId;
        const seriesSlug = currentSeriesData.slug;

        handleLikeToggle(seriesSlug, episodeNum, likeButton);
      });
    });
}

function handleLikeToggle(seriesSlug, episodeNum, likeButton) {
  const episodeId = `ep-${episodeNum}`; // Clé unique pour les épisodes
  const interactionKey = `interactions_${seriesSlug}_${episodeId}`;
  const localState = getLocalInteractionState(interactionKey);
  const isLiked = !!localState.liked;

  likeButton.classList.toggle("liked", !isLiked);
  const countSpan = likeButton.querySelector(".likes-count");
  const baseLikes = parseInt(likeButton.dataset.baseLikes, 10) || 0;
  countSpan.textContent = !isLiked ? baseLikes + 1 : baseLikes;

  localState.liked = !isLiked;
  setLocalInteractionState(interactionKey, localState);

  queueAction(seriesSlug, {
    type: !isLiked ? "like" : "unlike",
    chapter: episodeId, // On envoie la clé unique
  });

  console.log(
    `[AnimeView] Action de like mise en file: ${
      !isLiked ? "like" : "unlike"
    } pour ép. ${episodeNum}`
  );
}
