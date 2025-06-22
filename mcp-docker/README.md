# Docker MCP Server

Un servidor MCP (Model Context Protocol) completo para Docker que permite gestionar contenedores, imágenes, volúmenes y redes directamente desde Claude Desktop.

## 🚀 Características

- **Gestión de contenedores**: Crear, iniciar, parar, eliminar y monitorear contenedores
- **Gestión de imágenes**: Listar, descargar y eliminar imágenes Docker
- **Gestión de volúmenes**: Crear, listar y gestionar volúmenes persistentes
- **Gestión de redes**: Visualizar redes Docker disponibles
- **Ejecución de comandos**: Ejecutar comandos dentro de contenedores en ejecución
- **Logs y monitoreo**: Acceder a logs de contenedores
- **Limpieza del sistema**: Limpiar recursos Docker no utilizados
- **Integración segura**: Comandos seguros con validación de entrada

## 📦 Instalación

1. **Navegar al directorio del proyecto:**

```bash
cd mcp-docker
```

2. **Instalar dependencias:**

```bash
npm install
```

3. **Verificar que Docker está instalado:**

```bash
docker --version
```

## ⚙️ Configuración en Claude Desktop

Agrega esta configuración a tu archivo de configuración de Claude Desktop:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "docker": {
      "command": "node",
      "args": ["/ruta/completa/a/tu/mcp-docker/server.js"]
    }
  }
}
```

## 🔧 Herramientas Disponibles

### Información del Sistema

- **`docker_version`**: Obtener versión de Docker y información del cliente/servidor
- **`docker_info`**: Mostrar información completa del sistema Docker

### Gestión de Contenedores

- **`list_containers`**: Listar contenedores (activos o todos)
- **`create_container`**: Crear y ejecutar un nuevo contenedor
- **`start_container`**: Iniciar un contenedor detenido
- **`stop_container`**: Detener un contenedor en ejecución
- **`remove_container`**: Eliminar un contenedor
- **`container_logs`**: Ver logs de un contenedor
- **`execute_in_container`**: Ejecutar comandos dentro de un contenedor

### Gestión de Imágenes

- **`list_images`**: Listar todas las imágenes Docker
- **`pull_image`**: Descargar una imagen desde un registro
- **`remove_image`**: Eliminar una o más imágenes

### Gestión de Volúmenes

- **`list_volumes`**: Listar todos los volúmenes Docker
- **`create_volume`**: Crear un nuevo volumen

### Gestión de Redes

- **`list_networks`**: Listar todas las redes Docker

### Limpieza del Sistema

- **`docker_prune`**: Limpiar recursos no utilizados (contenedores, imágenes, volúmenes, redes)

## 📚 Ejemplos de Uso

### 1. Verificar Docker

```
Muéstrame la versión de Docker instalada
```

### 2. Crear un Contenedor Web

```
Crea un contenedor con nginx:
- Imagen: nginx:latest
- Nombre: mi-web-server
- Puerto: 8080:80
- En segundo plano: true
```

### 3. Gestión de Contenedores

```
Lista todos los contenedores (incluyendo los detenidos)
```

```
Detén el contenedor 'mi-web-server'
```

```
Muestra los logs del contenedor 'mi-web-server' (últimas 50 líneas)
```

### 4. Ejecutar Comandos en Contenedores

```
Ejecuta 'ls -la' en el contenedor 'mi-web-server'
```

```
Ejecuta 'cat /etc/nginx/nginx.conf' en el contenedor nginx como usuario root
```

### 5. Gestión de Imágenes

```
Descarga la imagen 'postgres:15'
```

```
Lista todas las imágenes Docker disponibles
```

```
Elimina la imagen 'nginx:latest' (forzar si es necesario)
```

### 6. Gestión de Volúmenes

```
Crea un volumen llamado 'datos-postgres'
```

```
Lista todos los volúmenes Docker
```

### 7. Crear un Contenedor con Base de Datos

```
Crea un contenedor PostgreSQL:
- Imagen: postgres:15
- Nombre: mi-postgres
- Puerto: 5432:5432
- Variables de entorno: ["POSTGRES_PASSWORD=mipassword", "POSTGRES_DB=midb"]
- Volumen: ["datos-postgres:/var/lib/postgresql/data"]
```

### 8. Limpieza del Sistema

```
Limpia todos los recursos Docker no utilizados
```

```
Limpia solo las imágenes no utilizadas
```

## 🛡️ Características de Seguridad

### Validación de Comandos

- Todos los comandos Docker son validados antes de la ejecución
- Timeouts configurables para prevenir comandos que se cuelguen
- Manejo seguro de parámetros y argumentos

### Gestión de Errores

- Captura y reporte detallado de errores Docker
- Mensajes informativos sin exponer información sensible
- Fallback graceful en caso de fallos

## 🔍 Solución de Problemas

### Docker no está corriendo

```
Error: Cannot connect to the Docker daemon
```

**Solución:**

- En Windows: Inicia Docker Desktop
- En Linux: `sudo systemctl start docker`
- En macOS: Inicia Docker Desktop

### Permisos insuficientes

```
Error: permission denied while trying to connect to Docker daemon
```

**Solución (Linux):**

```bash
sudo usermod -aG docker $USER
# Reinicia la sesión o ejecuta:
newgrp docker
```

### Puerto ya en uso

```
Error: port is already allocated
```

**Solución:** Usa un puerto diferente o detén el servicio que está usando el puerto

### Imagen no encontrada

```
Error: Unable to find image
```

**Solución:** Verifica el nombre de la imagen o descárgala primero con `pull_image`

## 🎯 Casos de Uso Avanzados

### Desarrollo Web Local

```
# Crear un stack completo
1. Crear volumen para datos: 'datos-web'
2. Crear contenedor de base de datos: postgres:15
3. Crear contenedor de aplicación: node:18
4. Conectar contenedores con volúmenes compartidos
```

### Pruebas y CI/CD

```
# Ejecutar tests en contenedores
1. Crear contenedor temporal para tests
2. Ejecutar suite de tests
3. Recopilar resultados
4. Limpiar contenedores temporales
```

### Monitoreo y Logs

```
# Monitorear aplicaciones
1. Ver logs en tiempo real de múltiples contenedores
2. Ejecutar comandos de diagnóstico
3. Verificar uso de recursos
```

## 📋 Requisitos del Sistema

- **Docker**: ≥ 20.0.0
- **Node.js**: ≥ 18.0.0
- **Sistema Operativo**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 18.04+)

## 🚦 Estado de las Funcionalidades

### ✅ Implementado

- Gestión básica de contenedores
- Gestión de imágenes
- Gestión de volúmenes
- Logs de contenedores
- Ejecución de comandos
- Limpieza del sistema

### 🔄 Próximas Funcionalidades

- Docker Compose integration
- Construcción de imágenes (build)
- Gestión avanzada de redes
- Métricas y estadísticas en tiempo real
- Backup y restauración de volúmenes

## 🤝 Contribuir

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🔗 Enlaces Útiles

- [Documentación de Docker](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)

## 📞 Soporte

Si encuentras algún problema o tienes preguntas:

1. Verifica que Docker esté corriendo
2. Revisa los logs de Claude Desktop
3. Consulta la sección de solución de problemas
4. Crea un issue con:
   - Versión de Docker
   - Sistema operativo
   - Comando que falló
   - Mensaje de error completo
