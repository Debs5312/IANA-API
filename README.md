# IANA Language Subtag Registry API

[![Node.js](https://img.shields.io/badge/Node.js-v18-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-blue)](https://expressjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight Node.js/Express API server that provides endpoints to fetch and process the IANA Language Subtag Registry. It supports retrieving the full registry, filtering for language subtags, and integrating with PoolParty for creating, fetching, and deleting language concepts. The API includes security, logging, and error handling for production-ready use.

## Features

- **Fetch Full Registry**: Retrieve the complete IANA Language Subtag Registry data.
- **Language Subtags Only**: Filter and return only language-related subtags with descriptions.
- **Concept Scheme Creation**: Generate a concept scheme from the registry data.
- **Secure & Performant**: Uses Helmet for security headers, compression for responses, and Winston/Morgan for request logging.
- **Error Handling**: Global error catcher with 404 and 500 responses.
- **Environment Config**: Supports `.env` for custom PORT and other vars.
- **Development Tools**: Nodemon for hot-reloading, ESLint for code quality.

## Installation

1. Clone or download the project:
   ```
   git clone <your-repo-url>
   cd iana-api
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root (optional, for custom config):
   ```
   PORT=5500
   # Add other env vars as needed (e.g., for external API keys if extended)
   ```

4. Run ESLint to check code style (optional):
   ```
   npm run lint
   ```

## Usage

- **Development Mode** (with auto-restart on changes):
  ```
  npm run dev
  ```
  Server starts on `http://localhost:5500`.

- **Production Mode**:
  ```
  npm start
  ```
  Server starts on the PORT from `.env` or default 5500.

- **Linting**:
  - Check: `npm run lint`
  - Fix: `npm run lint:fix`

The server logs requests and errors to the console (via Winston). Logs are also written to the `logs/` directory if configured in `config/logger.js`.

## API Endpoints

All endpoints are prefixed with `/api`. Base URL: `http://localhost:5500/api`.

| Method | Endpoint                  | Description                                      | Request Body (if applicable) | Response Example |
|--------|---------------------------|--------------------------------------------------|------------------------------|------------------|
| GET    | `/registry`              | Fetches the full IANA Language Subtag Registry. | - | `[{ "Type": "language", "Subtag": "en", "Description": "English" }, ...]` |
| GET    | `/registry/language`     | Fetches only language subtags with descriptions.| - | `[{ "Subtag": "en", "Description": "English" }, ...]` |
| POST   | `/createConcept`         | Creates language concepts in PoolParty from the registry. | `{ "projectUUID": "string", "parent": "string" }` | `{ "success": true, "data": ["uri1", "uri2", ...] }` |
| GET    | `/concepts`              | Fetches existing concepts from PoolParty. | Query params: `projectUUID`, `scheme` | `{ "success": true, "data": [...] }` |
| DELETE | `/deleteConcept`         | Deletes concepts from PoolParty. | Query params: `projectUUID`, `scheme` | `{ "success": true, "data": [...] }` |

### Examples (using curl)

- Full Registry:
  ```
  curl http://localhost:5500/api/registry
  ```

- Language Subtags:
  ```
  curl http://localhost:5500/api/registry/language
  ```

- Create Concepts (requires PoolParty credentials in .env):
  ```
  curl -X POST http://localhost:5500/api/createConcept \
    -H "Content-Type: application/json" \
    -d '{"projectUUID": "your-project-uuid", "parent": "your-parent-uri"}'
  ```

- Fetch Concepts:
  ```
  curl "http://localhost:5500/api/concepts?projectUUID=your-project-uuid&scheme=your-scheme"
  ```

- Delete Concepts:
  ```
  curl -X DELETE "http://localhost:5500/api/deleteConcept?projectUUID=your-project-uuid&scheme=your-scheme"
  ```

Invalid endpoints return 404: `{ "error": "Endpoint not found" }`. Server errors return 500: `{ "error": "Internal server error" }`.

## Project Structure

```
iana-api/
├── app.js                  # Main Express server setup
├── package.json            # Dependencies and scripts
├── sample-data.txt         # Sample data file (if used)
├── config/
│   └── logger.js           # Winston logger configuration
├── controllers/
│   └── registryController.js # Route handlers with logging and error handling
├── models/
│   └── registryModel.js    # Data fetching and concept scheme creation logic
├── routes/
│   └── registryRoutes.js   # API route definitions
├── utils/
│   └── parseRegistry.js    # Utility functions for parsing registry data
├── logs/                   # Log files (auto-generated)
├── .eslintrc.js            # ESLint configuration
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Dependencies

- **Runtime**:
  - `express`: Web framework.
  - `axios`: HTTP client for fetching IANA data and interacting with PoolParty.
  - `winston`: Advanced logging.
  - `dotenv`: Environment variables.
  - `helmet`: Security headers.
  - `compression`: Gzip compression.
  - `morgan`: HTTP request logger.
  - `cors`: Cross-origin resource sharing.

- **Development**:
  - `nodemon`: Auto-restart server.
  - `eslint`: Code linting with Standard config.

## Logging

Requests are logged with method, path, and IP. Errors are captured globally. Customize in `config/logger.js` (e.g., add file rotation or transports).

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit changes (`git commit -m 'Add amazing feature'`).
4. Push to branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Ensure code passes `npm run lint`. Follow ESLint rules.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. (Create a `LICENSE` file if needed.)

## Contact

For questions, open an issue on GitHub or reach out via email.
