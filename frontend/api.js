
const API_BASE_URL = "https://devnotes-z4rg.onrender.com";
async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return null;

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

// Authentication
export const register = (user) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(user),
  });

export const login = (credentials) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

export const forgotPassword = (email) =>
  request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token, new_password) =>
  request("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });

// Notes
export const getNotes = () => request("/api/notes");

export const createNote = (note) =>
  request("/api/notes", {
    method: "POST",
    body: JSON.stringify(note),
  });

export const updateNote = (id, note) =>
  request(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(note),
  });

export const setFavorite = (id, favorite) =>
  request(`/api/notes/${id}/favorite`, {
    method: "PATCH",
    body: JSON.stringify({ favorite }),
  });

export const deleteNote = (id) =>
  request(`/api/notes/${id}`, {
    method: "DELETE",
  });
