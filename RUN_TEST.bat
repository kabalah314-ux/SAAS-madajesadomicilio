@echo off
REM Script para ejecutar la prueba de WhatsApp

echo ========================================
echo WhatsApp Integration Test
echo ========================================
echo.

echo Paso 1: Iniciando servidor Next.js en Terminal 1...
echo Ejecuta en otra terminal:
echo   npm run dev
echo.

echo Paso 2: Esperando a que el servidor esté listo...
echo (Asegúrate de que aparezca "Local: http://localhost:3000")
echo.

pause

echo Paso 3: Ejecutando tests de WhatsApp...
npm run test:whatsapp

echo.
echo ========================================
echo Tests completados!
echo.
echo Pasos siguientes:
echo 1. Revisa los logs en la terminal de npm run dev
echo 2. Verifica la BD en Supabase Dashboard
echo 3. Lee PRUEBA_WHATSAPP.md para más detalles
echo ========================================

pause
