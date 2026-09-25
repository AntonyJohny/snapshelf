export default function SearchBar({ value, onChange }) {
  return (
    <input
      placeholder="Search by title or tag..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", marginBottom: 16, padding: 8, boxSizing: "border-box" }}
    />
  );
}