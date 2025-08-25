// --- File: js/pages/series-detail/shared/infoRenderer.js ---

import { qs } from "../../../utils/domUtils.js";
import {
  getLocalSeriesRating,
  setLocalSeriesRating,
} from "../../../utils/interactions.js";

/**
 * Affiche l'ensemble des informations principales de la série (partie haute).
 * @param {HTMLElement} viewContainer - L'élément conteneur principal de la vue.
 * @param {object} seriesData - Les données complètes de la série.
 * @param {object} seriesStats - Les statistiques d'interaction de la série.
 * @param {'manga' | 'anime'} viewType - Le type de vue à rendre ('manga' ou 'anime').
 */
export function renderSeriesInfo(
  viewContainer,
  seriesData,
  seriesStats,
  viewType
) {
  console.log(
    `[InfoRenderer] Rendu des informations pour la vue : ${viewType}`
  );

  renderBannerAndCover(viewContainer, seriesData, viewType);
  renderTitlesAndTags(viewContainer, seriesData, viewType);
  renderCreatorInfo(viewContainer, seriesData, viewType);
  renderDescription(viewContainer, seriesData);
  renderRatingComponent(viewContainer, seriesData, seriesStats);
}

// --- Fonctions de rendu spécifiques ---

function renderBannerAndCover(container, seriesData, viewType) {
  const banner = qs("#hero-banner-section", container);
  const coverImg = qs(".detail-cover", container);
  const animeData = seriesData.anime?.[0];

  const coverUrl =
    viewType === "anime" && animeData?.cover_an
      ? animeData.cover_an
      : seriesData.cover;

  if (banner) {
    banner.style.setProperty("--hero-banner-bg", `url('${coverUrl}')`);
  }
  if (coverImg) {
    coverImg.src = coverUrl || "";
    coverImg.alt = `Couverture de ${seriesData.title}`;
  }
}

function renderTitlesAndTags(container, seriesData, viewType) {
  const animeData = seriesData.anime?.[0];
  const data = viewType === "anime" ? animeData : seriesData;

  const jpTitleElem = qs(".detail-jp-title", container);
  if (jpTitleElem) jpTitleElem.textContent = seriesData.jp_title || "";

  const titleElem = qs(".detail-title", container);
  if (titleElem) titleElem.textContent = seriesData.title || "";

  const tagsDiv = qs(".detail-tags", container);
  if (tagsDiv) {
    tagsDiv.innerHTML = (data.tags || [])
      .map((tag) => `<span class="detail-tag">${tag}</span>`)
      .join("");
  }

  const statusElem = qs(".status-indicator", container);
  if (statusElem) {
    const statusText = data.release_status || data.status_an || "?";
    const isFinished = statusText.toLowerCase().includes("fini");
    statusElem.innerHTML = `<span class="status-dot${
      isFinished ? " finished" : ""
    }"></span>${statusText}`;
  }

  const yearElem = qs(".release-year", container);
  if (yearElem)
    yearElem.textContent = data.release_year || data.date_start_an || "?";
}

function renderCreatorInfo(container, seriesData, viewType) {
  const metaElem = qs(".detail-meta.detail-creator-info", container);
  if (!metaElem) return;

  if (viewType === "anime") {
    const studio = seriesData.anime?.[0]?.studios_an?.join(", ") || "?";
    metaElem.innerHTML = `Studio : ${studio}`;
  } else {
    if (
      seriesData.author &&
      seriesData.artist &&
      seriesData.author === seriesData.artist
    ) {
      metaElem.innerHTML = `Auteur & Artiste : ${seriesData.author}`;
    } else {
      metaElem.innerHTML = `Auteur : ${
        seriesData.author || "?"
      }<span class="creator-separator"></span>Dessinateur : ${
        seriesData.artist || "?"
      }`;
    }
  }
}

function renderDescription(container, seriesData) {
  const descElem = qs(".detail-description", container);
  if (descElem) {
    descElem.textContent =
      seriesData.description || "Aucune description disponible.";
  }
  // Logique du bouton "Afficher plus" (pour les infos supplémentaires)
  const btnRow = qs(".series-see-more-row", container);
  const btn = qs(".series-see-more-btn", container);
  const moreInfos = qs(".series-more-infos", container);
  if (!btn || !moreInfos || !btnRow) return;

  const altTitles = (seriesData.alternative_titles || []).join(", ");
  moreInfos.innerHTML = `
    <div><strong>Type :</strong> ${seriesData.manga_type || "?"}</div>
    <div><strong>Magazine :</strong> ${seriesData.magazine || "?"}</div>
    <div><strong>Titres alternatifs :</strong> ${altTitles || "—"}</div>
  `;
  btn.addEventListener(
    "click",
    () => {
      btnRow.classList.add("hide");
      moreInfos.style.display = "block";
    },
    { once: true }
  );
}

