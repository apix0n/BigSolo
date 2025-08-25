// --- File: js/pages/series-detail/MangaReader/components/settingsSidebar.js ---

import { qs, qsa } from "../../../../utils/domUtils.js";
import { state, dom } from "../state.js";
import { saveSettings, settingsConfig } from "../settings.js";
import { calculateSpreads } from "../data.js";
import { render as renderViewer } from "./viewer.js";

/**
 * Initialise le composant de la sidebar des paramètres.
 */
export function init() {
  console.log("[SettingsSidebar] Initialisation.");
  render();
  attachEventListeners();
  updateAllUI();
}

/**
 * Gère le rendu HTML de la sidebar des paramètres.
 */
function render() {
  if (!dom.settingsSidebar) return;

  dom.settingsSidebar.innerHTML = `
        <div class="sidebar-content-wrapper">
            <div id="settings-mode-group" class="control-group">
                <h4 class="group-title">Mode de lecture</h4>
                <button class="main-setting-btn" data-setting="mode"></button>
                <div class="options-panel" id="mode-options-panel">
                    <button class="secondary-toggle-btn" data-sub-setting="doublePageOffset"><i class="check-icon far fa-square"></i> Décalage double page</button>
                    <button class="secondary-toggle-btn" data-sub-setting="direction"></button>
                </div>
            </div>
            <div id="settings-fit-group" class="control-group">
                <h4 class="group-title">Ajustement</h4>
                <button class="main-setting-btn" data-setting="fit"></button>
                <div class="options-panel" id="fit-options-panel">
                    <button class="secondary-toggle-btn" data-sub-setting="stretch"><i class="check-icon far fa-square"></i> Étirer les petites pages</button>
                    <div class="slider-control" data-sub-setting="limitWidth">
                        <div class="slider-header">
                            <i class="check-icon far fa-square"></i>
                            <span class="slider-label">Limiter la largeur</span>
                        </div>
                        <div class="slider-body">
                            <div class="PB-range-slider-div">
                                <input type="range" min="400" max="3000" class="PB-range-slider" step="10" disabled>
                                <p class="PB-range-slidervalue">1200px</p>
                            </div>
                        </div>
                    </div>
                    <div class="slider-control" data-sub-setting="limitHeight">
                        <div class="slider-header">
                            <i class="check-icon far fa-square"></i>
                            <span class="slider-label">Limiter la hauteur</span>
                        </div>
                        <div class="slider-body">
                            <div class="PB-range-slider-div">
                                <input type="range" min="400" max="3000" class="PB-range-slider" step="10" disabled>
                                <p class="PB-range-slidervalue">1080px</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

/**
 * Attache tous les écouteurs d'événements pour les contrôles des paramètres.
 */
function attachEventListeners() {
  qsa(".main-setting-btn", dom.settingsSidebar).forEach((btn) => {
    btn.addEventListener("click", () => {
      const settingName = btn.dataset.setting;
      const config = settingsConfig[settingName];
      const currentValue = state.settings[settingName];
      const currentIndex = config.options.findIndex(
        (opt) => opt.value === currentValue
      );
      const nextIndex = (currentIndex + 1) % config.options.length;
      state.settings[settingName] = config.options[nextIndex].value;

      if (settingName === "mode") {
        calculateSpreads();
      }
      renderViewer();
      saveSettings();
      updateAllUI();
    });
  });

  qsa(".secondary-toggle-btn", dom.settingsSidebar).forEach((btn) => {
    btn.addEventListener("click", () => {
      const subSetting = btn.dataset.subSetting;
      if (subSetting === "direction") {
        state.settings.direction =
          state.settings.direction === "ltr" ? "rtl" : "ltr";
      } else {
        state.settings[subSetting] = !state.settings[subSetting];
      }

      if (subSetting === "doublePageOffset") {
        calculateSpreads();
      }
      renderViewer();
      saveSettings();
      updateAllUI();
    });
  });

  qsa(".slider-control", dom.settingsSidebar).forEach((control) => {
    const header = control.querySelector(".slider-header");
    const slider = control.querySelector(".PB-range-slider");
    const valueDisplay = control.querySelector(".PB-range-slidervalue");
    const settingName = control.dataset.subSetting;
    const valueSettingName =
      settingName === "limitWidth" ? "customMaxWidth" : "customMaxHeight";

    if (header) {
      header.addEventListener("click", () => {
        state.settings[settingName] = !state.settings[settingName];
        saveSettings();
        updateAllUI();
      });
    }

    if (slider && valueDisplay) {
      slider.addEventListener("input", () => {
        const newValue = slider.value;
        valueDisplay.textContent = `${newValue}px`;
        state.settings[valueSettingName] = parseInt(newValue, 10);
        renderViewer();
      });
      slider.addEventListener("change", saveSettings);
      slider.addEventListener("keydown", (e) => {
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        ) {
          e.stopPropagation(); // Empêche la navigation par flèches quand on utilise le slider
        }
      });
    }
  });
}

/**
 * Met à jour toute l'interface des paramètres pour refléter l'état actuel.
 */
function updateAllUI() {
  console.log("[SettingsSidebar] Mise à jour de l'UI des paramètres.");
  // Met à jour les boutons principaux (Mode, Ajustement)
  qsa(".main-setting-btn", dom.settingsSidebar).forEach((btn) => {
    const settingName = btn.dataset.setting;
    const config = settingsConfig[settingName];
    const currentOption = config.options.find(
      (opt) => opt.value === state.settings[settingName]
    );
    if (currentOption) {
      btn.innerHTML = `<i class="icon ${currentOption.icon}"></i> <span class="text">${currentOption.text}</span>`;
    }
  });

  // Met à jour les panneaux secondaires
  const { mode, fit } = state.settings;
  qs(
    '[data-sub-setting="doublePageOffset"]',
    dom.settingsSidebar
  ).classList.toggle("disabled", mode !== "double");
  qs('[data-sub-setting="direction"]', dom.settingsSidebar).classList.toggle(
    "disabled",
    mode === "webtoon"
  );
  qs('[data-sub-setting="stretch"]', dom.settingsSidebar).classList.toggle(
    "disabled",
    fit !== "custom"
  );
  qsa(".slider-control", dom.settingsSidebar).forEach((control) => {
    control.classList.toggle("disabled", fit !== "custom");
  });

  // Met à jour les toggles secondaires et sliders
  qsa(".secondary-toggle-btn", dom.settingsSidebar).forEach((btn) => {
    const subSetting = btn.dataset.subSetting;
    if (subSetting === "direction") {
      const dirOption = settingsConfig.direction.options.find(
        (opt) => opt.value === state.settings.direction
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

  qsa(".slider-control", dom.settingsSidebar).forEach((control) => {
    const settingName = control.dataset.subSetting;
    const isActive =
      state.settings[settingName] && !control.classList.contains("disabled");
    control.classList.toggle("active", isActive);

    const sliderInput = control.querySelector(".PB-range-slider");
    if (sliderInput) sliderInput.disabled = !isActive;

    const valueSettingName =
      settingName === "limitWidth" ? "customMaxWidth" : "customMaxHeight";
    const value =
      state.settings[valueSettingName] ||
      (valueSettingName === "customMaxWidth" ? 1200 : 1080);

    if (sliderInput) sliderInput.value = value;
    const valueSpan = control.querySelector(".PB-range-slidervalue");
    if (valueSpan) valueSpan.textContent = `${value}px`;
  });
}
