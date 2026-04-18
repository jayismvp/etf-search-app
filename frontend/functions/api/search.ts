interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  try {
    // 1. 전체보기: 검색어가 비어있는 경우
    if (!query || query.trim() === "") {
      const { results } = await env.DB.prepare(`
        SELECT 
          MAX(stock_name) as stock_name, 
          MAX(stock_ticker) as stock_ticker, 
          etf_name, 
          etf_ticker, 
          listing_date, 
          NAV as nav, 
          fee, 
          MAX(weight) as weight 
        FROM stocks 
        GROUP BY etf_ticker
        ORDER BY nav DESC
      `).all();

      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const searchQuery = query.trim();

    // 2. 정확한 검색: LIKE 대신 = 를 사용하여 정확히 일치하는 종목명 또는 티커만 필터링
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
      WHERE stock_name = ? 
         OR stock_ticker = ?
      ORDER BY nav DESC
    `).bind(searchQuery, searchQuery).all();

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
