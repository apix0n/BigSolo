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
import { initMainScrollObserver } from "../../components/observer.js";

let currentSeriesData = null;
let currentSeriesStats = null;
let viewContainer = null;
let resizeObserver = null;

/**
 * Configure la logique de déplacement des éléments pour le responsive.
 * @param {HTMLElement} container - Le conteneur principal de la vue.
 */
function setupResponsiveLayout(container) {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  const elementsToMove = {
    metadata: {
      element: qs(".series-metadata-container", container),
      desktopParent: qs(".hero-info-top", container),
      mobileTarget: qs("#mobile-tags-target", container),
    },
    actions: {
      element: qs("#reading-actions-container", container),
      desktopParent: qs(".hero-info-bottom", container),
      mobileTarget: qs("#mobile-actions-target", container),
    },
    description: {
      element: qs("#description-wrapper", container),
      desktopParent: qs("#series-info-section", container),
      mobileTarget: qs("#mobile-description-target", container),
    },
  };

  if (!elementsToMove.description.mobileTarget) {
    const descTarget = document.createElement("div");
    descTarget.id = "mobile-description-target";
    qs(".mobile-only-targets", container).appendChild(descTarget);
    elementsToMove.description.mobileTarget = descTarget;
  }

  const updatePositions = () => {
    const isMobile = window.innerWidth <= 768;
    for (const key in elementsToMove) {
      const { element, desktopParent, mobileTarget } = elementsToMove[key];
      if (element && desktopParent && mobileTarget) {
        if (isMobile && element.parentElement !== mobileTarget) {
          mobileTarget.appendChild(element);
        } else if (!isMobile && element.parentElement !== desktopParent) {
          if (key === "description") {
            desktopParent.appendChild(element);
          } else {
            desktopParent.appendChild(element);
          }
        }
      }
    }
  };

  resizeObserver = new ResizeObserver(updatePositions);
  resizeObserver.observe(document.body);
  updatePositions();
}

/**
 * Point d'entrée pour le rendu de la vue Anime.
 * @param {HTMLElement} mainContainer - L'élément <main> de la page.
 * @param {object} seriesData - Les données de la série.
 */
export async function render(mainContainer, seriesData) {
  console.log("[AnimeView] Début du rendu.");
  currentSeriesData = seriesData;
  viewContainer = mainContainer;

  if (!seriesData.anime || seriesData.anime.length === 0) {
    viewContainer.innerHTML =
      "<p class='loading-message'>Aucune information sur l'anime disponible pour cette série.</p>";
    return;
  }

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

  // Appel de la fonction de réorganisation responsive
  setupResponsiveLayout(viewContainer);
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
  initMainScrollObserver(".chapters-list-container .chapter-card-list-item");
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

  const episodeNumberHtml = `Épisode ${episodeData.indice_ep}`;

  return `
    <a href="/${seriesSlug}/episodes/${
    episodeData.indice_ep
  }" class="chapter-card-list-item" data-episode-id="${episodeData.indice_ep}">
      <div class="chapter-card-list-top">
        <div class="chapter-card-list-left">
          <span class="chapter-card-list-number">${episodeNumberHtml}</span>
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
  const episodeId = `ep-${episodeNum}`;
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
    chapter: episodeId,
  });

  console.log(
    `[AnimeView] Action de like mise en file: ${
      !isLiked ? "like" : "unlike"
    } pour ép. ${episodeNum}`
  );
}
