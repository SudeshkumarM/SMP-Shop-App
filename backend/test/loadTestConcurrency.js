/**
 * SMP Shop App - Staged High-Concurrency Load Testing Suite
 * Executes staged load tests across 10, 50, 100, 500, and 1,000 concurrent login attempts.
 * Measures throughput, latency distributions (Avg, P95, P99), 429 rate, 5xx rate, and RPS.
 */

process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '128';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const http = require('http');
const mongoose = require('mongoose');

const app = require('../server');
const connectDB = require('../config/db');

// Reusable HTTP Keep-Alive Agent with high connection limits
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 2000,
  maxFreeSockets: 1000,
  timeout: 90000
});

function calculatePercentile(latencies, percentile) {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function sendLoginRequest(baseUrl, credentials) {
  return new Promise((resolve) => {
    const payload = JSON.stringify(credentials);
    const startTime = process.hrtime.bigint();

    const req = http.request(
      `${baseUrl}/api/auth/owner/login`,
      {
        method: 'POST',
        agent: httpAgent,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 90000
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          const endTime = process.hrtime.bigint();
          const latencyMs = Number(endTime - startTime) / 1e6;
          resolve({
            statusCode: res.statusCode,
            latencyMs,
            success: res.statusCode === 200,
            isRateLimited: res.statusCode === 429,
            isServerError: res.statusCode >= 500
          });
        });
      }
    );

    req.on('error', (err) => {
      const endTime = process.hrtime.bigint();
      const latencyMs = Number(endTime - startTime) / 1e6;
      resolve({
        statusCode: 0,
        latencyMs,
        success: false,
        isRateLimited: false,
        isServerError: true,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 504,
        latencyMs: 90000,
        success: false,
        isRateLimited: false,
        isServerError: true,
        error: 'Timeout'
      });
    });

    req.write(payload);
    req.end();
  });
}

async function runStage(baseUrl, concurrency, credentials) {
  console.log(`\n--------------------------------------------------------------`);
  console.log(`⚡ EXECUTING LOAD STAGE: ${concurrency} CONCURRENT LOGIN REQUESTS`);
  console.log(`--------------------------------------------------------------`);

  const initialMem = process.memoryUsage();
  const overallStart = process.hrtime.bigint();

  // Dispatch all concurrent requests simultaneously
  const promises = [];
  for (let i = 0; i < concurrency; i++) {
    promises.push(sendLoginRequest(baseUrl, credentials));
  }

  const results = await Promise.all(promises);
  const overallEnd = process.hrtime.bigint();
  const totalDurationSeconds = Number(overallEnd - overallStart) / 1e9;

  const latencies = results.map(r => r.latencyMs);
  const successful = results.filter(r => r.success).length;
  const rateLimited = results.filter(r => r.isRateLimited).length;
  const serverErrors = results.filter(r => r.isServerError).length;
  const failed = concurrency - successful;

  const avgLatency = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
  const minLatency = Math.min(...latencies).toFixed(2);
  const maxLatency = Math.max(...latencies).toFixed(2);
  const p50Latency = calculatePercentile(latencies, 50).toFixed(2);
  const p95Latency = calculatePercentile(latencies, 95).toFixed(2);
  const p99Latency = calculatePercentile(latencies, 99).toFixed(2);
  const rps = (concurrency / totalDurationSeconds).toFixed(2);

  const finalMem = process.memoryUsage();
  const rssMb = (finalMem.rss / 1024 / 1024).toFixed(1);
  const heapUsedMb = (finalMem.heapUsed / 1024 / 1024).toFixed(1);

  console.log(`  ▸ Total Requests:       ${concurrency}`);
  console.log(`  ▸ Successful Logins:    ${successful} (${((successful / concurrency) * 100).toFixed(1)}%)`);
  console.log(`  ▸ Failed Logins:        ${failed} (${((failed / concurrency) * 100).toFixed(1)}%)`);
  console.log(`  ▸ HTTP 429 Rate:        ${rateLimited} (${((rateLimited / concurrency) * 100).toFixed(2)}%)`);
  console.log(`  ▸ HTTP 5xx Rate:        ${serverErrors} (${((serverErrors / concurrency) * 100).toFixed(2)}%)`);
  console.log(`  ▸ Total Time:           ${totalDurationSeconds.toFixed(3)}s`);
  console.log(`  ▸ Throughput (RPS):     ${rps} req/sec`);
  console.log(`  ▸ Latency (Min/Avg/Max): ${minLatency}ms / ${avgLatency}ms / ${maxLatency}ms`);
  console.log(`  ▸ Latency (P50/P95/P99): ${p50Latency}ms / ${p95Latency}ms / ${p99Latency}ms`);
  console.log(`  ▸ Memory (RSS / Heap):  ${rssMb} MB / ${heapUsedMb} MB`);
  if (failed > 0) {
    const errorCounts = {};
    for (const r of results) {
      if (!r.success) {
        const key = r.error || `HTTP ${r.statusCode}`;
        errorCounts[key] = (errorCounts[key] || 0) + 1;
      }
    }
    console.log(`  ▸ Error Breakdown:      ${JSON.stringify(errorCounts)}`);
  }

  return {
    concurrency,
    successful,
    failed,
    rateLimited,
    serverErrors,
    successRate: ((successful / concurrency) * 100).toFixed(1),
    rps,
    avgLatency,
    p95Latency,
    p99Latency,
    totalDurationSeconds: totalDurationSeconds.toFixed(3)
  };
}

async function main() {
  console.log('==============================================================');
  console.log('  🚀 SMP SHOP APP – HIGH-CONCURRENCY LOGIN LOAD TEST SUITE  ');
  console.log('==============================================================');

  await connectDB();
  console.log('✔ Connected to MongoDB for Load Testing.');

  // Bind to ephemeral port
  const server = http.createServer(app);
  server.requestTimeout = 120000;
  server.headersTimeout = 120000;
  server.keepAliveTimeout = 65000;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', 2048, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✔ Load test server listening on ${baseUrl}\n`);

  // Tested credentials: Valid Master Owner Account
  const credentials = {
    username: 'smp',
    password: 'SMPOfficial@2026'
  };

  const stages = [10, 50, 100, 500, 1000];
  const summary = [];

  for (const concurrency of stages) {
    const result = await runStage(baseUrl, concurrency, credentials);
    summary.push(result);
    // Cool down for 1 second between stages to let connection pools settle
    await new Promise((r) => setTimeout(r, 1000));
  }

  server.close();
  await mongoose.disconnect();

  console.log('\n==============================================================');
  console.log('  📊 FINAL LOAD TEST SUMMARY ACROSS ALL STAGES');
  console.log('==============================================================');
  console.table(summary.map(s => ({
    'Concurrent Users': s.concurrency,
    'Success Rate': `${s.successRate}%`,
    'Throughput (RPS)': `${s.rps}`,
    'Avg Latency': `${s.avgLatency}ms`,
    'P95 Latency': `${s.p95Latency}ms`,
    'P99 Latency': `${s.p99Latency}ms`,
    'HTTP 429s': s.rateLimited,
    'HTTP 5xxs': s.serverErrors
  })));
  console.log('==============================================================\n');

  const allPassed = summary.every(s => Number(s.successRate) === 100 && s.rateLimited === 0 && s.serverErrors === 0);
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
