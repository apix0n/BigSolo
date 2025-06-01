// index.js

// Fonction pour charger les composants HTML (header, menu mobile)
async function loadHTMLComponents() {
  const headerPlaceholder = document.getElementById('main-header');
  const mobileMenuPlaceholder = document.getElementById('main-mobile-menu-overlay');

  const loadComponent = async (placeholder, url) => {
    if (placeholder) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          placeholder.innerHTML = await response.text();
        } else {
          console.error(`Failed to load component ${url}:`, response.status);
          placeholder.innerHTML = `<p>Erreur de chargement: ${url}.</p>`;
        }
      } catch (error) {
        console.error(`Error loading component ${url}:`, error);
        placeholder.innerHTML = `<p>Erreur de chargement: ${url}.</p>`;
      }
    }
  };

  await Promise.all([
    loadComponent(headerPlaceholder, './includes/header.html'),
    loadComponent(mobileMenuPlaceholder, './includes/mobile-menu.html')
  ]);
}

let mainScrollObserver; // Déclarez-le globalement ou passez-le

// Fonction pour initialiser l'IntersectionObserver pour l'animation d'apparition générale
function initializeScrollObserver() {
  const elementsToObserve = document.querySelectorAll(".chapter-card, .series-card, .section-title, .colo-card, .presentation-content, .profile-pic, .gallery-controls, .series-detail-container");
  if (elementsToObserve.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = 1;
          entry.target.style.transform = "translateY(0)";
          // Si c'est une image de la galerie qu'on anime ici, on pourrait vouloir charger sa source ici aussi.
          // Mais on va séparer le lazy loading pour plus de clarté.
        }
      });
    },
    { threshold: 0.1 } // Apparaît quand 10% de l'élément est visible
  );
  elementsToObserve.forEach((el) => observer.observe(el));
}


// Fonction pour initialiser les interactions du header et du menu mobile
function initializeHeaderAndMenuInteractions() {
  // Partie Thème (peut s'exécuter immédiatement)
  const toggleBtn = document.getElementById("theme-toggle");
  const prefersDarkSys = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("mv-theme");

  if (savedTheme === "dark" || (!savedTheme && prefersDarkSys)) {
    document.body.classList.add("dark");
    if (!document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
  } else {
    document.body.classList.remove("dark");
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
    }
  }

  const updateIcon = () => {
    const currentToggleBtn = document.getElementById("theme-toggle");
    if (currentToggleBtn) {
      const icon = currentToggleBtn.querySelector("i");
      if (icon) {
        icon.className = document.body.classList.contains("dark") ? "fas fa-sun" : "fas fa-moon";
      }
    }
  };
  updateIcon();

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark");
      localStorage.setItem("mv-theme", isDark ? "dark" : "light");
      updateIcon();
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.backgroundColor = '#15171a';
        document.documentElement.style.color = '#eceff4';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.backgroundColor = '#f7f8fc';
        document.documentElement.style.color = '#222831';
      }
    });
  }

  // Partie Menu Mobile (s'exécute SEULEMENT APRÈS chargement des composants)
  // Nous allons appeler cette fonction setup DANS l'event listener DOMContentLoaded APRÈS loadHTMLComponents
  function setupMobileMenuInteractions() {
    const hamburgerBtn = document.querySelector(".hamburger-menu-btn");
    const mobileMenuOverlayContainer = document.getElementById("main-mobile-menu-overlay"); // Doit exister ici
    const closeMenuBtn = mobileMenuOverlayContainer ? mobileMenuOverlayContainer.querySelector(".close-mobile-menu-btn") : null; // Sécuriser la sélection

    function openMobileMenu() {
      if (mobileMenuOverlayContainer) mobileMenuOverlayContainer.classList.add("open");
      if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "true");
    }

    function closeMobileMenu() {
      if (mobileMenuOverlayContainer) mobileMenuOverlayContainer.classList.remove("open");
      if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
    }

    if (hamburgerBtn && mobileMenuOverlayContainer && closeMenuBtn) {
      hamburgerBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        mobileMenuOverlayContainer.classList.contains("open") ? closeMobileMenu() : openMobileMenu();
      });
      closeMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeMobileMenu();
      });
      mobileMenuOverlayContainer.addEventListener("click", (e) => {
        if (e.target === mobileMenuOverlayContainer) closeMobileMenu();
      });
      const mobileNavLinks = mobileMenuOverlayContainer.querySelectorAll(".mobile-menu-content a");
      mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
          const href = link.getAttribute('href');
          const isCurrentPageAnchor = href.startsWith('#');
          const isIndexPageAnchor = href.includes('index.html#');
          const isCurrentlyOnIndex = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('index.html');

          if (isCurrentPageAnchor || (isIndexPageAnchor && isCurrentlyOnIndex)) {
            setTimeout(() => { closeMobileMenu(); }, 150);
          } else {
            closeMobileMenu();
          }
        });
      });
    } else {
      if (!hamburgerBtn) console.warn("Bouton Hamburger non trouvé après chargement HTML.");
      if (!mobileMenuOverlayContainer) console.warn("Conteneur du menu mobile (main-mobile-menu-overlay) non trouvé après chargement HTML.");
      if (mobileMenuOverlayContainer && !closeMenuBtn) console.warn("Bouton de fermeture du menu mobile non trouvé après chargement HTML.");
    }
  }
  // Rendre setupMobileMenuInteractions accessible pour l'appel après loadHTMLComponents
  window.setupMobileMenuInteractions = setupMobileMenuInteractions;
}


