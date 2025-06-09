// js/pages/homepage.js
import { fetchAllSeriesData } from '../utils/fetchUtils.js';
import { slugify, maybeNewBadge, qs, qsa, limitVisibleTags } from '../utils/domUtils.js';
import { timeAgo, parseDateToTimestamp } from '../utils/dateUtils.js';
import { initCarousel } from '../components/carousel.js';

/**
 * Tronque un texte à une longueur maximale et ajoute "..." si nécessaire.
 * @param {string} text - Le texte à tronquer.
 * @param {number} maxLength - La longueur maximale avant troncature (incluant les "...").
 * @returns {string} Le texte tronqué ou original.
 */
function truncateText(text, maxLength) {
  if (typeof text !== 'string') return ''; // Gère le cas où text n'est pas une chaîne
  if (text.length > maxLength) {
    return text.substring(0, maxLength - 3) + "...";
  }
  return text;
}

function renderChapterCard(chapter) {
  if (!chapter || !chapter.url || !chapter.serieCover || !chapter.serieTitle || !chapter.title || !chapter.chapter || typeof chapter.last_updated_ts === 'undefined') return '';
  return `
    <div class="chapter-card" onclick="window.open('${chapter.url}', '_blank')">
      <div class="chapter-cover">
        <img src="${chapter.serieCover ? `${chapter.serieCover.slice(0, -4)}-m.jpg` : 'img/placeholder_preview.png'}" 
             alt="${chapter.serieTitle} – Cover" loading="lazy">
        ${maybeNewBadge(chapter.last_updated_ts, parseDateToTimestamp)}
      </div>
      <div class="chapter-info">
        <div class="manga-title">${chapter.serieTitle}</div>
        <div class="chapter-title">${chapter.title}</div>
        <div class="chapter-number">Chapitre ${chapter.chapter}</div>
        <div class="chapter-time"><i class="fas fa-clock"></i> ${timeAgo(chapter.last_updated_ts)}</div>
      </div>
    </div>`;
}

function renderSeriesCard(series) {
  if (!series || !series.chapters || !series.title || !series.cover) return '';
  const chaptersArray = Object.entries(series.chapters)
    .map(([chapNum, chapData]) => ({
      chapter: chapNum,
      ...chapData,
      last_updated_ts: parseDateToTimestamp(chapData.last_updated || 0),
      url: chapData.groups && chapData.groups.Big_herooooo !== '' ? `https://cubari.moe/read/gist/${series.base64Url}/${chapNum.replaceAll(".", "-")}/1/` : null
    }))
    .filter(chap => chap.url) // Garder seulement les chapitres avec une URL valide pour les "derniers chapitres"
    .sort((a, b) => b.last_updated_ts - a.last_updated_ts);

  let latestChapterAsButton = '', latestThreeChaptersHtml = '';
  if (chaptersArray.length > 0) {
    const latestChap = chaptersArray[0];
    const chapterTitleMobile = latestChap.title || 'Titre inconnu';
    const truncatedTitleMobile = truncateText(chapterTitleMobile, 25); // Ajuste 25 selon tes besoins

    latestChapterAsButton = `
      <div class="series-latest-chapters-container-mobile">
        <div class="series-chapter-item" ${latestChap.url ? `onclick="event.stopPropagation(); window.open('${latestChap.url}', '_blank')"` : ''}>
          <div class="series-chapter-item-main-info-mobile">
            <span class="chapter-number-small">Ch. ${latestChap.chapter}</span>
            <span class="chapter-title-small" title="${chapterTitleMobile}">${truncatedTitleMobile}</span>
          </div>
          <span class="chapter-date-small-mobile">${timeAgo(latestChap.last_updated_ts)}</span>
        </div>
      </div>`;

    latestThreeChaptersHtml = `
      <div class="series-latest-chapters-container-desktop">
        ${chaptersArray.slice(0, 3).map(chap => {
      const chapterTitleDesktop = chap.title || 'Titre inconnu';
      // const truncatedTitleDesktop = truncateText(chapterTitleDesktop, 40); // Optionnel pour desktop
      return `
            <div class="series-chapter-item-desktop" ${chap.url ? `onclick="event.stopPropagation(); window.open('${chap.url}', '_blank')"` : ''}>
              <span class="chapter-number-desktop">Ch. ${chap.chapter}</span>
              <span class="chapter-title-desktop" title="${chapterTitleDesktop}">${chapterTitleDesktop}</span>
              <span class="chapter-date-desktop">${timeAgo(chap.last_updated_ts)}</span>
            </div>`;
    }).join('')}
      </div>`;
  }

  const descriptionHtml = series.description ? `<div class="series-description">${series.description}</div>` : '';
  let authorString = '';
  if (series.author && series.artist && series.author !== series.artist) authorString = `<strong>Auteur :</strong> ${series.author} / <strong>Dess. :</strong> ${series.artist}`;
  else if (series.author) authorString = `<strong>Auteur :</strong> ${series.author}`;
  else if (series.artist) authorString = `<strong>Dess. :</strong> ${series.artist}`;
  let yearString = series.release_year ? `<strong>Année :</strong> ${series.release_year}` : '';
  let authorYearLineHtml = (authorString || yearString) ? `<div class="meta series-author-year-line">${authorString ? `<span class="series-author-info">${authorString}</span>` : ''}${authorString && yearString ? `<span class="meta-separator-card"></span>` : ''}${yearString ? `<span class="series-year-info">${yearString}</span>` : ''}</div>` : '';

  let tagsHtml = '';
  if (Array.isArray(series.tags) && series.tags.length > 0) {
    tagsHtml = `<div class="tags series-tags">${series.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>`;
  }

  // MODIFICATION ICI pour utiliser la "pretty URL"
  const seriesSlug = slugify(series.title);
  const detailPageUrl = `/series-detail/${seriesSlug}`; // Format: /series-detail/slug-de-la-serie

  return `
    <div class="series-card" onclick="window.location.href='${detailPageUrl}'">
      <div class="series-cover">
        <img src="${series.cover ? `${series.cover.slice(0, -4)}-s.jpg` : 'img/placeholder_preview.png'}" 
             alt="${series.title} – Cover" loading="lazy">
      </div>
      <div class="series-info">
        <div class="series-title">${series.title}</div>
        ${authorYearLineHtml}
        ${tagsHtml}
        ${descriptionHtml}
        ${latestChapterAsButton}
        ${latestThreeChaptersHtml}
      </div>
    </div>`;
}


