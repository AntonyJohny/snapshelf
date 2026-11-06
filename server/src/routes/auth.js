const express = require("express");
const { authenticateUser, createToken, createUser, verifyToken } = require("../services/auth");

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof password !== "string") {
      return res.status(400).json({ error: "Enter an email and password." });
    }

    const result = await createUser(email, password);
    if (result.error) {
      const status = result.code === "ACCOUNT_EXISTS" ? 409 : 400;
      return res.status(status).json({ error: result.error });
    }

    res.status(201).json({ token: createToken(result.user), user: result.user });
  } catch (error) {
    console.error("Could not create account:", error);
    res.status(500).json({ error: "Could not create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Enter an email and password." });
    }

    const user = await authenticateUser(email, password);
    if (!user) return res.status(401).json({ error: "Email or password is incorrect." });
    res.json({ token: createToken(user), user });
  } catch (error) {
    console.error("Could not sign in:", error);
    res.status(500).json({ error: "Could not sign in." });
  }
});

router.get("/me", (req, res) => {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  const user = match && verifyToken(match[1]);
  if (!user) return res.status(401).json({ error: "Authentication required." });
  res.json({ user });
});

module.exports = router;
