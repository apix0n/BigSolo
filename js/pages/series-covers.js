import { fetchAllSeriesData } from '../utils/fetchUtils.js';
import { slugify, qs } from '../utils/domUtils.js';

let currentLightboxIndex = 0;
let currentCoversData = [];

function updateLightboxNavigation() {
    const prevBtn = qs('#lightbox-modal .lightbox-prev');
    const nextBtn = qs('#lightbox-modal .lightbox-next');
    if (!prevBtn || !nextBtn) return;

    if (currentCoversData.length > 1) {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
}

function openLightbox(index) {
    console.log("[Lightbox] Attempting to open lightbox for index:", index);
    const overlay = qs('#lightbox-modal');
    const imageElement = qs('#lightbox-img');
    const captionElement = qs('#lightbox-caption-text');

    if (!overlay) { console.error("[Lightbox] Overlay (#lightbox-modal) not found!"); return; }
    if (!imageElement) { console.error("[Lightbox] Image element (#lightbox-img) not found!"); return; }
    if (!captionElement) { console.warn("[Lightbox] Caption element (#lightbox-caption-text) not found."); }
    
    if (!currentCoversData || !currentCoversData[index]) {
        console.error("[Lightbox] No cover data for index:", index, currentCoversData);
        return;
    }

    currentLightboxIndex = index;
    const coverDetail = currentCoversData[index];
    console.log("[Lightbox] Opening with coverDetail:", coverDetail);

    imageElement.src = coverDetail.url_hq;
    imageElement.alt = `Couverture Volume ${coverDetail.volume || index + 1} (agrandie)`;
    if (captionElement) {
      captionElement.textContent = `Volume ${coverDetail.volume || 'Couverture ' + (index + 1)}`;
    }
    
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    updateLightboxNavigation();
    console.log("[Lightbox] Lightbox shown (style.display = 'flex').");
}

function closeLightbox() {
    const overlay = qs('#lightbox-modal');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
        console.log("[Lightbox] Lightbox closed.");
    }
}

function showNextImage() {
    if (currentCoversData.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex + 1) % currentCoversData.length;
    openLightbox(currentLightboxIndex);
}

function showPrevImage() {
    if (currentCoversData.length === 0) return;
    currentLightboxIndex = (currentLightboxIndex - 1 + currentCoversData.length) % currentCoversData.length;
    openLightbox(currentLightboxIndex);
}

function setupLightboxControls() {
    console.log("[Lightbox] Setting up controls...");
    const closeBtn = qs('#lightbox-modal .lightbox-close');
    const actualNextBtn = qs('#lightbox-modal .lightbox-next');
    const actualPrevBtn = qs('#lightbox-modal .lightbox-prev');
    const overlay = qs('#lightbox-modal');

    if (closeBtn) {
        closeBtn.addEventListener('click', closeLightbox);
    } else { console.warn("[Lightbox] Close button (.lightbox-close) not found."); }

    if (actualNextBtn) {
        actualNextBtn.addEventListener('click', showNextImage);
    } else { console.warn("[Lightbox] Next button (.lightbox-next) not found."); }

    if (actualPrevBtn) {
        actualPrevBtn.addEventListener('click', showPrevImage);
    } else { console.warn("[Lightbox] Prev button (.lightbox-prev) not found."); }
    
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) { 
                closeLightbox();
            }
        });
    } else { console.warn("[Lightbox] Overlay for background click (#lightbox-modal) not found."); }

    document.addEventListener('keydown', (e) => {
        if (overlay && overlay.style.display !== 'none') {
            if (e.key === 'Escape') closeLightbox();
            if (currentCoversData.length > 1) {
                if (e.key === 'ArrowRight') showNextImage();
                if (e.key === 'ArrowLeft') showPrevImage();
            }
        }
    });
    console.log("[Lightbox] Controls setup complete.");
}

