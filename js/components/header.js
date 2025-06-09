import { qs, qsa } from '../utils/domUtils.js';

const mainNavLinksConfig = [
  { text: "Accueil", href: "/index.html", icon: "fas fa-home", id: "home" },
  { text: "Fan-Arts", href: "/galerie.html", icon: "fa-solid fa-palette", id: "gallery" },
  { text: "À propos", href: "/presentation.html", icon: "fas fa-user", id: "about" }
];

const subNavTitlesConfig = {
  homepage: "Sur cette page",
};

const subNavLinksConfig = {
  homepage: [
    { text: "Dernières sorties", href: "/index.html#latest-chapters-section", id: "latest" },
    { text: "Séries", href: "/index.html#on-going-section", id: "series" },
    { text: "One-Shot", href: "/index.html#one-shot-section", id: "oneshots" }
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
  if (path.includes("index.html") || path === "/") return "homepage";
  if (path.includes("galerie.html")) return "galeriepage";
  if (path.includes("presentation.html")) return "presentationpage";
  if (path.includes("series-detail.html")) return "seriesdetailpage";
  return null;
}

function renderNavLinks(container, links, isMobile = false) {
  if (!container) return;
  container.innerHTML = '';

  links.forEach(link => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.href;
        
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

function populateDesktopNavigation() {
  const mainNavContainer = qs('#desktop-nav-main');
  const subNavContainer = qs('#desktop-nav-sub');
  const separator = qs('#nav-separator');
  const currentPageId = getCurrentPageId();

  renderNavLinks(mainNavContainer, mainNavLinksConfig, false);

  const subLinksForCurrentPage = subNavLinksConfig[currentPageId] || [];
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

  const subLinksForCurrentPage = subNavLinksConfig[currentPageId] || [];
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
  updateThemeToggleIcon();
  if (toggleBtn && window.themeUtils) {
    toggleBtn.addEventListener("click", () => {
      window.themeUtils.toggleTheme();
      updateThemeToggleIcon();
    });
  }
}

function handleAnchorLinkClick(e, linkElement) {
  const href = linkElement.getAttribute('href');
  const targetId = href.substring(href.indexOf('#') + 1);
  const targetElement = document.getElementById(targetId);

  const hrefPath = href.split('#')[0];
  const currentPagePath = window.location.pathname;
  
  const isSamePageTarget = 
    (hrefPath === currentPagePath) || 
    (hrefPath === "/index.html" && currentPagePath === "/") ||
    (hrefPath === "" && currentPagePath === "/") || 
    (hrefPath === "" && currentPagePath.endsWith("/index.html"));

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

      if (history.pushState) {
        history.pushState(null, null, `#${targetId}`);
      } else {
        window.location.hash = `#${targetId}`;
      }
      updateActiveNavLinks();
    }, 100); 

  } else if (!isSamePageTarget && (href.startsWith('/index.html#') || (href.startsWith('/#') && href.length > 2))) {
    if (href.startsWith('/#') && href.length > 2) {
      window.location.href = '/index.html#' + targetId;
    } else {
      window.location.href = href; 
    }
    e.preventDefault();
  }
}

function initAnchorLinks() {
  document.addEventListener('click', function (e) {
    let target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.tagName === 'A' && target.getAttribute('href')) {
      const href = target.getAttribute('href');
      if (href.includes('#')) {
        handleAnchorLinkClick(e, target);
      }
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
        }, 200); 
      }
    }
  });

  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveNavLinks, 150);
  });
}


function updateActiveNavLinks() {
  const currentPath = window.location.pathname;
  const currentHash = window.location.hash;
  const navLinks = qsa('#desktop-nav-main a, #desktop-nav-sub a, #mobile-nav-main a, #mobile-nav-sub a'); 

  navLinks.forEach(a => {
    const linkHref = a.getAttribute('href');
    const linkPath = linkHref.split('#')[0];
    const linkHash = linkHref.includes('#') ? linkHref.substring(linkHref.indexOf('#')) : '';

    let isActive = false;
    if (linkPath === currentPath || (linkPath === "/index.html" && currentPath === "/")) {
      if (linkHash && linkHash === currentHash) {
        isActive = true;
      } else if (!linkHash && !currentHash) {
        isActive = true;
      }
    }
    if (linkPath === "/index.html" && !linkHash && currentPath === "/" && !currentHash) {
        isActive = true;
    }
    
    if (a.parentElement.parentElement.id === 'desktop-nav-main' || a.parentElement.parentElement.id === 'mobile-nav-main') {
        if (linkPath === "/index.html" && !linkHash && (currentPath === "/" || currentPath === "/index.html") && currentHash) {
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
    }
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "true");
  }

  function closeMobileMenu() {
    if (mobileMenuOverlayContainer) mobileMenuOverlayContainer.classList.remove("open");
    if (hamburgerBtn) hamburgerBtn.setAttribute("aria-expanded", "false");
  }

  if (hamburgerBtn && mobileMenuOverlayContainer) {
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const mobileMenuContent = qs(".mobile-menu-content", mobileMenuOverlayContainer);
      const currentCloseBtn = mobileMenuContent ? qs(".close-mobile-menu-btn", mobileMenuContent) : null;
      
      if (currentCloseBtn && !currentCloseBtn.dataset.listenerAttached) {
        currentCloseBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          closeMobileMenu();
        });
        currentCloseBtn.dataset.listenerAttached = "true";
      }
      mobileMenuOverlayContainer.classList.contains("open") ? closeMobileMenu() : openMobileMenu();
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
                const isCurrentPageAnchor = href.startsWith('#') || (href.startsWith(window.location.pathname + '#'));
                const isIndexPageAnchor = href.includes('/index.html#') || href.startsWith('/#');
                const isCurrentlyOnIndex = window.location.pathname === '/' ||
                                           window.location.pathname.endsWith('/index.html');

                if (isCurrentPageAnchor || (isIndexPageAnchor && isCurrentlyOnIndex)) {
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
  setupThemeToggle();
  populateDesktopNavigation();
  initAnchorLinks(); 
  updateActiveNavLinks(); 
}
export { setupMobileMenuInteractions };