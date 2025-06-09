// js/pages/series-detail.js
import { fetchAllSeriesData } from '../utils/fetchUtils.js';
import { slugify, qs, qsa } from '../utils/domUtils.js';
import { timeAgo, parseDateToTimestamp } from '../utils/dateUtils.js';
// initMainScrollObserver est appelé globalement depuis index.js

let currentSeriesAllChaptersRaw = []; // Stocke les chapitres pour le tri
let currentVolumeSortOrder = 'desc'; // État du tri des volumes

function renderChaptersListForVolume(chaptersToRender) {
  return chaptersToRender.map(c => {
    const isLicensed = c.licencied && c.licencied.length > 0 && (!c.groups || c.groups.Big_herooooo === '');
    const chapterClass = isLicensed ? 'detail-chapter-item licensed-chapter-item' : 'detail-chapter-item';
    const clickAction = isLicensed || !c.url ? '' : `onclick="window.open('${c.url}', '_blank')"`;
    const collabHtml = c.collab ? `<span class="detail-chapter-collab">${c.collab}</span>` : '';
    return `
      <div class="${chapterClass}" ${clickAction}>
        <div class="chapter-main-info">
          <span class="detail-chapter-number">Chapitre ${c.chapter}</span>
          <span class="detail-chapter-title">${c.title || 'Titre inconnu'}</span>
        </div>
        <div class="chapter-side-info">
          ${collabHtml}
          <span class="detail-chapter-date">${timeAgo(c.last_updated_ts)}</span>
        </div>
      </div>`;
  }).join('');
}

let openVolumesState = new Set();

