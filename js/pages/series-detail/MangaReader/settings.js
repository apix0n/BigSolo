// js/pages/series-detail/MangaReader/settings.js
import { qs, qsa } from "../../../utils/domUtils.js";
import { state } from "./state.js";
import { renderViewer } from "./ui.js";

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

export function loadSettings() {
  const saved = localStorage.getItem("bigsolo_reader_settings_v6"); // Version incrémentée pour éviter les conflits
  if (saved) {
    try {
      // Fusionne les paramètres sauvegardés avec ceux par défaut pour ne pas casser si de nouvelles options sont ajoutées
      Object.assign(state.settings, JSON.parse(saved));
      console.log("Paramètres du lecteur chargés :", state.settings);
    } catch (e) {
      console.error("Impossible de charger les paramètres du lecteur.", e);
    }
  }
}

export function saveSettings() {
  localStorage.setItem(
    "bigsolo_reader_settings_v6",
    JSON.stringify(state.settings)
  );
}

function updateMainButtonUI(btn) {
  const settingName = btn.dataset.setting;
  const config = settingsConfig[settingName];
  const currentValue = state.settings[settingName];

  // CORRECTION: Cherche l'option par sa `value` au lieu d'un index numérique.
  const currentOption = config.options.find(
    (opt) => opt.value === currentValue
  );

  if (currentOption) {
    btn.innerHTML = `<i class="icon ${currentOption.icon}"></i> <span class="text">${currentOption.text}</span>`;
  } else {
    console.warn(
      `Option invalide pour le paramètre "${settingName}": ${currentValue}`
    );
  }
}

function updateSecondaryPanelsVisibility() {
  const { mode, fit } = state.settings;

  // Les panneaux restent toujours visibles
  qs("#mode-options-panel").style.display = "flex";
  qs("#fit-options-panel").style.display = "flex";

  // Désactive individuellement les boutons selon le contexte
  const doublePageOffsetBtn = qs('[data-sub-setting="doublePageOffset"]');
  const directionBtn = qs('[data-sub-setting="direction"]');
  const stretchBtn = qs('[data-sub-setting="stretch"]');

  if (doublePageOffsetBtn) {
    doublePageOffsetBtn.classList.toggle("disabled", mode !== "double");
  }
  if (directionBtn) {
    directionBtn.classList.toggle("disabled", mode === "webtoon");
  }
  if (stretchBtn) {
    stretchBtn.classList.toggle("disabled", fit !== "custom");
  }

  // Désactive les sliders si le mode n'est pas 'custom'
  qsa(".slider-control").forEach((control) => {
    control.classList.toggle("disabled", fit !== "custom");
    if (fit !== "custom") {
      control.classList.remove("active");
    }
  });
}

function updateSecondaryTogglesUI() {
  qsa(".secondary-toggle-btn").forEach((btn) => {
    const subSetting = btn.dataset.subSetting;
    if (subSetting === "direction") {
      const dirValue = state.settings.direction;
      const dirOption = settingsConfig.direction.options.find(
        (opt) => opt.value === dirValue
      );
      btn.innerHTML = `<i class="check-icon fas fa-sync-alt"></i> <span class="text-content">${
        dirOption ? dirOption.text : ""
      }</span>`;
    } else {
      const isActive = state.settings[subSetting];
      btn.classList.toggle("active", isActive);
      btn.querySelector(".check-icon").className = `check-icon ${
        isActive ? "fas fa-check-square" : "far fa-square"
      }`;
    }
  });

  qsa(".slider-control").forEach((control) => {
    const settingName = control.dataset.subSetting;
    const isActive = state.settings[settingName];
    // Nouvelle logique : ne jamais activer si désactivé
    if (control.classList.contains("disabled")) {
      control.classList.remove("active");
    } else {
      control.classList.toggle("active", isActive);
    }
    const sliderInput = control.querySelector(".PB-range-slider");
    if (sliderInput) {
      sliderInput.disabled = !control.classList.contains("active");
    }
  });
}

