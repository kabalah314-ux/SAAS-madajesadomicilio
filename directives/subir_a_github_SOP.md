# SOP: Subir Proyecto a GitHub

## Objetivo
Automatizar el proceso de inicialización de un repositorio local y su vinculación con un repositorio remoto en GitHub.

## Entradas
- URL del repositorio remoto: `https://github.com/kabalah314-ux/SAAS-Masajesadomicilio.git`
- Rama principal: `main`

## Pasos Logicos
1. **Inicialización**: Ejecutar `git init` en la raíz del proyecto.
2. **Configuración de Ignorados**: Asegurar la existencia de un archivo `.gitignore` que proteja información sensible (`.env`, `logs/`, `.tmp/`, `node_modules/`).
3. **Vinculación**: Añadir el repositorio remoto como `origin`. Si ya existe, actualizarlo.
4. **Preparación**: Ejecutar `git add .` para trackear todos los archivos no ignorados.
5. **Commit**: Realizar un commit con un mensaje descriptivo (ej: "Initial commit").
6. **Despliegue**: Renombrar la rama a `main` y ejecutar `git push -u origin main`.

## Restricciones y Casos Borde
- **Error de Herramientas de Desarrollador (Mac)**: Si aparece el error `xcode-select: error: unable to read data link`, el sistema requiere que el usuario instale o reinicie las CommandLineTools de Xcode. El agente no puede ejecutar `sudo`.
- **Error de Autenticación**: Si el comando `push` falla por permisos, se debe informar al usuario para que verifique sus credenciales de GitHub o proporcione un Token de Acceso Personal (PAT).
- **Repositorio ya Inicializado**: Si ya existe una carpeta `.git`, el script debe manejar la actualización del remote en lugar de fallar.
- **Rama por Defecto**: Asegurarse de usar `main` ya que es el estándar actual de GitHub.

## Salidas
- Confirmación de éxito del push o log de error detallado en `logs/git_upload.log`.
