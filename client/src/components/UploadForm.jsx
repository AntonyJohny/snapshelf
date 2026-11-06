// import { useState } from "react";
// import { uploadImage } from "../api";

// export default function UploadForm({ onDone }) {
//   const [file, setFile] = useState(null);
//   const [title, setTitle] = useState("");
//   const [tags, setTags] = useState("");
//   const [status, setStatus] = useState("");

//   async function handleSubmit(e) {
//     e.preventDefault();
//     const form = e.currentTarget;
//     if (!file) return setStatus("Choose an image first");

//     setStatus("Uploading...");
//     try {
//       const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
//       await uploadImage(file, title || file.name, tagList);
//       setStatus("Uploaded. The thumbnail is being created...");
//       setFile(null);
//       setTitle("");
//       setTags("");
//       form.reset();
//       onDone();
//     } catch (err) {
//       console.error(err);
//       setStatus(err.message);
//     }
//   }

//   return (
//     <form className="upload-form" onSubmit={handleSubmit}>
//       <input
//         type="file"
//         accept="image/jpeg,image/png,image/webp"
//         aria-label="Choose an image"
//         onChange={(e) => setFile(e.target.files[0])}
//       />
//       <input
//         placeholder="Title"
//         aria-label="Image title"
//         value={title}
//         onChange={(e) => setTitle(e.target.value)}
//       />
//       <input
//         placeholder="Tags (comma separated)"
//         aria-label="Image tags"
//         value={tags}
//         onChange={(e) => setTags(e.target.value)}
//       />
//       <button type="submit">Upload</button>
//       <span className="upload-status" role="status">{status}</span>
//     </form>
//   );
// }

import { useState } from "react";
import { uploadImage } from "../api";

export default function UploadForm({ onDone }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const form = e.currentTarget;

    if (isUploading) return;

    if (!file) {
      return setStatus("Choose an image first.");
    }

    setIsUploading(true);
    setStatus("Preparing upload...");

    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await uploadImage(
        file,
        title || file.name,
        tagList,
        (progress) => {
          if (progress.stage === "Uploading") {
            setStatus(`Uploading image... ${progress.percent}%`);
          } else {
            setStatus(`${progress.stage}...`);
          }
        }
      );

      setStatus(
        "Uploaded successfully. Thumbnail is being created..."
      );

      setFile(null);
      setTitle("");
      setTags("");

      form.reset();

      onDone();

    } catch (err) {
      console.error("Image upload error:", err);

      setStatus(`Upload failed: ${err.message}`);

    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choose an image"
        disabled={isUploading}
        onChange={(e) => setFile(e.target.files[0])}
      />

      <input
        placeholder="Title"
        aria-label="Image title"
        value={title}
        disabled={isUploading}
        onChange={(e) => setTitle(e.target.value)}
      />

      <input
        placeholder="Tags (comma separated)"
        aria-label="Image tags"
        value={tags}
        disabled={isUploading}
        onChange={(e) => setTags(e.target.value)}
      />

      <button type="submit" disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      <span
        className="upload-status"
        role="status"
        aria-live="polite"
      >
        {status}
      </span>
    </form>
  );
}