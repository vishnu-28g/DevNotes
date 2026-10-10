# DevNotes — Developer Knowledge Manager

A React-based personal workspace for saving programming notes and code snippets.

## Features
- Create and delete notes
- Search note titles, contents, and languages
- Filter by programming language
- Mark notes as favorites
- Export one note or all notes as Markdown
- Responsive dark dashboard
- Saves notes in browser `localStorage`

> This starter version uses browser storage. FastAPI and MySQL are planned for the next integration step.

## Requirements
- Node.js and npm
- VS Code (recommended)

## Run the project on Windows

Open Command Prompt in this project folder and run:

```bat
cd frontend
npm install
npm run dev
```

Open the local URL shown in the terminal, typically `http://localhost:5174/`.

## Build check

```bat
cd frontend
npm run build
```

## Folder structure

```text
DevNotes/
├── README.md
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx
        ├── App.css
        └── main.jsx
```
backend:
   "py -m uvicorn main:app --reload --port 8000"