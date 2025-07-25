// functions/_middleware.js

// --- HELPER FUNCTION: Copied from client-side domUtils.js ---
function slugify(text) {
  if (!text) return "";
  return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/\s+/g, "_").replace(/[^\w-]+/g, "").replace(/--+/g, "_");
}

/**
 * Génère les balises meta HTML à partir d'un objet de données.
 * @param {object} meta - Un objet contenant title, description, image, url.
 * @returns {string} La chaîne de caractères HTML des balises meta.
 */
function generateMetaTags(meta) {
  const title = meta.title || 'BigSolo';
  const description = meta.description || 'Retrouvez toutes les sorties de Big_herooooo en un seul et unique endroit !';
  const imageUrl = meta.image || '/img/banner.jpg'; // Default banner
  const url = meta.url || 'https://bigsolo.org';

  return `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
  `;
}

/**
 * La fonction principale du middleware.
 */
export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const pathname = url.pathname;

    // --- Redirection pour les anciennes URLs ---
    if (pathname.startsWith('/series-detail/')) {
        const slugWithPotentialSubpaths = pathname.substring('/series-detail/'.length);
        const newUrl = new URL(`/${slugWithPotentialSubpaths}`, url.origin);
        return Response.redirect(newUrl.toString(), 301);
    }

    // --- Définition des métadonnées pour les pages statiques ---
    const staticPageMeta = {
        '/': {
            title: 'BigSolo – Accueil',
            description: 'Retrouvez toutes les sorties de Big_herooooo en un seul et unique endroit !',
            htmlFile: '/index.html'
        },
        '/index.html': {
            title: 'BigSolo – Accueil',
            description: 'Retrouvez toutes les sorties de Big_herooooo en un seul et unique endroit !',
            htmlFile: '/index.html'
        },
        '/galerie': {
            title: 'BigSolo – Galerie',
            description: 'Découvrez toutes les colorisations et fan-arts de la communauté !',
            htmlFile: '/galerie.html'
        },
        '/galerie.html': {
            title: 'BigSolo – Galerie',
            description: 'Découvrez toutes les colorisations et fan-arts de la communauté !',
            htmlFile: '/galerie.html'
        },
        '/presentation.html': {
            title: 'BigSolo – Questions & Réponses',
            description: 'Les réponses de BigSolo à vos questions sur son parcours dans le scantrad.',
            htmlFile: '/presentation.html'
        },
    };

    // --- Gestion des pages statiques avec métadonnées dynamiques ---
    if (staticPageMeta[pathname]) {
        const metaData = staticPageMeta[pathname];
        const assetUrl = new URL(metaData.htmlFile, url.origin);
        const response = await env.ASSETS.fetch(assetUrl);
        let html = await response.text();
        const tags = generateMetaTags({ ...metaData, url: url.href });
        html = html.replace('<!-- DYNAMIC_OG_TAGS_PLACEHOLDER -->', tags);
        return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    // --- Gestion de la galerie de colorisation détaillée ---
    const galleryPattern = /^\/galerie\/(\d+)\/?$/;
    if (galleryPattern.test(pathname)) {
        // La logique existante est déjà bonne pour ça, on la garde.
        return next();
    }
    
    // --- Gestion des slugs de séries ---
    const knownPrefixes = ['/css/', '/js/', '/img/', '/data/', '/includes/', '/functions/', '/api/'];
    if (!knownPrefixes.some(prefix => pathname.startsWith(prefix))) {
        const pathSegments = pathname.split('/').filter(Boolean);
        const seriesSlug = pathSegments[0];

        if (seriesSlug) {
            try {
                // Étape 1: Trouver le fichier JSON correspondant au slug
                const config = await env.ASSETS.fetch(new URL('/data/config.json', url.origin)).then(res => res.json());
                const seriesFiles = config.LOCAL_SERIES_FILES || [];
                const filename = seriesFiles.find(f => slugify(f.replace('.json', '')) === seriesSlug);

                if (filename) {
                    // Étape 2: Récupérer les données de la série
                    const seriesData = await env.ASSETS.fetch(new URL(`/data/series/${filename}`, url.origin)).then(res => res.json());
                    
                    let metaData = {};
                    let baseHtmlFile = '/series-detail.html';

                    // Étape 3: Déterminer la vue (détail ou couvertures) et préparer les métadonnées
                    if (pathSegments.length > 1 && pathSegments[1] === 'cover') {
                        baseHtmlFile = '/series-covers.html';
                        metaData = {
                            title: `BigSolo – Couvertures de ${seriesData.title}`,
                            description: `Découvrez toutes les couvertures de la série ${seriesData.title} !`,
                            image: seriesData.cover // On peut utiliser la cover principale comme image de partage
                        };
                    } else {
                        metaData = {
                            title: `BigSolo – ${seriesData.title}`,
                            description: seriesData.description,
                            image: seriesData.cover
                        };
                    }

                    // Étape 4: Servir le HTML de base en y injectant les balises meta
                    const assetUrl = new URL(baseHtmlFile, url.origin);
                    const response = await env.ASSETS.fetch(assetUrl);
                    let html = await response.text();
                    const tags = generateMetaTags({ ...metaData, url: url.href });
                    html = html.replace('<!-- DYNAMIC_OG_TAGS_PLACEHOLDER -->', tags);
                    return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
                }
            } catch (error) {
                console.error(`Error processing series slug "${seriesSlug}":`, error);
                // En cas d'erreur, on continue pour laisser Cloudflare Pages servir une éventuelle page 404
            }
        }
    }

    // Pour toute autre requête (fichiers css, js, etc.), laisser Cloudflare Pages gérer
    return next();
}