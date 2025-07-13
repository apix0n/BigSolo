// js/pages/series-detail.js
import { fetchAllSeriesData } from '../utils/fetchUtils.js';
import { slugify, qs, qsa } from '../utils/domUtils.js';
import { timeAgo, parseDateToTimestamp } from '../utils/dateUtils.js';

let currentSeriesData = null; // Stocke les données de la série actuelle
let currentSeriesAllChaptersRaw = [];
let currentVolumeSortOrder = 'desc';

// --- GESTION DES VUES IMGCHEST ---
let imgChestPostViewsCache = new Map();
let isLoadingImgChestViews = false;
let allImgChestViewsPreloadedAttempted = false;
const IMGCHEST_EXPECTED_POSTS_PER_PAGE = 24;

async function preloadAllImgChestViewsOnce() {
  if (allImgChestViewsPreloadedAttempted || isLoadingImgChestViews) return;

  isLoadingImgChestViews = true;

  try {
    const response = await fetch(`/api/imgchest-get-all-pages`);
    if (!response.ok) throw new Error(`Proxy request failed: ${response.status}`);
    const data = await response.json();

    if (Array.isArray(data.posts)) {
      data.posts.forEach(post => {
        if (post.id && typeof post.views !== 'undefined') {
          imgChestPostViewsCache.set(post.id, post.views);
        }
      });
    }

    allImgChestViewsPreloadedAttempted = true;
    updateAllVisibleChapterViews();

  } catch (error) {
    console.error(`[Views] Error fetching all pages combined:`, error);
  } finally {
    isLoadingImgChestViews = false;
  }
}


function updateAllVisibleChapterViews() {
  qsa('.detail-chapter-views[data-imgchest-id]').forEach(viewElement => {
    const postId = viewElement.dataset.imgchestId;
    if (imgChestPostViewsCache.has(postId)) {
      const views = imgChestPostViewsCache.get(postId);
      viewElement.innerHTML = `<i class="fas fa-eye"></i> ${views.toLocaleString('fr-FR')}`;
    } else if (allImgChestViewsPreloadedAttempted && !isLoadingImgChestViews) {
      viewElement.innerHTML = `<i class="fas fa-eye-slash" title="Vues non disponibles"></i>`;
    }
  });
}

// --- Fonctions de Rendu des Vues ---