function displayGroupedChapters() {
  console.log("[displayGroupedChapters] Début. Ordre actuel:", currentVolumeSortOrder);
  const chaptersContainer = qs(".chapters-accordion-container");
  if (!chaptersContainer) {
    console.error("[displayGroupedChapters] Conteneur .chapters-accordion-container non trouvé.");
    return;
  }
  if (!currentSeriesAllChaptersRaw || currentSeriesAllChaptersRaw.length === 0) {
    console.warn("[displayGroupedChapters] Pas de chapitres bruts à afficher (currentSeriesAllChaptersRaw est vide).");
    chaptersContainer.innerHTML = "<p>Aucun chapitre à afficher pour cette série.</p>"; // Message si pas de chapitres
    return;
  }

  let grouped = new Map();
  let volumeLicenseInfo = new Map();

  currentSeriesAllChaptersRaw.forEach(chap => {
    const volKey = chap.volume && String(chap.volume).trim() !== '' ? String(chap.volume).trim() : 'hors_serie';
    if (!grouped.has(volKey)) {
      grouped.set(volKey, []);
    }
    grouped.get(volKey).push(chap);

    if (chap.licencied && chap.licencied.length > 0 && (!chap.groups || chap.groups.Big_herooooo === '')) {
      if (!volumeLicenseInfo.has(volKey)) {
        volumeLicenseInfo.set(volKey, chap.licencied);
      }
    }
  });

  for (const [, chapters] of grouped.entries()) {
    chapters.sort((a, b) => {
      const chapA = parseFloat(String(a.chapter).replace(',', '.'));
      const chapB = parseFloat(String(b.chapter).replace(',', '.'));

      let comparison = 0;
      if (currentVolumeSortOrder === 'desc') {
        comparison = chapB - chapA; // Ordre décroissant pour les chapitres
      } else { // asc
        comparison = chapA - chapB; // Ordre croissant pour les chapitres
      }

      // Si les numéros de chapitre sont égaux (ex: chapitres .5, ou si pas de partie décimale),
      // trier par titre comme critère secondaire stable.
      // L'ordre du critère secondaire reste le même (alphabétique) quel que soit le tri principal.
      if (comparison === 0) {
        return (a.title || "").localeCompare(b.title || "");
      }
      return comparison;
    });
  }

  let sortedVolumeKeys = [...grouped.keys()].sort((a, b) => {
    // ... (logique de tri des volumes avec gestion de "hors_serie" comme avant) ...
    const isAHorsSerie = a === 'hors_serie';
    const isBHorsSerie = b === 'hors_serie';

    if (currentVolumeSortOrder === 'asc') {
      if (isAHorsSerie && !isBHorsSerie) return 1;
      if (!isAHorsSerie && isBHorsSerie) return -1;
    } else {
      if (isAHorsSerie && !isBHorsSerie) return -1;
      if (!isAHorsSerie && isBHorsSerie) return 1;
    }
    if (isAHorsSerie && isBHorsSerie) return 0;

    const numA = parseFloat(String(a).replace(',', '.'));
    const numB = parseFloat(String(b).replace(',', '.'));

    if (currentVolumeSortOrder === 'desc') {
      return numB - numA;
    } else {
      return numA - numB;
    }
  });
  console.log("[displayGroupedChapters] Volumes triés:", sortedVolumeKeys);

  let html = '';
  sortedVolumeKeys.forEach(volKey => {
    const volumeDisplayName = volKey === 'hors_serie' ? 'Hors-série' : `Volume ${volKey}`;
    const chaptersInVolume = grouped.get(volKey);
    const licenseDetails = volumeLicenseInfo.get(volKey);

    // Par défaut, tous les volumes sont générés comme 'actifs' (ouverts) pour voir l'effet du tri.
    // Si tu veux une persistance de l'état ouvert/fermé, cette logique devra être plus complexe.
    const isActiveByDefault = true;

    let volumeHeaderContent = `<h4 class="volume-title-main">${volumeDisplayName}</h4>`;
    if (licenseDetails) {
      volumeHeaderContent += `
        <div class="volume-license-details">
            <span class="volume-license-text">Ce volume est disponible en format papier, vous pouvez le commander</span>
            <a href="${licenseDetails[0]}" target="_blank" rel="noopener noreferrer" class="volume-license-link">juste ici !</a>
            ${licenseDetails[1] ? `<span class="volume-release-date">${licenseDetails[1]}</span>` : ''}
        </div>`;
    }

    html += `
      <div class="volume-group">
        <div class="volume-header ${isActiveByDefault ? 'active' : ''}" data-volume="${volKey}">
          ${volumeHeaderContent}
          <i class="fas fa-chevron-down volume-arrow ${isActiveByDefault ? 'rotated' : ''}"></i>
        </div>
        <div class="volume-chapters-list">
          ${renderChaptersListForVolume(chaptersInVolume)}
        </div>
      </div>`;
  });

  chaptersContainer.innerHTML = html;
  console.log("[displayGroupedChapters] HTML injecté dans .chapters-accordion-container");

  // Réattacher les écouteurs et gérer l'état ouvert/fermé
  qsa('.volume-group', chaptersContainer).forEach(group => {
    const header = group.querySelector('.volume-header');
    const content = group.querySelector('.volume-chapters-list');
    const arrow = header.querySelector('.volume-arrow');

    if (!header || !content) return; // Sécurité

    // Appliquer le maxHeight basé sur la classe 'active' initiale (ajoutée dans le HTML ci-dessus)
    if (header.classList.contains('active')) {
      content.style.maxHeight = content.scrollHeight + "px";
    } else {
      content.style.maxHeight = "0px";
    }

    // Nettoyer les anciens écouteurs n'est pas nécessaire ici car on remplace innerHTML,
    // ce qui supprime les anciens éléments et leurs écouteurs.
    // Mais on s'assure de ne pas en ajouter plusieurs si cette fonction était appelée différemment.
    // Cependant, avec innerHTML, le dataset.listenerAttached n'est pas vraiment utile ici.

    header.addEventListener('click', () => {
      const isActive = header.classList.contains('active'); // État AVANT le toggle

      // Basculer l'état
      header.classList.toggle('active');
      if (arrow) arrow.classList.toggle('rotated');

      // Mettre à jour maxHeight
      if (header.classList.contains('active')) { // Si MAINTENANT actif (on l'ouvre)
        content.style.maxHeight = content.scrollHeight + "px";
        // console.log(`[Accordion] Ouverture Volume ${header.dataset.volume}, maxHeight: ${content.style.maxHeight}`);
      } else { // Si MAINTENANT inactif (on le ferme)
        content.style.maxHeight = "0px";
        // console.log(`[Accordion] Fermeture Volume ${header.dataset.volume}, maxHeight: ${content.style.maxHeight}`);
      }
    });
  });
  console.log("[displayGroupedChapters] Écouteurs d'accordéon réattachés.");
}

