// js/pages/series-detail/MangaReader/data.js
import { qs } from '../../../utils/domUtils.js';
import { loadGlobalConfig } from '../../../utils/fetchUtils.js';
// MODIFIÉ : Ajout de 'domImages' à l'import
import { state, dom, domImages, setDomImages } from './state.js';
import { render, handleError } from './ui.js';
import { goToSpread } from './navigation.js';

export async function fetchAndLoadPages(initialPageNumber = 1) {
    const loadingMessage = `<p id="reader-loading-msg">Chargement des informations...</p>`;
    dom.viewerContainer.innerHTML = `<div class="reader-viewer">${loadingMessage}</div>`;

    const CONFIG = await loadGlobalConfig();
    const chapterId = state.currentChapter.groups.Big_herooooo.split('/').pop();
    const apiUrl = `${CONFIG.URL_API_IMGCHEST}?id=${chapterId}`;

    try {
        const pagesData = await fetch(apiUrl).then(res => res.json());
        if (!Array.isArray(pagesData) || pagesData.length === 0) throw new Error("Aucune page retournée par l'API.");
        state.pages = pagesData.map(p => p.link);

        const newDomImages = state.pages.map(src => {
            const img = new Image();
            img.addEventListener('contextmenu', e => e.preventDefault());
            return img;
        });
        setDomImages(newDomImages);

        calculateSpreads();

        let finalInitialIndex = 0;
        if (initialPageNumber === 'last') {
            finalInitialIndex = state.spreads.length - 1;
        } else if (typeof initialPageNumber === 'number' && initialPageNumber > 0) {
            const pageIndex = initialPageNumber - 1;
            const targetSpreadIndex = state.pageToSpreadMap[pageIndex];
            if (targetSpreadIndex !== undefined) finalInitialIndex = targetSpreadIndex;
        }
        state.currentSpreadIndex = finalInitialIndex;

        render(true);

        const loadingMsgElement = qs('#reader-loading-msg');
        let loadedCount = 0;
        if (loadingMsgElement) loadingMsgElement.textContent = `Chargement... (0 / ${newDomImages.length})`;

        newDomImages.forEach((img, index) => {
            img.onload = () => {
                loadedCount++;
                if (loadingMsgElement) loadingMsgElement.textContent = `Chargement... (${loadedCount} / ${newDomImages.length})`;
                if (loadedCount === newDomImages.length) {
                    loadingMsgElement?.remove();
                    calculateSpreads();
                    render(true);
                    goToSpread(finalInitialIndex, true);
                }
            };
            img.onerror = () => {
                loadedCount++;
                console.error(`Erreur de chargement pour l'image: ${state.pages[index]}`);
                img.alt = "Erreur de chargement";
                if (loadedCount === newDomImages.length) {
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

export function calculateSpreads() {
    state.spreads = [];
    state.pageToSpreadMap = [];

    if (state.settings.mode === 'webtoon' || state.settings.mode === 'single') {
        state.pages.forEach((_, index) => {
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
                    state.pageToSpreadMap[i] = state.pageToSpreadMap[i + 1] = state.spreads.length - 1;
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