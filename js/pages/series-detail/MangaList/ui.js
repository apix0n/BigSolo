function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("fr-FR");
}

/**
 * Tronque dynamiquement le texte du titre pour éviter le chevauchement avec l'élément de droite.
 * Utilise ResizeObserver pour réagir aux changements de taille.
 */
function setupDynamicTitleTruncation(container) {
  if (!container) return;

  // Fonction de troncature intelligente
  function truncateTitle(titleElem, rightElem) {
    if (!titleElem || !rightElem) return;
    const parent = titleElem.parentElement;
    // Reset pour mesurer la largeur réelle du texte complet
    titleElem.textContent =
      titleElem.dataset.fullTitle || titleElem.textContent;
    titleElem.style.maxWidth = "none";

    // Largeur disponible = largeur du parent - largeur du rightElem - gap
    const parentRect = parent.getBoundingClientRect();
    const rightRect = rightElem.getBoundingClientRect();
    const gap = 8; // px, marge de sécurité

    // Largeur max autorisée pour le titre
    const available =
      parentRect.width -
      (rightRect.width + rightRect.offsetLeft - parentRect.left) -
      gap;

    // Si le texte tient, ne rien faire
    titleElem.style.maxWidth = available + "px";
    if (titleElem.scrollWidth <= available) return;

    // Sinon, troncature manuelle
    const fullText = titleElem.dataset.fullTitle || titleElem.textContent;
    let left = 0;
    let right = fullText.length;
    let truncated = fullText;

    // Binaire pour trouver la longueur max qui tient
    while (left < right) {
      const mid = Math.ceil((left + right) / 2);
      titleElem.textContent = fullText.slice(0, mid) + "…";
      if (titleElem.scrollWidth > available) {
        right = mid - 1;
      } else {
        left = mid;
      }
    }
    titleElem.textContent =
      fullText.slice(0, left) + (left < fullText.length ? "…" : "");
  }

  // Pour chaque carte, observer le parent du titre
  container.querySelectorAll(".chapter-card-list-bottom").forEach((bottom) => {
    const titleElem = bottom.querySelector(".chapter-card-list-title");
    const rightElem = bottom.querySelector(".chapter-card-list-right");
    if (!titleElem || !rightElem) return;
    // Stocke le texte complet pour la troncature
    titleElem.dataset.fullTitle = titleElem.textContent;

    // Observer parent ET rightElem
    const observer = new ResizeObserver(() =>
      truncateTitle(titleElem, rightElem)
    );
    observer.observe(bottom);
    observer.observe(rightElem);

    // Premier calcul
    truncateTitle(titleElem, rightElem);
  });
}

function setupChapterCardTooltip(container) {
  // Crée le tooltip s'il n'existe pas déjà
  let tooltip = document.querySelector(".chapter-card-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "chapter-card-tooltip";
    document.body.appendChild(tooltip);
  }
  let showTimer = null;
  let activeCard = null;
  let lastMouseEvent = null;

  function showTooltip(card, event) {
    const vol = card.dataset.volume;
    const date = card.dataset.date;
    let html = "";
    if (vol) html += `<div><strong>Volume :</strong> ${vol}</div>`;
    if (date) html += `<div><strong>Date :</strong> ${date}</div>`;
    tooltip.innerHTML = html || "<span style='opacity:0.7'>Aucune info</span>";
    tooltip.classList.add("visible");
    if (event) positionTooltip(event);
  }

  function hideTooltip() {
    tooltip.classList.remove("visible");
    tooltip.innerHTML = "";
    activeCard = null;
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  }

  function positionTooltip(e) {
    const tooltipRect = tooltip.getBoundingClientRect();
    let left = e.clientX + 16;
    let top = e.clientY + 4;
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + tooltipRect.height > window.innerHeight - 8) {
      top = window.innerHeight - tooltipRect.height - 8;
    }
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  container.querySelectorAll(".chapter-card-list-item").forEach((card) => {
    card.addEventListener("mouseenter", (e) => {
      lastMouseEvent = e;
      if (showTimer) clearTimeout(showTimer);
      showTimer = setTimeout(() => {
        activeCard = card;
        showTooltip(card, lastMouseEvent); // Utilise la position du curseur dès le départ
      }, 500);
    });
    card.addEventListener("mousemove", (e) => {
      lastMouseEvent = e;
      if (activeCard === card && tooltip.classList.contains("visible")) {
        positionTooltip(e);
      }
    });
    card.addEventListener("mouseleave", () => {
      hideTooltip();
    });
    card.addEventListener("mousedown", () => {
      hideTooltip();
    });
  });
}

