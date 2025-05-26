document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("theme-toggle");
  
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("mv-theme");

  // 1. Initialisation du thème au chargement
  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }

  const updateIcon = () => {
    const icon = toggleBtn.querySelector("i");
    icon.className = document.body.classList.contains("dark")
      ? "fas fa-sun"
      : "fas fa-moon";
  };

  // applique tout de suite
  updateIcon();

  // 2. Au clic, on bascule thème + icône + stockage
  toggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("mv-theme", isDark ? "dark" : "light");
    updateIcon();
  });
});

// ========== ANIMATION ON SCROLL ==========
document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = 1;
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.12 }
  );

  document
    .querySelectorAll(".chapter-card, .series-card, .section-title")
    .forEach((el) => observer.observe(el));
});

// ─────────────────────────────────  APP LOGIC ─────────────────────────────────────
let CONFIG;

const latestContainer = document.querySelector(".latest-chapters");
const seriesGridOngoing = document.querySelector(".series-grid.on-going");
const seriesGridOneShot = document.querySelector(".series-grid.one-shot");
const seriesDetailSection = document.getElementById("series-detail-section");

// Global variable to control volume sorting order on detail page
let volumeSortOrder = 'desc'; // 'desc' for highest volume first (default), 'asc' for lowest volume first

// Helpers pour ajuster les URLs de cover
const appendSeriesCover = (url) => `${url.slice(0, -4)}-s.jpg`;
const appendChapterCover = (url) => `${url.slice(0, -4)}-m.jpg`;

// Helper pour formater les dates
function timeAgo(ms) {
  const diff = Date.now() - ms;
  const min = 60 * 1000,
    h = 60 * min,
    d = 24 * h,
    w = 7 * d;
  if (diff < min) return "à l’instant";
  if (diff < h) return `${Math.floor(diff / min)} min`;
  if (diff < d) return `${Math.floor(diff / h)} h`;
  if (diff < w) return `${Math.floor(diff / d)} j`;
  return new Date(ms).toLocaleDateString("fr-FR");
}

// Helper pour afficher le badge "NOUVEAU"
const maybeNewBadge = (lastUpdated) =>
  Date.now() - lastUpdated < 3 * 24 * 60 * 60 * 1000
    ? '<span class="new-badge">NOUVEAU</span>'
    : "";

// Helper pour convertir un titre en slug URL-friendly
function slugify(text) {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "_");
}


// Rendus HTML pour les cartes de chapitre (carousel)
function renderChapter(c) {
  return `
  <div class="chapter-card" onclick="window.open('${c.url}', '_blank')">
    <div class="chapter-cover">
      <img src="${appendChapterCover(c.serieCover)}" alt="${c.serieTitle} – Cover">
      ${maybeNewBadge(c.last_updated)}
    </div>
    <div class="chapter-info">
      <div class="manga-title">${c.serieTitle}</div>
      <div class="chapter-title">${c.title}</div>
      <div class="chapter-number">Chapitre ${c.chapter}</div>
      <div class="chapter-time"><i class="fas fa-clock"></i> ${timeAgo(c.last_updated)}</div>
    </div>
  </div>`;
}

// Rendus HTML pour les cartes de série (grilles)
function renderSeries(s) {
  const chaptersArray = Object.entries(s.chapters)
    .map(([chapNum, chapData]) => ({
      chapter: chapNum,
      title: chapData.title,
      volume: chapData.volume,
      last_updated: chapData.last_updated * 1000,
      url: `https://cubari.moe/read/gist/${s.base64Url}/${chapNum.replaceAll(".", "-")}/1/`
    }))
    .sort((a, b) => b.last_updated - a.last_updated)
    .slice(0, 3);

  const lastThreeChaptersHtml = chaptersArray.map(c => `
    <div class="series-chapter-item" onclick="event.stopPropagation(); window.open('${c.url}', '_blank')">
      <span class="chapter-number-small">Ch. ${c.chapter}</span>
      <span class="chapter-title-small">${c.title}</span>
      <span class="chapter-date-small">${timeAgo(c.last_updated)}</span>
    </div>
  `).join('');

  const descriptionHtml = s.description
    ? `<div class="series-description">${s.description.length > 200 ? s.description.substring(0, 200) + '...' : s.description}</div>`
    : '';

  let authorArtistLine = '';
  if (s.author && s.artist && s.author !== s.artist) {
    authorArtistLine = `<div class="meta"><strong>Auteur :</strong> ${s.author} / <strong>Dessinateur :</strong> ${s.artist}</div>`;
  } else if (s.author) {
    authorArtistLine = `<div class="meta"><strong>Auteur :</strong> ${s.author}</div>`;
  } else if (s.artist) {
    authorArtistLine = `<div class="meta"><strong>Dessinateur :</strong> ${s.artist}</div>`;
  }
  
  const detailPageUrl = `series-detail.html?id=${slugify(s.title)}`;

  return `
  <div class="series-card" onclick="window.location.href='${detailPageUrl}'">
    <div class="series-cover">
      <img src="${appendSeriesCover(s.cover)}" alt="${s.title} – Cover">
    </div>
    <div class="series-info">
      <div class="series-title">${s.title}</div>
      ${authorArtistLine}
      ${descriptionHtml}
      ${
        Array.isArray(s.tags)
          ? `
        <div class="tags">
          ${s.tags
            .slice(0, 6)
            .map((t) => `<span class="tag">${t}</span>`)
            .join("")}
        </div>`
          : ""
      }
      <div class="series-latest-chapters-container">
        ${lastThreeChaptersHtml}
      </div>
    </div>
  </div>`;
}

