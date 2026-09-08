import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dairy-smart-ai';
    if (!process.env.MONGODB_URI) {
      console.warn('⚠️ Warning: MONGODB_URI environment variable is not set. Falling back to localhost:27017.');
    }
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB Connected successfully');
    return true;
  } catch (error: any) {
    console.error('❌ MongoDB Connection Error:', error?.message || error);
    console.error('💡 Please set MONGODB_URI in your Render environment variables (e.g. MongoDB Atlas connection string).');
    return false;
  }
};