// --- Ajout: gestion du clic sur une carte chapitre ---
function setupChapterCardNavigation(view) {
  view.querySelectorAll(".chapter-card-list-item").forEach((card) => {
    card.addEventListener("click", () => {
      const chapNum =
        card.dataset.volume ||
        card
          .querySelector(".chapter-card-list-number")
          ?.textContent?.replace(/^Chapitre\s+/, "") ||
        "";
      // On préfère l'id du chapitre si dispo
      const chapterId =
        card.dataset.volume ||
        card.dataset.chapterId ||
        card
          .querySelector(".chapter-card-list-number")
          ?.textContent?.replace(/^Chapitre\s+/, "") ||
        "";
      // Mais dans notre renderChaptersList, on peut utiliser chap.id
      // On va donc stocker l'id dans data-chapter-id lors du render
      const chapter = card.dataset.chapterId || "";
      // On prend le data-chapter-id si dispo, sinon on tente de parser le numéro affiché
      const chapterNum = card.dataset.chapterId || chapNum;
      if (!chapterNum) return;
      // Construit la nouvelle URL
      let baseUrl = window.location.pathname.replace(/\/$/, "");
      window.location.href = `${baseUrl}/${chapterNum}`;
    });
  });
}

let currentChapterSort = { type: "date", order: "desc" };
let currentChapterSearch = "";

function getSortedFilteredChapters(seriesData) {
  let chapters = Object.entries(seriesData.chapters || {}).map(
    ([id, data]) => ({ id, ...data })
  );

  // Filtrage par recherche
  if (currentChapterSearch.trim()) {
    const search = currentChapterSearch.trim().toLowerCase();
    chapters = chapters.filter(
      (chap) =>
        chap.id.toLowerCase().includes(search) ||
        (chap.title && chap.title.toLowerCase().includes(search))
    );
  }

  // Tri
  if (currentChapterSort.type === "date") {
    chapters.sort((a, b) => {
      const da = Number(a.last_updated) || 0;
      const db = Number(b.last_updated) || 0;
      return currentChapterSort.order === "desc" ? db - da : da - db;
    });
  } else if (currentChapterSort.type === "number") {
    chapters.sort((a, b) => {
      const na = parseFloat(a.id);
      const nb = parseFloat(b.id);
      return currentChapterSort.order === "desc" ? nb - na : na - nb;
    });
  }
  return chapters;
}

function updateSortButtonText(btn) {
  let txt = "";
  if (currentChapterSort.type === "date") {
    txt =
      currentChapterSort.order === "desc" ? "Date (récent)" : "Date (ancien)";
  } else {
    txt =
      currentChapterSort.order === "desc"
        ? "Chapitre (décroissant)"
        : "Chapitre (croissant)";
  }
  btn.innerHTML = `<i class="fas fa-sort"></i> ${txt}`;
}

// Helper pour compter les commentaires locaux (optimistes) qui ne sont pas déjà sur le serveur
function getLocalPendingCommentsCount(seriesSlug, chapterId, serverCommentIds) {
  const key = `interactions_${seriesSlug}_${chapterId}`;
  let localState = {};
  try {
    localState = JSON.parse(localStorage.getItem(key)) || {};
  } catch {}
  const pending = Array.isArray(localState.pendingComments)
    ? localState.pendingComments
    : [];
  // Ajout debug : log le contenu du localStorage pour ce chapitre
  if (!serverCommentIds) {
    return pending.length;
  }
  const filtered = pending.filter((c) => !serverCommentIds.has(c.id));
  console.log(
    `[DEBUG][getLocalPendingCommentsCount] filtered.length (non doublons):`,
    filtered.length,
    "filtered:",
    filtered
  );
  return filtered.length;
}

