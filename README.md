# Claruty

Full-stack authentication project built with:

* **Django** (Poetry)
* **PostgreSQL** (Docker)
* **React (Vite)**
* **Docker Compose**

---

## Project Structure

```
claruty/
│
├── backend/          # Django backend (Poetry)
├── frontend/         # React frontend (Vite)
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

# How to Run the Application

## Prerequisites

Make sure you have installed:

* Docker
* Docker Compose

Check installation:

```bash
docker --version
docker compose version
```

---

# Run the Full Project (Recommended)

From the project root folder (`claruty/`):

```bash
docker compose up --build
```

This will start:

* PostgreSQL → `localhost:5432`
* Django backend → `http://localhost:8000`
* React frontend → `http://localhost:5173`

---

## Stop the Project

```bash
docker compose down
```

To remove database volume (reset DB):

```bash
docker compose down -v
```

---

# Backend (Django with Poetry)

If running backend locally without Docker:

```bash
cd backend
poetry install
poetry shell
python manage.py migrate
python manage.py runserver
```

Backend runs at:

```
http://127.0.0.1:8000
```

---

# Frontend (React with Vite)

To run frontend locally:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

# Authentication

The project includes:

* User Login
* User Logout
* JWT Authentication
* Axios API integration

API Base URL:

```
http://localhost:8000/api/
```

---

# Database Configuration

PostgreSQL runs in Docker with:

* Host: `db`
* Port: `5432`
* Database: `claruty`
* User: `postgres`
* Password: `postgres`

---

# Create Django Superuser

After starting containers:

```bash
docker compose exec backend python manage.py createsuperuser
```

Admin panel:

```
http://localhost:8000/admin
```

---

# .gitignore (Important)

Make sure your `.gitignore` includes:

```
# Python
__pycache__/
*.pyc
.env
.venv

# Django
db.sqlite3
media/

# Node
node_modules/
dist/

# Docker
*.log

# OS files
.DS_Store
```

---

# Development Notes

* If you add new npm packages:

  ```
  docker compose up --build
  ```

* If you add new Python packages:

  ```
  docker compose up --build
  ```

---

# Technologies Used

* Django
* Django REST Framework
* PostgreSQL
* React
* Vite
* Axios
* Docker
* Poetry

---
