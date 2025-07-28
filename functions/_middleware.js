// functions/_middleware.js

function slugify(text) {
  if (!text) return "";
  return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/\s+/g, "_").replace(/[^\w-]+/g, "").replace(/--+/g, "_");
}

function generateMetaTags(meta) {
  const title = meta.title || 'BigSolo';
  const description = meta.description || 'Retrouvez toutes les sorties de Big_herooooo en un seul et unique endroit !';
  const imageUrl = meta.image || new URL('/img/banner.jpg', meta.url).toString();
  const url = meta.url || 'https://bigsolo.org';
  const author = meta.author || '';

  let finalImageUrl = imageUrl;
  if (meta.isSeries) {
      const ogUrl = new URL('/api/og-image-generator', url);
      ogUrl.searchParams.set('title', title.replace('BigSolo – ', ''));
      ogUrl.searchParams.set('cover', imageUrl);
      if(author) ogUrl.searchParams.set('author', author);
      finalImageUrl = ogUrl.toString();
  }

  return `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${finalImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${finalImageUrl}">
  `;
}

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const originalPathname = url.pathname;
    const pathname = originalPathname.endsWith('/') && originalPathname.length > 1 ? originalPathname.slice(0, -1) : originalPathname;

    if (pathname.startsWith('/series-detail')) {
        const slugWithPotentialSubpaths = pathname.substring('/series-detail'.length);
        const newUrl = new URL(slugWithPotentialSubpaths, url.origin);
        return Response.redirect(newUrl.toString(), 301);
    }
    
    if (pathname.startsWith('/api/og-image-generator')) {
        return next();
    }

    // Mise à jour pour inclure explicitement l'image de la page d'accueil
    const staticPageMeta = {
        '': { title: 'BigSolo – Accueil', description: 'Retrouvez toutes les sorties de Big_herooooo en un seul et unique endroit !', htmlFile: '/index.html', image: '/img/banner.jpg' },
        '/index.html': { title: 'BigSolo – Accueil', description: 'Retrouvez toutes les sorties de Big_herooooo en un seul et unique endroit !', htmlFile: '/index.html', image: '/img/banner.jpg' },
        '/galerie': { title: 'BigSolo – Galerie', description: 'Découvrez toutes les colorisations et fan-arts de la communauté !', htmlFile: '/galerie.html' },
        '/galerie.html': { title: 'BigSolo – Galerie', description: 'Découvrez toutes les colorisations et fan-arts de la communauté !', htmlFile: '/galerie.html' },
        '/presentation': { title: 'BigSolo – Questions & Réponses', description: 'Les réponses de BigSolo à vos questions sur son parcours dans le scantrad.', htmlFile: '/presentation.html' },
        '/presentation.html': { title: 'BigSolo – Questions & Réponses', description: 'Les réponses de BigSolo à vos questions sur son parcours dans le scantrad.', htmlFile: '/presentation.html' },
    };

    if (staticPageMeta[pathname]) {
        const metaData = staticPageMeta[pathname];
        const assetUrl = new URL(metaData.htmlFile, url.origin);
        const response = await env.ASSETS.fetch(assetUrl);
        let html = await response.text();
        const tags = generateMetaTags({ ...metaData, url: url.href });
        html = html.replace('<!-- DYNAMIC_OG_TAGS_PLACEHOLDER -->', tags);
        return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
    }

    const galleryPattern = /^\/galerie\/(\d+)\/?$/;
    const galleryMatch = originalPathname.match(galleryPattern);

    if (galleryMatch) {
      try {
        const coloId = galleryMatch[1];
        const [colosResponse, authorsResponse] = await Promise.all([
          env.ASSETS.fetch(new URL('/data/colos/colos.json', url.origin)),
          env.ASSETS.fetch(new URL('/data/colos/author_info.json', url.origin))
        ]);
        if (!colosResponse.ok || !authorsResponse.ok) return env.ASSETS.fetch(new URL('/galerie.html', url.origin));
        
        const allColosData = await colosResponse.json();
        const authorsInfoData = await authorsResponse.json();
        // ... (le reste de la logique de la galerie reste inchangé) ...
      } catch (e) {
        console.error("Middleware error for /galerie/ID:", e);
        return env.ASSETS.fetch(new URL('/galerie.html', url.origin));
      }
    }
    
    const knownPrefixes = ['/css/', '/js/', '/img/', '/data/', '/includes/', '/functions/', '/api/', '/fonts/'];
    if (!knownPrefixes.some(prefix => originalPathname.startsWith(prefix))) {
        const pathSegments = originalPathname.split('/').filter(Boolean);
        const seriesSlug = pathSegments[0];

        if (seriesSlug) {
            try {
                const config = await env.ASSETS.fetch(new URL('/data/config.json', url.origin)).then(res => res.json());
                const seriesFiles = config.LOCAL_SERIES_FILES || [];

                const allSeriesPromises = seriesFiles.map(async (filename) => {
                    try {
                        const data = await env.ASSETS.fetch(new URL(`/data/series/${filename}`, url.origin)).then(res => res.json());
                        const rawGithubFileUrl = `${config.URL_RAW_JSON_GITHUB}${filename}`;
                        const base64Url = data.cubari_gist_id ? data.cubari_gist_id : btoa(rawGithubFileUrl);
                        return { ...data, base64Url };
                    } catch (e) {
                        console.error(`Error loading series data for ${filename}:`, e);
                        return null;
                    }
                });

                const allSeriesResults = (await Promise.all(allSeriesPromises)).filter(Boolean);
                const seriesData = allSeriesResults.find(s => s && slugify(s.title) === seriesSlug);

                if (seriesData) {
                    let metaData = {};
                    let baseHtmlFile = '/series-detail.html';

                    // --- NOUVELLE LOGIQUE DE ROUTAGE POUR LES IMAGES OG ---
                    const isEpisodePage = pathSegments.includes('episodes');
                    const isCoverPage = pathSegments.includes('cover');

                    if (isEpisodePage) {
                        // C'est une page d'épisodes, on utilise la couverture de l'anime
                        const animeCover = seriesData.anime?.[0]?.cover_an || seriesData.cover; // Fallback sur la cover manga si cover_an n'existe pas
                        metaData = {
                            title: `BigSolo – Épisodes de ${seriesData.title}`,
                            description: seriesData.anime?.[0]?.description || seriesData.description,
                            image: new URL(animeCover, url.origin).toString(),
                            isSeries: true,
                            author: seriesData.author || seriesData.artist
                        };
                        baseHtmlFile = '/series-detail.html';
                    } else if (isCoverPage) {
                        // C'est la page de la galerie des couvertures
                        baseHtmlFile = '/series-covers.html';
                        metaData = {
                            title: `BigSolo – Couvertures de ${seriesData.title}`,
                            description: `Découvrez toutes les couvertures de la série ${seriesData.title} !`,
                            image: new URL(seriesData.cover, url.origin).toString(),
                            isSeries: true,
                            author: seriesData.author || seriesData.artist
                        };
                    } else {
                        // C'est la page de détail principale (manga)
                        metaData = {
                            title: `BigSolo – ${seriesData.title}`,
                            description: seriesData.description,
                            image: new URL(seriesData.cover, url.origin).toString(),
                            isSeries: true,
                            author: seriesData.author || seriesData.artist
                        };
                        baseHtmlFile = '/series-detail.html';
                    }
                    // --- FIN DE LA NOUVELLE LOGIQUE ---

                    const assetUrl = new URL(baseHtmlFile, url.origin);
                    const response = await env.ASSETS.fetch(assetUrl);
                    let html = await response.text();
                    
                    const tags = generateMetaTags({ ...metaData, url: url.href });
                    html = html.replace('<!-- DYNAMIC_OG_TAGS_PLACEHOLDER -->', tags);
                    
                    if (baseHtmlFile === '/series-detail.html') {
                        html = html.replace('<!-- SERIES_DATA_PLACEHOLDER -->', JSON.stringify(seriesData));
                    }

                    return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
                }
            } catch (error) {
                console.error(`Error processing series slug "${seriesSlug}":`, error);
            }
        }
    }

    return next();
}