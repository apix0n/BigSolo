// --- File: js/pages/series-detail/AnimePlayer/player.js ---

import { qs, slugify } from "../../../utils/domUtils.js";
import { state, dom } from "./state.js";
import * as infoSidebar from "./components/infoSidebar.js";
import * as playerFrame from "./components/playerFrame.js";
import {
  fetchSeriesStats,
  queueAction,
  getLocalInteractionState,
  setLocalInteractionState,
} from "../../../utils/interactions.js";

function enrichEpisodesWithAbsoluteIndex(episodes) {
  if (!episodes) return [];
  const episodesBySeason = episodes.reduce((acc, ep) => {
    const season = ep.saison_ep || 1;
    if (!acc[season]) acc[season] = [];
    acc[season].push(ep);
    return acc;
  }, {});

  const sortedSeasons = Object.keys(episodesBySeason).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );
  let absoluteIndexCounter = 1;
  let enrichedEpisodes = [];

  sortedSeasons.forEach((seasonNum) => {
    const seasonEpisodes = episodesBySeason[seasonNum].sort(
      (a, b) => a.indice_ep - b.indice_ep
    );
    seasonEpisodes.forEach((ep) => {
      enrichedEpisodes.push({ ...ep, absolute_index: absoluteIndexCounter });
      absoluteIndexCounter++;
    });
  });
  return enrichedEpisodes;
}

export async function initAnimePlayer() {
  const dataPlaceholder = qs("#player-data-placeholder");
  if (
    !dataPlaceholder?.textContent ||
    dataPlaceholder.textContent.includes("PLAYER_DATA_PLACEHOLDER")
  ) {
    return handleError("Les données du lecteur n'ont pas été trouvées.");
  }

  try {
    const playerData = JSON.parse(dataPlaceholder.textContent);
    state.seriesData = playerData.series;
    state.seriesData.slug = slugify(state.seriesData.title);

    state.allEpisodes = enrichEpisodesWithAbsoluteIndex(
      state.seriesData.episodes || []
    );

    state.currentEpisode = state.allEpisodes.find(
      (ep) => String(ep.absolute_index) === String(playerData.episodeNumber)
    );

    if (!state.currentEpisode) {
      throw new Error(
        `Épisode avec l'index absolu ${playerData.episodeNumber} non trouvé.`
      );
    }

    state.seriesStats = await fetchSeriesStats(state.seriesData.slug);

    // Initialisation et premier rendu complet
    setupBaseLayout();
    initializeGlobalEvents();
    infoSidebar.render();
    infoSidebar.attachAccordionListeners();

    updatePlayerState(playerData.episodeNumber, true);
  } catch (error) {
    handleError(`Impossible de charger le lecteur : ${error.message}`);
    console.error(error);
  }
}

function updatePlayerState(absoluteEpisodeIndex, isFirstLoad = false) {
  state.currentEpisode = state.allEpisodes.find(
    (ep) => String(ep.absolute_index) === String(absoluteEpisodeIndex)
  );
  if (!state.currentEpisode) return;

  const seasonText = state.currentEpisode.saison_ep
    ? `S${state.currentEpisode.saison_ep}`
    : "";
  document.title = `${state.seriesData.title} - ${seasonText} ÉP.${state.currentEpisode.indice_ep} | BigSolo`;

  playerFrame.render();

  if (isFirstLoad) {
    infoSidebar.updateEpisodeList(); // Redessine la liste complète la première fois
  } else {
    // Ne fait qu'une mise à jour ciblée (change les classes .active)
    infoSidebar.updateActiveEpisodeInList(absoluteEpisodeIndex);
  }

  updateAllLikeButtons();
}