// Function to render individual chapter items
function renderChaptersList(chaptersToRender) {
    return chaptersToRender.map(c => {
        const isLicensed = c.licencied && c.licencied.length > 0 && (!c.groups || c.groups.Big_herooooo === '');
        const chapterClass = isLicensed ? 'detail-chapter-item licensed-chapter-item' : 'detail-chapter-item';
        const clickAction = isLicensed ? '' : `onclick="window.open('${c.url}', '_blank')"`;
        
        // NOUVELLE MODIFICATION: Vérifier c.collab et ajouter le span
        const collabHtml = c.collab ? `<span class="detail-chapter-collab">${c.collab}</span>` : '';

        return `
        <div class="${chapterClass}" ${clickAction}>
            <span class="detail-chapter-number">Chapitre ${c.chapter}</span>
            <span class="detail-chapter-title">${c.title}</span>
            ${collabHtml} <!-- Insertion du collaborateur -->
            <span class="detail-chapter-date">${timeAgo(c.last_updated)}</span>
        </div>
        `;
    }).join('');
}

// Function to render the entire chapter list with volume grouping and sorting
function displayGroupedChapters(allChaptersRaw) {
    const chaptersContainer = document.querySelector(".chapters-accordion-container");
    if (!chaptersContainer) return;

    // Group chapters by volume
    let grouped = new Map();
    let volumeLicenseInfo = new Map(); // Stores license info per volume
    
    allChaptersRaw.forEach(chap => {
        const volKey = chap.volume && chap.volume.trim() !== '' ? chap.volume.trim() : 'hors_serie';
        if (!grouped.has(volKey)) {
            grouped.set(volKey, []);
        }
        grouped.get(volKey).push(chap);

        // Store license info for this volume, if it exists AND the chapter is blocked
        if (chap.licencied && chap.licencied.length > 0 && (!chap.groups || chap.groups.Big_herooooo === '')) {
            if (!volumeLicenseInfo.has(volKey)) {
                volumeLicenseInfo.set(volKey, chap.licencied);
            }
        }
    });

    // Sort chapters within each volume (ALWAYS DESCENDING BY CHAPTER NUMBER as requested)
    for (const [volKey, chapters] of grouped.entries()) {
        grouped.set(volKey, chapters.sort((a, b) => parseFloat(b.chapter) - parseFloat(a.chapter)));
    }

    // Sort volume keys based on volumeSortOrder
    let sortedVolumeKeys = [...grouped.keys()].sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);

        if (volumeSortOrder === 'desc') { // Default: Hors-série, then Vmax..V1
            if (a === 'hors_serie') return -1; // 'hors_serie' always comes first
            if (b === 'hors_serie') return 1;
            return numB - numA; // Numeric descending for volumes
        } else { // 'asc': V1..Vmax, then Hors-série
            if (a === 'hors_serie') return 1; // 'hors_serie' always comes last
            if (b === 'hors_serie') return -1;
            return numA - numB; // Numeric ascending for volumes
        }
    });
    
    let html = '';
    sortedVolumeKeys.forEach(volKey => {
        const volumeDisplayName = volKey === 'hors_serie' ? 'Hors-série' : `Volume ${volKey}`;
        const chaptersInVolume = grouped.get(volKey);
        const licenseInfo = volumeLicenseInfo.get(volKey); // Get license info for this volume

        let volumeHeaderContent;
        if (licenseInfo) {
            const licenseLink = licenseInfo[0];
            const releaseDate = licenseInfo[1];
            volumeHeaderContent = `
                <h4 class="volume-title-main">${volumeDisplayName}</h4>
                <div class="volume-license-details">
                    <span class="volume-license-text">Ce volume est disponible en format papier, vous pouvez le commander</span>
                    <a href="${licenseLink}" target="_blank" rel="noopener noreferrer" class="volume-license-link">juste ici !</a>
                    <span class="volume-release-date">${releaseDate}</span>
                </div>
            `;
        } else {
            volumeHeaderContent = `<h4>${volumeDisplayName}</h4>`;
        }

        html += `
            <div class="volume-group">
                <div class="volume-header active" data-volume="${volKey}"> <!-- 'active' for default open -->
                    ${volumeHeaderContent}
                    <i class="fas fa-chevron-down volume-arrow rotated"></i> <!-- 'rotated' for initial arrow up -->
                </div>
                <div class="volume-chapters-list">
                    ${renderChaptersList(chaptersInVolume)}
                </div>
            </div>
        `;
    });

    chaptersContainer.innerHTML = html;

    // Add accordion functionality and ensure they are open by default
    document.querySelectorAll('.volume-group').forEach(group => {
        const header = group.querySelector('.volume-header');
        const content = group.querySelector('.volume-chapters-list');
        const arrow = header.querySelector('.volume-arrow');

        // Set max-height initially for open state (after content is rendered)
        // Use a small timeout to ensure DOM has rendered fully before calculating scrollHeight
        setTimeout(() => {
            if (header.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        }, 0);


        header.addEventListener('click', () => {
            header.classList.toggle('active');
            arrow.classList.toggle('rotated'); // Toggle rotated class for arrow animation

            if (content.style.maxHeight && content.style.maxHeight !== "0px") { // If currently open (maxHeight has a value > 0)
                content.style.maxHeight = "0px"; // Close it
            } else { // If currently closed (maxHeight is 0px or not set)
                content.style.maxHeight = content.scrollHeight + "px"; // Open it
            }
        });
    });
}


