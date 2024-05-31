@echo off
setlocal

:: Function to check if a command exists
:command_exists
where %1 >nul 2>nul
if %errorlevel%==0 (exit /b 1) else (exit /b 0)

:: Install Chocolatey if it's not already installed
call :command_exists choco
if %errorlevel%==0 (
    echo Chocolatey not found. Installing Chocolatey...
    @powershell -NoProfile -ExecutionPolicy Bypass -Command ^
     "Set-ExecutionPolicy Bypass -Scope Process -Force; ^
      [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; ^
      iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
) else (
    echo Chocolatey is already installed.
)

:: Refresh environment variables
refreshenv

:: Install Node.js if it's not already installed
call :command_exists node
if %errorlevel%==0 (
    echo Node.js not found. Installing Node.js...
    choco install nodejs -y
) else (
    echo Node.js is already installed.
)

:: Install 7-Zip if it's not already installed
call :command_exists 7z
if %errorlevel%==0 (
    echo 7-Zip not found. Installing 7-Zip...
    choco install 7zip -y
) else (
    echo 7-Zip is already installed.
)

:: Install MAME if it's not already installed
call :command_exists mame
if %errorlevel%==0 (
    echo MAME not found. Installing MAME...
    choco install mame -y
) else (
    echo MAME is already installed.
)