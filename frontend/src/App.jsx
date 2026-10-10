
import { useEffect, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./App.css";
import Login from "./Login";
import ResetPassword from "./ResetPassword";

import {
  getNotes,
  createNote as createNoteAPI,
  updateNote as updateNoteAPI,
  setFavorite as setFavoriteAPI,
  deleteNote as deleteNoteAPI,
  getCurrentUser,
  getToken,
  logoutUser,
} from "./api";

const LANGUAGES = [
  "JavaScript",
  "Python",
  "Java",
  "SQL",
  "C",
  "HTML/CSS",
  "Other",
];

function formatDate(value) {
  if (!value) return new Date().toLocaleDateString();

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}


function normalizeNote(note) {
  let tags = note.tags || [];

  // Handle tags returned as a JSON string by MySQL.
  if (typeof tags === "string") {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = [];
    }
  }

  return {
    ...note,
    id: Number(note.id),
    favorite: Boolean(note.favorite),
    date: formatDate(note.created_at || note.date),
    tags: Array.isArray(tags) ? tags : [],
    collection_name: note.collection_name || "",
  };
}



const LANGUAGE_MAP = {
  JavaScript: "javascript",
  Python: "python",
  Java: "java",
  SQL: "sql",
  C: "c",
  "HTML/CSS": "markup",
  Other: "text",
};

function CodePreview({ language, content }) {
  const syntaxLanguage = LANGUAGE_MAP[language] || "text";

  return (
    <SyntaxHighlighter
      language={syntaxLanguage}
      style={oneDark}
      showLineNumbers
      wrapLongLines
      customStyle={{
        margin: 0,
        borderRadius: "10px",
        fontSize: "13px",
        maxHeight: "280px",
        overflow: "auto",
      }}
    >
      {content || ""}
    </SyntaxHighlighter>
  );
}



function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);


const [title, setTitle] = useState("");
const [language, setLanguage] = useState("JavaScript");
const [content, setContent] = useState("");

const [tagsInput, setTagsInput] = useState("");
const [collectionName, setCollectionName] = useState("");
const [collectionFilter, setCollectionFilter] = useState("All Collections");
const [tagFilter, setTagFilter] = useState("All Tags");