// Fonction pour afficher la page de détail d'une série
function renderSeriesDetailPage(s) {
    if (!seriesDetailSection) return;

    // Store all chapters for current series globally (for sorting)
    const allChaptersRaw = Object.entries(s.chapters)
        .map(([chapNum, chapData]) => ({
            chapter: chapNum,
            title: chapData.title,
            volume: chapData.volume,
            last_updated: chapData.last_updated * 1000,
            url: chapData.groups && chapData.groups.Big_herooooo !== '' ? `https://cubari.moe/read/gist/${s.base64Url}/${chapNum.replaceAll(".", "-")}/1/` : null, // Set URL to null if blocked
            licencied: chapData.licencied, // Ensure licensed info is passed
            groups: chapData.groups, // Ensure groups info is passed
            collab: chapData.collab // Ensure collab info is passed
        }));
    
    let authorArtistLine = '';
    if (s.author && s.artist) {
      authorArtistLine = `<p><strong>Auteur :</strong> ${s.author} <span class="detail-artist-spacing"><strong>Dessinateur :</strong> ${s.artist}</span></p>`;
    } else if (s.author) {
      authorArtistLine = `<p><strong>Auteur :</strong> ${s.author}</p>`;
    } else if (s.artist) {
      authorArtistLine = `<p><strong>Dessinateur :</strong> ${s.artist}</p>`;
    }

    let additionalMetadataItems = [];

    if (s.release_year) {
        additionalMetadataItems.push(`<p><strong>Année :</strong> ${s.release_year}</p>`);
    }
    if (s.release_status) {
        additionalMetadataItems.push(`<p><strong>Statut :</strong> ${s.release_status}</p>`);
    }
    if (s.alternative_titles && s.alternative_titles.length > 0) {
        additionalMetadataItems.push(`<p><strong>Titre alternatif :</strong> ${s.alternative_titles.join(', ')}</p>`);
    }
    if (s.manga_type) {
        additionalMetadataItems.push(`<p><strong>Type :</strong> ${s.manga_type}</p>`);
    }
    if (s.magazine) {
        additionalMetadataItems.push(`<p><strong>Magazine :</strong> ${s.magazine}</p>`);
    }

    const additionalMetadataHtml = additionalMetadataItems.length > 0 ?
        `<div class="detail-additional-metadata">${additionalMetadataItems.join('')}</div>` :
        '';

    seriesDetailSection.innerHTML = `
        <div class="series-detail-container">
            <div class="detail-top-section">
                <div class="detail-info">
                    <h1 class="detail-title">${s.title}</h1>
                    ${ 
                      Array.isArray(s.tags) && s.tags.length > 0
                        ? `
                        <div class="detail-tags">
                            ${s.tags
                                .map((t) => `<span class="detail-tag">${t}</span>`)
                                .join("")}
                        </div>`
                        : ""
                    }
                    ${authorArtistLine}
                    ${additionalMetadataHtml}
                </div>
                <img src="${s.cover}" alt="${s.title} Cover" class="detail-cover">
            </div>
            
            <p class="detail-description">${s.description || 'Pas de description disponible.'}</p>

            <div class="chapters-main-header">
                <h3 class="section-title">Liste des Chapitres</h3>
                <div class="chapter-sort-filter">
                    <button id="sort-volumes-btn" class="sort-button">
                        <i class="fas fa-sort-numeric-down-alt"></i> Volumes : Du plus récent au plus ancien
                    </button>
                </div>
            </div>
            
            <div class="chapters-accordion-container">
                <!-- Chapters grouped by volume will be injected here by displayGroupedChapters -->
            </div>
        </div>
    `;

    document.title = `BigSolo – ${s.title}`;

    // Initial display of grouped chapters
    displayGroupedChapters(allChaptersRaw);

    // Add event listener for the sort button
    const sortButton = document.getElementById('sort-volumes-btn');
    if (sortButton) {
        sortButton.addEventListener('click', () => {
            volumeSortOrder = volumeSortOrder === 'desc' ? 'asc' : 'desc';
            const icon = sortButton.querySelector('i');
            if (volumeSortOrder === 'desc') {
                icon.className = "fas fa-sort-numeric-down-alt";
                sortButton.innerHTML = `<i class="fas fa-sort-numeric-down-alt"></i> Volumes : Du plus récent au plus ancien`;
            } else {
                icon.className = "fas fa-sort-numeric-up-alt";
                sortButton.innerHTML = `<i class="fas fa-sort-numeric-up-alt"></i> Volumes : Du plus ancien au plus récent`;
            }
            displayGroupedChapters(allChaptersRaw); // Re-render chapters with new sort order
        });
    }
}


