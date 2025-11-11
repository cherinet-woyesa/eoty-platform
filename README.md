# EOTY Platform

EOTY (Education On The Year) Platform is a comprehensive online learning management system with video streaming capabilities, AI-powered features, and interactive course management.

## Features

- 🎓 Course Management System
- ▶️ Video Streaming with Mux Integration
- 🤖 AI-Powered Learning Assistant
- 💬 Interactive Discussions and Forums
- 📊 Analytics and Progress Tracking
- 🎯 Quizzes and Assessments
- 🌐 Multi-language Support
- 📱 Responsive Design

## Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Docker (optional, for containerized deployment)
- AWS Account (for S3 storage)
- Mux Account (for video processing)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd eoty-platform
```

### 2. Environment Setup

Create a `.env` file in the `backend` directory based on `.env.example`:

```bash
cp backend/.env.example backend/.env
```

Update the environment variables with your configuration.

### 3. Database Setup

Start PostgreSQL database:

```bash
# Using Docker
docker-compose up -d db

# Or use your local PostgreSQL installation
```

Run database migrations:

```bash
cd backend
npm run migrate
```

Seed initial data:

```bash
npm run seed
```

### 4. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 5. Start Development Servers

```bash
# Backend (port 5000)
cd backend
npm run dev

# Frontend (port 3000)
cd frontend
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Deployment

### Render Deployment

1. Fork this repository
2. Create a new Web Service on Render
3. Connect your forked repository
4. Set the following build command:
   ```
   cd backend && npm install && npm run migrate
   ```
5. Set the start command:
   ```
   cd backend && npm start
   ```
6. Add environment variables in the Render dashboard (see Deployment Checklist below)
7. Create a PostgreSQL database on Render
8. Deploy!

### Vercel Frontend Deployment

1. Deploy the frontend directory to Vercel
2. Set environment variables as needed
3. Configure the backend API URL

### Environment Variables

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for a complete list of required environment variables.

## Project Structure

```
eoty-platform/
├── backend/           # Node.js Express API
│   ├── controllers/   # Request handlers
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── middleware/    # Express middleware
│   ├── migrations/    # Database migrations
│   └── seeds/         # Seed data
├── frontend/          # React/Vite frontend
│   ├── src/           # Source code
│   ├── components/    # React components
│   └── pages/         # Page components
└── nginx/             # Nginx configuration
```

## Key Services

### Video Processing
The platform uses Mux for video processing and streaming. Videos uploaded by teachers are automatically processed for adaptive streaming.

### AI Features
- Course content generation
- Student question answering
- Content summarization
- Language translation

### Authentication
- JWT-based authentication
- Role-based access control (RBAC)
- Google OAuth integration

## Performance Optimization

- Database connection pooling
- Caching with Redis
- CDN for static assets
- Video streaming optimization with Mux

## Monitoring and Maintenance

- Health check endpoints
- Logging and error tracking
- Database backup strategies
- Performance monitoring

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check frontend URL configuration in backend CORS settings
2. **Video Upload Failures**: Verify Mux credentials and webhook configuration
3. **Database Connection Issues**: Check database credentials and network connectivity
4. **Slow Loading**: Review database queries and implement indexing

### Debugging

Enable debug logging by setting `DEBUG=*` environment variable.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests if applicable
5. Submit a pull request

## License

MIT License

## Support

For support, please open an issue on the GitHub repository or contact the development team.