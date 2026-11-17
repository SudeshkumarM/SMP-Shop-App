/**
 * SMP Real-Time Synchronization Helper
 */
const emitRealtimeUpdate = (app, event, data) => {
  try {
    if (!app) return;
    const io = typeof app.get === 'function' ? app.get('io') : null;
    if (io) {
      io.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error(`[Realtime Error] Failed to emit event ${event}:`, error.message);
  }
};

module.exports = {
  emitRealtimeUpdate
};
