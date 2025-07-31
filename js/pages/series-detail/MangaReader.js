// js/pages/series-detail/MangaReader.js
import { qs, qsa, slugify } from '../../utils/domUtils.js';
import { loadGlobalConfig } from '../../utils/fetchUtils.js';

let state = {
    seriesData: null,
    currentChapter: null,
    allChapterKeys: [],
    pages: [],
    spreads: [],
    pageToSpreadMap: [],
    currentSpreadIndex: 0,
    settings: {
        mode: 'webtoon', fit: 'width', direction: 'ltr',
        doublePageOffset: false, stretchSmallPages: false,
        limitWidth: true, limitHeight: false,
        customMaxWidth: 1200, customMaxHeight: 1080,
    },
    isSidebarOpen: window.innerWidth > 992,
};

let dom = {};
let domImages = [];
let scrollTimeout = null;
let urlUpdateTimeout = null;

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

export async function initMangaReader() {
    const dataPlaceholder = qs("#reader-data-placeholder");
    if (!dataPlaceholder?.textContent || dataPlaceholder.textContent.includes('READER_DATA_PLACEHOLDER')) {
        return handleError("Données du lecteur non trouvées.");
    }
    try {
        const readerData = JSON.parse(dataPlaceholder.textContent);
        state.seriesData = readerData.series;
        state.currentChapter = { ...readerData.series.chapters[readerData.chapterNumber], number: readerData.chapterNumber };
        state.allChapterKeys = Object.keys(readerData.series.chapters)
            .filter(key => readerData.series.chapters[key].groups?.Big_herooooo)
            .sort((a, b) => parseFloat(a) - parseFloat(b));

        document.title = `${state.seriesData.title} - Ch. ${state.currentChapter.number} | BigSolo`;

        const savedSettingsExist = localStorage.getItem('bigsolo_reader_settings_v5');
        loadSettings();
        if (!savedSettingsExist) {
            if (window.innerWidth > 992) {
                state.settings.mode = 'single';
                state.settings.fit = 'height';
                state.settings.direction = 'ltr';
            } else {
                state.settings.mode = 'webtoon';
                state.settings.fit = 'width';
                state.settings.direction = 'ltr';
            }
        }

        await setupUI();
        const initialPageNumber = getInitialPageNumberFromUrl();
        fetchAndLoadPages(initialPageNumber);
        bindEvents();

    } catch (error) {
        handleError(`Impossible de charger le lecteur: ${error.message}`);
    }
}

function getInitialPageNumberFromUrl() {
    if (window.location.hash === '#last') {
        return 'last';
    }
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 3) {
        const pageNumber = parseInt(pathSegments[2], 10);
        if (!isNaN(pageNumber) && pageNumber > 0) {
            return pageNumber;
        }
    }
    return 1;
}

function updateUrlForCurrentPage() {
    clearTimeout(urlUpdateTimeout);
    urlUpdateTimeout = setTimeout(() => {
        const seriesSlug = slugify(state.seriesData.title);
        const chapterNumber = state.currentChapter.number;

        const currentSpread = state.spreads[state.currentSpreadIndex];
        if (!currentSpread || currentSpread.length === 0) return;

        const firstPageIndexInSpread = currentSpread[0];
        const pageNumberForUrl = firstPageIndexInSpread + 1;

        const newPath = `/${seriesSlug}/${chapterNumber}/${pageNumberForUrl}`;
        if (window.location.pathname !== newPath) {
            history.replaceState({ page: pageNumberForUrl }, "", newPath);
        }
    }, 150);
}

function handleError(message) {
    console.error(message);
    const root = qs("#manga-reader-root");
    if (root) root.innerHTML = `<p>${message}</p>`;
}

