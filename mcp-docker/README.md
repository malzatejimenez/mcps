# Docker MCP Server - Optimizado

Un servidor MCP (Model Context Protocol) optimizado que proporciona control completo de contenedores Docker con una interfaz simplificada de 12 herramientas esenciales.

## Instalación

```bash
npm install
```

## Características

- **Control completo de contenedores**: Crear, administrar, ver logs y ejecutar comandos
- **Gestión de imágenes**: Listar, descargar y eliminar imágenes
- **Administración de recursos**: Gestionar volúmenes y redes de forma unificada
- **Información del sistema**: Obtener información completa del sistema Docker
- **Limpieza automática**: Herramientas de limpieza con diferentes niveles
- **Interfaz optimizada**: Solo 12 tools esenciales vs 16 originales

## Herramientas Disponibles

### 🔧 Información del Sistema

- **`docker_system_info`**: Información completa del sistema Docker (versión + detalles del sistema)

### 📦 Gestión de Contenedores

- **`list_containers`**: Listar contenedores (ejecutándose o todos)
- **`create_container`**: Crear y ejecutar nuevos contenedores
- **`manage_container`**: Iniciar, detener o reiniciar contenedores
- **`remove_container`**: Eliminar contenedores
- **`container_logs`**: Obtener logs de contenedores
- **`execute_in_container`**: Ejecutar comandos dentro de contenedores

### 🖼️ Gestión de Imágenes

- **`list_images`**: Listar imágenes disponibles
- **`pull_image`**: Descargar imágenes desde registros
- **`remove_image`**: Eliminar imágenes

### 🔗 Gestión de Recursos

- **`manage_resources`**: Gestión unificada de volúmenes y redes

### 🧹 Limpieza

- **`docker_prune`**: Eliminar objetos Docker no utilizados

## Uso

### Configuración en Cursor/Claude Desktop

Añade esto a tu configuración MCP:

```json
{
  "mcpServers": {
    "docker": {
      "command": "node",
      "args": ["path/to/mcp-docker/server.js"],
      "env": {}
    }
  }
}
```

### Ejemplos de Uso

#### Información del Sistema

```typescript
// Obtener información completa del sistema
await docker_system_info({ detailed: true });

// Solo información básica
await docker_system_info({ detailed: false });
```

#### Gestión de Contenedores

```typescript
// Crear y ejecutar un contenedor web
await create_container({
  image: "nginx:latest",
  name: "mi-web",
  ports: ["8080:80"],
  environment: ["ENV=production"],
  detached: true,
});

// Gestionar contenedores
await manage_container({
  container: "mi-web",
  action: "stop",
  timeout: 10,
});

await manage_container({
  container: "mi-web",
  action: "start",
});

await manage_container({
  container: "mi-web",
  action: "restart",
});
```

#### Gestión de Recursos

```typescript
// Listar volúmenes
await manage_resources({
  resource_type: "volumes",
  action: "list",
});

// Crear un nuevo volumen
await manage_resources({
  resource_type: "volumes",
  action: "create",
  name: "mi-volumen",
});

// Listar redes
await manage_resources({
  resource_type: "networks",
  action: "list",
});

// Crear una nueva red
await manage_resources({
  resource_type: "networks",
  action: "create",
  name: "mi-red",
});
```

#### Limpieza del Sistema

```typescript
// Limpieza completa del sistema
await docker_prune({
  type: "system",
  force: true,
});

// Limpiar solo contenedores
await docker_prune({
  type: "container",
  force: true,
});
```

## Optimizaciones Realizadas

### Antes (16 tools) → Después (12 tools)

#### ✅ Herramientas Combinadas:

- `docker_version` + `docker_info` → **`docker_system_info`**
- `start_container` + `stop_container` → **`manage_container`** (con restart)
- `list_volumes` + `create_volume` + `list_networks` → **`manage_resources`**

#### ✅ Herramientas Mantenidas:

- `list_containers`, `create_container`, `remove_container`
- `container_logs`, `execute_in_container`
- `list_images`, `pull_image`, `remove_image`
- `docker_prune`

#### ✅ Beneficios:

- **Interfaz más simple**: 25% menos herramientas
- **Funcionalidad completa**: Sin pérdida de características
- **Mejor organización**: Agrupación lógica de operaciones relacionadas
- **Menos confusión**: Menos decisiones para el usuario

## Requisitos

- Node.js 14+
- Docker instalado y ejecutándose
- Permisos para ejecutar comandos Docker

## Error Handling

El servidor maneja errores comunes como:

- Docker no instalado o no ejecutándose
- Contenedores/imágenes no encontrados
- Permisos insuficientes
- Timeouts de conexión

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar el servidor
node server.js

# El servidor se ejecuta en modo stdio para MCP
```

## Licencia

MIT
