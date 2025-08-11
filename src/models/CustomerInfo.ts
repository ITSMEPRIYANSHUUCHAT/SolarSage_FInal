
import mongoose from 'mongoose';

// Define the schema for customer information
const customerInfoSchema = new mongoose.Schema({
  name: String,
  address: String,
  month: String,
  consumption: String,
  generation: String,
  savings: String,
  neighRank: String,
  topGen: String,
  missedSavings: Number,
  latitude: Number,
  longitude: Number,
  billing_date: String,
  billing_mode: String,
  total_dni: Number,
  D_value: Number,
  E_value: Number,
  F_value: Number,
  G_value: Number
}, {
  timestamps: true
});

// Fix the model registration to handle cases where the model might already be registered
let CustomerInfo: mongoose.Model<any>;
try {
  // Try to get the existing model to prevent OverwriteModelError
  CustomerInfo = mongoose.model('CustomerInfo');
} catch (error) {
  // Model doesn't exist yet, so create it
  CustomerInfo = mongoose.model('CustomerInfo', customerInfoSchema);
}

export { CustomerInfo };

// Type definition for CustomerInfo
export interface ICustomerInfo {
  _id?: string;
  name: string;
  address: string;
  month: string;
  consumption: string;
  generation: string;
  savings: string;
  neighRank: string;
  topGen: string;
  missedSavings: number;
  latitude: number;
  longitude: number;
  billing_date: string;
  billing_mode: string;
  total_dni: number;
  D_value: number;
  E_value: number;
  F_value: number;
  G_value: number;
  createdAt?: Date;
  updatedAt?: Date;
}