async function setupUI() {
    const root = qs("#manga-reader-root");
    root.innerHTML = `
        <div id="reader-mobile-header">
            <button id="mobile-settings-toggle" class="reader-button" title="Ouvrir les options">
                <i class="fas fa-cog"></i>
            </button>
            <div class="mobile-header-info">
                <a href="#" class="mobile-header-series-link">
                    <span class="mobile-header-series"></span>
                </a>
                <div class="mobile-header-details">
                    <span class="mobile-header-chapter"></span>
                    <span class="mobile-header-page"></span>
                </div>
            </div>
        </div>
        
        <div id="reader-sidebar-overlay"></div>
        <aside class="reader-controls-sidebar ${state.isSidebarOpen ? 'open' : ''} ${state.settings.direction}-mode"></aside>
        <div class="reader-viewer-container"></div>
        <div class="reader-progress-bar"></div>
    `;
    dom = {
        root,
        sidebar: qs(".reader-controls-sidebar"),
        viewerContainer: qs(".reader-viewer-container"),
        progressBar: qs(".reader-progress-bar"),
        mobileHeader: qs("#reader-mobile-header"),
        mobileSettingsBtn: qs("#mobile-settings-toggle"),
        sidebarOverlay: qs("#reader-sidebar-overlay"),
        mobileSeriesTitle: qs(".mobile-header-series"),
        mobileChapterInfo: qs(".mobile-header-chapter"),
        mobilePageInfo: qs(".mobile-header-page"),
    };
    setupSidebarControls();
}

function setupSidebarControls() {
    dom.sidebar.innerHTML = `
        <div class="reader-info-box">
            <h2 class="reader-chapter-title">Chapitre ${state.currentChapter.number}: ${state.currentChapter.title || ''}</h2>
            <p class="reader-series-title"><a href="/${slugify(state.seriesData.title)}">${state.seriesData.title}</a></p>
        </div>
        <div class="control-group">
            <label>Chapitre</label>
            <div class="nav-controls">
                <button id="prev-chapter-btn" title="Chapitre précédent"><i class="fas fa-angle-left"></i></button>
                <div class="custom-dropdown" id="chapter-dropdown">
                    <button class="dropdown-toggle"><span class="chapter-text"></span><i class="fas fa-chevron-down dropdown-arrow"></i></button>
                    <div class="dropdown-menu"></div>
                </div>
                <button id="next-chapter-btn" title="Chapitre suivant"><i class="fas fa-angle-right"></i></button>
            </div>
        </div>
        <div class="control-group">
            <label>Page</label>
            <div class="nav-controls">
                <button id="first-page-btn" title="Première page"><i class="fas fa-angle-double-left"></i></button>
                <button id="prev-page-btn" title="Page précédente"><i class="fas fa-angle-left"></i></button>
                <div class="custom-dropdown" id="page-dropdown">
                    <button class="dropdown-toggle"><span class="page-text"></span><i class="fas fa-chevron-down dropdown-arrow"></i></button>
                    <div class="dropdown-menu"></div>
                </div>
                <button id="next-page-btn" title="Page suivante"><i class="fas fa-angle-right"></i></button>
                <button id="last-page-btn" title="Dernière page"><i class="fas fa-angle-double-right"></i></button>
            </div>
        </div>
        <div class="control-group">
            <label>Mode de lecture</label>
            <div class="setting-options" data-setting="mode">
                <button data-value="single"><i class="fas fa-file"></i> Simple</button>
                <button data-value="double"><i class="fas fa-book-open"></i> Double</button>
                <button data-value="webtoon"><i class="fa-solid fa-scroll"></i> Webtoon</button>
            </div>
        </div>
        <div id="mode-options-group" class="sub-control-group">
            <div class="control-group" id="double-page-controls">
                <label>Décalage double page</label>
                <div class="setting-options" data-setting="doublePageOffset">
                    <button data-value="false">Non</button>
                    <button data-value="true">Oui</button>
                </div>
            </div>
            <div class="control-group" id="direction-control-group">
                <label>Sens de lecture</label>
                <div class="setting-options" data-setting="direction">
                    <button data-value="rtl">Droite à Gauche</button>
                    <button data-value="ltr">Gauche à Droite</button>
                </div>
            </div>
        </div>
        <div class="control-group" id="fit-control-group">
            <label>Ajustement de l'image</label>
            <div class="setting-options"><button id="fit-mode-btn"></button></div>
        </div>
        <div id="custom-fit-controls" class="sub-control-group">
             <div class="control-group">
                <label>
                    <input type="checkbox" id="stretch-toggle">
                    <span class="custom-checkbox-box"></span>
                    <span class="label-text">Étirez les petites pages</span>
                </label>
            </div>
            <div class="control-group">
                <label>
                     <input type="checkbox" id="limit-width-toggle">
                     <span class="custom-checkbox-box"></span>
                     <span class="label-text">Limiter la largeur</span>
                </label>
                <div class="modal-slider-container">
                    <input type="range" id="custom-width-slider" min="400" max="3000" step="10">
                    <input type="number" id="custom-width-input" min="400" max="3000"><span class="slider-unit">px</span>
                </div>
            </div>
            <div class="control-group">
                <label>
                     <input type="checkbox" id="limit-height-toggle">
                     <span class="custom-checkbox-box"></span>
                     <span class="label-text">Limiter la hauteur</span>
                </label>
                <div class="modal-slider-container">
                    <input type="range" id="custom-height-slider" min="400" max="3000" step="10">
                    <input type="number" id="custom-height-input" min="400" max="3000"><span class="slider-unit">px</span>
                </div>
            </div>
        </div>
    `;

    dom.modeOptionsGroup = qs('#mode-options-group');
    dom.doublePageControls = qs('#double-page-controls');
    dom.directionControls = qs('#direction-control-group');
    dom.customFitControls = qs('#custom-fit-controls');
    dom.stretchToggle = qs("#stretch-toggle");
    dom.limitWidthToggle = qs("#limit-width-toggle");
    dom.limitHeightToggle = qs("#limit-height-toggle");
    dom.customWidthSlider = qs("#custom-width-slider");
    dom.customHeightSlider = qs("#custom-height-slider");
    dom.customWidthInput = qs("#custom-width-input");
    dom.customHeightInput = qs("#custom-height-input");

    setupDropdown('chapter-dropdown');
    setupDropdown('page-dropdown');

    updateActiveButtons();
}

