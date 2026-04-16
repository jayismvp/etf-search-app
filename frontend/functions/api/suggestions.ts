interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query || query.length < 1) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  }

  const lowerQuery = query.toLowerCase();

  try {
    // D1 데이터베이스에서 중복을 제거하고 상위 10개 추출
    // SQL의 LIKE를 사용하여 이름이나 티커에 포함된 경우 검색
    const { results } = await env.DB.prepare(`
      SELECT DISTINCT stock_name, stock_ticker 
      FROM stocks 
      WHERE lower(stock_name) LIKE ? OR lower(stock_ticker) LIKE ?
      LIMIT 10
    `).bind(`%${lowerQuery}%`, `%${lowerQuery}%`).all();

    const suggestions = results.map(row => ({
      name: row.stock_name,
      ticker: row.stock_ticker
    }));

    return new Response(JSON.stringify(suggestions), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