function renderRatingComponent(container, seriesData, seriesStats) {
  const ratingContainer = qs("#series-rating-container", container);
  if (!ratingContainer) {
    console.warn(
      "[InfoRenderer] Conteneur de notation #series-rating-container introuvable."
    );
    return;
  }

  const seriesSlug = seriesData.slug; // Le slug est ajouté dans le routeur
  const serverRating = seriesStats?.stats?.ratings || { average: 0, count: 0 };
  const userRating = getLocalSeriesRating(seriesSlug);

  // Injecte le HTML du composant
  ratingContainer.innerHTML = `
        <button id="series-rating-btn" class="detail-action-btn detail-action-btn--rate" type="button" data-slug="${seriesSlug}">
            <i class="fa-solid fa-star rating-star"></i>
            <span class="series-rating-average">...</span>
        </button>
        <div id="series-rating-tooltip" class="series-rating-tooltip"></div>
        <div id="series-rating-menu" class="series-rating-menu">
            <ul>
                ${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
                  .map(
                    (score) =>
                      `<li data-score="${score}">(${score}) ${getRatingLabel(
                        score
                      )}</li>`
                  )
                  .join("")}
                <li data-score="remove" class="remove-rating">Retirer la note</li>
            </ul>
        </div>
    `;

  // Initialise le composant avec sa logique interne
  setupRatingComponentLogic(seriesSlug, serverRating, userRating);
}

function getRatingLabel(score) {
  const labels = {
    10: "Chef-d'œuvre",
    9: "Excellent",
    8: "Très bon",
    7: "Bon",
    6: "Correct",
    5: "Moyen",
    4: "Mauvais",
    3: "Très mauvais",
    2: "Horrible",
    1: "Affligeant",
  };
  return labels[score] || "";
}

function setupRatingComponentLogic(
  seriesSlug,
  serverRating,
  initialUserRating
) {
  const btn = qs("#series-rating-btn");
  const tooltip = qs("#series-rating-tooltip");
  const menu = qs("#series-rating-menu");
  const avgSpan = qs(".series-rating-average", btn);

  let currentServerRating = { ...serverRating };
  let currentUserRating = initialUserRating;

  function updateDisplay() {
    let totalVotes = currentServerRating.count || 0;
    let totalScore = (currentServerRating.average || 0) * totalVotes;

    if (currentUserRating !== null) {
      totalVotes++;
      totalScore += currentUserRating;
    }

    const displayAvg = totalVotes > 0 ? totalScore / totalVotes : 0;

    avgSpan.textContent = (Math.round(displayAvg * 10) / 10).toLocaleString(
      "fr-FR",
      { minimumFractionDigits: 1, maximumFractionDigits: 1 }
    );
    tooltip.textContent = `${totalVotes} vote${totalVotes > 1 ? "s" : ""}`;
    btn.classList.toggle("accent", currentUserRating !== null);
  }

  // Événements du composant
  btn.addEventListener("mouseenter", (e) => {
    tooltip.classList.add("visible");
    positionTooltip(e);
  });
  btn.addEventListener("mousemove", positionTooltip);
  btn.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));

  function positionTooltip(e) {
    const tRect = tooltip.getBoundingClientRect();
    let left = e.clientX + 16;
    let top = e.clientY - 18;
    if (left + tRect.width > window.innerWidth - 8)
      left = window.innerWidth - tRect.width - 8;
    if (top < 8) top = 8;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  let menuOpen = false;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menuOpen = !menuOpen;
    // ***** CORRECTION ICI *****
    menu.classList.toggle("visible", menuOpen);
    if (menuOpen) {
      const rect = btn.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 6}px`;
      menu.style.left = `${rect.left}px`;
    }
  });

  document.addEventListener("click", (e) => {
    if (menuOpen && !menu.contains(e.target)) {
      menuOpen = false;
      // ***** CORRECTION ICI *****
      menu.classList.remove("visible");
    }
  });

  menu.querySelectorAll("li[data-score]").forEach((li) => {
    li.addEventListener("click", () => {
      const scoreValue = li.dataset.score;

      if (scoreValue === "remove") {
        currentUserRating = null;
      } else {
        currentUserRating = parseInt(scoreValue, 10);
      }

      setLocalSeriesRating(seriesSlug, currentUserRating);
      updateDisplay();
      menuOpen = false;
      // ***** CORRECTION ICI *****
      menu.classList.remove("visible");
    });
  });

  // Affichage initial
  updateDisplay();
}