// ─────────────────────────────────  APP LOGIC (Séries, Chapitres, etc.) ─────────────────────────────────────
let CONFIG;
const latestContainer = document.querySelector(".latest-chapters");
const seriesGridOngoing = document.querySelector(".series-grid.on-going");
const seriesGridOneShot = document.querySelector(".series-grid.one-shot");
const seriesDetailSection = document.getElementById("series-detail-section");
let volumeSortOrder = 'desc';

const appendSeriesCover = (url) => url ? `${url.slice(0, -4)}-s.jpg` : 'img/placeholder.jpg';
const appendChapterCover = (url) => url ? `${url.slice(0, -4)}-m.jpg` : 'img/placeholder.jpg';

function parseDateToTimestamp(dateInput) {
  if (!dateInput) return NaN;
  let timestamp;
  if (typeof dateInput === 'string') {
    const dateParts = dateInput.split(" ")[0].split("-");
    const timeParts = dateInput.split(" ")[1] ? dateInput.split(" ")[1].split(":") : ["00", "00", "00"];
    if (dateParts.length === 3) {
      timestamp = new Date(Date.UTC(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), parseInt(timeParts[0]), parseInt(timeParts[1]), parseInt(timeParts[2]))).getTime();
    } else {
      timestamp = NaN;
    }
  } else if (typeof dateInput === 'number') {
    timestamp = dateInput; // Supposé être déjà en millisecondes
  } else {
    timestamp = NaN;
  }
  return timestamp;
}

function timeAgo(dateInput) {
  const timestamp = parseDateToTimestamp(dateInput);
  if (isNaN(timestamp)) {
    // console.warn("Date invalide fournie à timeAgo:", dateInput);
    return "Date inconnue";
  }

  const diff = Date.now() - timestamp;
  const min = 60000, h = min * 60, d = h * 24, w = d * 7;
  if (diff < min) return "à l’instant";
  if (diff < h) return `${Math.floor(diff / min)} min`;
  if (diff < d) return `${Math.floor(diff / h)} h`;
  if (diff < w) return `${Math.floor(diff / d)} j`;
  return new Date(timestamp).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

const maybeNewBadge = (dateInput) => {
  const timestamp = parseDateToTimestamp(dateInput);
  if (isNaN(timestamp)) return "";
  return (Date.now() - timestamp < 3 * 24 * 60 * 60 * 1000) ? '<span class="new-badge">NOUVEAU</span>' : "";
}

function slugify(text) {
  if (!text) return "";
  return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/\s+/g, "_").replace(/[^\w-]+/g, "").replace(/--+/g, "_");
}

function renderChapter(c) {
  // Pour "Dernières sorties", c.last_updated_ts est le timestamp
  if (!c || !c.url || !c.serieCover || !c.serieTitle || !c.title || !c.chapter || !c.last_updated_ts) return '';
  return `<div class="chapter-card" onclick="window.open('${c.url}', '_blank')"><div class="chapter-cover"><img src="${appendChapterCover(c.serieCover)}" alt="${c.serieTitle} – Cover" loading="lazy">${maybeNewBadge(c.last_updated_ts)}</div><div class="chapter-info"><div class="manga-title">${c.serieTitle}</div><div class="chapter-title">${c.title}</div><div class="chapter-number">Chapitre ${c.chapter}</div><div class="chapter-time"><i class="fas fa-clock"></i> ${timeAgo(c.last_updated_ts)}</div></div></div>`;
}

function renderSeries(s) {
  if (!s || !s.chapters || !s.title || !s.cover) return '';
  const chaptersArray = Object.entries(s.chapters)
    .map(([chapNum, chapData]) => ({
      chapter: chapNum,
      ...chapData,
      last_updated_ts: (chapData.last_updated || 0) * 1000, // Assumant que last_updated est un timestamp Unix en secondes
      url: `https://cubari.moe/read/gist/${s.base64Url}/${chapNum.replaceAll(".", "-")}/1/`
    }))
    .sort((a, b) => b.last_updated_ts - a.last_updated_ts);

  let latestChapterAsButton = '', latestThreeChaptersHtml = '';
  if (chaptersArray.length > 0) {
    const latestChap = chaptersArray[0];
    latestChapterAsButton = `<div class="series-latest-chapters-container-mobile"><div class="series-chapter-item" onclick="event.stopPropagation(); window.open('${latestChap.url}', '_blank')"><div class="series-chapter-item-main-info-mobile"><span class="chapter-number-small">Ch. ${latestChap.chapter}</span><span class="chapter-title-small">${latestChap.title || 'Titre inconnu'}</span></div><span class="chapter-date-small-mobile">${timeAgo(latestChap.last_updated_ts)}</span></div></div>`;
    latestThreeChaptersHtml = `<div class="series-latest-chapters-container-desktop">${chaptersArray.slice(0, 3).map(chap => `<div class="series-chapter-item-desktop" onclick="event.stopPropagation(); window.open('${chap.url}', '_blank')"><span class="chapter-number-desktop">Ch. ${chap.chapter}</span><span class="chapter-title-desktop">${chap.title || 'Titre inconnu'}</span><span class="chapter-date-desktop">${timeAgo(chap.last_updated_ts)}</span></div>`).join('')}</div>`;
  }
  const descriptionHtml = s.description ? `<div class="series-description">${s.description}</div>` : '';
  let authorString = '';
  if (s.author && s.artist && s.author !== s.artist) authorString = `<strong>Auteur :</strong> ${s.author} / <strong>Dess. :</strong> ${s.artist}`;
  else if (s.author) authorString = `<strong>Auteur :</strong> ${s.author}`;
  else if (s.artist) authorString = `<strong>Dess. :</strong> ${s.artist}`;
  let yearString = s.release_year ? `<strong>Année :</strong> ${s.release_year}` : '';
  let authorYearLineHtml = (authorString || yearString) ? `<div class="meta series-author-year-line">${authorString ? `<span class="series-author-info">${authorString}</span>` : ''}${authorString && yearString ? `<span class="meta-separator-card"></span>` : ''}${yearString ? `<span class="series-year-info">${yearString}</span>` : ''}</div>` : '';
  let tagsHtml = (Array.isArray(s.tags) && s.tags.length > 0) ? `<div class="tags series-tags">${s.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join("")}</div>` : '';
  const detailPageUrl = `series-detail.html?id=${slugify(s.title)}`;
  return `<div class="series-card" onclick="window.location.href='${detailPageUrl}'"><div class="series-cover"><img src="${appendSeriesCover(s.cover)}" alt="${s.title} – Cover" loading="lazy"></div><div class="series-info"><div class="series-title">${s.title}</div>${authorYearLineHtml}${tagsHtml}${descriptionHtml}${latestChapterAsButton}${latestThreeChaptersHtml}</div></div>`;
}