async function fetchAndLoadPages(initialPageNumber = 1) {
    const loadingMessage = `<p id="reader-loading-msg">Chargement des informations...</p>`;
    dom.viewerContainer.innerHTML = `<div class="reader-viewer">${loadingMessage}</div>`;

    const CONFIG = await loadGlobalConfig();
    const chapterId = state.currentChapter.groups.Big_herooooo.split('/').pop();
    const apiUrl = `${CONFIG.URL_API_IMGCHEST}?id=${chapterId}`;

    try {
        const pagesData = await fetch(apiUrl).then(res => res.json());
        if (!Array.isArray(pagesData) || pagesData.length === 0) throw new Error("Aucune page retournée par l'API.");
        state.pages = pagesData.map(p => p.link);

        domImages = state.pages.map(src => {
            const img = new Image();
            img.addEventListener('contextmenu', e => e.preventDefault());
            return img;
        });

        calculateSpreads();

        let finalInitialIndex = 0;
        if (initialPageNumber === 'last') {
            finalInitialIndex = state.spreads.length - 1;
        } else if (typeof initialPageNumber === 'number' && initialPageNumber > 0) {
            const pageIndex = initialPageNumber - 1;
            const targetSpreadIndex = state.pageToSpreadMap[pageIndex];
            if (targetSpreadIndex !== undefined) {
                finalInitialIndex = targetSpreadIndex;
            }
        }
        state.currentSpreadIndex = finalInitialIndex;

        render(true);

        let loadedCount = 0;
        const loadingMsgElement = qs('#reader-loading-msg');
        if (loadingMsgElement) loadingMsgElement.textContent = `Chargement... (0 / ${domImages.length})`;

        domImages.forEach((img, index) => {
            img.onload = () => {
                loadedCount++;
                if (loadingMsgElement) loadingMsgElement.textContent = `Chargement... (${loadedCount} / ${domImages.length})`;
                if (loadedCount === domImages.length) {
                    loadingMsgElement?.remove();
                    calculateSpreads();
                    if (typeof initialPageNumber === 'number') {
                        finalInitialIndex = state.pageToSpreadMap[initialPageNumber - 1] ?? 0;
                    }
                    render(true);
                    goToSpread(finalInitialIndex, true);
                }
            };
            img.onerror = () => {
                loadedCount++;
                console.error(`Erreur de chargement pour l'image: ${state.pages[index]}`);
                img.alt = "Erreur de chargement";
                if (loadedCount === domImages.length) {
                    loadingMsgElement?.remove();
                    calculateSpreads();
                    render(true);
                }
            };
            img.src = state.pages[index];
        });

    } catch (error) {
        handleError(`Erreur: ${error.message}`);
    }
}

