const mongoose = require('mongoose');

// Register connection events
mongoose.connection.on('connected', () => {
  console.log("✅ MongoDB connected");
});

mongoose.connection.on('error', err => {
  console.error("❌ MongoDB error:", err);
});

mongoose.connection.on('disconnected', () => {
  console.warn("⚠️ MongoDB disconnected");
});

const connectDB = async (retries = 5) => {
  while (retries) {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jeevansetu';
      await mongoose.connect(uri);
      break;
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err.message);
      retries -= 1;
      console.log(`🔄 Retries left: ${retries}`);
      if (retries === 0) process.exit(1);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
};

module.exports = connectDB;