function renderChaptersList(chaptersToRender) {
  return chaptersToRender.map(c => {
    const isLicensed = c.licencied && c.licencied.length > 0 && (!c.groups || c.groups.Big_herooooo === '');
    const chapterClass = isLicensed ? 'detail-chapter-item licensed-chapter-item' : 'detail-chapter-item';
    const clickAction = isLicensed || !c.url ? '' : `onclick="window.open('${c.url}', '_blank')"`;
    const collabHtml = c.collab ? `<span class="detail-chapter-collab">${c.collab}</span>` : '';
    return `<div class="${chapterClass}" ${clickAction}><div class="chapter-main-info"><span class="detail-chapter-number">Chapitre ${c.chapter}</span><span class="detail-chapter-title">${c.title || 'Titre inconnu'}</span></div><div class="chapter-side-info">${collabHtml}<span class="detail-chapter-date">${timeAgo(c.last_updated_ts)}</span></div></div>`;
  }).join('');
}

function displayGroupedChapters(allChaptersRaw) {
  const chaptersContainer = document.querySelector(".chapters-accordion-container");
  if (!chaptersContainer) return;
  let grouped = new Map(); let volumeLicenseInfo = new Map();
  allChaptersRaw.forEach(chap => {
    const volKey = chap.volume && chap.volume.trim() !== '' ? chap.volume.trim() : 'hors_serie';
    if (!grouped.has(volKey)) grouped.set(volKey, []);
    grouped.get(volKey).push(chap);
    if (chap.licencied && chap.licencied.length > 0 && (!chap.groups || chap.groups.Big_herooooo === '')) {
      if (!volumeLicenseInfo.has(volKey)) volumeLicenseInfo.set(volKey, chap.licencied);
    }
  });
  for (const [, chapters] of grouped.entries()) chapters.sort((a, b) => parseFloat(b.chapter) - parseFloat(a.chapter));
  let sortedVolumeKeys = [...grouped.keys()].sort((a, b) => {
    const numA = parseFloat(a), numB = parseFloat(b);
    if (volumeSortOrder === 'desc') { return a === 'hors_serie' ? -1 : b === 'hors_serie' ? 1 : numB - numA; }
    return a === 'hors_serie' ? 1 : b === 'hors_serie' ? -1 : numA - numB;
  });
  let html = '';
  sortedVolumeKeys.forEach(volKey => {
    const volumeDisplayName = volKey === 'hors_serie' ? 'Hors-série' : `Volume ${volKey}`;
    const chaptersInVolume = grouped.get(volKey);
    const licenseInfo = volumeLicenseInfo.get(volKey);
    let volumeHeaderContent = `<h4>${volumeDisplayName}</h4>`;
    if (licenseInfo) volumeHeaderContent = `<h4 class="volume-title-main">${volumeDisplayName}</h4><div class="volume-license-details"><span class="volume-license-text">Ce volume est disponible en format papier, vous pouvez le commander</span><a href="${licenseInfo[0]}" target="_blank" rel="noopener noreferrer" class="volume-license-link">juste ici !</a><span class="volume-release-date">${licenseInfo[1]}</span></div>`;
    html += `<div class="volume-group"><div class="volume-header active" data-volume="${volKey}">${volumeHeaderContent}<i class="fas fa-chevron-down volume-arrow rotated"></i></div><div class="volume-chapters-list">${renderChaptersList(chaptersInVolume)}</div></div>`;
  });
  chaptersContainer.innerHTML = html;
  document.querySelectorAll('.volume-group').forEach(group => {
    const header = group.querySelector('.volume-header');
    const content = group.querySelector('.volume-chapters-list');
    const arrow = header.querySelector('.volume-arrow');
    if (header.classList.contains('active') && content) content.style.maxHeight = content.scrollHeight + "px";
    header.addEventListener('click', () => {
      header.classList.toggle('active'); arrow.classList.toggle('rotated');
      if (content) content.style.maxHeight = (content.style.maxHeight && content.style.maxHeight !== "0px") ? "0px" : content.scrollHeight + "px";
    });
  });
}

