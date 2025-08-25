// --- File: js/pages/series-detail/shared/listControls.js ---

import { qs } from "../../../utils/domUtils.js";

let currentSort = { type: "number", order: "desc" };
let currentSearch = "";

/**
 * Initialise les contrôles de recherche et de tri pour une liste.
 * @param {HTMLElement} viewContainer - Le conteneur principal de la vue.
 * @param {function} onUpdate - La fonction callback à appeler quand un filtre ou un tri change.
 */
export function initListControls(viewContainer, onUpdate) {
  console.log("[ListControls] Initialisation des contrôles.");
  const searchInput = qs('.search-chapter input[type="text"]', viewContainer);
  const sortBtn = qs(".sort-chapter-btn", viewContainer);

  if (!searchInput || !sortBtn) {
    console.warn("[ListControls] Éléments de recherche ou de tri non trouvés.");
    return;
  }

  // Réinitialiser l'état au cas où
  currentSort = { type: "number", order: "desc" };
  currentSearch = "";
  searchInput.value = "";
  updateSortButtonText(sortBtn);

  // Écouteur pour la recherche
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    console.log(`[ListControls] Recherche mise à jour : "${currentSearch}"`);
    onUpdate({ sort: currentSort, search: currentSearch });
  });

  // Écouteur pour le tri
  sortBtn.addEventListener("click", () => {
    // Cycle de tri: num desc -> num asc -> date desc -> date asc -> ...
    if (currentSort.type === "number" && currentSort.order === "desc") {
      currentSort = { type: "number", order: "asc" };
    } else if (currentSort.type === "number" && currentSort.order === "asc") {
      currentSort = { type: "date", order: "desc" };
    } else if (currentSort.type === "date" && currentSort.order === "desc") {
      currentSort = { type: "date", order: "asc" };
    } else {
      currentSort = { type: "number", order: "desc" };
    }

    updateSortButtonText(sortBtn);
    console.log("[ListControls] Tri mis à jour :", currentSort);
    onUpdate({ sort: currentSort, search: currentSearch });
  });
}

function updateSortButtonText(btn) {
  let txt = "";
  if (currentSort.type === "date") {
    txt = currentSort.order === "desc" ? "Date (récent)" : "Date (ancien)";
  } else {
    txt =
      currentSort.order === "desc"
        ? "Numéro (décroissant)"
        : "Numéro (croissant)";
  }
  btn.innerHTML = `<i class="fas fa-sort"></i> ${txt}`;
}
