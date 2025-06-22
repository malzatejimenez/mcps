# Memory MCP Server

Un servidor MCP (Model Context Protocol) que permite a Claude persistir y recuperar información contextual entre sesiones de chat en Cursor IDE.

## 🧠 Funcionalidades Principales

- **Almacenamiento persistente**: Guarda decisiones del proyecto, preferencias del usuario y soluciones
- **Búsqueda inteligente**: Encuentra memorias relevantes por contenido, etiquetas o proyecto
- **Categorización**: Organiza memorias por tipo (decisiones, preferencias, soluciones, configuraciones, notas)
- **Gestión automática**: Limpieza de memorias antiguas y gestión de relevancia
- **Contexto de proyecto**: Asocia memorias con rutas específicas de proyectos

## 📋 Herramientas Disponibles

### `store_memory`

Almacena una nueva memoria con contenido, etiquetas, tipo y contexto del proyecto.

**Parámetros:**

- `content` (string, requerido): El contenido de la memoria a almacenar
- `tags` (array, opcional): Etiquetas para categorización
- `memory_type` (string, opcional): Tipo de memoria (decision, preference, solution, configuration, note)
- `project_path` (string, opcional): Ruta del proyecto para contexto

**Ejemplo:**

```json
{
  "content": "Usaremos React Query para el manejo de estado de API en este proyecto",
  "tags": ["react", "api", "architecture"],
  "memory_type": "decision",
  "project_path": "/proyecto/frontend"
}
```

### `search_memories`

Busca memorias relevantes basadas en consulta, etiquetas o proyecto.

**Parámetros:**

- `query` (string, opcional): Consulta de búsqueda para coincidencia de contenido
- `tags` (array, opcional): Filtrar por etiquetas específicas
- `project_path` (string, opcional): Filtrar por ruta de proyecto
- `limit` (number, opcional): Número máximo de resultados (por defecto: 10)

### `get_recent_memories`

Obtiene las memorias más recientes para un proyecto o globalmente.

**Parámetros:**

- `project_path` (string, opcional): Ruta del proyecto para filtrar
- `limit` (number, opcional): Número máximo de resultados (por defecto: 20)

### `delete_memory`

Elimina una memoria específica por ID.

**Parámetros:**

- `memory_id` (number, requerido): ID de la memoria a eliminar

### `list_memory_tags`

Lista todas las etiquetas disponibles, opcionalmente filtradas por proyecto.

**Parámetros:**

- `project_path` (string, opcional): Ruta del proyecto para filtrar

### `cleanup_old_memories`

Elimina memorias antiguas o expiradas.

**Parámetros:**

- `days_threshold` (number, opcional): Eliminar memorias anteriores a estos días (por defecto: 365)

## 🚀 Instalación y Configuración

### Prerequisitos

- Node.js 18.0.0 o superior
- npm o yarn

### Instalación

1. **Instalar dependencias:**

```bash
cd mcp-memory
npm install
```

2. **Configurar Claude Desktop:**

Edita tu archivo de configuración de Claude Desktop:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