function renderSeriesDetailPage(s) {
  if (!seriesDetailSection || !s || !s.chapters) { if (seriesDetailSection) seriesDetailSection.innerHTML = "<p>Données de série invalides.</p>"; return; }
  const allChaptersRaw = Object.entries(s.chapters).map(([chapNum, chapData]) => ({
    chapter: chapNum,
    ...chapData,
    last_updated_ts: (chapData.last_updated || 0) * 1000, // Assumant que last_updated est un timestamp Unix en secondes
    url: (chapData.groups && chapData.groups.Big_herooooo !== '') ? `https://cubari.moe/read/gist/${s.base64Url}/${chapNum.replaceAll(".", "-")}/1/` : null
  }));

  const titleHtml = `<h1 class="detail-title">${s.title}</h1>`;
  const tagsHtml = (Array.isArray(s.tags) && s.tags.length > 0) ? `<div class="detail-tags">${s.tags.map(t => `<span class="detail-tag">${t}</span>`).join("")}</div>` : "";
  let authorArtistHtml = '';
  const authorText = s.author ? `<strong>Auteur :</strong> ${s.author}` : '';
  const artistText = s.artist ? `<strong>Dessinateur :</strong> ${s.artist}` : '';
  if (s.author && s.artist) authorArtistHtml = `<p class="detail-meta">${authorText} <span class="detail-artist-spacing">${artistText}</span></p>`;
  else if (s.author) authorArtistHtml = `<p class="detail-meta">${authorText}</p>`;
  else if (s.artist) authorArtistHtml = `<p class="detail-meta">${artistText}</p>`;

  let yearStatusHtmlMobile = '', typeMagazineHtmlMobile = '', additionalMetadataForDesktop = [];
  if (s.release_year || s.release_status) {
    let yearPart = s.release_year ? `<strong>Année :</strong> ${s.release_year}` : '';
    let statusPart = s.release_status ? `<strong>Statut :</strong> ${s.release_status}` : '';
    yearStatusHtmlMobile = `<p class="detail-meta detail-meta-flex-line detail-year-status-mobile"><span class="detail-meta-flex-prefix">${yearPart || statusPart}</span>`;
    if (yearPart && statusPart) yearStatusHtmlMobile += `<span class="detail-meta-flex-suffix">${statusPart}</span>`;
    yearStatusHtmlMobile += `</p>`;
  }
  if (s.manga_type || s.magazine) {
    let typePart = s.manga_type ? `<strong>Type :</strong> ${s.manga_type}` : '';
    let magazinePart = s.magazine ? `<strong>Magazine :</strong> ${s.magazine}` : '';
    typeMagazineHtmlMobile = `<p class="detail-meta detail-meta-flex-line detail-type-magazine-mobile"><span class="detail-meta-flex-prefix">${typePart || magazinePart}</span>`;
    if (typePart && magazinePart) typeMagazineHtmlMobile += `<span class="detail-meta-flex-suffix">${magazinePart}</span>`;
    typeMagazineHtmlMobile += `</p>`;
  }

  if (s.release_year) additionalMetadataForDesktop.push(`<p><strong>Année :</strong> ${s.release_year}</p>`);
  if (s.release_status) additionalMetadataForDesktop.push(`<p><strong>Statut :</strong> ${s.release_status}</p>`);
  if (s.manga_type) additionalMetadataForDesktop.push(`<p><strong>Type :</strong> ${s.manga_type}</p>`);
  if (s.magazine) additionalMetadataForDesktop.push(`<p><strong>Magazine :</strong> ${s.magazine}</p>`);
  if (s.alternative_titles && s.alternative_titles.length > 0) additionalMetadataForDesktop.push(`<p><strong>Titre alternatif :</strong> ${s.alternative_titles.join(', ')}</p>`);
  const additionalMetadataCombinedHtmlForDesktop = additionalMetadataForDesktop.length > 0 ? `<div class="detail-additional-metadata">${additionalMetadataForDesktop.join('')}</div>` : "";
  const descriptionHtmlText = s.description || 'Pas de description disponible.';
  const chaptersSectionHtml = `<div class="chapters-main-header"><h3 class="section-title">Liste des Chapitres</h3><div class="chapter-sort-filter"><button id="sort-volumes-btn" class="sort-button" title="Trier les volumes"><i class="fas fa-sort-numeric-down-alt"></i></button></div></div><div class="chapters-accordion-container"></div>`;
  const isMobile = window.matchMedia("(max-width: 992px)").matches; // Ajusté le breakpoint pour la nouvelle lightbox
  let finalHtmlStructure;
  if (isMobile) {
    let alternativeTitlesMobileHtml = (s.alternative_titles && s.alternative_titles.length > 0) ? `<p class="detail-meta"><strong>Titre alternatif :</strong> ${s.alternative_titles.join(', ')}</p>` : '';
    finalHtmlStructure = `<div class="series-detail-container"><div class="detail-top-layout-wrapper"><div class="detail-cover-wrapper"><img src="${s.cover || 'img/placeholder.jpg'}" alt="${s.title} Cover" class="detail-cover" loading="lazy"></div><div class="detail-all-info-column"><div class="detail-primary-info-wrapper">${titleHtml}${tagsHtml}${authorArtistHtml}</div></div></div><div class="detail-secondary-info-wrapper">${yearStatusHtmlMobile}${typeMagazineHtmlMobile}${alternativeTitlesMobileHtml}</div><p class="detail-description">${descriptionHtmlText}</p>${chaptersSectionHtml}</div>`;
  } else {
    finalHtmlStructure = `<div class="series-detail-container"><div class="detail-top-layout-wrapper"><div class="detail-cover-wrapper"><img src="${s.cover || 'img/placeholder.jpg'}" alt="${s.title} Cover" class="detail-cover" loading="lazy"></div><div class="detail-all-info-column"><div class="detail-primary-info-wrapper">${titleHtml}${tagsHtml}${authorArtistHtml}</div><div class="detail-secondary-info-wrapper">${additionalMetadataCombinedHtmlForDesktop}</div></div></div><p class="detail-description">${descriptionHtmlText}</p>${chaptersSectionHtml}</div>`;
  }
  seriesDetailSection.innerHTML = finalHtmlStructure;
  document.title = `BigSolo – ${s.title}`;
  displayGroupedChapters(allChaptersRaw);
  const sortButton = document.getElementById('sort-volumes-btn');
  if (sortButton) {
    sortButton.addEventListener('click', () => {
      volumeSortOrder = (volumeSortOrder === 'desc') ? 'asc' : 'desc';
      const icon = sortButton.querySelector('i');
      if (icon) icon.className = (volumeSortOrder === 'desc') ? "fas fa-sort-numeric-down-alt" : "fas fa-sort-numeric-up-alt";
      displayGroupedChapters(allChaptersRaw);
    });
  }
}

