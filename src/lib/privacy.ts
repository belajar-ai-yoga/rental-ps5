export function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return `${parts[0].charAt(0).toUpperCase()}.`;
  }
  return parts
    .slice(0, 2)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(" ");
}
