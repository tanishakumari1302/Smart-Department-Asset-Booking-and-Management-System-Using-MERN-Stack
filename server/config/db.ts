import mongoose from 'mongoose';

let isMongoConnected = false;

export async function connectDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    console.log('ℹ️ [AssetHub] No MONGODB_URI provided in environment. Running with high-performance in-memory Mongoose store.');
    isMongoConnected = false;
    return false;
  }

  try {
    console.log('⏳ [AssetHub] Connecting to MongoDB Atlas cluster...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isMongoConnected = true;
    console.log('✅ [AssetHub] Connected to MongoDB Atlas successfully.');
    return true;
  } catch (err: any) {
    console.warn('⚠️ [AssetHub] Could not connect to MongoDB Atlas URI (' + err.message + '). Falling back to local storage engine.');
    isMongoConnected = false;
    return false;
  }
}

export function isAtlasConnected(): boolean {
  return isMongoConnected && mongoose.connection.readyState === 1;
}
