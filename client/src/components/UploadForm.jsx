import { useState } from "react";
import { uploadImage } from "../api";

export default function UploadForm({ onDone }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!file) return setStatus("Choose an image first");

    setStatus("Uploading...");
    try {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      await uploadImage(file, title || file.name, tagList);
      setStatus("Uploaded. The thumbnail is being created...");
      setFile(null);
      setTitle("");
      setTags("");
      form.reset();
      onDone();
    } catch (err) {
      console.error(err);
      setStatus(err.message);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choose an image"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <input
        placeholder="Title"
        aria-label="Image title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        placeholder="Tags (comma separated)"
        aria-label="Image tags"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <button type="submit">Upload</button>
      <span className="upload-status" role="status">{status}</span>
    </form>
  );
}