# LLM Translate: Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Configuration (Backend & Frontend)](#environment-configuration-backend--frontend)
- [Local Development & Deployment (Docker Compose)](#local-development--deployment-docker-compose)
- [Building Docker Images Manually](#building-docker-images-manually)
- [Cloud Deployment (Docker Based)](#cloud-deployment-docker-based)
  - [General Docker Deployment Principles](#general-docker-deployment-principles)
  - [Heroku](#heroku)
    - [Using `heroku.yml` for Docker Deploys](#using-herokuyml-for-docker-deploys)
    - [Setting Environment Variables](#setting-environment-variables-heroku)
  - [AWS Elastic Beanstalk (Multi-Container Docker)](#aws-elastic-beanstalk-multi-container-docker)
    - [Creating a Multi-Container Docker Environment](#creating-a-multi-container-docker-environment)
    - [Environment Configuration](#environment-configuration-aws)
    - [Deployment Package](#deployment-package-aws)
  - [Google Cloud Run](#google-cloud-run)
    - [Deploying Backend and Frontend Services](#deploying-backend-and-frontend-services)
    - [Setting Environment Variables](#setting-environment-variables-gcr)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)
- [Warning](#warning)

## Prerequisites

Before deploying LLM-Translate, ensure you have:

- Git (for version control and cloud deployments)
- Docker and Docker Compose installed
- Node.js (e.g., >=18.x.x) and npm/yarn (for frontend development/building)
- Python 3.9+ (for backend development/building)
- API keys for at least one of the supported LLM providers (OpenAI, Groq, OpenRouter) for the backend.
- Access credentials for your chosen cloud provider (Heroku, AWS, Google Cloud).

## Environment Configuration (Backend & Frontend)

Both the backend and frontend applications require environment variables for configuration.

**Backend Configuration (`backend/.env`):**

1.  Navigate to the `backend` directory.
2.  Create a `.env` file based on `backend/.env.example`.
3.  Configure your backend environment variables:
    ```plaintext
    # --- AI Service Configuration ---
    AI_SOURCE="openai" # Options: "openai", "groq", "openrouter"

    # --- OpenAI Credentials ---
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    OPENAI_MODEL="gpt-4.1-mini-2025-04-14"

    # --- Groq Credentials ---
    GROQ_API_KEY="YOUR_GROQ_API_KEY"
    GROQ_MODEL="meta-llama/llama-4-maverick-17b-128e-instruct"

    # --- OpenRouter Credentials ---
    OPENROUTER_API_KEY="YOUR_OPENROUTER_API_KEY"
    OPENROUTER_MODEL="qwen/qwen3-4b:free"

    # --- Logging Configuration ---
    LOG_LEVEL="INFO"
    # --- Server Configuration ---
    # Add any other backend-specific variables here
    ```

**Frontend Configuration (`frontend/.env`):**

1.  Navigate to the `frontend` directory.
2.  Create a `.env` file based on `frontend/.env.example`.
3.  Configure your frontend environment variables, particularly the API URL:
    ```plaintext
    VITE_API_URL="http://localhost:8000" # For local Docker Compose setup
    # For cloud deployments, this will be the URL of your deployed backend service.
    # Add any other frontend-specific variables here
    ```

## Local Development & Deployment (Docker Compose)

The recommended way to run the full stack locally is using Docker Compose. The `docker-compose.yml` file in the project root defines the services for the backend and frontend.

1.  **Ensure Docker Desktop is running.**
2.  **Navigate to the project root directory (`llm-translate/`).**
3.  **Set up your `.env` files** in the `backend` and `frontend` directories as described above.
4.  **Build and run the services:**
    ```bash
    docker-compose up --build
    ```
    To run in detached mode:
    ```bash
    docker-compose up --build -d
    ```
    * The backend API will typically be available at `http://localhost:8000`.
    * The frontend application will typically be available at `http://localhost:3000`.

5.  **To stop the services:**
    ```bash
    docker-compose down
    ```

## Building Docker Images Manually

While `docker-compose` handles building, you can also build images manually if needed. Dockerfiles are provided in both `backend/` and `frontend/` directories.

**Build Backend Image:**
Navigate to the `backend/` directory:
```bash
docker build -t llm-translate-backend .
```

**Build Frontend Image:**
Navigate to the `frontend/` directory:
```bash
# Before building the frontend image, ensure VITE_API_URL in frontend/.env
# is set appropriately for the environment you are building for.
# For a static build that will be served by a static server or a container,
# you might need to build the static assets first.
npm install # or yarn install
npm run build # or yarn build

# Then, build the Docker image (assuming your Dockerfile handles serving static files)
docker build -t llm-translate-frontend .
```

## Cloud Deployment (Docker Based)

This section outlines deploying the full-stack application (backend and frontend Docker containers) to various cloud platforms.

### General Docker Deployment Principles

* **Container Registry:** You'll typically need to push your Docker images (backend and frontend) to a container registry (e.g., Docker Hub, AWS ECR, Google GCR, Heroku Container Registry).
* **Environment Variables:** Securely provide environment variables to both backend and frontend containers in your chosen cloud environment.
* **Networking:** Ensure the frontend container can communicate with the backend container. This usually involves configuring the frontend's `VITE_API_URL` to point to the deployed backend service's URL.
* **Port Mapping:** Configure port mappings to expose your frontend (e.g., port 80/443) and backend (if it needs to be directly accessible, though often it's only accessed by the frontend).

### Heroku

Heroku supports Docker deployments using a `heroku.yml` file or by pushing images directly. You'll deploy two separate applications (one for backend, one for frontend) or manage them as separate processes within a single app if using advanced configurations.

#### Using `heroku.yml` for Docker Deploys

1.  **Create `heroku.yml` in your project root:**
    This file defines how Heroku builds and releases your Docker images. You'll likely define two process types, one for the backend and one for the frontend.

    Example `heroku.yml` (conceptual, adapt as needed):
    ```yaml
    build:
      docker:
        backend: backend/Dockerfile
        frontend: frontend/Dockerfile
    release:
      # Optional: define release phase tasks
    run:
      backend_web:
        command:
          - # Your backend start command, e.g., uvicorn main:app --host 0.0.0.0 --port $PORT
        dockerfile: backend/Dockerfile
      frontend_web:
        command:
          - # Your frontend start command, e.g., serve -s build -l $PORT (if frontend Dockerfile serves static build)
        dockerfile: frontend/Dockerfile
    ```
    *Note: Heroku assigns a dynamic `$PORT`. Your Docker containers must listen on this port.*

2.  **Create a Heroku app and set stack to `container`:**
    ```bash
    heroku create your-app-name --stack=container
    heroku apps:info # Note down the web URL for configuring the frontend
    ```

3.  **Push your code to Heroku:**
    ```bash
    git push heroku main
    ```
    Heroku will use `heroku.yml` to build and deploy your services.

#### Setting Environment Variables (Heroku)

Set backend and frontend environment variables via the Heroku Dashboard (Settings > Config Vars) or CLI:
```bash
# For Backend (assuming 'your-app-name' or a specific backend app/process)
heroku config:set AI_SOURCE=openai OPENAI_API_KEY=your_openai_key -a your-app-name
# ... other backend vars

# For Frontend (assuming 'your-app-name' or a specific frontend app/process)
heroku config:set VITE_API_URL=https://your-backend-app-name.herokuapp.com -a your-app-name
# ... other frontend vars
```

### AWS Elastic Beanstalk (Multi-Container Docker)

Elastic Beanstalk supports deploying multi-container Docker applications. You'll need to define your services in a `Dockerrun.aws.json` file.

1.  **Build and Push Images to ECR (Elastic Container Registry):**
    * Create ECR repositories for your backend and frontend images.
    * Tag your images: `your-aws-account-id.dkr.ecr.your-region.amazonaws.com/llm-translate-backend:latest` and `your-aws-account-id.dkr.ecr.your-region.amazonaws.com/llm-translate-frontend:latest`.
    * Push the images to ECR.

2.  **Create `Dockerrun.aws.json` (v2 for multi-container):**
    Place this file in the root of your deployment package.
    ```json
    {
      "AWSEBDockerrunVersion": 2,
      "containerDefinitions": [
        {
          "name": "backend",
          "image": "YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/llm-translate-backend:latest",
          "essential": true,
          "memory": 512, // Adjust as needed
          "portMappings": [
            {
              "hostPort": 8000, // Can be omitted for dynamic assignment by EB
              "containerPort": 8000 // Port your backend Docker container exposes
            }
          ],
          "environment": [
            { "name": "AI_SOURCE", "value": "openai" },
            { "name": "OPENAI_API_KEY", "value": "YOUR_OPENAI_API_KEY" }
            // Add other backend environment variables
          ]
        },
        {
          "name": "frontend",
          "image": "YOUR_AWS_ACCOUNT_ID.dkr.ecr.YOUR_REGION.amazonaws.com/llm-translate-frontend:latest",
          "essential": true,
          "memory": 256, // Adjust as needed
          "portMappings": [
            {
              "hostPort": 80, // EB routes external traffic on port 80 to this
              "containerPort": 3000 // Port your frontend Docker container exposes (e.g., where Vite/serve runs)
            }
          ],
          "environment": [
            // VITE_API_URL will point to the backend service.
            // This can be tricky as the backend URL might not be fixed.
            // Often, you might need to configure a reverse proxy (e.g., Nginx) in the frontend container
            // or use an internal DNS name if EB provides one for inter-service communication.
            // Alternatively, set VITE_API_URL during the frontend build process if the backend URL is known.
            // For a simpler setup, you might expose the backend on a specific path of the same domain
            // via an Application Load Balancer configured by EB.
            { "name": "VITE_API_URL", "value": "http://<backend-internal-dns-or-ip>:8000" } // This needs careful handling
          ],
          "links": ["backend"] // Allows frontend to connect to backend using 'backend' as hostname
        }
      ]
    }
    ```

#### Creating a Multi-Container Docker Environment (AWS)
1.  **Initialize Elastic Beanstalk**:
    ```bash
    eb init -p "Multi-container Docker" llm-translate-app --region your-region
    ```
2.  **Create an environment**:
    ```bash
    eb create llm-translate-env
    ```
#### Environment Configuration (AWS)
Environment variables can be set in the `Dockerrun.aws.json` or via the Elastic Beanstalk console / EB CLI:
```bash
eb setenv AI_SOURCE=openai OPENAI_API_KEY=your_openai_key VITE_API_URL=http://your_backend_url
```

#### Deployment Package (AWS)
Zip your `Dockerrun.aws.json` file (and any other necessary configuration files if not baked into images). Then deploy:
```bash
eb deploy
```

### Google Cloud Run

On Google Cloud Run, you typically deploy containers as separate services. You'll deploy one service for the backend and another for the frontend.

1.  **Build and Push Images to GCR (Google Container Registry) or Artifact Registry:**
    Tag your images: `gcr.io/your-project-id/llm-translate-backend:latest` and `gcr.io/your-project-id/llm-translate-frontend:latest`.
    ```bash
    # For backend (from backend/ directory)
    gcloud builds submit --tag gcr.io/your-project-id/llm-translate-backend

    # For frontend (from frontend/ directory, ensure VITE_API_URL is set for production or handled at runtime)
    gcloud builds submit --tag gcr.io/your-project-id/llm-translate-frontend
    ```

#### Deploying Backend and Frontend Services (GCR)

2.  **Deploy Backend Service:**
    ```bash
    gcloud run deploy llm-translate-backend \
      --image gcr.io/your-project-id/llm-translate-backend \
      --platform managed \
      --region your-region \
      --allow-unauthenticated \ # Or configure authentication as needed
      --set-env-vars AI_SOURCE=openai,OPENAI_API_KEY=your_openai_key,OPENAI_MODEL=gpt-4.1-mini-2025-04-14 # Add other backend vars
      # Add other necessary flags like memory, CPU, port
    ```
    Note the URL of the deployed backend service.

3.  **Deploy Frontend Service:**
    You'll need to pass the backend service URL to the frontend as an environment variable.
    ```bash
    gcloud run deploy llm-translate-frontend \
      --image gcr.io/your-project-id/llm-translate-frontend \
      --platform managed \
      --region your-region \
      --allow-unauthenticated \
      --set-env-vars VITE_API_URL=https://backend-service-url.a.run.app # Replace with your actual backend URL
      # Add other necessary flags like memory, CPU, port (e.g., --port=3000 if your frontend container listens on 3000)
    ```

#### Setting Environment Variables (GCR)
You can set environment variables during deployment using the `--set-env-vars` flag or update them later via the Google Cloud Console or `gcloud` commands.

## Security Considerations

1.  **API Key Protection**:
    * Never commit `.env` files or API keys to version control. Use `.gitignore` appropriately.
    * Use environment variables provided by the cloud platform for sensitive information.
    * Consider using secrets management services (e.g., AWS Secrets Manager, Google Secret Manager, HashiCorp Vault).

2.  **Container Security**:
    * Keep base Docker images updated.
    * Scan your Docker images for vulnerabilities.
    * Run containers with the least privileges necessary.

3.  **Rate Limiting & Input Validation**:
    * Implement rate limiting on your backend API to prevent abuse.
    * Validate and sanitize all inputs on both frontend and backend.
    * Consider maximum text length limits for translation requests.

4.  **Network Security**:
    * Configure firewall rules to restrict traffic to necessary ports.
    * Use HTTPS for all communication. Cloud platforms often provide managed SSL/TLS certificates.

## Troubleshooting

### Common Issues

1.  **API Connection Errors (Backend)**:
    * Verify API keys are correct, not expired, and have necessary permissions.
    * Check network connectivity from the backend container to the LLM provider.
    * Ensure the selected AI model is available in your account/plan.

2.  **Frontend Can't Connect to Backend**:
    * Verify `VITE_API_URL` in the frontend is correctly pointing to the deployed backend URL.
    * Check CORS (Cross-Origin Resource Sharing) configuration on the backend. FastAPI might need `CORSMiddleware` configured to allow requests from your frontend's domain.
    * Ensure backend service is running and healthy. Check backend logs.

3.  **Environment Variables Not Set**:
    * Confirm environment variables are correctly set in your cloud platform's configuration for both frontend and backend services.
    * Check for typos in variable names.
    * Remember to redeploy/restart services after updating environment variables if the platform doesn't do it automatically.

4.  **Docker Issues**:
    * **Local:** Ensure Docker is running. Check `docker ps` to see running containers.
    * **Cloud:** Check container logs on your cloud platform.
    * Verify image names and tags are correct in deployment configurations (`Dockerrun.aws.json`, `heroku.yml`, `gcloud` commands).
    * Ensure containers have access to the internet if they need to pull resources or connect to external services.

### Logs

Access logs through your chosen cloud platform's interface or CLI:
- **Local Docker Compose**: `docker-compose logs backend` or `docker-compose logs frontend`
- **Heroku**: `heroku logs --tail -a your-app-name` (or specify `--ps backend_web` / `--ps frontend_web`)
- **AWS EB**: `eb logs` or via the Elastic Beanstalk console.
- **Google Cloud Run**: View logs in the Google Cloud Console (Logging > Logs Explorer).

For additional help, please open an issue on the GitHub repository.

## Warning

_This guide is AI generated and largely untested. It may require adjustments._