// Met à jour dynamiquement les compteurs de commentaires sur la page série (sans reload)
function updateAllChapterCommentCounts(seriesData) {
  const seriesSlug = getSeriesSlug(seriesData);
  document.querySelectorAll(".chapter-card-list-item").forEach((div) => {
    const chapterId = div.dataset.chapterId;
    let serverComments = 0;
    let serverCommentIds = null;
    // --- Correction : on prend les stats serveur si dispo ---
    let statsData =
      (window._lastSeriesStats && window._lastSeriesStats[chapterId]) ||
      (seriesData.chapters && seriesData.chapters[chapterId]) ||
      {};
    if (Array.isArray(statsData.comments)) {
      serverComments = statsData.comments.length;
      serverCommentIds = new Set(statsData.comments.map((c) => c.id));
    } else {
      serverComments =
        typeof statsData.comments === "number" ? statsData.comments : 0;
      serverCommentIds = null;
    }
    // --- Correction : on prend bien les pendingComments du localStorage ---
    const localPending = getLocalPendingCommentsCount(
      seriesSlug,
      chapterId,
      serverCommentIds
    );
    const displayComments = serverComments + localPending;
    const commentSpan = div.querySelector(".chapter-card-list-comments");
    if (commentSpan) {
      commentSpan.innerHTML = `<i class="fas fa-comment"></i> ${displayComments}`;
    }
  });
}

