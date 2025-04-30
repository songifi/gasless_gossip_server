export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'gasless_gossip',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  notifications: {
    email: {
      smtp: process.env.SMTP_URL || 'smtp://user:pass@localhost:587',
      user: process.env.SMTP_USER || 'user',
      pass: process.env.SMTP_PASS || 'pass',
    },
    push: {
      fcmKey: process.env.FCM_KEY || 'your-fcm-key',
      apnsKey: process.env.APNS_KEY || 'your-apns-key',
    },
    webhook: {
      url: process.env.WEBHOOK_URL || 'https://example.com/webhook',
    },
  },
});