export async function onRequest(context) {
  const { env } = context;
  const cacheKey = `imgchest_all_pages_combined`;
  const username = "Big_herooooo";
  const maxPages = 8;

  try {
    const cached = await env.IMG_CHEST_CACHE.get(cacheKey);
    if (cached) {
      console.log("[KV] Returning cached all-pages data.");
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-Cache": "HIT"
        }
      });
    }
  } catch (e) {
    console.warn("[KV ERROR] Failed to read from KV:", e);
  }

  let allPosts = [];

  for (let page = 1; page <= maxPages; page++) {
    const apiUrl = `https://imgchest.com/api/posts?username=${username}&sort=new&page=${page}&status=0`;
    try {
      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent": "BigSoloSite-PageFetcher/1.2",
          Accept: "application/json",
        },
      });

      if (!res.ok) break;

      const json = await res.json();
      if (!json.data || json.data.length === 0) break;

      const simplified = json.data.map(post => ({
        id: post.slug || post.id,
        views: post.views,
        title: post.title,
        nsfw: post.nsfw
      }));

      allPosts.push(...simplified);

      if (json.data.length < 24) break;
    } catch (err) {
      console.error(`Error fetching ImgChest page ${page}:`, err);
      break;
    }
  }

  const payload = JSON.stringify({ posts: allPosts });

  try {
    await env.IMG_CHEST_CACHE.put(cacheKey, payload, { expirationTtl: 3600 });
  } catch (e) {
    console.warn("[KV ERROR] Failed to write to KV:", e);
  }

  return new Response(payload, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "X-Cache": "MISS"
    }
  });
}
