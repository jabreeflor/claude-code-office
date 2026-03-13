import express from 'express';
import cors from 'cors';
import { createStateWatcher } from './state-watcher.js';

const app = express();
app.use(cors());

const PORT = 3481;

const projectsDir = process.env.CLAUDE_PROJECTS_DIR || `${process.env.HOME}/.claude/projects`;
const watcher = createStateWatcher(projectsDir);

app.get('/api/state', (req, res) => {
  res.json(watcher.getState());
});

app.listen(PORT, () => {
  console.log(`Claude Code Office API running on http://localhost:${PORT}`);
  console.log(`Watching: ${projectsDir}`);
});