// Récupérer et traiter les JSON de chaque série
async function fetchAllSeries() {
  const dev = await fetch("./config-dev.json");
  if (dev.status === 404) {
    CONFIG = await fetch("./config.json").then((res) => res.json());
  } else {
    CONFIG = await dev.json();
  }
  let seriesPromises = [];

  if (CONFIG.ENV === "LOCAL_DEV") {
    if (!CONFIG.LOCAL_SERIES_FILES || !Array.isArray(CONFIG.LOCAL_SERIES_FILES)) {
      console.error("Erreur de configuration : LOCAL_SERIES_FILES n'est pas défini ou n'est pas un tableau dans config.json pour l'environnement LOCAL_DEV.");
      return [];
    }
    seriesPromises = CONFIG.LOCAL_SERIES_FILES.map(async (filename) => {
      const localPath = `./cubari/${filename}`;
      try {
        const serie = await fetch(localPath).then((r) => {
          if (!r.ok) throw new Error(`Fichier local ${localPath} non trouvé ou inaccessible (HTTP ${r.status})`);
          return r.json();
        });
        
        const githubFileName = filename; 
        const base64Url = btoa(`${CONFIG.URL_RAW_JSON_GITHUB}${githubFileName}`);
        serie.urlSerie = `https://cubari.moe/read/gist/${base64Url}`;
        serie.base64Url = base64Url;
        return serie;
      } catch (error) {
        console.error(`Erreur lors du chargement du fichier de série local ${localPath}:`, error);
        return null; 
      }
    });
  } else {
    const contents = await fetch(CONFIG.URL_GIT_CUBARI).then((r) => {
      if (!r.ok) throw new Error(`GitHub API ${r.status}`);
      return r.json();
    });

    seriesPromises = contents
      .filter((file) => file.name.endsWith(".json"))
      .map(async (file) => {
        const serie = await fetch(file.download_url).then((r) => r.json());
        const base64Url = btoa(`${CONFIG.URL_RAW_JSON_GITHUB}${file.name}`);
        serie.urlSerie = `https://cubari.moe/read/gist/${base64Url}`;
        serie.base64Url = base64Url;
        return serie;
      });
  }

  const allSeries = await Promise.all(seriesPromises);
  return allSeries.filter(s => s !== null);
}

