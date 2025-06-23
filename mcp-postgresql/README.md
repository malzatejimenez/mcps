# PostgreSQL MCP Server - Optimizado

Un servidor MCP (Model Context Protocol) optimizado que proporciona control completo de bases de datos PostgreSQL con una interfaz simplificada de 8 herramientas esenciales.

## Instalación

```bash
npm install
```

## Características

- **Gestión de conexiones**: Conectar y desconectar de bases de datos PostgreSQL
- **Ejecución de consultas**: Ejecutar cualquier consulta SQL con parámetros seguros
- **Gestión de tablas**: Crear, listar, describir y eliminar tablas
- **Operaciones CRUD unificadas**: Insertar, actualizar y eliminar datos con una sola herramienta
- **Información de base de datos**: Obtener estadísticas y metadatos completos
- **Interfaz optimizada**: Solo 8 tools esenciales vs 10 originales

## Herramientas Disponibles

### 🔌 Gestión de Conexiones

- **`connect_database`**: Conectar a una base de datos PostgreSQL
- **`disconnect_database`**: Desconectar de la base de datos actual

### 🔍 Ejecución de Consultas

- **`execute_query`**: Ejecutar consultas SQL con soporte para parámetros

### 🗂️ Gestión de Tablas

- **`create_table`**: Crear nuevas tablas con columnas y restricciones
- **`table_info`**: Listar tablas o describir estructura de tabla específica
- **`drop_table`**: Eliminar tablas con opción CASCADE

### 📊 Operaciones de Datos

- **`crud_operations`**: Operaciones unificadas de inserción, actualización y eliminación

### ℹ️ Información del Sistema

- **`get_database_info`**: Información completa de la base de datos

## Uso

### Configuración en Cursor/Claude Desktop

Añade esto a tu configuración MCP:

```json
{
  "mcpServers": {
    "postgresql": {
      "command": "node",
      "args": ["path/to/mcp-postgresql/server.js"],
      "env": {}
    }
  }
}
```

### Ejemplos de Uso

#### Conexión a Base de Datos

```typescript
// Conectar a una base de datos local
await connect_database({
  host: "localhost",
  port: 5432,
  database: "mi_base_datos",
  user: "usuario",
  password: "password",
  ssl: false,
});

// Desconectar
await disconnect_database();
```

#### Operaciones CRUD Unificadas

```typescript
// Insertar datos
await crud_operations({
  operation: "insert",
  tableName: "usuarios",
  data: {
    nombre: "Juan Pérez",
    email: "juan@ejemplo.com",
    edad: 30,
  },
  onConflict: "ON CONFLICT (email) DO NOTHING",
});

// Actualizar datos
await crud_operations({
  operation: "update",
  tableName: "usuarios",
  data: {
    nombre: "Juan Carlos Pérez",
    edad: 31,
  },
  where: "email = $1",
  whereParams: ["juan@ejemplo.com"],
});

// Eliminar datos
await crud_operations({
  operation: "delete",
  tableName: "usuarios",
  where: "edad < $1",
  whereParams: [18],
});
```

#### Información de Tablas

```typescript
// Listar todas las tablas
await table_info({
  action: "list",
  schema: "public",
});

// Describir estructura de una tabla específica
await table_info({
  action: "describe",
  tableName: "usuarios",
  schema: "public",
});
```

#### Gestión de Tablas

```typescript
// Crear una nueva tabla
await create_table({
  tableName: "productos",
  columns: [
    { name: "id", type: "SERIAL", constraints: "PRIMARY KEY" },
    { name: "nombre", type: "VARCHAR(255)", constraints: "NOT NULL" },
    {
      name: "precio",
      type: "DECIMAL(10,2)",
      constraints: "CHECK (precio > 0)",
    },
    {
      name: "categoria_id",
      type: "INTEGER",
      constraints: "REFERENCES categorias(id)",
    },
  ],
  options: "WITH (OIDS=FALSE)",
});

// Eliminar tabla con CASCADE
await drop_table({
  tableName: "productos",
  cascade: true,
});
```

#### Consultas Personalizadas

