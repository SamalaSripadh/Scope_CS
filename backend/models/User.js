const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/@mlrit\.ac\.in$/, 'Please use your MLRIT college email address']
  },
  department: {
    type: String,
    required: true,
    enum: ['AERO', 'CSC', 'CSD', 'CSE', 'CSM', 'CSIT', 'IT', 'ECE', 'MECH', 'EEE']
  },
  section: {
    type: String,
    required: true,
    enum: ['None', 'A', 'B', 'C', 'D', 'E', 'F', 'G']
  },
  graduatingYear: {
    type: Number,
    required: true,
    min: 2024,
    max: 2030,
    validate: {
      validator: Number.isInteger,
      message: 'Graduating year must be a 4-digit number'
    }
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number']
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profiles: {
    geeksforgeeks: String,
    codechef: String,
    codeforces: String,
    leetcode: String,
    hackerrank: String
  },
  totalScore: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
