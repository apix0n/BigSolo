export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page")) || 1;
  const flush = url.searchParams.get("flush") === "true";
  const cacheKey = `imgchest:page:${page}`;

  if (flush) {
    await env.IMG_CHEST_CACHE.delete(cacheKey);
    return new Response(
      JSON.stringify({ message: `Cache for page ${page} flushed.` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check cache
  const cached = await env.IMG_CHEST_CACHE.get(cacheKey, { type: "json" });
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "HIT",
      },
    });
  }

  const imgchestUsername = "Big_herooooo";
  const apiUrl = `https://imgchest.com/api/posts?username=${imgchestUsername}&sort=new&page=${page}&status=0`;
  const fetchHeaders = {
    "User-Agent": "BigSoloSite-PageFetcher/1.0 (contact: ton-email@exemple.com)",
    Accept: "application/json",
  };

  try {
    const apiResponse = await fetch(apiUrl, {
      method: "GET",
      headers: fetchHeaders,
    });

    if (!apiResponse.ok) {
      return new Response(JSON.stringify({ error: `API error ${apiResponse.status}` }), {
        status: apiResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await apiResponse.json();

    if (!data || !Array.isArray(data.data)) {
      return new Response(
        JSON.stringify({ error: "Unexpected JSON structure", posts: [] }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const postsData = data.data.map((post) => ({
      id: post.slug || post.id,
      views: post.views,
      title: post.title,
      nsfw: post.nsfw,
    }));

    // Cache postsData 1 jour
    await env.IMG_CHEST_CACHE.put(cacheKey, JSON.stringify({ posts: postsData }), {
      expirationTtl: 86400,
    });

    return new Response(JSON.stringify({ posts: postsData }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Proxy internal error", posts: [] }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
