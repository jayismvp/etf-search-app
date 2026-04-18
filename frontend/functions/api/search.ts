interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query || query.trim() === "") {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  }

  const lowerQuery = query.toLowerCase();

  try {
    // 종목명, 종목티커, ETF 이름에서 검색
    const { results } = await env.DB.prepare(`
      SELECT 
        stock_name, 
        stock_ticker, 
        etf_name, 
        etf_ticker, 
        listing_date, 
        NAV as nav, 
        fee, 
        weight 
      FROM stocks 
      WHERE lower(stock_name) LIKE ? 
         OR lower(stock_ticker) LIKE ? 
         OR lower(etf_name) LIKE ?
      ORDER BY nav DESC
    `).bind(`%${lowerQuery}%`, `%${lowerQuery}%`, `%${lowerQuery}%`).all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