function renderMangaView(seriesData, seriesSlug) {
  const container = qs("#series-detail-section");
  if (!container || !seriesData) return;

  currentSeriesAllChaptersRaw = Object.entries(seriesData.chapters || {}).map(([chapNum, chapData]) => ({
    chapter: chapNum, ...chapData, last_updated_ts: parseDateToTimestamp(chapData.last_updated || 0),
  }));

  const navTabsHtml = generateNavTabs(seriesData, seriesSlug, 'manga');
  const chaptersSectionHtml = `
    <div class="chapters-main-header">
      <h3 class="section-title">Liste des Chapitres</h3>
      <div class="chapter-sort-filter">
        <button id="sort-volumes-btn" class="sort-button" title="Trier les volumes">
          <i class="fas fa-sort-numeric-down-alt"></i>
        </button>
      </div>
    </div>
    <div class="chapters-accordion-container"></div>`;

  const titleHtml = `<h1 class="detail-title">${seriesData.title}</h1>`;
  const tagsHtml = (Array.isArray(seriesData.tags) && seriesData.tags.length > 0) ? `<div class="detail-tags">${seriesData.tags.map(t => `<span class="detail-tag">${t}</span>`).join("")}</div>` : "";
  let authorArtistHtml = '';
  const authorText = seriesData.author ? `<strong>Auteur :</strong> ${seriesData.author}` : '';
  const artistText = seriesData.artist ? `<strong>Dessinateur :</strong> ${seriesData.artist}` : '';
  if (seriesData.author && seriesData.artist) {
    if (seriesData.author === seriesData.artist) authorArtistHtml = `<p class="detail-meta">${authorText}</p>`;
    else authorArtistHtml = `<p class="detail-meta">${authorText} <span class="detail-artist-spacing">${artistText}</span></p>`;
  } else if (seriesData.author) authorArtistHtml = `<p class="detail-meta">${authorText}</p>`;
  else if (seriesData.artist) authorArtistHtml = `<p class="detail-meta">${artistText}</p>`;

  let metaDesktopHtml = [];
  if (seriesData.release_year) metaDesktopHtml.push(`<p><strong>Année :</strong> ${seriesData.release_year}</p>`);
  if (seriesData.release_status) metaDesktopHtml.push(`<p><strong>Statut :</strong> ${seriesData.release_status}</p>`);
  if (seriesData.manga_type) metaDesktopHtml.push(`<p><strong>Type :</strong> ${seriesData.manga_type}</p>`);
  if (seriesData.magazine) metaDesktopHtml.push(`<p><strong>Magazine :</strong> ${seriesData.magazine}</p>`);
  if (seriesData.alternative_titles && seriesData.alternative_titles.length > 0) metaDesktopHtml.push(`<p><strong>Titres alternatifs :</strong> ${seriesData.alternative_titles.join(', ')}</p>`);
  const additionalMetadataDesktop = `<div class="detail-additional-metadata">${metaDesktopHtml.join('')}</div>`;

  let metaMobileHtml = '';
  if (seriesData.release_year || seriesData.release_status) {
    let yearPart = seriesData.release_year ? `<strong>Année :</strong> ${seriesData.release_year}` : '';
    let statusPart = seriesData.release_status ? `<strong>Statut :</strong> ${seriesData.release_status}` : '';
    metaMobileHtml += `<p class="detail-meta detail-meta-flex-line"><span class="detail-meta-flex-prefix">${yearPart}</span><span class="detail-meta-flex-suffix">${statusPart}</span></p>`;
  }
  if (seriesData.manga_type || seriesData.magazine) {
    let typePart = seriesData.manga_type ? `<strong>Type :</strong> ${seriesData.manga_type}` : '';
    let magazinePart = seriesData.magazine ? `<strong>Magazine :</strong> ${seriesData.magazine}` : '';
    metaMobileHtml += `<p class="detail-meta detail-meta-flex-line"><span class="detail-meta-flex-prefix">${typePart}</span><span class="detail-meta-flex-suffix">${magazinePart}</span></p>`;
  }
  if (seriesData.alternative_titles && seriesData.alternative_titles.length > 0) metaMobileHtml += `<p class="detail-meta"><strong>Titres alt. :</strong> ${seriesData.alternative_titles.join(', ')}</p>`;

  const descriptionHtml = seriesData.description ? `<p class="detail-description">${seriesData.description.replace(/\n/g, '<br>')}</p>` : '';

  const mangaViewHtml = `
    <div class="series-detail-container">
      <div class="detail-top-layout-wrapper">
        <div class="detail-cover-wrapper">
          <img src="${seriesData.cover || '/img/placeholder_preview.png'}" alt="${seriesData.title} Cover" class="detail-cover" loading="lazy" referrerpolicy="no-referrer">
        </div>
        <div class="detail-all-info-column">
          <div class="detail-primary-info-wrapper">
            ${titleHtml}
            ${tagsHtml}
            ${authorArtistHtml}
          </div>
          <div class="detail-secondary-info-wrapper detail-secondary-desktop">
            ${additionalMetadataDesktop}
          </div>
        </div>
      </div>
      <div class="detail-secondary-info-wrapper detail-secondary-mobile">
        ${metaMobileHtml}
      </div>
      ${descriptionHtml}
    </div>
    ${navTabsHtml}
    ${chaptersSectionHtml}
  `;

  container.innerHTML = mangaViewHtml;
  document.title = `BigSolo – ${seriesData.title}`;

  displayGroupedChapters(seriesData, seriesSlug);
  preloadAllImgChestViewsOnce();

  const sortButton = qs('#sort-volumes-btn');
  if (sortButton && !sortButton.dataset.listenerAttached) {
    sortButton.addEventListener('click', function () {
      currentVolumeSortOrder = (currentVolumeSortOrder === 'desc') ? 'asc' : 'desc';
      this.querySelector('i').className = (currentVolumeSortOrder === 'desc') ? "fas fa-sort-numeric-down-alt" : "fas fa-sort-numeric-up-alt";
      displayGroupedChapters(seriesData, seriesSlug);
    });
    sortButton.dataset.listenerAttached = 'true';
  }
}