function calculateSpreads() {
    state.spreads = [];
    state.pageToSpreadMap = [];

    if (state.settings.mode === 'webtoon' || state.settings.mode === 'single') {
        domImages.forEach((_, index) => {
            state.spreads.push([index]);
            state.pageToSpreadMap[index] = index;
        });
        return;
    }

    if (state.settings.mode === 'double') {
        let i = 0;
        if (state.settings.doublePageOffset && domImages[0]) {
            state.spreads.push([0]);
            state.pageToSpreadMap[0] = 0;
            i = 1;
        }

        while (i < domImages.length) {
            const currentImage = domImages[i];
            const isLandscape = currentImage.naturalWidth > 0 && currentImage.naturalWidth > currentImage.naturalHeight;

            if (isLandscape) {
                state.spreads.push([i]);
                state.pageToSpreadMap[i] = state.spreads.length - 1;
                i++;
            } else {
                const nextImage = domImages[i + 1];
                if (nextImage && nextImage.naturalWidth > 0 && nextImage.naturalWidth <= nextImage.naturalHeight) {
                    state.spreads.push([i, i + 1]);
                    state.pageToSpreadMap[i] = state.spreads.length - 1;
                    state.pageToSpreadMap[i + 1] = state.spreads.length - 1;
                    i += 2;
                } else {
                    state.spreads.push([i]);
                    state.pageToSpreadMap[i] = state.spreads.length - 1;
                    i++;
                }
            }
        }
    }
}
function render(isInitializing = false) { renderViewer(); updateUIOnPageChange(); preloadImages(); if (!isInitializing && state.settings.mode !== 'webtoon') { dom.viewerContainer.scrollTop = 0; } }

function renderViewer() {
    const viewer = document.createElement('div');
    const currentSpread = state.spreads[state.currentSpreadIndex] || [];
    const isLandscapeSpread = currentSpread.length === 1 && domImages[currentSpread[0]]?.naturalWidth > domImages[currentSpread[0]]?.naturalHeight;

    viewer.className = `reader-viewer ${state.settings.mode}-mode fit-${state.settings.fit} ${state.settings.direction}-mode`;
    if (isLandscapeSpread) viewer.classList.add('single-landscape-spread');
    if (state.settings.stretchSmallPages) viewer.classList.add('stretch');

    dom.viewerContainer.className = `reader-viewer-container ${state.settings.mode}-mode`;
    dom.viewerContainer.innerHTML = '';

    domImages.forEach(img => {
        img.style.maxWidth = null;
        img.style.maxHeight = null;
    });

    if (state.settings.mode === 'webtoon') {
        domImages.forEach(img => {
            if (state.settings.fit === 'height' || state.settings.fit === 'both' || (state.settings.fit === 'custom' && state.settings.limitHeight)) {
            } else if (state.settings.fit === 'custom' && state.settings.limitWidth) {
                img.style.maxWidth = `${state.settings.customMaxWidth}px`;
            }
            viewer.appendChild(img);
        });
    } else if (state.settings.mode === 'double') {
        const pageIndices = currentSpread;
        pageIndices.forEach((pageIndex) => {
            const img = domImages[pageIndex];
            if (img && state.settings.fit === 'custom') {
                if (state.settings.limitWidth) {
                    img.style.maxWidth = isLandscapeSpread ? `${state.settings.customMaxWidth}px` : `${state.settings.customMaxWidth / 2}px`;
                }
                if (state.settings.limitHeight) {
                    img.style.maxHeight = `${state.settings.customMaxHeight}px`;
                }
            }
        });

        if (pageIndices.length === 1 && state.settings.doublePageOffset) {
            const placeholder = document.createElement('div');
            const image = domImages[pageIndices[0]];
            if (image) {
                if (pageIndices[0] === 0) {
                    state.settings.direction === 'ltr' ? viewer.append(placeholder, image) : viewer.append(image, placeholder);
                } else {
                    state.settings.direction === 'ltr' ? viewer.append(image, placeholder) : viewer.append(placeholder, image);
                }
            }
        } else {
            const page1 = domImages[pageIndices[0]];
            const page2 = domImages[pageIndices[1]];
            if (state.settings.direction === 'rtl') {
                if (page2) viewer.appendChild(page2);
                if (page1) viewer.appendChild(page1);
            } else {
                if (page1) viewer.appendChild(page1);
                if (page2) viewer.appendChild(page2);
            }
        }
    } else { // Mode 'single'
        const image = domImages[state.spreads[state.currentSpreadIndex][0]];
        if (image) {
            if (state.settings.fit === 'custom') {
                if (state.settings.limitWidth) image.style.maxWidth = `${state.settings.customMaxWidth}px`;
                if (state.settings.limitHeight) image.style.maxHeight = `${state.settings.customMaxHeight}px`;
            }
            viewer.appendChild(image);
        }
    }

    dom.viewerContainer.appendChild(viewer);
}

