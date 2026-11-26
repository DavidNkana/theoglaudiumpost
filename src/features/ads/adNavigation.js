/** Public navigation and URL safety helpers for advertisements. */
export const advertisementDetailPath = (id) => `/advertisements/${encodeURIComponent(id)}`;

/** Return only an explicitly entered HTTPS destination. */
export const getSafeExternalUrl = (value) => {
  if (!value || typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};
