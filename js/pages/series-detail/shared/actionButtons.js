// --- File: js/pages/series-detail/shared/actionButtons.js ---

import { qs } from "../../../utils/domUtils.js";

/**
 * Affiche les boutons d'action de lecture/visionnage.
 * @param {HTMLElement} viewContainer - Le conteneur principal de la vue.
 * @param {object} seriesData - Les données de la série.
 * @param {'manga' | 'anime'} viewType - Le type de vue.
 */
export function renderActionButtons(viewContainer, seriesData, viewType) {
  console.log(`[ActionButtons] Rendu des boutons pour la vue : ${viewType}`);
  const actionsDiv = qs("#reading-actions-container", viewContainer);
  if (!actionsDiv) {
    console.warn(
      "[ActionButtons] Conteneur #reading-actions-container introuvable."
    );
    return;
  }

  // Nettoie les anciens boutons (sauf le conteneur de notation)
  Array.from(actionsDiv.children).forEach((child) => {
    if (child.id !== "series-rating-container") {
      child.remove();
    }
  });

  const seriesSlug = seriesData.slug;
  const localKey = `reading-progress-${seriesSlug}`;
  const savedProgress = localStorage.getItem(localKey);

  const items =
    viewType === "manga" ? seriesData.chapters : seriesData.episodes;
  const itemKeys = Object.keys(items || {});
  if (itemKeys.length === 0) {
    console.log(
      "[ActionButtons] Aucun chapitre/épisode à afficher, pas de boutons."
    );
    return;
  }

  // Trier pour trouver le dernier
  itemKeys.sort((a, b) => {
    const numA = viewType === "manga" ? parseFloat(a) : items[a].indice_ep;
    const numB = viewType === "manga" ? parseFloat(b) : items[b].indice_ep;
    return numB - numA;
  });
  const lastItemKey = itemKeys[0];

  const labels = {
    manga: { singular: "chapitre", plural: "chapitres", prefix: "Ch." },
    anime: { singular: "épisode", plural: "épisodes", prefix: "Ep." },
  };
  const currentLabels = labels[viewType];
  const urlPath = viewType === "manga" ? "" : "/episodes";

  const lastItemLabel = `${currentLabels.prefix} ${lastItemKey}`;

  if (!savedProgress) {
    // Cas 1: Jamais lu
    const lastBtn = createButton(
      `Dernier ${currentLabels.singular} (${lastItemLabel})`,
      `/${seriesSlug}${urlPath}/${lastItemKey}`
    );
    actionsDiv.appendChild(lastBtn);
    console.log(`[ActionButtons] Affichage: Dernier ${currentLabels.singular}`);
  } else {
    // Cas 2: A déjà une progression
    const isUpToDate = savedProgress.toString() === lastItemKey.toString();
    if (isUpToDate) {
      // Cas 2a: À jour
      const upToDateBtn = createDisabledButton("À jour");
      actionsDiv.appendChild(upToDateBtn);
      console.log("[ActionButtons] Affichage: À jour");
    } else {
      // Cas 2b: Pas à jour
      // ***** CORRECTION ICI : L'ORDRE EST INVERSÉ *****
      const lastBtn = createButton(
        `Dernier ${currentLabels.singular} (${lastItemLabel})`,
        `/${seriesSlug}${urlPath}/${lastItemKey}`
      );
      const continueLabel = `${currentLabels.prefix} ${savedProgress}`;
      const continueBtn = createButton(
        `Continuer (${continueLabel})`,
        `/${seriesSlug}${urlPath}/${savedProgress}`,
        true
      );

      actionsDiv.appendChild(lastBtn); // Dernier chapitre en premier
      actionsDiv.appendChild(continueBtn); // Continuer en second
      console.log(
        `[ActionButtons] Affichage: Dernier ${currentLabels.singular} + Continuer`
      );
    }
  }
}

function createButton(text, href, isContinue = false) {
  const btn = document.createElement("a");
  btn.href = href;
  btn.className = "detail-action-btn";
  if (isContinue) {
    btn.classList.add("detail-action-btn--continue");
  }
  btn.textContent = text;
  return btn;
}

function createDisabledButton(text) {
  const btn = document.createElement("span");
  btn.className = "detail-action-btn detail-action-btn--disabled";
  btn.textContent = text;
  return btn;
}
