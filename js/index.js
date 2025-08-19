import { loadComponent, qs } from "./utils/domUtils.js";
import {
  initHeader,
  setupMobileMenuInteractions,
} from "./components/header.js";
import { initMainScrollObserver } from "./components/observer.js";

async function initCommonComponents() {
  const headerPlaceholder = qs("#main-header");
  const mobileMenuPlaceholder = qs("#main-mobile-menu-overlay");
  const loadPromises = [];

  if (headerPlaceholder) {
    loadPromises.push(
      loadComponent(headerPlaceholder, "/includes/header.html")
    );
  } else {
    console.warn("Placeholder #main-header not found. Cannot load header.");
  }

  if (mobileMenuPlaceholder) {
    loadPromises.push(
      loadComponent(mobileMenuPlaceholder, "/includes/mobile-menu.html")
    );
  } else {
    console.warn(
      "Placeholder #main-mobile-menu-overlay not found. Cannot load mobile menu."
    );
  }

  if (loadPromises.length > 0) {
    try {
      await Promise.all(loadPromises);
      console.log("Common components (header/menu) loaded.");
    } catch (error) {
      console.error("Error loading one or more common components:", error);
    }
  }

  if (headerPlaceholder && headerPlaceholder.innerHTML.trim() !== "") {
    try {
      initHeader();
    } catch (e) {
      console.error("Error initializing header:", e);
    }
  }

  if (mobileMenuPlaceholder && mobileMenuPlaceholder.innerHTML.trim() !== "") {
    if (typeof setupMobileMenuInteractions === "function") {
      try {
        setupMobileMenuInteractions();
      } catch (e) {
        console.error("Error setting up mobile menu interactions:", e);
      }
    } else {
      console.error(
        "setupMobileMenuInteractions is not available or was not loaded correctly."
      );
    }
  }
}

function getSeriesData() {
  const dataElement = document.getElementById("series-data-placeholder");
  if (
    dataElement &&
    dataElement.textContent.trim() !== "<!-- SERIES_DATA_PLACEHOLDER -->"
  ) {
    try {
      return JSON.parse(dataElement.textContent);
    } catch (e) {
      console.error("Erreur lors du parsing des données JSON de la série.", e);
      return null;
    }
  }
  return null;
}

function handleInternalNavigation(event, seriesData) {
  // --- AJOUT : ignore le clic sur un bouton like ---
  if (event.target.closest(".chapter-card-list-likes")) {
    return; // Ne pas intercepter, laisse le like JS agir
  }

  const link = event.target.closest("a");
  if (
    link &&
    link.href.startsWith(window.location.origin) &&
    !link.hasAttribute("target") &&
    !link.hasAttribute("download") &&
    !link.getAttribute("href").startsWith("mailto:") &&
    !link.getAttribute("href").startsWith("tel:")
  ) {
    // AJOUT : si le lien demande un reload complet, on laisse le navigateur faire
    if (link.hasAttribute("data-full-reload")) {
      return; // Ne rien faire, laisser le comportement natif
    }
    // Correction : n'intercepter que les liens internes à la série (ex: /slug/...)
    const url = new URL(link.href);
    const pathSegments = url.pathname.split("/").filter(Boolean);
    // Si la cible est une page globale (/, /galerie, /presentation, etc.), on laisse le navigateur faire un vrai reload
    if (
      pathSegments.length === 0 ||
      pathSegments[0] === "galerie" ||
      pathSegments[0] === "presentation"
    ) {
      // Laisse le comportement par défaut (reload)
      return;
    }
    // Sinon, navigation SPA interne à la série
    event.preventDefault();
    history.pushState({}, "", link.href);
    import("./pages/series-detail/router.js").then(({ handleRouteChange }) => {
      handleRouteChange(seriesData);
    });
  }
}

async function routeAndInitPage() {
  const path = window.location.pathname;
  const bodyId = document.body.id;
  console.log(`Routing for path: "${path}", bodyId: "${bodyId}"`);

  switch (bodyId) {
    case "homepage":
      console.log("Initializing homepage.");
      const { initHomepage } = await import("./pages/homepage.js");
      await initHomepage();
      initMainScrollObserver();
      break;

    case "galeriepage":
      console.log("Initializing galerie page.");
      const { initGaleriePage } = await import("./pages/galerie.js");
      await initGaleriePage();
      initMainScrollObserver();
      break;

    case "presentationpage":
      console.log("Initializing presentation page.");
      const { initPresentationPage } = await import("./pages/presentation.js");
      initPresentationPage();
      initMainScrollObserver();
      break;

    case "seriescoverspage":
      console.log("Initializing series covers page.");
      const { initSeriesCoversPage } = await import("./pages/series-covers.js");
      await initSeriesCoversPage();
      initMainScrollObserver();
      break;

    case "seriesdetailpage":
      console.log("Initializing series detail page (SPA routing).");
      const seriesData = getSeriesData();
      if (seriesData) {
        const { handleRouteChange } = await import(
          "./pages/series-detail/router.js"
        );
        handleRouteChange(seriesData);

        // Navigation interne (liens SPA)
        document.body.addEventListener("click", (e) =>
          handleInternalNavigation(e, seriesData)
        );
        // Navigation via boutons précédent/suivant du navigateur
        window.addEventListener("popstate", () =>
          handleRouteChange(seriesData)
        );
      } else {
        document.getElementById("series-detail-section").textContent =
          "Erreur: Impossible de charger les informations de la série.";
      }
      break;

    case "readerpage":
      console.log("Initializing Manga Reader page.");
      const { initMangaReader } = await import(
        "./pages/series-detail/MangaReader/reader.js"
      );
      await initMangaReader();
      break;

    case "dashboardpage":
      console.log("Initializing Admin Dashboard page.");
      const { initDashboardPage } = await import("./pages/dashboard.js");
      await initDashboardPage();
      break;

    default:
      console.log(
        "Aucune logique JS spécifique pour cet ID de body ou route non reconnue:",
        bodyId,
        path
      );
      initMainScrollObserver();
      break;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const bodyId = document.body.id;
  console.log("DOMContentLoaded event fired.");

  const isAdminPage =
    bodyId === "dashboardpage" ||
    window.location.pathname.startsWith("/admins");

  try {
    if (!isAdminPage) {
      await initCommonComponents();
    }
    await routeAndInitPage();
    console.log("Page initialization complete.");
  } catch (error) {
    console.error("Error during page initialization process:", error);
  }
});
