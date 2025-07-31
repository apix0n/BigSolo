// js/pages/series-detail/mangaView.js
import { qs, qsa } from '../../utils/domUtils.js';
import { timeAgo, parseDateToTimestamp } from '../../utils/dateUtils.js';
import { preloadAllImgChestViewsOnce, updateAllVisibleChapterViews } from './imgchestViews.js';
import { generateNavTabs, generateSeriesHeader } from './components.js';
import { initMainScrollObserver } from '../../components/observer.js';

let currentVolumeSortOrder = 'desc';

// --- FONCTIONS DE GESTION DE LA LECTURE ---
function saveReadingProgress(seriesSlug, chapterNumber) {
    if (!seriesSlug || !chapterNumber) return;
    try {
        localStorage.setItem(`reading_progress_${seriesSlug}`, chapterNumber.toString());
    } catch (e) {
        console.error("Erreur lors de la sauvegarde de la progression:", e);
    }
}

function getReadingProgress(seriesSlug) {
    try {
        return localStorage.getItem(`reading_progress_${seriesSlug}`);
    } catch (e) {
        console.error("Erreur lors de la lecture de la progression:", e);
        return null;
    }
}

function renderReadingActions(seriesData, seriesSlug) {
    const container = qs("#reading-actions-container");
    if (!container) return;

    const chapters = Object.entries(seriesData.chapters || {})
        .filter(([, chapData]) => chapData.groups && chapData.groups.Big_herooooo)
        .map(([chapNum]) => chapNum);

    chapters.sort((a, b) => parseFloat(String(a).replace(',', '.')) - parseFloat(String(b).replace(',', '.')));

    if (chapters.length === 0) {
        container.innerHTML = '';
        return;
    }

    const lastReadChapter = getReadingProgress(seriesSlug);
    const lastChapter = chapters[chapters.length - 1];
    let nextChapter = null;

    if (lastReadChapter) {
        const lastReadIndex = chapters.indexOf(lastReadChapter);
        if (lastReadIndex !== -1 && lastReadIndex < chapters.length - 1) {
            nextChapter = chapters[lastReadIndex + 1];
        }
    }

    // MODIFIÉ : Liens internes pour les boutons
    const lastChapterUrl = `/${seriesSlug}/${String(lastChapter).replaceAll(".", "-")}`;
    const nextChapterUrl = nextChapter ? `/${seriesSlug}/${String(nextChapter).replaceAll(".", "-")}` : null;

    let buttonsHtml = '';
    
    if (nextChapterUrl) {
        buttonsHtml += `<a href="${nextChapterUrl}" class="reading-action-button continue"><i class="fas fa-play"></i> Continuer (Ch. ${nextChapter})</a>`;
    } else if (lastReadChapter && lastReadChapter === lastChapter) {
        buttonsHtml += `<span class="reading-action-button disabled"><i class="fas fa-check"></i> À jour</span>`;
    }

    if (!lastReadChapter || lastReadChapter !== lastChapter) {
         buttonsHtml += `<a href="${lastChapterUrl}" class="reading-action-button start"><i class="fas fa-fast-forward"></i> Dernier Chapitre (Ch. ${lastChapter})</a>`;
    }

    container.innerHTML = buttonsHtml;
}


// --- Fonctions de rendu ---
function renderChaptersListForVolume(chaptersToRender, seriesSlug, series) {
    return chaptersToRender.map(c => {
      const isLicensed = c.licencied && c.licencied.length > 0 && (!c.groups || c.groups.Big_herooooo === '');
      const chapterClass = isLicensed ? 'detail-chapter-item licensed-chapter-item' : 'detail-chapter-item';
      let href = '';
      let viewsHtml = '';
  
      if (!isLicensed && c.groups && c.groups.Big_herooooo) {
        // --- MODIFICATION PRINCIPALE ICI ---
        // Le lien pointe maintenant vers le lecteur interne
        href = `/${seriesSlug}/${String(c.chapter).replaceAll(".", "-")}`;
        
        if (c.groups.Big_herooooo.includes('/proxy/api/imgchest/chapter/')) {
          const parts = c.groups.Big_herooooo.split('/');
          const imgchestPostId = parts[parts.length - 1];
          viewsHtml = `<span class="detail-chapter-views" data-imgchest-id="${imgchestPostId}"><i class="fas fa-circle-notch fa-spin"></i></span>`;
        }
      }
      const collabHtml = c.collab ? `<span class="detail-chapter-collab">${c.collab}</span>` : '';
      
      // On retire target="_blank" pour que le lien s'ouvre dans le même onglet
      return `
        <a ${href ? `href="${href}"` : ''} class="${chapterClass}" data-chapter-number="${c.chapter}">
          <div class="chapter-main-info">
            <span class="detail-chapter-number">Chapitre ${c.chapter}</span>
            <span class="detail-chapter-title">${c.title || 'Titre inconnu'}</span>
          </div>
          <div class="chapter-side-info">
            ${viewsHtml}
            ${collabHtml}
            <span class="detail-chapter-date">${timeAgo(c.last_updated_ts)}</span>
          </div>
        </a>`;
    }).join('');
}
  