function renderEpisodesListView(seriesData, seriesSlug) {
  const container = qs("#series-detail-section");
  if (!container || !seriesData) return;

  const navTabsHtml = generateNavTabs(seriesData, seriesSlug, 'anime');
  const episodes = seriesData.episodes || [];

  let episodeListHtml = '<p>Aucun épisode disponible pour le moment.</p>';
  if (episodes.length > 0) {
    episodeListHtml = episodes.sort((a, b) => b.indice_ep - a.indice_ep)
      .map(ep => `
        <a href="/series-detail/${seriesSlug}/episodes/${ep.indice_ep}" class="detail-episode-item">
          <div class="episode-main-info">
            <span class="detail-episode-number">Épisode ${ep.indice_ep}</span>
            <span class="detail-episode-title">${ep.title_ep || 'Titre inconnu'}</span>
          </div>
          <span class="detail-episode-date">${timeAgo(ep.date_ep)}</span>
        </a>
      `).join('');
  }

  const episodesViewHtml = `
    ${generateAnimeHeader(seriesData, { 
        primaryInfoWrapperClasses: 'no-bottom-margin',
        additionalMetadataClasses: 'no-top-margin' 
    })}
    ${navTabsHtml}
    <div class="episodes-main-header">
        <h3 class="section-title">Liste des Épisodes</h3>
    </div>
    <div class="episode-list-container">
        ${episodeListHtml}
    </div>
  `;

  container.innerHTML = episodesViewHtml;
  document.title = `BigSolo – Épisodes de ${seriesData.title}`;
}

