# Pokémon Backend API

A RESTful backend API for exploring Pokémon data, built with Node.js and Express. This API acts as a proxy layer to the [PokeAPI](https://pokeapi.co/), providing authentication, caching, and enhanced search capabilities.

**Repository**: [https://github.com/leandrocesar002/poke-backend](https://github.com/leandrocesar002/poke-backend)

## 🚀 Technologies

- **Runtime**: Node.js
- **Framework**: Express.js
- **HTTP Client**: Axios
- **Authentication**: JWT (JSON Web Tokens)
- **Caching**: In-memory cache with TTL
- **Testing**: Jest + Supertest

## 🏗️ Architecture

This backend follows a **layered architecture** with clear separation of concerns, making it maintainable, testable, and scalable.

### Architectural Layers

```
┌─────────────────────────────────────────┐
│         Route Layer                     │
│  (Routes, Request Handling)            │
│  - Defines API endpoints               │
│  - Validates request parameters       │
│  - Orchestrates business logic        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Middleware Layer                │
│  (Authentication, Error Handling)       │
│  - JWT token validation                │
│  - Request/response transformation     │
│  - Global error handling               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Service Layer                   │
│  (Business Logic, Data Processing)     │
│  - Caching strategy                    │
│  - Data transformation                 │
│  - External API integration            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         External API Layer              │
│  (PokeAPI Integration)                  │
│  - HTTP requests to PokeAPI            │
│  - Response handling                   │
│  - Error propagation                   │
└─────────────────────────────────────────┘
```

### Key Architectural Decisions

#### 1. Caching Strategy

**Approach**: In-memory cache with Time-To-Live (TTL)

- **Cache Duration**: 5 minutes
- **Cache Keys**: 
  - `all-pokemon`: Complete list of Pokémon names and numbers
  - `pokemon-{name}`: Individual Pokémon details
  - `pokemon-detail-{id}`: Detailed Pokémon information with species data
- **Cache Validation**: Only caches valid data (non-empty arrays/objects)

**Benefits**:
- Reduces external API calls to PokeAPI
- Improves response times
- Reduces rate limiting issues
- Simple implementation without external dependencies

#### 2. Authentication Architecture

**Pattern**: JWT-based stateless authentication

```javascript
// Token generation
const token = jwt.sign(
  { username, loginTime: new Date().toISOString() },
  JWT_SECRET,
  { expiresIn: '24h' }
);

// Middleware validation
authMiddleware: Validates Bearer token on protected routes
```

**Features**:
- Stateless authentication (no session storage)
- Token expiration (24 hours)
- Automatic token validation on protected routes
- Secure credential validation

#### 3. Error Handling Strategy

**Pattern**: Centralized error handler middleware

```javascript
// Handles different error types:
- Axios errors (from PokeAPI)
- JWT errors (invalid/expired tokens)
- Generic server errors
```

**Benefits**:
- Consistent error response format
- Proper HTTP status codes
- Error logging for debugging
- User-friendly error messages

#### 4. API Proxy Pattern

**Design**: Acts as a proxy to PokeAPI with enhancements

- **Data Transformation**: Converts PokeAPI responses to consistent format
- **Search Enhancement**: Adds multi-term search and number-based filtering
- **Error Handling**: Handles PokeAPI errors gracefully
- **Alternate Forms Support**: Handles Mega, Gmax, and other alternate forms

#### 5. Route Organization

**Structure**: Modular route files

- `/routes/auth.js`: Authentication endpoints
- `/routes/pokemon.js`: Pokémon data endpoints
- Each route file is self-contained with its own logic

**Benefits**:
- Easy to maintain and extend
- Clear separation of concerns
- Scalable for adding new features

## 📁 Project Structure

```
src/
├── __tests__/          # Test files
├── middleware/         # Express middleware
│   ├── auth.js         # JWT authentication middleware
│   └── errorHandler.js # Global error handler
├── routes/             # API route handlers
│   ├── auth.js         # Authentication routes
│   └── pokemon.js      # Pokémon data routes
└── index.js            # Application entry point
```

## 🛠️ Installation

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/leandrocesar002/poke-backend.git

# Navigate to the project directory
cd poke-backend

# Install dependencies
npm install

# Start the server (production mode)
npm start

# Start the server (development mode with auto-reload)
npm run dev

# Run tests
npm test
```

### Environment Variables

The application uses the following environment variables (optional):

- `PORT`: Server port (default: 3001)
- `JWT_SECRET`: Secret key for JWT tokens (default: 'pokemon-secret-key-2024')

Create a `.env` file in the root directory:

```env
PORT=3001
JWT_SECRET=your-secret-key-here
```

### Running the Application

```bash
# Development mode (with nodemon for auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001` (or the port specified in `PORT`).

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. All Pokémon endpoints require authentication.

### Default Credentials

- **Username**: `admin`
- **Password**: `admin`

### Authentication Flow

1. **Login**: POST `/api/auth/login` with credentials
2. **Receive Token**: JWT token in response
3. **Use Token**: Include token in `Authorization` header for protected routes
4. **Token Format**: `Bearer {token}`

## 📖 API Endpoints

### Authentication Endpoints

#### POST /api/auth/login

Authenticates user and returns JWT token.

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "username": "admin"
    }
  }
}
```

#### POST /api/auth/verify

Verifies if a JWT token is valid.

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "username": "admin"
    }
  }
}
```

