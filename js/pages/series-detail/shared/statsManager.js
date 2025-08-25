// --- File: js/pages/series-detail/shared/statsManager.js ---

import { qsa } from "../../../utils/domUtils.js";

// Cache en mémoire pour éviter de refaire les appels API pendant la session
let seriesStatsCache = new Map();
let imgChestPostViewsCache = new Map();
let isLoadingImgChestViews = false;
let allImgChestViewsPreloadedAttempted = false;

/**
 * Récupère les statistiques d'interaction (likes, commentaires) pour une série donnée.
 * @param {string} seriesSlug - Le slug de la série.
 * @returns {Promise<object>} Un objet contenant les statistiques de la série.
 */
export async function fetchStats(seriesSlug) {
  console.log(
    `[StatsManager] Appel de fetchStats pour le slug : ${seriesSlug}`
  );
  if (seriesStatsCache.has(seriesSlug)) {
    console.log(`[StatsManager] Cache HIT pour les stats de ${seriesSlug}.`);
    return seriesStatsCache.get(seriesSlug);
  }

  console.log(
    `[StatsManager] Cache MISS. Fetching /api/series-stats pour ${seriesSlug}...`
  );
  try {
    const response = await fetch(
      `/api/series-stats?slug=${seriesSlug}&t=${Date.now()}`
    );
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    const data = await response.json();
    seriesStatsCache.set(seriesSlug, data);
    console.log(
      `[StatsManager] Stats pour ${seriesSlug} récupérées et mises en cache.`,
      data
    );
    return data;
  } catch (error) {
    console.error(
      `[StatsManager] Impossible de récupérer les stats pour ${seriesSlug}:`,
      error
    );
    return {}; // Retourne un objet vide en cas d'erreur pour ne pas bloquer le rendu.
  }
}

/**
 * Précharge en une seule fois toutes les données de vues depuis l'API proxyfiée d'ImgChest.
 */
export async function preloadAllImgChestViewsOnce() {
  if (allImgChestViewsPreloadedAttempted || isLoadingImgChestViews) {
    return;
  }
  isLoadingImgChestViews = true;
  console.log(
    "[StatsManager/ImgChest] Démarrage du préchargement des vues ImgChest..."
  );
  try {
    const response = await fetch("/api/imgchest-get-all-pages");
    if (!response.ok)
      throw new Error(`Proxy request failed: ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data.posts)) {
      data.posts.forEach((post) => {
        if (post.id && typeof post.views !== "undefined") {
          imgChestPostViewsCache.set(post.id, post.views);
        }
      });
      console.log(
        `[StatsManager/ImgChest] Cache rempli avec ${imgChestPostViewsCache.size} posts.`
      );
    }
    allImgChestViewsPreloadedAttempted = true;
    updateAllVisibleChapterViews(); // Mettre à jour les vues déjà affichées
  } catch (error) {
    console.error(
      "[StatsManager/ImgChest] Erreur lors du préchargement des vues:",
      error
    );
  } finally {
    isLoadingImgChestViews = false;
  }
}

/**
 * Met à jour le compteur de vues pour tous les chapitres visibles sur la page.
 */
export function updateAllVisibleChapterViews() {
  console.log(
    "[StatsManager/ImgChest] Mise à jour des compteurs de vues sur la page."
  );
  qsa(".detail-chapter-views[data-imgchest-id]").forEach((viewElement) => {
    const postId = viewElement.dataset.imgchestId;
    if (imgChestPostViewsCache.has(postId)) {
      const views = imgChestPostViewsCache.get(postId);
      viewElement.innerHTML = `<i class="fas fa-eye"></i> ${views.toLocaleString(
        "fr-FR"
      )}`;
    } else if (allImgChestViewsPreloadedAttempted && !isLoadingImgChestViews) {
      viewElement.innerHTML = `<i class="fas fa-eye-slash" title="Vues non disponibles"></i>`;
    }
  });
}
