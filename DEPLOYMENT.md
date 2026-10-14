# Deployment: Vercel + Render + Neon

The deployment target is a Vercel static frontend, a Render Node/Express API, and a Neon PostgreSQL database. Keep the local PostgreSQL URL in `backend/.env`; never commit `.env` files or database dumps.

## Before creating hosting accounts

1. Install Git for Windows and confirm the project is in a Git repository. This workspace currently has no `.git` directory and Git is not available on PATH, so there is no repository or GitHub login to inspect yet.
2. Create a private GitHub repository and push the project after reviewing the files to be committed. Do not add `backend/.env`, `frontend/.env`, `backups/`, or any database dump.
3. Create a Neon project and copy its direct PostgreSQL connection string. Use the same direct URL for Prisma migrations and the Render API. Keep it private.
4. Install PostgreSQL client tools (`pg_dump` and `pg_restore`) with a major version compatible with the local PostgreSQL server.

## Back up local PostgreSQL

Run from the project root in PowerShell:

```powershell
./backend/scripts/backup-postgres.ps1
```

The script reads `DATABASE_URL` from `backend/.env`, writes a custom-format dump to the ignored `backups/` directory, and does not change the local database. Confirm that the dump exists and has a non-zero size before importing it. Keep another copy outside the workspace if it contains data that must not be lost.

## Import into Neon without changing the local database

Use an empty Neon database and a PowerShell session with the destination connection URL and backup path entered interactively. Restore into Neon, not into the local URL:

```powershell
$secureUrl = Read-Host 'Neon PostgreSQL URL' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
try { $env:NEON_DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$dumpPath = Read-Host 'Path to verified local backup dump'
pg_restore --no-owner --no-acl --exit-on-error --dbname=$env:NEON_DATABASE_URL $dumpPath
Remove-Item Env:\NEON_DATABASE_URL
```

Restore only into a newly created, empty Neon database. Do not add `--clean` or point the command at the local database. Check the restore exit status and compare table row counts before deploying. If the Neon database is intentionally empty instead of importing local data, deploy the schema with `npx prisma migrate deploy` and follow the app's existing seed/import workflow as appropriate.

## Render API

`render.yaml` defines the free Node web service. Connect the GitHub repository in Render and use the Blueprint flow to create the service. Its build generates Prisma Client and compiles TypeScript. Its start command runs committed migrations before starting Express.

Set these Render environment values:

- `DATABASE_URL`: Neon direct PostgreSQL URL with `sslmode=require`.
- `CLIENT_URL`: the exact production Vercel origin, such as `https://<project>.vercel.app`.
- `JWT_SECRET`: generate a long random secret if Render did not generate it automatically.
- `NODE_ENV=production`, `JWT_EXPIRES_IN=7d`, `UPLOAD_DIR=./uploads`.

The health endpoint is `/health`. Verify it returns JSON with `data.status` equal to `ok` before connecting the frontend.

## Vercel frontend

Create a Vercel project from the same repository with Root Directory `frontend`, framework preset `Vite`, Build Command `npm run build`, and Output Directory `dist`. Set `VITE_API_URL` to `https://<render-service>.onrender.com/api`, then deploy. `frontend/vercel.json` provides SPA route fallback for deep links.

After Vercel provides its production origin, set that exact origin as Render's `CLIENT_URL` and redeploy the API. Open the public site and verify the browser's Network panel shows successful API requests; also open the API health URL directly.

## Rp0 plan limits to account for

- Render Free web services can sleep after 15 minutes without inbound traffic and need time to wake. Their filesystem is ephemeral, so files uploaded by the Media module are not durable across restarts/redeploys. Article images are stored in PostgreSQL. Do not rely on Render's local `uploads/` for persistent media.
- Neon and Vercel usage limits can change. Check the current free plan limits before creating services; no paid upgrade or billing method is required by this configuration.
- Render free services can be suspended at included usage limits. Vercel Hobby is intended for personal projects and has usage caps.

## Manual prerequisites for live deployment

The workspace currently has no Git repository, no Git/GitHub/Vercel/Render CLI available, no PostgreSQL client tools, and no hosting credentials connected to this session. Create/connect those accounts, create the Neon database, and provide the private repository/service access before live deployment and online verification can continue. Never paste secrets into chat or commit them; set secrets in the hosting dashboards.
