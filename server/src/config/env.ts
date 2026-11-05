import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/schoolping',
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_schoolping_2026_super_safe_key',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
