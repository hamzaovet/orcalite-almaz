import mongoose from 'mongoose';

const DigitalWalletSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., Fawry, V-Cash, InstaPay
  type: { type: String, required: true }, // e.g., 'E-Wallet', 'Payment Gateway'
  balance: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.DigitalWallet || mongoose.model('DigitalWallet', DigitalWalletSchema);
