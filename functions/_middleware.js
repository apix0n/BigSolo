// _middleware.js

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // --- RÈGLES POUR LA GALERIE ---

  // NOUVELLE RÈGLE pour /galerie/ (page de base)
  if (pathname === '/galerie' || pathname === '/galerie/') {
    const assetUrl = new URL("/galerie.html", url.origin);
    return env.ASSETS.fetch(assetUrl.toString());
  }

  // Règle existante pour /galerie/ID
  const galleryPattern = /^\/galerie\/(\d+)\/?$/;
  const galleryMatch = pathname.match(galleryPattern);

  if (galleryMatch) {
    try {
      const coloId = galleryMatch[1];
      const [colosResponse, authorsResponse] = await Promise.all([
        env.ASSETS.fetch(new URL('/data/colos/colos.json', url.origin)),
        env.ASSETS.fetch(new URL('/data/colos/author_info.json', url.origin))
      ]);
      if (!colosResponse.ok || !authorsResponse.ok) {
        return env.ASSETS.fetch(new URL('/galerie.html', url.origin));
      }
      const allColosData = await colosResponse.json();
      const authorsInfoData = await authorsResponse.json();
      const selectedColo = allColosData.find(c => c.id.toString() === coloId);
      const author = selectedColo ? authorsInfoData[selectedColo.author_id] : null;
      const assetUrl = new URL('/galerie.html', url.origin);
      let response = await env.ASSETS.fetch(assetUrl);

      if (selectedColo && author) {
        const authorName = author.username || 'Artiste inconnu';
        const pageInfo = selectedColo.page ? `, Page ${selectedColo.page}` : '';
        const title = `Colorisation Chap. ${selectedColo.chapitre}${pageInfo} par ${authorName} | BigSolo`;
        const description = `Découvrez cette magnifique colorisation du chapitre ${selectedColo.chapitre} par ${authorName}.`;
        const imageUrl = `https://file.garden/aDmcfobZthZjQO3m/images/${selectedColo.id}.webp`;
        const dynamicMetaTags = `
          <title>${title}</title>
          <meta name="description" content="${description}">
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${imageUrl}" />
          <meta property="og:url" content="${url.href}" />
          <meta name="twitter:title" content="${title}">
          <meta name="twitter:description" content="${description}">
          <meta name="twitter:image" content="${imageUrl}">
        `;
        let html = await response.text();
        html = html.replace('<!-- DYNAMIC_OG_TAGS_PLACEHOLDER -->', dynamicMetaTags);
        return new Response(html, {
          headers: { 'Content-Type': 'text/html;charset=UTF-8' }
        });
      } else {
        return response;
      }
    } catch (e) {
      console.error("Middleware error for /galerie/ID:", e);
      return env.ASSETS.fetch(new URL('/galerie.html', url.origin));
    }
  }

  // --- AUTRES RÈGLES ---
  const seriesCoverPattern = /^\/series-detail\/([a-zA-Z0-9_-][a-zA-Z0-9_.-]*)\/cover\/?$/;
  if (seriesCoverPattern.test(pathname)) {
    const assetUrl = new URL("/series-covers.html", url.origin);
    return env.ASSETS.fetch(assetUrl.toString());
  }

  const seriesDetailPattern = /^\/series-detail\/([a-zA-Z0-9_-][a-zA-Z0-9_.-]*)(\/([a-zA-Z0-9_.-]+))?\/?$/;
  if (seriesDetailPattern.test(pathname)) {
    const assetUrl = new URL("/series-detail.html", url.origin);
    return env.ASSETS.fetch(assetUrl.toString());
  }

  return next();
}