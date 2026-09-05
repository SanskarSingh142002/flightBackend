const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/flightconnect';

  mongoose.set('strictQuery', false);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log(`   MongoDB URI : ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
