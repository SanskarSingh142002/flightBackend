require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/utils/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 FlightConnect API running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV}`);
    console.log(`   MongoDB     : connected`);
  });
}).catch((err) => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
  console.log('⚠️  Starting server without DB (demo mode)...');
  app.listen(PORT, () => {
    console.log(`🚀 FlightConnect API (no-DB mode) on http://localhost:${PORT}`);
  });
});
