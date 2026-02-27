# NestJS Clean Architecture with DDD, CQRS & Event Sourcing

This is an advanced boilerplate project implementing **Domain-Driven Design (DDD)**, **Clean Architecture**, **CQRS (Command Query Responsibility Segregation)**, **Event Sourcing** and PostgreSQL with NestJS. It provides a robust foundation for building scalable and maintainable enterprise-level applications with **proper separation of concerns** and **clean dependency direction**.

If you want more documentation about NestJS, click here [Nest](https://github.com/nestjs/nest)

> **📝 Note:** This version uses **PostgreSQL** with **TypeORM**. If you prefer the **MongoDB** version with **Mongoose**, you can find it at the original repository: [https://github.com/CollatzConjecture/nestjs-clean-architecture](https://github.com/CollatzConjecture/nestjs-clean-architecture)

[A quick introduction to clean architecture](https://www.freecodecamp.org/news/a-quick-introduction-to-clean-architecture-990c014448d2/)

![Clean Architecture](https://cdn-media-1.freecodecamp.org/images/oVVbTLR5gXHgP8Ehlz1qzRm5LLjX9kv2Zri6)

## 🚀 Features

### Core Architecture

- **Clean Architecture**: Enforces strict separation of concerns with proper dependency direction (Infrastructure → Application → Domain).
- **Domain-Driven Design (DDD)**: Pure business logic encapsulated in Domain Services, accessed through Repository Interfaces.
- **CQRS**: Segregates read (Queries) and write (Commands) operations for optimized performance and scalability.
- **Event Sourcing**: Uses an event-driven approach with sagas for orchestrating complex business processes.
- **Repository Pattern**: Clean interfaces defined in Domain layer, implemented in Infrastructure layer.
- **Dependency Inversion**: Domain layer depends only on abstractions, never on concrete implementations.

### Proper Layer Separation

- **Domain Layer**: Pure business logic, domain entities without framework dependencies, repository interfaces
- **Application Layer**: Business orchestration, application services, CQRS coordination, framework-agnostic services
- **API Layer**: HTTP controllers, DTOs, request/response handling, framework-specific HTTP concerns
- **Infrastructure Layer**: Database implementations, external API calls, concrete repository classes, global services

### Security & Authentication

- **JWT Authentication**: Implements secure, token-based authentication with refresh token rotation.
- **Google OAuth2 Integration**: Secure third-party authentication with Google accounts for both web and mobile applications.
- **Apple Sign In**: Native Sign in with Apple support for iOS and Android clients using Apple ID tokens.
- **Web OAuth2**: Traditional OAuth2 flow with CSRF protection using state parameters and browser redirects.
- **Mobile OAuth2**: Direct token exchange for mobile applications using Google ID tokens.
- **JWKS-Based Token Validation**: Uses remote JSON Web Key Sets (JWKS) for signature verification of Google and Apple ID tokens.
- **Role-Based Access Control (RBAC)**: Complete implementation with protected routes and role-based guards.
- **Secure Password Storage**: Hashes passwords using `bcrypt` with salt rounds.
- **Sensitive Data Encryption**: Encrypts sensitive fields (e.g., user emails) at rest in the database using AES-256-CBC.
- **Blind Indexing**: Allows for securely querying encrypted data without decrypting it first.
- **CSRF Protection**: OAuth flows protected against Cross-Site Request Forgery attacks using state parameters.

### Infrastructure & Operations

- **PostgreSQL Integration**: Utilizes TypeORM for structured data modeling with a relational database.
- **Containerized Environment**: Full Docker and Docker Compose setup for development and production.
- **Health Checks**: Provides application health monitoring endpoints via Terminus.
- **Structured Logging**: Advanced logging system with business-context awareness and dependency injection.
- **Application Metrics**: Exposes performance metrics for Prometheus.
- **Data Visualization**: Comes with a pre-configured Grafana dashboard for visualizing metrics.
- **Request Throttling**: Built-in rate limiting to prevent abuse and ensure API stability.

### Testing

- **Unit & Integration Tests**: A suite of tests for domain, application, and infrastructure layers.
- **E2E Tests**: End-to-end tests to ensure API functionality from request to response.
- **High Test Coverage**: Configured to report and maintain high code coverage.
- **Mocking**: Clear patterns for mocking database and service dependencies.

## Getting Started

```bash
git clone https://github.com/CollatzConjecture/nestjs-clean-architecture
cd nestjs-clean-architecture
```

### 📁 Project Structure

The project uses **feature-first inside each layer** while preserving strict Clean Architecture boundaries:

```
src/
├── api/
│   ├── auth/                   # auth controller + auth DTOs + barrel
│   ├── profile/                # profile controller + profile DTOs + barrel
│   ├── hello/                  # hello controller + barrel
│   ├── dto/common/             # shared API response DTOs
│   └── api.module.ts
├── application/
│   ├── auth/                   # auth commands/handlers/events/sagas/guards/service/module
│   ├── profile/                # profile commands/handlers/events/service/module
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   ├── interfaces/
│   ├── middlewere/
│   ├── services/               # cross-feature app services (logger, response, oauth helpers)
│   └── application.module.ts
├── domain/
│   ├── auth/                   # Auth entity + auth repository interface + barrel
│   ├── profile/                # Profile entity + profile repository interface + barrel
│   ├── shared/enums/           # shared pure domain enums (Role)
│   └── services/               # pure domain services
└── infrastructure/
    ├── auth/                   # auth TypeORM entity + auth repository + barrel
    ├── profile/                # profile TypeORM entity + profile repository + barrel
    ├── entities/base/          # shared base entities
    ├── shared/
    │   ├── database/
    │   ├── health/
    │   └── logger/
    └── utils/
```

## 🏗️ Architecture Overview

### Layer Architecture

This project follows a strict 4-layer architecture:

1. **API Layer** (`src/api/`): HTTP controllers, DTOs, and request/response handling
2. **Application Layer** (`src/application/`): Business orchestration, CQRS coordination, and application services
3. **Domain Layer** (`src/domain/`): Pure business logic, entities, and domain services
4. **Infrastructure Layer** (`src/infrastructure/`): Database, external services, and technical implementations

### Module Structure

- **ApiModule**: Aggregates all HTTP controllers and imports ApplicationModule
- **ApplicationModule**: Central orchestrator that imports and exports feature modules
- **AuthModule**: Self-contained authentication feature with all its dependencies
- **ProfileModule**: Self-contained profile management feature with all its dependencies
- **LoggerModule**: Global infrastructure service for application-wide logging

### CQRS Implementation

- **Commands**: Handle write operations (Create, Update, Delete). Located in `src/application/*/command`.
- **Queries**: Handle read operations (Find, Get). Located in `src/application/*/query`.
- **Handlers**: Process commands and queries separately with proper business-context logging.
- **Events**: Publish domain events for side effects and inter-module communication.

### Event-Driven Flow

1. **User Registration**:

   ```
   API Controller → Application Service → Domain Service (validation) →
   RegisterCommand → CreateAuthUser → AuthUserCreated Event →
   RegistrationSaga → CreateProfile → ProfileCreated
   ```

2. **Authentication**:

   ```
   API Controller → Application Service → Domain Service (email validation) →
   LoginCommand → ValidateUser → JWT Token Generation
   ```

3. **Google OAuth Flow (Web)**:

   ```
   /auth/google → Google OAuth → /auth/google/redirect →
   Domain Service (validation) → FindOrCreateUser → JWT Token Generation
   ```

4. **Google OAuth Flow (Mobile - iOS)**:

   ```
   /auth/google/mobile/ios → ID Token Validation →
   Domain Service (validation) → FindOrCreateUser → JWT Token Generation
   ```

5. **Google OAuth Flow (Mobile - Android)**:

   ```
   /auth/google/mobile/android → ID Token Validation →
   Domain Service (validation) → FindOrCreateUser → JWT Token Generation
   ```

6. **Apple Sign In Flow (Mobile)**:

   ```
   /auth/mobile/apple → Apple ID Token Validation via JWKS →
   Domain Service (validation) → FindOrCreateUser → JWT Token Generation
   ```

7. **Error Handling**:
   ```
   ProfileCreationFailed Event → RegistrationSaga →
   DeleteAuthUser (Compensating Transaction)
   ```

### Dependency Injection & Module Boundaries

- **Feature Modules**: Each feature (Auth, Profile) manages its own dependencies
- **Domain Services**: Injected via factories to maintain Clean Architecture principles
- **Repository Pattern**: Interfaces defined in domain, implementations in infrastructure
- **Global Services**: Logger provided globally via `@Global()` decorator

## 📋 Prerequisites

- Node.js 20+
- Docker and Docker Compose
- PostgreSQL (included in Docker Compose)
- Google OAuth2 credentials (for Google login functionality)
- Apple Sign In credentials (for Apple login functionality)

## 🐳 Running with Docker Compose

The project is configured to run seamlessly with Docker. Use the pnpm scripts from `package.json` for convenience.

```bash
# Build and start containers in detached mode for development
$ pnpm run docker:dev

# Build and start containers for production
$ pnpm run docker:prod

# View logs for the API service
$ pnpm run docker:logs

# Stop all running containers
$ pnpm run docker:down

# Restart the development environment
$ pnpm run docker:restart
```

### 🌐 Service Access

- **Application**: http://localhost:4000
- **API Documentation (Swagger)**: http://localhost:4000/api
- **PostgreSQL**: localhost:5432
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

## 📦 Installation

```bash
$ pnpm install
```

## 🚀 Running the Application

```bash
# Development
$ pnpm run start

# Watch mode (recommended for development)
$ pnpm run start:dev

# Production mode
$ pnpm run start:prod

# Debug mode
$ pnpm run start:debug
```

## 🧪 Testing

```bash
# Unit tests
$ pnpm run test

# E2E tests
$ pnpm run test:e2e

# Test coverage
$ pnpm run test:cov

# Watch mode
$ pnpm run test:watch
```

## 🔐 API Endpoints

### Authentication

```http
POST /auth/register         # User registration
POST /auth/login            # User login
POST /auth/logout           # User logout (Protected)
POST /auth/refresh-token    # Token refresh (Protected)
GET  /auth/google           # Initiate Google OAuth login (Web)
GET  /auth/google/oauth2redirect  # Google OAuth callback (Web)
POST /auth/google/mobile/ios     # Google OAuth login for iOS apps
POST /auth/google/mobile/android # Google OAuth login for Android apps
POST /auth/mobile/apple          # Apple Sign In for mobile apps (iOS/Android)
GET  /auth/:id              # Get user by auth ID (Protected)
DELETE /auth/:id            # Delete user by auth ID (Protected)
```

### Profile Management (Protected)

```http
GET  /profile/all         # Get all user profiles (Admin only)
GET  /profile/admins      # Get all admin users (Admin only)
GET  /profile/:id         # Get user profile by ID
POST /profile             # Create a new profile
```

### Health & Monitoring

```http
GET  /hello               # Health check endpoint
GET  /health              # Detailed health check
GET  /metrics             # Prometheus metrics
```

### Example Usage

#### Traditional Registration & Login

```bash
# Register a new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "lastname": "Doe",
    "age": 30,
    "email": "john@example.com",
    "password": "securePassword123"
  }'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

#### Google OAuth Login

##### Web OAuth Flow

```bash
# Initiate Google login (redirects to Google)
curl -X GET http://localhost:4000/auth/google

# The callback is handled automatically after Google authentication
# Returns JWT token upon successful authentication
```

##### Mobile OAuth Flow

**iOS Authentication:**

```bash
# iOS Google login with ID token
curl -X POST http://localhost:4000/auth/google/mobile/ios \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "GOOGLE_ID_TOKEN_FROM_IOS_APP"
  }'

# Returns JWT token upon successful authentication
```

**Android Authentication:**

```bash
# Android Google login with ID token
curl -X POST http://localhost:4000/auth/google/mobile/android \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "GOOGLE_ID_TOKEN_FROM_ANDROID_APP"
  }'

# Returns JWT token upon successful authentication
```

#### Apple Sign In

```bash
# Apple login with ID token
curl -X POST http://localhost:4000/auth/mobile/apple \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "ios",
    "idToken": "APPLE_ID_TOKEN_FROM_CLIENT"
  }'

# Returns JWT token upon successful authentication
```

#### Protected Routes

```bash
# Access protected route
curl -X GET http://localhost:4000/profile/123 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Admin-only route
curl -X GET http://localhost:4000/profile/all \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## 🛠️ Built With

### Core Framework

- **[NestJS](https://nestjs.com/)** - Progressive Node.js framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript

### Architecture & Patterns

- **[@nestjs/cqrs](https://docs.nestjs.com/recipes/cqrs)** - CQRS implementation
- **[@nestjs/event-emitter](https://docs.nestjs.com/techniques/events)** - Event handling

### Authentication & Security

- **[@nestjs/jwt](https://docs.nestjs.com/security/authentication)** - JWT implementation
- **[@nestjs/passport](https://docs.nestjs.com/security/authentication)** - Authentication strategies
- **[@nestjs/throttler](https://docs.nestjs.com/security/rate-limiting)** - Rate limiting
- **[bcrypt](https://www.npmjs.com/package/bcrypt)** - Password hashing
- **[cookie-parser](https://www.npmjs.com/package/cookie-parser)** - Cookie handling for OAuth state

### Database & Storage

- **[TypeORM](https://typeorm.io/)** - PostgreSQL object relational mapping
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database

### Monitoring & Health

- **[@nestjs/terminus](https://docs.nestjs.com/recipes/terminus)** - Health checks
- **[Prometheus](https://prometheus.io/)** - Metrics collection
- **[Grafana](https://grafana.com/)** - Metrics visualization

### Testing

- **[Jest](https://jestjs.io/)** - Testing framework
- **[Supertest](https://www.npmjs.com/package/supertest)** - HTTP assertion library

### Development Tools

- **[Nodemon](https://nodemon.io/)** - Development server
- **[Docker](https://www.docker.com/)** - Containerization

## 🏛️ Domain-Driven Design

### Bounded Contexts

- **Authentication Context**: User login, registration, tokens, OAuth integration
- **Profile Context**: User profile management, personal data

### Aggregates

- **UserAggregate**: Manages user lifecycle and events across auth and profile contexts

### Domain Events

- `AuthUserCreatedEvent`: Triggered after successful user creation
- `AuthUserDeletedEvent`: Triggered when user is deleted (compensating action)
- `ProfileCreationFailedEvent`: Triggered when profile creation fails

### Sagas

- **RegistrationSaga**: Orchestrates user registration process
  - Handles profile creation after auth user creation
  - Implements compensating transactions for failures
  - Supports both traditional and OAuth registration flows

## 📈 Monitoring & Observability

### Structured Logging

- **Business-Context Logging**: Logs focus on business events rather than technical execution
- **Dependency Injection**: Logger service is injected throughout the application
- **Consistent Format**: All logs include module, method, and timestamp information
- **Security Audit Trail**: Comprehensive logging of authentication attempts and outcomes

### Health Checks

- Database connectivity
- Memory usage
- Disk space

### Metrics (Prometheus)

- HTTP request duration
- Request count by endpoint
- Error rates
- Database connection pool
- Authentication success/failure rates

### Dashboards (Grafana)

- Application performance metrics
- Database statistics
- Error tracking
- Response time analysis
- Authentication analytics

## ⚙️ Configuration

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/CollatzConjecture/nestjs-clean-architecture
    cd nestjs-clean-architecture
    ```

2.  **Create an environment file:**

    Create a file named `.env` in the root of the project by copying the example file.

    ```bash
    cp .env.example .env
    ```

3.  **Generate Secrets:**

    Your `.env` file requires several secret keys to run securely. Use the following command to generate a cryptographically strong secret:

    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```

    Run this command for each of the following variables in your `.env` file and paste the result:

    - `JWT_SECRET`
    - `JWT_REFRESH_SECRET`
    - `EMAIL_ENCRYPTION_KEY`
    - `EMAIL_BLIND_INDEX_SECRET`

    **Do not use the same value for different keys.**

4.  **Configure Google OAuth2 (Optional):**

    To enable Google login functionality for both web and mobile applications, you'll need to:

    a. Go to the [Google Cloud Console](https://console.cloud.google.com/)

    b. Create a new project or select an existing one

    c. Enable the Google+ API

    d. Create OAuth 2.0 credentials:

    - **Web application type** for web OAuth flow
    - **Android/iOS application type** for mobile OAuth flow (if using native mobile apps)

    e. For web OAuth, add your redirect URI: `http://localhost:4000/auth/google/oauth2redirect`

    f. Add the following to your `.env` file:

    ```env
    # Web OAuth credentials
    GOOGLE_CLIENT_ID=your_google_client_id_here
    GOOGLE_CLIENT_SECRET=your_google_client_secret_here
    GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/oauth2redirect

    # Mobile OAuth credentials (platform-specific)
    GOOGLE_IOS_CLIENT_ID=your_ios_client_id_here
    GOOGLE_ANDROID_CLIENT_ID=your_android_client_id_here
    GOOGLE_MOBILE_CALLBACK_IOS_URL=your_ios_callback_url_here
    GOOGLE_MOBILE_CALLBACK_ANDROID_URL=your_android_callback_url_here
    ```

    **Note for Mobile Apps:**

    - **iOS**: Use Google Sign-In SDK for iOS to obtain ID tokens, then send to `/auth/google/mobile/ios`
    - **Android**: Use Google Sign-In SDK for Android to obtain ID tokens, then send to `/auth/google/mobile/android`
    - The backend validates these ID tokens without requiring client secrets
    - Platform-specific client IDs provide additional validation and security

5.  **Configure Apple Sign In (Optional):**

    To enable Sign in with Apple for your mobile applications:

    a. Sign in to the [Apple Developer portal](https://developer.apple.com/account/)

    b. Create an App Identifier that supports Sign in with Apple for each platform bundle ID

    c. Generate a Services ID for web/mobile authentication and enable Sign in with Apple

    d. Create a private key (p8 file) associated with the Sign in with Apple service

    e. Add the following variables to your `.env` file:

    ```env
    APPLE_TEAM_ID=your_apple_team_id
    APPLE_KEY_ID=your_key_id
    APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
    APPLE_IOS_CLIENT_ID=your_ios_service_id
    APPLE_ANDROID_CLIENT_ID=your_android_service_id
    # Optional comma-separated list of additional audience values
    APPLE_IOS_ADDITIONAL_AUDIENCES=
    APPLE_ANDROID_ADDITIONAL_AUDIENCES=
    ```

    f. Provide the corresponding `platform` value (`ios` or `android`) and the Apple ID token from the client when calling `/auth/mobile/apple`.

## 🔒 Security Features

### Authentication Security

- **JWT with Refresh Tokens**: Secure token-based authentication with automatic refresh
- **Password Security**: Bcrypt hashing with configurable salt rounds
- **OAuth2 Security**:
  - **Web**: CSRF protection using state parameters in OAuth flows
  - **Mobile**: Direct ID token validation for mobile applications
  - **JWKS Validation**: All Google and Apple ID tokens are verified against their official JWKS endpoints before trust
- **Apple Sign In**: Supports native Sign in with Apple flows for iOS and Android using platform-specific audiences
- **Rate Limiting**: Configurable throttling on sensitive endpoints

### Data Protection

- **Encryption at Rest**: Sensitive data encrypted using AES-256-CBC
- **Blind Indexing**: Secure querying of encrypted data
- **Input Validation**: Comprehensive DTO validation using class-validator
- **SQL Injection Prevention**: PostgreSQL with TypeORM provides built-in protection
- **Automatic Timestamps**: All models include `createdAt` and `updatedAt` for audit trails

### Access Control

- **Role-Based Authorization**: Complete RBAC implementation with guards
- **Route Protection**: JWT guards on sensitive endpoints
- **Admin Controls**: Separate endpoints for administrative functions

## 👨‍💻 Authors

- **Jerry Lucas** - _Current Maintainer_ - [GitHub](https://github.com/CollatzConjecture)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Edwin Caminero** - Inspiration for this project
- Clean Architecture principles by Robert C. Martin
- Domain-Driven Design concepts by Eric Evans
- CQRS and Event Sourcing patterns
- NestJS framework and community

## 📚 Further Reading

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [NestJS Documentation](https://docs.nestjs.com/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Dependency Inversion Principle](https://blog.cleancoder.com/uncle-bob/2016/01/04/ALittleArchitecture.html)
