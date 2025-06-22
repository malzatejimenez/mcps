#!/usr/bin/env node

/**
 * Memory MCP Server
 * Provides persistent contextual memory storage across chat sessions
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class MemoryMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'memory-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.db = null;
    this.dbPath = path.join(process.cwd(), 'memory.db');
    this.setupDatabase();
    this.setupToolHandlers();
  }

  setupDatabase() {
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.error('Memory database connected');
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    const sql = `
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        tags TEXT NOT NULL,
        memory_type TEXT NOT NULL,
        project_path TEXT NOT NULL,
        relevance_score REAL DEFAULT 1.0,
        usage_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `;

    this.db.run(sql, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      }
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'store_memory',
            description: 'Store a new memory with content, tags, type, and project context',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'The memory content to store',
                },
                tags: {
                  type: 'array',
                  description: 'Tags for categorization',
                  items: { type: 'string' },
                  default: []
                },
                memory_type: {
                  type: 'string',
                  description: 'Type of memory',
                  enum: ['decision', 'preference', 'solution', 'configuration', 'note'],
                  default: 'note'
                },
                project_path: {
                  type: 'string',
                  description: 'Project path for context',
                  default: ''
                }
              },
              required: ['content'],
            },
          },
          {
            name: 'search_memories',
            description: 'Search for relevant memories',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
                tags: {
                  type: 'array',
                  description: 'Filter by tags',
                  items: { type: 'string' },
                  default: []
                },
                project_path: {
                  type: 'string',
                  description: 'Filter by project path',
                },
                limit: {
                  type: 'number',
                  description: 'Max results',
                  default: 10
                }
              },
            },
          },
          {
            name: 'get_recent_memories',
            description: 'Get recent memories for a project',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Project path',
                },
                limit: {
                  type: 'number',
                  description: 'Max results',
                  default: 20
                }
              },
            },
          },
          {
            name: 'delete_memory',
            description: 'Delete a memory by ID',
            inputSchema: {
              type: 'object',
              properties: {
                memory_id: {
                  type: 'number',
                  description: 'Memory ID',
                }
              },
              required: ['memory_id'],
            },
          },
          {
            name: 'list_memory_tags',
            description: 'List all available tags',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: {
                  type: 'string',
                  description: 'Filter by project',
                }
              },
            },
          },
          {
            name: 'cleanup_old_memories',
            description: 'Remove old memories',
            inputSchema: {
              type: 'object',
              properties: {
                days_threshold: {
                  type: 'number',
                  description: 'Days threshold',
                  default: 365
                }
              },
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'store_memory':
            return await this.storeMemory(args);
          case 'search_memories':
            return await this.searchMemories(args);
          case 'get_recent_memories':
            return await this.getRecentMemories(args);
          case 'delete_memory':
            return await this.deleteMemory(args.memory_id);
          case 'list_memory_tags':
            return await this.listMemoryTags(args.project_path);
          case 'cleanup_old_memories':
            return await this.cleanupOldMemories(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Memory operation failed: ${error.message}`
        );
      }
    });
  }

  runAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  allAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async storeMemory(args) {
    const content = args.content;
    const tags = JSON.stringify(args.tags || []);
    const memoryType = args.memory_type || 'note';
    const projectPath = args.project_path || '';

    const sql = `
      INSERT INTO memories (content, tags, memory_type, project_path)
      VALUES (?, ?, ?, ?)
    `;

    try {
      const result = await this.runAsync(sql, [content, tags, memoryType, projectPath]);
      
      return {
        content: [
          {
            type: 'text',
            text: `🧠 Memory stored! ID: ${result.id}\nType: ${memoryType}\nProject: ${projectPath || 'Global'}\nContent: ${content.substring(0, 100)}...`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to store memory: ${error.message}`);
    }
  }

  async searchMemories(args) {
    let sql = `
      SELECT id, content, tags, memory_type, project_path, created_at
      FROM memories 
      WHERE 1=1
    `;
    const params = [];

    if (args.query) {
      sql += ` AND content LIKE ?`;
      params.push(`%${args.query}%`);
    }

    if (args.project_path) {
      sql += ` AND project_path = ?`;
      params.push(args.project_path);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(args.limit || 10);

    try {
      const memories = await this.allAsync(sql, params);
      
      if (memories.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '🔍 No memories found.',
            },
          ],
        };
      }

      const results = memories.map((m, i) => {
        const tags = JSON.parse(m.tags || '[]');
        return `**${i + 1}. [${m.id}] ${m.memory_type.toUpperCase()}**\n` +
               `📍 ${m.project_path || 'Global'} | 🏷️ ${tags.join(', ') || 'No tags'}\n` +
               `💭 ${m.content.substring(0, 200)}...\n`;
      });

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Found ${memories.length} memories:\n\n${results.join('\n---\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Search failed: ${error.message}`);
    }
  }

  async getRecentMemories(args) {
    let sql = `
      SELECT id, content, tags, memory_type, project_path, created_at
      FROM memories 
      WHERE 1=1
    `;
    const params = [];

    if (args.project_path) {
      sql += ` AND project_path = ?`;
      params.push(args.project_path);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(args.limit || 20);

    try {
      const memories = await this.allAsync(sql, params);

      if (memories.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📝 No recent memories found.',
            },
          ],
        };
      }

      const results = memories.map((m, i) => {
        const tags = JSON.parse(m.tags || '[]');
        const date = new Date(m.created_at).toLocaleDateString();
        return `**${i + 1}. [${m.id}] ${m.memory_type}** (${date})\n` +
               `📍 ${m.project_path || 'Global'} | 🏷️ ${tags.join(', ') || 'No tags'}\n` +
               `💭 ${m.content.substring(0, 150)}...\n`;
      });

      return {
        content: [
          {
            type: 'text',
            text: `📝 Recent memories (${memories.length}):\n\n${results.join('\n---\n')}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed: ${error.message}`);
    }
  }

  async deleteMemory(memoryId) {
    try {
      const result = await this.runAsync('DELETE FROM memories WHERE id = ?', [memoryId]);
      
      return {
        content: [
          {
            type: 'text',
            text: result.changes > 0 
              ? `🗑️ Memory ${memoryId} deleted successfully!`
              : `❌ Memory ${memoryId} not found.`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Delete failed: ${error.message}`);
    }
  }

  async listMemoryTags(projectPath) {
    let sql = `SELECT DISTINCT tags FROM memories WHERE tags != '[]'`;
    const params = [];

    if (projectPath) {
      sql += ` AND project_path = ?`;
      params.push(projectPath);
    }

    try {
      const rows = await this.allAsync(sql, params);
      const allTags = new Set();

      rows.forEach(row => {
        try {
          const tags = JSON.parse(row.tags);
          tags.forEach(tag => allTags.add(tag));
        } catch (e) {
          // Skip invalid JSON
        }
      });

      const sortedTags = Array.from(allTags).sort();

      return {
        content: [
          {
            type: 'text',
            text: `🏷️ Available tags${projectPath ? ` for ${projectPath}` : ''}:\n\n` +
                  (sortedTags.length > 0 
                    ? sortedTags.map(tag => `• ${tag}`).join('\n')
                    : 'No tags found.'),
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed: ${error.message}`);
    }
  }

  async cleanupOldMemories(args) {
    const daysThreshold = args.days_threshold || 365;

    try {
      const result = await this.runAsync(
        'DELETE FROM memories WHERE created_at <= datetime("now", "-" || ? || " days")',
        [daysThreshold]
      );

      return {
        content: [
          {
            type: 'text',
            text: `🧹 Cleanup completed! Removed ${result.changes} memories older than ${daysThreshold} days.`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Cleanup failed: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Memory MCP server running on stdio');
  }
}

const server = new MemoryMCPServer();
server.run().catch(console.error); 