// js/utils/fetchUtils.js

let CONFIG_CACHE = null;

/**
 * Fonction de fetch générique avec gestion des erreurs.
 * @param {string} url - L'URL à fetch.
 * @param {object} [options={}] - Options pour fetch.
 * @returns {Promise<any>} Les données JSON parsées ou le texte brut en cas d'erreur de parsing JSON.
 */
export async function fetchData(url, options = {}) {
  const fetchOptions = { method: 'GET', ...options };
  // Pour le débogage, on peut ajouter no-cache ici si nécessaire
  // if (options.noCache) {
  //   fetchOptions.headers = new Headers(fetchOptions.headers);
  //   fetchOptions.headers.append('pragma', 'no-cache');
  //   fetchOptions.headers.append('cache-control', 'no-cache');
  // }

  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      // Tenter de lire le corps de la réponse en texte pour un meilleur diagnostic
      let errorBody = "No error body.";
      try {
        errorBody = await response.text();
      } catch (textError) {
        console.warn("Could not read error response body as text.", textError);
      }
      throw new Error(`HTTP error! status: ${response.status} for ${url}. Body: ${errorBody.substring(0, 200)}`);
    }

    // Tenter de parser en JSON, mais gérer si ce n'est pas du JSON valide
    const responseText = await response.text();
    try {
      return JSON.parse(responseText);
    } catch (jsonError) {
      console.warn(`Response from ${url} was not valid JSON. Content: "${responseText.substring(0, 100)}..."`, jsonError);
      // Retourner le texte brut si ce n'est pas du JSON, si l'appelant peut le gérer
      // Ou lancer une erreur plus spécifique si JSON est impératif
      throw new Error(`Failed to parse JSON from ${url}. Content: ${responseText.substring(0, 100)}`);
    }

  } catch (error) {
    console.error(`Could not fetch or process data from ${url}:`, error);
    throw error; // Relance l'erreur pour que l'appelant puisse la gérer
  }
}


/**
 * Charge la configuration globale du site (config.json).
 * Utilise des chemins absolus pour le chargement local.
 * Met en cache le résultat pour les appels suivants.
 * @returns {Promise<object>} La configuration.
 */
export async function loadGlobalConfig() {
  if (CONFIG_CACHE) {
    return CONFIG_CACHE;
  }

  // Toujours utiliser un chemin absolu pour charger le config.json local
  // car cette fonction peut être appelée depuis une page avec une URL "pretty"
  const localConfigPath = '/data/config.json'; // CHEMIN ABSOLU

  try {
    console.log(`Attempting to load global config from: ${localConfigPath}`);
    const config = await fetchData(localConfigPath); // fetchData utilise le chemin absolu
    CONFIG_CACHE = config;
    console.log("Successfully loaded global config:", CONFIG_CACHE);
    return CONFIG_CACHE;
  } catch (error) {
    console.error(`FATAL: Failed to load global configuration from ${localConfigPath}. Error:`, error);
    // Fournir un fallback minimal si le chargement échoue complètement
    // pour éviter des erreurs "undefined" plus loin, mais le site sera probablement non fonctionnel.
    CONFIG_CACHE = {
      ENV: "ERROR_FALLBACK",
      // Définissez des valeurs par défaut minimales si nécessaire, ou laissez vide
      // et assurez-vous que le code appelant gère une config potentiellement vide/incorrecte.
    };
    // Il est peut-être préférable de lancer une erreur ici pour arrêter l'exécution si la config est critique.
    throw new Error(`Critical: Could not load global configuration from ${localConfigPath}. Site may not function.`);
  }
}

/**
 * Récupère toutes les données des séries.
 * @returns {Promise<Array<object>>} Un tableau d'objets série.
 */
