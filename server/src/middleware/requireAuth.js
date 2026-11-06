const { verifyToken } = require("../services/auth");

function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  const user = match && verifyToken(match[1]);
  if (!user) return res.status(401).json({ error: "Authentication required." });

  req.user = user;
  next();
}

module.exports = requireAuth;