function updateUIOnPageChange() {
    renderProgressBar();
    updateControlsState();
    updateUrlForCurrentPage();
}

function renderProgressBar() {
    dom.progressBar.className = `reader-progress-bar ${state.settings.direction}-mode`;
    if (state.spreads.length === 0) return;

    dom.progressBar.innerHTML = state.spreads.map((_, index) => {
        const isCurrent = index === state.currentSpreadIndex;
        const isRead = index < state.currentSpreadIndex;
        return `<div class="progress-tick ${isCurrent ? 'current' : ''} ${isRead ? 'read' : ''}" data-spread-index="${index}"></div>`;
    }).join('');
}
function updateControlsState() { updateActiveButtons(); populateChapterSelect(); populatePageSelect(); updateSliderStates(); updateMobileHeader(); }

function updateMobileHeader() {
    const seriesLink = qs('.mobile-header-series-link', dom.mobileHeader);
    if (seriesLink) {
        seriesLink.href = `/${slugify(state.seriesData.title)}`;
    }
    if (dom.mobileSeriesTitle) {
        dom.mobileSeriesTitle.textContent = truncateText(state.seriesData.title, 35);
    }
    if (dom.mobileChapterInfo) {
        const chapterTitle = `Ch. ${state.currentChapter.number} : ${state.currentChapter.title || ''}`;
        dom.mobileChapterInfo.textContent = truncateText(chapterTitle, 25);
    }
    if (dom.mobilePageInfo) {
        const currentSpread = state.spreads[state.currentSpreadIndex] || [];
        const firstPageInSpread = currentSpread.length > 0 ? currentSpread[0] + 1 : 0;
        const lastPageInSpread = currentSpread.length > 0 ? currentSpread[currentSpread.length - 1] + 1 : 0;

        let pageText = `Pg. ${firstPageInSpread}`;
        if (lastPageInSpread > firstPageInSpread) {
            pageText += `-${lastPageInSpread}`;
        }

        dom.mobilePageInfo.textContent = `${pageText} / ${state.pages.length}`;
    }
}

function updateActiveButtons() {
    qsa('.setting-options', dom.sidebar).forEach(group => {
        const setting = group.dataset.setting;
        if (state.settings.hasOwnProperty(setting)) {
            const value = String(state.settings[setting]);
            qsa('button', group).forEach(btn => btn.classList.toggle('active', btn.dataset.value === value));
        }
    });

    const isWebtoon = state.settings.mode === 'webtoon';
    dom.modeOptionsGroup.classList.toggle('visible', !isWebtoon);
    dom.modeOptionsGroup.classList.toggle('double-mode-active', state.settings.mode === 'double');

    dom.customFitControls.classList.toggle('visible', state.settings.fit === 'custom');

    updateFitButton();
}
function goToPage(pageIndex, isInitializing = false) {
    if (state.settings.mode === 'webtoon') {
        const targetImage = domImages[pageIndex];
        if (targetImage) {
            const behavior = isInitializing ? 'auto' : 'smooth';
            targetImage.scrollIntoView({ behavior, block: 'start' });
            if (!isInitializing) {
                state.currentSpreadIndex = pageIndex;
                updateUIOnPageChange();
            }
        }
    } else {
        const spreadIndex = state.pageToSpreadMap[pageIndex];
        if (spreadIndex !== undefined) goToSpread(spreadIndex, isInitializing);
    }
}
function goToSpread(spreadIndex, isInitializing = false) {
    state.currentSpreadIndex = Math.max(0, Math.min(spreadIndex, state.spreads.length - 1));

    if (state.settings.mode === 'webtoon') {
        const pageIndex = state.spreads[state.currentSpreadIndex]?.[0];
        if (pageIndex !== undefined && domImages[pageIndex]) {
            const behavior = isInitializing ? 'auto' : 'smooth';
            domImages[pageIndex].scrollIntoView({ behavior, block: 'start' });
        }
    }

    render(isInitializing);
}
function changeSpread(delta) {
    const isLastSpread = state.currentSpreadIndex >= state.spreads.length - 1;
    if (delta > 0 && isLastSpread) navigateToChapter(1);
    else if (delta < 0 && state.currentSpreadIndex === 0) navigateToChapter(-1, true);
    else goToSpread(state.currentSpreadIndex + delta);
}
function navigateToChapter(delta, goToLastPage = false) {
    const currentChapterIndex = state.allChapterKeys.indexOf(state.currentChapter.number);
    const nextChapterIndex = currentChapterIndex + delta;
    if (nextChapterIndex >= 0 && nextChapterIndex < state.allChapterKeys.length) {
        const nextChapterKey = state.allChapterKeys[nextChapterIndex];
        let url = `/${slugify(state.seriesData.title)}/${nextChapterKey}`;
        if (goToLastPage) url += '#last';
        window.location.href = url;
    }
}
function cycleFitMode() {
    const modes = ['width', 'height', 'both', 'original', 'custom'];
    const current = modes.indexOf(state.settings.fit);
    const nextIndex = (current >= modes.length - 1) ? 0 : current + 1;
    state.settings.fit = modes[nextIndex];
    saveSettings();
    render();
}
function updateFitButton() {
    const btn = qs('#fit-mode-btn');
    if (!btn) return;
    const icons = { height: 'fas fa-arrows-alt-v', width: 'fas fa-arrows-alt-h', both: 'fas fa-compress-arrows-alt', original: 'fas fa-search' };
    const text = { height: 'Hauteur', width: 'Largeur', both: 'Les Deux', original: 'Originale' };
    const currentFit = state.settings.fit;

    if (currentFit === 'custom') btn.innerHTML = `<i class="fas fa-ruler-combined"></i> Personnalisé`;
    else btn.innerHTML = `<i class="${icons[currentFit]}"></i> ${text[currentFit]}`;
}