Agrega la configuración del Memory MCP:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["C:\\ruta\\completa\\a\\mcps\\mcp-memory\\server.js"],
      "env": {}
    }
  }
}
```

### Configuración de Base de Datos

El servidor automáticamente crea una base de datos SQLite (`memory.db`) en el directorio de trabajo. La base de datos incluye:

**Tabla `memories`:**

- `id`: Identificador único (INTEGER, PRIMARY KEY)
- `content`: Contenido de la memoria (TEXT, NOT NULL)
- `tags`: Etiquetas en formato JSON (TEXT, NOT NULL)
- `memory_type`: Tipo de memoria (TEXT, NOT NULL)
- `project_path`: Ruta del proyecto (TEXT, NOT NULL)
- `relevance_score`: Puntuación de relevancia (REAL, DEFAULT 1.0)
- `usage_count`: Contador de uso (INTEGER, DEFAULT 0)
- `created_at`: Fecha de creación (DATETIME, DEFAULT CURRENT_TIMESTAMP)
- `last_accessed`: Última vez accedido (DATETIME, DEFAULT CURRENT_TIMESTAMP)
- `expires_at`: Fecha de expiración (DATETIME, nullable)

## 💡 Ejemplos de Uso

### Almacenar una Decisión de Arquitectura

```typescript
store_memory(
  "Decidimos usar TypeScript para todo el frontend y backend para mantener consistencia de tipos",
  ["typescript", "architecture", "decision"],
  "decision",
  "/mi-proyecto"
);
```

### Guardar una Preferencia del Usuario

```typescript
store_memory(
  "El usuario prefiere usar tabs en lugar de espacios para indentación",
  ["coding-style", "preferences"],
  "preference",
  "/mi-proyecto"
);
```

### Buscar Memorias Relacionadas con API

```typescript
search_memories("API authentication", ["api", "auth"], "/mi-proyecto", 5);
```

### Obtener Memorias Recientes del Proyecto

```typescript
get_recent_memories("/mi-proyecto", 10);
```

## 🔧 Tipos de Memoria

### `decision`

Para decisiones importantes del proyecto como arquitectura, tecnologías, patrones de diseño.

**Ejemplo:** "Usaremos Redux Toolkit para el manejo de estado global"

### `preference`

Para preferencias del usuario o del equipo sobre estilo de código, convenciones, etc.

**Ejemplo:** "Preferimos usar arrow functions en lugar de function declarations"

### `solution`

Para soluciones a problemas específicos que pueden reutilizarse.

**Ejemplo:** "Para manejar formularios complejos, creamos un hook customizado useFormValidator"

### `configuration`

Para configuraciones específicas del proyecto o del entorno.

**Ejemplo:** "El puerto del servidor de desarrollo es 3001 para evitar conflictos"

### `note`

Para notas generales, recordatorios o información miscelánea.

**Ejemplo:** "Recordar actualizar la documentación de la API antes del release"

## 🏷️ Sistema de Etiquetas

Las etiquetas ayudan a categorizar y buscar memorias eficientemente:

### Etiquetas Técnicas

- `react`, `node`, `typescript`, `api`, `database`
- `frontend`, `backend`, `fullstack`
- `testing`, `deployment`, `performance`

### Etiquetas de Proyecto

- `architecture`, `design-patterns`, `conventions`
- `bugs`, `features`, `refactor`
- `security`, `optimization`

### Etiquetas de Contexto

- `team-decision`, `client-requirement`, `personal-preference`
- `temporary`, `important`, `deprecated`

## 🧹 Mantenimiento

### Limpieza Automática

El sistema incluye herramientas para mantener la base de datos limpia:

```typescript
// Eliminar memorias más antiguas de 1 año
cleanup_old_memories(365);

// Eliminar memorias muy antiguas (2 años)
cleanup_old_memories(730);
```

### Mejores Prácticas

1. **Usa etiquetas consistentes**: Mantén un vocabulario estándar de etiquetas
2. **Sé específico en el contenido**: Incluye contexto suficiente para entender la memoria después
3. **Usa project_path**: Asocia memorias con proyectos específicos para mejor organización
4. **Limpia regularmente**: Ejecuta limpieza periódica para mantener relevancia

## 🔍 Búsqueda y Filtrado

### Búsqueda por Contenido

La búsqueda busca coincidencias parciales en el contenido de las memorias:

```typescript
search_memories("authentication", [], "/proyecto", 10);
```

### Filtrado por Etiquetas

Busca memorias que contengan etiquetas específicas:

```typescript
search_memories("", ["react", "hooks"], "/proyecto", 5);
```

### Filtrado por Proyecto

Busca memorias específicas de un proyecto:

```typescript
search_memories("", [], "/proyecto-especifico", 20);
```

## ⚡ Rendimiento

- **Índices de base de datos**: Optimizado para búsquedas rápidas por proyecto, tipo y fecha
- **Límites de resultados**: Previene sobrecarga con límites configurables
- **Almacenamiento eficiente**: SQLite ofrece excelente rendimiento para este caso de uso

## 🛠️ Solución de Problemas

### La base de datos no se crea

- Verifica que el directorio tenga permisos de escritura
- Asegúrate de que SQLite3 esté instalado correctamente

### Memorias no aparecen en búsquedas

- Verifica que el `project_path` coincida exactamente
- Revisa que las etiquetas estén formateadas correctamente

### Rendimiento lento

- Ejecuta limpieza regular con `cleanup_old_memories`
- Considera reducir el límite de resultados en búsquedas

## 📄 Licencia

MIT License - Ve el archivo LICENSE para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del repositorio
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Haz push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para problemas o preguntas:

- Abre un issue en el repositorio
- Revisa la documentación de MCP
- Verifica la configuración de Claude Desktop
