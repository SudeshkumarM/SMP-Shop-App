const { spawn } = require('child_process');
const path = require('path');

console.log('\n======================================================');
console.log('  🛍️  Starting SMP (Shop Management Platform) Dev Servers');
console.log('======================================================');
console.log('  ▸ Backend API:      http://localhost:5000');
console.log('  ▸ Frontend Store:   http://localhost:5172');
console.log('  ▸ Database:         mongodb://127.0.0.1:27017/smp_db');
console.log('======================================================\n');

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
