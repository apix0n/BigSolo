// js/index.js
import { loadComponent, qs } from './utils/domUtils.js';
import { initHeader, setupMobileMenuInteractions } from './components/header.js';
import { initMainScrollObserver } from './components/observer.js';

async function initCommonComponents() {
  const headerPlaceholder = qs('#main-header');
  const mobileMenuPlaceholder = qs('#main-mobile-menu-overlay');
  const loadPromises = [];

  if (headerPlaceholder) {
    loadPromises.push(loadComponent(headerPlaceholder, '/includes/header.html'));
  } else {
    console.warn("Placeholder #main-header not found. Cannot load header.");
  }

  if (mobileMenuPlaceholder) {
    loadPromises.push(loadComponent(mobileMenuPlaceholder, '/includes/mobile-menu.html'));
  } else {
    console.warn("Placeholder #main-mobile-menu-overlay not found. Cannot load mobile menu.");
  }
  
  if (loadPromises.length > 0) {
    try {
        await Promise.all(loadPromises);
        console.log("Common components (header/menu) loaded.");
    } catch (error) {
        console.error("Error loading one or more common components:", error);
    }
  }

  if (headerPlaceholder && headerPlaceholder.innerHTML.trim() !== '') {
    try {
      initHeader();
    } catch (e) {
      console.error("Error initializing header:", e);
    }
  }

  if (mobileMenuPlaceholder && mobileMenuPlaceholder.innerHTML.trim() !== '') {
      if (typeof setupMobileMenuInteractions === 'function') {
        try {
          setupMobileMenuInteractions();
        } catch (e) {
            console.error("Error setting up mobile menu interactions:", e);
        }
      } else {
        console.error("setupMobileMenuInteractions is not available or was not loaded correctly.");
      }
  }
}

async function routeAndInitPage() {
  const path = window.location.pathname;
  const bodyId = document.body.id;
  console.log(`Routing for path: "${path}", bodyId: "${bodyId}"`);

  switch (bodyId) {
    case 'homepage':
      console.log("Initializing homepage.");
      const { initHomepage } = await import('./pages/homepage.js');
      await initHomepage();
      initMainScrollObserver();
      break;
    
    case 'galeriepage':
      console.log("Initializing galerie page.");
      const { initGaleriePage } = await import('./pages/galerie.js');
      await initGaleriePage();
      initMainScrollObserver();
      break;

    case 'presentationpage':
      console.log("Initializing presentation page.");
      const { initPresentationPage } = await import('./pages/presentation.js');
      initPresentationPage();
      initMainScrollObserver();
      break;

    case 'seriescoverspage':
      console.log("Initializing series covers page.");
      const { initSeriesCoversPage } = await import('./pages/series-covers.js');
      await initSeriesCoversPage();
      initMainScrollObserver();
      break;

    case 'seriesdetailpage':
      console.log("Initializing series detail page.");
      const { initSeriesDetailPage } = await import('./pages/series-detail.js');
      await initSeriesDetailPage();
      break;

    case 'readerpage':
      console.log("Initializing Manga Reader page.");
      const { initMangaReader } = await import('./pages/series-detail/MangaReader.js');
      await initMangaReader();
      // Pas de scroll observer ici car le lecteur gère son propre affichage.
      break;

    default:
      console.log('Aucune logique JS spécifique pour cet ID de body ou route non reconnue:', bodyId, path);
      initMainScrollObserver();
      break;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log("DOMContentLoaded event fired.");
  try {
    await initCommonComponents();
    await routeAndInitPage();
    console.log("Page initialization complete.");
  } catch (error) {
    console.error("Error during page initialization process:", error);
  }
});