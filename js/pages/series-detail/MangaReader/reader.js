// js/pages/series-detail/MangaReader/reader.js
import { qs, slugify } from "../../../utils/domUtils.js";
import { state } from "./state.js";
import { setupUI, handleError, renderInteractionsSection } from "./ui.js";
import { fetchAndLoadPages } from "./data.js";
import { getInitialPageNumberFromUrl } from "./navigation.js";
import { loadSettings } from "./settings.js";
import { initializeEvents, attachInteractionListeners, updateLayout } from "./events.js";
import {
  fetchSeriesStats,
  getLocalInteractionState,
} from "../../../utils/interactions.js";

export async function initMangaReader() {
  const dataPlaceholder = qs("#reader-data-placeholder");
  if (
    !dataPlaceholder?.textContent ||
    dataPlaceholder.textContent.includes("READER_DATA_PLACEHOLDER")
  ) {
    return handleError(
      "Les données du lecteur n'ont pas été trouvées dans la page."
    );
  }

  try {
    // 1. Initialisation de l'état
    const readerData = JSON.parse(dataPlaceholder.textContent);
    state.seriesData = readerData.series;
    state.currentChapter = {
      ...readerData.series.chapters[readerData.chapterNumber],
      number: readerData.chapterNumber,
    };
    state.allChapterKeys = Object.keys(readerData.series.chapters)
      .filter((key) => readerData.series.chapters[key].groups?.Big_herooooo)
      .sort((a, b) => parseFloat(a) - parseFloat(b));

    document.title = `${state.seriesData.title} - Ch. ${state.currentChapter.number} | BigSolo`;

    // 2. Chargement des paramètres utilisateur
    loadSettings();

    // 3. Mise en place de l'interface (HTML/CSS)
    setupUI();

    // 4. Initialisation des événements
    initializeEvents();

    // 5. Mise à jour du layout pour les sidebars (important !)
    updateLayout();

    // 6. Chargement des stats et interactions
    const seriesSlug = slugify(state.seriesData.title);
    const chapterNumber = state.currentChapter.number;
    const interactionKey = `interactions_${seriesSlug}_${chapterNumber}`;

    const [stats, localState] = await Promise.all([
      fetchSeriesStats(seriesSlug),
      getLocalInteractionState(interactionKey),
    ]);

    const serverChapterStats = stats[chapterNumber] || { likes: 0, comments: [] };
    let optimisticStats = JSON.parse(JSON.stringify(serverChapterStats));

    if (localState.hasLiked) {
      optimisticStats.likes = (optimisticStats.likes || 0) + 1;
    }
    if (localState.pendingComments) {
      const serverCommentIds = new Set(optimisticStats.comments.map((c) => c.id));
      const newComments = localState.pendingComments.filter((pc) => !serverCommentIds.has(pc.id));
      optimisticStats.comments = [...newComments, ...optimisticStats.comments];
    }
    state.chapterStats = optimisticStats;

    renderInteractionsSection(localState);
    attachInteractionListeners();

    // 6. Chargement des images du manga
    const initialPageNumber = getInitialPageNumberFromUrl();
    await fetchAndLoadPages(initialPageNumber);

  } catch (error) {
    handleError(`Impossible de charger le lecteur : ${error.message}`);
    console.error(error);
  }
}
// Pas de modification nécessaire ici, le calcul combiné est fait dans l’UI (voir ui.js)
