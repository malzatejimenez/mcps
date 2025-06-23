# MCPs Collection - Optimizado

Una colección optimizada de servidores MCP (Model Context Protocol) especializados para diferentes herramientas de desarrollo. Cada MCP ha sido optimizado para ofrecer máxima funcionalidad con mínima complejidad.

## 🎯 MCPs Disponibles

### 🐳 [Docker MCP](./mcp-docker/) - **OPTIMIZADO**

**12 herramientas** (antes 16) para gestión completa de contenedores Docker

- Información del sistema unificada
- Gestión de contenedores con start/stop/restart combinados
- Administración unificada de volúmenes y redes
- Limpieza del sistema y gestión de imágenes

### 🗄️ [PostgreSQL MCP](./mcp-postgresql/) - **OPTIMIZADO**

**8 herramientas** (antes 10) para control completo de bases de datos PostgreSQL

- Operaciones CRUD unificadas (insert/update/delete)
- Información de tablas centralizada (list/describe)
- Gestión de conexiones y consultas SQL
- Creación y eliminación de tablas

### 🧪 [API Tester MCP](./mcp-api-tester/)

**6 herramientas** para testing completo de APIs REST

- Envío de peticiones HTTP con autenticación
- Guardado y carga de configuraciones de peticiones
- Validación de respuestas JSON con schemas
- Testing de salud de endpoints

### 🧠 [Memory MCP](./mcp-memory/)

**6 herramientas** para gestión persistente de memoria contextual

- Almacenamiento de decisiones y preferencias
- Búsqueda semántica de memorias
- Organización por proyectos y tags
- Limpieza automática de memorias antiguas

### 🎭 [Playwright MCP](./mcp-playwright/) - **OPTIMIZADO**

**9 herramientas** (antes 13) para automatización completa de navegadores web

- Gestión unificada de navegadores (open/close/switch)
- Testing completo con assertions integradas
- Configuración avanzada con mocks y device emulation
- Interacciones inteligentes y capturas de evidencia

## 🚀 Optimizaciones Realizadas

### ✅ Docker MCP: 16 → 12 herramientas (-25%)

- **`docker_system_info`**: Versión + información del sistema combinados
- **`manage_container`**: Start, stop y restart unificados
- **`manage_resources`**: Volúmenes y redes en una herramienta

### ✅ PostgreSQL MCP: 10 → 8 herramientas (-20%)

- **`crud_operations`**: Insert, update y delete unificados
- **`table_info`**: List y describe tablas combinados

### ✅ Playwright MCP: 13 → 9 herramientas (-31%)

- **`playwright_browser`**: Open, close y switch unificados
- **`playwright_test`**: Test runner y assertions combinados
- **`playwright_config`**: Network mocking y device emulation unificados

### 📊 Resultados de la Optimización

- **Reducción total**: 45 → 35 herramientas principales (-22%)
- **Mejor UX**: Menos decisiones para el usuario
- **Funcionalidad completa**: Sin pérdida de características
- **Mejor organización**: Agrupación lógica de operaciones

## 🔧 Instalación Global

Clona el repositorio y configura todos los MCPs:

```bash
git clone <repository-url>
cd mcps

# Instalar dependencias para todos los MCPs
npm install --prefix mcp-docker
npm install --prefix mcp-postgresql
npm install --prefix mcp-api-tester
npm install --prefix mcp-memory
npm install --prefix mcp-playwright
```

## ⚙️ Configuración en Claude Desktop

Añade esta configuración a tu archivo de Claude Desktop:

```json
{
  "mcpServers": {
    "docker": {
      "command": "node",
      "args": ["./mcps/mcp-docker/server.js"],
      "env": {}
    },
    "postgresql": {
      "command": "node",
      "args": ["./mcps/mcp-postgresql/server.js"],
      "env": {}
    },
    "api-tester": {
      "command": "node",
      "args": ["./mcps/mcp-api-tester/server.js"],
      "env": {}
    },
    "memory": {
      "command": "node",
      "args": ["./mcps/mcp-memory/server.js"],
      "env": {}
    },
    "playwright": {
      "command": "node",
      "args": ["./mcps/mcp-playwright/server.js"],
      "env": {}
    }
  }
}
```

## 🎯 Casos de Uso Principales

### 🔄 Desarrollo Full-Stack

```bash
# 1. Configurar entorno con Docker
docker_system_info → create_container → manage_container

# 2. Configurar base de datos
connect_database → create_table → crud_operations

# 3. Probar APIs
send_http_request → validate_json_response

# 4. Testing web automatizado
playwright_browser → playwright_test → playwright_screenshot

# 5. Guardar decisiones
store_memory → search_memories
```

### 🧪 Testing y QA

```bash
# 1. Testing de APIs
test_endpoint_health → send_http_request → save_request

# 2. Testing de UI (Playwright)
playwright_browser → playwright_test → playwright_config

# 3. Validar base de datos
execute_query → table_info
```

### 📊 DevOps y Monitoreo

```bash
# 1. Gestionar contenedores
list_containers → container_logs → docker_prune

# 2. Monitorear base de datos
get_database_info → execute_query

# 3. Documentar problemas
store_memory (tipo: "solution")
```

## 🛡️ Características de Seguridad

- **Validación de entrada**: Todos los parámetros son validados
- **Consultas parametrizadas**: Prevención de inyección SQL
- **Gestión de errores**: Manejo robusto de fallos
- **Timeouts configurables**: Prevención de operaciones colgadas
- **Logs estructurados**: Trazabilidad completa

## 📚 Documentación Detallada

Cada MCP incluye documentación completa con:

- ✅ Guía de instalación y configuración
- ✅ Ejemplos de uso prácticos
- ✅ Esquemas de parámetros detallados
- ✅ Casos de uso recomendados
- ✅ Solución de problemas

## 🔄 Actualizaciones y Mantenimiento

Los MCPs se actualizan de forma independiente:

```bash
# Actualizar un MCP específico
cd mcp-docker && npm update

# Verificar versiones
node server.js --version
```

## 🤝 Contribuciones

Para contribuir:

1. Fork el repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -am 'feat: nueva funcionalidad'`
4. Push rama: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

## 📄 Licencia

MIT - Ver [LICENSE](LICENSE) para más detalles.

## 🔗 Enlaces Útiles

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
