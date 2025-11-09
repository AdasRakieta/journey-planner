# Contributing to Journey Planner

Thank you for considering contributing to Journey Planner! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+ (or use Docker with `docker-compose up -d postgres`)
- Git

### Development Setup

1. **Fork and clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/journey-planner.git
cd journey-planner
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Set up PostgreSQL**

Option A: Using Docker
```bash
docker-compose up -d postgres
```

Option B: Local PostgreSQL
```bash
sudo -u postgres psql
CREATE DATABASE journey_planner;
CREATE USER journey_user WITH PASSWORD 'journey_password';
GRANT ALL PRIVILEGES ON DATABASE journey_planner TO journey_user;
\q
```

4. **Configure environment variables**
```bash
# Backend
cp server/.env.example server/.env
# Edit server/.env with your database credentials

# Frontend
cp client/.env.example client/.env
```

5. **Run the development server**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:5001`.

## 🏗️ Project Structure

```
journey-planner/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── services/      # API client services
│   │   ├── types/         # TypeScript definitions
│   │   └── utils/         # Utility functions
├── server/           # Express backend
│   ├── src/
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Request handlers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── middleware/    # Custom middleware
└── database/         # Database scripts and migrations
```

## 💻 Development Workflow

### Making Changes

1. **Create a feature branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**
- Write clear, concise commit messages
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

3. **Test your changes**
```bash
# Build both applications
npm run build:all

# Run linters (if configured)
npm run lint
```

4. **Commit your changes**
```bash
git add .
git commit -m "feat: add new feature description"
```

5. **Push and create a pull request**
```bash
git push origin feature/your-feature-name
```

### Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add attraction search functionality
fix: resolve map marker display issue
docs: update deployment instructions
```

## 🎨 Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for type safety
- Use functional components with hooks for React
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### CSS/Styling
- Use Tailwind CSS utility classes
- Follow iOS-inspired design principles
- Maintain consistent spacing and sizing
- Use custom utility classes defined in `index.css`

### Database
- Use Sequelize ORM for database operations
- Write migrations for schema changes
- Always include rollback functionality in migrations
- Index frequently queried columns

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description** - Clear description of the issue
2. **Steps to Reproduce** - Detailed steps to reproduce the bug
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happens
5. **Environment** - OS, Node.js version, browser, etc.
6. **Screenshots** - If applicable

## 💡 Feature Requests

We welcome feature requests! Please:

1. Check if the feature already exists or is planned
2. Clearly describe the feature and its benefits
3. Provide use cases and examples
4. Be open to discussion and feedback

## 🔍 Pull Request Process

1. **Update documentation** - Ensure README and other docs reflect your changes
2. **Add tests** - Include tests for new functionality
3. **Build successfully** - Ensure `npm run build:all` completes without errors
4. **Clear description** - Explain what changes you made and why
5. **Link issues** - Reference related issues in your PR description

### PR Checklist
- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated and passing
- [ ] Build completes successfully

## 🧪 Testing

Currently, the project doesn't have a comprehensive test suite, but contributions to add testing are welcome!

Suggested testing frameworks:
- **Frontend**: Jest, React Testing Library, Vitest
- **Backend**: Jest, Supertest
- **E2E**: Playwright, Cypress

## 📝 Documentation

Good documentation helps everyone. When contributing:

- Update README.md for user-facing changes
- Update API documentation for endpoint changes
- Add inline comments for complex logic
- Update NGINX_SETUP.md for deployment changes

## 🤝 Community

- Be respectful and inclusive
- Help others when you can
- Share your knowledge and experiences
- Provide constructive feedback

## 📜 License

By contributing to Journey Planner, you agree that your contributions will be licensed under the ISC License.

## ❓ Questions?

Feel free to:
- Open an issue for questions
- Check existing issues and discussions
- Reach out to maintainers

Thank you for contributing to Journey Planner! 🗺️✨
