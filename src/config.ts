/**
 * The household's Apps Script web app URL, baked in at build time from the
 * VITE_API_URL environment variable (set in .github/workflows/deploy.yml).
 * Empty in local dev and tests, which run in demo mode.
 */
export const DEFAULT_API_URL: string = import.meta.env.VITE_API_URL ?? '';
