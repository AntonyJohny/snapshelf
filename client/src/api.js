const API = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? "http://localhost:4000/api" : "http://13.204.45.5:4000/api");
const json = { "Content-Type": "application/json" };
const TOKEN_KEY = "snapshelf.authToken";

function assertSecureApi() {
  const { hostname, protocol } = new URL(API);
  const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  if (protocol !== "https:" && !isLocalhost) {
    throw new Error("Use HTTPS for the API, or localhost for local development.");
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuthToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function authRequest(path, options = {}) {
  assertSecureApi();
  const token = getAuthToken();
  const response = await fetch(`${API}/auth/${path}`, {
    ...options,
    headers: {
      ...json,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Authentication failed");
  return result;
}

export function signIn(email, password) {
  return authRequest("login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function signUp(email, password) {
  return authRequest("signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function verifySession() {
  return authRequest("me");
}

function authHeaders() {
  assertSecureApi();
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadImage(file, title, tags) {
  // 1. get a temporary S3 upload link from our server
  const presign = await fetch(`${API}/uploads/presign`, {
    method: "POST",
    headers: { ...json, ...authHeaders() },
    body: JSON.stringify({ contentType: file.type }),
  });
  if (!presign.ok) throw new Error("Only JPEG, PNG or WebP images are allowed");
  const { id, url } = await presign.json();

  // 2. upload the file straight to S3
  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error("Upload to S3 failed");

  // 3. tell our server so it saves the record and queues the thumbnail job
  const reg = await fetch(`${API}/images`, {
    method: "POST",
    headers: { ...json, ...authHeaders() },
    body: JSON.stringify({ id, title, tags, fileName: file.name }),
  });
  if (!reg.ok) throw new Error("Could not save image");
  return reg.json();
}

export async function fetchImages(q = "") {
  const res = await fetch(`${API}/images?q=${encodeURIComponent(q)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Could not load images");
  return res.json();
}

export async function deleteImage(id) {
  const res = await fetch(`${API}/images/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const result = await res.json();
    throw new Error(result.error || "Could not delete image");
  }
}