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

  return `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${url}" />
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
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

    const staticPageMeta = {
        '': { title: 'Accueil - BigSolo', description: 'Retrouvez toutes les sorties de Big_herooooo en un seul et unique endroit !', htmlFile: '/index.html', image: '/img/banner.jpg' },
        '/index.html': { title: 'Accueil - BigSolo', description: 'Retrouvez toutes les sorties de Big_herooooo en un seul et unique endroit !', htmlFile: '/index.html', image: '/img/banner.jpg' },
        '/galerie': { title: 'Galerie - BigSolo', description: 'Découvrez toutes les colorisations et fan-arts de la communauté !', htmlFile: '/galerie.html' },
        '/galerie.html': { title: 'Galerie - BigSolo', description: 'Découvrez toutes les colorisations et fan-arts de la communauté !', htmlFile: '/galerie.html' },
        '/presentation': { title: 'Questions & Réponses - BigSolo', description: 'Les réponses de BigSolo à vos questions sur son parcours dans le scantrad.', htmlFile: '/presentation.html' },
        '/presentation.html': { title: 'Questions & Réponses - BigSolo', description: 'Les réponses de BigSolo à vos questions sur son parcours dans le scantrad.', htmlFile: '/presentation.html' },
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
    if (galleryPattern.test(originalPathname)) {
      // La logique de la galerie reste inchangée
    }
    
    const knownPrefixes = ['/css/', '/js/', '/img/', '/data/', '/includes/', '/functions/', '/api/', '/fonts/'];
    if (!knownPrefixes.some(prefix => originalPathname.startsWith(prefix))) {
        const pathSegments = originalPathname.split('/').filter(Boolean);
        const seriesSlug = pathSegments[0];

        if (seriesSlug) {
            try {
                const config = await env.ASSETS.fetch(new URL('/data/config.json', url.origin)).then(res => res.json());
                const seriesFiles = config.LOCAL_SERIES_FILES || [];

                const allSeriesDataPromises = seriesFiles.map(filename => 
                    env.ASSETS.fetch(new URL(`/data/series/${filename}`, url.origin))
                        .then(res => res.json())
                        .then(data => ({ data, filename }))
                        .catch(e => { console.error(`Failed to load ${filename}`, e); return null; })
                );
                
                const allSeriesResults = (await Promise.all(allSeriesDataPromises)).filter(Boolean);
                const foundSeries = allSeriesResults.find(s => s && s.data && slugify(s.data.title) === seriesSlug);

                if (foundSeries) {
                    const seriesData = foundSeries.data;
                    const jsonFilename = foundSeries.filename;
                    
                    // --- DÉBUT DE LA CORRECTION ---
                    // On reproduit ici la logique de fetchUtils.js pour créer la base64Url
                    const rawGithubFileUrl = `${config.URL_RAW_JSON_GITHUB}${jsonFilename}`;
                    const base64Url = seriesData.cubari_gist_id ? seriesData.cubari_gist_id : btoa(rawGithubFileUrl);
                    
                    // On ajoute la propriété manquante à l'objet seriesData
                    seriesData.base64Url = base64Url;
                    // --- FIN DE LA CORRECTION ---
                    
                    const ogImageFilename = jsonFilename.replace('.json', '.png');
                    const ogImageUrl = new URL(`/img/banner/${ogImageFilename}`, url.origin).toString();
                    
                    let metaData = {
                        title: `${seriesData.title} - BigSolo`,
                        description: seriesData.description,
                        image: ogImageUrl,
                    };
                    let baseHtmlFile = '/series-detail.html';
                    
                    if (pathSegments.length > 1 && pathSegments[1] === 'cover') {
                        baseHtmlFile = '/series-covers.html';
                        metaData.title = `Couvertures de ${seriesData.title} - BigSolo`;
                        metaData.description = `Découvrez toutes les couvertures de la série ${seriesData.title} !`;
                    }
                    
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