async function fetchAllSeries() {
  try {
    // Tente de charger config-dev.json, sinon charge config.json
    let configResponse = await fetch("./config-dev.json");
    if (!configResponse.ok) {
      // console.log("config-dev.json non trouvé, chargement de config.json");
      configResponse = await fetch("./config.json");
    }
    if (!configResponse.ok) throw new Error(`Erreur chargement config: ${configResponse.status}`);
    CONFIG = await configResponse.json();

  } catch (e) {
    console.error("Erreur fatale: Impossible de charger config.json ou config-dev.json", e);
    // Fallback vers une config par défaut si tout échoue (pourrait être retiré si non désiré)
    CONFIG = { ENV: "PROD", URL_GIT_CUBARI: "https://api.github.com/repos/BigSolo/cubari/contents/", URL_RAW_JSON_GITHUB: "https://raw.githubusercontent.com/BigSolo/cubari/main/" };
  }

  let seriesPromises = [];
  if (CONFIG.ENV === "LOCAL_DEV" && CONFIG.LOCAL_SERIES_FILES) {
    if (!Array.isArray(CONFIG.LOCAL_SERIES_FILES)) {
      console.error("LOCAL_SERIES_FILES manquant/incorrect dans config.");
      return [];
    }
    seriesPromises = CONFIG.LOCAL_SERIES_FILES.map(async (filename) => {
      const localPath = `./cubari/${filename}`;
      try {
        const serieResponse = await fetch(localPath);
        if (!serieResponse.ok) throw new Error(`Fichier ${localPath} non trouvé (HTTP ${serieResponse.status})`);
        const serie = await serieResponse.json();
        const base64Url = btoa(`${CONFIG.URL_RAW_JSON_GITHUB}${filename}`); // Ce base64Url semble spécifique à Cubari
        return { ...serie, urlSerie: `https://cubari.moe/read/gist/${base64Url}`, base64Url };
      } catch (error) { console.error(`Erreur chargement local ${localPath}:`, error); return null; }
    });
  } else { // PROD ou ENV non LOCAL_DEV
    try {
      const contentsResponse = await fetch(CONFIG.URL_GIT_CUBARI);
      if (!contentsResponse.ok) throw new Error(`API GitHub ${contentsResponse.status}`);
      const contents = await contentsResponse.json();

      if (!Array.isArray(contents)) { console.warn("Réponse API GitHub invalide:", contents); return []; }

      seriesPromises = contents
        .filter(file => file.name && file.name.endsWith(".json"))
        .map(async (file) => {
          try {
            const serieResponse = await fetch(file.download_url);
            if (!serieResponse.ok) throw new Error(`Fetch ${file.download_url} (HTTP ${serieResponse.status})`);
            const serie = await serieResponse.json();
            const base64Url = btoa(`${CONFIG.URL_RAW_JSON_GITHUB}${file.name}`);
            return { ...serie, urlSerie: `https://cubari.moe/read/gist/${base64Url}`, base64Url };
          } catch (error) { console.error(`Erreur chargement ${file.name} de ${file.download_url}:`, error); return null; }
        });
    } catch (error) { console.error("Erreur fetch de la liste des fichiers GitHub:", error); return []; }
  }
  const allSeries = await Promise.all(seriesPromises);
  return allSeries.filter(s => s && typeof s === 'object' && s.title && s.chapters);
}

// ───────────────────────────────── GALERIE LOGIC ─────────────────────────────────────
const galleryGridContainer = document.getElementById('gallery-grid-container');
const sortOrderSelect = document.getElementById('sort-order');
const filterArtistSelect = document.getElementById('filter-artist');
const lightboxModal = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCloseBtn = document.querySelector('.lightbox-close');

// Note: Les conteneurs lightbox-info-panel-desktop/mobile sont sélectionnés dans displayLightboxInfo

let allColosData = [];
let authorsInfoData = {};
let galleryImageObserver; // Pour le lazy loading des images de la galerie

