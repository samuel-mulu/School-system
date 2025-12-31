import app from './app';
import { prisma } from './config/db';

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Check database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
