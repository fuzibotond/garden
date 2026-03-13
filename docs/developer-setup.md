# Developer Environment Setup

This guide explains how developers run the Garden platform locally.

The development environment is completely isolated from QA.

DEV API: http://localhost:80  
QA API: http://localhost:8080 (via port-forward)

DEV database: Docker SQL Server

---

# 1. Install prerequisites

Install:

- Git
- .NET SDK 10
- Docker Desktop
- kubectl
- Visual Studio or VS Code

Verify installation:

git --version  
dotnet --version  
docker version  
kubectl version

---

# 2. Clone repository

git clone <repo>
cd garden
git checkout develop

Explanation:

Developers work on `develop`.

`main` is reserved for QA deployments.

---

# 3. Configure local secrets

Copy the template:

cp .env.template .env.local

Edit `.env.local`.

Example:

Jwt__Key=dev-super-long-secret-key-32-characters-minimum
ConnectionStrings__GardenDb=Server=localhost,1433;Database=GardenDb;User Id=sa;Password=LocalStrongPassword123!;TrustServerCertificate=True

Important:

- `.env.local` **must never be committed**
- Secrets are loaded using **DotNetEnv**

---

# 4. Start local SQL Server

docker compose up -d

This starts SQL Server in Docker.

Database port:

1433

---

# 5. Run the API

dotnet run --urls=http://localhost:80

Open Swagger:

http://localhost:80/swagger

The API will automatically run EF Core migrations on startup.

---

# 6. Development workflow

Create a feature branch:

git checkout develop
git pull
git checkout -b feature/my-feature

Push:

git push origin feature/my-feature

Create Pull Request → `develop`

CI pipeline will run automatically.

---

# 7. Important development notes

JWT keys must be **at least 32 characters**.

Short keys will break token generation.

Example error:

IDX10720: key size must be greater than 256 bits