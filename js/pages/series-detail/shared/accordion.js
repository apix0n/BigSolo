// --- File: js/pages/series-detail/shared/accordion.js ---

import { qs } from "../../../utils/domUtils.js";

/**
 * Initialise un composant de type "accordéon" pour afficher/masquer du contenu.
 * @param {object} config - L'objet de configuration.
 * @param {string} config.buttonSelector - Le sélecteur CSS du bouton déclencheur.
 * @param {string} config.contentSelector - Le sélecteur CSS du conteneur de contenu à afficher/masquer.
 * @param {HTMLElement} [config.context=document] - L'élément parent dans lequel chercher les sélecteurs.
 */
export function initAccordion({
  buttonSelector,
  contentSelector,
  context = document,
}) {
  const toggleBtn = qs(buttonSelector, context);
  const content = qs(contentSelector, context);

  if (!toggleBtn || !content) {
    console.warn("Accordion init failed: button or content not found.", {
      buttonSelector,
      contentSelector,
    });
    return;
  }

  const btnLabel = qs(".see-more-label", toggleBtn);
  const btnIcon = qs("i", toggleBtn); // On cible la première icône

  // Initialisation de l'état
  const isOpen = content.classList.contains("is-open");
  toggleBtn.setAttribute("aria-expanded", isOpen);
  if (isOpen) {
    content.style.maxHeight = content.scrollHeight + "px";
  }

  toggleBtn.addEventListener("click", () => {
    const isCurrentlyOpen = toggleBtn.getAttribute("aria-expanded") === "true";

    // Mettre à jour l'état et les attributs ARIA
    toggleBtn.setAttribute("aria-expanded", !isCurrentlyOpen);
    content.classList.toggle("is-open", !isCurrentlyOpen);

    // Mettre à jour le texte et l'icône
    if (btnLabel) {
      btnLabel.textContent = isCurrentlyOpen
        ? "Afficher plus"
        : "Afficher moins";
    }
    if (btnIcon) {
      btnIcon.classList.toggle("rotated", !isCurrentlyOpen);
    }

    // Animer la hauteur
    if (!isCurrentlyOpen) {
      // Pour ouvrir : on définit la hauteur max à la hauteur réelle du contenu
      content.style.maxHeight = content.scrollHeight + "px";
    } else {
      // Pour fermer : on remet la hauteur max à 0
      content.style.maxHeight = "0";
    }
  });
}
