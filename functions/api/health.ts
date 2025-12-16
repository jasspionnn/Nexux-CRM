export const onRequestGet = async ({ env }: { env: { DB: D1Database } }) => {
  try {
    const result = await env.DB
      .prepare("SELECT 1 as ok")
      .first();

    return new Response(
      JSON.stringify({
        status: "ok",
        db: result
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: String(error)
      }),
      { status: 500 }
    );
  }
};
