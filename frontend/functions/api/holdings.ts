interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const etfTicker = url.searchParams.get('ticker');

  if (!etfTicker) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 특정 ETF의 전체 구성 종목 조회
    const { results } = await env.DB.prepare(`
      SELECT 
        stock_name, 
        stock_ticker, 
        contract, 
        amount, 
        weight, 
        fee, 
        taxation, 
        premium_discount 
      FROM stocks 
      WHERE etf_ticker = ?
    `).bind(etfTicker).all();

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
