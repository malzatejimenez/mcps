# PostgreSQL MCP Server

Un servidor MCP (Model Context Protocol) completo para PostgreSQL que permite control total sobre tu base de datos desde Claude Desktop.

## 🚀 Características

- **Conexión segura**: Conectar y desconectar de bases de datos PostgreSQL con pooling
- **Gestión de esquemas**: Listar tablas, describir estructuras y eliminar tablas
- **Manipulación de datos**: Insertar, actualizar, eliminar y consultar datos de forma segura
- **Consultas SQL**: Ejecutar cualquier consulta SQL personalizada con parámetros
- **Información del sistema**: Obtener información detallada de la base de datos
- **Seguridad**: Sanitización de identificadores y consultas parametrizadas para prevenir SQL injection

## 📦 Instalación

1. **Navegar al directorio del proyecto:**

```bash
cd mcp-postgresql
```

2. **Instalar dependencias:**

```bash
npm install
```

3. **Hacer el archivo ejecutable (Linux/macOS):**

```bash
chmod +x server.js
```

## ⚙️ Configuración en Claude Desktop

Agrega esta configuración a tu archivo de configuración de Claude Desktop:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "postgresql": {
      "command": "node",
      "args": ["/ruta/completa/a/tu/mcp-postgresql/server.js"]
    }
  }
}
```

## 🔧 Herramientas Disponibles

### Conexión y Gestión

- **`connect_database`**: Conectar a una base de datos PostgreSQL
- **`disconnect_database`**: Desconectar de la base de datos
- **`get_database_info`**: Obtener información general de la base de datos

### Gestión de Tablas

- **`create_table`**: Crear una nueva tabla con columnas y restricciones
- **`list_tables`**: Listar todas las tablas en un esquema
- **`describe_table`**: Obtener estructura detallada de una tabla
- **`drop_table`**: Eliminar una tabla (con opción CASCADE)

### Manipulación de Datos

- **`insert_data`**: Insertar datos en una tabla con manejo de conflictos
- **`update_data`**: Actualizar datos existentes con condiciones WHERE
- **`delete_data`**: Eliminar datos de una tabla con condiciones WHERE
- **`execute_query`**: Ejecutar cualquier consulta SQL con parámetros seguros

## 📚 Ejemplos de Uso

### 1. Conectar a la Base de Datos

```
Por favor conecta a mi base de datos PostgreSQL:
- Host: localhost
- Puerto: 5432
- Base de datos: mi_proyecto
- Usuario: postgres
- Contraseña: mi_password
```

### 2. Crear una Tabla

```
Crea una tabla llamada "usuarios" con estas columnas:
- id: SERIAL PRIMARY KEY
- nombre: VARCHAR(100) NOT NULL
- email: VARCHAR(255) UNIQUE NOT NULL
- activo: BOOLEAN DEFAULT true
- fecha_creacion: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### 3. Insertar Datos

```
Inserta un nuevo usuario:
- nombre: "Ana García"
- email: "ana@ejemplo.com"
- activo: true
```

### 4. Consultar Datos

```
Ejecuta esta consulta para mostrar usuarios activos:
SELECT id, nombre, email, fecha_creacion
FROM usuarios
WHERE activo = $1
ORDER BY fecha_creacion DESC
Parámetros: [true]
```

### 5. Actualizar Datos

```
Actualiza el email del usuario con id 1:
- Tabla: usuarios
- Datos: {"email": "nuevo@ejemplo.com"}
- Condición WHERE: id = $1
- Parámetros WHERE: [1]
```

## 🛡️ Características de Seguridad

### Consultas Parametrizadas

Todas las operaciones utilizan consultas parametrizadas para prevenir inyección SQL:

```javascript
// ✅ Seguro
query("SELECT * FROM usuarios WHERE id = $1", [userId]);

// ❌ Inseguro (no se permite)
query(`SELECT * FROM usuarios WHERE id = ${userId}`);
```

### Sanitización de Identificadores

Los nombres de tablas y columnas son validados para contener solo caracteres seguros:

- Letras (a-z, A-Z)
- Números (0-9)
- Guiones bajos (\_)
- Puntos (.) para esquemas

### Pooling de Conexiones

- Máximo 10 conexiones concurrentes
- Timeout de inactividad: 30 segundos
- Timeout de conexión: 2 segundos

## 🔍 Solución de Problemas

### Error de Conexión

```
Failed to connect to database: connection refused
```

**Solución:**

- Verifica que PostgreSQL esté ejecutándose
- Confirma host, puerto y credenciales
- Revisa configuración de firewall/red

### Error de Permisos

```
permission denied for table usuarios
```

**Solución:**

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios TO mi_usuario;
```

### Error de Identificador Inválido

```
Invalid identifier: mi-tabla
```

**Solución:** Usa solo letras, números y guiones bajos: `mi_tabla`

## 🎯 Casos de Uso Avanzados

### Análisis de Datos

```
Ejecuta esta consulta de análisis:
SELECT
  DATE(fecha_creacion) as fecha,
  COUNT(*) as nuevos_usuarios,
  COUNT(CASE WHEN activo THEN 1 END) as activos
FROM usuarios
WHERE fecha_creacion >= $1
GROUP BY DATE(fecha_creacion)
ORDER BY fecha DESC
Parámetros: ['2024-01-01']
```

### Gestión de Índices

```
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_fecha ON usuarios(fecha_creacion);
```

### Respaldos y Restauración

```sql
-- Para hacer backup (ejecutar desde terminal)
pg_dump mi_base_datos > backup.sql

-- Para restaurar
psql mi_base_datos < backup.sql
```

## 📋 Requisitos del Sistema

- **Node.js**: ≥ 18.0.0
- **PostgreSQL**: ≥ 12.0
- **Sistema Operativo**: Windows, macOS, Linux

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

- [Documentación de PostgreSQL](https://www.postgresql.org/docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)
- [Node.js pg library](https://node-postgres.com/)

## 📞 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa la sección de solución de problemas
2. Busca en los issues existentes
3. Crea un nuevo issue con:
   - Descripción del problema
   - Pasos para reproducir
   - Versiones de software
   - Logs de error
