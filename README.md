# 🚀 MCP Servers Collection

Una colección completa de servidores MCP (Model Context Protocol) para extender las capacidades de Claude con servicios especializados.

## 📦 MCPs Disponibles

### 🐘 [PostgreSQL MCP](./mcp-postgresql/)

Servidor MCP completo para gestión de bases de datos PostgreSQL.

**Características:**

- Conexión y gestión de bases de datos
- Creación y manipulación de tablas
- Consultas SQL seguras con parámetros
- Operaciones CRUD completas
- Información del sistema de base de datos

**Herramientas:** `connect_database`, `execute_query`, `create_table`, `insert_data`, `update_data`, `delete_data`, `list_tables`, `describe_table`, `drop_table`, `get_database_info`, `disconnect_database`

### 🐳 [Docker MCP](./mcp-docker/)

Servidor MCP para gestión completa de Docker y contenedores.

**Características:**

- Gestión de contenedores (crear, iniciar, detener, eliminar)
- Manejo de imágenes Docker
- Ejecución de comandos en contenedores
- Logs y monitoreo
- Gestión de volúmenes y redes

**Herramientas:** `docker_version`, `docker_info`, `list_containers`, `create_container`, `start_container`, `stop_container`, `remove_container`, `container_logs`, `execute_in_container`, `list_images`, `pull_image`, `remove_image`, `list_volumes`, `create_volume`, `list_networks`, `docker_prune`

### 🧠 [Memory MCP](./mcp-memory/)

Sistema de memoria persistente para Claude con capacidades avanzadas de búsqueda.

**Características:**

- Almacenamiento persistente de memoria
- Búsqueda semántica inteligente
- Categorización con tags
- Contexto por proyecto
- Limpieza automática de memorias antiguas

**Herramientas:** `store_memory`, `search_memories`, `get_recent_memories`, `delete_memory`, `list_memory_tags`, `cleanup_old_memories`

### 🌐 [API Tester MCP](./mcp-api-tester/)

Herramientas completas para testing y desarrollo de APIs.

**Características:**

- Envío de peticiones HTTP completas
- Soporte para autenticación (Bearer, Basic, API Key)
- Guardado y carga de configuraciones
- Testing de salud de endpoints
- Validación de respuestas JSON

**Herramientas:** `send_http_request`, `save_request`, `load_request`, `list_saved_requests`, `test_endpoint_health`, `validate_json_response`

### 🎭 [Playwright MCP](./mcp-playwright/)

Automatización web y testing E2E con Playwright.

**Características:**

- Multi-navegador (Chromium, Firefox, WebKit)
- Automatización web completa
- Capturas de pantalla y videos
- Testing E2E automatizado
- Soporte para dispositivos móviles

**Herramientas:** `playwright_open`, `playwright_click`, `playwright_fill`, `playwright_screenshot`, `playwright_text`, `playwright_close_browser`

## 🛠️ Instalación Global

### Prerrequisitos

- Node.js 16 o superior
- npm o yarn
- Git

### Clonar el repositorio

```bash
git clone <tu-repositorio>
cd mcps
```

### Instalar dependencias en todos los MCPs

```bash
# PostgreSQL MCP
cd mcp-postgresql && npm install && cd ..

# Docker MCP
cd mcp-docker && npm install && cd ..

# Memory MCP
cd mcp-memory && npm install && cd ..

# API Tester MCP
cd mcp-api-tester && npm install && cd ..

# Playwright MCP (incluye instalación de navegadores)
cd mcp-playwright && npm install && npx playwright install && cd ..
```

## ⚙️ Configuración en Claude Desktop