function renderChaptersList(view, seriesData) {
  console.log("[MangaList][renderChaptersList] called", { seriesData });
  const container = view.querySelector(".chapters-list-container");
  if (!container) {
    console.log(
      "[MangaList][renderChaptersList] Pas de container .chapters-list-container"
    );
    return;
  }
  container.innerHTML = "";

  const chapters = getSortedFilteredChapters(seriesData);
  console.log("[MangaList][renderChaptersList] chapters:", chapters);

  // --- Récupère les stats serveur si dispo ---
  const seriesSlug = getSeriesSlug(seriesData);
  const serverStats = window._lastSeriesStats || {};
  console.log(
    "[MangaList][renderChaptersList] serverStats (window._lastSeriesStats):",
    serverStats
  );

  chapters.forEach((chap) => {
    // --- NOUVEAU : chaque carte est un <a> natif ---
    const a = document.createElement("a");
    a.className = "chapter-card-list-item";
    a.href = `/${seriesSlug}/${chap.id}`;
    a.dataset.volume = chap.volume || "";
    a.dataset.date = chap.last_updated
      ? new Date(Number(chap.last_updated) * 1000).toLocaleDateString("fr-FR")
      : "";
    a.dataset.chapterId = chap.id;
    a.setAttribute("data-full-reload", "1"); // <--- AJOUT ICI

    // --- Correction: suppression de tout doublon d'ancienne clé ---
    const interactionKey = `interactions_${seriesSlug}_${chap.id}`;
    if (localStorage.getItem(`interactions__${chap.id}`)) {
      localStorage.removeItem(`interactions__${chap.id}`);
    }
    let localState = {};
    try {
      localState = JSON.parse(localStorage.getItem(interactionKey)) || {};
    } catch {}
    const isLiked = !!localState.liked;

    // --- Récupération des stats serveur pour ce chapitre ---
    const chapterKey = String(chap.id);
    let statsData =
      serverStats && serverStats[chapterKey] ? serverStats[chapterKey] : null;
    if (!statsData) {
      // fallback sur données locales (ancienne logique)
      statsData = chap;
    } else {
      console.log(
        `[MangaList][renderChaptersList] Chapitre ${chapterKey} : stats serveur trouvées`,
        statsData
      );
    }

    // Likes
    let serverLikes = typeof statsData.likes === "number" ? statsData.likes : 0;
    let displayLikes = serverLikes;
    if (isLiked) displayLikes += 1;

    // Commentaires
    let serverComments = 0;
    let serverCommentIds = null;
    if (Array.isArray(statsData.comments)) {
      serverComments = statsData.comments.length;
      serverCommentIds = new Set(statsData.comments.map((c) => c.id));
    } else {
      serverComments =
        typeof statsData.comments === "number" ? statsData.comments : 0;
      serverCommentIds = null;
    }
    const localPending = getLocalPendingCommentsCount(
      seriesSlug,
      chap.id,
      serverCommentIds
    );
    const displayComments = serverComments + localPending;

    // --- Correction : logs pour debug compteur commentaires ---

    // --- Construction du HTML ---
    a.innerHTML = `
      <div class="chapter-card-list-top">
        <div class="chapter-card-list-left">
          <span class="chapter-card-list-number">Chapitre ${chap.id}</span>
        </div>
      </div>
      <div class="chapter-card-list-bottom">
        <div class="chapter-card-list-left">
          <span class="chapter-card-list-title">${chap.title || ""}</span>
        </div>
      </div>
    `;

    // --- SUPPRESSION de tout ancien .chapter-card-list-right (sécurité) ---
    a.querySelectorAll(".chapter-card-list-right").forEach((el) => {
      console.log(
        `[MangaList][renderChaptersList] Chapitre ${chapterKey} : suppression d'un ancien .chapter-card-list-right`
      );
      el.remove();
    });

    // --- Génération dynamique du .chapter-card-list-right (TOP) ---
    const topRight = document.createElement("div");
    topRight.className = "chapter-card-list-right";
    topRight.innerHTML = `<span class="chapter-card-list-views"><i class="fas fa-eye"></i> ${
      chap.views || 0
    }</span>`;
    a.querySelector(".chapter-card-list-top").appendChild(topRight);

    // --- Génération dynamique du .chapter-card-list-right (BOTTOM) ---
    const bottomRight = document.createElement("div");
    bottomRight.className = "chapter-card-list-right";
    bottomRight.innerHTML = `
      <span class="chapter-card-list-likes${
        isLiked ? " liked" : ""
      }" data-chapter-id="${chap.id}" style="cursor:pointer;">
        <i class="fas fa-heart${isLiked ? " liked" : ""}"></i>
        <span class="likes-count${
          isLiked ? " liked" : ""
        }" data-base-likes="${serverLikes}">${displayLikes}</span>
      </span>
      <span class="chapter-card-list-comments"><i class="fas fa-comment"></i> ${displayComments}</span>
    `;
    a.querySelector(".chapter-card-list-bottom").appendChild(bottomRight);

    container.appendChild(a);
  });

  setupDynamicTitleTruncation(container);
  setupChapterCardTooltip(container);
  // --- SUPPRIMER ---
  // setupChapterCardNavigation(view);

  // updateAllChapterCommentCounts(seriesData); // plus nécessaire, tout est fait dynamiquement

  // --- Ajout: gestion du like sur la carte chapitre ---
  container.querySelectorAll(".chapter-card-list-likes").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault(); // <-- AJOUT ICI pour empêcher la navigation du lien parent
      const chapterId = btn.dataset.chapterId;
      let seriesSlug = "";
      if (
        seriesData &&
        typeof seriesData.slug === "string" &&
        seriesData.slug.length > 0
      ) {
        seriesSlug = seriesData.slug;
      } else if (window.currentSeriesSlug) {
        seriesSlug = window.currentSeriesSlug;
      } else if (
        document.body &&
        document.body.dataset &&
        document.body.dataset.seriesSlug
      ) {
        seriesSlug = document.body.dataset.seriesSlug;
      }
      if (!seriesSlug && seriesData && seriesData.title) {
        try {
          if (typeof window.slugify === "function") {
            seriesSlug = window.slugify(seriesData.title);
          } else {
            seriesSlug = seriesData.title
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^\w\-]/g, "");
          }
        } catch {}
      }
      const interactionKey = `interactions_${seriesSlug}_${chapterId}`;
      if (localStorage.getItem(`interactions__${chapterId}`)) {
        localStorage.removeItem(`interactions__${chapterId}`);
      }
      let localState = {};
      try {
        localState = JSON.parse(localStorage.getItem(interactionKey)) || {};
      } catch {}
      const isLiked = !!localState.liked;

      // 1. MAJ DOM optimiste immédiate
      btn.classList.toggle("liked", !isLiked);
      btn.querySelector(".fa-heart").classList.toggle("liked", !isLiked);
      btn.querySelector(".likes-count").classList.toggle("liked", !isLiked);
      // MAJ compteur optimiste
      const likesSpan = btn.querySelector(".likes-count");
      const baseLikes =
        parseInt(likesSpan.dataset.baseLikes || likesSpan.textContent, 10) || 0;
      likesSpan.textContent = !isLiked ? baseLikes + 1 : baseLikes - 1;

      // 2. Ajoute à la file d'attente
      import("../../../utils/interactions.js").then(({ queueAction }) => {
        queueAction(seriesSlug, {
          type: !isLiked ? "like" : "unlike",
          chapter: chapterId,
        });
      });

      // 3. MAJ localStorage en dernier
      localState.liked = !isLiked;
      localStorage.setItem(interactionKey, JSON.stringify(localState));

      // --- Correction : rafraîchir dynamiquement les compteurs de commentaires après interaction ---
      setTimeout(() => {
        updateAllChapterCommentCounts(seriesData);
      }, 0);
    });
  });

  // --- Ajout : synchronisation affichage likes au chargement (reload) ---
  container.querySelectorAll(".chapter-card-list-likes").forEach((btn) => {
    const chapterId = btn.dataset.chapterId;
    let seriesSlug = "";
    if (
      seriesData &&
      typeof seriesData.slug === "string" &&
      seriesData.slug.length > 0
    ) {
      seriesSlug = seriesData.slug;
    } else if (window.currentSeriesSlug) {
      seriesSlug = window.currentSeriesSlug;
    } else if (
      document.body &&
      document.body.dataset &&
      document.body.dataset.seriesSlug
    ) {
      seriesSlug = document.body.dataset.seriesSlug;
    }
    if (!seriesSlug && seriesData && seriesData.title) {
      try {
        if (typeof window.slugify === "function") {
          seriesSlug = window.slugify(seriesData.title);
        } else {
          seriesSlug = seriesData.title
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^\w\-]/g, "");
        }
      } catch {}
    }
    const interactionKey = `interactions_${seriesSlug}_${chapterId}`;
    let localState = {};
    try {
      localState = JSON.parse(localStorage.getItem(interactionKey)) || {};
    } catch {}
    const isLiked = !!localState.liked;
    btn.classList.toggle("liked", isLiked);
    btn.querySelector(".fa-heart").classList.toggle("liked", isLiked);
    btn.querySelector(".likes-count").classList.toggle("liked", isLiked);
    // Correction : utilise data-base-likes pour le compteur
    const likesSpan = btn.querySelector(".likes-count");
    const baseLikes = parseInt(likesSpan.dataset.baseLikes, 10) || 0;
    likesSpan.textContent = isLiked ? baseLikes + 1 : baseLikes;
  });

  // --- Correction : rafraîchir dynamiquement les compteurs de commentaires au premier rendu ---
  setTimeout(() => {
    updateAllChapterCommentCounts(seriesData);
  }, 0);
}

