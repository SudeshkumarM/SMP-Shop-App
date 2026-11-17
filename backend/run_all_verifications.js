const { spawn } = require('child_process');
const path = require('path');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: 'inherit', shell: true });
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command ${cmd} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

async function main() {
  console.log('=============================================================');
  console.log('  🧪 SMP FULL AUTOMATED VERIFICATION SUITE');
  console.log('=============================================================\n');

  const backendDir = __dirname;

  // 1. Seed Clean Database
  console.log('[1/4] Seeding clean initial database...');
  await runCommand('node', ['utils/seedData.js'], backendDir);

  // 2. Start Backend Server Process
  console.log('\n[2/4] Starting SMP Backend Server for Verification...');
  const serverProcess = spawn('node', ['server.js'], { cwd: backendDir, stdio: 'pipe' });

  serverProcess.stdout.on('data', (d) => {
    const text = d.toString();
    if (text.includes('Running')) process.stdout.write(text);
  });
  serverProcess.stderr.on('data', (d) => {
    process.stderr.write(d.toString());
  });

  // Wait for server to become healthy
  let ready = false;
  for (let attempt = 1; attempt <= 25; attempt++) {
    try {
      const res = await fetch('http://localhost:5000/api/health');
      if (res.ok) {
        ready = true;
        console.log('✓ Backend Server is ready and healthy on http://localhost:5000\n');
        break;
      }
    } catch (e) {
      await wait(600);
    }
  }

  if (!ready) {
    serverProcess.kill();
    throw new Error('Backend server failed to start within timeout');
  }

  try {
    // 3. Run E2E Flow Test
    console.log('[3/4] Running End-to-End User Verification Flows...');
    await runCommand('node', ['test_e2e_flow.js'], backendDir);

    // 4. Run 1000-User Concurrency Load Test
    console.log('[4/4] Running 1,000 Concurrent User Load & Stress Benchmark...');
    await runCommand('node', ['test_load_concurrency.js'], backendDir);

    console.log('\n=============================================================');
    console.log('  🎉 ALL AUTOMATED TESTS PASSED 100% SUCCESSFULLY!');
    console.log('=============================================================\n');
  } finally {
    console.log('Shutting down test backend server...');
    serverProcess.kill('SIGTERM');
    await wait(1000);

    // Reset database to pristine seed state
    console.log('Resetting database to pristine clean state...');
    await runCommand('node', ['utils/seedData.js'], backendDir);
  }
}

main().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
