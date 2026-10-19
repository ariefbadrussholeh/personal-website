/** Wraps a route handler so thrown errors come back as JSON the admin UI can show. */
export function safe(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("[api]", e);
      return Response.json({ error: e?.message || "Terjadi kesalahan di server" }, { status: 500 });
    }
  };
}