// Helper pour rafraîchir la liste des chapitres dynamiquement
function refreshChaptersListIfPresent() {
  // Cherche la section de liste sur la page
  const view = document;
  const seriesData = window.currentSeriesData || window.seriesData || null;
  if (!seriesData) return;
  renderChaptersList(view, seriesData);
  setTimeout(() => {
    updateAllChapterCommentCounts(seriesData);
  }, 0);
}
// Expose pour usage externe
window.refreshChaptersListIfPresent = refreshChaptersListIfPresent;

function setupChapterSearchAndSort(view, seriesData) {
  const searchInput = view.querySelector('.search-chapter input[type="text"]');
  const sortBtn = view.querySelector(".sort-chapter-btn");
  if (!searchInput || !sortBtn) return;

  // Init bouton texte
  updateSortButtonText(sortBtn);

  // Recherche en direct
  searchInput.addEventListener("input", (e) => {
    currentChapterSearch = e.target.value;
    renderChaptersList(view, seriesData);
  });

  // Tri cyclique
  sortBtn.addEventListener("click", () => {
    // Cycle: date desc → date asc → number desc → number asc → ...
    if (
      currentChapterSort.type === "date" &&
      currentChapterSort.order === "desc"
    ) {
      currentChapterSort = { type: "date", order: "asc" };
    } else if (
      currentChapterSort.type === "date" &&
      currentChapterSort.order === "asc"
    ) {
      currentChapterSort = { type: "number", order: "desc" };
    } else if (
      currentChapterSort.type === "number" &&
      currentChapterSort.order === "desc"
    ) {
      currentChapterSort = { type: "number", order: "asc" };
    } else {
      currentChapterSort = { type: "date", order: "desc" };
    }
    updateSortButtonText(sortBtn);
    renderChaptersList(view, seriesData);
  });
}

