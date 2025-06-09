// functions/_middleware.js

export async function onRequest(context) {
  const { request, env } = context; // `next` n'est pas nécessaire si on utilise env.ASSETS.fetch(request) à la fin
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Pattern pour /series-detail/slug/cover
  const seriesCoverPattern = /^\/series-detail\/([a-zA-Z0-9_-][a-zA-Z0-9_.-]*)\/cover\/?$/;
  if (seriesCoverPattern.test(pathname)) {
    const assetUrl = new URL("/series-covers.html", url.origin);
    console.log(`[Middleware] Path "${pathname}" matches series COVERS pattern. Serving content from "${assetUrl.pathname}"`);
    // On veut servir le contenu de series-covers.html SANS changer l'URL du navigateur.
    // Utiliser new Request(assetUrl.toString()) SANS passer le `request` original comme deuxième argument
    // pour ASSETS.fetch peut parfois éviter que l'URL soit modifiée. Essayons cela.
    return env.ASSETS.fetch(assetUrl.toString()); 
  }

  // Pattern pour /series-detail/slug/chapitre ou /series-detail/slug
  const seriesDetailPattern = /^\/series-detail\/([a-zA-Z0-9_-][a-zA-Z0-9_.-]*)(\/([a-zA-Z0-9_.-]+))?\/?$/;
  if (seriesDetailPattern.test(pathname)) {
    const assetUrl = new URL("/series-detail.html", url.origin);
    console.log(`[Middleware] Path "${pathname}" matches series DETAIL pattern. Serving content from "${assetUrl.pathname}"`);
    return env.ASSETS.fetch(assetUrl.toString());
  }

  // Si AUCUN des patterns ci-dessus ne correspond, on laisse Cloudflare Pages servir l'asset statique.
  console.log(`[Middleware] Path "${pathname}" did not match any rewrite patterns. Passing to env.ASSETS.fetch for static asset.`);
  return env.ASSETS.fetch(request); 
}