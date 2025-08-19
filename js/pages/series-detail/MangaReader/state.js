// js/pages/series-detail/MangaReader/state.js

// L'état global du lecteur, exporté pour être modifiable par les autres modules.
export let state = {
  seriesData: null,
  currentChapter: null,
  allChapterKeys: [],
  pages: [],
  spreads: [],
  pageToSpreadMap: [],
  currentSpreadIndex: 0,
  chapterStats: { likes: 0, comments: [] },
  settings: {
    // État des options principales (valeurs, pas indices)
    mode: 'double', // 'single', 'double', 'webtoon'
    fit: 'width',   // 'height', 'width', 'custom'

    // État des options secondaires
    doublePageOffset: true,
    direction: 'rtl', // 'ltr', 'rtl'
    stretch: false,
    limitWidth: true,
    limitHeight: false,

    // Valeurs des sliders
    customMaxWidth: 1200,
    customMaxHeight: 1080,

    // État de l'UI
    infoSidebarOpen: true, // Ouvert par défaut pour la démo
    settingsSidebarOpen: false
  },
};

// Les références aux éléments du DOM, centralisées ici.
export const dom = {};

// Les éléments <img> des pages, pour le préchargement et l'affichage.
export let domImages = [];

// Fonction pour mettre à jour la liste des images
export function setDomImages(images) {
  domImages = images;
}