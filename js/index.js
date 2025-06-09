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
  const bodyId = document.body.id; // L'ID du body peut aussi aider à router
  console.log(`Routing for path: "${path}", bodyId: "${bodyId}"`);

  // Priorité aux routes plus spécifiques
  if ((path.startsWith('/series-detail/') && path.endsWith('/cover')) || bodyId === 'seriescoverspage') {
    console.log("Initializing series covers page.");
    const { initSeriesCoversPage } = await import('./pages/series-covers.js');
    await initSeriesCoversPage();
    initMainScrollObserver(); // Si applicable
  } else if (path.startsWith('/series-detail/') || path.includes('series-detail.html') || bodyId === 'seriesdetailpage') {
    console.log("Initializing series detail page.");
    const { initSeriesDetailPage } = await import('./pages/series-detail.js');
    await initSeriesDetailPage();
    initMainScrollObserver();
  } else if (path.includes('index.html') || path === '/' || bodyId === 'homepage') {
    console.log("Initializing homepage.");
    const { initHomepage } = await import('./pages/homepage.js');
    await initHomepage();
    initMainScrollObserver();
  } else if (path.includes('galerie.html') || bodyId === 'galeriepage') {
    console.log("Initializing galerie page.");
    const { initGaleriePage } = await import('./pages/galerie.js');
    await initGaleriePage();
    initMainScrollObserver();
  } else if (path.includes('presentation.html') || bodyId === 'presentationpage') {
    console.log("Initializing presentation page.");
    const { initPresentationPage } = await import('./pages/presentation.js');
    initPresentationPage();
    initMainScrollObserver();
  } else {
    console.log('Aucune logique JS spécifique pour cette page ou route non reconnue:', path);
    initMainScrollObserver();
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