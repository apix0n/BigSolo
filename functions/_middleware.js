export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

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