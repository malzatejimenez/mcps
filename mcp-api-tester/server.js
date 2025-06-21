#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ApiTesterMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'api-tester-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'send_http_request',
          description: 'Envía una petición HTTP a cualquier endpoint con soporte completo para headers, body, autenticación, etc.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL del endpoint a probar'
              },
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
                description: 'Método HTTP',
                default: 'GET'
              },
              headers: {
                type: 'object',
                description: 'Headers de la petición',
                additionalProperties: { type: 'string' }
              },
              body: {
                type: 'string',
                description: 'Cuerpo de la petición (JSON string, form data, etc.)'
              },
              auth: {
                type: 'object',
                description: 'Configuración de autenticación',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['bearer', 'basic', 'api-key']
                  },
                  token: { type: 'string' },
                  username: { type: 'string' },
                  password: { type: 'string' },
                  apiKey: { type: 'string' },
                  apiKeyHeader: { type: 'string', default: 'X-API-Key' }
                }
              },
              timeout: {
                type: 'number',
                description: 'Timeout en milisegundos',
                default: 10000
              },
              followRedirects: {
                type: 'boolean',
                description: 'Seguir redirects automáticamente',
                default: true
              },
              validateStatus: {
                type: 'boolean',
                description: 'Validar códigos de estado HTTP',
                default: false
              }
            },
            required: ['url']
          }
        },
        {
          name: 'save_request',
          description: 'Guarda una configuración de petición para reutilizarla más tarde',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nombre identificativo para la petición'
              },
              config: {
                type: 'object',
                description: 'Configuración completa de la petición',
                properties: {
                  url: { type: 'string' },
                  method: { type: 'string' },
                  headers: { type: 'object' },
                  body: { type: 'string' },
                  auth: { type: 'object' }
                }
              },
              collection: {
                type: 'string',
                description: 'Nombre de la colección',
                default: 'default'
              }
            },
            required: ['name', 'config']
          }
        },
        {
          name: 'load_request',
          description: 'Carga una petición guardada previamente',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nombre de la petición guardada'
              },
              collection: {
                type: 'string',
                description: 'Nombre de la colección',
                default: 'default'
              }
            },
            required: ['name']
          }
        },
        {
          name: 'list_saved_requests',
          description: 'Lista todas las peticiones guardadas',
          inputSchema: {
            type: 'object',
            properties: {
              collection: {
                type: 'string',
                description: 'Filtrar por colección específica'
              }
            }
          }
        },
        {
          name: 'test_endpoint_health',
          description: 'Verifica la salud de un endpoint con múltiples peticiones',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL del endpoint'
              },
              requests: {
                type: 'number',
                description: 'Número de peticiones a enviar',
                default: 5
              },
              interval: {
                type: 'number',
                description: 'Intervalo entre peticiones en ms',
                default: 1000
              }
            },
            required: ['url']
          }
        },
        {
          name: 'validate_json_response',
          description: 'Valida la respuesta JSON contra un schema',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL del endpoint'
              },
              method: {
                type: 'string',
                default: 'GET'
              },
              headers: { type: 'object' },
              body: { type: 'string' },
              schema: {
                type: 'object',
                description: 'JSON Schema para validar la respuesta'
              }
            },
            required: ['url', 'schema']
          }
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'send_http_request':
            return await this.sendHttpRequest(args);
          case 'save_request':
            return await this.saveRequest(args);
          case 'load_request':
            return await this.loadRequest(args);
          case 'list_saved_requests':
            return await this.listSavedRequests(args);
          case 'test_endpoint_health':
            return await this.testEndpointHealth(args);
          case 'validate_json_response':
            return await this.validateJsonResponse(args);
          default:
            throw new Error(`Herramienta desconocida: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async sendHttpRequest(args) {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      auth,
      timeout = 10000,
      followRedirects = true,
      validateStatus = false
    } = args;

    try {
      // Configurar headers
      const requestHeaders = { ...headers };
      
      // Configurar autenticación
      if (auth) {
        switch (auth.type) {
          case 'bearer':
            requestHeaders['Authorization'] = `Bearer ${auth.token}`;
            break;
          case 'basic':
            const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
            requestHeaders['Authorization'] = `Basic ${credentials}`;
            break;
          case 'api-key':
            requestHeaders[auth.apiKeyHeader || 'X-API-Key'] = auth.apiKey;
            break;
        }
      }

      // Configurar axios
      const axiosConfig = {
        method: method.toLowerCase(),
        url,
        headers: requestHeaders,
        timeout,
        maxRedirects: followRedirects ? 5 : 0,
        validateStatus: validateStatus ? undefined : () => true
      };

      // Añadir body si existe
      if (body && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
        try {
          axiosConfig.data = JSON.parse(body);
          requestHeaders['Content-Type'] = requestHeaders['Content-Type'] || 'application/json';
        } catch {
          axiosConfig.data = body;
        }
      }

      const startTime = Date.now();
      const response = await axios(axiosConfig);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Formatear respuesta
      const responseData = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        responseTime: `${responseTime}ms`,
        size: JSON.stringify(response.data).length,
        request: {
          url: response.config.url,
          method: response.config.method?.toUpperCase(),
          headers: response.config.headers
        }
      };

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Petición exitosa**\n\n**URL:** ${url}\n**Método:** ${method}\n**Estado:** ${response.status} ${response.statusText}\n**Tiempo:** ${responseTime}ms\n**Tamaño:** ${responseData.size} bytes\n\n**Headers de respuesta:**\n\`\`\`json\n${JSON.stringify(response.headers, null, 2)}\n\`\`\`\n\n**Cuerpo de respuesta:**\n\`\`\`json\n${JSON.stringify(response.data, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      const errorInfo = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        data: error.response?.data
      };

      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error en la petición**\n\n**URL:** ${url}\n**Método:** ${method}\n**Error:** ${error.message}\n\n**Detalles del error:**\n\`\`\`json\n${JSON.stringify(errorInfo, null, 2)}\n\`\`\``,
          },
        ],
        isError: true,
      };
    }
  }

  async saveRequest(args) {
    const { name, config, collection = 'default' } = args;
    
    try {
      const dataDir = path.join(process.cwd(), 'mcp-requests');
      await fs.mkdir(dataDir, { recursive: true });
      
      const filePath = path.join(dataDir, `${collection}.json`);
      
      let requests = {};
      try {
        const data = await fs.readFile(filePath, 'utf8');
        requests = JSON.parse(data);
      } catch (error) {
        // Archivo no existe, crear nuevo
      }
      
      requests[name] = {
        ...config,
        savedAt: new Date().toISOString()
      };
      
      await fs.writeFile(filePath, JSON.stringify(requests, null, 2));
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ **Petición guardada exitosamente**\n\n**Nombre:** ${name}\n**Colección:** ${collection}\n**Guardada en:** ${new Date().toLocaleString()}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Error al guardar la petición: ${error.message}`);
    }
  }

  async loadRequest(args) {
    const { name, collection = 'default' } = args;
    
    try {
      const dataDir = path.join(process.cwd(), 'mcp-requests');
      const filePath = path.join(dataDir, `${collection}.json`);
      
      const data = await fs.readFile(filePath, 'utf8');
      const requests = JSON.parse(data);
      
      if (!requests[name]) {
        throw new Error(`Petición '${name}' no encontrada en la colección '${collection}'`);
      }
      
      const request = requests[name];
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ **Petición cargada**\n\n**Nombre:** ${name}\n**Colección:** ${collection}\n**Guardada:** ${new Date(request.savedAt).toLocaleString()}\n\n**Configuración:**\n\`\`\`json\n${JSON.stringify(request, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Error al cargar la petición: ${error.message}`);
    }
  }

  async listSavedRequests(args) {
    const { collection } = args;
    
    try {
      const dataDir = path.join(process.cwd(), 'mcp-requests');
      const files = await fs.readdir(dataDir).catch(() => []);
      
      const collections = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
      
      if (collections.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📁 **No hay peticiones guardadas**\n\nUsa `save_request` para guardar tu primera petición.',
            },
          ],
        };
      }
      
      let result = '📁 **Peticiones guardadas**\n\n';
      
      for (const col of collections) {
        if (collection && col !== collection) continue;
        
        const filePath = path.join(dataDir, `${col}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        const requests = JSON.parse(data);
        
        result += `**Colección: ${col}**\n`;
        for (const [reqName, reqConfig] of Object.entries(requests)) {
          result += `• ${reqName} (${reqConfig.method || 'GET'} ${reqConfig.url})\n`;
        }
        result += '\n';
      }
      
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Error al listar peticiones: ${error.message}`);
    }
  }

  async testEndpointHealth(args) {
    const { url, requests = 5, interval = 1000 } = args;
    
    const results = [];
    let successCount = 0;
    
    for (let i = 0; i < requests; i++) {
      try {
        const startTime = Date.now();
        const response = await axios.get(url, { timeout: 5000 });
        const responseTime = Date.now() - startTime;
        
        results.push({
          request: i + 1,
          status: response.status,
          responseTime,
          success: true
        });
        
        successCount++;
      } catch (error) {
        results.push({
          request: i + 1,
          status: error.response?.status || 'ERROR',
          responseTime: null,
          success: false,
          error: error.message
        });
      }
      
      if (i < requests - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.responseTime, 0) / successCount || 0;
    
    const successRate = (successCount / requests) * 100;
    
    let resultText = `🏥 **Health Check Results**\n\n`;
    resultText += `**URL:** ${url}\n`;
    resultText += `**Peticiones:** ${requests}\n`;
    resultText += `**Exitosas:** ${successCount}/${requests} (${successRate.toFixed(1)}%)\n`;
    resultText += `**Tiempo promedio:** ${avgResponseTime.toFixed(0)}ms\n\n`;
    
    resultText += `**Detalles:**\n`;
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
      resultText += `${status} Petición ${result.request}: ${result.status} - ${time}\n`;
    });
    
    return {
      content: [
        {
          type: 'text',
          text: resultText,
        },
      ],
    };
  }

  async validateJsonResponse(args) {
    const { url, method = 'GET', headers = {}, body, schema } = args;
    
    try {
      // Hacer la petición
      const response = await this.sendHttpRequest({ url, method, headers, body });
      
      if (response.isError) {
        return response;
      }
      
      // Extraer los datos JSON de la respuesta
      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\*\*Cuerpo de respuesta:\*\*\n```json\n([\s\S]*?)\n```/);
      
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON de la respuesta');
      }
      
      const jsonData = JSON.parse(jsonMatch[1]);
      
      // Validación básica del schema
      const isValid = this.validateSchema(jsonData, schema);
      
      return {
        content: [
          {
            type: 'text',
            text: `🔍 **Validación de Schema**\n\n**URL:** ${url}\n**Método:** ${method}\n**Resultado:** ${isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'}\n\n**Schema esperado:**\n\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\`\n\n**Datos recibidos:**\n\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Error en validación: ${error.message}`);
    }
  }

  validateSchema(data, schema) {
    // Validación básica de tipos
    if (schema.type === 'object' && typeof data !== 'object') return false;
    if (schema.type === 'array' && !Array.isArray(data)) return false;
    if (schema.type === 'string' && typeof data !== 'string') return false;
    if (schema.type === 'number' && typeof data !== 'number') return false;
    if (schema.type === 'boolean' && typeof data !== 'boolean') return false;
    
    // Validar propiedades requeridas
    if (schema.required && schema.type === 'object') {
      for (const prop of schema.required) {
        if (!(prop in data)) return false;
      }
    }
    
    return true;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP API Tester Server running on stdio');
  }
}

const server = new ApiTesterMCPServer();
server.run().catch(console.error);