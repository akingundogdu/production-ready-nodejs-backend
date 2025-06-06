# Production-Ready Node.js TypeScript Backend

A production-ready Node.js backend application built with TypeScript, Express, PostgreSQL, and modern best practices.

## Features

- 🚀 TypeScript support
- 🔐 JWT Authentication
- 📦 PostgreSQL with TypeORM
- 📝 Swagger API Documentation
- 🔍 Comprehensive logging
- 🛡️ Security best practices
- 🧪 Testing setup with Jest
- 🐳 Docker support
- 📊 Error handling
- 🔄 Rate limiting
- 📈 Health checks
- 🎯 Code quality tools (ESLint, Prettier)

## Prerequisites

- Node.js (v20 or later)
- PostgreSQL
- Docker (optional)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file:
   ```bash
   cp env.example .env
   ```
4. Configure your environment variables in `.env`

5. Start the development server:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Docker

Build and run with Docker Compose:

```bash
docker-compose up --build
```

## Project Structure

```
src/
├── api/          # API routes and controllers
├── config/       # Configuration files
├── services/     # Business logic
├── models/       # Data models
├── middleware/   # Custom middleware
├── utils/        # Helper functions
├── types/        # TypeScript type definitions
└── tests/        # Test files
```

## API Documentation

API documentation is available at `/api/v1/docs` when the server is running.

## Testing

Run the test suite:

```bash
npm test
```

Generate coverage report:

```bash
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC 