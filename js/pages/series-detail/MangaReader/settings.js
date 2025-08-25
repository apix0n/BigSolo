// --- File: js/pages/series-detail/MangaReader/settings.js ---

import { state } from "./state.js";

// Configuration centralisée des options de paramètres.
export const settingsConfig = {
  mode: {
    options: [
      { value: "single", text: "Simple", icon: "fas fa-file" },
      { value: "double", text: "Double", icon: "fas fa-book-open" },
      { value: "webtoon", text: "Webtoon", icon: "fas fa-scroll" },
    ],
  },
  fit: {
    options: [
      { value: "height", text: "Hauteur", icon: "fas fa-arrows-alt-v" },
      { value: "width", text: "Largeur", icon: "fas fa-arrows-alt-h" },
      { value: "custom", text: "Personnalisé", icon: "fas fa-ruler-combined" },
    ],
  },
  direction: {
    options: [
      { value: "ltr", text: "Gauche à Droite" },
      { value: "rtl", text: "Droite à Gauche" },
    ],
  },
};

/**
 * Charge les paramètres de l'utilisateur depuis le localStorage.
 */
export function loadSettings() {
  const saved = localStorage.getItem("bigsolo_reader_settings_v6");
  if (saved) {
    try {
      Object.assign(state.settings, JSON.parse(saved));
      console.log("Paramètres du lecteur chargés :", state.settings);
    } catch (e) {
      console.error("Impossible de charger les paramètres du lecteur.", e);
    }
  }
}

/**
 * Sauvegarde les paramètres actuels de l'utilisateur dans le localStorage.
 */
export function saveSettings() {
  try {
    localStorage.setItem(
      "bigsolo_reader_settings_v6",
      JSON.stringify(state.settings)
    );
  } catch (e) {
    console.error("Erreur lors de la sauvegarde des paramètres:", e);
  }
}
