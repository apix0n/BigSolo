function initializeScrollObserver() {
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
}


document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("theme-toggle");

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("mv-theme");

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }

  const updateIcon = () => {
    if (toggleBtn) { 
      const icon = toggleBtn.querySelector("i");
      if (icon) { 
        icon.className = document.body.classList.contains("dark")
          ? "fas fa-sun"
          : "fas fa-moon";
      }
    }
  };

  updateIcon();

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark");
      localStorage.setItem("mv-theme", isDark ? "dark" : "light");
      updateIcon();
    });
  }

  const hamburgerBtn = document.querySelector(".hamburger-menu-btn");
  const mobileMenuOverlay = document.querySelector(".mobile-menu-overlay");
  const closeMenuBtn = document.querySelector(".close-mobile-menu-btn");
  const mobileNavLinks = document.querySelectorAll(".mobile-menu-content a");

  function openMobileMenu() {
    if (mobileMenuOverlay) mobileMenuOverlay.classList.add("open");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "true");
  }

  function closeMobileMenu() {
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove("open");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
  }

  if (hamburgerBtn && mobileMenuOverlay && closeMenuBtn) {
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (mobileMenuOverlay.classList.contains("open")) {
        closeMobileMenu();
      } else {
        openMobileMenu();
      }
    });

    closeMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeMobileMenu();
    });

    mobileMenuOverlay.addEventListener("click", (e) => {
      if (e.target === mobileMenuOverlay) {
        closeMobileMenu();
      }
    });

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (link.getAttribute('href').startsWith('#') || (link.getAttribute('href').startsWith('index.html#') && window.location.pathname.endsWith('index.html'))) {
          setTimeout(() => {
            closeMobileMenu();
          }, 150);
        }
      });
    });
  }
});


let CONFIG;

const latestContainer = document.querySelector(".latest-chapters");
const seriesGridOngoing = document.querySelector(".series-grid.on-going");
const seriesGridOneShot = document.querySelector(".series-grid.one-shot");
const seriesDetailSection = document.getElementById("series-detail-section");
const galerieSection = document.getElementById("galerie-section");

let volumeSortOrder = 'desc';

const appendSeriesCover = (url) => `${url.slice(0, -4)}-s.jpg`;
const appendChapterCover = (url) => `${url.slice(0, -4)}-m.jpg`;

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

const maybeNewBadge = (lastUpdated) =>
  Date.now() - lastUpdated < 3 * 24 * 60 * 60 * 1000
    ? '<span class="new-badge">NOUVEAU</span>'
    : "";

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

