import mongoose from 'mongoose';

const commuteSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  duration: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  dayOfWeek: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  errorMessage: String
});

commuteSchema.index({ timestamp: -1 });
commuteSchema.index({ dayOfWeek: 1 });

export const CommuteData = mongoose.model('CommuteData', commuteSchema);