function renderMoreInfos(view, seriesData) {
  const btnRow = view.querySelector(".series-see-more-row");
  const btn = view.querySelector(".series-see-more-btn");
  const moreInfos = view.querySelector(".series-more-infos");
  if (!btn || !moreInfos || !btnRow) return;

  // Génère le HTML des infos supplémentaires
  const altTitles = (seriesData.alternative_titles || []).join(", ");
  moreInfos.innerHTML = `
    <div><strong>Type :</strong> ${seriesData.manga_type || "?"}</div>
    <div><strong>Magazine :</strong> ${seriesData.magazine || "?"}</div>
    <div><strong>Titres alternatifs :</strong> ${altTitles || "—"}</div>
  `;

  btn.addEventListener("click", () => {
    // Masque la ligne du bouton avec une animation
    btnRow.classList.add("hide");
    // Affiche la section d'infos supplémentaires
    moreInfos.style.display = "block";
  });
}

function renderMangaInfo(view, seriesData) {
  // --- LOG données serveur interactions ---
  let seriesSlug = seriesData && seriesData.slug;
  if (!seriesSlug && seriesData && seriesData.title) {
    seriesSlug = seriesData.title
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[\s\u3000]+/g, "_")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "_");
    console.log(
      "[MangaList][series-stats] Slug déduit depuis le titre :",
      seriesSlug
    );
  }

  // --- Ajout: on attend la réponse serveur avant d'afficher la liste ---
  let statsLoaded = false;
  let timeoutTriggered = false;

  function showChaptersListWithStats() {
    if (statsLoaded) {
      console.log(
        "[MangaList][series-stats][UI] Affichage de la liste avec les stats serveur."
      );
      renderChaptersList(view, seriesData);
    } else if (timeoutTriggered) {
      console.warn(
        "[MangaList][series-stats][UI] Timeout serveur stats, fallback sur local."
      );
      renderChaptersList(view, seriesData);
    }
  }

  if (seriesSlug) {
    console.log("[MangaList][series-stats] Début fetch pour slug:", seriesSlug);

    // Timeout fallback si le serveur met trop de temps (>2s)
    setTimeout(() => {
      if (!statsLoaded) {
        timeoutTriggered = true;
        showChaptersListWithStats();
      }
    }, 2000);

    fetch(`/api/series-stats?slug=${encodeURIComponent(seriesSlug)}`)
      .then(async (r) => {
        console.log(
          "[MangaList][series-stats] Réponse HTTP reçue, status:",
          r.status
        );
        const raw = await r.clone().text();
        console.log("[MangaList][series-stats] Raw body:", raw);
        let stats = {};
        try {
          stats = JSON.parse(raw);
          console.log("[MangaList][series-stats] JSON.parse réussi");
        } catch (e) {
          console.warn(
            "[MangaList][series-stats] Erreur de parsing JSON stats",
            e
          );
        }
        if (stats && Object.keys(stats).length > 0) {
          console.log(
            "[MangaList][series-stats] INTERACTIONS_CACHE complet pour",
            seriesSlug,
            stats
          );
        } else {
          console.log(
            "[MangaList][series-stats] INTERACTIONS_CACHE vide ou absent pour",
            seriesSlug,
            stats
          );
        }
        window._lastSeriesStats = stats;
        statsLoaded = true;
        showChaptersListWithStats();
      })
      .catch((e) => {
        console.warn(
          "[MangaList][series-stats] Erreur récupération stats serveur",
          e
        );
        statsLoaded = true; // On considère comme "chargé" même en cas d'erreur
        showChaptersListWithStats();
      });
  } else {
    console.warn(
      "[MangaList][series-stats] Pas de slug série pour fetch stats serveur",
      seriesData
    );
    renderChaptersList(view, seriesData);
  }

  // Bannière de fond
  const banner = view.querySelector("#hero-banner-section");
  if (banner) {
    // On n'utilise plus style.backgroundImage directement
    banner.style.setProperty("--hero-banner-bg", `url('${seriesData.cover}')`);
  }

  // Couverture
  const coverImg = view.querySelector(".detail-cover");
  if (coverImg) {
    coverImg.src = seriesData.cover || "";
    coverImg.alt = seriesData.title || "";
  }

  // Titres
  const jpTitleElem = view.querySelector(".detail-jp-title");
  if (jpTitleElem) jpTitleElem.textContent = seriesData.jp_title || "";
  const titleElem = view.querySelector(".detail-title");
  if (titleElem) titleElem.textContent = seriesData.title || "";

  // Tags
  const tagsDiv = view.querySelector(".detail-tags");
  if (tagsDiv) {
    tagsDiv.innerHTML = "";
    (seriesData.tags || []).forEach((tag) => {
      const span = document.createElement("span");
      span.className = "detail-tag";
      span.textContent = tag;
      tagsDiv.appendChild(span);
    });
  }

  // Statut et année
  const statusElem = view.querySelector(".status-indicator");
  if (statusElem) {
    // Ajout du dot et de la classe finished si besoin
    let statusText = seriesData.release_status || "?";
    let isFinished = statusText.toLowerCase().includes("fini");
    statusElem.innerHTML = `<span class="status-dot${
      isFinished ? " finished" : ""
    }"></span>${statusText}`;
    if (isFinished) statusElem.classList.add("finished");
    else statusElem.classList.remove("finished");
  }
  const yearElem = view.querySelector(".release-year");
  if (yearElem) yearElem.textContent = seriesData.release_year || "?";

  // Auteur / Dessinateur
  const metaElem = view.querySelector(".detail-meta.detail-creator-info");
  if (metaElem) {
    if (
      seriesData.author &&
      seriesData.artist &&
      seriesData.author === seriesData.artist
    ) {
      metaElem.innerHTML = `Auteur : ${seriesData.author}`;
    } else {
      metaElem.innerHTML = `Auteur : ${
        seriesData.author || "?"
      }<span class="creator-separator"></span>Dessinateur : ${
        seriesData.artist || "?"
      }`;
    }
  }

  // Description
  const descElem = view.querySelector(".detail-description");
  if (descElem) descElem.textContent = seriesData.description || "";

  renderMoreInfos(view, seriesData);

  // Actions (Continuer / Dernier)
  const actionsDiv = view.querySelector("#reading-actions-container");
  if (actionsDiv) {
    actionsDiv.innerHTML = "";
    const chapters = Object.entries(seriesData.chapters || {});
    if (chapters.length) {
      // Dernier chapitre
      const last = chapters.reduce((a, b) =>
        parseFloat(a[0]) > parseFloat(b[0]) ? a : b
      );
      const lastBtn = document.createElement("a");
      lastBtn.href = `/${seriesData.slug}/${last[0]}`;
      lastBtn.className = "detail-action-btn";
      lastBtn.textContent = "Dernier chapitre";
      actionsDiv.appendChild(lastBtn);
      // (Ajoute ici un bouton "Continuer" si tu as la logique de progression)
    }
  }

  // --- SUPPRESSION de l'appel direct à renderChaptersList ici ---
  // renderChaptersList(view, seriesData);

  // ...setup recherche et tri...
  // On setup la recherche/tri après le renderChaptersList (appelé dans showChaptersListWithStats)
  setupChapterSearchAndSort(view, seriesData);
}

