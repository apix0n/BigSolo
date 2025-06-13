// functions/api/imgchest-views.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const postId = url.searchParams.get('id');

  if (!postId) {
    return new Response(JSON.stringify({ error: 'Post ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const pageUrl = `https://imgchest.com/p/${postId}`;
  try {
    const pageResponse = await fetch(pageUrl, {
      method: 'GET',
      headers: {
        // Utiliser un User-Agent qui ressemble plus à un navigateur peut parfois aider
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!pageResponse.ok) {
      let errorBody = `ImgChest Page Error ${pageResponse.status}`;
      try { errorBody = await pageResponse.text(); } catch(e) { /* ignore si le corps ne peut être lu */ }
      console.error(`[ImgChest Scraper] Failed to fetch ImgChest page for ID ${postId}: ${pageResponse.status} ${pageResponse.statusText}. Body: ${errorBody.substring(0, 200)}`);
      return new Response(JSON.stringify({ error: `Failed to fetch page from ImgChest. Status: ${pageResponse.status}` }), {
        status: pageResponse.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const htmlText = await pageResponse.text();

    // Tentative 1: Extraire depuis la balise meta description
    const metaDescRegex = /<meta\s+name=["']description["']\s+content=["']Post with\s+([\d,]+)\s+views/i;
    const viewsMatchMeta = htmlText.match(metaDescRegex);
    
    if (viewsMatchMeta && viewsMatchMeta[1]) {
      const viewsString = viewsMatchMeta[1].replace(/,/g, ''); // Enlever les virgules des milliers
      const views = parseInt(viewsString, 10);
      if (!isNaN(views)) {
        return new Response(JSON.stringify({ views: views }), { // RETOURNER IMMÉDIATEMENT SI SUCCÈS
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      } else {
        console.warn(`[ImgChest Scraper] (from meta) Parsed NaN for views for ID ${postId}. Match was: ${viewsMatchMeta[1]}`);
      }
    }
    // Si on arrive ici, la meta n'a pas fonctionné ou n'a pas donné un nombre valide
    console.warn(`[ImgChest Scraper] Could not scrape valid views from meta description for ID ${postId}.`);

    // Tentative 2: Extraire depuis l'attribut data-page
    const dataPageRegex = /<div\s+id=["']app["']\s+data-page=["'](.*?)["']>/;
    const jsonDataMatch = htmlText.match(dataPageRegex);

    if (jsonDataMatch && jsonDataMatch[1]) {
        let pageDataString = jsonDataMatch[1];
        pageDataString = pageDataString.replace(/"/g, '"')
                                       .replace(/&/g, '&')
                                       .replace(/</g, '<')
                                       .replace(/>/g, '>');
        try {
            const pageData = JSON.parse(pageDataString);
            if (pageData && pageData.props && pageData.props.post && typeof pageData.props.post.views !== 'undefined') {
                const viewsFromDataPage = parseInt(pageData.props.post.views, 10);
                 if (!isNaN(viewsFromDataPage)) {
                    console.log(`[ImgChest Scraper] SUCCESS (from data-page): Scraped ${viewsFromDataPage} views for ID ${postId}.`);
                    return new Response(JSON.stringify({ views: viewsFromDataPage }), { // RETOURNER IMMÉDIATEMENT SI SUCCÈS
                        status: 200,
                        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    });
                } else {
                    console.warn(`[ImgChest Scraper] (from data-page) Parsed NaN for views for ID ${postId}. Value was: ${pageData.props.post.views}`);
                }
            } else {
                 console.warn(`[ImgChest Scraper] data-page JSON for ID ${postId} does not have expected structure (props.post.views).`);
            }
        } catch(e) {
            console.warn(`[ImgChest Scraper] Failed to parse data-page JSON for ID ${postId}. Error: ${e.message}. String (start): ${pageDataString.substring(0,100)}...`);
        }
    } else {
        console.warn(`[ImgChest Scraper] data-page attribute not found for ID ${postId}.`);
    }

    // Si les deux méthodes échouent :
    console.error(`[ImgChest Scraper] FAILED (all methods): Could not extract views for ID ${postId}.`);
    return new Response(JSON.stringify({ error: 'Could not extract views from ImgChest page using any method.' }), {
      status: 502, // Bad Gateway, car la source (ImgChest HTML) n'a pas fourni les données attendues
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error(`[ImgChest Scraper] CRITICAL ERROR (Network/Fetch) for ID ${postId}:`, error);
    return new Response(JSON.stringify({ error: 'Internal server error in proxy function while scraping ImgChest page.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}