Agrega esta configuración completa a tu archivo de configuración de Claude Desktop:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "postgresql": {
      "command": "node",
      "args": ["C:\\ruta\\completa\\a\\mcps\\mcp-postgresql\\server.js"]
    },
    "docker": {
      "command": "node",
      "args": ["C:\\ruta\\completa\\a\\mcps\\mcp-docker\\server.js"]
    },
    "memory": {
      "command": "node",
      "args": ["C:\\ruta\\completa\\a\\mcps\\mcp-memory\\server.js"]
    },
    "api-tester": {
      "command": "node",
      "args": ["C:\\ruta\\completa\\a\\mcps\\mcp-api-tester\\server.js"]
    },
    "playwright": {
      "command": "node",
      "args": ["C:\\ruta\\completa\\a\\mcps\\mcp-playwright\\server.js"]
    }
  }
}
```

**Nota:** Reemplaza `C:\\ruta\\completa\\a\\mcps` con la ruta real donde clonaste el repositorio.

## 🎯 Casos de Uso Combinados

### 🔄 Automatización de Testing Completo

```
1. Usar API Tester para verificar endpoints
2. Usar Playwright para tests E2E del frontend
3. Usar PostgreSQL para verificar datos en base de datos
4. Usar Memory para recordar configuraciones de testing
5. Usar Docker para gestionar entornos de testing
```

### 📊 Desarrollo Full-Stack

```
1. PostgreSQL para gestión de base de datos
2. Docker para contenedorización de servicios
3. API Tester para desarrollo de APIs
4. Playwright para testing de UI
5. Memory para documentar decisiones técnicas
```

### 🚀 DevOps y Deployment

```
1. Docker para gestión de contenedores
2. PostgreSQL para bases de datos de producción
3. API Tester para health checks
4. Memory para documentar procedimientos
5. Playwright para smoke tests post-deployment
```

## 📚 Documentación Detallada

Cada MCP tiene su propia documentación detallada:

- **[PostgreSQL MCP README](./mcp-postgresql/README.md)** - Gestión completa de PostgreSQL
- **[Docker MCP README](./mcp-docker/README.md)** - Automatización de Docker
- **[Memory MCP README](./mcp-memory/README.md)** - Sistema de memoria persistente
- **[API Tester MCP README](./mcp-api-tester/README.md)** - Testing de APIs
- **[Playwright MCP README](./mcp-playwright/README.md)** - Automatización web

## 🔧 Desarrollo y Contribución

### Estructura del Proyecto

```
mcps/
├── mcp-postgresql/     # PostgreSQL MCP Server
├── mcp-docker/         # Docker MCP Server
├── mcp-memory/         # Memory MCP Server
├── mcp-api-tester/     # API Testing MCP Server
├── mcp-playwright/     # Playwright MCP Server
└── README.md           # Este archivo
```

### Agregar un Nuevo MCP

1. Crear un nuevo directorio `mcp-nombre/`
2. Inicializar con `npm init`
3. Instalar `@modelcontextprotocol/sdk`
4. Crear `server.js` con la implementación
5. Agregar `README.md` con documentación
6. Crear `.gitignore` apropiado
7. Actualizar este README principal

### Buenas Prácticas

- Usar TypeScript para mayor seguridad de tipos
- Implementar manejo robusto de errores
- Agregar logging apropiado
- Incluir tests unitarios
- Documentar todas las herramientas
- Seguir convenciones de naming consistentes

## 🛡️ Seguridad

- **Validación de entrada**: Todos los MCPs validan parámetros
- **Manejo de secretos**: Usar variables de entorno para credenciales
- **Acceso limitado**: Principio de menor privilegio
- **Logs seguros**: No logear información sensible
- **Actualizaciones**: Mantener dependencias actualizadas

## 🔍 Troubleshooting

### Error: "MCP server not found"

- Verifica que la ruta en la configuración sea correcta
- Asegúrate de que Node.js esté instalado
- Comprueba que las dependencias estén instaladas

### Error: "Permission denied"

- En Windows: Ejecutar Claude Desktop como administrador
- En macOS/Linux: Verificar permisos de archivos
- Comprobar configuración del firewall

### Error: "Port already in use"

- Los MCPs usan stdio, no puertos de red
- Si hay conflictos, verificar otras instancias de Claude

## 📈 Roadmap

### Próximos MCPs Planeados

- **Redis MCP**: Cache y almacenamiento en memoria
- **MongoDB MCP**: Base de datos NoSQL
- **Kubernetes MCP**: Orquestación de contenedores
- **AWS MCP**: Servicios de Amazon Web Services
- **GitHub MCP**: Integración con repositorios

### Mejoras Planificadas

- Dashboard web para monitoring
- Configuración centralizada
- Health checks automatizados
- Métricas de performance
- Tests de integración

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/nuevo-mcp`)
3. Commit tus cambios (`git commit -am 'Agregar nuevo MCP'`)
4. Push a la rama (`git push origin feature/nuevo-mcp`)
5. Crear un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🌟 Reconocimientos

- [Model Context Protocol](https://modelcontextprotocol.io/) por el protocolo base
- [Anthropic](https://www.anthropic.com/) por Claude
- La comunidad open source por las librerías utilizadas

---

¡Ahora tienes un arsenal completo de herramientas MCP para potenciar Claude! 🎉
