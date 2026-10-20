# NestJS Raw SQL CRUD POC

CRUD API for `tasks`, built with NestJS + PostgreSQL + `pg`. It deliberately does **not** use Prisma or another ORM.

## Architecture

```text
HTTP Client
   -> TasksController  (route / request-response)
   -> TasksService     (business logic)
   -> TasksRepository  (raw SQL query)
   -> DatabaseService  (PostgreSQL connection pool)
   -> PostgreSQL
```

- **Module** (feature container): groups one feature's parts.
- **Controller** (API entry point): receives HTTP requests.
- **Service** (business logic): decides rules and errors.
- **Repository** (data-access layer): owns SQL statements.
- **DTO - Data Transfer Object** (request shape): validates client input.
- **Connection pool** (reusable DB connections): avoids opening a connection per request.

Spring Boot mapping: `TasksController` ≈ `@RestController`, `TasksService` ≈ `@Service`, `TasksRepository` ≈ a repository that uses `JdbcTemplate`, and `DatabaseService` ≈ a configured `DataSource`.

## Setup

1. Create a PostgreSQL database named `nest_poc`.
2. Copy `.env.example` to `.env`, then change `DATABASE_URL` if your credentials differ.
3. Install packages:

   ```powershell
   npm install
   ```

4. Create the table from raw SQL:

   ```powershell
   npm run db:migrate
   ```

5. Start the API:

   ```powershell
   npm run start:dev
   ```

The API runs at `http://localhost:3000/api`.

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks` | List tasks |
| GET | `/api/tasks/:id` | Read one task |
| PATCH | `/api/tasks/:id` | Update part of a task |
| DELETE | `/api/tasks/:id` | Delete a task |

Create example:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/tasks `
  -ContentType 'application/json' `
  -Body '{"title":"Learn raw SQL","description":"NestJS without Prisma"}'
```

Update example:

```powershell
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/api/tasks/1 `
  -ContentType 'application/json' `
  -Body '{"isCompleted":true}'
```

`TasksRepository` uses `$1`, `$2`, and similar placeholders. Never concatenate client input into SQL strings; parameters protect against SQL injection.
