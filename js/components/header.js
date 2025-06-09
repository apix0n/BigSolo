import { qs, qsa, slugify } from '../utils/domUtils.js';

const mainNavLinksConfig = [
  { text: "Accueil", href: "/index", icon: "fas fa-home", id: "home" },
  { text: "Fan-Arts", href: "/galerie", icon: "fa-solid fa-palette", id: "gallery" },
  { text: "À propos", href: "/presentation", icon: "fas fa-user", id: "about" }
];

const subNavTitlesConfig = {
  homepage: "Sur cette page",
  seriesdetailpage: "Navigation Série",
};

const subNavLinksConfig = {
  homepage: [
    { text: "Dernières sorties", href: "/index#latest-chapters-section", id: "latest" },
    { text: "Séries", href: "/index#on-going-section", id: "series" },
    { text: "One-Shot", href: "/index#one-shot-section", id: "oneshots" }
  ],
  galeriepage: [
  ],
  presentationpage: [
  ],
  seriesdetailpage: [
  ]
};

function getCurrentPageId() {
  if (document.body.id) {
    return document.body.id;
  }
  const path = window.location.pathname;
  if (path.startsWith('/series-detail/') && path.endsWith('/cover')) return "seriescoverspage";
  if (path.startsWith('/series-detail/')) return "seriesdetailpage";
  if (path.includes("index") || path === "/") return "homepage";
  if (path.includes("galerie")) return "galeriepage";
  if (path.includes("presentation")) return "presentationpage";
  return null;
}

function getCurrentSeriesSlugFromPath() {
    const path = window.location.pathname;
    if (path.startsWith('/series-detail/')) {
        const segments = path.split('/');
        if (segments.length >= 3 && segments[1] === 'series-detail') {
            return segments[2];
        }
    }
    return null;
}


function renderNavLinks(container, links, isMobile = false) {
  if (!container) return;
  container.innerHTML = '';

  links.forEach(link => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.href;
    if (link.id) {
        a.id = `navlink-${link.id}${isMobile ? '-mobile' : '-desktop'}`;
    }
        
    if (link.icon) {
      const i = document.createElement('i');
      i.className = link.icon;
      a.appendChild(i);
      a.appendChild(document.createTextNode(' ')); 
    }
    a.appendChild(document.createTextNode(link.text));
    li.appendChild(a);
    container.appendChild(li);
  });
}

function getSubNavLinksForPage(pageId) {
    let baseLinks = [...(subNavLinksConfig[pageId] || [])];

    if (pageId === 'seriesdetailpage' || pageId === 'seriescoverspage') {
        const seriesSlug = getCurrentSeriesSlugFromPath();
        if (seriesSlug) {
            const coversLink = { text: "Galerie des Couvertures", href: `/series-detail/${seriesSlug}/cover`, id: "series-covers-gallery" };

            if (pageId === 'seriesdetailpage') {
                baseLinks = [coversLink, ...baseLinks.filter(l => !["series-info", "series-covers-gallery", "series-chapters"].includes(l.id))];
            } else if (pageId === 'seriescoverspage') {
                 baseLinks = [
                    { text: "Retour à la Série", href: `/series-detail/${seriesSlug}`, id: "back-to-series" },

                 ];
            }
        }
    }
    return baseLinks;
}


function populateDesktopNavigation() {
  const mainNavContainer = qs('#desktop-nav-main');
  const subNavContainer = qs('#desktop-nav-sub');
  const separator = qs('#nav-separator');
  const currentPageId = getCurrentPageId();

  renderNavLinks(mainNavContainer, mainNavLinksConfig, false);

  const subLinksForCurrentPage = getSubNavLinksForPage(currentPageId);
  renderNavLinks(subNavContainer, subLinksForCurrentPage, false);

  if (mainNavContainer && subNavContainer && separator) {
    if (mainNavContainer.children.length > 0 && subNavContainer.children.length > 0) {
      separator.style.display = 'inline-block';
    } else {
      separator.style.display = 'none';
    }
  }
}

