export { formatTime, shortId, timeLeft } from "./adminUtils";
// Preserve cancellation-aware admin refresh; Lorentz AuthProvider owns JWT storage.
export const ADMIN_AUTO_REFRESH_MS = 45_000;
