import { useCallback, useEffect, useState } from "react";
import UploadForm from "./components/UploadForm";
import ImageGrid from "./components/ImageGrid";
import SearchBar from "./components/SearchBar";
import { fetchImages } from "./api";

export default function App() {
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setImages(await fetchImages(query));
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [query]);

  useEffect(() => { load(); }, [load]);

  // while any image is still processing, check again every 3 seconds
  useEffect(() => {
    if (!images.some((i) => i.status === "PROCESSING")) return;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [images, load]);

  return (
    <div>
      <h1>Snapshelf</h1>
      <UploadForm onDone={load} />
      <SearchBar value={query} onChange={setQuery} />
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <ImageGrid images={images} />
    </div>
  );
}