function formatDateForGallery(dateString) {
  if (!dateString) return "Date inconnue";
  const timestamp = parseDateToTimestamp(dateString);
  if (isNaN(timestamp)) {
    // console.warn("Date invalide fournie à formatDateForGallery:", dateString);
    return "Date invalide";
  }
  return new Date(timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

function renderColoCard(colo, author) {
  const authorName = author && author.username ? author.username : 'Artiste inconnu';
  const coloIdentifier = colo.url || colo.url_preview; // Si url_preview n'existe pas, data-colo-id utilisera url
  return `<div class="colo-card" data-colo-id="${colo.url}"> 
          <img class="lazy-load-gallery" 
               src="img/placeholder_preview.png"  // <<< ICI
               alt="Colorisation Chap. ${colo.chapitre} par ${authorName}" 
               data-src="${colo.url_preview}"> 
          <div class="colo-card-overlay">
            <p>Chap. ${colo.chapitre} - Page ${colo.page}</p>
            <p>Par ${authorName}</p>
          </div>
        </div>`;
}

function initializeLazyLoadObserver() {
  if (galleryImageObserver) galleryImageObserver.disconnect(); // Nettoyer l'ancien observer

  const lazyImages = document.querySelectorAll('img.lazy-load-gallery');
  if (!lazyImages.length) return;

  const lazyLoadOptions = {
    rootMargin: '0px 0px 200px 0px',
    threshold: 0.01
  };

  galleryImageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.dataset.src;
        if (!src) return;

        img.onload = () => { // Optionnel: ajouter une classe une fois l'image réellement chargée
          img.classList.add('image-loaded-fade-in');
        }
        img.src = src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  }, lazyLoadOptions);

  lazyImages.forEach(img => {
    galleryImageObserver.observe(img);
  });
}

function displayLightboxInfo(colo, author) {
  // Cibles pour DESKTOP (nouveaux blocs)
  const desktopArtistBlock = document.querySelector('.lightbox-info-panel-desktop .lightbox-artist-info-block');
  const desktopColoBlock = document.querySelector('.lightbox-info-panel-desktop .lightbox-colo-info-block');

  // Cibles pour MOBILE (structure existante dans le panneau mobile)
  const mobileArtistInfoContainer = document.querySelector('.lightbox-info-panel-mobile .lightbox-artist-info');
  const mobileColoInfoContainer = document.querySelector('.lightbox-info-panel-mobile .lightbox-colo-info');

  const getSocialsHTML = (links, type) => {
    let html = '';
    const classPrefix = type === 'artist' ? 'lightbox-artist-socials' : 'lightbox-colo-socials';
    if (!links || Object.values(links).every(val => val === null || (typeof val === 'string' && val.trim() === ""))) return '';

    html += `<div class="${classPrefix}">`;
    if (links.twitter && links.twitter.trim() !== "") html += `<a href="${links.twitter.trim()}" target="_blank" rel="noopener noreferrer"><i class="fab fa-twitter"></i> Twitter</a>`;
    if (links.instagram && links.instagram.trim() !== "") html += `<a href="${links.instagram.trim()}" target="_blank" rel="noopener noreferrer"><i class="fab fa-instagram"></i> Instagram</a>`;
    if (links.tiktok && links.tiktok.trim() !== "") html += `<a href="${links.tiktok.trim()}" target="_blank" rel="noopener noreferrer"><i class="fab fa-tiktok"></i> TikTok</a>`;
    html += '</div>';
    return html;
  };

  let artistHtmlContent = '';
  if (author && colo) {
    const currentAuthorId = colo.author_id;
    const occurrenceCount = allColosData.filter(c => c.author_id === currentAuthorId).length;

    artistHtmlContent = `
      <div class="artist-header">
        <img src="${author.profile_img || 'img/placeholder_pfp.png'}" alt="Photo de profil de ${author.username}" class="lightbox-artist-pfp" loading="lazy">
        <div class="artist-text-details">
          <h3 class="lightbox-artist-name" data-author-id="${currentAuthorId}">${author.username}</h3>
          <span class="artist-occurrence-count">(${occurrenceCount} colo${occurrenceCount > 1 ? 's' : ''})</span>
        </div>
      </div>
      ${getSocialsHTML({ twitter: author.twitter, instagram: author.instagram, tiktok: author.tiktok }, 'artist')}
    `;
  } else {
    artistHtmlContent = '<p class="lightbox-info-placeholder">Infos artiste non disponibles.</p>';
  }

  let coloHtmlContent = '';
  if (colo) {
    coloHtmlContent = `
      <p><strong>Chapitre :</strong> ${colo.chapitre || 'N/A'}, Page ${colo.page || 'N/A'}</p>
      <p><strong>Date :</strong> ${formatDateForGallery(colo.date)}</p>
      ${getSocialsHTML({ twitter: colo.twitter, instagram: colo.instagram, tiktok: colo.tiktok }, 'colo')}
    `;
  } else {
    coloHtmlContent = '<p class="lightbox-info-placeholder">Infos colorisation non disponibles.</p>';
  }

  // Injecter dans les conteneurs Desktop
  if (desktopArtistBlock) desktopArtistBlock.innerHTML = artistHtmlContent;
  if (desktopColoBlock) desktopColoBlock.innerHTML = coloHtmlContent;

  // Injecter dans les conteneurs Mobile
  if (mobileArtistInfoContainer) mobileArtistInfoContainer.innerHTML = artistHtmlContent;
  if (mobileColoInfoContainer) mobileColoInfoContainer.innerHTML = coloHtmlContent;

  // Add event listener to the newly injected artist names
  const artistNameElements = document.querySelectorAll('.lightbox-artist-name[data-author-id]');
  artistNameElements.forEach(nameElement => {
    nameElement.style.cursor = 'pointer'; // Indicate it's clickable

    nameElement.addEventListener('mouseenter', () => { nameElement.style.textDecoration = 'underline'; });
    nameElement.addEventListener('mouseleave', () => { nameElement.style.textDecoration = 'none'; });

    nameElement.addEventListener('click', function () {
      const authorIdToFilter = this.dataset.authorId;
      if (filterArtistSelect && authorIdToFilter) {
        const optionExists = Array.from(filterArtistSelect.options).some(opt => opt.value === authorIdToFilter);
        if (optionExists) {
          filterArtistSelect.value = authorIdToFilter;
          displayColos(); // Re-render gallery

          // Close lightbox
          if (lightboxModal) lightboxModal.style.display = 'none';
          document.body.style.overflow = 'auto';
          if (lightboxImg) lightboxImg.src = "";
        } else {
          console.warn(`Author ID "${authorIdToFilter}" not found in filter options.`);
        }
      }
    });
  });
}


