export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  const imgchestUsername = "Big_herooooo"; 
  const pageToFetch = parseInt(url.searchParams.get('page'), 10) || 1;
  const apiUrl = `https://imgchest.com/api/posts?username=${imgchestUsername}&sort=new&page=${pageToFetch}&status=0`;

  console.log(`[ImgChest GetPage Proxy] Fetching page ${pageToFetch} for user ${imgchestUsername} from URL: ${apiUrl}`);

  const fetchHeaders = {
    'User-Agent': 'BigSoloSite-PageFetcher/1.2 (Contact: votre-email@exemple.com)',
    'Accept': 'application/json'
  };

  try {
    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: fetchHeaders
    });

    const responseStatus = apiResponse.status;
    const responseContentType = apiResponse.headers.get('content-type');

    if (!apiResponse.ok) {
      let errorBody = `ImgChest API Error ${responseStatus}`;
      try { 
        const errorJson = await apiResponse.json().catch(() => null);
        errorBody = errorJson ? JSON.stringify(errorJson) : await apiResponse.text();
      } catch(e) {}
      console.error(`[ImgChest GetPage Proxy] API error page ${pageToFetch}: ${responseStatus}. Body: ${errorBody.substring(0,100)}`);
      return new Response(JSON.stringify({ error: `API Error ${responseStatus}`, posts: [] }), { 
        status: responseStatus, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (responseContentType && responseContentType.includes('application/json')) {
        const data = await apiResponse.json();
        if (data && Array.isArray(data.data)) {
            const postsData = data.data.map(post => ({
                id: post.slug || post.id, 
                views: post.views,
                title: post.title,
                nsfw: post.nsfw 
            }));
            console.log(`[ImgChest GetPage Proxy] Page ${pageToFetch} - Fetched ${postsData.length} posts.`);
            return new Response(JSON.stringify({ posts: postsData }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        } else {
             console.error(`[ImgChest GetPage Proxy] Page ${pageToFetch} - Unexpected JSON. Data:`, JSON.stringify(data).substring(0, 200));
            return new Response(JSON.stringify({ error: 'Unexpected JSON structure', posts: [] }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
        }
    } else {
        const responseText = await apiResponse.text();
        console.warn(`[ImgChest GetPage Proxy] API for user ${imgchestUsername}, page ${pageToFetch} returned status ${responseStatus} but Content-Type was ${responseContentType}, not JSON. Text: ${responseText.substring(0,200)}`);
        return new Response(JSON.stringify({ error: 'API returned non-JSON', posts: [] }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    }
  } catch (error) {
    console.error(`[ImgChest GetPage Proxy] Page ${pageToFetch} - Network error:`, error);
    return new Response(JSON.stringify({ error: 'Proxy internal error', posts: [] }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
  }
}