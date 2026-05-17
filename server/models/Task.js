const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  date: { type: String, required: true },
  tasks: { type: [String], required: true }, 
  duration: { type: String, required: true },
  durationSeconds: { type: Number, default: 0 },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { 
  timestamps: true 
});

const durationToSeconds = (duration) => {
  if (typeof duration !== 'string') return 0;
  const [hours = 0, minutes = 0, seconds = 0] = duration.split(':').map(Number);
  return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
};

taskSchema.pre('validate', function setDurationSeconds(next) {
  this.durationSeconds = durationToSeconds(this.duration);
  next();
});

taskSchema.index({ user: 1, date: -1 });
taskSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema); 
