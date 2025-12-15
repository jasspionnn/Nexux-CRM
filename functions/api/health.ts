export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const result = await env.DB
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();

  return new Response(
    JSON.stringify({
      status: "ok",
      tables: result.results,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
