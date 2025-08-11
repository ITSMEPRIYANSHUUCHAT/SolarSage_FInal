
import mongoose from 'mongoose';
import { toast } from 'sonner';

const MONGODB_URI = import.meta.env.VITE_MONGODB_URI || 'mongodb://localhost:27017/electricity-insights';

// Global variable to track connection status
let isConnected = false;

/**
 * Connect to MongoDB database
 */
export const connectToDatabase = async (): Promise<void> => {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(MONGODB_URI);
    isConnected = !!db.connections[0].readyState;
    
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    toast.error('Failed to connect to database');
    throw error;
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectFromDatabase = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB disconnected successfully');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
  }
};
