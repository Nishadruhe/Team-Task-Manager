const express = require('express');
const { all, get, run, runNoReturn } = require('../db');
const { auth } = require('../auth');
const router = express.Router();

router.use(auth);

async function checkAccess(projectId, userId) {
  return get('SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
}

router.get('/dashboard', async (req, res) => {
  try {
    const myTasks = await all(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t JOIN projects p ON p.id = t.project_id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      WHERE t.assigned_to = $2
      ORDER BY t.due_date ASC NULLS LAST
    `, [req.user.id, req.user.id]);

    const today = new Date().toISOString().split('T')[0];
    const stats = {
      total: myTasks.length,
      todo: myTasks.filter(t => t.status === 'todo').length,
      in_progress: myTasks.filter(t => t.status === 'in_progress').length,
      done: myTasks.filter(t => t.status === 'done').length,
      overdue: myTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length,
      high_priority: myTasks.filter(t => t.priority === 'high' && t.status !== 'done').length
    };

    res.json({ tasks: myTasks, stats });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/project/:projectId', async (req, res) => {
  try {
    const pid = parseInt(req.params.projectId);
    if (!(await checkAccess(pid, req.user.id))) return res.status(403).json({ error: 'Access denied' });

    const tasks = await all(`
      SELECT t.*, u.name as assigned_name, u.avatar_color as assigned_color, c.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users c ON c.id = t.created_by
      WHERE t.project_id = $1
      ORDER BY
        CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.created_at DESC
    `, [pid]);
    res.json(tasks);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, priority, due_date, project_id, assigned_to } = req.body;
    if (!title || !project_id) return res.status(400).json({ error: 'Title and project are required' });

    const access = await checkAccess(project_id, req.user.id);
    if (!access) return res.status(403).json({ error: 'Access denied' });

    if (assigned_to) {
      const memberCheck = await checkAccess(project_id, assigned_to);
      if (!memberCheck) return res.status(400).json({ error: 'Assigned user is not a project member' });
    }

    const result = await run(`
      INSERT INTO tasks (title, description, priority, due_date, project_id, assigned_to, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [title, description || '', priority || 'medium', due_date || null, project_id, assigned_to || null, req.user.id]);

    const task = await get(`
      SELECT t.*, u.name as assigned_name, u.avatar_color as assigned_color, c.name as creator_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to LEFT JOIN users c ON c.id = t.created_by
      WHERE t.id = $1
    `, [result.lastInsertRowid]);
    res.json(task);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const tid = parseInt(req.params.id);
    const task = await get('SELECT * FROM tasks WHERE id = $1', [tid]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const access = await checkAccess(task.project_id, req.user.id);
    if (!access) return res.status(403).json({ error: 'Access denied' });

    if (access.role === 'member' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    }

    const { title, description, status, priority, due_date, assigned_to } = req.body;

    if (access.role === 'member') {
      if (status) {
        await runNoReturn('UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, tid]);
      }
    } else {
      await runNoReturn(`
        UPDATE tasks SET title = $1, description = $2, status = $3, priority = $4, due_date = $5, assigned_to = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `, [title || task.title, description ?? task.description, status || task.status, priority || task.priority, due_date !== undefined ? due_date : task.due_date, assigned_to !== undefined ? assigned_to : task.assigned_to, tid]);
    }

    const updated = await get(`
      SELECT t.*, u.name as assigned_name, u.avatar_color as assigned_color, c.name as creator_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to LEFT JOIN users c ON c.id = t.created_by
      WHERE t.id = $1
    `, [tid]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const tid = parseInt(req.params.id);
    const task = await get('SELECT * FROM tasks WHERE id = $1', [tid]);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const access = await checkAccess(task.project_id, req.user.id);
    if (!access) return res.status(403).json({ error: 'Access denied' });
    if (access.role !== 'admin' && task.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only admins or task creator can delete' });
    }

    await runNoReturn('DELETE FROM tasks WHERE id = $1', [tid]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
