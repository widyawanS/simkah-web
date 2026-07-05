/** */
export const getFormattedDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-us", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

/**
 * Returns a deterministic pastel brutalist color class based on the input string.
 */
export const getBadgeColor = (str) => {
  if (!str) return 'bg-brutal-primary';
  const colors = [
    'bg-brutal-primary',
    'bg-brutal-secondary',
    'bg-brutal-accent',
    'bg-brutal-success',
    'bg-brutal-warning',
    'bg-brutal-info',
    'bg-brutal-destructive'
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