function displayColos() {
  if (!galleryGridContainer) return;

  if (!allColosData.length || typeof authorsInfoData !== 'object' || authorsInfoData === null || Object.keys(authorsInfoData).length === 0) {
    console.warn("displayColos: Données de colos ou d'auteurs manquantes ou vides.");
    if (galleryGridContainer) galleryGridContainer.innerHTML = "<p>Les données n'ont pas pu être chargées correctement.</p>";
    return;
  }

  let colosToDisplay = [...allColosData];
  const selectedArtistId = filterArtistSelect ? filterArtistSelect.value : 'all';
  const sortBy = sortOrderSelect ? sortOrderSelect.value : 'date_desc';

  if (selectedArtistId !== 'all') {
    colosToDisplay = colosToDisplay.filter(c => c.author_id && c.author_id === selectedArtistId);
  }

  switch (sortBy) {
    case 'date_asc': colosToDisplay.sort((a, b) => parseDateToTimestamp(a.date) - parseDateToTimestamp(b.date)); break;
    case 'chapitre_asc': colosToDisplay.sort((a, b) => parseFloat(a.chapitre || 0) - parseFloat(b.chapitre || 0)); break;
    case 'chapitre_desc': colosToDisplay.sort((a, b) => parseFloat(b.chapitre || 0) - parseFloat(a.chapitre || 0)); break;
    default: // date_desc
      colosToDisplay.sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date)); break;
  }

  galleryGridContainer.innerHTML = colosToDisplay.map(colo => {
    const author = (typeof authorsInfoData === 'object' && authorsInfoData !== null && colo.author_id != null)
      ? authorsInfoData[colo.author_id]
      : null;
    return renderColoCard(colo, author);
  }).join('');

  document.querySelectorAll('.colo-card').forEach(card => {
    card.addEventListener('click', () => {
      const coloUrlFromDataset = card.dataset.coloId; // C'est l'URL complète de l'image principale
      const selectedColo = allColosData.find(c => c.url === coloUrlFromDataset);

      if (selectedColo && lightboxModal && lightboxImg) {
        lightboxImg.src = selectedColo.url; // Image principale pour la lightbox
        const author = selectedColo.author_id ? authorsInfoData[selectedColo.author_id] : null;

        displayLightboxInfo(selectedColo, author);

        lightboxModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      } else {
        console.warn("Problème avec selectedColo pour lightbox, ou éléments de la lightbox. URL cherchée:", coloUrlFromDataset);
      }
    });
  });
  initializeLazyLoadObserver();
}

async function initializeGallery() {
  if (!galleryGridContainer) return;
  try {
    const noCacheHeaders = new Headers();
    noCacheHeaders.append('pragma', 'no-cache');
    noCacheHeaders.append('cache-control', 'no-cache');

    const colosFileName = 'colos.json'; // Assurez-vous que c'est le bon nom

    const fetchNoCache = (url) => fetch(url, { method: 'GET', headers: noCacheHeaders });

    const [colosResponse, authorsResponse] = await Promise.all([
      fetchNoCache(`./${colosFileName}`),
      fetchNoCache('./author_info.json')
    ]);

    if (!colosResponse.ok) throw new Error(`Erreur chargement ${colosFileName}: ${colosResponse.statusText} (status ${colosResponse.status})`);
    const rawColosData = await colosResponse.json();
    allColosData = JSON.parse(JSON.stringify(rawColosData));
    console.log(`[INIT GALLERY] ${allColosData.length} colos chargées depuis ${colosFileName}.`);

    const firstColo = allColosData.length > 0 ? allColosData[0] : null;
    if (firstColo) {
      console.log("[INIT GALLERY] Première colo chargée:", firstColo);
      console.log("[INIT GALLERY] Type de author_id pour la première colo:", typeof firstColo.author_id, "Valeur:", firstColo.author_id);
    }

    if (!authorsResponse.ok) throw new Error(`Erreur chargement author_info.json: ${authorsResponse.statusText} (status ${authorsResponse.status})`);
    const rawAuthorsData = await authorsResponse.json();
    authorsInfoData = JSON.parse(JSON.stringify(rawAuthorsData));
    console.log(`[INIT GALLERY] ${Object.keys(authorsInfoData).length} auteurs chargés.`);


    if (filterArtistSelect) {
      filterArtistSelect.innerHTML = '<option value="all">Tous les artistes</option>';
      if (typeof authorsInfoData === 'object' && authorsInfoData !== null) {
        // Trier les artistes par nom pour le dropdown
        const sortedAuthors = Object.entries(authorsInfoData).sort(([, a], [, b]) => {
          return (a.username || "").localeCompare(b.username || "");
        });
        sortedAuthors.forEach(([id, author]) => {
          if (author && author.username) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = author.username;
            filterArtistSelect.appendChild(option);
          }
        });
      } else {
        console.error("[INIT GALLERY] authorsInfoData n'est pas un objet valide pour peupler le filtre artiste.");
      }
    }

    // Écouteurs pour le tri et le filtre
    if (sortOrderSelect) {
      sortOrderSelect.addEventListener('change', displayColos);
    }
    if (filterArtistSelect) {
      filterArtistSelect.addEventListener('change', displayColos);
    }

    displayColos(); // Affichage initial

  } catch (error) {
    console.error("Erreur initialisation galerie:", error);
    if (galleryGridContainer) galleryGridContainer.innerHTML = `<p>Erreur chargement de la galerie. ${error.message}. Vérifiez la console.</p>`;
  }
}

