const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcryptjs");

const usersFile = path.join(__dirname, "../../data/users.json");
const tokenLifetimeSeconds = 7 * 24 * 60 * 60;
const tokenSecret = process.env.AUTH_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");

if (!process.env.AUTH_TOKEN_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_TOKEN_SECRET must be set in production");
}

if (!process.env.AUTH_TOKEN_SECRET) {
  console.warn("AUTH_TOKEN_SECRET is unset; login tokens will expire when the server restarts.");
}

let writeQueue = Promise.resolve();

async function readUsers() {
  try {
    return JSON.parse(await fs.readFile(usersFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: user.email,
    exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", tokenSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  const [payload, signature, extra] = String(token || "").split(".");
  if (!payload || !signature || extra) return null;

  const expected = crypto.createHmac("sha256", tokenSecret).update(payload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof user.sub !== "string"
      || typeof user.exp !== "number"
      || user.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return { email: user.sub };
  } catch {
    return null;
  }
}

async function createUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const passwordBytes = Buffer.byteLength(password, "utf8");
  if (!isValidEmail(normalizedEmail)) {
    return { error: "Enter a valid email address." };
  }
  if (passwordBytes < 8 || passwordBytes > 72) {
    return { error: "Password must be between 8 and 72 bytes." };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = writeQueue.then(async () => {
    const users = await readUsers();
    if (users.some((user) => user.email === normalizedEmail)) {
      return {
        error: "An account with this email already exists.",
        code: "ACCOUNT_EXISTS",
      };
    }

    users.push({ email: normalizedEmail, passwordHash });
    await fs.mkdir(path.dirname(usersFile), { recursive: true });
    const temporaryFile = `${usersFile}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporaryFile, `${JSON.stringify(users, null, 2)}\n`, { flag: "wx" });
    await fs.rename(temporaryFile, usersFile);
    return { user: { email: normalizedEmail } };
  });
  writeQueue = result.catch(() => {});
  return result;
}

async function authenticateUser(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const users = await readUsers();
  const user = users.find((entry) => entry.email === normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return { email: user.email };
}

module.exports = { authenticateUser, createToken, createUser, verifyToken };
