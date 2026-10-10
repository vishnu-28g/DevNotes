
const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "devnotes_access_token";

// Keep the token for the current browser tab/session.
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Shared API request function.
async function request(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.body
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const data = await response.json();

      if (data.detail) {
        message =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail);
      }
    } catch {
      // Keep the default error message if the response isn't JSON.
    }

    // An expired or invalid token should end the local session.
    if (response.status === 401 && path !== "/api/auth/login") {
      clearToken();
      window.dispatchEvent(new Event("devnotes:unauthorized"));
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// -------------------- Authentication --------------------

export async function registerUser(userData) {
  const result = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });

  if (result.access_token) {
    saveToken(result.access_token);
  }

  return result;
}

export async function loginUser(credentials) {
  const result = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  if (result.access_token) {
    saveToken(result.access_token);
  }

  return result;
}

export function getCurrentUser() {
  return request("/api/auth/me");
}

export function logoutUser() {
  clearToken();
}

// -------------------- Notes --------------------

export function getNotes() {
  return request("/api/notes");
}

export function createNote(note) {
  return request("/api/notes", {
    method: "POST",
    body: JSON.stringify(note),
  });
}

export function updateNote(id, note) {
  return request(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(note),
  });
}

export function setFavorite(id, favorite) {
  return request(`/api/notes/${id}/favorite`, {
    method: "PATCH",
    body: JSON.stringify({ favorite }),
  });
}

export function deleteNote(id) {
  return request(`/api/notes/${id}`, {
    method: "DELETE",
  });
}
