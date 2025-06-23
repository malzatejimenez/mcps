#!/usr/bin/env node

/**
 * PostgreSQL MCP Server - Optimizado
 * Provides streamlined PostgreSQL database control through MCP protocol
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
        version: '0.2.0',
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
            name: 'crud_operations',
            description: 'Perform CRUD operations (Create, Read, Update, Delete) on table data',
            inputSchema: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Type of CRUD operation to perform',
                  enum: ['insert', 'update', 'delete'],
                },
                tableName: {
                  type: 'string',
                  description: 'Name of the table',
                },
                data: {
                  type: 'object',
                  description: 'Data for insert/update operations as key-value pairs',
                },
                where: {
                  type: 'string',
                  description: 'WHERE clause condition (required for update/delete)',
                },
                whereParams: {
                  type: 'array',
                  description: 'Parameters for WHERE clause',
                  items: {
                    type: ['string', 'number', 'boolean', 'null']
                  },
                  default: []
                },
                onConflict: {
                  type: 'string',
                  description: 'ON CONFLICT clause for insert operations (optional)',
                  default: ''
                }
              },
              required: ['operation', 'tableName'],
            },
          },
          {
            name: 'table_info',
            description: 'Get information about tables - list all tables or describe a specific table structure',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  description: 'Action to perform',
                  enum: ['list', 'describe'],
                },
                tableName: {
                  type: 'string',
                  description: 'Name of the table to describe (required for describe action)',
                },
                schema: {
                  type: 'string',
                  description: 'Schema name (default: public)',
                  default: 'public'
                }
              },
              required: ['action'],
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
          },
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
            return await this.executeQuery(args.query, args.params);
          case 'create_table':
            return await this.createTable(args.tableName, args.columns, args.options);
          case 'crud_operations':
            return await this.crudOperations(args);
          case 'table_info':
            return await this.tableInfo(args);
          case 'drop_table':
            return await this.dropTable(args.tableName, args.cascade);
          case 'get_database_info':
            return await this.getDatabaseInfo();

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
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

  sanitizeIdentifier(identifier) {
    // Basic validation for SQL identifiers
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return identifier;
  }

  async connectDatabase(config) {
    try {
      if (this.pool) {
        await this.pool.end();
      }

      this.pool = new Pool({
        host: config.host || 'localhost',
        port: config.port || 5432,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl || false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test the connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      return {
        content: [
          {
            type: 'text',
            text: `✅ Successfully connected to PostgreSQL database '${config.database}' at ${config.host}:${config.port}\nConnection established at: ${result.rows[0].now}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.ConnectionFailed,
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
              text: '✅ Successfully disconnected from PostgreSQL database',
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: '⚠️ No database connection to close',
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
        ErrorCode.ConnectionFailed,
        'No database connection. Please connect first using connect_database.'
      );
    }
  }

  async executeQuery(query, params = []) {
    this.checkConnection();

    try {
      const client = await this.pool.connect();
      const result = await client.query(query, params);
      client.release();

      let output = `📊 Query executed successfully\n`;
      output += `Rows affected: ${result.rowCount || 0}\n\n`;

      if (result.rows && result.rows.length > 0) {
        output += `📋 Results (${result.rows.length} rows):\n`;
        output += JSON.stringify(result.rows, null, 2);
      }

      return {
        content: [
          {
            type: 'text',
            text: output,
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
      const sanitizedTableName = this.sanitizeIdentifier(tableName);
      
      const columnDefinitions = columns.map(col => {
        const sanitizedName = this.sanitizeIdentifier(col.name);
        return `${sanitizedName} ${col.type} ${col.constraints || ''}`.trim();
      }).join(', ');

      let query = `CREATE TABLE ${sanitizedTableName} (${columnDefinitions})`;
      if (options) {
        query += ` ${options}`;
      }

      const client = await this.pool.connect();
      await client.query(query);
      client.release();

      return {
        content: [
          {
            type: 'text',
            text: `✅ Table '${tableName}' created successfully with ${columns.length} columns`,
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

  async crudOperations(args) {
    this.checkConnection();

    const { operation, tableName, data, where, whereParams, onConflict } = args;
    const sanitizedTableName = this.sanitizeIdentifier(tableName);

    try {
      const client = await this.pool.connect();
      let result;
      let message;

      switch (operation) {
        case 'insert':
          if (!data || Object.keys(data).length === 0) {
            throw new McpError(ErrorCode.InvalidParams, 'Data is required for insert operation');
          }
          
          const insertColumns = Object.keys(data).map(key => this.sanitizeIdentifier(key));
          const insertValues = Object.values(data);
          const insertPlaceholders = insertValues.map((_, index) => `$${index + 1}`).join(', ');
          
          let insertQuery = `INSERT INTO ${sanitizedTableName} (${insertColumns.join(', ')}) VALUES (${insertPlaceholders})`;
          if (onConflict) {
            insertQuery += ` ${onConflict}`;
          }
          insertQuery += ' RETURNING *';
          
          result = await client.query(insertQuery, insertValues);
          message = `✅ Successfully inserted ${result.rowCount} row(s) into '${tableName}'`;
          break;

        case 'update':
          if (!data || Object.keys(data).length === 0) {
            throw new McpError(ErrorCode.InvalidParams, 'Data is required for update operation');
          }
          if (!where) {
            throw new McpError(ErrorCode.InvalidParams, 'WHERE clause is required for update operation');
          }
          
          const updateColumns = Object.keys(data);
          const updateValues = Object.values(data);
          const updateSetClause = updateColumns.map((col, index) => 
            `${this.sanitizeIdentifier(col)} = $${index + 1}`
          ).join(', ');
          
          const updateQuery = `UPDATE ${sanitizedTableName} SET ${updateSetClause} WHERE ${where} RETURNING *`;
          const updateParams = [...updateValues, ...whereParams];
          
          result = await client.query(updateQuery, updateParams);
          message = `✅ Successfully updated ${result.rowCount} row(s) in '${tableName}'`;
          break;

        case 'delete':
          if (!where) {
            throw new McpError(ErrorCode.InvalidParams, 'WHERE clause is required for delete operation');
          }
          
          const deleteQuery = `DELETE FROM ${sanitizedTableName} WHERE ${where} RETURNING *`;
          result = await client.query(deleteQuery, whereParams);
          message = `✅ Successfully deleted ${result.rowCount} row(s) from '${tableName}'`;
          break;

        default:
          throw new McpError(ErrorCode.InvalidParams, `Invalid operation: ${operation}`);
      }

      client.release();

      let output = message + '\n\n';
      if (result.rows && result.rows.length > 0) {
        output += `📋 Affected rows:\n${JSON.stringify(result.rows, null, 2)}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `CRUD operation failed: ${error.message}`
      );
    }
  }

  async tableInfo(args) {
    this.checkConnection();

    const { action, tableName, schema } = args;

    try {
      const client = await this.pool.connect();
      let result;
      let output;

      switch (action) {
        case 'list':
          result = await client.query(`
            SELECT 
              schemaname as schema,
              tablename as table_name,
              tableowner as owner,
              hasindexes as has_indexes,
              hasrules as has_rules,
              hastriggers as has_triggers
            FROM pg_tables 
            WHERE schemaname = $1
            ORDER BY tablename
          `, [schema || 'public']);

          output = `📋 Tables in schema '${schema || 'public'}' (${result.rows.length} found):\n\n`;
          if (result.rows.length > 0) {
            result.rows.forEach((row, index) => {
              output += `${index + 1}. ${row.table_name}\n`;
              output += `   Owner: ${row.owner}\n`;
              output += `   Features: ${[
                row.has_indexes ? 'Indexes' : null,
                row.has_rules ? 'Rules' : null,
                row.has_triggers ? 'Triggers' : null
              ].filter(Boolean).join(', ') || 'None'}\n\n`;
            });
          }
          break;

        case 'describe':
          if (!tableName) {
            throw new McpError(ErrorCode.InvalidParams, 'Table name is required for describe action');
          }

          result = await client.query(`
            SELECT 
              column_name,
              data_type,
              character_maximum_length,
              is_nullable,
              column_default,
              ordinal_position
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
          `, [schema || 'public', tableName]);

          if (result.rows.length === 0) {
            throw new McpError(ErrorCode.InvalidParams, `Table '${tableName}' not found in schema '${schema || 'public'}'`);
          }

          output = `📋 Table structure for '${tableName}':\n\n`;
          output += `${'Column'.padEnd(25)} ${'Type'.padEnd(20)} ${'Nullable'.padEnd(10)} ${'Default'.padEnd(15)}\n`;
          output += `${'-'.repeat(75)}\n`;

          result.rows.forEach(row => {
            const typeInfo = row.character_maximum_length 
              ? `${row.data_type}(${row.character_maximum_length})`
              : row.data_type;
            
            output += `${row.column_name.padEnd(25)} ${typeInfo.padEnd(20)} ${row.is_nullable.padEnd(10)} ${(row.column_default || 'NULL').padEnd(15)}\n`;
          });

          // Get table constraints
          const constraintsResult = await client.query(`
            SELECT 
              constraint_name,
              constraint_type
            FROM information_schema.table_constraints 
            WHERE table_schema = $1 AND table_name = $2
          `, [schema || 'public', tableName]);

          if (constraintsResult.rows.length > 0) {
            output += `\n🔒 Constraints:\n`;
            constraintsResult.rows.forEach(row => {
              output += `- ${row.constraint_name} (${row.constraint_type})\n`;
            });
          }
          break;

        default:
          throw new McpError(ErrorCode.InvalidParams, `Invalid action: ${action}`);
      }

      client.release();

      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Table info operation failed: ${error.message}`
      );
    }
  }

  async dropTable(tableName, cascade = false) {
    this.checkConnection();

    try {
      const sanitizedTableName = this.sanitizeIdentifier(tableName);
      const cascadeClause = cascade ? ' CASCADE' : '';
      
      const client = await this.pool.connect();
      await client.query(`DROP TABLE ${sanitizedTableName}${cascadeClause}`);
      client.release();

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
      const client = await this.pool.connect();
      
      // Get basic database info
      const dbInfo = await client.query('SELECT current_database(), current_user, version()');
      const dbStats = await client.query(`
        SELECT 
          (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
          (SELECT count(*) FROM information_schema.views WHERE table_schema = 'public') as view_count,
          (SELECT count(*) FROM information_schema.schemata) as schema_count
      `);

      client.release();

      const info = dbInfo.rows[0];
      const stats = dbStats.rows[0];

      let output = `🗄️ Database Information:\n\n`;
      output += `Database: ${info.current_database}\n`;
      output += `Current User: ${info.current_user}\n`;
      output += `PostgreSQL Version: ${info.version.split(' ').slice(0, 2).join(' ')}\n\n`;
      output += `📊 Statistics:\n`;
      output += `Tables (public schema): ${stats.table_count}\n`;
      output += `Views (public schema): ${stats.view_count}\n`;
      output += `Total Schemas: ${stats.schema_count}\n`;

      return {
        content: [
          {
            type: 'text',
            text: output,
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
    console.error('PostgreSQL MCP Server (Optimized) running on stdio');
  }
}

const server = new PostgreSQLMCPServer();
server.run().catch(console.error);