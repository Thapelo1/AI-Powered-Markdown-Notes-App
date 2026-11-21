// Verify bearer tokens with Supabase before allowing protected routes to use the account ID.
export function requireUser(supabase) {
  return async function authenticate(req, res, next) {
    if (!supabase) {
      return res.status(503).json({ error: "Supabase authentication is not configured on the server." });
    }

    const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: "Sign in to use AI actions." });

    try {
      // Verify the access token with Supabase; a user ID supplied by the browser is never trusted.
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) {
        const status = [400, 401, 403].includes(error.status) ? 401 : 503;
        return res.status(status).json({
          error: status === 401 ? "Your session is invalid or expired. Sign in again." : "Authentication is temporarily unavailable.",
        });
      }
      if (!user) return res.status(401).json({ error: "Your session is invalid or expired. Sign in again." });

      req.authUser = user;
      return next();
    } catch (error) {
      console.error("Supabase authentication failed:", error.message);
      return res.status(503).json({ error: "Authentication is temporarily unavailable." });
    }
  };
}
