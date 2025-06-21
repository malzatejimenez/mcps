# MCP API Tester Server

Un servidor MCP que funciona como Postman para probar endpoints de API directamente desde n8n y Claude.

## 🛠 Instalación

1. **Crear el proyecto:**

```bash
mkdir mcp-api-tester
cd mcp-api-tester
```

2. **Guardar los archivos:**

   - `server.js` - El código principal del servidor
   - `package.json` - Configuración del proyecto

3. **Instalar dependencias:**

```bash
npm install
```

4. **Ejecutar el servidor:**

```bash
npm start
```

## 🔧 Configuración con Claude Desktop

Edita tu archivo de configuración de Claude Desktop (`~/AppData/Roaming/Claude/claude_desktop_config.json` en Windows o `~/Library/Application Support/Claude/claude_desktop_config.json` en Mac):

```json
{
  "mcpServers": {
    "api-tester": {
      "command": "node",
      "args": ["/ruta/completa/a/tu/proyecto/server.js"]
    }
  }
}
```

## 📡 Funcionalidades Disponibles

### 1. `send_http_request` - Enviar Peticiones HTTP

Envía peticiones HTTP completas con soporte para:

- Todos los métodos HTTP (GET, POST, PUT, DELETE, etc.)
- Headers personalizados
- Autenticación (Bearer, Basic, API Key)
- Cuerpos de petición
- Configuración de timeouts

**Ejemplo:**

```json
{
  "url": "https://jsonplaceholder.typicode.com/posts/1",
  "method": "GET",
  "headers": {
    "Accept": "application/json"
  }
}
```

### 2. `save_request` - Guardar Peticiones

Guarda configuraciones de peticiones para reutilizar:

```json
{
  "name": "obtener_usuario",
  "collection": "api_usuarios",
  "config": {
    "url": "https://api.ejemplo.com/users/1",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer token123"
    }
  }
}
```

### 3. `load_request` - Cargar Peticiones Guardadas

```json
{
  "name": "obtener_usuario",
  "collection": "api_usuarios"
}
```

### 4. `list_saved_requests` - Listar Peticiones Guardadas

```json
{
  "collection": "api_usuarios"
}
```

### 5. `test_endpoint_health` - Verificar Salud del Endpoint

Realiza múltiples peticiones para verificar la disponibilidad:

```json
{
  "url": "https://api.ejemplo.com/health",
  "requests": 10,
  "interval": 500
}
```

### 6. `validate_json_response` - Validar Respuestas JSON

Valida que la respuesta cumpla con un schema específico:

```json
{
  "url": "https://jsonplaceholder.typicode.com/users/1",
  "schema": {
    "type": "object",
    "required": ["id", "name", "email"],
    "properties": {
      "id": { "type": "number" },
      "name": { "type": "string" },
      "email": { "type": "string" }
    }
  }
}
```

## 🎯 Casos de Uso Comunes

### Testing de API REST

1. **Probar endpoints GET:**

```
Usa send_http_request con método GET para obtener datos
```

2. **Enviar datos POST:**

```json
{
  "url": "https://api.ejemplo.com/users",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{\"nombre\": \"Juan\", \"email\": \"juan@ejemplo.com\"}"
}
```

3. **Autenticación con Bearer Token:**

```json
{
  "url": "https://api.ejemplo.com/protected",
  "method": "GET",
  "auth": {
    "type": "bearer",
    "token": "tu_token_aqui"
  }
}
```

### Monitoreo de APIs

1. **Verificar disponibilidad:**

```
Usa test_endpoint_health para comprobar si una API está funcionando
```

2. **Validar estructura de respuestas:**

```
Usa validate_json_response para asegurar que las respuestas mantienen el formato esperado
```

### Gestión de Colecciones

1. **Organizar por proyecto:**

```json
{
  "collection": "proyecto_A"
}
```

2. **Reutilizar configuraciones:**

```
Guarda peticiones comunes y cárgalas cuando las necesites
```

## 🔍 Ejemplo Completo de Flujo

```javascript
// 1. Probar un endpoint
send_http_request({
  url: "https://api.github.com/users/octocat",
  method: "GET",
  headers: {
    Accept: "application/vnd.github.v3+json",
  },
});

// 2. Si funciona, guardarlo para uso futuro
save_request({
  name: "github_user_octocat",
  collection: "github_api",
  config: {
    url: "https://api.github.com/users/octocat",
    method: "GET",
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  },
});

// 3. Verificar salud del endpoint
test_endpoint_health({
  url: "https://api.github.com/users/octocat",
  requests: 5,
  interval: 1000,
});
```

## 🚨 Troubleshooting

### Error: "Cannot find module '@modelcontextprotocol/sdk'"

```bash
npm install @modelcontextprotocol/sdk
```

### Error de permisos al guardar peticiones

El servidor crea una carpeta `mcp-requests` en el directorio actual. Asegúrate de tener permisos de escritura.

### Timeout en peticiones

Ajusta el parámetro `timeout` en milisegundos según tus necesidades.

## 📈 Integración con n8n

Una vez que el MCP server esté ejecutando, podrás usarlo desde n8n para:

- Validar endpoints antes de usarlos en workflows
- Hacer debugging de APIs problemáticas
- Monitorear la salud de servicios externos
- Crear colecciones de pruebas reutilizables

## 🤝 Contribuciones

¡Las mejoras son bienvenidas! Algunas ideas para futuras funcionalidades:

- Soporte para WebSockets
- Generación de documentación OpenAPI
- Integración con bases de datos
- Soporte para archivos multipart
- Métricas avanzadas de rendimiento
