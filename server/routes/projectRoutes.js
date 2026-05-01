const express = require('express');
const { all, get, run, runNoReturn } = require('../db');
const { auth } = require('../auth');
const router = express.Router();

router.use(auth);

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#14b8a6','#f97316','#06b6d4'];

router.get('/', async (req, res) => {
  try {
    const projects = await all(`
      SELECT p.*, pm.role as my_role,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(projects);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const result = await run('INSERT INTO projects (name, description, color, created_by) VALUES ($1, $2, $3, $4)', [name, description || '', color, req.user.id]);
    await run('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [result.lastInsertRowid, req.user.id, 'admin']);

    const project = await get('SELECT * FROM projects WHERE id = $1', [result.lastInsertRowid]);
    res.json({ ...project, my_role: 'admin', member_count: 1, task_count: 0, done_count: 0 });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const pid = parseInt(req.params.id);
    const membership = await get('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [pid, req.user.id]);
    if (!membership) return res.status(403).json({ error: 'Access denied' });

    const project = await get('SELECT * FROM projects WHERE id = $1', [pid]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const members = await all(`
      SELECT u.id, u.name, u.email, u.avatar_color, pm.role
      FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
    `, [pid]);

    res.json({ ...project, my_role: membership.role, members });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const pid = parseInt(req.params.id);
    const membership = await get('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [pid, req.user.id]);
    if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    await runNoReturn('UPDATE projects SET name = $1, description = $2 WHERE id = $3', [name, description || '', pid]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const pid = parseInt(req.params.id);
    const membership = await get('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [pid, req.user.id]);
    if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    await runNoReturn('DELETE FROM tasks WHERE project_id = $1', [pid]);
    await runNoReturn('DELETE FROM project_members WHERE project_id = $1', [pid]);
    await runNoReturn('DELETE FROM projects WHERE id = $1', [pid]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/:id/members', async (req, res) => {
  try {
    const pid = parseInt(req.params.id);
    const membership = await get('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [pid, req.user.id]);
    if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await get('SELECT id, name, email, avatar_color FROM users WHERE email = $1', [email]);
    if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });

    const existing = await get('SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2', [pid, user.id]);
    if (existing) return res.status(400).json({ error: 'User is already a member' });

    const memberRole = role === 'admin' ? 'admin' : 'member';
    await run('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [pid, user.id, memberRole]);
    res.json({ ...user, role: memberRole });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const pid = parseInt(req.params.id);
    const uid = parseInt(req.params.userId);
    const membership = await get('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [pid, req.user.id]);
    if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    if (uid === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });

    await runNoReturn('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [pid, uid]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/members/:userId', async (req, res) => {
  try {
    const pid = parseInt(req.params.id);
    const uid = parseInt(req.params.userId);
    const membership = await get('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [pid, req.user.id]);
    if (!membership || membership.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    await runNoReturn('UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3', [role, pid, uid]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
