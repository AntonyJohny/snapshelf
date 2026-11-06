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

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }

    throw new Error(
      "Network connection failed. Please check your internet connection."
    );
  } finally {
    clearTimeout(timer);
  }
}

async function uploadToS3(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("PUT", url);
    xhr.timeout = 120000;

    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round(
          (event.loaded / event.total) * 100
        );

        onProgress(percent);
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(`S3 upload failed. HTTP status: ${xhr.status}`)
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Unable to connect to AWS S3. Check your internet connection and S3 bucket CORS configuration."
        )
      );
    };

    xhr.ontimeout = () => {
      reject(
        new Error(
          "Upload timed out after 2 minutes. Please check your connection and try again."
        )
      );
    };

    xhr.onabort = () => {
      reject(new Error("Upload was cancelled."));
    };

    xhr.send(file);
  });
}

// export async function uploadImage(file, title, tags) {
//   // 1. get a temporary S3 upload link from our server
//   const presign = await fetch(`${API}/uploads/presign`, {
//     method: "POST",
//     headers: { ...json, ...authHeaders() },
//     body: JSON.stringify({ contentType: file.type }),
//   });
//   if (!presign.ok) throw new Error("Only JPEG, PNG or WebP images are allowed");
//   const { id, url } = await presign.json();

//   // 2. upload the file straight to S3
//   const put = await fetch(url, {
//     method: "PUT",
//     headers: { "Content-Type": file.type },
//     body: file,
//   });
//   if (!put.ok) throw new Error("Upload to S3 failed");

//   // 3. tell our server so it saves the record and queues the thumbnail job
//   const reg = await fetch(`${API}/images`, {
//     method: "POST",
//     headers: { ...json, ...authHeaders() },
//     body: JSON.stringify({ id, title, tags, fileName: file.name }),
//   });
//   if (!reg.ok) throw new Error("Could not save image");
//   return reg.json();
// }

export async function uploadImage(file, title, tags, onProgress) {

  // 1. Request a signed S3 upload URL
  if (onProgress) onProgress({ stage: "Preparing upload" });

  const presign = await fetchWithTimeout(
    `${API}/uploads/presign`,
    {
      method: "POST",
      headers: { ...json, ...authHeaders() },
      body: JSON.stringify({
        contentType: file.type,
      }),
    },
    15000
  );

  const presignResult = await presign.json().catch(() => ({}));

  if (!presign.ok) {
    throw new Error(
      presignResult.error || "Could not generate upload URL."
    );
  }

  const { id, url } = presignResult;

  if (!id || !url) {
    throw new Error("Invalid upload URL received from server.");
  }

  // 2. Upload directly to S3 with progress tracking
  if (onProgress) {
    onProgress({ stage: "Uploading", percent: 0 });
  }

  await uploadToS3(url, file, (percent) => {
    if (onProgress) {
      onProgress({
        stage: "Uploading",
        percent,
      });
    }
  });

  // 3. Register the uploaded image with Express
  if (onProgress) {
    onProgress({ stage: "Saving image details" });
  }

  const reg = await fetchWithTimeout(
    `${API}/images`,
    {
      method: "POST",
      headers: { ...json, ...authHeaders() },
      body: JSON.stringify({
        id,
        title,
        tags,
        fileName: file.name,
      }),
    },
    20000
  );

  const result = await reg.json().catch(() => ({}));

  if (!reg.ok) {
    throw new Error(
      result.error || "Could not save image details."
    );
  }

  return result;
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