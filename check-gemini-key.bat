@echo off
echo ========================================
echo Verificacion de API Key de Gemini
echo ========================================
echo.

if exist .env.local (
    echo [OK] Archivo .env.local encontrado
    echo.
    echo Buscando NEXT_PUBLIC_GEMINI_API_KEY...
    findstr /C:"NEXT_PUBLIC_GEMINI_API_KEY" .env.local >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Variable NEXT_PUBLIC_GEMINI_API_KEY configurada
        echo.
        echo Valor (primeros 20 caracteres):
        for /f "tokens=2 delims==" %%a in ('findstr /C:"NEXT_PUBLIC_GEMINI_API_KEY" .env.local') do (
            set "key=%%a"
        )
        echo %key:~0,20%...
    ) else (
        echo [ERROR] Variable NEXT_PUBLIC_GEMINI_API_KEY NO encontrada
        echo.
        echo Por favor agrega esta linea a .env.local:
        echo NEXT_PUBLIC_GEMINI_API_KEY=tu_api_key_aqui
        echo.
        echo Obtener API key gratis en:
        echo https://makersuite.google.com/app/apikey
    )
) else (
    echo [ERROR] Archivo .env.local NO encontrado
    echo.
    echo Crea el archivo .env.local con:
    echo NEXT_PUBLIC_GEMINI_API_KEY=tu_api_key_aqui
    echo.
    echo Obtener API key gratis en:
    echo https://makersuite.google.com/app/apikey
)

echo.
echo ========================================
pause