function displayGroupedChapters(seriesData, seriesSlug) {
    const chaptersContainer = qs(".chapters-accordion-container");
    if (!chaptersContainer) return;

    const currentSeriesAllChaptersRaw = Object.entries(seriesData.chapters || {}).map(([chapNum, chapData]) => ({
        chapter: chapNum, ...chapData, last_updated_ts: parseDateToTimestamp(chapData.last_updated || 0),
    }));

    if (currentSeriesAllChaptersRaw.length === 0) {
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
            return currentVolumeSortOrder === 'desc' ? chapB - chapA : chapA - chapB;
        });
    }

    let sortedVolumeKeys = [...grouped.keys()].sort((a, b) => {
        const isAHorsSerie = a === 'hors_serie';
        const isBHorsSerie = b === 'hors_serie';
        
        if (isAHorsSerie || isBHorsSerie) {
            if (isAHorsSerie && !isBHorsSerie) {
                return currentVolumeSortOrder === 'desc' ? -1 : 1;
            }
            if (!isAHorsSerie && isBHorsSerie) {
                return currentVolumeSortOrder === 'desc' ? 1 : -1;
            }
            return 0;
        }
        
        const numA = parseFloat(String(a).replace(',', '.'));
        const numB = parseFloat(String(b).replace(',', '.'));
        return currentVolumeSortOrder === 'desc' ? numB - numA : numA - numB;
    });

    chaptersContainer.innerHTML = sortedVolumeKeys.map(volKey => {
        const volumeDisplayName = volKey === 'hors_serie' ? 'Hors-série' : `Volume ${volKey}`;
        const chaptersInVolume = grouped.get(volKey);
        const licenseDetails = volumeLicenseInfo.get(volKey);
        const isActiveByDefault = true;
        let volumeHeaderContent = `<h4 class="volume-title-main">${volumeDisplayName}</h4>`;
        if (licenseDetails) {
            volumeHeaderContent += `<div class="volume-license-details"><span class="volume-license-text">Disponible en papier, commandez-le</span><a href="${licenseDetails[0]}" target="_blank" rel="noopener noreferrer" class="volume-license-link">ici !</a>${licenseDetails[1] ? `<span class="volume-release-date">${licenseDetails[1]}</span>` : ''}</div>`;
        }
        return `<div class="volume-group"><div class="volume-header ${isActiveByDefault ? 'active' : ''}" data-volume="${volKey}">${volumeHeaderContent}<i class="fas fa-chevron-down volume-arrow ${isActiveByDefault ? 'rotated' : ''}"></i></div><div class="volume-chapters-list">${renderChaptersListForVolume(chaptersInVolume, seriesSlug, seriesData)}</div></div>`;
    }).join('');

    updateAllVisibleChapterViews();
    
    qsa('.volume-group', chaptersContainer).forEach(group => {
        const header = group.querySelector('.volume-header');
        const content = group.querySelector('.volume-chapters-list');
        const arrow = header.querySelector('.volume-arrow');
        if (!header || !content || !arrow) return;
        
        content.style.maxHeight = header.classList.contains('active') ? content.scrollHeight + "px" : "0px";
        
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            arrow.classList.toggle('rotated');
            content.style.maxHeight = header.classList.contains('active') ? content.scrollHeight + "px" : "0px";
        });
    });
}

export function renderMangaView(seriesData, seriesSlug) {
    const container = qs("#series-detail-section");
    if (!container || !seriesData) return;

    const navTabsHtml = generateNavTabs(seriesData, seriesSlug, 'manga');
    const chaptersSectionHtml = `
      <div id="chapters-list-section" class="chapters-main-header">
        <h3 class="section-title">Liste des Chapitres</h3>
        <div class="chapter-sort-filter">
          <button id="sort-volumes-btn" class="sort-button" title="Trier les volumes">
            <i class="fas fa-sort-numeric-down-alt"></i>
          </button>
        </div>
      </div>
      <div class="chapters-accordion-container"></div>`;
  
    container.innerHTML = `
      ${generateSeriesHeader(seriesData)}
      <div id="reading-actions-container"></div>
      ${navTabsHtml}
      ${chaptersSectionHtml}
    `;
    
    document.title = `BigSolo – ${seriesData.title}`;
  
    renderReadingActions(seriesData, seriesSlug);
    displayGroupedChapters(seriesData, seriesSlug);
    preloadAllImgChestViewsOnce();
  
    const sortButton = qs('#sort-volumes-btn');
    if (sortButton) {
      sortButton.addEventListener('click', function () {
        currentVolumeSortOrder = (currentVolumeSortOrder === 'desc') ? 'asc' : 'desc';
        this.querySelector('i').className = (currentVolumeSortOrder === 'desc') ? "fas fa-sort-numeric-down-alt" : "fas fa-sort-numeric-up-alt";
        displayGroupedChapters(seriesData, seriesSlug);
      });
    }

    const chapterListContainer = qs('.chapters-accordion-container');
    if (chapterListContainer) {
        chapterListContainer.addEventListener('click', (e) => {
            const chapterLink = e.target.closest('a.detail-chapter-item');
            if (chapterLink && chapterLink.dataset.chapterNumber) {
                saveReadingProgress(seriesSlug, chapterLink.dataset.chapterNumber);
            }
        });
    }
    
    initMainScrollObserver();
}