function renderSeriesDetailPageContent(s) {
  console.log("== Début de renderSeriesDetailPageContent ==");
  const seriesDetailSection = qs("#series-detail-section");
  if (!seriesDetailSection || !s || !s.chapters) {
    if (seriesDetailSection) seriesDetailSection.innerHTML = "<p>Données de série invalides ou série non trouvée.</p>";
    return;
  }

  currentSeriesAllChaptersRaw = Object.entries(s.chapters).map(([chapNum, chapData]) => ({
    chapter: chapNum,
    ...chapData,
    last_updated_ts: parseDateToTimestamp(chapData.last_updated || 0),
    url: (chapData.groups && chapData.groups.Big_herooooo !== '') ? `https://cubari.moe/read/gist/${s.base64Url}/${chapNum.replaceAll(".", "-")}/1/` : null
  }));

  const titleHtml = `<h1 class="detail-title">${s.title}</h1>`;
  const tagsHtml = (Array.isArray(s.tags) && s.tags.length > 0) ? `<div class="detail-tags">${s.tags.map(t => `<span class="detail-tag">${t}</span>`).join("")}</div>` : "";

  let authorArtistHtml = '';
  const authorText = s.author ? `<strong>Auteur :</strong> ${s.author}` : '';
  const artistText = s.artist ? `<strong>Dessinateur :</strong> ${s.artist}` : '';

  if (s.author && s.artist) {
    if (s.author === s.artist) { // S'ils sont identiques
      authorArtistHtml = `<p class="detail-meta">${authorText} <span class="detail-artist-spacing">${artistText}</span></p>`; // Ou juste `authorText` si tu ne veux pas la redondance. L'ancien HTML les montrait tous les deux.
    } else { // S'ils sont différents
      authorArtistHtml = `<p class="detail-meta">${authorText} <span class="detail-artist-spacing">${artistText}</span></p>`;
    }
  } else if (s.author) {
    authorArtistHtml = `<p class="detail-meta">${authorText}</p>`;
  } else if (s.artist) {
    authorArtistHtml = `<p class="detail-meta">${artistText}</p>`;
  }

  // Meta pour mobile
  let yearStatusHtmlMobile = '', typeMagazineHtmlMobile = '', alternativeTitlesMobileHtml = '';
  if (s.release_year || s.release_status) {
    let yearPart = s.release_year ? `<strong>Année :</strong> ${s.release_year}` : '';
    let statusPart = s.release_status ? `<strong>Statut :</strong> ${s.release_status}` : '';
    yearStatusHtmlMobile = `<p class="detail-meta detail-meta-flex-line detail-year-status-mobile"><span class="detail-meta-flex-prefix">${yearPart || statusPart}</span>`;
    if (yearPart && statusPart) yearStatusHtmlMobile += `<span class="detail-meta-flex-suffix">${statusPart.replace('Statut : ', '')}</span>`; // Enlève le label redondant
    yearStatusHtmlMobile += `</p>`;
  }
  if (s.manga_type || s.magazine) {
    let typePart = s.manga_type ? `<strong>Type :</strong> ${s.manga_type}` : '';
    let magazinePart = s.magazine ? `<strong>Magazine :</strong> ${s.magazine}` : '';
    typeMagazineHtmlMobile = `<p class="detail-meta detail-meta-flex-line detail-type-magazine-mobile"><span class="detail-meta-flex-prefix">${typePart || magazinePart}</span>`;
    if (typePart && magazinePart) typeMagazineHtmlMobile += `<span class="detail-meta-flex-suffix">${magazinePart.replace('Magazine : ', '')}</span>`;
    typeMagazineHtmlMobile += `</p>`;
  }
  if (s.alternative_titles && s.alternative_titles.length > 0) {
    alternativeTitlesMobileHtml = `<p class="detail-meta"><strong>Titres alt. :</strong> ${s.alternative_titles.join(', ')}</p>`;
  }


  // Meta pour desktop
  let additionalMetadataForDesktop = [];
  if (s.release_year) additionalMetadataForDesktop.push(`<p><strong>Année :</strong> ${s.release_year}</p>`);
  if (s.release_status) additionalMetadataForDesktop.push(`<p><strong>Statut :</strong> ${s.release_status}</p>`);
  if (s.manga_type) additionalMetadataForDesktop.push(`<p><strong>Type :</strong> ${s.manga_type}</p>`);
  if (s.magazine) additionalMetadataForDesktop.push(`<p><strong>Magazine :</strong> ${s.magazine}</p>`);
  if (s.alternative_titles && s.alternative_titles.length > 0) additionalMetadataForDesktop.push(`<p><strong>Titres alternatifs :</strong> ${s.alternative_titles.join(', ')}</p>`);
  const additionalMetadataCombinedHtmlForDesktop = additionalMetadataForDesktop.length > 0 ? `<div class="detail-additional-metadata">${additionalMetadataForDesktop.join('')}</div>` : "";

  const descriptionHtmlText = s.description || 'Pas de description disponible.';
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

  // Structure HTML conditionnelle (simplifiée ici, car le CSS gère déjà bien le responsive)
  // Le JS pourrait juste injecter les mêmes blocs, et le CSS s'occupe de leur affichage.
  const finalHtmlStructure = `
    <div class="series-detail-container">
      <div class="detail-top-layout-wrapper">
        <div class="detail-cover-wrapper">
          <img src="${s.cover || 'img/placeholder_preview.png'}" alt="${s.title} Cover" class="detail-cover" loading="lazy">
        </div>
        <div class="detail-all-info-column">
          <div class="detail-primary-info-wrapper">
            ${titleHtml}
            ${tagsHtml}
            ${authorArtistHtml}
          </div>
          <!-- Info secondaire pour desktop -->
          <div class="detail-secondary-info-wrapper detail-secondary-desktop">
            ${additionalMetadataCombinedHtmlForDesktop}
          </div>
        </div>
      </div>
      <!-- Info secondaire pour mobile (visible via CSS media queries) -->
      <div class="detail-secondary-info-wrapper detail-secondary-mobile">
        ${yearStatusHtmlMobile}
        ${typeMagazineHtmlMobile}
        ${alternativeTitlesMobileHtml}
      </div>
      <p class="detail-description">${descriptionHtmlText}</p>
      ${chaptersSectionHtml}
    </div>`;

  seriesDetailSection.innerHTML = finalHtmlStructure;
  document.title = `BigSolo – ${s.title}`; // Mettre à jour le titre de la page

  displayGroupedChapters(); // Afficher les chapitres groupés

  // Attacher l'écouteur au bouton de tri des volumes
  const sortButton = qs('#sort-volumes-btn');
  if (sortButton) {
    const icon = sortButton.querySelector('i');
    if (icon) icon.className = (currentVolumeSortOrder === 'desc') ? "fas fa-sort-numeric-down-alt" : "fas fa-sort-numeric-up-alt";

    // Temporairement, un seul écouteur pour voir s'il se déclenche plusieurs fois
    // S'il y avait un problème de duplication, ce code simple le montrerait
    sortButton.onclick = function () { // Utiliser .onclick pour s'assurer qu'il n'y a qu'un seul handler
      currentVolumeSortOrder = (currentVolumeSortOrder === 'desc') ? 'asc' : 'desc';
      const currentIcon = this.querySelector('i'); // 'this' est le bouton
      if (currentIcon) currentIcon.className = (currentVolumeSortOrder === 'desc') ? "fas fa-sort-numeric-down-alt" : "fas fa-sort-numeric-up-alt";

      console.log('[ONCLICK] Appel de displayGroupedChapters avec ordre:', currentVolumeSortOrder);
      displayGroupedChapters();
      console.log('[ONCLICK] == Fin du clic sur le bouton de tri ==');
    };
  }
}

export async function initSeriesDetailPage() {
  const seriesDetailSection = qs("#series-detail-section");
  if (!seriesDetailSection) return; // Ne rien faire si on n'est pas sur la page de détail

  const urlParams = new URLSearchParams(window.location.search);
  const seriesSlug = urlParams.get('id');

  if (!seriesSlug) {
    seriesDetailSection.innerHTML = "<p>Aucune série spécifiée dans l'URL.</p>";
    return;
  }

  try {
    const allSeries = await fetchAllSeriesData();
    const seriesData = allSeries.find(s => slugify(s.title) === seriesSlug);

    if (seriesData) {
      renderSeriesDetailPageContent(seriesData);
    } else {
      seriesDetailSection.innerHTML = `<p>Série avec l'identifiant "${seriesSlug}" non trouvée.</p>`;
      document.title = `BigSolo – Série non trouvée`;
    }
  } catch (error) {
    console.error("🚨 Erreur lors de l'initialisation de la page de détail de série:", error);
    seriesDetailSection.innerHTML = "<p>Erreur lors du chargement des détails de la série.</p>";
  }
}