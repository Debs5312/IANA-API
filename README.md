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

## Prerequisites

Before running this project locally, ensure you have the following installed on your machine:

### Required Software

- **Node.js 18 or higher**: Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version` (should show v18.x.x or higher)
  - npm is included with Node.js: `npm --version` (should show 8.x.x or higher)

- **Git**: For cloning the repository
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify installation: `git --version`

### Optional Tools

- **Docker**: For containerized development
  - Download from [docker.com](https://www.docker.com/)
  - Verify installation: `docker --version`

- **Postman or curl**: For testing API endpoints
  - Postman: Download from [postman.com](https://www.postman.com/)
  - curl: Usually pre-installed on macOS/Linux, download for Windows

### System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: Minimum 4GB, recommended 8GB+
- **Disk Space**: At least 500MB free space
- **Network**: Internet connection for fetching IANA registry data

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd iana-api
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies listed in `package.json`.

### 3. Environment Configuration (Optional)

Create a `.env` file in the root directory for custom configuration:

```bash
# Copy the example file if it exists, or create manually
cp .env.example .env  # if .env.example exists

# Or create .env manually with:
PORT=5500
NODE_ENV=development
# Add other environment variables as needed
```

### 4. Code Quality Check (Optional)

Run ESLint to check code style:

```bash
npm run lint
```

To automatically fix fixable issues:

```bash
npm run lint:fix
```

### 5. Start the Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5500` with hot-reloading enabled.

### 6. Verify Installation

Test the API endpoints:

```bash
# Test the full registry endpoint
curl http://localhost:5500/api/registry

# Test language subtags endpoint
curl http://localhost:5500/api/registry/language
```

You should receive JSON responses with registry data.

### Troubleshooting

- **Port already in use**: Change the PORT in `.env` or kill the process using that port
- **Permission errors**: On Linux/macOS, you might need to use `sudo` for global npm installs (not recommended)
- **Node version issues**: Use nvm (Node Version Manager) to manage multiple Node.js versions
- **npm install fails**: Clear npm cache with `npm cache clean --force` and try again

### Development Workflow

1. Make changes to the code
2. The server auto-restarts with nodemon
3. Test your changes using curl or Postman
4. Run `npm run lint` to check code quality
5. Commit your changes with descriptive messages

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

## AWS Hosting

This API can be hosted on AWS using various services. Here are recommended approaches:

### Option 1: AWS Elastic Beanstalk (Recommended for simplicity)

1. **Prerequisites**:
   - AWS CLI installed and configured
   - EB CLI installed (`pip install awsebcli`)

2. **Deployment Steps**:
   ```bash
   # Initialize Elastic Beanstalk
   eb init iana-api --platform node.js --region us-east-1

   # Create environment
   eb create iana-api-env --sample

   # Deploy
   eb deploy
   ```

3. **Environment Variables**:
   Set environment variables in Elastic Beanstalk console or via CLI:
   ```bash
   eb setenv PORT=8080
   # Add other env vars as needed
   ```

### Option 2: AWS EC2 with Docker

1. **Create EC2 Instance**:
   - Choose Amazon Linux 2 or Ubuntu
   - Security group: Allow inbound traffic on port 80/443 and 22

2. **Docker Deployment**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 5500
   CMD ["npm", "start"]
   ```

3. **Deploy with Docker**:
   ```bash
   # Build and run container
   docker build -t iana-api .
   docker run -d -p 80:5500 --env-file .env iana-api
   ```

### Option 3: AWS Lambda + API Gateway (Serverless)

1. **Using Serverless Framework**:
   ```bash
   npm install -g serverless
   serverless create --template aws-nodejs
   ```

2. **serverless.yml configuration**:
   ```yaml
   service: iana-api
   provider:
     name: aws
     runtime: nodejs18.x
     region: us-east-1
     environment:
       NODE_ENV: production
   functions:
     api:
       handler: app.handler
       events:
         - http:
             path: /{proxy+}
             method: any
   ```

### AWS Services Integration

- **RDS**: For persistent data storage if needed
- **CloudWatch**: For monitoring and logging
- **Route 53**: For custom domain
- **CloudFront**: For CDN and global distribution
- **Certificate Manager**: For SSL/TLS certificates

## Infrastructure Testing Requirements

### Load Testing

1. **Tools**: Apache JMeter, Artillery, k6
2. **Test Scenarios**:
   - Concurrent users: 100-1000
   - Request rate: 10-100 RPS
   - Duration: 5-15 minutes
   - Endpoints to test: `/api/registry`, `/api/registry/language`

3. **Performance Metrics**:
   - Response time < 500ms for 95th percentile
   - Error rate < 1%
   - CPU utilization < 70%
   - Memory usage < 80%

### Security Testing

1. **Vulnerability Scanning**:
   - OWASP ZAP or Nessus for API security
   - Snyk or npm audit for dependency vulnerabilities

2. **Penetration Testing**:
   - Test for common vulnerabilities (SQL injection, XSS, CSRF)
   - API authentication and authorization testing
   - Rate limiting and DDoS protection

3. **Compliance**:
   - GDPR compliance for data handling
   - SOC 2 Type II for security controls

### Infrastructure Monitoring

1. **AWS CloudWatch**:
   - Set up alarms for CPU, memory, disk usage
   - Monitor API Gateway metrics (4xx, 5xx errors)
   - Log aggregation and analysis

2. **Application Monitoring**:
   - APM tools: New Relic, Datadog, or AWS X-Ray
   - Custom metrics for business logic
   - Error tracking and alerting

### CI/CD Pipeline Testing

1. **Automated Testing**:
   - Unit tests: Jest/Mocha
   - Integration tests: Supertest
   - E2E tests: Cypress or Playwright

2. **Infrastructure as Code Testing**:
   - CloudFormation/SAM template validation
   - Terraform plan review
   - Infrastructure cost estimation

3. **Deployment Testing**:
   - Blue-green deployments
   - Canary releases
   - Rollback procedures

### Scalability Testing

1. **Horizontal Scaling**:
   - Auto-scaling group configuration
   - Load balancer health checks
   - Database connection pooling

2. **Database Performance**:
   - Query optimization
   - Connection limits
   - Backup and recovery testing

### Disaster Recovery

1. **Backup Strategy**:
   - Automated backups for critical data
   - Cross-region replication
   - Recovery time objective (RTO) < 4 hours
   - Recovery point objective (RPO) < 1 hour

2. **Failover Testing**:
   - Multi-AZ deployment testing
   - DNS failover scenarios
   - Data consistency validation

## Contact

For questions, open an issue on GitHub or reach out via email.