// ↓↓↓ SECTION MODIFIÉE ↓↓↓
function bindEvents() {
    document.addEventListener('keydown', handleKeyDown);

    dom.mobileSettingsBtn.addEventListener('click', () => {
        const isOpen = dom.sidebar.classList.contains('open');
        dom.sidebar.classList.toggle('open', !isOpen);
        dom.sidebarOverlay.classList.toggle('open', !isOpen);
        dom.root.classList.toggle('sidebar-is-open', !isOpen);
    });
    dom.sidebarOverlay.addEventListener('click', () => {
        dom.sidebar.classList.remove('open');
        dom.sidebarOverlay.classList.remove('open');
        dom.root.classList.remove('sidebar-is-open');
    });

    dom.sidebar.addEventListener('click', e => {
        const button = e.target.closest('button');
        if (!button || button.closest('.custom-dropdown')) return;

        if (button.id === 'first-page-btn') goToSpread(0);
        else if (button.id === 'prev-page-btn') changeSpread(-1);
        else if (button.id === 'next-page-btn') changeSpread(1);
        else if (button.id === 'last-page-btn') goToSpread(state.spreads.length - 1);
        else if (button.id === 'prev-chapter-btn') navigateToChapter(-1);
        else if (button.id === 'next-chapter-btn') navigateToChapter(1);
        else if (button.id === 'fit-mode-btn') cycleFitMode();
        else if (button.closest('.setting-options')) {
            const group = button.closest('.setting-options');
            const setting = group.dataset.setting;
            const value = button.dataset.value;

            // Logique pour conserver la page actuelle lors du changement de mode
            if (setting === 'mode') {
                const currentSpread = state.spreads[state.currentSpreadIndex];
                const currentPageIndex = currentSpread ? currentSpread[0] : 0;

                state.settings.mode = value;
                calculateSpreads();

                const newSpreadIndex = state.pageToSpreadMap[currentPageIndex];
                if (newSpreadIndex !== undefined) {
                    state.currentSpreadIndex = newSpreadIndex;
                }
            } else {
                state.settings[setting] = (value === 'true') ? true : (value === 'false' ? false : value);
                if (setting === 'direction') {
                    dom.sidebar.classList.remove('ltr-mode', 'rtl-mode');
                    dom.sidebar.classList.add(`${value}-mode`);
                }
                if (setting === 'doublePageOffset') {
                    calculateSpreads();
                }
            }

            saveSettings();
            render();

            // Si le nouveau mode est webtoon, forcer le scroll vers la bonne page
            if (setting === 'mode' && state.settings.mode === 'webtoon') {
                // Utiliser 'true' pour un saut instantané (auto) au lieu d'un scroll doux
                goToSpread(state.currentSpreadIndex, true);
            }
        }
    });

    dom.viewerContainer.addEventListener('click', e => {
        if (state.settings.mode === 'webtoon') return;
        const rect = dom.viewerContainer.getBoundingClientRect();
        const zone = (e.clientX - rect.left) / rect.width;
        if (zone < 0.35) changeSpread(state.settings.direction === 'ltr' ? -1 : 1);
        else if (zone > 0.65) changeSpread(state.settings.direction === 'ltr' ? 1 : -1);
    });

    const scrollTarget = window.innerWidth > 992 ? window : dom.viewerContainer;
    scrollTarget.addEventListener('scroll', handleWebtoonScroll, { passive: true });

    dom.progressBar.addEventListener('click', e => { if (e.target.matches('.progress-tick')) goToSpread(parseInt(e.target.dataset.spreadIndex, 10)); });

    dom.stretchToggle.addEventListener('change', e => {
        state.settings.stretchSmallPages = e.target.checked;
        saveSettings();
        qs('.reader-viewer', dom.viewerContainer)?.classList.toggle('stretch', e.target.checked);
    });

    dom.limitWidthToggle.addEventListener('change', e => { state.settings.limitWidth = e.target.checked; updateSliderStates(); render(); saveSettings(); });
    dom.limitHeightToggle.addEventListener('change', e => { state.settings.limitHeight = e.target.checked; updateSliderStates(); render(); saveSettings(); });

    ['input', 'change'].forEach(evt => {
        dom.customWidthSlider.addEventListener(evt, e => handleSliderChange(e, 'customMaxWidth', dom.customWidthInput));
        dom.customWidthInput.addEventListener(evt, e => handleSliderChange(e, 'customMaxWidth', dom.customWidthSlider));
        dom.customHeightSlider.addEventListener(evt, e => handleSliderChange(e, 'customMaxHeight', dom.customHeightInput));
        dom.customHeightInput.addEventListener(evt, e => handleSliderChange(e, 'customMaxHeight', dom.customHeightSlider));
    });

    dom.stretchToggle.checked = state.settings.stretchSmallPages;
    dom.limitWidthToggle.checked = state.settings.limitWidth;
    dom.limitHeightToggle.checked = state.settings.limitHeight;
    dom.customWidthSlider.value = state.settings.customMaxWidth;
    dom.customWidthInput.value = state.settings.customMaxWidth;
    dom.customHeightSlider.value = state.settings.customMaxHeight;
    dom.customHeightInput.value = state.settings.customMaxHeight;
    updateSliderStates();
}
// ↑↑↑ FIN DE LA SECTION MODIFIÉE ↑↑↑