function populateMobileNavigation() {
  const mobileMainNavContainer = qs('#mobile-nav-main');
  const mobileSubNavContainer = qs('#mobile-nav-sub');
  const mobileSubNavTitleElement = qs('#mobile-sub-nav-title');
  const mobileSubNavSection = qs('#mobile-sub-nav-section');

  const currentPageId = getCurrentPageId();

  renderNavLinks(mobileMainNavContainer, mainNavLinksConfig, true);

  const subLinksForCurrentPage = getSubNavLinksForPage(currentPageId);
  if (subLinksForCurrentPage.length > 0) {
    renderNavLinks(mobileSubNavContainer, subLinksForCurrentPage, true);
    if (mobileSubNavTitleElement) {
      mobileSubNavTitleElement.textContent = subNavTitlesConfig[currentPageId] || "Navigation rapide";
      mobileSubNavTitleElement.style.display = 'block';
    }
    if (mobileSubNavSection) mobileSubNavSection.style.display = 'block';
  } else {
    if (mobileSubNavTitleElement) mobileSubNavTitleElement.style.display = 'none';
    if (mobileSubNavContainer) mobileSubNavContainer.innerHTML = '';
    if (mobileSubNavSection) mobileSubNavSection.style.display = 'none';
  }
}


function updateThemeToggleIcon() {
  const toggleBtn = qs("#theme-toggle");
  if (toggleBtn) {
    const icon = toggleBtn.querySelector("i");
    if (icon && window.themeUtils) {
      icon.className = window.themeUtils.getCurrentTheme() === "dark" ? "fas fa-sun" : "fas fa-moon";
    }
  }
}

function setupThemeToggle() {
  const toggleBtn = qs("#theme-toggle");
  if (toggleBtn && window.themeUtils) {
    updateThemeToggleIcon();
    toggleBtn.addEventListener("click", () => {
      window.themeUtils.toggleTheme();
      updateThemeToggleIcon();
    });
  } else if (toggleBtn) {
    console.warn("themeUtils non trouvé, le bouton de thème ne sera pas fonctionnel.");
  }
}

function handleAnchorLinkClick(e, linkElement) {
  const href = linkElement.getAttribute('href');
  if (!href.includes('#')) return;

  const targetId = href.substring(href.indexOf('#') + 1);
  const targetElement = document.getElementById(targetId);

  const hrefPath = href.split('#')[0];
  const currentPagePath = window.location.pathname;

  const isSamePageTarget = 
    (hrefPath === currentPagePath) || 
    (hrefPath.replace('/index', '') === currentPagePath.replace('/index', '')) ||
    (hrefPath === '' && (currentPagePath === '/' || currentPagePath.endsWith('/index')));


  if (targetElement && isSamePageTarget) {
    e.preventDefault(); 
    setTimeout(() => {
      const headerHeight = qs('#main-header') ? qs('#main-header').offsetHeight : 0;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 15;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      if (history.pushState && targetId) {
        history.pushState(null, null, `#${targetId}`);
      } else if (targetId) {
        window.location.hash = `#${targetId}`;
      }
      updateActiveNavLinks();
    }, 50);

  } else if (!isSamePageTarget && href.includes('#')) {
  }
}

function initAnchorLinks() {
  document.addEventListener('click', function (e) {
    let target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.tagName === 'A' && target.getAttribute('href')) {
      handleAnchorLinkClick(e, target);
    }
  });

  window.addEventListener('load', () => {
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        setTimeout(() => {
          const headerHeight = qs('#main-header') ? qs('#main-header').offsetHeight : 0;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight - 15;
          window.scrollTo({ top: offsetPosition, behavior: 'auto' });
          updateActiveNavLinks(); 
        }, 100); 
      }
    } else {
        updateActiveNavLinks();
    }
  });

  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveNavLinks, 150);
  });
}