function renderEpisodePlayerView(seriesData, seriesSlug, episodeNumber) {
  const container = qs("#series-detail-section");
  if (!container || !seriesData) return;

  const episodes = seriesData.episodes || [];
  const currentEpisode = episodes.find(ep => ep.indice_ep == episodeNumber);

  if (!currentEpisode) {
    container.innerHTML = `<div class="episode-player-page error"><p>Épisode non trouvé.</p><a href="/series-detail/${seriesSlug}/episodes">Retour à la liste des épisodes</a></div>`;
    return;
  }

  const sortedEpisodes = [...episodes].sort((a, b) => a.indice_ep - b.indice_ep);
  const episodeListHtml = sortedEpisodes.map(ep => {
    const isActive = ep.indice_ep == episodeNumber ? 'active' : '';
    return `
      <a href="/series-detail/${seriesSlug}/episodes/${ep.indice_ep}" class="player-episode-item ${isActive}">
        <span class="player-episode-number">Épisode ${ep.indice_ep}</span>
        <span class="player-episode-title">${ep.title_ep || 'Titre inconnu'}</span>
      </a>
    `;
  }).join('');

  const currentIndex = sortedEpisodes.findIndex(ep => ep.indice_ep == episodeNumber);
  const prevEpisode = currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null;

  const prevButton = prevEpisode ? `<a href="/series-detail/${seriesSlug}/episodes/${prevEpisode.indice_ep}" class="episode-nav-button"><i class="fas fa-chevron-left"></i> Précédent</a>` : `<span class="episode-nav-button disabled"><i class="fas fa-chevron-left"></i> Précédent</span>`;
  const nextButton = nextEpisode ? `<a href="/series-detail/${seriesSlug}/episodes/${nextEpisode.indice_ep}" class="episode-nav-button">Suivant <i class="fas fa-chevron-right"></i></a>` : `<span class="episode-nav-button disabled">Suivant <i class="fas fa-chevron-right"></i></span>`;

  let embedUrl = '';
  if (currentEpisode.type === 'vidmoly' && currentEpisode.id) {
    embedUrl = `https://vidmoly.to/embed-${currentEpisode.id}.html`;
  }

  if (!embedUrl) {
    container.innerHTML = `<div class="episode-player-page error"><p>Le format de la vidéo pour cet épisode n'est pas supporté ou l'ID est manquant.</p></div>`;
    return;
  }

  const playerViewHtml = `
    <div class="episode-player-page">
      <div class="player-header">
        <a href="/series-detail/${seriesSlug}" class="player-series-title">${seriesData.title}</a>
        <h1 class="player-episode-main-title">Épisode ${currentEpisode.indice_ep} : ${currentEpisode.title_ep || ''}</h1>
      </div>
      <div class="player-layout-grid">
        <aside class="player-sidebar">
          <h3 class="sidebar-title">Épisodes</h3>
          <div class="player-episode-list-wrapper">
            ${episodeListHtml}
          </div>
        </aside>
        <div class="player-main-content">
          <div class="video-player-wrapper">
            <iframe src="${embedUrl}" scrolling="no" frameborder="0" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"></iframe>
          </div>
          <div class="episode-navigation">
              ${prevButton}
              <a href="/series-detail/${seriesSlug}/episodes" class="episode-nav-button list-button"><i class="fas fa-list-ul"></i> Liste des épisodes</a>
              ${nextButton}
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = playerViewHtml;
  document.title = `BigSolo – ${seriesData.title} - Épisode ${currentEpisode.indice_ep}`;

  const activeEpElement = qs('.player-episode-item.active');
  if (activeEpElement) {
    activeEpElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}


// --- Fonctions de Rendu des Composants Communs ---

function renderInlineThemeSong(song, type) {
  if (!song) return '';
  const typeShort = type === 'Opening' ? 'OP' : 'ED';
  const mobileTitle = song.title_op_fr_an || song.title_op_jp_an;
  const title_fr = song.title_op_fr_an || '';
  const title_jp = song.title_op_jp_an ? ` [${song.title_op_jp_an}]` : '';
  const author = song.author_op_an ? `<span class="inline-song-artist">Par ${song.author_op_an}</span>` : '';

  return `
      <a href="${song.youtube_url_op_an}" target="_blank" rel="noopener noreferrer" class="inline-song-button">
        <i class="fab fa-youtube inline-song-icon"></i>
        <div class="inline-song-info-desktop">
            <span class="inline-song-type">${type}</span>
            <span class="inline-song-title">${title_fr}${title_jp}</span>
            ${author}
        </div>
        <div class="inline-song-info-mobile">
            <span class="inline-song-type">${typeShort}</span>
            <span class="inline-song-title">${mobileTitle}</span>
        </div>
      </a>
    `;
}

function generateAnimeHeader(seriesData, options = {}) {
  if (!seriesData.anime || seriesData.anime.length === 0) {
    return generateSeriesHeader(seriesData);
  }
  const animeInfo = seriesData.anime[0];
  const titleHtml = `<h1 class="detail-title">${seriesData.title}</h1>`;
  const tags = animeInfo.tags || seriesData.tags;
  const description = animeInfo.description || seriesData.description;
  const tagsHtml = (Array.isArray(tags) && tags.length > 0) ? `<div class="detail-tags">${tags.map(t => `<span class="detail-tag">${t}</span>`).join("")}</div>` : "";
  const descriptionHtml = description ? `<p class="detail-description">${description.replace(/\n/g, '<br>')}</p>` : '';

  const openingsHtml = (animeInfo.op_an || []).map(song => renderInlineThemeSong(song, 'Opening')).join('');
  const endingsHtml = (animeInfo.ed_an || []).map(song => renderInlineThemeSong(song, 'Ending')).join('');
  const themeSongsButtonsHtml = (openingsHtml || endingsHtml) ? `<div class="inline-songs-container">${openingsHtml}${endingsHtml}</div>` : '';

  // --- HTML pour le bureau ---
  let metaDesktopList = [];
  if (animeInfo.type_an) metaDesktopList.push(`<p><strong>Type :</strong> ${animeInfo.type_an}</p>`);
  if (animeInfo.status_an) metaDesktopList.push(`<p><strong>Statut :</strong> ${animeInfo.status_an}</p>`);
  if (animeInfo.studios_an && animeInfo.studios_an.length > 0) metaDesktopList.push(`<p><strong>Studio(s) :</strong> ${animeInfo.studios_an.join(', ')}</p>`);
  if (animeInfo.date_start_an) metaDesktopList.push(`<p><strong>Début de diffusion :</strong> ${animeInfo.date_start_an}</p>`);
  const metaDesktopHtml = metaDesktopList.join('');

  // --- HTML spécifique pour le mobile (style flexbox) ---
  let animeMetaMobileHtml = '';
  if (animeInfo.type_an || animeInfo.status_an) {
    let typePart = animeInfo.type_an ? `<strong>Type :</strong> ${animeInfo.type_an}` : '';
    let statusPart = animeInfo.status_an ? `<strong>Statut :</strong> ${animeInfo.status_an}` : '';
    animeMetaMobileHtml += `<p class="detail-meta detail-meta-flex-line"><span class="detail-meta-flex-prefix">${typePart}</span><span class="detail-meta-flex-suffix">${statusPart}</span></p>`;
  }
  if (animeInfo.studios_an || animeInfo.date_start_an) {
    let studiosPart = animeInfo.studios_an ? `<strong>Studio(s) :</strong> ${animeInfo.studios_an.join(', ')}` : '';
    let datePart = animeInfo.date_start_an ? `<strong>Début :</strong> ${animeInfo.date_start_an}` : '';
    animeMetaMobileHtml += `<p class="detail-meta detail-meta-flex-line"><span class="detail-meta-flex-prefix">${studiosPart}</span><span class="detail-meta-flex-suffix">${datePart}</span></p>`;
  }

  // Ajout des classes conditionnelles
  const primaryInfoWrapperClasses = options.primaryInfoWrapperClasses || '';
  const additionalMetadataClasses = options.additionalMetadataClasses || '';

  return `
    <div class="series-detail-container anime-view">
      <div class="detail-top-layout-wrapper">
        <div class="detail-cover-wrapper">
            <img src="${animeInfo.cover_an || seriesData.cover || '/img/placeholder_preview.png'}" alt="${seriesData.title} Anime Cover" class="detail-cover" loading="lazy" referrerpolicy="no-referrer">
        </div>
        <div class="detail-all-info-column">
          <div class="detail-primary-info-wrapper ${primaryInfoWrapperClasses}">
            ${titleHtml}
            ${tagsHtml}
          </div>
          <div class="anime-additional-metadata ${additionalMetadataClasses}">
            ${metaDesktopHtml}
            ${themeSongsButtonsHtml}
          </div>
        </div>
      </div>
      
      <!-- Bloc d'informations spécifique pour le mobile -->
      <div class="anime-secondary-info-mobile">
        ${animeMetaMobileHtml}
        ${themeSongsButtonsHtml}
      </div>

      <!-- La description est maintenant gérée ici -->
      ${descriptionHtml}
    </div>
  `;
}

function generateSeriesHeader(s) {
  const titleHtml = `<h1 class="detail-title">${s.title}</h1>`;
  const tagsHtml = (Array.isArray(s.tags) && s.tags.length > 0) ? `<div class="detail-tags">${s.tags.map(t => `<span class="detail-tag">${t}</span>`).join("")}</div>` : "";
  let authorArtistHtml = '';
  const authorText = s.author ? `<strong>Auteur :</strong> ${s.author}` : '';
  const artistText = s.artist ? `<strong>Dessinateur :</strong> ${s.artist}` : '';
  if (s.author && s.artist) authorArtistHtml = `<p class="detail-meta">${authorText}${s.author !== s.artist ? `<span class="detail-artist-spacing">${artistText}</span>` : ''}</p>`;
  else if (s.author) authorArtistHtml = `<p class="detail-meta">${authorText}</p>`;
  else if (s.artist) authorArtistHtml = `<p class="detail-meta">${artistText}</p>`;

  return `
    <div class="series-detail-container">
      <div class="detail-top-layout-wrapper">
        <div class="detail-cover-wrapper">
            <img src="${s.cover || '/img/placeholder_preview.png'}" alt="${s.title} Cover" class="detail-cover" loading="lazy" referrerpolicy="no-referrer">
        </div>
        <div class="detail-all-info-column">
          <div class="detail-primary-info-wrapper">
            ${titleHtml}
            ${tagsHtml}
            ${authorArtistHtml}
          </div>
        </div>
      </div>
    </div>`;
}

function generateNavTabs(seriesData, seriesSlug, activeTab) {
  const hasEpisodes = seriesData.episodes && seriesData.episodes.length > 0;
  if (!hasEpisodes) return '';
  return `
      <div class="detail-navigation-tabs">
        <a href="/series-detail/${seriesSlug}" class="detail-nav-button ${activeTab === 'manga' ? 'active' : ''}">Manga</a>
        <a href="/series-detail/${seriesSlug}/episodes" class="detail-nav-button ${activeTab === 'anime' ? 'active' : ''}">Anime</a>
      </div>
    `;
}

// --- Fonctions de Tri et de Gestion des Chapitres ---

function renderChaptersListForVolume(chaptersToRender, seriesSlug) {
  return chaptersToRender.map(c => {
    const isLicensed = c.licencied && c.licencied.length > 0 && (!c.groups || c.groups.Big_herooooo === '');
    const chapterClass = isLicensed ? 'detail-chapter-item licensed-chapter-item' : 'detail-chapter-item';
    let clickAction = '';
    let dataHref = '';
    let viewsHtml = '';

    if (!isLicensed && c.groups && c.groups.Big_herooooo) {
      const chapterNumberForLink = String(c.chapter).replaceAll(".", "-");
      dataHref = `/series-detail/${seriesSlug}/${chapterNumberForLink}`;
      clickAction = `data-internal-redirect-href="${dataHref}"`;
      if (c.groups.Big_herooooo.includes('/proxy/api/imgchest/chapter/')) {
        const parts = c.groups.Big_herooooo.split('/');
        const imgchestPostId = parts[parts.length - 1];
        viewsHtml = `<span class="detail-chapter-views" data-imgchest-id="${imgchestPostId}"><i class="fas fa-circle-notch fa-spin"></i></span>`;
      }
    }
    const collabHtml = c.collab ? `<span class="detail-chapter-collab">${c.collab}</span>` : '';
    return `
      <div class="${chapterClass}" ${clickAction} ${dataHref ? `data-href="${dataHref}"` : ''} role="link" tabindex="0">
        <div class="chapter-main-info">
          <span class="detail-chapter-number">Chapitre ${c.chapter}</span>
          <span class="detail-chapter-title">${c.title || 'Titre inconnu'}</span>
        </div>
        <div class="chapter-side-info">
          ${viewsHtml}
          ${collabHtml}
          <span class="detail-chapter-date">${timeAgo(c.last_updated_ts)}</span>
        </div>
      </div>`;
  }).join('');
}

function displayGroupedChapters(seriesData, seriesSlug) {
  const chaptersContainer = qs(".chapters-accordion-container");
  if (!chaptersContainer) return;
  if (!currentSeriesAllChaptersRaw || currentSeriesAllChaptersRaw.length === 0) {
    chaptersContainer.innerHTML = "<p>Aucun chapitre à afficher.</p>";
    return;
  }
  let grouped = new Map();
  let volumeLicenseInfo = new Map();
  currentSeriesAllChaptersRaw.forEach(chap => {
    const volKey = chap.volume && String(chap.volume).trim() !== '' ? String(chap.volume).trim() : 'hors_serie';
    if (!grouped.has(volKey)) grouped.set(volKey, []);
    grouped.get(volKey).push(chap);
    if (chap.licencied && chap.licencied.length > 0 && (!chap.groups || chap.groups.Big_herooooo === '')) {
      if (!volumeLicenseInfo.has(volKey)) volumeLicenseInfo.set(volKey, chap.licencied);
    }
  });
  for (const [, chapters] of grouped.entries()) {
    chapters.sort((a, b) => {
      const chapA = parseFloat(String(a.chapter).replace(',', '.'));
      const chapB = parseFloat(String(b.chapter).replace(',', '.'));
      let comparison = currentVolumeSortOrder === 'desc' ? chapB - chapA : chapA - chapB;
      if (comparison === 0) return (a.title || "").localeCompare(b.title || "");
      return comparison;
    });
  }
  let sortedVolumeKeys = [...grouped.keys()].sort((a, b) => {
    const isAHorsSerie = a === 'hors_serie';
    const isBHorsSerie = b === 'hors_serie';
    if (isAHorsSerie && isBHorsSerie) return 0;
    if (currentVolumeSortOrder === 'asc') {
      if (isAHorsSerie) return 1;
      if (isBHorsSerie) return -1;
    } else {
      if (isAHorsSerie) return -1;
      if (isBHorsSerie) return 1;
    }
    const numA = parseFloat(String(a).replace(',', '.'));
    const numB = parseFloat(String(b).replace(',', '.'));
    return currentVolumeSortOrder === 'desc' ? numB - numA : numA - numB;
  });
  let html = '';
  sortedVolumeKeys.forEach(volKey => {
    const volumeDisplayName = volKey === 'hors_serie' ? 'Hors-série' : `Volume ${volKey}`;
    const chaptersInVolume = grouped.get(volKey);
    const licenseDetails = volumeLicenseInfo.get(volKey);
    const isActiveByDefault = true;
    let volumeHeaderContent = `<h4 class="volume-title-main">${volumeDisplayName}</h4>`;
    if (licenseDetails) {
      volumeHeaderContent += `<div class="volume-license-details"><span class="volume-license-text">Ce volume est disponible en format papier, vous pouvez le commander</span><a href="${licenseDetails[0]}" target="_blank" rel="noopener noreferrer" class="volume-license-link">juste ici !</a>${licenseDetails[1] ? `<span class="volume-release-date">${licenseDetails[1]}</span>` : ''}</div>`;
    }
    html += `<div class="volume-group"><div class="volume-header ${isActiveByDefault ? 'active' : ''}" data-volume="${volKey}">${volumeHeaderContent}<i class="fas fa-chevron-down volume-arrow ${isActiveByDefault ? 'rotated' : ''}"></i></div><div class="volume-chapters-list">${renderChaptersListForVolume(chaptersInVolume, seriesSlug)}</div></div>`;
  });
  chaptersContainer.innerHTML = html;
  updateAllVisibleChapterViews();
  qsa('.volume-group', chaptersContainer).forEach(group => {
    const header = group.querySelector('.volume-header');
    const content = group.querySelector('.volume-chapters-list');
    const arrow = header.querySelector('.volume-arrow');
    if (!header || !content) return;
    if (header.classList.contains('active')) content.style.maxHeight = content.scrollHeight + "px";
    else content.style.maxHeight = "0px";
    header.addEventListener('click', () => {
      header.classList.toggle('active');
      if (arrow) arrow.classList.toggle('rotated');
      if (header.classList.contains('active')) content.style.maxHeight = content.scrollHeight + "px";
      else content.style.maxHeight = "0px";
    });
  });
}

/**
 * Fonction principale qui analyse l'URL et appelle la bonne fonction de rendu.
 */
export async function initSeriesDetailPage() {
  const seriesDetailSection = qs("#series-detail-section");
  if (!seriesDetailSection) return;

  const pathSegments = window.location.pathname.split('/').filter(p => p !== '');

  if (pathSegments.length < 2 || pathSegments[0] !== 'series-detail') {
    seriesDetailSection.innerHTML = `<p>URL de la série non reconnue.</p>`;
    return;
  }

  const seriesSlug = pathSegments[1];
  let view = 'manga';
  let episodeNumber = null;
  let chapterNumber = null;

  if (pathSegments.length > 2) {
    if (pathSegments[2] === 'episodes') {
      view = 'episodes_list';
      if (pathSegments.length > 3) {
        view = 'episode_player';
        episodeNumber = pathSegments[3];
      }
    } else {
      view = 'chapter_redirect';
      chapterNumber = pathSegments[2];
    }
  }

  try {
    const allSeries = await fetchAllSeriesData();
    currentSeriesData = allSeries.find(s => slugify(s.title) === seriesSlug);

    if (currentSeriesData) {
      if (view === 'chapter_redirect' && chapterNumber) {
        seriesDetailSection.innerHTML = `<p class="loading-message">Redirection vers le chapitre ${chapterNumber}...</p>`;
        const chapterUrl = `https://cubari.moe/read/gist/${currentSeriesData.base64Url}/${String(chapterNumber).replaceAll(".", "-")}/1/`;
        window.location.href = chapterUrl;
        return;
      }

      if (view === 'manga') {
        renderMangaView(currentSeriesData, seriesSlug);
      } else if (view === 'episodes_list') {
        renderEpisodesListView(currentSeriesData, seriesSlug);
      } else if (view === 'episode_player') {
        renderEpisodePlayerView(currentSeriesData, seriesSlug, episodeNumber);
      }
    } else {
      seriesDetailSection.innerHTML = `<p>Série avec l'identifiant "${seriesSlug}" non trouvée.</p>`;
      document.title = `BigSolo – Série non trouvée`;
    }
  } catch (error) {
    console.error("🚨 Erreur lors de l'initialisation de la page de détail de série:", error);
    seriesDetailSection.innerHTML = "<p>Erreur lors du chargement des détails de la série.</p>";
  }

  document.body.addEventListener('click', async function (event) {
    let targetElement = event.target.closest('.detail-chapter-item[data-internal-redirect-href]');
    if (targetElement) {
      event.preventDefault();
      const prettyUrlPath = targetElement.getAttribute('data-internal-redirect-href');
      if (prettyUrlPath) {
        window.location.pathname = prettyUrlPath;
      }
    }
  });
}