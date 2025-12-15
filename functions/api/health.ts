export const onRequestGet: PagesFunction<{ DB: D1Database }> = async ({ env }) => {
  const result = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all();

  return new Response(
    JSON.stringify({
      status: 'ok',
      tables: result.results,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
