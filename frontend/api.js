
const API_BASE_URL = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

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
  request(`/api/notes/${id}`, { method: "DELETE" });
