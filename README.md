# TeamFlow — Team Task Manager

## Project Overview
TeamFlow is a full-stack team collaboration web application that enables teams to create projects, add members, assign tasks, and track progress using a Kanban workflow with Role-Based Access Control (RBAC).

This project demonstrates full-stack engineering, REST API design, authentication, authorization, and cloud deployment.

## Tech Stack

| Layer          | Technology                  |
|----------------|-----------------------------|
| Backend        | Node.js + Express.js        |
| Database       | PostgreSQL (Railway hosted) |
| Authentication | JWT + bcrypt                |
| Frontend       | HTML, CSS, JavaScript       |
| Deployment     | Railway                     |

## Architecture

The application follows a standard RESTful full-stack architecture:

```
Frontend  →  Express REST API  →  PostgreSQL Database
```

### Security & Access Control
- JWT-based authentication
- Middleware-based authorization
- Protected API routes
- Role-based permissions (Admin / Member)

## Authentication & Roles

### Admin Permissions
- Create / edit / delete projects
- Add or remove team members
- Create and assign tasks
- Full CRUD access on tasks

### Member Permissions
- View assigned projects
- Update status of assigned tasks only

Authorization is enforced using backend middleware.

## Core Features

### Project & Team Management
- Create, edit, delete projects
- Add members via email
- Manage team members

### Task Management (Kanban)
- Create & assign tasks
- Priority levels: Low / Medium / High
- Due dates & overdue detection
- Status workflow: `To Do → In Progress → Done`

### Dashboard
Real-time productivity metrics:
- Total tasks
- Completed tasks
- Overdue tasks
- High priority tasks

## API Endpoints

### Auth
```
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
```

### Members
```
POST   /api/projects/:id/members
DELETE /api/projects/:id/members/:userId
```

### Tasks
```
GET    /api/tasks/dashboard
GET    /api/tasks/project/:pid
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

## Database Schema

### Main Entities
- Users
- Projects
- ProjectMembers
- Tasks

### Relationships
- One Project → Many Tasks
- One Project → Many Members
- One User → Many Assigned Tasks

Relational modeling ensures data consistency and scalability.

## Deployment

**Live App:** 👉 https://team-task-manager-production-ab64.up.railway.app

## Setup Instructions

```bash
git clone https://github.com/Nishadruhe/Team-Task-Manager.git
cd Team-Task-Manager
npm install
npm start
```
Open → http://localhost:3000

**GitHub Repo:** 👉 https://github.com/Nishadruhe/Team-Task-Manager

**Author:** Nishad