function updateActiveNavLinks() {
  const currentPath = window.location.pathname.replace(/\/index(\.html)?$/, '/');
  const currentHash = window.location.hash;
  const navLinks = qsa('#desktop-nav-main a, #desktop-nav-sub a, #mobile-nav-main a, #mobile-nav-sub a'); 

  navLinks.forEach(a => {
    const linkHref = a.getAttribute('href');
    if (!linkHref) return;

    let linkPath = linkHref.split('#')[0].replace(/\/index(\.html)?$/, '/');
    const linkHash = linkHref.includes('#') ? linkHref.substring(linkHref.indexOf('#')) : '';
    if (linkPath === '') {
        linkPath = '/';
    }


    let isActive = false;
    
    if (linkPath === currentPath) {
        if ((linkHash && linkHash === currentHash) || (!linkHash && !currentHash)) {
            isActive = true;
        }
        if ((a.parentElement.parentElement.id === 'desktop-nav-main' || a.parentElement.parentElement.id === 'mobile-nav-main') &&
            linkPath === '/' && !linkHash && currentPath === '/' && currentHash) {
             isActive = true;
        }
        if (linkHash && linkHash !== currentHash && currentPath === linkPath) {
            isActive = false;
        }
    }


    if (isActive) {
      a.classList.add('active-nav-link');
    } else {
      a.classList.remove('active-nav-link');
    }
  });
}


function setupMobileMenuInteractions() {
  const hamburgerBtn = qs(".hamburger-menu-btn");
  const mobileMenuOverlayContainer = qs("#main-mobile-menu-overlay");

  function openMobileMenu() {
    if (mobileMenuOverlayContainer) {
        populateMobileNavigation();
        updateActiveNavLinks();
        mobileMenuOverlayContainer.classList.add("open");
        document.body.classList.add("mobile-menu-open");
    }
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "true");
  }

  function closeMobileMenu() {
    if (mobileMenuOverlayContainer) mobileMenuOverlayContainer.classList.remove("open");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-menu-open");
  }

  if (hamburgerBtn && mobileMenuOverlayContainer) {
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isMenuOpen = mobileMenuOverlayContainer.classList.contains("open");
      
      if (isMenuOpen) {
        closeMobileMenu();
      } else {
        openMobileMenu();
        const mobileMenuContent = qs(".mobile-menu-content", mobileMenuOverlayContainer);
        const currentCloseBtn = mobileMenuContent ? qs(".close-mobile-menu-btn", mobileMenuContent) : null;
        
        if (currentCloseBtn && !currentCloseBtn.dataset.listenerAttached) {
          currentCloseBtn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            closeMobileMenu();
          });
          currentCloseBtn.dataset.listenerAttached = "true";
        }
      }
    });

    mobileMenuOverlayContainer.addEventListener("click", (e) => {
      if (e.target === mobileMenuOverlayContainer) closeMobileMenu();
    });

    const mobileMenuContentContainer = qs(".mobile-menu-content", mobileMenuOverlayContainer);
    if (mobileMenuContentContainer) {
        mobileMenuContentContainer.addEventListener('click', (e) => {
            let targetLink = e.target;
            while(targetLink && targetLink.tagName !== 'A' && targetLink !== mobileMenuContentContainer) {
                targetLink = targetLink.parentElement;
            }

            if (targetLink && targetLink.tagName === 'A') {
                const href = targetLink.getAttribute('href');
                if (!href) return;

                const isJustAnAnchor = href.startsWith('#');
                const isPathWithAnchor = href.includes('#') && href.split('#')[0] === window.location.pathname.replace(/\/index(\.html)?$/, '/');
                
                if (isJustAnAnchor || isPathWithAnchor) {
                    setTimeout(() => { closeMobileMenu(); }, 150); 
                } else {
                    closeMobileMenu();
                }
            }
        });
    }
  }
}


export function initHeader() {
  if (typeof window.themeUtils === 'undefined') {
    console.warn("themeUtils (theme-init.js) n'est pas chargé. Le bouton de thème pourrait ne pas fonctionner.");
  }
  setupThemeToggle();
  populateDesktopNavigation();
  initAnchorLinks(); 
}
export { setupMobileMenuInteractions };