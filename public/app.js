const API = '';
let token = localStorage.getItem('token');
let currentUser = null;
let currentProject = null;
let currentProjectMembers = [];
let allTasks = [];

// --- API Helper ---
async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// --- Toast ---
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.className = 'toast', 2500);
}

// --- Auth ---
function showAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('signup-form').style.display = tab === 'signup' ? 'block' : 'none';
  if (event && event.target) event.target.classList.add('active');
}

async function handleLogin(e) {
  e.preventDefault();
  try {
    const data = await api('/api/auth/login', 'POST', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    token = data.token;
    localStorage.setItem('token', token);
    currentUser = data.user;
    initApp();
  } catch (err) {
    document.getElementById('login-error').textContent = err.message;
  }
}

async function handleSignup(e) {
  e.preventDefault();
  try {
    const data = await api('/api/auth/signup', 'POST', {
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value
    });
    token = data.token;
    localStorage.setItem('token', token);
    currentUser = data.user;
    initApp();
  } catch (err) {
    document.getElementById('signup-error').textContent = err.message;
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  document.getElementById('auth-page').style.display = '';
  document.getElementById('app-page').style.display = 'none';
}

// --- Init ---
async function initApp() {
  try {
    if (!currentUser) currentUser = await api('/api/auth/me');
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'flex';
    document.getElementById('user-info').innerHTML = `
      <div class="avatar" style="background:${currentUser.avatar_color}">${currentUser.name[0].toUpperCase()}</div>
      <span>${currentUser.name}</span>`;
    document.getElementById('user-name-display').textContent = currentUser.name.split(' ')[0];
    showView('dashboard');
  } catch {
    logout();
  }
}

// --- Navigation ---
function showView(view) {
  document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(view + '-view').style.display = 'block';
  const links = document.querySelectorAll('.nav-link');
  if (view === 'dashboard') links[0].classList.add('active');
  else if (view === 'projects') links[1].classList.add('active');

  if (view === 'dashboard') loadDashboard();
  else if (view === 'projects') loadProjects();
}

// --- Dashboard ---
async function loadDashboard() {
  try {
    const { tasks, stats } = await api('/api/tasks/dashboard');
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('stats-grid').innerHTML = `
      <div class="stat-card"><div class="stat-num">${stats.total}</div><div class="stat-label">Total Tasks</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--warning)">${stats.todo}</div><div class="stat-label">To Do</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--primary)">${stats.in_progress}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--success)">${stats.done}</div><div class="stat-label">Completed</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--danger)">${stats.overdue}</div><div class="stat-label">Overdue</div></div>
      <div class="stat-card"><div class="stat-num" style="color:#f97316">${stats.high_priority}</div><div class="stat-label">High Priority</div></div>`;

    const container = document.getElementById('dashboard-tasks');
    if (!tasks.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128203;</div><p>No tasks assigned to you yet</p></div>';
      return;
    }
    container.innerHTML = tasks.map(t => {
      const overdue = t.due_date && t.due_date < today && t.status !== 'done';
      const dotColor = t.status === 'done' ? 'var(--success)' : t.status === 'in_progress' ? 'var(--primary)' : 'var(--warning)';
      return `<div class="dash-task">
        <div class="task-status-dot" style="background:${dotColor}"></div>
        <div class="dash-task-info">
          <h4>${esc(t.title)}</h4>
          <span>${esc(t.project_name)} ${t.due_date ? '&middot; Due: ' + t.due_date : ''} ${overdue ? '<span class="badge badge-overdue">OVERDUE</span>' : ''}</span>
        </div>
        <span class="badge badge-${t.priority}">${t.priority}</span>
      </div>`;
    }).join('');
  } catch (err) { toast(err.message, 'error'); }
}

// --- Projects ---
async function loadProjects() {
  try {
    const projects = await api('/api/projects');
    const grid = document.getElementById('projects-grid');
    if (!projects.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128193;</div><p>No projects yet. Create your first one!</p></div>';
      return;
    }
    grid.innerHTML = projects.map(p => {
      const pct = p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
      return `<div class="project-card" onclick="openProject(${p.id})">
        <div class="color-bar" style="background:${p.color}"></div>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description || 'No description')}</p>
        <div class="project-meta">
          <span>&#128101; ${p.member_count} members</span>
          <span>&#128203; ${p.task_count} tasks</span>
          <span>${pct}% done</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
  } catch (err) { toast(err.message, 'error'); }
}

async function createProject(e) {
  e.preventDefault();
  try {
    await api('/api/projects', 'POST', {
      name: document.getElementById('project-name').value,
      description: document.getElementById('project-desc').value
    });
    closeModal('create-project-modal');
    document.getElementById('project-name').value = '';
    document.getElementById('project-desc').value = '';
    toast('Project created!');
    loadProjects();
  } catch (err) { toast(err.message, 'error'); }
}

async function openProject(id) {
  try {
    const project = await api('/api/projects/' + id);
    currentProject = project;
    currentProjectMembers = project.members;
    document.getElementById('project-title').textContent = project.name;

    const actions = document.getElementById('project-actions');
    if (project.my_role === 'admin') {
      actions.innerHTML = `
        <button class="btn btn-sm btn-outline" onclick="openEditProject()">&#9998; Edit</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProject()">&#128465; Delete</button>`;
    } else {
      actions.innerHTML = `<span class="role-badge role-member">Member</span>`;
    }

    document.getElementById('add-member-section').style.display = project.my_role === 'admin' ? 'block' : 'none';
    showView('project-detail');
    showProjectTab('tasks');
    loadProjectTasks();
    renderMembers();
  } catch (err) { toast(err.message, 'error'); }
}

function openEditProject() {
  document.getElementById('edit-project-name').value = currentProject.name;
  document.getElementById('edit-project-desc').value = currentProject.description || '';
  openModal('edit-project-modal');
}

async function updateProject(e) {
  e.preventDefault();
  try {
    await api('/api/projects/' + currentProject.id, 'PUT', {
      name: document.getElementById('edit-project-name').value,
      description: document.getElementById('edit-project-desc').value
    });
    closeModal('edit-project-modal');
    toast('Project updated!');
    openProject(currentProject.id);
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteProject() {
  if (!confirm('Delete this project and all its tasks?')) return;
  try {
    await api('/api/projects/' + currentProject.id, 'DELETE');
    toast('Project deleted');
    showView('projects');
  } catch (err) { toast(err.message, 'error'); }
}

// --- Project Tabs ---
function showProjectTab(tab) {
  document.querySelectorAll('.proj-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.proj-tab-content').forEach(c => c.style.display = 'none');
  document.getElementById(tab + '-tab').style.display = 'block';
  const tabs = document.querySelectorAll('.proj-tab');
  tabs.forEach(t => { if (t.textContent.trim().toLowerCase().startsWith(tab)) t.classList.add('active'); });
}

// --- Members ---
function renderMembers() {
  const list = document.getElementById('members-list');
  list.innerHTML = currentProjectMembers.map(m => `
    <div class="member-card">
      <div class="avatar" style="background:${m.avatar_color}">${m.name[0].toUpperCase()}</div>
      <div class="member-info"><h4>${esc(m.name)}</h4><p>${esc(m.email)}</p></div>
      <span class="role-badge role-${m.role}">${m.role}</span>
      ${currentProject.my_role === 'admin' && m.id !== currentUser.id ? `
        <select onchange="changeRole(${m.id}, this.value)" style="width:auto;margin:0;padding:4px 8px;font-size:12px">
          <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member</option>
          <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
        <button class="btn btn-sm btn-danger" onclick="removeMember(${m.id})">Remove</button>
      ` : ''}
    </div>`).join('');
}

async function addMember() {
  const email = document.getElementById('member-email').value;
  const role = document.getElementById('member-role').value;
  if (!email) return;
  try {
    const member = await api('/api/projects/' + currentProject.id + '/members', 'POST', { email, role });
    currentProjectMembers.push(member);
    renderMembers();
    document.getElementById('member-email').value = '';
    toast('Member added!');
  } catch (err) { toast(err.message, 'error'); }
}

async function removeMember(userId) {
  if (!confirm('Remove this member?')) return;
  try {
    await api('/api/projects/' + currentProject.id + '/members/' + userId, 'DELETE');
    currentProjectMembers = currentProjectMembers.filter(m => m.id !== userId);
    renderMembers();
    toast('Member removed');
  } catch (err) { toast(err.message, 'error'); }
}

async function changeRole(userId, role) {
  try {
    await api('/api/projects/' + currentProject.id + '/members/' + userId, 'PUT', { role });
    const m = currentProjectMembers.find(m => m.id === userId);
    if (m) m.role = role;
    renderMembers();
    toast('Role updated');
  } catch (err) { toast(err.message, 'error'); }
}

// --- Tasks ---
async function loadProjectTasks() {
  try {
    allTasks = await api('/api/tasks/project/' + currentProject.id);
    filterTasks();
  } catch (err) { toast(err.message, 'error'); }
}

function filterTasks() {
  const status = document.getElementById('filter-status').value;
  const priority = document.getElementById('filter-priority').value;
  let tasks = allTasks;
  if (status) tasks = tasks.filter(t => t.status === status);
  if (priority) tasks = tasks.filter(t => t.priority === priority);
  renderKanban(tasks);
}

function renderKanban(tasks) {
  const today = new Date().toISOString().split('T')[0];
  const todo = tasks.filter(t => t.status === 'todo');
  const progress = tasks.filter(t => t.status === 'in_progress');
  const done = tasks.filter(t => t.status === 'done');

  document.getElementById('todo-count').textContent = todo.length;
  document.getElementById('progress-count').textContent = progress.length;
  document.getElementById('done-count').textContent = done.length;

  const renderCards = (list) => list.length ? list.map(t => {
    const overdue = t.due_date && t.due_date < today && t.status !== 'done';
    return `<div class="task-card" onclick="openEditTaskModal(${t.id})">
      <h4>${esc(t.title)}</h4>
      <div class="task-meta">
        <span class="badge badge-${t.priority}">${t.priority}</span>
        ${t.due_date ? `<span class="badge ${overdue ? 'badge-overdue' : ''}">${overdue ? '⚠ ' : ''}${t.due_date}</span>` : ''}
      </div>
      ${t.assigned_name ? `<div class="task-assignee"><div class="avatar-xs" style="background:${t.assigned_color}">${t.assigned_name[0]}</div>${esc(t.assigned_name)}</div>` : ''}
    </div>`;
  }).join('') : '<div class="empty-state" style="padding:20px"><p>No tasks</p></div>';

  document.getElementById('todo-tasks').innerHTML = renderCards(todo);
  document.getElementById('progress-tasks').innerHTML = renderCards(progress);
  document.getElementById('done-tasks').innerHTML = renderCards(done);
}

function openCreateTaskModal() {
  const sel = document.getElementById('task-assign');
  sel.innerHTML = '<option value="">Unassigned</option>' + currentProjectMembers.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-due').value = '';
  openModal('create-task-modal');
}

async function createTask(e) {
  e.preventDefault();
  try {
    await api('/api/tasks', 'POST', {
      title: document.getElementById('task-title').value,
      description: document.getElementById('task-desc').value,
      priority: document.getElementById('task-priority').value,
      due_date: document.getElementById('task-due').value || null,
      project_id: currentProject.id,
      assigned_to: document.getElementById('task-assign').value || null
    });
    closeModal('create-task-modal');
    toast('Task created!');
    loadProjectTasks();
  } catch (err) { toast(err.message, 'error'); }
}

function openEditTaskModal(taskId) {
  const t = allTasks.find(t => t.id === taskId);
  if (!t) return;
  document.getElementById('edit-task-id').value = t.id;
  document.getElementById('edit-task-title').value = t.title;
  document.getElementById('edit-task-desc').value = t.description || '';
  document.getElementById('edit-task-status').value = t.status;
  document.getElementById('edit-task-priority').value = t.priority;
  document.getElementById('edit-task-due').value = t.due_date || '';

  const sel = document.getElementById('edit-task-assign');
  sel.innerHTML = '<option value="">Unassigned</option>' + currentProjectMembers.map(m => `<option value="${m.id}" ${m.id === t.assigned_to ? 'selected' : ''}>${esc(m.name)}</option>`).join('');

  // If member, disable fields except status
  const isAdmin = currentProject.my_role === 'admin';
  document.getElementById('edit-task-title').disabled = !isAdmin;
  document.getElementById('edit-task-desc').disabled = !isAdmin;
  document.getElementById('edit-task-priority').disabled = !isAdmin;
  document.getElementById('edit-task-due').disabled = !isAdmin;
  sel.disabled = !isAdmin;

  openModal('edit-task-modal');
}

async function updateTask(e) {
  e.preventDefault();
  const id = document.getElementById('edit-task-id').value;
  try {
    await api('/api/tasks/' + id, 'PUT', {
      title: document.getElementById('edit-task-title').value,
      description: document.getElementById('edit-task-desc').value,
      status: document.getElementById('edit-task-status').value,
      priority: document.getElementById('edit-task-priority').value,
      due_date: document.getElementById('edit-task-due').value || null,
      assigned_to: document.getElementById('edit-task-assign').value || null
    });
    closeModal('edit-task-modal');
    toast('Task updated!');
    loadProjectTasks();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteTask() {
  const id = document.getElementById('edit-task-id').value;
  if (!confirm('Delete this task?')) return;
  try {
    await api('/api/tasks/' + id, 'DELETE');
    closeModal('edit-task-modal');
    toast('Task deleted');
    loadProjectTasks();
  } catch (err) { toast(err.message, 'error'); }
}

// --- Modal ---
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// --- Util ---
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// --- Boot ---
if (token) initApp();
