export const onRequestGet = async ({ env }) => {
  try {
    const result = await env.DB.prepare(
      "SELECT 1 as ok"
    ).first()

    return new Response(
      JSON.stringify({ db: result }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: String(error)
      }),
      { status: 500 }
    )
  }
}