const [filter, setFilter] = useState("All Notes");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);

  // Verify the current session when the application starts.
  useEffect(() => {
    let active = true;

    async function checkSession() {
      if (!getToken()) {
        if (active) {
          setUser(null);
          setAuthChecking(false);
        }
        return;
      }

      try {
        const currentUser = await getCurrentUser();

        if (active) {
          setUser(currentUser);
        }
      } catch {
        logoutUser();

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setAuthChecking(false);
        }
      }
    }

    function handleUnauthorized() {
      logoutUser();
      setUser(null);
      setNotes([]);
      setSelectedNote(null);
      setShowForm(false);
      setEditingNoteId(null);
      setMessage("Your session expired. Please log in again.");
    }

    window.addEventListener(
      "devnotes:unauthorized",
      handleUnauthorized
    );

    checkSession();

    return () => {
      active = false;
      window.removeEventListener(
        "devnotes:unauthorized",
        handleUnauthorized
      );
    };
  }, []);

  // Load only the authenticated user's notes.
  useEffect(() => {
    let active = true;

    async function loadNotes() {
      if (authChecking || !user) {
        setNotes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const serverNotes = await getNotes();

        if (active) {
          setNotes(serverNotes.map(normalizeNote));
        }
      } catch (error) {
        if (active) {
          setNotes([]);
          setMessage(`Could not load notes: ${error.message}`);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadNotes();

    return () => {
      active = false;
    };
  }, [user, authChecking]);

  // Close the Explore modal with Escape.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedNote(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const favoriteCount = notes.filter(
    (note) => note.favorite
  ).length;

  const languageCount = new Set(
    notes.map((note) => note.language)
  ).size;

  const visibleNotes = useMemo(() => {
  return notes.filter((note) => {
    const term = search.trim().toLowerCase();

    const matchesSearch =
      !term ||
      String(note.title || "").toLowerCase().includes(term) ||
      String(note.content || "").toLowerCase().includes(term) ||
      String(note.language || "").toLowerCase().includes(term) ||
      (note.tags || []).some((tag) =>
        String(tag).toLowerCase().includes(term)
      );


const matchesFilter =
  filter === "All Notes" ||
  (filter === "Favorites" && note.favorite) ||
  filter === note.language;

  const matchesTag =
  tagFilter === "All Tags" ||
  (note.tags || []).some(
    (tag) => tag.toLowerCase() === tagFilter.toLowerCase()
  );

const matchesCollection =
  collectionFilter === "All Collections" ||
  (note.collection_name || "") === collectionFilter;

return matchesSearch && matchesFilter && matchesCollection && matchesTag;

  });
}, [notes, search, filter, collectionFilter, tagFilter]);

  function handleLoginSuccess(loggedInUser) {
    setNotes([]);
    setSelectedNote(null);
    setShowForm(false);
    setEditingNoteId(null);
    setTitle("");
    setContent("");
    setLanguage("JavaScript");
    setSearch("");
    setFilter("All Notes");
    setMessage("");
    setUser(loggedInUser);
    setLoading(true);
  }

  function handleLogout() {
    logoutUser();
    setUser(null);
    setNotes([]);
    setSelectedNote(null);
    setShowForm(false);
    setEditingNoteId(null);
    setTitle("");
    setContent("");
    setLanguage("JavaScript");
    setSearch("");
    setFilter("All Notes");
    setMessage("");
    setLoading(false);
  }

  function cancelEditing() {
    setEditingNoteId(null);
    setTitle("");
    setLanguage("JavaScript");
    setContent("");
     setTagsInput("");
  setCollectionName("");
    setShowForm(false);
  }

  function startEditing(note) {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setLanguage(note.language || "Other");
    setContent(note.content);
    setTagsInput((note.tags || []).join(", "));
setCollectionName(note.collection_name || "");
    setShowForm(true);
    setSelectedNote(null);
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addNote(event) {
    event.preventDefault();

    if (!title.trim() || !content.trim() || saving) {
      return;
    }

    setSaving(true);
    setMessage("");

    const currentEditingId = editingNoteId;

    try {

const tags = [
  ...new Map(
    tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => [tag.toLowerCase(), tag.slice(0, 40)])
      .map(([key, value]) => [key, value])
  ).values(),
].slice(0, 20);

const noteData = {
  title: title.trim(),
  language,
  content: content.trim(),
  tags,
  collection_name: collectionName.trim() || null,
};


      if (currentEditingId !== null) {
        const updated = await updateNoteAPI(
          currentEditingId,
          noteData
        );

        const normalized = normalizeNote(updated);

        setNotes((current) =>
          current.map((note) =>
            note.id === currentEditingId ? normalized : note
          )
        );

        setSelectedNote((current) =>
          current?.id === currentEditingId ? normalized : current
        );

        setMessage("Note updated successfully.");
      } else {
        const created = await createNoteAPI({
          ...noteData,
          favorite: false,
        });

        setNotes((current) => [
          normalizeNote(created),
          ...current,
        ]);

        setMessage("Note saved successfully.");
      }

      cancelEditing();
    } catch (error) {
      setMessage(
        `${currentEditingId !== null ? "Could not update note" : "Could not save note"}: ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleFavorite(id) {
    const note = notes.find((item) => item.id === id);

    if (!note) return;

    const newFavorite = !note.favorite;

    setNotes((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, favorite: newFavorite }
          : item
      )
    );

    try {
      const updated = await setFavoriteAPI(id, newFavorite);
      const normalized = normalizeNote(updated);

      setNotes((current) =>
        current.map((item) =>
          item.id === id ? normalized : item
        )
      );

      setSelectedNote((current) =>
        current?.id === id ? normalized : current
      );
    } catch (error) {
      setNotes((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, favorite: note.favorite }
            : item
        )
      );

      setMessage(`Could not update favorite: ${error.message}`);
    }
  }

  async function deleteNote(id) {
    if (!window.confirm("Delete this note?")) return;

    const previousNotes = notes;

    setNotes((current) =>
      current.filter((note) => note.id !== id)
    );

    try {
      await deleteNoteAPI(id);

      setSelectedNote((current) =>
        current?.id === id ? null : current
      );

      if (editingNoteId === id) {
        cancelEditing();
      }

      setMessage("Note deleted successfully.");
    } catch (error) {
      setNotes(previousNotes);
      setMessage(`Could not delete note: ${error.message}`);
    }
  }

  function downloadMarkdown(text, filename) {
    const blob = new Blob([text], {
      type: "text/markdown;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  function exportNote(note) {
    const text =
      `# ${note.title}\n\n` +
      `Language: ${note.language}\n` +
      `Created: ${note.date}\n\n` +
      `${note.content}\n`;

    const filename = `${
      note.title.replace(/[^a-z0-9_-]/gi, "-") || "devnote"
    }.md`;

    downloadMarkdown(text, filename);
  }

  function exportAll() {
    const text = notes
      .map(
        (note) =>
          `# ${note.title}\n\n` +
          `Language: ${note.language}\n` +
          `Created: ${note.date}\n` +
          `Favorite: ${note.favorite ? "Yes" : "No"}\n\n` +
          `${note.content}\n\n---\n`
      )
      .join("\n");

    downloadMarkdown(
      text || "No notes yet.",
      "devnotes-export.md"
    );
  }


  // Show the password reset page when the email link is opened.
  if (window.location.pathname === "/reset-password") {
    return (
      <ResetPassword
        onBackToLogin={() => {
          window.history.replaceState({}, "", "/");
          window.location.reload();
        }}
      />
    );
  }

  // Wait until we know whether a session exists.
  if (authChecking) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-mark">D</div>
        <p>Checking your session...</p>
      </div>
    );
  }

  // Show Login/Register until the user authenticates.
  if (!user) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">D</div>

          <div className="brand-copy">
            <h2>DevNotes</h2>
            <p>Developer workspace</p>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>

        {["All Notes", "Favorites", ...LANGUAGES].map((item) => (
          <button
            key={item}
            className={`nav-item ${filter === item ? "active" : ""}`}
            onClick={() => setFilter(item)}
          >
            <span className="nav-symbol">
              {item === "All Notes"
                ? "▤"
                : item === "Favorites"
                ? "☆"
                : "</>"}
            </span>

            <span className="nav-text">{item}</span>

            {item === "All Notes" && (
              <span className="nav-count">{notes.length}</span>
            )}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="profile-avatar">
            {(user.name || "U").charAt(0).toUpperCase()}
          </div>

          <div className="profile-info">
            <strong>{user.name || "My Workspace"}</strong>
            <p>{user.email}</p>

            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> Notes
          </div>

          <div className="top-actions">
            <span className="status-dot" />
            <span className="saved-label">Connected to MySQL</span>
            <div className="top-avatar">
              {(user.name || "U").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="page-content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">YOUR DEVELOPER WORKSPACE</p>

              <h1>
                Knowledge, <span>organized.</span>
              </h1>

              <p className="subtitle">
                Save ideas, keep code snippets, and find solutions faster.
              </p>
            </div>

            <div className="welcome-actions">
              <button
                type="button"
                className="secondary-btn export-all"
                onClick={exportAll}
              >
                Export all
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  if (showForm) {
                    cancelEditing();
                  } else {
                    cancelEditing();
                    setShowForm(true);
                  }
                }}
              >
                ＋ Create note
              </button>
            </div>
          </div>

          {message && (
            <div className="toast" role="status">
              {message}
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple">▤</div>
              <div>
                <p>Total notes</p>
                <h2>{notes.length}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon yellow">☆</div>
              <div>
                <p>Favorites</p>
                <h2>{favoriteCount}</h2>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">&lt;/&gt;</div>
              <div>
                <p>Languages</p>
                <h2>{languageCount}</h2>
              </div>
            </div>
          </div>

          {showForm && (
            <form className="note-form" onSubmit={addNote}>
              <div className="form-heading">
                <div>
                  <p className="eyebrow">
                    {editingNoteId !== null ? "EDIT ENTRY" : "NEW ENTRY"}
                  </p>

                  <h2>
                    {editingNoteId !== null
                      ? "Edit note"
                      : "Create a note"}
                  </h2>
                </div>

                <button
                  type="button"
                  className="close-btn"
                  onClick={cancelEditing}
                  aria-label="Close form"
                >
                  ×
                </button>
              </div>

              <label htmlFor="note-title">Note title</label>
              <input
                id="note-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Java array sorting"
                required
                maxLength={200}
              />

              <label htmlFor="note-language">
                Programming language
              </label>
              <select
                id="note-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {LANGUAGES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <label htmlFor="note-content">
                Notes or code snippet
              </label>
              <textarea
                id="note-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write your explanation, code, or solution here..."
                rows={6}
                required
              />

<label htmlFor="note-tags">Tags</label>
<input
  id="note-tags"
  value={tagsInput}
  onChange={(event) => setTagsInput(event.target.value)}
  placeholder="e.g. Java, DSA, Arrays"
/>

<p className="field-hint">
  Separate tags with commas. Maximum 20 tags.
</p>

<label htmlFor="note-collection">Collection</label>
<input
  id="note-collection"
  value={collectionName}
  onChange={(event) => setCollectionName(event.target.value)}
  placeholder="e.g. Java DSA"
  maxLength={100}
/>


              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? editingNoteId !== null
                      ? "Updating..."
                      : "Saving..."
                    : editingNoteId !== null
                    ? "Update note"
                    : "Save note"}
                </button>
              </div>
            </form>
          )}

          <div className="notes-heading">
            <div>
              <h2>{filter}</h2>
              <p>
                {loading
                  ? "Loading notes from MySQL..."
                  : `${visibleNotes.length} ${
                      visibleNotes.length === 1 ? "note" : "notes"
                    } in your programming library`}
              </p>
            </div>

            <div className="search-box">
              <span aria-hidden="true">⌕</span>

              <input
                aria-label="Search notes"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notes, code, language..."
              />

              <button
                type="button"
                className="clear-search"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            </div>

<select
  className="collection-filter"
  aria-label="Filter by collection"
  value={collectionFilter}
  onChange={(event) => setCollectionFilter(event.target.value)}
>
  <option value="All Collections">All Collections</option>

  {[...new Set(
    notes
      .map((note) => note.collection_name)
      .filter(Boolean)
  )]
    .sort()
    .map((collection) => (
      <option key={collection} value={collection}>
        {collection}
      </option>
    ))}
</select>
<select
  className="tag-filter"
  aria-label="Filter by tag"
  value={tagFilter}
  onChange={(event) => setTagFilter(event.target.value)}
>
  <option value="All Tags">All Tags</option>
  {[...new Set(
    notes.flatMap((note) => note.tags || [])
  )]
    .sort()
    .map((tag) => (
      <option key={tag} value={tag}>
        {tag}
      </option>
    ))}
</select>

          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-icon">↻</div>
              <h3>Loading your notes</h3>
              <p>Fetching notes from the DevNotes database.</p>
            </div>
          ) : visibleNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {search ? "⌕" : "✎"}
              </div>

              <h3>
                {search
                  ? "No matching notes"
                  : filter === "Favorites"
                  ? "No favorites yet"
                  : "Your knowledge starts here"}
              </h3>

              <p>
                {search
                  ? "Try another search term or clear your search."
                  : filter === "Favorites"
                  ? "Mark a note as a favorite to find it here."
                  : "Create your first note to save code, ideas, and useful solutions."}
              </p>

              {!search && filter !== "Favorites" && (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => {
                    cancelEditing();
                    setShowForm(true);
                  }}
                >
                  ＋ Create your first note
                </button>
              )}
            </div>
          ) : (
            <div className="notes-grid">
              {visibleNotes.map((note) => (
                <article className="note-card" key={note.id}>
                  <div className="note-card-top">
                    <span className="language-badge">
                      {note.language}
                    </span>

                    <button
                      type="button"
                      className={`favorite-btn ${
                        note.favorite ? "favorited" : ""
                      }`}
                      onClick={() => toggleFavorite(note.id)}
                      aria-label={
                        note.favorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      title="Toggle favorite"
                    >
                      {note.favorite ? "★" : "☆"}
                    </button>
                  </div>


<h3>{note.title}</h3>

{note.collection_name && (
  <div className="collection-badge">
    <span>📁</span> {note.collection_name}
  </div>
)}

{note.tags?.length > 0 && (
  <div className="tag-list">
    {note.tags.map((tag) => (
      <span className="tag-badge" key={tag}>
        #{tag}
      </span>
    ))}
  </div>
)}

<CodePreview
  language={note.language}
  content={note.content}
/>

                  <div className="note-footer">
                    <span>{note.date}</span>

                    <div className="note-actions">
                      <button
                        type="button"
                        className="export-btn"
                        onClick={() => setSelectedNote(note)}
                      >
                        Explore
                      </button>

                      <button
                        type="button"
                        className="export-btn"
                        onClick={() => startEditing(note)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="export-btn"
                        onClick={() => exportNote(note)}
                      >
                        Export
                      </button>

                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => deleteNote(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <footer>Built for developers, one note at a time.</footer>
        </section>
      </main>

      {selectedNote && (
        <div
          className="preview-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedNote(null);
            }
          }}
        >
          <section
            className="preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-title"
          >
            <div className="preview-header">
              <div>
                <span className="language-badge">
                  {selectedNote.language}
                </span>

                <h2 id="preview-title">{selectedNote.title}</h2>

                <p className="preview-date">
                  Created: {selectedNote.date}
                </p>
              </div>

              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedNote(null)}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>

            <div className="preview-content">
  <CodePreview
    language={selectedNote.language}
    content={selectedNote.content}
  />
</div>

            <div className="preview-footer">
              <span>
                {selectedNote.favorite
                  ? "★ Favorite"
                  : "☆ Not favorited"}
              </span>

              <div className="preview-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setSelectedNote(null)}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => startEditing(selectedNote)}
                >
                  Edit note
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => exportNote(selectedNote)}
                >
                  Export note
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
