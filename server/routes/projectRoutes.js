const express = require('express');
const { all, get, run } = require('../db');
const { auth } = require('../auth');
const router = express.Router();

router.use(auth);

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#14b8a6','#f97316','#06b6d4'];

router.get('/', (req, res) => {
  const projects = all(`
    SELECT p.*, pm.role as my_role,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    ORDER BY p.created_at DESC
  `, [req.user.id]);
  res.json(projects);
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const result = run('INSERT INTO projects (name, description, color, created_by) VALUES (?, ?, ?, ?)', [name, description || '', color, req.user.id]);
  run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [result.lastInsertRowid, req.user.id, 'admin']);

  const project = get('SELECT * FROM projects WHERE id = ?', [result.lastInsertRowid]);
  res.json({ ...project, my_role: 'admin', member_count: 1, task_count: 0, done_count: 0 });
});

router.get('/:id', (req, res) => {
  const pid = parseInt(req.params.id);
  const membership = get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [pid, req.user.id]);
  if (!membership) return res.status(403).json({ error: 'Access denied' });

  const project = get('SELECT * FROM projects WHERE id = ?', [pid]);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = all(`
    SELECT u.id, u.name, u.email, u.avatar_color, pm.role
    FROM project_members pm JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `, [pid]);

  res.json({ ...project, my_role: membership.role, members });
});

router.put('/:id', (req, res) => {
  const pid = parseInt(req.params.id);
  const membership = get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [pid, req.user.id]);
  if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  run('UPDATE projects SET name = ?, description = ? WHERE id = ?', [name, description || '', pid]);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const pid = parseInt(req.params.id);
  const membership = get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [pid, req.user.id]);
  if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  run('DELETE FROM tasks WHERE project_id = ?', [pid]);
  run('DELETE FROM project_members WHERE project_id = ?', [pid]);
  run('DELETE FROM projects WHERE id = ?', [pid]);
  res.json({ success: true });
});

router.post('/:id/members', (req, res) => {
  const pid = parseInt(req.params.id);
  const membership = get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [pid, req.user.id]);
  if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = get('SELECT id, name, email, avatar_color FROM users WHERE email = ?', [email]);
  if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });

  const existing = get('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?', [pid, user.id]);
  if (existing) return res.status(400).json({ error: 'User is already a member' });

  const memberRole = role === 'admin' ? 'admin' : 'member';
  run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [pid, user.id, memberRole]);
  res.json({ ...user, role: memberRole });
});

router.delete('/:id/members/:userId', (req, res) => {
  const pid = parseInt(req.params.id);
  const uid = parseInt(req.params.userId);
  const membership = get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [pid, req.user.id]);
  if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  if (uid === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });

  run('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [pid, uid]);
  res.json({ success: true });
});

router.put('/:id/members/:userId', (req, res) => {
  const pid = parseInt(req.params.id);
  const uid = parseInt(req.params.userId);
  const membership = get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [pid, req.user.id]);
  if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  run('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?', [role, pid, uid]);
  res.json({ success: true });
});

module.exports = router;