function renderCoversGallery(seriesData) {
    const galleryContainer = qs('.covers-grid');
    const pageTitleElement = qs('.covers-gallery-title');

    if (!galleryContainer || !pageTitleElement) {
        console.error("DOM elements for covers gallery not found (galleryContainer or pageTitleElement).");
        if (galleryContainer) galleryContainer.innerHTML = "<p>Erreur d'affichage de la page.</p>";
        return;
    }

    if (!seriesData || !Array.isArray(seriesData.covers_gallery) || seriesData.covers_gallery.length === 0) {
        pageTitleElement.textContent = `Couvertures pour ${seriesData ? seriesData.title : 'série inconnue'}`;
        galleryContainer.innerHTML = '<p class="no-covers">Aucune couverture disponible pour cette série.</p>';

        currentCoversData = [];
        return;
    }
    
    currentCoversData = seriesData.covers_gallery.filter(
        cover => cover && typeof cover.url_hq === 'string' && typeof cover.url_lq === 'string'
    );

    if (currentCoversData.length === 0) {
        pageTitleElement.textContent = `Couvertures pour ${seriesData.title}`;
        galleryContainer.innerHTML = '<p class="no-covers">Aucune couverture valide (avec url_hq et url_lq) trouvée pour cette série.</p>';

        return;
    }

    pageTitleElement.classList.add('page-title', 'section-title');
    pageTitleElement.textContent = `Galerie des Couvertures : ${seriesData.title}`;
    document.title = `BigSolo – Couvertures : ${seriesData.title}`;

    let coversHtml = '';
    currentCoversData.forEach((coverDetail, index) => {
        coversHtml += `
            <div class="cover-item" data-index="${index}">
                <img src="${coverDetail.url_lq}" alt="Couverture Volume ${coverDetail.volume || index + 1} pour ${seriesData.title}" loading="lazy">
                <div class="volume-caption-overlay">Volume ${coverDetail.volume || '?'}</div>
            </div>
        `;
    });

    galleryContainer.innerHTML = coversHtml;

    galleryContainer.querySelectorAll('.cover-item').forEach(item => {
        if (!item.dataset.clickListenerAttached) {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index, 10);
                if (!isNaN(index)) {
                    openLightbox(index);
                } else {
                    console.error("Invalid index on clicked cover item:", item.dataset.index);
                }
            });
            item.dataset.clickListenerAttached = "true";
        }
    });
    console.log("Gallery rendered and click listeners attached.");
}

export async function initSeriesCoversPage() {
    console.log("[initSeriesCoversPage] Starting initialization...");
    const seriesCoversSectionGrid = qs("#covers-gallery-section .covers-grid");
    if (!seriesCoversSectionGrid) {
        console.error("[initSeriesCoversPage] Section .covers-grid not found.");
        return;
    }
    seriesCoversSectionGrid.innerHTML = '<p class="loading-message">Chargement des couvertures...</p>';
    
    const pathname = window.location.pathname;
    const pathSegments = pathname.split('/').filter(Boolean);
    let seriesSlug;

    if (pathSegments.length === 3 && pathSegments[0] === 'series-detail' && pathSegments[2] === 'cover') {
        seriesSlug = pathSegments[1];
    }

    const pageTitleElement = qs('.covers-gallery-title');
    if (!seriesSlug) {
        seriesCoversSectionGrid.innerHTML = "<p class='loading-message'>Identifiant de série non trouvé dans l'URL.</p>";
        console.warn("[initSeriesCoversPage] Slug de série non trouvé. Pathname:", pathname);
        if(pageTitleElement) pageTitleElement.textContent = 'Erreur : Série non spécifiée';
        return;
    }

    console.log(`[initSeriesCoversPage] Initializing for series slug: ${seriesSlug}`);

    try {
        const allSeries = await fetchAllSeriesData();
        const seriesData = allSeries.find(s => slugify(s.title) === seriesSlug);

        if (seriesData) {
            console.log("[initSeriesCoversPage] Series data found:", seriesData);
            if (pageTitleElement) {
                 pageTitleElement.classList.add('page-title', 'section-title');
            }
            renderCoversGallery(seriesData);
            setupLightboxControls();
        } else {
            seriesCoversSectionGrid.innerHTML = `<p class="loading-message">Série avec l'identifiant "${seriesSlug}" non trouvée.</p>`;
            document.title = `BigSolo – Série non trouvée`;
            console.warn(`[initSeriesCoversPage] Series data not found for slug: ${seriesSlug}`);
            if(pageTitleElement) pageTitleElement.textContent = 'Série non trouvée';
        }
    } catch (error) {
        console.error("🚨 Erreur lors de l'initialisation de la page des couvertures :", error);
        seriesCoversSectionGrid.innerHTML = "<p class='loading-message'>Erreur lors du chargement des données des couvertures.</p>";
        if(pageTitleElement) pageTitleElement.textContent = 'Erreur de chargement';
    }
}