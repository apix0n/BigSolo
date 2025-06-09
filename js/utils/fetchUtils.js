// js/utils/fetchUtils.js

let CONFIG_CACHE = null;

/**
 * Fonction de fetch générique avec gestion des erreurs et option de non-cache.
 * @param {string} url - L'URL à fetch.
 * @param {object} [options={}] - Options pour fetch (ex: { noCache: true }).
 * @returns {Promise<any>} Les données JSON parsées.
 */
export async function fetchData(url, options = {}) {
  const fetchOptions = { method: 'GET' };
  if (options.noCache) {
    fetchOptions.headers = new Headers();
    fetchOptions.headers.append('pragma', 'no-cache');
    fetchOptions.headers.append('cache-control', 'no-cache');
  }

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Could not fetch data from ${url}:`, error);
    throw error; // Relance l'erreur pour que l'appelant puisse la gérer
  }
}


/**
 * Charge la configuration globale du site (config.json ou config-dev.json).
 * Met en cache le résultat pour les appels suivants.
 * @returns {Promise<object>} La configuration.
 */
export async function loadGlobalConfig() {
  if (CONFIG_CACHE) {
    return CONFIG_CACHE;
  }

  try {
    let config;
    try {
      // Essayer de charger config-dev.json d'abord depuis le dossier data/
      config = await fetchData("./data/config.json"); // MODIFIÉ ICI
      console.log("Using data/config.json");
    } catch (devError) {
      try {
        config = await fetchData("./data/config.json"); // MODIFIÉ ICI
        console.log("Using data/config.json");
      } catch (prodError) {
         console.error("Failed to load data/config-dev.json and data/config.json. Using fallback.", devError, prodError);
         config = {
           ENV: "PROD_FALLBACK",
           URL_GIT_CUBARI: "https://api.github.com/repos/BigSolo/cubari/contents/", // Vérifie cette URL
           URL_RAW_JSON_GITHUB: "https://raw.githubusercontent.com/BigSolo/cubari/main/", // Vérifie cette URL
           // LOCAL_SERIES_FILES: [] // S'assurer que cette clé existe si LOCAL_DEV est une option
         };
      }
    }
    CONFIG_CACHE = config;
    return CONFIG_CACHE;
  } catch (error) {
    console.error("Fatal Error: Could not load any configuration.", error);
    CONFIG_CACHE = {
        ENV: "FALLBACK",
        URL_GIT_CUBARI: "https://api.github.com/repos/BigSolo/cubari/contents/", // Vérifie cette URL
        URL_RAW_JSON_GITHUB: "https://raw.githubusercontent.com/BigSolo/cubari/main/", // Vérifie cette URL
        // LOCAL_SERIES_FILES: []
    };
    return CONFIG_CACHE;
  }
}

/**
 * Récupère toutes les données des séries.
 * @returns {Promise<Array<object>>} Un tableau d'objets série.
 */
export async function fetchAllSeriesData() {
  const CONFIG = await loadGlobalConfig();
  let seriesPromises = [];

  if (CONFIG.ENV === "LOCAL_DEV" && CONFIG.LOCAL_SERIES_FILES) {
    if (!Array.isArray(CONFIG.LOCAL_SERIES_FILES)) {
      console.error("LOCAL_SERIES_FILES is missing or incorrect in config.");
      return [];
    }
    seriesPromises = CONFIG.LOCAL_SERIES_FILES.map(async (filename) => {
      const localPath = `./data/series/${filename}`; // Ajustez si 'cubari' est dans 'data'
      try {
        const serie = await fetchData(localPath);
        const base64Url = btoa(`${CONFIG.URL_RAW_JSON_GITHUB}${filename}`);
        return { ...serie, urlSerie: `https://cubari.moe/read/gist/${base64Url}`, base64Url };
      } catch (error) {
        console.error(`Error loading local series file ${localPath}:`, error);
        return null;
      }
    });
  } else { // PROD ou ENV non LOCAL_DEV
    try {
      const contents = await fetchData(CONFIG.URL_GIT_CUBARI);
      if (!Array.isArray(contents)) {
        console.warn("Invalid GitHub API response:", contents);
        return [];
      }
      seriesPromises = contents
        .filter(file => file.name && file.name.endsWith(".json"))
        .map(async (file) => {
          try {
            const serie = await fetchData(file.download_url);
            const base64Url = btoa(`${CONFIG.URL_RAW_JSON_GITHUB}${file.name}`);
            return { ...serie, urlSerie: `https://cubari.moe/read/gist/${base64Url}`, base64Url };
          } catch (error) {
            console.error(`Error loading series ${file.name} from ${file.download_url}:`, error);
            return null;
          }
        });
    } catch (error) {
      console.error("Error fetching GitHub file list:", error);
      return [];
    }
  }

  const allSeries = await Promise.all(seriesPromises);
  return allSeries.filter(s => s && typeof s === 'object' && s.title && s.chapters);
}