```typescript
// Consulta con parámetros
await execute_query({
  query: `
    SELECT u.nombre, u.email, COUNT(p.id) as total_pedidos
    FROM usuarios u
    LEFT JOIN pedidos p ON u.id = p.usuario_id
    WHERE u.fecha_registro >= $1
    GROUP BY u.id, u.nombre, u.email
    ORDER BY total_pedidos DESC
    LIMIT $2
  `,
  params: ["2024-01-01", 10],
});
```

## Optimizaciones Realizadas

### Antes (10 tools) → Después (8 tools)

#### ✅ Herramientas Combinadas:

- `insert_data` + `update_data` + `delete_data` → **`crud_operations`**
- `list_tables` + `describe_table` → **`table_info`**

#### ✅ Herramientas Mantenidas:

- `connect_database`, `disconnect_database`
- `execute_query`, `create_table`, `drop_table`
- `get_database_info`

#### ✅ Beneficios:

- **Interfaz más simple**: 20% menos herramientas
- **CRUD unificado**: Una sola herramienta para todas las operaciones de datos
- **Información centralizada**: Gestión unificada de información de tablas
- **Funcionalidad completa**: Sin pérdida de características
- **Mejor experiencia**: Menos decisiones para el usuario

## Funcionalidades Avanzadas

### Parámetros Seguros

```typescript
// Siempre usa parámetros para prevenir inyección SQL
await crud_operations({
  operation: "update",
  tableName: "productos",
  data: { precio: 99.99 },
  where: "categoria = $1 AND stock > $2",
  whereParams: ["electronics", 0],
});
```

### Transacciones

```typescript
// Usar transacciones para operaciones complejas
await execute_query({
  query: `
    BEGIN;
    INSERT INTO productos (nombre, precio) VALUES ($1, $2);
    UPDATE categorias SET total_productos = total_productos + 1 WHERE id = $3;
    COMMIT;
  `,
  params: ["Nuevo Producto", 29.99, 1],
});
```

### Consultas Complejas

```typescript
// JOIN con múltiples tablas
await execute_query({
  query: `
    WITH ventas_mensuales AS (
      SELECT 
        EXTRACT(MONTH FROM fecha) as mes,
        SUM(total) as total_ventas
      FROM pedidos 
      WHERE fecha >= $1
      GROUP BY EXTRACT(MONTH FROM fecha)
    )
    SELECT mes, total_ventas,
           LAG(total_ventas) OVER (ORDER BY mes) as mes_anterior
    FROM ventas_mensuales
    ORDER BY mes
  `,
  params: ["2024-01-01"],
});
```

## Patrones de Uso Recomendados

### 1. Desarrollo de Aplicaciones

```typescript
// 1. Conectar
await connect_database({...});

// 2. Crear esquema
await create_table({...});

// 3. Insertar datos de prueba
await crud_operations({
  operation: "insert",
  tableName: "usuarios",
  data: {...}
});

// 4. Consultar y validar
await execute_query({...});
```

### 2. Análisis de Datos

```typescript
// 1. Conectar a base de datos de producción
await connect_database({...});

// 2. Obtener información del esquema
await table_info({ action: "list" });

// 3. Analizar datos
await execute_query({
  query: "SELECT * FROM metrics WHERE date >= $1",
  params: ["2024-01-01"]
});
```

### 3. Migración de Datos

```typescript
// 1. Conectar
await connect_database({...});

// 2. Crear tabla destino
await create_table({...});

// 3. Migrar datos por lotes
await crud_operations({
  operation: "insert",
  tableName: "nueva_tabla",
  data: {...}
});
```

## Requisitos

- Node.js 14+
- PostgreSQL 10+
- Permisos de conexión a la base de datos

## Error Handling

El servidor maneja errores comunes como:

- Fallos de conexión a la base de datos
- Errores de sintaxis SQL
- Violaciones de restricciones
- Tablas o columnas no encontradas
- Problemas de permisos

## Seguridad

- **Consultas parametrizadas**: Prevención de inyección SQL
- **Validación de identificadores**: Nombres de tabla y columna seguros
- **Gestión de conexiones**: Pool de conexiones con timeouts
- **SSL opcional**: Soporte para conexiones seguras

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
