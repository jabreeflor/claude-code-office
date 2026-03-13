import fs from 'fs';
import path from 'path';

export function createStateWatcher(projectsDir) {
  let currentState = { state: 'idle', detail: 'Waiting...', timestamp: Date.now() };

  function findMostRecentJsonl(dir) {
    try {
      if (!fs.existsSync(dir)) return null;

      let newest = null;
      let newestTime = 0;

      function walk(d) {
        let entries;
        try {
          entries = fs.readdirSync(d, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const full = path.join(d, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (entry.name.endsWith('.jsonl')) {
            try {
              const stat = fs.statSync(full);
              if (stat.mtimeMs > newestTime) {
                newestTime = stat.mtimeMs;
                newest = full;
              }
            } catch {
              // skip
            }
          }
        }
      }

      walk(dir);
      return newest;
    } catch {
      return null;
    }
  }

  function parseLastEvents(filePath, count = 20) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const recent = lines.slice(-count);
      const events = [];
      for (const line of recent) {
        try {
          events.push(JSON.parse(line));
        } catch {
          // skip malformed lines
        }
      }
      return events;
    } catch {
      return [];
    }
  }

  function detectState(events) {
    if (events.length === 0) {
      return { state: 'idle', detail: 'No activity detected' };
    }

    const last = events[events.length - 1];
    const lastTimestamp = last.timestamp || last.ts || Date.now();
    const age = Date.now() - new Date(lastTimestamp).getTime();

    // No events for 3+ seconds = idle
    if (age > 3000) {
      return { state: 'idle', detail: 'Idle' };
    }

    // Check recent events in reverse
    for (let i = events.length - 1; i >= 0; i--) {
      const evt = events[i];
      const type = evt.type || evt.event_type || '';
      const msg = evt.message || evt.content || '';
      const toolName = evt.tool_name || evt.name || '';

      // Check for errors
      if (type === 'error' || (typeof msg === 'string' && msg.toLowerCase().includes('error'))) {
        return { state: 'error', detail: 'Error encountered' };
      }

      // Check for tool use
      if (type === 'tool_use' || type === 'tool_call') {
        const name = (toolName || msg || '').toLowerCase();

        if (name.includes('read') || name.includes('glob') || name.includes('grep') || name.includes('search')) {
          return { state: 'reading', detail: `Reading: ${toolName || 'files'}` };
        }
        if (name.includes('write') || name.includes('edit') || name.includes('notebook')) {
          return { state: 'typing', detail: `Writing: ${toolName || 'code'}` };
        }
        if (name.includes('bash') || name.includes('computer') || name.includes('terminal')) {
          return { state: 'typing', detail: `Running: ${toolName || 'command'}` };
        }

        return { state: 'typing', detail: `Using: ${toolName || 'tool'}` };
      }

      // Check for result/completion
      if (type === 'result' || type === 'completion' || type === 'tool_result') {
        return { state: 'success', detail: 'Task complete!' };
      }

      // Assistant message = thinking
      if (type === 'assistant' || type === 'assistant_message') {
        return { state: 'thinking', detail: 'Thinking...' };
      }
    }

    return { state: 'idle', detail: 'Idle' };
  }

  function poll() {
    const jsonlFile = findMostRecentJsonl(projectsDir);
    if (jsonlFile) {
      const events = parseLastEvents(jsonlFile);
      const detected = detectState(events);
      currentState = { ...detected, timestamp: Date.now() };
    }
  }

  // Poll every 500ms
  const interval = setInterval(poll, 500);
  poll(); // Initial poll

  return {
    getState() {
      return currentState;
    },
    stop() {
      clearInterval(interval);
    }
  };
}
