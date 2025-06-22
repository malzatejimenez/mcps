#!/usr/bin/env node

/**
 * PostgreSQL MCP Server
 * Provides complete PostgreSQL database control through MCP protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const { Pool } = require('pg');

class PostgreSQLMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'postgresql-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.pool = null;
    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'connect_database',
            description: 'Connect to a PostgreSQL database',
            inputSchema: {
              type: 'object',
              properties: {
                host: {
                  type: 'string',
                  description: 'Database host (default: localhost)',
                  default: 'localhost'
                },
                port: {
                  type: 'number',
                  description: 'Database port (default: 5432)',
                  default: 5432
                },
                database: {
                  type: 'string',
                  description: 'Database name',
                },
                user: {
                  type: 'string',
                  description: 'Database user',
                },
                password: {
                  type: 'string',
                  description: 'Database password',
                },
                ssl: {
                  type: 'boolean',
                  description: 'Use SSL connection (default: false)',
                  default: false
                }
              },
              required: ['database', 'user', 'password'],
            },
          },
          {
            name: 'disconnect_database',
            description: 'Disconnect from the PostgreSQL database',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'execute_query',
            description: 'Execute a SQL query (SELECT, INSERT, UPDATE, DELETE, etc.)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'SQL query to execute',
                },
                params: {
                  type: 'array',
                  description: 'Parameters for parameterized queries',
                  items: {
                    type: ['string', 'number', 'boolean', 'null']
                  },
                  default: []
                }
              },
              required: ['query'],
            },
          },
          {
            name: 'create_table',
            description: 'Create a new table in the database',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table to create',
                },
                columns: {
                  type: 'array',
                  description: 'Array of column definitions',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      constraints: { type: 'string', default: '' }
                    },
                    required: ['name', 'type']
                  }
                },
                options: {
                  type: 'string',
                  description: 'Additional table options (e.g., constraints, indexes)',
                  default: ''
                }
              },
              required: ['tableName', 'columns'],
            },
          },
          {
            name: 'insert_data',
            description: 'Insert data into a table',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table',
                },
                data: {
                  type: 'object',
                  description: 'Data to insert as key-value pairs',
                },
                onConflict: {
                  type: 'string',
                  description: 'ON CONFLICT clause (optional)',
                  default: ''
                }
              },
              required: ['tableName', 'data'],
            },
          },
          {
            name: 'update_data',
            description: 'Update data in a table',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table',
                },
                data: {
                  type: 'object',
                  description: 'Data to update as key-value pairs',
                },
                where: {
                  type: 'string',
                  description: 'WHERE clause condition',
                },
                whereParams: {
                  type: 'array',
                  description: 'Parameters for WHERE clause',
                  items: {
                    type: ['string', 'number', 'boolean', 'null']
                  },
                  default: []
                }
              },
              required: ['tableName', 'data', 'where'],
            },
          },
          {
            name: 'delete_data',
            description: 'Delete data from a table',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table',
                },
                where: {
                  type: 'string',
                  description: 'WHERE clause condition',
                },
                whereParams: {
                  type: 'array',
                  description: 'Parameters for WHERE clause',
                  items: {
                    type: ['string', 'number', 'boolean', 'null']
                  },
                  default: []
                }
              },
              required: ['tableName', 'where'],
            },
          },
          {
            name: 'list_tables',
            description: 'List all tables in the current database',
            inputSchema: {
              type: 'object',
              properties: {
                schema: {
                  type: 'string',
                  description: 'Schema name (default: public)',
                  default: 'public'
                }
              },
            },
          },
          {
            name: 'describe_table',
            description: 'Get detailed information about a table structure',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table to describe',
                },
                schema: {
                  type: 'string',
                  description: 'Schema name (default: public)',
                  default: 'public'
                }
              },
              required: ['tableName'],
            },
          },
          {
            name: 'drop_table',
            description: 'Drop (delete) a table from the database',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table to drop',
                },
                cascade: {
                  type: 'boolean',
                  description: 'Use CASCADE option',
                  default: false
                }
              },
              required: ['tableName'],
            },
          },
          {
            name: 'get_database_info',
            description: 'Get general information about the database',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'connect_database':
            return await this.connectDatabase(args);
          
          case 'disconnect_database':
            return await this.disconnectDatabase();
          
          case 'execute_query':
            return await this.executeQuery(args.query, args.params || []);
          
          case 'create_table':
            return await this.createTable(args.tableName, args.columns, args.options);
          
          case 'insert_data':
            return await this.insertData(args.tableName, args.data, args.onConflict);
          
          case 'update_data':
            return await this.updateData(args.tableName, args.data, args.where, args.whereParams);
          
          case 'delete_data':
            return await this.deleteData(args.tableName, args.where, args.whereParams);
          
          case 'list_tables':
            return await this.listTables(args.schema);
          
          case 'describe_table':
            return await this.describeTable(args.tableName, args.schema);
          
          case 'drop_table':
            return await this.dropTable(args.tableName, args.cascade);
          
          case 'get_database_info':
            return await this.getDatabaseInfo();
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Database operation failed: ${error.message}`
        );
      }
    });
  }

  // Utility function to sanitize table/column names
  sanitizeIdentifier(identifier) {
    // Only allow alphanumeric characters, underscores, and periods
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return identifier;
  }

  async connectDatabase(config) {
    try {
      if (this.pool) {
        await this.pool.end();
      }

      const poolConfig = {
        host: config.host || 'localhost',
        port: config.port || 5432,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl || false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      };

      this.pool = new Pool(poolConfig);

      // Test the connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT version()');
      client.release();

      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully connected to PostgreSQL database: ${config.database}\n` +
                  `Server: ${config.host}:${config.port}\n` +
                  `Version: ${result.rows[0].version}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to connect to database: ${error.message}`
      );
    }
  }

  async disconnectDatabase() {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        return {
          content: [
            {
              type: 'text',
              text: '✅ Successfully disconnected from database',
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: 'ℹ️ No active database connection',
            },
          ],
        };
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to disconnect: ${error.message}`
      );
    }
  }

  checkConnection() {
    if (!this.pool) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'No database connection. Please connect to a database first.'
      );
    }
  }

  async executeQuery(query, params = []) {
    this.checkConnection();

    try {
      const result = await this.pool.query(query, params);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Query executed successfully\n` +
                  `Rows affected: ${result.rowCount || 0}\n` +
                  `${result.rows && result.rows.length > 0 ? `\nResults:\n${JSON.stringify(result.rows, null, 2)}` : ''}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Query execution failed: ${error.message}`
      );
    }
  }

  async createTable(tableName, columns, options = '') {
    this.checkConnection();

    try {
      // Sanitize table name
      this.sanitizeIdentifier(tableName);

      const columnDefs = columns.map(col => {
        // Sanitize column name
        this.sanitizeIdentifier(col.name);
        return `${col.name} ${col.type} ${col.constraints || ''}`.trim();
      }).join(', ');

      const query = `CREATE TABLE ${tableName} (${columnDefs})${options ? ' ' + options : ''}`;
      
      await this.pool.query(query);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Table '${tableName}' created successfully\n` +
                  `Columns: ${columns.map(c => `${c.name} (${c.type})`).join(', ')}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create table: ${error.message}`
      );
    }
  }

  async insertData(tableName, data, onConflict = '') {
    this.checkConnection();

    try {
      // Sanitize table name
      this.sanitizeIdentifier(tableName);

      const keys = Object.keys(data);
      const values = Object.values(data);
      
      // Sanitize column names
      keys.forEach(key => this.sanitizeIdentifier(key));
      
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      
      let query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
      if (onConflict) {
        query += ` ${onConflict}`;
      }
      
      const result = await this.pool.query(query, values);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Data inserted successfully into '${tableName}'\n` +
                  `Rows affected: ${result.rowCount}\n` +
                  `Data: ${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to insert data: ${error.message}`
      );
    }
  }

  async updateData(tableName, data, whereClause, whereParams = []) {
    this.checkConnection();

    try {
      // Sanitize table name
      this.sanitizeIdentifier(tableName);

      const keys = Object.keys(data);
      const values = Object.values(data);
      
      // Sanitize column names
      keys.forEach(key => this.sanitizeIdentifier(key));
      
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
      const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
      
      const allParams = [...values, ...whereParams];
      const result = await this.pool.query(query, allParams);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Data updated successfully in '${tableName}'\n` +
                  `Rows affected: ${result.rowCount}\n` +
                  `Updated data: ${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to update data: ${error.message}`
      );
    }
  }

  async deleteData(tableName, whereClause, whereParams = []) {
    this.checkConnection();

    try {
      // Sanitize table name
      this.sanitizeIdentifier(tableName);

      const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;
      
      const result = await this.pool.query(query, whereParams);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Data deleted successfully from '${tableName}'\n` +
                  `Rows affected: ${result.rowCount}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to delete data: ${error.message}`
      );
    }
  }

  async listTables(schema = 'public') {
    this.checkConnection();

    try {
      const query = `
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = $1 
        ORDER BY table_name
      `;
      
      const result = await this.pool.query(query, [schema]);
      
      return {
        content: [
          {
            type: 'text',
            text: `📋 Tables in schema '${schema}':\n\n` +
                  result.rows.map(row => `• ${row.table_name} (${row.table_type})`).join('\n') +
                  `\n\nTotal: ${result.rows.length} tables`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list tables: ${error.message}`
      );
    }
  }

  async describeTable(tableName, schema = 'public') {
    this.checkConnection();

    try {
      // Sanitize identifiers
      this.sanitizeIdentifier(tableName);
      this.sanitizeIdentifier(schema);

      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `;
      
      const result = await this.pool.query(query, [schema, tableName]);
      
      if (result.rows.length === 0) {
        throw new Error(`Table '${tableName}' not found in schema '${schema}'`);
      }
      
      const tableInfo = result.rows.map(row => {
        let typeInfo = row.data_type;
        if (row.character_maximum_length) {
          typeInfo += `(${row.character_maximum_length})`;
        } else if (row.numeric_precision) {
          typeInfo += `(${row.numeric_precision}${row.numeric_scale ? ',' + row.numeric_scale : ''})`;
        }
        
        return {
          column: row.column_name,
          type: typeInfo,
          nullable: row.is_nullable === 'YES',
          default: row.column_default
        };
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `📋 Table structure: ${schema}.${tableName}\n\n` +
                  tableInfo.map(col => 
                    `• ${col.column} - ${col.type}${!col.nullable ? ' NOT NULL' : ''}${col.default ? ` DEFAULT ${col.default}` : ''}`
                  ).join('\n'),
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to describe table: ${error.message}`
      );
    }
  }

  async dropTable(tableName, cascade = false) {
    this.checkConnection();

    try {
      // Sanitize table name
      this.sanitizeIdentifier(tableName);

      const query = `DROP TABLE ${tableName}${cascade ? ' CASCADE' : ''}`;
      
      await this.pool.query(query);
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Table '${tableName}' dropped successfully${cascade ? ' (with CASCADE)' : ''}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to drop table: ${error.message}`
      );
    }
  }

  async getDatabaseInfo() {
    this.checkConnection();

    try {
      const queries = {
        version: 'SELECT version()',
        database: 'SELECT current_database()',
        user: 'SELECT current_user',
        schema: 'SELECT current_schema()',
        encoding: 'SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname = current_database()',
        size: `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await this.pool.query(query);
        results[key] = result.rows[0];
      }
      
      return {
        content: [
          {
            type: 'text',
            text: `📊 Database Information:\n\n` +
                  `• Database: ${results.database.current_database}\n` +
                  `• User: ${results.user.current_user}\n` +
                  `• Schema: ${results.schema.current_schema}\n` +
                  `• Encoding: ${results.encoding.pg_encoding_to_char}\n` +
                  `• Size: ${results.size.size}\n` +
                  `• Version: ${results.version.version}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get database info: ${error.message}`
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PostgreSQL MCP server running on stdio');
  }
}

const server = new PostgreSQLMCPServer();
server.run().catch(console.error);