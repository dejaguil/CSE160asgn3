@echo off
:: Change directory to the folder this script is in
cd /d %~dp0

:: Optional: Set port (change if you want)
set PORT=8000

:: Try Python 3
python -m http.server %PORT%
if %errorlevel% neq 0 (
    :: Try Python 2
    python -m SimpleHTTPServer %PORT%
)

echo.
echo Server started at http://localhost:%PORT%
pause