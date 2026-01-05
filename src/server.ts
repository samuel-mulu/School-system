import app from "./app.js";
import { prisma } from "./config/db.js";

const PORT = Number(process.env.PORT) || 4000;

async function startServer() {
  try {
    // Check database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