export async function fetchAllSeriesData() {
  let config;
  try {
    config = await loadGlobalConfig();
  } catch (e) {
    console.error("Cannot fetch series data without a valid global config.", e);
    return []; // Retourner un tableau vide si la config n'a pas pu être chargée
  }

  let seriesPromises = [];

  if (config.ENV === "LOCAL_DEV" && Array.isArray(config.LOCAL_SERIES_FILES)) {
    console.log("Loading series data from LOCAL_SERIES_FILES (LOCAL_DEV mode)");
    seriesPromises = config.LOCAL_SERIES_FILES.map(async (filename) => {
      // Construire un chemin absolu pour les fichiers de séries locaux
      const localSeriesPath = `/data/series/${filename}`; // CHEMIN ABSOLU
      try {
        const serie = await fetchData(localSeriesPath);
        // La base64Url pour Cubari doit pointer vers la source réelle (GitHub raw) même en dev local,
        // si c'est là que Cubari ira chercher le gist.
        // Ou si vous avez un Gist ID directement dans le JSON de la série, utilisez-le.
        const cubariBase = config.URL_RAW_JSON_GITHUB || "https://raw.githubusercontent.com/NE_PAS_UTILISER/NE_PAS_UTILISER/main/data/series/";
        // Si `serie.cubari_gist_id` est défini dans le JSON de la série, il faut l'utiliser.
        // Sinon, on construit une URL vers le fichier brut sur GitHub (ce que Cubari attend pour les Gists "non officiels")
        const rawGithubFileUrl = `${cubariBase}${filename}`; // Assurez-vous que cubariBase se termine bien par un / si nécessaire

        // Cubari pour les gists non-officiels prend souvent une URL directe vers le fichier JSON brut,
        // encodée en base64. Si `serie.cubari_gist_id` existe, c'est mieux.
        const base64Url = serie.cubari_gist_id ? serie.cubari_gist_id : btoa(rawGithubFileUrl);

        return {
          ...serie,
          // urlSerie: `https://cubari.moe/read/gist/${base64Url}`, // URL pour lire sur Cubari
          base64Url // L'ID que Cubari utilise (soit un vrai Gist ID, soit l'URL b64)
        };
      } catch (error) {
        console.error(`Error loading local series file ${localSeriesPath}:`, error);
        return null; // Permet aux autres de continuer
      }
    });
  } else { // Mode PROD ou ENV non LOCAL_DEV
    console.log("Loading series data from GitHub (PROD mode or ENV not LOCAL_DEV)");
    if (!config.URL_GIT_CUBARI || !config.URL_RAW_JSON_GITHUB) {
      console.error("URL_GIT_CUBARI or URL_RAW_JSON_GITHUB is not defined in config for PROD mode.");
      return [];
    }
    try {
      // URL pour lister le contenu du dossier sur GitHub
      const githubContentsUrl = config.URL_GIT_CUBARI; // Devrait déjà être l'URL complète de l'API contents
      console.log(`Fetching series list from GitHub API: ${githubContentsUrl}`);
      const contents = await fetchData(githubContentsUrl);

      if (!Array.isArray(contents)) {
        console.warn("GitHub API 'contents' response was not an array:", contents);
        return [];
      }

      seriesPromises = contents
        .filter(file => file.name && file.name.endsWith(".json") && file.type === 'file')
        .map(async (file) => {
          try {
            // file.download_url est l'URL directe vers le contenu brut du fichier JSON
            console.log(`Fetching series JSON from: ${file.download_url}`);
            const serie = await fetchData(file.download_url);

            // Comme en local, vérifier si `serie.cubari_gist_id` existe.
            // Sinon, l'URL pour Cubari est l'URL du fichier brut sur GitHub, encodée en base64.
            // config.URL_RAW_JSON_GITHUB devrait être la base pour ces fichiers, ex: "https://raw.githubusercontent.com/USER/REPO/BRANCH/path/to/series/"
            const rawGithubFileUrl = `${config.URL_RAW_JSON_GITHUB}${file.name}`;
            const base64Url = serie.cubari_gist_id ? serie.cubari_gist_id : btoa(rawGithubFileUrl);

            return {
              ...serie,
              // urlSerie: `https://cubari.moe/read/gist/${base64Url}`,
              base64Url
            };
          } catch (error) {
            console.error(`Error loading series ${file.name} from ${file.download_url}:`, error);
            return null;
          }
        });
    } catch (error) {
      console.error("Error fetching GitHub file list or processing series:", error);
      return []; // Retourner un tableau vide en cas d'erreur majeure
    }
  }

  try {
    const allSeriesResults = await Promise.all(seriesPromises);
    // Filtrer les nulls (fichiers qui ont échoué) et s'assurer que ce sont des objets valides
    const validSeries = allSeriesResults.filter(s => s && typeof s === 'object' && s.title && s.chapters);
    console.log(`Successfully processed ${validSeries.length} series.`);
    return validSeries;
  } catch (error) {
    console.error("Error resolving all series promises:", error);
    return [];
  }
}