// Fonction principale pour initialiser l'application
async function bootstrap() {
  try {
    const allSeries = await fetchAllSeries(); 

    const urlParams = new URLSearchParams(window.location.search);
    const seriesId = urlParams.get('id');

    if (seriesId && seriesDetailSection) {
        const seriesData = allSeries.find(s => slugify(s.title) === seriesId);
        if (seriesData) {
            renderSeriesDetailPage(seriesData);
        } else {
            seriesDetailSection.innerHTML = "<p>Série non trouvée.</p>";
        }
        return; 
    }

    if (!latestContainer && !seriesGridOngoing && !seriesGridOneShot) {
        return; 
    }
    
    if (latestContainer && seriesGridOngoing && seriesGridOneShot) {
        const onGoing = allSeries.filter((serie) => !serie.completed && !serie.os);
        const os = allSeries.filter((serie) => serie.os);

        seriesGridOngoing.innerHTML = onGoing.map(renderSeries).join("");
        seriesGridOneShot.innerHTML = os.map(renderSeries).join("");

        const allChapters = allSeries
        .flatMap((serie) =>
            Object.entries(serie.chapters).map(([chapNum, chapData]) => {
            chapData.serieTitle = serie.title;
            chapData.serieCover = serie.cover;
            chapData.chapter = chapNum;
            chapData.last_updated = chapData.last_updated * 1000;
            chapData.url = `https://cubari.moe/read/gist/${
                serie.base64Url
            }/${chapNum.replaceAll(".", "-")}/1/`;
            return chapData;
            })
        )
        .sort((a, b) => b.last_updated - a.last_updated)
        .slice(0, 15);

        const track = document.querySelector(".carousel-track");
        if (track) {
            track.innerHTML = allChapters.map(renderChapter).join("");

            const prevBtn = document.querySelector(".carousel-prev");
            const nextBtn = document.querySelector(".carousel-next");

            nextBtn.addEventListener("click", () => {
                const visibleWidth = track.clientWidth;
                const maxScrollLeft = track.scrollWidth - visibleWidth;
                if (track.scrollLeft >= maxScrollLeft) {
                    track.scrollTo({ left: 0, behavior: "smooth" });
                } else {
                    track.scrollBy({ left: visibleWidth, behavior: "smooth" });
                }
            });

            prevBtn.addEventListener("click", () => {
                const visibleWidth = track.clientWidth;
                const maxScrollLeft = track.scrollWidth - visibleWidth;
                if (track.scrollLeft <= 0) {
                    track.scrollTo({ left: maxScrollLeft, behavior: "smooth" });
                } else {
                    track.scrollBy({ left: -visibleWidth, behavior: "smooth" });
                }
            });

            let isDragging = false;
            let startX = 0;
            let scrollStart = 0;

            track.addEventListener("mousedown", (e) => {
                isDragging = true;
                track.classList.add("active");
                startX = e.pageX - track.offsetLeft;
                scrollStart = track.scrollLeft;
            });

            document.addEventListener("mouseup", () => {
                isDragging = false;
                track.classList.remove("active");
            });

            track.addEventListener("mousemove", (e) => {
                if (!isDragging) return;
                e.preventDefault();
                const x = e.pageX - track.offsetLeft;
                const walk = (x - startX) * 1.5;
                track.scrollLeft = scrollStart - walk;
            });

            track.addEventListener("touchstart", (e) => {
                startX = e.touches[0].pageX - track.offsetLeft;
                scrollStart = track.scrollLeft;
            });

            track.addEventListener("touchmove", (e) => {
                const x = e.touches[0].pageX - track.offsetLeft;
                const walk = (x - startX) * 1.5;
                track.scrollLeft = scrollStart - walk;
            });
        }
    }

  } catch (err) {
    console.error("Erreur de chargement :", err);
    if (latestContainer) latestContainer.innerHTML = "<p>Impossible de charger les chapitres.</p>";
    if (seriesGridOngoing) seriesGridOngoing.innerHTML = "<p>Impossible de charger les séries.</p>";
    if (seriesGridOneShot) seriesGridOneShot.innerHTML = "<p>Impossible de charger les one-shots.</p>";
    if (seriesDetailSection) seriesDetailSection.innerHTML = "<p>Impossible de charger les détails de la série.</p>";
  }
}

// Lancement de l’app
bootstrap();