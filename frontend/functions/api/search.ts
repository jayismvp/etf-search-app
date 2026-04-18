interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  try {
    // 1. 검색어가 없거나 빈 경우: 전체 ETF 목록 반환 (유니크한 ETF 378종)
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

    const lowerQuery = query.toLowerCase();

    // 2. 검색어가 있는 경우: 오직 '주식 종목명'과 '종목 티커'에서만 검색 (ETF 이름 제외)
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
      ORDER BY nav DESC
    `).bind(`%${lowerQuery}%`, `%${lowerQuery}%`).all();

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
