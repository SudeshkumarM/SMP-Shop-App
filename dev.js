const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n======================================================');
console.log('  🛍️  Starting SMP Application Servers');
console.log('======================================================');
console.log('  ▸ Backend API:      http://localhost:5000');
console.log('  ▸ Frontend Store:   http://localhost:5172');
console.log('  ▸ Database:         MongoDB Atlas (/test; configured via backend/.env)');
console.log('======================================================\n');

// Automatically free port if previously occupied by a stale node process
const freePort = (port) => {
  if (process.platform === 'win32') {
    try {
      const sysRoot = process.env.SystemRoot || 'C:\\Windows';
      const netstatBin = fs.existsSync(path.join(sysRoot, 'System32', 'netstat.exe'))
        ? `"${path.join(sysRoot, 'System32', 'netstat.exe')}"`
        : 'netstat';
      const taskkillBin = fs.existsSync(path.join(sysRoot, 'System32', 'taskkill.exe'))
        ? `"${path.join(sysRoot, 'System32', 'taskkill.exe')}"`
        : 'taskkill';

      const output = execSync(`${netstatBin} -ano`, {
        stdio: ['pipe', 'pipe', 'ignore'],
        encoding: 'utf8'
      });

      const lines = output.split(/\r?\n/);
      const pids = new Set();
      for (const line of lines) {
        if (line.includes(`:${port}`) && line.toUpperCase().includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid) && pid !== '0' && pid !== String(process.pid)) {
            pids.add(pid);
          }
        }
      }

      for (const pid of pids) {
        try {
          execSync(`${taskkillBin} /F /PID ${pid}`, { stdio: 'ignore' });
          console.log(`[SMP] Successfully freed port ${port} by terminating stale process (PID: ${pid})`);
        } catch (e) {}
      }
    } catch (err) {
      // Port already free or command ignored
    }
  }
};

// Ensure ports 5000 and 5172 are clean before launching
freePort(5000);
freePort(5172);

// 1. Launch Backend Server
const backend = spawn('npm start', {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// 2. Launch Frontend Dev Server
const frontend = spawn('npm run dev', {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\n[SMP] Gracefully shutting down servers...');
  try { backend.kill('SIGINT'); } catch (e) {}
  try { frontend.kill('SIGINT'); } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

backend.on('error', (err) => {
  console.error('[Backend Error]:', err.message);
});

frontend.on('error', (err) => {
  console.error('[Frontend Error]:', err.message);
});
