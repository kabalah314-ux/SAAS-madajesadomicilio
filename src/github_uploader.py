import subprocess
import os
import logging

# Configuración de logging
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

logging.basicConfig(
    filename=os.path.join(log_dir, "git_upload.log"),
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def run_command(command, cwd=None):
    """Ejecuta un comando de shell y devuelve el resultado."""
    try:
        logging.info(f"Ejecutando: {' '.join(command)}")
        result = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True
        )
        logging.info(f"Resultado: {result.stdout}")
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        error_msg = f"Error al ejecutar {' '.join(command)}: {e.stderr}"
        logging.error(error_msg)
        return False, error_msg

def setup_gitignore(project_path):
    """Crea un archivo .gitignore si no existe."""
    gitignore_content = """
.env
logs/
.tmp/
node_modules/
dist/
.DS_Store
"""
    gitignore_path = os.path.join(project_path, ".gitignore")
    if not os.path.exists(gitignore_path):
        with open(gitignore_path, "w") as f:
            f.write(gitignore_content.strip())
        logging.info(".gitignore creado.")
    else:
        logging.info(".gitignore ya existe.")

def main():
    project_path = os.getcwd()
    repo_url = "https://github.com/kabalah314-ux/SAAS-Masajesadomicilio.git"
    
    print("Iniciando proceso de subida a GitHub...")
    
    # 1. Setup .gitignore
    setup_gitignore(project_path)
    
    # 2. Git Init
    if not os.path.exists(os.path.join(project_path, ".git")):
        success, msg = run_command(["git", "init"])
        if not success: return print(f"Fallo en git init: {msg}")
    
    # 3. Add Remote
    # Primero intentamos borrarlo por si ya existe para evitar conflictos
    run_command(["git", "remote", "remove", "origin"])
    success, msg = run_command(["git", "remote", "add", "origin", repo_url])
    if not success: return print(f"Fallo al añadir remote: {msg}")
    
    # 4. Add Files
    success, msg = run_command(["git", "add", "."])
    if not success: return print(f"Fallo en git add: {msg}")
    
    # 5. Commit
    # Verificamos si hay algo que commitear
    success, msg = run_command(["git", "status", "--porcelain"])
    if msg.strip():
        success, msg = run_command(["git", "commit", "-m", "Initial commit from Antigravity"])
        if not success: return print(f"Fallo en git commit: {msg}")
    else:
        print("No hay cambios para commitear.")
    
    # 6. Branch Rename
    run_command(["git", "branch", "-M", "main"])
    
    # 7. Push
    print(f"Subiendo a {repo_url}...")
    success, msg = run_command(["git", "push", "-u", "origin", "main"])
    if success:
        print("¡Proyecto subido con éxito a GitHub!")
    else:
        print(f"Fallo al subir a GitHub. Revisa logs/git_upload.log para más detalles.")
        print("Nota: Es posible que necesites configurar tus credenciales de git (gh auth login).")

if __name__ == "__main__":
    main()
