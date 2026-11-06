import { useState } from "react";
import { deleteImage } from "../api";

export default function ImageGrid({ images, onDone }) {
  const [deletingId, setDeletingId] = useState("");
  const [deleteError, setDeleteError] = useState(null);

  if (images.length === 0) return <p className="image-empty">No images yet.</p>;

  async function handleDelete(image) {
    if (!window.confirm(`Permanently delete "${image.title}" and its original and thumbnail?`)) return;
    setDeletingId(image.id);
    setDeleteError("");
    try {
      await deleteImage(image.id);
      onDone();
    } catch (error) {
      setDeleteError({ id: image.id, message: error.message });
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div className="image-grid">
      {images.map((img) => (
        <article className="image-card" key={img.id}>
          {img.status === "READY" ? (
            <a
              className="image-preview-link"
              href={img.originalUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open original image: ${img.title}`}
            >
              <img className="image-thumbnail" src={img.thumbUrl} alt={img.title} />
            </a>
          ) : (
            <div className="image-processing">
              {img.status === "FAILED"
                ? "Failed"
                : img.status === "DELETING"
                  ? "Deletion incomplete — retry below"
                  : "Processing..."}
            </div>
          )}
          <strong className="image-title">{img.title}</strong>
          <div className="image-tags">{(img.tags || []).join(", ")}</div>
          <div className={`image-actions${img.status === "READY" ? "" : " image-actions-single"}`}>
            {img.status === "READY" && img.downloadUrl && (
              <a className="image-download" href={img.downloadUrl}>
                Download original
              </a>
            )}
            <button
              className="image-delete"
              type="button"
              disabled={deletingId === img.id}
              onClick={() => handleDelete(img)}
            >
              {deletingId === img.id ? "Deleting..." : "Delete"}
            </button>
            {deleteError?.id === img.id && deletingId === "" && (
              <p className="image-action-error" role="alert">{deleteError.message}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}