export async function initHomepage() {
  const latestContainer = qs(".latest-chapters");
  const seriesGridOngoing = qs(".series-grid.on-going");
  const seriesGridOneShot = qs(".series-grid.one-shot");

  try {
    const allSeries = await fetchAllSeriesData();

    if (!Array.isArray(allSeries) || allSeries.length === 0) {
      console.warn("⚠️ Aucune série chargée pour la page d'accueil.");
      if (latestContainer) latestContainer.innerHTML = "<p>Aucune sortie récente pour le moment.</p>";
      if (seriesGridOngoing) seriesGridOngoing.innerHTML = "<p>Aucune série en cours pour le moment.</p>";
      if (seriesGridOneShot) seriesGridOneShot.innerHTML = "<p>Aucun one-shot pour le moment.</p>";
      return;
    }

    if (seriesGridOngoing) {
      const onGoingSeries = allSeries.filter(s => s && !s.completed && !s.os);
      seriesGridOngoing.innerHTML = onGoingSeries.length > 0
        ? onGoingSeries.map(renderSeriesCard).join("")
        : "<p>Aucune série en cours.</p>";
      qsa('.series-card .series-tags', seriesGridOngoing).forEach(container => {
        limitVisibleTags(container, 3, "plusN"); // ou "ellipsis"
      });
    }

    if (seriesGridOneShot) {
      const oneShots = allSeries.filter(s => s && s.os);
      seriesGridOneShot.innerHTML = oneShots.length > 0
        ? oneShots.map(renderSeriesCard).join("")
        : "<p>Aucun one-shot.</p>";
      qsa('.series-card .series-tags', seriesGridOneShot).forEach(container => {
        limitVisibleTags(container, 3, "plusN"); // ou "ellipsis"
      });
    }

    if (latestContainer) {
      const allChaptersForHomepage = allSeries.filter(s => s && s.chapters)
        .flatMap(s =>
          Object.entries(s.chapters).map(([cn, cd]) => {
            if (typeof cd === 'object' && cd !== null && cd.groups && cd.groups.Big_herooooo !== '') { // S'assurer qu'il y a un lien de lecture
              return {
                ...cd,
                serieTitle: s.title,
                serieCover: s.cover,
                chapter: cn,
                last_updated_ts: parseDateToTimestamp(cd.last_updated || 0),
                url: `https://cubari.moe/read/gist/${s.base64Url}/${cn.replaceAll(".", "-")}/1/`
              };
            }
            return null;
          })
        )
        .filter(Boolean)
        .sort((a, b) => b.last_updated_ts - a.last_updated_ts)
        .slice(0, 15);

      latestContainer.innerHTML = allChaptersForHomepage.length > 0
        ? allChaptersForHomepage.map(renderChapterCard).join("")
        : "<p>Aucune sortie récente.</p>";

      if (allChaptersForHomepage.length > 0) {
        initCarousel(".carousel-track.latest-chapters", ".carousel-prev", ".carousel-next");
      } else {
        const prevBtn = qs(".carousel-prev");
        const nextBtn = qs(".carousel-next");
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
      }
    }

  } catch (error) {
    console.error("🚨 Erreur lors de l'initialisation de la page d'accueil:", error);
    if (latestContainer) latestContainer.innerHTML = "<p>Erreur lors du chargement des chapitres.</p>";
    if (seriesGridOngoing) seriesGridOngoing.innerHTML = "<p>Erreur lors du chargement des séries.</p>";
    if (seriesGridOneShot) seriesGridOneShot.innerHTML = "<p>Erreur lors du chargement des one-shots.</p>";
  }
}