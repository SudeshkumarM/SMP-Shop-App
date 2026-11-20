const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config({ path: path.join(__dirname, '.env') });

require('./config/supabase');

if (!process.env.JWT_SECRET?.trim() || process.env.JWT_SECRET.startsWith('YOUR_')) {
  throw new Error('[Auth] Required environment variable JWT_SECRET is missing or still a placeholder.');
}

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const staffRoutes = require('./routes/staffRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ownerRoutes = require('./routes/ownerRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const billingRoutes = require('./routes/billingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const server = http.createServer(app);
const isVercel = Boolean(process.env.VERCEL);
if (isVercel) {
  app.set('trust proxy', 1);
}

// Initialize Socket.IO for Real-time Synchronization
const io = isVercel ? null : new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }
});

app.set('io', io);

if (io) {
  io.on('connection', (socket) => {
    socket.on('disconnect', () => {});
  });
}

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoints
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'OK',
    platform: 'SMP',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    platform: 'SMP',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', (req, res, next) => {
  connectDB().then(() => next()).catch(next);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[SMP Server] Port ${PORT} is occupied by another process. Attempting automated port recovery...`);
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        const fs = require('fs');
        const path = require('path');
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
          if (line.includes(`:${PORT}`) && line.toUpperCase().includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && /^\d+$/.test(pid) && pid !== '0' && pid !== String(process.pid)) {
              pids.add(pid);
            }
          }
        }

        if (pids.size > 0) {
          for (const pid of pids) {
            try {
              execSync(`${taskkillBin} /F /PID ${pid}`, { stdio: 'ignore' });
              console.log(`[SMP Server] Successfully terminated conflicting process PID ${pid} on port ${PORT}.`);
            } catch (e) {}
          }
          setTimeout(() => {
            if (!isVercel) {
              connectDB()
                .then(() => {
                  server.listen(PORT, () => {
                    console.log(`[SMP Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
                  });
                })
                .catch((error) => {
                  console.error('[SMP Server] Database startup failed:', error.message);
                  process.exit(1);
                });
            }
          }, 800);
          return;
        }
      }
    } catch (recoverErr) {
      console.error('[SMP Server] Port auto-recovery failed:', recoverErr.message);
    }
    console.error(`\n[SMP Server Error] Port ${PORT} is already in use by another process.`);
    console.error(`[SMP Server Advice] Run 'npm run dev' or terminate the existing process on port ${PORT}.\n`);
    process.exit(1);
  } else {
    console.error(`[SMP Server Error]:`, err);
  }
});

if (require.main === module && !isVercel) {
  server.listen(PORT, () => {
    console.log(`[SMP Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

process.on('unhandledRejection', (err) => {
  console.error(`[Server Error] Unhandled rejection: ${err.message}`);
});

module.exports = app;
module.exports.server = server;
