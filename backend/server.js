require('dotenv').config();
const app = require('./src/app');
const { testConnection } = require('./src/database/pool');

const PORT = process.env.PORT || 8000;

async function bootstrap() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Fincare API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
