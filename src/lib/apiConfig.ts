// Global configuration file for API endpoints.
// Checks VITE_API_URL environment variable from Vite build.
// On browser environments (web build), falls back to current location if env var is empty.

const rawUrl = import.meta.env.VITE_API_URL;

// Ensure we don't have trailing slashes
export const API_BASE_URL = rawUrl && rawUrl.trim() !== '' 
  ? rawUrl.replace(/\/$/, '') 
  : window.location.origin;

// WebSocket protocol helper: translates http -> ws, https -> wss
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
