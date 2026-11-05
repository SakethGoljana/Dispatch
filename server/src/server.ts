import mongoose from 'mongoose';
import { app } from './app';
import { config } from './config/env';

async function startServer() {
  try {
    console.log(`[SchoolPing API] Connecting to MongoDB...`);
    await mongoose.connect(config.mongoUri);
    console.log(`[SchoolPing API] Connected to MongoDB database successfully.`);

    app.listen(config.port, () => {
      console.log(`[SchoolPing API] Server running on port ${config.port} (${config.nodeEnv})`);
    });
  } catch (err) {
    console.error('[SchoolPing API] Failed to start server:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
