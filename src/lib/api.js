/**
 * API base URL.
 * - In **development**, Vite_API_BASE_URL is not set → defaults to `''` (empty string),
 *   so paths like `/api/health` are relative, and Vite's dev proxy handles forwarding
 *   to the backend at `http://localhost:5000`.
 * - In **production**, set VITE_API_BASE_URL to the deployed backend origin
 *   (e.g. `https://fleet-backend.onrender.com`).
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function apiFetch(path, { token, headers = {}, ...options } = {}) {
  const url = `${API_BASE_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`)
  }

  return data
}

export { API_BASE_URL }
