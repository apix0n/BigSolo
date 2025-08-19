/**
 * Ce fichier n'est plus nécessaire avec le nouveau design vertical interactif.
 * Supprimez toute la logique de tooltip et de gestion des tags overflow pour les cartes de séries.
 */

/**
 * Initialise les tooltips dynamiques pour les cartes de séries
 */
export function setupSeriesCardTooltips() {
  // Crée l'élément tooltip qui suivra le curseur
  const tooltip = document.createElement('div');
  tooltip.className = 'series-tooltip';
  document.body.appendChild(tooltip);

  // Sélectionne toutes les cartes
  const seriesCards = document.querySelectorAll('.series-card');

  seriesCards.forEach(card => {
    // Récupère la description de la série
    const description = card.querySelector('.series-description')?.textContent || 'Pas de description disponible.';
    let isOverButton = false;
    
    // Événements de survol pour la carte
    card.addEventListener('mouseenter', () => {
      if (!isOverButton) {
        tooltip.textContent = description;
        tooltip.style.opacity = '1';
      }
    });
    
    card.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
    
    // Événement pour suivre le curseur
    card.addEventListener('mousemove', (e) => {
      // Ne pas afficher le tooltip si on survole un bouton d'action
      const targetButton = e.target.closest('.action-button');
      if (targetButton) {
        isOverButton = true;
        tooltip.style.opacity = '0';
        return;
      } else {
        isOverButton = false;
        tooltip.style.opacity = '1';
      }
      
      // Positionne le tooltip à côté du curseur
      tooltip.style.left = (e.clientX + 15) + 'px';
      tooltip.style.top = (e.clientY) + 'px';
      
      // Évite que le tooltip sorte de l'écran sur la droite
      const tooltipRect = tooltip.getBoundingClientRect();
      if (tooltipRect.right > window.innerWidth) {
        tooltip.style.left = (e.clientX - tooltipRect.width - 10) + 'px';
      }
      
      // Évite que le tooltip sorte de l'écran en bas
      if (tooltipRect.bottom > window.innerHeight) {
        tooltip.style.top = (e.clientY - tooltipRect.height - 10) + 'px';
      }
    });

    // Gestion spécifique pour les boutons d'action
    const actionButtons = card.querySelectorAll('.action-button');
    actionButtons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        isOverButton = true;
        tooltip.style.opacity = '0';
      });
      
      button.addEventListener('mouseleave', () => {
        isOverButton = false;
      });
    });
  });
}

/**
 * Gère le dépassement des tags dans les cartes de séries
 * Si les tags dépassent la largeur disponible, ajoute un tag "+N" pour indiquer le nombre de tags cachés
 */
export function handleTagsOverflow() {
  const seriesCards = document.querySelectorAll('.series-card');
  
  seriesCards.forEach(card => {
    const tagsContainer = card.querySelector('.series-tags');
    if (!tagsContainer) return;
    
    const tags = Array.from(tagsContainer.querySelectorAll('.tag'));
    if (tags.length <= 1) return;
    
    // Réinitialiser - on affiche tous les tags et on supprime le tag de dépassement s'il existe
    tags.forEach(tag => tag.style.display = '');
    const existingOverflow = tagsContainer.querySelector('.tags-overflow');
    if (existingOverflow) existingOverflow.remove();
    
    // On attend que le rendu soit fait pour vérifier les dimensions
    setTimeout(() => {
      const containerRect = tagsContainer.getBoundingClientRect();
      const containerWidth = containerRect.width;
      
      let currentWidth = 0;
      let hiddenTags = 0;
      
      // Calculer combien de tags peuvent tenir dans la largeur disponible
      for (let i = 0; i < tags.length; i++) {
        const tagRect = tags[i].getBoundingClientRect();
        currentWidth += tagRect.width + 8; // 8px pour le gap entre les tags
        
        if (currentWidth > containerWidth) {
          tags[i].style.display = 'none';
          hiddenTags++;
        }
      }
      
      // Si des tags sont cachés, ajouter un tag "+N"
      if (hiddenTags > 0) {
        const overflowTag = document.createElement('span');
        overflowTag.className = 'tags-overflow';
        overflowTag.textContent = `+${hiddenTags}`;
        tagsContainer.appendChild(overflowTag);
      }
    }, 0);
  });
}

// Pour compatibilité avec le code existant
export const initSeriesCardTooltips = () => {
  setupSeriesCardTooltips();
  handleTagsOverflow();
};