if (lightboxModal && lightboxCloseBtn) {
  lightboxCloseBtn.addEventListener('click', () => {
    lightboxModal.style.display = 'none'; document.body.style.overflow = 'auto';
    if (lightboxImg) lightboxImg.src = ""; // Vider l'image pour libérer la mémoire
  });
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) { // Fermer si on clique sur le fond
      lightboxModal.style.display = 'none'; document.body.style.overflow = 'auto';
      if (lightboxImg) lightboxImg.src = "";
    }
  });
}

// ───────────────────────────────── BOOTSTRAP PRINCIPAL ─────────────────────────────────────
async function bootstrapAppLogic() {
  try {
    const allSeries = await fetchAllSeries();
    const urlParams = new URLSearchParams(window.location.search);
    const seriesId = urlParams.get('id');

    if (seriesId && seriesDetailSection) {
      const seriesData = allSeries.find(s => slugify(s.title) === seriesId);
      seriesData ? renderSeriesDetailPage(seriesData) : (seriesDetailSection.innerHTML = "<p>Série non trouvée.</p>");
    } else if (galleryGridContainer) { // Page galerie
      await initializeGallery();
    } else if (latestContainer || seriesGridOngoing || seriesGridOneShot) { // Page d'accueil (index.html)
      if (seriesGridOngoing) {
        const onGoing = allSeries.filter(s => s && !s.completed && !s.os);
        seriesGridOngoing.innerHTML = onGoing.length > 0 ? onGoing.map(renderSeries).join("") : "<p>Aucune série en cours.</p>";
      }
      if (seriesGridOneShot) {
        const os = allSeries.filter(s => s && s.os);
        seriesGridOneShot.innerHTML = os.length > 0 ? os.map(renderSeries).join("") : "<p>Aucun one-shot.</p>";
      }
      if (latestContainer) {
        const allChaptersForHomepage = allSeries.filter(s => s && s.chapters)
          .flatMap(s => Object.entries(s.chapters).map(([cn, cd]) => (typeof cd === 'object' && cd !== null) ? {
            ...cd,
            serieTitle: s.title,
            serieCover: s.cover,
            chapter: cn,
            last_updated_ts: (cd.last_updated || 0) * 1000, // Pour les chapitres de série, last_updated est un timestamp Unix
            url: `https://cubari.moe/read/gist/${s.base64Url}/${cn.replaceAll(".", "-")}/1/`
          } : null))
          .filter(c => c).sort((a, b) => b.last_updated_ts - a.last_updated_ts).slice(0, 15);

        const track = document.querySelector(".carousel-track");
        if (track) {
          track.innerHTML = allChaptersForHomepage.length > 0 ? allChaptersForHomepage.map(renderChapter).join("") : "<p>Aucune sortie récente.</p>";
          const prevBtn = document.querySelector(".carousel-prev"), nextBtn = document.querySelector(".carousel-next");
          if (allChaptersForHomepage.length > 1 && prevBtn && nextBtn) {
            [prevBtn, nextBtn].forEach(btn => btn.style.display = 'flex');
            const scrollAmount = () => track.clientWidth * 0.8;
            nextBtn.addEventListener("click", () => track.scrollBy({ left: scrollAmount(), behavior: "smooth" }));
            prevBtn.addEventListener("click", () => track.scrollBy({ left: -scrollAmount(), behavior: "smooth" }));
            let isDragging = false, startX, scrollLeftVal;
            const startDragging = (e) => { isDragging = true; startX = (e.pageX || e.touches[0].pageX) - track.offsetLeft; scrollLeftVal = track.scrollLeft; track.classList.add("active"); };
            const stopDragging = () => { isDragging = false; track.classList.remove("active"); };
            const drag = (e) => { if (!isDragging) return; e.preventDefault(); const x = (e.pageX || e.touches[0].pageX) - track.offsetLeft; track.scrollLeft = scrollLeftVal - (x - startX) * 1.5; };
            track.addEventListener('mousedown', startDragging); track.addEventListener('touchstart', startDragging, { passive: true });
            document.addEventListener('mousemove', drag); document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mouseup', stopDragging); document.addEventListener('touchend', stopDragging);
          } else if (prevBtn && nextBtn) { [prevBtn, nextBtn].forEach(btn => btn.style.display = 'none'); }
        }
      }
    }
    initializeScrollObserver(); // Initialiser l'animation d'apparition pour tous les éléments concernés
  } catch (err) {
    console.error("Erreur Bootstrap App Logic:", err);
    if (latestContainer) latestContainer.innerHTML = "<p>Erreur chargement chapitres.</p>";
    if (seriesGridOngoing) seriesGridOngoing.innerHTML = "<p>Erreur chargement séries.</p>";
    if (seriesGridOneShot) seriesGridOneShot.innerHTML = "<p>Erreur chargement one-shots.</p>";
    if (seriesDetailSection) seriesDetailSection.innerHTML = "<p>Erreur chargement détails.</p>";
    if (galleryGridContainer) galleryGridContainer.innerHTML = "<p>Erreur chargement galerie.</p>";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadHTMLComponents();
  initializeHeaderAndMenuInteractions();
  if (window.setupMobileMenuInteractions) {
    window.setupMobileMenuInteractions();
  } else {
    console.error("La fonction setupMobileMenuInteractions n'est pas définie. Assurez-vous que initializeHeaderAndMenuInteractions est appelée et fonctionne.");
  }
  await bootstrapAppLogic();
});