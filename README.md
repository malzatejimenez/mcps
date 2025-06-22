# PostgreSQL MCP Server

Un servidor MCP (Model Context Protocol) completo para PostgreSQL que te permite tener control total sobre tu base de datos desde Claude.

## 🚀 Características

- **Conexión completa**: Conectar y desconectar de bases de datos PostgreSQL
- **Gestión de tablas**: Crear, listar, describir y eliminar tablas
- **Manipulación de datos**: Insertar, actualizar, eliminar y consultar datos
- **Consultas SQL**: Ejecutar cualquier consulta SQL personalizada
- **Información del sistema**: Obtener información detallada de la base de datos
- **Parámetros seguros**: Soporte para consultas parametrizadas para prevenir SQL injection

## 📦 Instalación

1. **Crear el directorio del proyecto:**

```bash
mkdir postgresql-mcp-server
cd postgresql-mcp-server
```

2. **Guardar los archivos:**

   - Guarda el código principal como `index.js`
   - Guarda el `package.json`
   - Haz el archivo ejecutable: `chmod +x index.js`

3. **Instalar dependencias:**

```bash
npm install
```

## ⚙️ Configuración en Claude Desktop

Agrega esta configuración a tu archivo de configuración de Claude Desktop:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "postgresql": {
      "command": "node",
      "args": ["/ruta/completa/a/tu/postgresql-mcp-server/index.js"]
    }
  }
}
```

## 🔧 Herramientas Disponibles

### Conexión

- **`connect_database`**: Conectar a una base de datos PostgreSQL
- **`disconnect_database`**: Desconectar de la base de datos
- **`get_database_info`**: Obtener información general de la base de datos

### Gestión de Tablas

- **`create_table`**: Crear una nueva tabla
- **`list_tables`**: Listar todas las tablas
- **`describe_table`**: Obtener estructura detallada de una tabla
- **`drop_table`**: Eliminar una tabla

### Manipulación de Datos

- **`insert_data`**: Insertar datos en una tabla
- **`update_data`**: Actualizar datos existentes
- **`delete_data`**: Eliminar datos de una tabla
- **`execute_query`**: Ejecutar cualquier consulta SQL

## 📚 Ejemplos de Uso

### 1. Conectar a la Base de Datos

```
Conecta a mi base de datos PostgreSQL:
- Host: localhost
- Puerto: 5432
- Base de datos: mi_proyecto
- Usuario: mi_usuario
- Contraseña: mi_contraseña
```

### 2. Crear una Tabla

```
Crea una tabla llamada "usuarios" con estas columnas:
- id: entero, clave primaria, autoincremental
- nombre: texto de máximo 100 caracteres, no nulo
- email: texto único, no nulo
- fecha_creacion: timestamp con zona horaria, por defecto ahora
```

### 3. Insertar Datos

```
Inserta un nuevo usuario en la tabla usuarios:
- nombre: "Juan Pérez"
- email: "juan@ejemplo.com"
```

### 4. Consultar Datos

```
Muéstrame todos los usuarios creados en los últimos 7 días
```

### 5. Actualizar Datos

```
Actualiza el email del usuario con id 1 a "nuevo@ejemplo.com"
```

### 6. Consulta Personalizada

```
Ejecuta esta consulta SQL:
SELECT u.nombre, COUNT(p.id) as total_pedidos
FROM usuarios u
LEFT JOIN pedidos p ON u.id = p.usuario_id
GROUP BY u.id, u.nombre
ORDER BY total_pedidos DESC
```

## 🛡️ Seguridad

- **Consultas parametrizadas**: Todas las operaciones usan parámetros seguros
- **Validación de entrada**: Se validan los tipos de datos
- **Manejo de errores**: Errores descriptivos sin exponer información sensible
- **Conexiones pooled**: Gestión eficiente de conexiones

## 🔍 Solución de Problemas

### Error de Conexión

```
Failed to connect to database: connection refused
```

- Verifica que PostgreSQL esté ejecutándose
- Confirma host, puerto y credenciales
- Revisa configuración de firewall

### Error de Permisos

```
permission denied for table
```

- Verifica que el usuario tenga permisos necesarios
- Usa `GRANT` para otorgar permisos específicos

### Error de Sintaxis SQL

```
syntax error at or near
```

- Revisa la sintaxis de tu consulta SQL
- Usa comillas simples para strings en SQL

## 🎯 Casos de Uso Avanzados

### Backup de Datos

```
Ejecuta un SELECT * FROM mi_tabla para hacer backup de los datos
```

### Análisis de Rendimiento

```
Muestra el plan de ejecución para esta consulta: [tu consulta]
```

### Gestión de Índices

```
Crea un índice en la columna email de la tabla usuarios
```

### Triggers y Funciones

```
Ejecuta este SQL para crear un trigger: [tu código SQL]
```

## 📝 Notas Importantes

- **Siempre haz backup** antes de operaciones destructivas
- **Usa transacciones** para operaciones críticas
- **Valida datos** antes de insertar
- **Monitorea rendimiento** en consultas complejas
- **Cierra conexiones** cuando termines

## 🤝 Contribuir

Si encuentras bugs o quieres agregar funcionalidades:

1. Reporta issues con detalles específicos
2. Propón mejoras con casos de uso claros
3. Incluye ejemplos de prueba

¡Ahora tienes control total sobre PostgreSQL desde Claude! 🎉