function renderSeries(s) {
  const chaptersArray = Object.entries(s.chapters)
    .map(([chapNum, chapData]) => ({
      chapter: chapNum,
      title: chapData.title,
      volume: chapData.volume,
      last_updated: chapData.last_updated * 1000,
      url: `https://cubari.moe/read/gist/${s.base64Url}/${chapNum.replaceAll(".", "-")}/1/`
    }))
    .sort((a, b) => b.last_updated - a.last_updated);

  let latestChapterAsButton = '';
  if (chaptersArray.length > 0) {
    const latestChap = chaptersArray[0];
    latestChapterAsButton = `
    <div class="series-latest-chapters-container-mobile">
        <div class="series-chapter-item" onclick="event.stopPropagation(); window.open('${latestChap.url}', '_blank')">
            <div class="series-chapter-item-main-info-mobile">
                <span class="chapter-number-small">Ch. ${latestChap.chapter}</span>
                <span class="chapter-title-small">${latestChap.title}</span>
            </div>
            <span class="chapter-date-small-mobile">${timeAgo(latestChap.last_updated)}</span>
        </div>
    </div>
    `;
  }

  let latestThreeChaptersHtml = '';
  if (chaptersArray.length > 0) {
    latestThreeChaptersHtml = `
      <div class="series-latest-chapters-container-desktop">
        ${chaptersArray.slice(0, 3).map(chap => `
          <div class="series-chapter-item-desktop" onclick="event.stopPropagation(); window.open('${chap.url}', '_blank')">
            <span class="chapter-number-desktop">Ch. ${chap.chapter}</span>
            <span class="chapter-title-desktop">${chap.title}</span>
            <span class="chapter-date-desktop">${timeAgo(chap.last_updated)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  const descriptionHtml = s.description
    ? `<div class="series-description">${s.description}</div>`
    : '';

  let authorString = '';
  if (s.author && s.artist && s.author !== s.artist) {
    authorString = `<strong>Auteur :</strong> ${s.author} / <strong>Dess. :</strong> ${s.artist}`;
  } else if (s.author) {
    authorString = `<strong>Auteur :</strong> ${s.author}`;
  } else if (s.artist) {
    authorString = `<strong>Dess. :</strong> ${s.artist}`; 
  }

  let yearString = s.release_year ? `<strong>Année :</strong> ${s.release_year}` : '';

  let authorYearLineHtml = '';
  if (authorString || yearString) { 
    authorYearLineHtml = `
      <div class="meta series-author-year-line">
        ${authorString ? `<span class="series-author-info">${authorString}</span>` : ''}
        ${authorString && yearString ? `<span class="meta-separator-card"></span>` : ''}
        ${yearString ? `<span class="series-year-info">${yearString}</span>` : ''}
      </div>
    `;
  }

  let tagsHtml = '';
  if (Array.isArray(s.tags) && s.tags.length > 0) {
    tagsHtml = `
      <div class="tags series-tags">
        ${s.tags
          .slice(0, 4) 
          .map((t) => `<span class="tag">${t}</span>`)
          .join("")}
      </div>`;
  }


  const detailPageUrl = `series-detail.html?id=${slugify(s.title)}`;

  return `
  <div class="series-card" onclick="window.location.href='${detailPageUrl}'">
    <div class="series-cover">
      <img src="${appendSeriesCover(s.cover)}" alt="${s.title} – Cover">
    </div>
    <div class="series-info">
      <div class="series-title">${s.title}</div>
      ${authorYearLineHtml}
      ${tagsHtml} 
      ${descriptionHtml} 
      ${latestChapterAsButton} 
      ${latestThreeChaptersHtml}
    </div>
  </div>`;
}

function renderChaptersList(chaptersToRender) {
  return chaptersToRender.map(c => {
    const isLicensed = c.licencied && c.licencied.length > 0 && (!c.groups || c.groups.Big_herooooo === '');
    const chapterClass = isLicensed ? 'detail-chapter-item licensed-chapter-item' : 'detail-chapter-item';
    const clickAction = isLicensed ? '' : `onclick="window.open('${c.url}', '_blank')"`;
    const collabHtml = c.collab ? `<span class="detail-chapter-collab">${c.collab}</span>` : '';
    return `
        <div class="${chapterClass}" ${clickAction}>
            <div class="chapter-main-info">
                <span class="detail-chapter-number">Chapitre ${c.chapter}</span>
                <span class="detail-chapter-title">${c.title}</span>
            </div>
            <div class="chapter-side-info">
                ${collabHtml}
                <span class="detail-chapter-date">${timeAgo(c.last_updated)}</span>
            </div>
        </div>
        `;
  }).join('');
}

function displayGroupedChapters(allChaptersRaw) {
  const chaptersContainer = document.querySelector(".chapters-accordion-container");
  if (!chaptersContainer) return;
  let grouped = new Map();
  let volumeLicenseInfo = new Map();
  allChaptersRaw.forEach(chap => {
    const volKey = chap.volume && chap.volume.trim() !== '' ? chap.volume.trim() : 'hors_serie';
    if (!grouped.has(volKey)) grouped.set(volKey, []);
    grouped.get(volKey).push(chap);
    if (chap.licencied && chap.licencied.length > 0 && (!chap.groups || chap.groups.Big_herooooo === '')) {
      if (!volumeLicenseInfo.has(volKey)) volumeLicenseInfo.set(volKey, chap.licencied);
    }
  });
  for (const [volKey, chapters] of grouped.entries()) {
    grouped.set(volKey, chapters.sort((a, b) => parseFloat(b.chapter) - parseFloat(a.chapter)));
  }
  let sortedVolumeKeys = [...grouped.keys()].sort((a, b) => {
    const numA = parseFloat(a); const numB = parseFloat(b);
    if (volumeSortOrder === 'desc') { if (a === 'hors_serie') return -1; if (b === 'hors_serie') return 1; return numB - numA; }
    else { if (a === 'hors_serie') return 1; if (b === 'hors_serie') return -1; return numA - numB; }
  });
  let html = '';
  sortedVolumeKeys.forEach(volKey => {
    const volumeDisplayName = volKey === 'hors_serie' ? 'Hors-série' : `Volume ${volKey}`;
    const chaptersInVolume = grouped.get(volKey);
    const licenseInfo = volumeLicenseInfo.get(volKey);
    let volumeHeaderContent;
    if (licenseInfo) {
      const licenseLink = licenseInfo[0]; const releaseDate = licenseInfo[1];
      volumeHeaderContent = `<h4 class="volume-title-main">${volumeDisplayName}</h4><div class="volume-license-details"><span class="volume-license-text">Ce volume est disponible en format papier, vous pouvez le commander</span><a href="${licenseLink}" target="_blank" rel="noopener noreferrer" class="volume-license-link">juste ici !</a><span class="volume-release-date">${releaseDate}</span></div>`;
    } else { volumeHeaderContent = `<h4>${volumeDisplayName}</h4>`; }
    html += `<div class="volume-group"><div class="volume-header active" data-volume="${volKey}">${volumeHeaderContent}<i class="fas fa-chevron-down volume-arrow rotated"></i></div><div class="volume-chapters-list">${renderChaptersList(chaptersInVolume)}</div></div>`;
  });
  chaptersContainer.innerHTML = html;
  document.querySelectorAll('.volume-group').forEach(group => {
    const header = group.querySelector('.volume-header');
    const content = group.querySelector('.volume-chapters-list');
    const arrow = header.querySelector('.volume-arrow');
    setTimeout(() => { if (header.classList.contains('active')) content.style.maxHeight = content.scrollHeight + "px"; }, 0);
    header.addEventListener('click', () => {
      header.classList.toggle('active'); arrow.classList.toggle('rotated');
      if (content.style.maxHeight && content.style.maxHeight !== "0px") content.style.maxHeight = "0px";
      else content.style.maxHeight = content.scrollHeight + "px";
    });
  });
}

function renderSeriesDetailPage(s) {
  if (!seriesDetailSection) return;

  const allChaptersRaw = Object.entries(s.chapters)
    .map(([chapNum, chapData]) => ({
      chapter: chapNum,
      title: chapData.title,
      volume: chapData.volume,
      last_updated: chapData.last_updated * 1000,
      url: chapData.groups && chapData.groups.Big_herooooo !== '' ? `https://cubari.moe/read/gist/${s.base64Url}/${chapNum.replaceAll(".", "-")}/1/` : null,
      licencied: chapData.licencied,
      groups: chapData.groups,
      collab: chapData.collab
    }));

  const titleHtml = `<h1 class="detail-title">${s.title}</h1>`;
  const tagsHtml = Array.isArray(s.tags) && s.tags.length > 0
    ? `<div class="detail-tags">${s.tags.map((t) => `<span class="detail-tag">${t}</span>`).join("")}</div>`
    : "";

  let authorArtistHtml = '';
  const authorText = s.author ? `<strong>Auteur :</strong> ${s.author}` : '';
  const artistText = s.artist ? `<strong>Dessinateur :</strong> ${s.artist}` : '';

  if (s.author && s.artist) {
    if (s.author === s.artist) {
      authorArtistHtml = `<p class="detail-meta">${authorText} <span class="detail-artist-spacing">${artistText}</span></p>`;
    } else {
      authorArtistHtml = `<p class="detail-meta">${authorText} <span class="detail-artist-spacing">${artistText}</span></p>`;
    }
  } else if (s.author) {
    authorArtistHtml = `<p class="detail-meta">${authorText}</p>`;
  } else if (s.artist) {
    authorArtistHtml = `<p class="detail-meta">${artistText}</p>`;
  }

  let yearStatusHtmlMobile = '';
  let typeMagazineHtmlMobile = '';
  let additionalMetadataForDesktop = [];

  if (s.release_year || s.release_status) {
    let yearPart = s.release_year ? `<strong>Année :</strong> ${s.release_year}` : '';
    let statusPart = s.release_status ? `<strong>Statut :</strong> ${s.release_status}` : '';

    yearStatusHtmlMobile = `<p class="detail-meta detail-meta-flex-line detail-year-status-mobile">`;
    yearStatusHtmlMobile += `<span class="detail-meta-flex-prefix">${yearPart}</span>`; 
    if (yearPart && statusPart) { 
      yearStatusHtmlMobile += `<span class="detail-meta-flex-suffix">${statusPart}</span>`;
    } else if (!yearPart && statusPart) {
      yearStatusHtmlMobile = `<p class="detail-meta detail-meta-flex-line detail-year-status-mobile"><span class="detail-meta-flex-prefix">${statusPart}</span></p>`;
    }
    if (yearPart && !statusPart) {
      yearStatusHtmlMobile += `</p>`; 
    } else if (yearPart && statusPart) {
      yearStatusHtmlMobile += `</p>`;
    }

  }


  if (s.manga_type || s.magazine) {
    let typePart = s.manga_type ? `<strong>Type :</strong> ${s.manga_type}` : '';
    let magazinePart = s.magazine ? `<strong>Magazine :</strong> ${s.magazine}` : '';

    typeMagazineHtmlMobile = `<p class="detail-meta detail-meta-flex-line detail-type-magazine-mobile">`;
    typeMagazineHtmlMobile += `<span class="detail-meta-flex-prefix">${typePart}</span>`;
    if (typePart && magazinePart) {
      typeMagazineHtmlMobile += `<span class="detail-meta-flex-suffix">${magazinePart}</span>`;
    } else if (!typePart && magazinePart) {
      typeMagazineHtmlMobile = `<p class="detail-meta detail-meta-flex-line detail-type-magazine-mobile"><span class="detail-meta-flex-prefix">${magazinePart}</span></p>`;
    }

    if (typePart && !magazinePart) {
      typeMagazineHtmlMobile += `</p>`;
    } else if (typePart && magazinePart) {
      typeMagazineHtmlMobile += `</p>`;
    }
  }


  if (s.release_year) additionalMetadataForDesktop.push(`<p><strong>Année :</strong> ${s.release_year}</p>`);
  if (s.release_status) additionalMetadataForDesktop.push(`<p><strong>Statut :</strong> ${s.release_status}</p>`);
  if (s.manga_type) additionalMetadataForDesktop.push(`<p><strong>Type :</strong> ${s.manga_type}</p>`);
  if (s.magazine) additionalMetadataForDesktop.push(`<p><strong>Magazine :</strong> ${s.magazine}</p>`);
  if (s.alternative_titles && s.alternative_titles.length > 0) {
    additionalMetadataForDesktop.push(`<p><strong>Titre alternatif :</strong> ${s.alternative_titles.join(', ')}</p>`);
  }

  const additionalMetadataCombinedHtmlForDesktop = additionalMetadataForDesktop.length > 0
    ? `<div class="detail-additional-metadata">${additionalMetadataForDesktop.join('')}</div>`
    : "";

  const descriptionHtmlText = s.description || 'Pas de description disponible.';

  let finalHtmlStructure;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  const chaptersSectionHtml = `
    <div class="chapters-main-header">
        <h3 class="section-title">Liste des Chapitres</h3>
        <div class="chapter-sort-filter">
            <button id="sort-volumes-btn" class="sort-button" title="Trier les volumes">
                <i class="fas fa-sort-numeric-down-alt"></i>
            </button>
        </div>
    </div>
    <div class="chapters-accordion-container">
        <!-- Chapters grouped by volume will be injected here -->
    </div>
  `;

  if (isMobile) {
    let alternativeTitlesMobileHtml = '';
    if (s.alternative_titles && s.alternative_titles.length > 0) {
      alternativeTitlesMobileHtml = `<p class="detail-meta"><strong>Titre alternatif :</strong> ${s.alternative_titles.join(', ')}</p>`;
    }

    finalHtmlStructure = `
        <div class="series-detail-container">
            <div class="detail-top-layout-wrapper">
                <div class="detail-cover-wrapper">
                    <img src="${s.cover}" alt="${s.title} Cover" class="detail-cover">
                </div>
                <div class="detail-all-info-column">
                    <div class="detail-primary-info-wrapper">
                        ${titleHtml}
                        ${tagsHtml}
                        ${authorArtistHtml}
                    </div>
                </div>
            </div>
            <div class="detail-secondary-info-wrapper">
              ${yearStatusHtmlMobile}
              ${typeMagazineHtmlMobile}
              ${alternativeTitlesMobileHtml}
            </div>
            <p class="detail-description">${descriptionHtmlText}</p>
            ${chaptersSectionHtml}
        </div>
    `;
  } else {
    finalHtmlStructure = `
        <div class="series-detail-container">
            <div class="detail-top-layout-wrapper">
                <div class="detail-cover-wrapper">
                    <img src="${s.cover}" alt="${s.title} Cover" class="detail-cover">
                </div>
                <div class="detail-all-info-column">
                    <div class="detail-primary-info-wrapper">
                        ${titleHtml}
                        ${tagsHtml}
                        ${authorArtistHtml}
                    </div>
                    <div class="detail-secondary-info-wrapper">
                        ${additionalMetadataCombinedHtmlForDesktop}
                    </div>
                </div>
            </div>
            <p class="detail-description">${descriptionHtmlText}</p>
            ${chaptersSectionHtml}
        </div>
    `;
  }

  seriesDetailSection.innerHTML = finalHtmlStructure;

  document.title = `BigSolo – ${s.title}`;
  displayGroupedChapters(allChaptersRaw);

  const sortButton = document.getElementById('sort-volumes-btn');
  if (sortButton) {
    sortButton.addEventListener('click', () => {
      volumeSortOrder = volumeSortOrder === 'desc' ? 'asc' : 'desc';
      const icon = sortButton.querySelector('i');
      if (icon) {
        icon.className = volumeSortOrder === 'desc' ? "fas fa-sort-numeric-down-alt" : "fas fa-sort-numeric-up-alt";
      }
      displayGroupedChapters(allChaptersRaw);
    });
  }
}

async function renderGalerie(){
  const colos = await(await fetch("/colos.json")).json();
  colos.sort((a, b) => new Date(b.date) - new Date(a.date));
  for(const colo of colos){
    const img = document.createElement("img")
    img.src = colo.url_preview;
    img.addEventListener("click", function() {
      modal.style.display = "flex"; // Afficher la modale
      modalImage.src = colo.url; // Définir la source de l'image dans la modale
      author.innerText = "Autrice / Auteur : " + colo.author_id;
      twitter.style.display = colo["twitter"] == null ? "none" : "block";
      twitter.href = colo["twitter"]
      instagram.style.display = colo["instagram"] == null ? "none" : "block";
      instagram.href = colo["instagram"]
    });
    galerieSection.appendChild(img)
  }
}

async function fetchAllSeries() {
  const dev = await fetch("./config-dev.json");
  if (dev.status === 404) CONFIG = await fetch("./config.json").then((res) => res.json());
  else CONFIG = await dev.json();
  let seriesPromises = [];
  if (CONFIG.ENV === "LOCAL_DEV") {
    if (!CONFIG.LOCAL_SERIES_FILES || !Array.isArray(CONFIG.LOCAL_SERIES_FILES)) { console.error("Erreur de configuration : LOCAL_SERIES_FILES n'est pas défini ou n'est pas un tableau dans config.json pour l'environnement LOCAL_DEV."); return []; }
    seriesPromises = CONFIG.LOCAL_SERIES_FILES.map(async (filename) => {
      const localPath = `./cubari/${filename}`;
      try {
        const serie = await fetch(localPath).then((r) => { if (!r.ok) throw new Error(`Fichier local ${localPath} non trouvé (HTTP ${r.status})`); return r.json(); });
        const githubFileName = filename; const base64Url = btoa(`${CONFIG.URL_RAW_JSON_GITHUB}${githubFileName}`);
        serie.urlSerie = `https://cubari.moe/read/gist/${base64Url}`; serie.base64Url = base64Url; return serie;
      } catch (error) { console.error(`Erreur chargement local ${localPath}:`, error); return null; }
    });
  } else {
    const contents = await fetch(CONFIG.URL_GIT_CUBARI).then((r) => { if (!r.ok) throw new Error(`GitHub API ${r.status}`); return r.json(); });
    seriesPromises = contents.filter((file) => file.name.endsWith(".json")).map(async (file) => {
      try {
        const serie = await fetch(file.download_url).then((r) => { if (!r.ok) throw new Error(`Erreur fetch ${file.download_url} (HTTP ${r.status})`); return r.json(); });
        const base64Url = btoa(`${CONFIG.URL_RAW_JSON_GITHUB}${file.name}`);
        serie.urlSerie = `https://cubari.moe/read/gist/${base64Url}`; serie.base64Url = base64Url; return serie;
      } catch (error) {
        console.error(`Erreur chargement de ${file.name} depuis ${file.download_url}:`, error);
        return null;
      }
    });
  }
  const allSeries = await Promise.all(seriesPromises);
  return allSeries.filter(s => s !== null && typeof s === 'object' && s.title);
}

async function bootstrap() {
  try {
    const allSeries = await fetchAllSeries();
    const urlParams = new URLSearchParams(window.location.search);
    const seriesId = urlParams.get('id');

    if (seriesId && seriesDetailSection) {
      const seriesData = allSeries.find(s => slugify(s.title) === seriesId);
      if (seriesData) renderSeriesDetailPage(seriesData);
      else seriesDetailSection.innerHTML = "<p>Série non trouvée.</p>";
      initializeScrollObserver();
      return;
    }

    if (latestContainer || seriesGridOngoing || seriesGridOneShot) {
      if (seriesGridOngoing) {
        const onGoing = allSeries.filter((serie) => serie && !serie.completed && !serie.os);
        seriesGridOngoing.innerHTML = onGoing.map(renderSeries).join("") || "<p>Aucune série en cours pour le moment.</p>";
      }
      if (seriesGridOneShot) {
        const os = allSeries.filter((serie) => serie && serie.os);
        seriesGridOneShot.innerHTML = os.map(renderSeries).join("") || "<p>Aucun one-shot pour le moment.</p>";
      }

      if (latestContainer) {
        const allChapters = allSeries
          .filter(serie => serie && serie.chapters)
          .flatMap((serie) =>
            Object.entries(serie.chapters).map(([chapNum, chapData]) => {
              if (typeof chapData !== 'object' || chapData === null) {
                console.warn(`Données de chapitre invalides pour ${serie.title} - Ch. ${chapNum}`);
                return null;
              }
              return {
                ...chapData,
                serieTitle: serie.title,
                serieCover: serie.cover,
                chapter: chapNum,
                last_updated: (chapData.last_updated || 0) * 1000,
                url: `https://cubari.moe/read/gist/${serie.base64Url}/${chapNum.replaceAll(".", "-")}/1/`
              };
            })
          )
          .filter(chapter => chapter !== null)
          .sort((a, b) => b.last_updated - a.last_updated)
          .slice(0, 15);

        const track = document.querySelector(".carousel-track");
        if (track) {
          if (allChapters.length > 0) {
            track.innerHTML = allChapters.map(renderChapter).join("");
          } else {
            track.innerHTML = "<p>Aucune sortie récente.</p>";
          }

          const prevBtn = document.querySelector(".carousel-prev");
          const nextBtn = document.querySelector(".carousel-next");

          if (allChapters.length > 1 && prevBtn && nextBtn) {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
            nextBtn.addEventListener("click", () => { const visW = track.clientWidth; const maxSL = track.scrollWidth - visW; if (track.scrollLeft >= maxSL - 1) track.scrollTo({ left: 0, behavior: "smooth" }); else track.scrollBy({ left: visW, behavior: "smooth" }); });
            prevBtn.addEventListener("click", () => { const visW = track.clientWidth; const maxSL = track.scrollWidth - visW; if (track.scrollLeft <= 1) track.scrollTo({ left: maxSL, behavior: "smooth" }); else track.scrollBy({ left: -visW, behavior: "smooth" }); });

            let isDragging = false, startX = 0, scrollStart = 0;
            track.addEventListener("mousedown", (e) => { isDragging = true; track.classList.add("active"); startX = e.pageX - track.offsetLeft; scrollStart = track.scrollLeft; });
            document.addEventListener("mouseup", () => { if (isDragging) { isDragging = false; track.classList.remove("active"); } });
            track.addEventListener("mouseleave", () => { if (isDragging) { isDragging = false; track.classList.remove("active"); } });
            track.addEventListener("mousemove", (e) => { if (!isDragging) return; e.preventDefault(); const x = e.pageX - track.offsetLeft; const walk = (x - startX) * 1.5; track.scrollLeft = scrollStart - walk; });
            track.addEventListener("touchstart", (e) => { isDragging = true; startX = e.touches[0].pageX - track.offsetLeft; scrollStart = track.scrollLeft; }, { passive: true });
            track.addEventListener("touchmove", (e) => { if (!isDragging) return; const x = e.touches[0].pageX - track.offsetLeft; const walk = (x - startX) * 1.5; track.scrollLeft = scrollStart - walk; });
            track.addEventListener("touchend", () => { isDragging = false; });
            track.addEventListener("touchcancel", () => { isDragging = false; });
          } else if (prevBtn && nextBtn) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
          }
        }
      }
      initializeScrollObserver();
    } else if (document.querySelector(".section-title")) {
      initializeScrollObserver();
    }

    if(galerieSection){
      modal.addEventListener("click", function(event) {
        if (event.target === modal) {
            modal.style.display = "none"; // Masquer la modale
        }
      });
      await renderGalerie();
    }

  } catch (err) {
    console.error("Erreur de chargement global de l'application :", err);
    if (latestContainer) latestContainer.innerHTML = "<p>Impossible de charger les chapitres.</p>";
    if (seriesGridOngoing) seriesGridOngoing.innerHTML = "<p>Impossible de charger les séries.</p>";
    if (seriesGridOneShot) seriesGridOneShot.innerHTML = "<p>Impossible de charger les one-shots.</p>";
    if (seriesDetailSection) seriesDetailSection.innerHTML = "<p>Impossible de charger les détails de la série.</p>";
  }
}

bootstrap();