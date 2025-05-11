const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const validDepartments = ['AERO', 'CSC', 'CSD', 'CSE', 'CSM', 'CSIT', 'IT', 'ECE', 'MECH', 'EEE'];
const validSections = ['None', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];

// Register user
router.post('/register',
  [
    // Name validation
    body('name').trim().notEmpty().withMessage('Name is required'),
    
    // Roll number validation
    body('rollNumber').trim().notEmpty().withMessage('Roll number is required')
      .custom(async value => {
        const user = await User.findOne({ rollNumber: value });
        if (user) {
          throw new Error('Roll number already registered');
        }
        return true;
      }),
    
    // Gender validation
    body('gender').isIn(['Male', 'Female'])
      .withMessage('Gender must be Male or Female'),
    
    // Email validation
    body('email').trim().isEmail().withMessage('Invalid email address')
      .custom(value => {
        if (!value.endsWith('@mlrit.ac.in')) {
          throw new Error('Please use your MLRIT college email address');
        }
        return true;
      })
      .custom(async value => {
        const user = await User.findOne({ email: value.toLowerCase() });
        if (user) {
          throw new Error('Email already registered');
        }
        return true;
      }),
    
    // Department validation
    body('department').isIn(validDepartments)
      .withMessage('Invalid department selected'),
    
    // Section validation
    body('section').isIn(validSections)
      .withMessage('Invalid section selected'),
    
    // Graduating year validation
    body('graduatingYear').isInt({ min: 2024, max: 2030 })
      .withMessage('Graduating year must be between 2024 and 2030'),
    
    // Mobile number validation
    body('mobileNumber').matches(/^[6-9]\d{9}$/)
      .withMessage('Please enter a valid 10-digit mobile number')
      .custom(async value => {
        const user = await User.findOne({ mobileNumber: value });
        if (user) {
          throw new Error('Mobile number already registered');
        }
        return true;
      }),
    
    // Password validation
    body('password').isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/\d/).withMessage('Password must contain at least one number')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),
    
    // Confirm password validation
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    

  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        rollNumber,
        gender,
        email,
        department,
        section,
        graduatingYear,
        mobileNumber,
        password,
      } = req.body;

      const user = new User({
        name,
        rollNumber,
        gender,
        email: email.toLowerCase(),
        department,
        section,
        graduatingYear,
        mobileNumber,
        password,
        profiles: {
          codechef: '',
          codeforces: '',
          leetcode: '',
          hackerrank: ''
        }
      });

      await user.save();

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          section: user.section,
          rollNumber: user.rollNumber
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Login user
router.post('/login',
  [
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').exists().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: user.department,
          section: user.section,
          rollNumber: user.rollNumber
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