function updateSliderValues() {
  qsa(".slider-control").forEach((control) => {
    const slider = control.querySelector('input[type="range"]');
    // Correction ici : cibler la bonne classe pour la valeur affichée
    const valueSpan = control.querySelector(".PB-range-slidervalue");
    const settingName = control.dataset.subSetting;

    const value =
      state.settings[settingName.replace("limit", "customMax")] || 1200;
    if (slider) slider.value = value;
    if (valueSpan) valueSpan.textContent = `${value}px`;
  });
}

export function updateAllSettingsUI() {
  console.log("Mise à jour de l'UI des paramètres...");
  qsa(".main-setting-btn").forEach(updateMainButtonUI);
  updateSecondaryPanelsVisibility();
  updateSecondaryTogglesUI();
  updateSliderValues();
  console.log("UI des paramètres mise à jour.");
}

export function setupSettingsEvents() {
  console.log("Configuration des événements de paramètres...");

  // --- Logique pour les boutons principaux (Mode, Ajustement) ---
  qsa(".main-setting-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const settingName = btn.dataset.setting;
      const config = settingsConfig[settingName];
      const currentValue = state.settings[settingName];
      const currentIndex = config.options.findIndex(
        (opt) => opt.value === currentValue
      );
      const nextIndex = (currentIndex + 1) % config.options.length;
      state.settings[settingName] = config.options[nextIndex].value;

      console.log(
        `Paramètre principal '${settingName}' changé en '${state.settings[settingName]}'`
      );

      if (settingName === "mode") {
        console.log("Changement de mode, recalcul des planches...");
        calculateSpreads();
      }

      renderViewer();
      saveSettings();
      updateAllSettingsUI();
    });
  });

  // --- Logique pour les boutons secondaires (Décalage, Direction, Étirer) ---
  qsa(".secondary-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const subSetting = btn.dataset.subSetting;
      if (subSetting === "direction") {
        state.settings.direction =
          state.settings.direction === "ltr" ? "rtl" : "ltr";
      } else {
        state.settings[subSetting] = !state.settings[subSetting];
      }
      console.log(
        `Paramètre secondaire '${subSetting}' changé en '${state.settings[subSetting]}'`
      );

      if (subSetting === "doublePageOffset") {
        calculateSpreads();
      }

      renderViewer();
      saveSettings();
      updateAllSettingsUI();
    });
  });

  // --- NOUVELLE LOGIQUE POUR LES SLIDERS INTERACTIFS ---
  qsa(".slider-control").forEach((control) => {
    const header = control.querySelector(".slider-header");
    const slider = control.querySelector(".PB-range-slider");
    const valueDisplay = control.querySelector(".PB-range-slidervalue");
    const settingName = control.dataset.subSetting; // 'limitWidth' ou 'limitHeight'
    const valueSettingName =
      settingName === "limitWidth" ? "customMaxWidth" : "customMaxHeight";

    // 1. Gérer le clic sur l'en-tête pour activer/désactiver
    if (header) {
      header.addEventListener("click", () => {
        // Inverse la valeur booléenne dans l'état global
        state.settings[settingName] = !state.settings[settingName];
        // Sauvegarde les paramètres
        saveSettings();
        // Met à jour toute l'interface des paramètres (ce qui ajoutera/retirera la classe .active)
        updateAllSettingsUI();
      });
    }

    // 2. Gérer la mise à jour de la valeur du slider
    if (slider && valueDisplay) {
      slider.addEventListener("input", () => {
        const newValue = slider.value;
        valueDisplay.textContent = `${newValue}px`;
        state.settings[valueSettingName] = newValue;
        renderViewer(); // Applique le changement visuel en direct
      });

      // Sauvegarde la valeur finale quand l'utilisateur relâche le slider
      slider.addEventListener("change", saveSettings);
    }
  });
  console.log("Événements de paramètres configurés.");
}
