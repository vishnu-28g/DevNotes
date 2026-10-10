# DevNotes — Developer Knowledge Manager

A developer-focused knowledge management application for organizing programming notes, saving code snippets, and finding solutions faster.

## About the Project

DevNotes is a full-stack web application that allows developers to create, organize, search, and manage programming notes in one place. It includes user authentication, favorites, tags, collections, and a responsive dark-themed interface.

## Features

- **User Authentication:** Register, log in, and manage personal notes.
- **Create and Edit Notes:** Store programming concepts, explanations, and code snippets.
- **Syntax Highlighting:** Display code in a readable format.
- **Search:** Find notes by title, content, language, or tags.
- **Favorites:** Mark important notes for quick access.
- **Tags and Collections:** Organize notes by topics and filter them easily.
- **Export:** Export notes using the available export functionality.
- **Responsive UI:** Use the application on desktop and mobile screens.
- **Data Persistence:** Store notes in MySQL.
- **User Isolation:** Retrieve and manage notes according to the authenticated user.

## Tech Stack

**Frontend**
- React
- JavaScript
- CSS
- Vite

**Backend**
- Python
- FastAPI
- JWT-based authentication

**Database**
- MySQL

**Tools**
- Visual Studio Code
- Git and GitHub
- MySQL Workbench

## Project Structure

```text
DevNotes/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── requirements.txt
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── Login.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── api.js
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

## Prerequisites

Install the following before running the application:

- Python
- Node.js and npm
- MySQL Server
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/vishnu-28g/DevNotes.git
cd DevNotes
```

### 2. Configure the database

Create the database in MySQL Workbench:

```sql
CREATE DATABASE devnotes_db;
```

Configure your MySQL connection settings using the environment variables expected by `backend/database.py`.

Ensure the required tables are created using your project's database setup or schema.

### 3. Configure the backend

Open a terminal in the project directory:

```bash
cd backend
py -m venv .venv
```

Activate the virtual environment on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a local `.env` file with the configuration required by the backend. Never commit real credentials or secrets.

Start FastAPI:

```bash
py -m uvicorn main:app --reload --port 8000
```

API documentation:

http://127.0.0.1:8000/docs

### 4. Configure the frontend

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev -- --port 5174
```

Open the local URL displayed by Vite, normally:

http://localhost:5174

Make sure the frontend API configuration points to the correct backend address.

## Security

- Keep passwords, API keys, email credentials, and JWT secrets in environment variables.
- Do not commit `.env` files.
- Use authentication and user ownership checks when accessing personal notes.
- Configure production secrets separately when deploying the application.

## Future Improvements

- Deploy the frontend and backend.
- Add automated tests for authentication and note operations.
- Improve error handling and accessibility.
- Add advanced organization and search options.

## Author

**Sri Vishnu Vardhan G**

GitHub: [@vishnu-28g](https://github.com/vishnu-28g)

## License

A license has not yet been specified. Add a license file if you decide to distribute the project under an open-source license.