function handleGlobalLike() {
  const ep = state.currentEpisode;
  const episodeId = `ep-S${ep.saison_ep || 1}-${ep.indice_ep}`;
  const interactionKey = `interactions_${state.seriesData.slug}_${episodeId}`;
  let localState = getLocalInteractionState(interactionKey);
  const isLiked = !!localState.liked;

  localState.liked = !isLiked;
  setLocalInteractionState(interactionKey, localState);

  queueAction(state.seriesData.slug, {
    type: !isLiked ? "like" : "unlike",
    chapter: episodeId,
  });

  // On met à jour l'état local des stats pour un affichage instantané
  const episodeStats = state.seriesStats[episodeId] || { likes: 0 };
  if (!isLiked) {
    episodeStats.likes = (episodeStats.likes || 0) + 1;
  } else {
    episodeStats.likes = Math.max(0, (episodeStats.likes || 0) - 1);
  }
  state.seriesStats[episodeId] = episodeStats;

  updateAllLikeButtons();
}

function updateAllLikeButtons() {
  const ep = state.currentEpisode;
  const episodeId = `ep-S${ep.saison_ep || 1}-${ep.indice_ep}`;
  const interactionKey = `interactions_${state.seriesData.slug}_${episodeId}`;
  const isLiked = !!getLocalInteractionState(interactionKey).liked;

  if (dom.toggleLikeBtn) {
    dom.toggleLikeBtn.classList.toggle("liked", isLiked);
  }
  // Met à jour UNIQUEMENT les compteurs de likes, sans recharger la liste
  infoSidebar.updateStatsInList();
}

function setupBaseLayout() {
  dom.root = qs("#anime-player-root");
  dom.root.innerHTML = `
    <div id="global-reader-controls">
        <button id="toggle-info-sidebar-btn" title="Liste des épisodes"><i class="fas fa-info-circle"></i></button>
        <button id="toggle-episode-like" title="J'aime cet épisode"><i class="fas fa-heart"></i></button>
    </div>
    <div class="reader-layout-container">
        <aside id="info-sidebar" class="reader-sidebar"></aside>
        <div class="reader-container"></div>
    </div>
  `;
  Object.assign(dom, {
    toggleInfoBtn: qs("#toggle-info-sidebar-btn"),
    toggleLikeBtn: qs("#toggle-episode-like"),
    infoSidebar: qs("#info-sidebar"),
  });
}

function updateLayout() {
  let infoWidth = 0;
  const rootStyle = getComputedStyle(document.documentElement);
  const infoWidthRem = parseFloat(
    rootStyle.getPropertyValue("--sidebar-info-width")
  );
  const baseFontSize = parseFloat(rootStyle.fontSize);

  if (state.infoSidebarOpen && dom.infoSidebar) {
    infoWidth = infoWidthRem * baseFontSize;
    dom.infoSidebar.style.transform = "translateX(0)";
  } else if (dom.infoSidebar) {
    dom.infoSidebar.style.transform = "translateX(-100%)";
  }

  const readerContainer = qs(".reader-container");
  if (readerContainer) {
    readerContainer.style.marginLeft = `${infoWidth}px`;
  }
}

function handleEpisodeNavigation(event) {
  const link = event.target.closest("a");
  if (link && link.dataset.episodeId) {
    event.preventDefault();
    if (link.classList.contains("active")) {
      console.log("Clic sur l'épisode déjà actif, aucune action.");
      return;
    }

    const absoluteEpisodeIndex = link.dataset.episodeId;
    history.pushState({ episodeNumber: absoluteEpisodeIndex }, "", link.href);
    updatePlayerState(absoluteEpisodeIndex);
  }
}

function initializeGlobalEvents() {
  dom.toggleInfoBtn.addEventListener("click", () => {
    state.infoSidebarOpen = !state.infoSidebarOpen;
    dom.toggleInfoBtn.classList.toggle("active", state.infoSidebarOpen);
    updateLayout();
  });

  dom.toggleLikeBtn.addEventListener("click", handleGlobalLike);
  dom.infoSidebar.addEventListener("click", handleEpisodeNavigation);
  updateLayout();
}

function handleError(message) {
  console.error(message);
  const root = qs("#anime-player-root");
  if (root) {
    root.innerHTML = `<p style="padding: 2rem; text-align: center; color: var(--clr-text-sub);">${message}</p>`;
  }
}
