# Sky Nether Café Management System

A modern, cloud-based SaaS café management system with real-time synchronization, offline capabilities, and multi-tenant architecture.

## Architecture

This is a monorepo built with Turbo for managing multiple packages:

### Packages
- **`packages/backend`**: NestJS API with PostgreSQL, Redis, and real-time WebSocket support
- **`packages/web`**: Next.js web application with responsive design
- **`packages/mobile`**: React Native mobile application with Expo
- **`packages/shared`**: Shared TypeScript types, utilities, and business logic

### Key Features
- Multi-tenant architecture with isolated data per café
- Real-time synchronization across devices
- Offline mode with automatic sync
- Role-based access control (Owner, Manager, Cashier, Waiter, Chef)
- Complete café management workflows

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose (for local development)

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Start development environment:
   ```bash
   pnpm dev
   ```

## Development

### Available Scripts

- `pnpm dev` - Start all packages in development mode
- `pnpm build` - Build all packages
- `pnpm test` - Run tests for all packages
- `pnpm lint` - Run ESLint for all packages
- `pnpm type-check` - Run TypeScript type checking
- `pnpm format` - Format code with Prettier

### Docker Development

The project includes Docker Compose configuration for local development with:
- PostgreSQL database
- Redis for caching and sessions
- Optional services (mailhog, minio)

Start the development stack:
```bash
docker-compose up -d
```

## Project Structure

```
sky-nether-cafe-management/
├── packages/
│   ├── backend/          # NestJS API
│   ├── web/             # Next.js web app
│   ├── mobile/          # React Native app
│   └── shared/          # Shared code
├── docker-compose.yml   # Development services
├── package.json         # Monorepo root
└── turbo.json          # Turbo build system
```

## Technology Stack

### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: NestJS
- **Database**: PostgreSQL with Row-Level Security
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Authentication**: JWT with refresh tokens

### Frontend
- **Web**: Next.js 14+, React, TypeScript, Tailwind CSS
- **Mobile**: React Native with Expo
- **State Management**: Zustand
- **Offline Storage**: IndexedDB (web), SQLite (mobile)
- **UI Components**: Custom design system

### DevOps
- **Package Manager**: pnpm
- **Build System**: Turbo
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Code Quality**: ESLint, Prettier, Husky

## Development Guidelines

### Code Style
- Use TypeScript with strict mode enabled
- Follow ESLint and Prettier configurations
- Write comprehensive tests (unit + property-based)
- Use meaningful commit messages

### Testing
- Unit tests for specific examples and edge cases
- Property-based tests for universal correctness properties
- Integration tests for API endpoints
- E2E tests for critical user journeys

### Git Workflow
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Run tests and linting before pushing
4. Create pull request for review
5. Merge after approval and CI passing

## License

MIT