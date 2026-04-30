=====================================
  TeamFlow - Team Task Manager
=====================================

LIVE URL: <paste-your-railway-url-here>
GITHUB REPO: <paste-your-github-repo-url-here>

-------------------------------------
ABOUT
-------------------------------------
TeamFlow is a full-stack web application for team project management.
Users can create projects, invite team members, assign tasks, and track
progress with a clean Kanban board interface and role-based access control.

-------------------------------------
TECH STACK
-------------------------------------
- Backend:  Node.js + Express.js
- Database: SQLite (via better-sqlite3)
- Auth:     JWT (JSON Web Tokens) + bcrypt
- Frontend: Vanilla HTML, CSS, JavaScript (no frameworks)
- Deploy:   Railway

-------------------------------------
KEY FEATURES
-------------------------------------
1. Authentication
   - Signup & Login with email/password
   - JWT-based session management
   - Secure password hashing with bcrypt

2. Project Management
   - Create, edit, delete projects
   - Color-coded project cards with progress bars
   - Project description and metadata

3. Team Management
   - Add members by email
   - Role-based access: Admin & Member
   - Admins can change roles and remove members
   - Members can only update status of their assigned tasks

4. Task Management
   - Create tasks with title, description, priority, due date
   - Assign tasks to project members
   - Kanban board view (To Do / In Progress / Done)
   - Filter by status and priority
   - Priority levels: Low, Medium, High
   - Overdue task detection

5. Dashboard
   - Personal task overview
   - Stats: Total, To Do, In Progress, Done, Overdue, High Priority
   - Quick view of all assigned tasks across projects

6. Role-Based Access Control
   - Admin: Full CRUD on projects, tasks, and members
   - Member: Can only update status of tasks assigned to them

-------------------------------------
API ENDPOINTS
-------------------------------------
Auth:
  POST /api/auth/signup     - Register new user
  POST /api/auth/login      - Login
  GET  /api/auth/me         - Get current user

Projects:
  GET    /api/projects           - List user's projects
  POST   /api/projects           - Create project
  GET    /api/projects/:id       - Get project details + members
  PUT    /api/projects/:id       - Update project (admin)
  DELETE /api/projects/:id       - Delete project (admin)
  POST   /api/projects/:id/members      - Add member (admin)
  PUT    /api/projects/:id/members/:uid - Change role (admin)
  DELETE /api/projects/:id/members/:uid - Remove member (admin)

Tasks:
  GET    /api/tasks/dashboard        - Dashboard stats
  GET    /api/tasks/project/:pid     - Get project tasks
  POST   /api/tasks                  - Create task
  PUT    /api/tasks/:id              - Update task
  DELETE /api/tasks/:id              - Delete task (admin/creator)

-------------------------------------
HOW TO RUN LOCALLY
-------------------------------------
1. Clone the repository
   git clone <repo-url>
   cd team-task-manager

2. Install dependencies
   npm install

3. Start the server
   npm start

4. Open browser
   http://localhost:3000

-------------------------------------
DEPLOY TO RAILWAY
-------------------------------------
1. Push code to GitHub
2. Go to railway.app and create new project
3. Connect your GitHub repo
4. Railway auto-detects Node.js and deploys
5. Set environment variables (optional):
   - JWT_SECRET=your-secret-key
   - PORT=3000 (Railway sets this automatically)
6. Get your live URL from Railway dashboard

-------------------------------------
PROJECT STRUCTURE
-------------------------------------
project-root/
  package.json          - Dependencies & scripts
  Procfile              - Railway deployment config
  server/
    index.js            - Express server entry point
    db.js               - SQLite database setup & schema
    auth.js             - JWT middleware
    routes/
      authRoutes.js     - Auth endpoints
      projectRoutes.js  - Project & member endpoints
      taskRoutes.js     - Task endpoints
  public/
    index.html          - Single-page frontend
    style.css           - Dark theme styles
    app.js              - Frontend JavaScript logic

-------------------------------------
VALIDATIONS
-------------------------------------
- All required fields validated on both client and server
- Email uniqueness enforced
- Password minimum length: 4 characters
- Foreign key constraints in database
- Role checks on all protected endpoints
- Members can only modify their own assigned tasks
- Only admins can manage project settings and members

=====================================
