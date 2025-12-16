import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
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
        error: String(error)
      }),
      { status: 500 }
    );
  }
};