function handleKeyDown(e) {
    if (state.isModalOpen) return;
    const isLtr = state.settings.direction === 'ltr';
    if (e.key === 'ArrowRight') changeSpread(isLtr ? 1 : -1);
    if (e.key === 'ArrowLeft') changeSpread(isLtr ? -1 : 1);
}
function handleWebtoonScroll() {
    if (state.settings.mode !== 'webtoon') return;

    if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
    }

    scrollTimeout = window.requestAnimationFrame(() => {
        const triggerPoint = window.innerHeight * 0.2;
        let closestImageIndex = -1;
        let minDistance = Infinity;

        domImages.forEach((img, index) => {
            const rect = img.getBoundingClientRect();
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                const distance = Math.abs(rect.top - triggerPoint);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestImageIndex = index;
                }
            }
        });

        if (closestImageIndex !== -1) {
            const newSpreadIndex = state.pageToSpreadMap[closestImageIndex];
            if (newSpreadIndex !== undefined && newSpreadIndex !== state.currentSpreadIndex) {
                state.currentSpreadIndex = newSpreadIndex;
                updateUIOnPageChange();
            }
        }
    });
}
function handleSliderChange(e, setting, otherInput) {
    if (e.target.disabled) return;
    const value = parseInt(e.target.value, 10) || 0;
    state.settings[setting] = value;
    otherInput.value = value;
    renderViewer();
    if (e.type === 'change') saveSettings();
}
function updateSliderStates() {
    dom.customWidthSlider.disabled = !state.settings.limitWidth;
    dom.customWidthInput.disabled = !state.settings.limitWidth;
    dom.customHeightSlider.disabled = !state.settings.limitHeight;
    dom.customHeightInput.disabled = !state.settings.limitHeight;
}
function setupDropdown(id) {
    const dropdown = qs(`#${id}`);
    if (!dropdown) return;
    const toggle = qs('.dropdown-toggle', dropdown);
    const menu = qs('.dropdown-menu', dropdown);
    if (!toggle || !menu) return;

    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = toggle.classList.contains('open');
        qsa('.custom-dropdown .dropdown-toggle.open').forEach(otherToggle => {
            if (otherToggle !== toggle) {
                otherToggle.classList.remove('open');
                otherToggle.nextElementSibling?.classList.remove('open');
            }
        });
        toggle.classList.toggle('open', !wasOpen);
        menu.classList.toggle('open', !wasOpen);
    });

    if (id === 'chapter-dropdown') {
        menu.addEventListener('click', e => {
            const item = e.target.closest('.dropdown-item');
            if (item) window.location.href = `/${slugify(state.seriesData.title)}/${item.dataset.chapter}`;
        });
    } else if (id === 'page-dropdown') {
        menu.addEventListener('click', e => {
            const item = e.target.closest('.dropdown-item');
            if (item) {
                if (item.dataset.pageIndex) {
                    goToPage(parseInt(item.dataset.pageIndex, 10));
                } else if (item.dataset.spreadIndex) {
                    goToSpread(parseInt(item.dataset.spreadIndex, 10));
                }
            }
        });
    }
}
function populateChapterSelect() {
    const menu = qs('#chapter-dropdown .dropdown-menu');
    const textSpan = qs('#chapter-dropdown .chapter-text');
    if (!menu || !textSpan) return;

    const fullTitle = `Ch. ${state.currentChapter.number} - ${state.currentChapter.title}`;
    textSpan.textContent = truncateText(fullTitle, 28);
    menu.innerHTML = state.allChapterKeys.slice().sort((a, b) => parseFloat(b) - parseFloat(a)).map(key => {
        const data = state.seriesData.chapters[key];
        const itemTitle = `Ch. ${key} - ${data.title}`;
        return `<div class="dropdown-item ${key === state.currentChapter.number ? 'active' : ''}" data-chapter="${key}" title="${itemTitle}">${truncateText(itemTitle, 35)}</div>`;
    }).join('');
}
function populatePageSelect() {
    const menu = qs('#page-dropdown .dropdown-menu');
    const textSpan = qs('#page-dropdown .page-text');
    if (!menu || !textSpan) return;

    const currentSpread = state.spreads[state.currentSpreadIndex] || [];
    const firstPageInSpread = currentSpread.length > 0 ? currentSpread[0] + 1 : 0;
    const lastPageInSpread = currentSpread.length > 0 ? currentSpread[currentSpread.length - 1] + 1 : 0;

    let pageText = `${firstPageInSpread}`;
    if (lastPageInSpread > firstPageInSpread) {
        pageText += `-${lastPageInSpread}`;
    }

    textSpan.textContent = `${pageText} / ${state.pages.length}`;

    menu.innerHTML = state.spreads.map((spread, i) => {
        const isActive = i === state.currentSpreadIndex;

        const firstPage = spread[0] + 1;
        const lastPage = spread[spread.length - 1] + 1;
        let pageLabel = `Page ${firstPage}`;
        if (lastPage > firstPage) {
            pageLabel += `-${lastPage}`;
        }

        const dataAttr = `data-spread-index="${i}"`;
        return `<div class="dropdown-item ${isActive ? 'active' : ''}" ${dataAttr}>${pageLabel}</div>`;
    }).join('');
}

function preloadImages() {
    const nextSpreadIndex = state.currentSpreadIndex + 1;
    if (nextSpreadIndex < state.spreads.length) {
        state.spreads[nextSpreadIndex].forEach(pageIndex => {
            if (domImages[pageIndex]) { /* Already loading */ }
        });
    }
}
function saveSettings() { localStorage.setItem('bigsolo_reader_settings_v5', JSON.stringify(state.settings)); }
function loadSettings() {
    const saved = localStorage.getItem('bigsolo_reader_settings_v5');
    if (saved) { try { Object.assign(state.settings, JSON.parse(saved)); } catch (e) { console.error("Impossible de charger les paramètres du lecteur.", e); } }
}
document.addEventListener('click', () => {
    qsa('.custom-dropdown .dropdown-toggle.open').forEach(toggle => {
        toggle.classList.remove('open');
        toggle.nextElementSibling?.classList.remove('open');
    });
});