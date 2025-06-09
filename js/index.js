// js/index.js
import { loadComponent, qs } from './utils/domUtils.js';
import { initHeader, setupMobileMenuInteractions } from './components/header.js';
import { initMainScrollObserver } from './components/observer.js'; // L'import reste

async function initCommonComponents() {
  const headerPlaceholder = qs('#main-header');
  const mobileMenuPlaceholder = qs('#main-mobile-menu-overlay');

  await Promise.all([
    loadComponent(headerPlaceholder, './includes/header.html'),
    loadComponent(mobileMenuPlaceholder, './includes/mobile-menu.html')
  ]);

  initHeader();
  if (typeof setupMobileMenuInteractions === 'function') {
    setupMobileMenuInteractions();
  } else {
    console.error("setupMobileMenuInteractions n'est pas disponible.");
  }
  // initMainScrollObserver(); // SUPPRIMER L'APPEL D'ICI
}

async function routeAndInitPage() {
  const path = window.location.pathname;
  const bodyId = document.body.id;

  if (path.includes('index.html') || path === '/' || bodyId === 'homepage') {
    const { initHomepage } = await import('./pages/homepage.js');
    await initHomepage(); // Attendre que homepage ait fini d'ajouter les éléments
    initMainScrollObserver(); // Appeler l'observer APRÈS
  } else if (path.includes('galerie.html') || bodyId === 'galeriepage') {
    const { initGaleriePage } = await import('./pages/galerie.js');
    await initGaleriePage(); // Attendre que galerie ait fini
    initMainScrollObserver(); // Appeler l'observer APRÈS
  } else if (path.includes('series-detail.html') || bodyId === 'seriesdetailpage') {
    const { initSeriesDetailPage } = await import('./pages/series-detail.js');
    await initSeriesDetailPage(); // Attendre que series-detail ait fini
    initMainScrollObserver(); // Appeler l'observer APRÈS
  } else if (path.includes('presentation.html') || bodyId === 'presentationpage') {
    const { initPresentationPage } = await import('./pages/presentation.js');
    initPresentationPage(); // Pas de contenu dynamique majeur ici, mais on peut le mettre par cohérence
    initMainScrollObserver(); // Appeler l'observer APRÈS
  } else {
    console.log('Aucune logique JS spécifique pour cette page ou route non reconnue:', path);
    initMainScrollObserver(); // Appel générique si la page n'est pas reconnue mais contient des éléments à animer statiquement
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await initCommonComponents();
  await routeAndInitPage();
});