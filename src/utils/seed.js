/**
 * Seed script — creates default admin & staff users.
 * Run once: node src/utils/seed.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const User = require('../models/User.model');

const SEED_USERS = [
  {
    name: process.env.ADMIN_NAME || 'Admin User',
    username: process.env.ADMIN_USERNAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
  },
];

const seed = async () => {
  try {
    if (!SEED_USERS[0].username || !SEED_USERS[0].email || !SEED_USERS[0].password) {
      throw new Error('ADMIN_USERNAME, ADMIN_EMAIL and ADMIN_PASSWORD are required in .env');
    }
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/flightconnect');
    console.log('Connected to MongoDB');

    for (const u of SEED_USERS) {
      const exists = await User.findOne({ username: u.username }).select('+password');
      if (exists) {
        exists.name = u.name;
        exists.email = u.email;
        exists.password = u.password;
        exists.role = u.role;
        exists.isActive = true;
        await exists.save();
        console.log(`  [OK]   Updated user "${u.username}" (${u.role})`);
        continue;
      }
      await User.create(u);
      console.log(`  [OK]   Created user "${u.username}" (${u.role})`);
    }

    console.log('\n✅ Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
