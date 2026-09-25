export default function ImageGrid({ images }) {
  if (images.length === 0) return <p>No images yet.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
      {images.map((img) => (
        <div key={img.id} style={{ border: "1px solid #888", borderRadius: 8, padding: 8 }}>
          {img.status === "READY" ? (
            <a href={img.originalUrl} target="_blank" rel="noreferrer">
              <img src={img.thumbUrl} alt={img.title} style={{ width: "100%", borderRadius: 6 }} />
            </a>
          ) : (
            <div style={{ height: 150, display: "flex", alignItems: "center",
                          justifyContent: "center", background: "#8882", borderRadius: 6 }}>
              {img.status === "FAILED" ? "Failed" : "Processing..."}
            </div>
          )}
          <strong>{img.title}</strong>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{img.tags.join(", ")}</div>
        </div>
      ))}
    </div>
  );
}