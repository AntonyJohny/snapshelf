const API = "http://localhost:4000/api";
const json = { "Content-Type": "application/json" };

export async function uploadImage(file, title, tags) {
  // 1. get a temporary S3 upload link from our server
  const presign = await fetch(`${API}/uploads/presign`, {
    method: "POST",
    headers: json,
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
    headers: json,
    body: JSON.stringify({ id, title, tags }),
  });
  if (!reg.ok) throw new Error("Could not save image");
  return reg.json();
}

export async function fetchImages(q = "") {
  const res = await fetch(`${API}/images?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Could not load images");
  return res.json();
}