// Suppression de l'export de populateChapterList
// export function populateChapterList(container, chaptersObj) { ... }

// Ajout de l'export explicite pour renderMangaInfo
export { renderMangaInfo };

if (!window._chapterListStorageListener) {
  window._chapterListStorageListener = true;
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.startsWith("interactions_")) {
      const seriesData = window.currentSeriesData || window.seriesData || null;
      if (seriesData) {
        console.log(
          "[MangaList][storage event] updateAllChapterCommentCounts triggered"
        );
        updateAllChapterCommentCounts(seriesData);
      }
    }
  });
}

function getSeriesSlug(seriesData) {
  // Prend le slug de la série, ou le déduit du titre si besoin
  if (
    seriesData &&
    typeof seriesData.slug === "string" &&
    seriesData.slug.length > 0
  ) {
    return seriesData.slug;
  }
  if (window.currentSeriesSlug) return window.currentSeriesSlug;
  if (
    document.body &&
    document.body.dataset &&
    document.body.dataset.seriesSlug
  ) {
    return document.body.dataset.seriesSlug;
  }
  if (seriesData && seriesData.title) {
    if (typeof window.slugify === "function") {
      return window.slugify(seriesData.title);
    }
    return seriesData.title
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w\-]/g, "");
  }
  return "";
}
