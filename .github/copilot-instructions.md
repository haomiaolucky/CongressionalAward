# Congressional Award Tracking System

## Project Overview
A full-stack web application to help students track their progress toward The Congressional Award by logging volunteer hours, personal development, physical fitness, and expedition activities.

## Tech Stack
- **Backend**: Node.js with Express.js
- **Frontend**: React with Vite
- **Database**: Azure MySQL
- **Email**: Nodemailer with SMTP
- **Authentication**: JWT tokens

## Project Structure
```
CongressionalAward/
├── backend/                 # Express.js API server
│   ├── config/             # Database and app configuration
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Auth and validation middleware
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── services/           # Email and business logic
│   └── utils/              # Utility functions
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service calls
│   │   ├── context/        # React context providers
│   │   └── utils/          # Helper functions
└── database/               # SQL scripts and migrations
```

## Congressional Award Levels
- **Bronze**: 100 hours minimum (15 hrs each category + Expedition)
- **Silver**: 200 hours minimum (50 hrs each category + Expedition)  
- **Gold**: 400 hours minimum (200 hrs each category + Expedition)

## Categories
1. Volunteer Public Service
2. Personal Development
3. Physical Fitness
4. Expedition/Exploration

## Key Features
- Student registration with admin approval
- Activity logging with supervisor approval workflow
- Email notifications for approvals
- Dashboard with progress tracking
- Award level progress visualization

## Development Commands
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```
