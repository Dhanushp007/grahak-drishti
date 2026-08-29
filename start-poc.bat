@echo off
setlocal EnableExtensions

rem GRAHAK-DRISHTI local hackathon POC launcher.
rem Required tools: Docker Desktop, Python 3.11+, Node.js/npm.

set "ROOT=%~dp0"
set "DATABASE_URL=postgresql+psycopg://grahak:grahak_dev@127.0.0.1:5432/grahak_drishti"
set "CONTACT_HASH_SECRET=local-development-contact-hash-secret"
set "API_ORIGIN=http://127.0.0.1:8000"
set "COMPOSE_FILE=%ROOT%infrastructure\docker-compose.yml"

where python >nul 2>&1
if errorlevel 1 goto :missing_python
where npm >nul 2>&1
if errorlevel 1 goto :missing_npm

pushd "%ROOT%"

call :select_port CITIZEN_PORT 3000 3010 3020
if errorlevel 1 goto :ports_unavailable
call :select_port ADMIN_PORT 3001 3011 3021
if errorlevel 1 goto :ports_unavailable
call :select_port API_PORT 8000 8010 8020
if errorlevel 1 goto :ports_unavailable
set "API_ORIGIN=http://127.0.0.1:%API_PORT%"
if not "%CITIZEN_PORT%"=="3000" echo Port 3000 is busy. Citizen web will use %CITIZEN_PORT%.
if not "%ADMIN_PORT%"=="3001" echo Port 3001 is busy. Government dashboard will use %ADMIN_PORT%.
if not "%API_PORT%"=="8000" echo Port 8000 is busy. API will use %API_PORT%.

where docker >nul 2>&1
if errorlevel 1 (
    set "DATABASE_URL=sqlite:///./demo-poc.db"
    echo Docker was not found. Using local SQLite at demo-poc.db for the POC.
    goto :database_ready
)

echo Starting PostgreSQL...
docker compose -f "%COMPOSE_FILE%" up -d postgres
if errorlevel 1 (
    set "DATABASE_URL=sqlite:///./demo-poc.db"
    echo PostgreSQL could not start. Using local SQLite at demo-poc.db for the POC.
    goto :database_ready
)

for /L %%I in (1,1,30) do (
    docker compose -f "%COMPOSE_FILE%" exec -T postgres pg_isready -U grahak -d grahak_drishti >nul 2>&1
    if not errorlevel 1 goto :postgres_ready
    timeout /t 1 /nobreak >nul
)
echo PostgreSQL did not become ready within 30 seconds.
set "DATABASE_URL=sqlite:///./demo-poc.db"
echo Using local SQLite at demo-poc.db for the POC.
goto :database_ready

:postgres_ready
:database_ready
echo Applying database migrations...
python -m alembic upgrade head
if errorlevel 1 goto :startup_failed

echo Restoring deterministic synthetic demo data...
python -m scripts.seed_demo --reset
if errorlevel 1 goto :startup_failed

if not exist "%ROOT%apps\citizen-web\node_modules" (
    echo Installing citizen web dependencies...
    npm ci --prefix "%ROOT%apps\citizen-web"
    if errorlevel 1 goto :startup_failed
)
if not exist "%ROOT%apps\admin-dashboard\node_modules" (
    echo Installing government dashboard dependencies...
    npm ci --prefix "%ROOT%apps\admin-dashboard"
    if errorlevel 1 goto :startup_failed
)

echo Starting API, worker, citizen web, and government dashboard...
start "GRAHAK API" /D "%ROOT%" cmd /k "python -m uvicorn services.api.app.main:app --host 127.0.0.1 --port %API_PORT%"
start "GRAHAK Complaint Worker" /D "%ROOT%" cmd /k "python -m services.complaint_worker.app.worker --interval 0.1"
start "GRAHAK Citizen Web" /D "%ROOT%apps\citizen-web" cmd /k "npm run dev -- --port %CITIZEN_PORT%"
start "GRAHAK Government Dashboard" /D "%ROOT%apps\admin-dashboard" cmd /k "npm run dev -- --port %ADMIN_PORT%"

popd
echo.
echo GRAHAK-DRISHTI is starting in four new windows.
echo Citizen web:       http://127.0.0.1:%CITIZEN_PORT%
echo Government view:  http://127.0.0.1:%ADMIN_PORT%
echo API health:       http://127.0.0.1:%API_PORT%/health
echo.
echo Keep the four service windows open while using the demo.
exit /b 0

:missing_python
echo Python 3.11 or newer is required and must be available as python.
exit /b 1

:missing_npm
echo Node.js and npm are required and must be available as npm.
exit /b 1

:ports_unavailable
popd
echo No free browser ports were found in the configured local ranges.
exit /b 1

:startup_failed
popd
echo POC startup failed. Review the command output above.
exit /b 1

:select_port
for %%P in (%2 %3 %4) do (
    netstat -ano -p tcp | findstr /r /c:":%%P .*LISTENING" >nul
    if errorlevel 1 (
        set "%1=%%P"
        exit /b 0
    )
)
exit /b 1
