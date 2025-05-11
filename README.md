# Competitive Programming Profile Tracker

A web application for tracking competitive programming profiles across multiple platforms like CodeChef, Codeforces, LeetCode, and HackerRank.

## Features

- User authentication with college email ID
- Profile management for multiple coding platforms
- Real-time leaderboard
- Progress tracking
- Score updates from various platforms

## Tech Stack

- Frontend: React.js
- Backend: Node.js with Express
- Database: MongoDB
- Authentication: JWT

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd backend
   npm install
   ```
3. Create a `.env` file in the backend directory with your MongoDB connection string and JWT secret
4. Start the application:
   ```bash
   # Frontend
   cd frontend
   npm start

   # Backend
   cd backend
   npm start
   ```

## Environment Variables

Backend `.env` file should contain:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```