#### POST /api/auth/logout

Logs out user (client should remove token).

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/logout
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Pokémon Endpoints

All Pokémon endpoints require authentication. Include the JWT token in the `Authorization` header:

```
Authorization: Bearer {your-token}
```

#### GET /api/pokemons

Returns a paginated list of Pokémon with search and sort capabilities.

**Query Parameters:**
- `limit` (optional): Number of items per page (default: 20, max: 100)
- `offset` (optional): Offset for pagination (default: 0)
- `search` (optional): Search term(s) - supports multiple terms separated by comma (e.g., "char,pika")
- `sortBy` (optional): Sort field - `name` or `number` (default: `number`)
- `sortOrder` (optional): Sort direction - `asc` or `desc` (default: `asc`)

**Request:**
```bash
curl "http://localhost:3001/api/pokemons?limit=21&offset=0&search=char&sortBy=number&sortOrder=asc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Multiple Search Terms:**
```bash
curl "http://localhost:3001/api/pokemons?search=char,pika,bulba" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 4,
        "name": "charmander",
        "number": 4,
        "image": "https://raw.githubusercontent.com/...",
        "types": ["fire"]
      }
    ],
    "pagination": {
      "total": 10,
      "limit": 21,
      "offset": 0,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### GET /api/pokemons/number/:numbers

Returns Pokémon by number(s). Supports multiple numbers separated by comma.

**Path Parameters:**
- `numbers`: Single number or comma-separated numbers (e.g., `4`, `004`, `1,4,25`)

**Request:**
```bash
# Single number
curl "http://localhost:3001/api/pokemons/number/4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Multiple numbers
curl "http://localhost:3001/api/pokemons/number/1,4,25" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# With zeros (004 finds Pokémon #4)
curl "http://localhost:3001/api/pokemons/number/004" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 4,
        "name": "charmander",
        "number": 4,
        "image": "https://raw.githubusercontent.com/...",
        "types": ["fire"]
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 20,
      "offset": 0,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### GET /api/pokemons/:id

Returns detailed information about a specific Pokémon by ID. Supports both regular Pokémon and alternate forms (Mega, Gmax, etc.).

**Path Parameters:**
- `id`: Pokémon ID (number)

**Request:**
```bash
curl "http://localhost:3001/api/pokemons/4" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Alternate form (e.g., Pikachu Gigantamax)
curl "http://localhost:3001/api/pokemons/10026" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "charmander",
    "number": 4,
    "image": "https://raw.githubusercontent.com/...",
    "images": {
      "front": "https://raw.githubusercontent.com/...",
      "back": "https://raw.githubusercontent.com/...",
      "frontShiny": "https://raw.githubusercontent.com/...",
      "backShiny": "https://raw.githubusercontent.com/...",
      "artwork": "https://raw.githubusercontent.com/..."
    },
    "types": ["fire"],
    "height": 0.6,
    "weight": 8.5,
    "abilities": [
      {
        "name": "blaze",
        "isHidden": false
      }
    ],
    "moves": [
      {
        "name": "scratch",
        "learnMethod": "level-up"
      }
    ],
    "stats": [
      {
        "name": "hp",
        "value": 39
      }
    ],
    "forms": [
      {
        "name": "charmander",
        "isDefault": true
      }
    ],
    "description": "It has a preference for hot things...",
    "genus": "Lizard Pokémon",
    "habitat": "mountain",
    "generation": "generation-i"
  }
}
```

### Health Check

#### GET /api/health

Returns server health status.

**Request:**
```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-05T12:00:00.000Z"
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 🔧 Features

### Search Capabilities

- **Name Search**: Search Pokémon by name (supports partial matches)
- **Multi-term Search**: Search multiple Pokémon at once using comma-separated terms
- **Number Search**: Search by exact Pokémon number (handles zero-padded numbers like "004")

### Sorting

- Sort by name (alphabetical)
- Sort by number (numerical)
- Ascending or descending order

### Caching

- In-memory cache with 5-minute TTL
- Reduces external API calls
- Improves response times

### Alternate Forms Support

- Handles Mega evolutions
- Handles Gigantamax forms
- Handles regional variants
- Automatically falls back to base species data when needed

## 📝 Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes

- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing or invalid token)
- `404`: Not Found (Pokémon not found)
- `500`: Internal Server Error

## 🔒 Security

- JWT-based authentication
- Token expiration (24 hours)
- CORS configured for specific origins
- Input validation on all endpoints
- Secure credential validation

## 📄 License

This project was developed as a technical exercise.

