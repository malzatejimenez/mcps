#!/usr/bin/env node

/**
 * Docker MCP Server - Optimizado
 * Provides streamlined Docker container management through MCP protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DockerMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'docker-mcp-server',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Docker System Information (Combined version + info)
          {
            name: 'docker_system_info',
            description: 'Get comprehensive Docker system information including version and system details',
            inputSchema: {
              type: 'object',
              properties: {
                detailed: {
                  type: 'boolean',
                  description: 'Include detailed system information',
                  default: true
                }
              },
            },
          },
          
          // Container Management
          {
            name: 'list_containers',
            description: 'List Docker containers',
            inputSchema: {
              type: 'object',
              properties: {
                all: {
                  type: 'boolean',
                  description: 'Show all containers (default: false, only running)',
                  default: false
                },
                format: {
                  type: 'string',
                  description: 'Format output (table, json)',
                  default: 'table'
                }
              },
            },
          },
          {
            name: 'create_container',
            description: 'Create and run a new container',
            inputSchema: {
              type: 'object',
              properties: {
                image: {
                  type: 'string',
                  description: 'Docker image to use',
                },
                name: {
                  type: 'string',
                  description: 'Container name (optional)',
                },
                ports: {
                  type: 'array',
                  description: 'Port mappings (e.g., ["8080:80", "3000:3000"])',
                  items: { type: 'string' },
                  default: []
                },
                environment: {
                  type: 'array',
                  description: 'Environment variables (e.g., ["NODE_ENV=production"])',
                  items: { type: 'string' },
                  default: []
                },
                volumes: {
                  type: 'array',
                  description: 'Volume mounts (e.g., ["/host/path:/container/path"])',
                  items: { type: 'string' },
                  default: []
                },
                detached: {
                  type: 'boolean',
                  description: 'Run container in background',
                  default: true
                },
                command: {
                  type: 'string',
                  description: 'Command to run in container (optional)',
                }
              },
              required: ['image'],
            },
          },
          {
            name: 'manage_container',
            description: 'Start, stop, or restart a container',
            inputSchema: {
              type: 'object',
              properties: {
                container: {
                  type: 'string',
                  description: 'Container name or ID',
                },
                action: {
                  type: 'string',
                  description: 'Action to perform',
                  enum: ['start', 'stop', 'restart'],
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in seconds for stop operation (default: 10)',
                  default: 10
                }
              },
              required: ['container', 'action'],
            },
          },
          {
            name: 'remove_container',
            description: 'Remove a container',
            inputSchema: {
              type: 'object',
              properties: {
                container: {
                  type: 'string',
                  description: 'Container name or ID',
                },
                force: {
                  type: 'boolean',
                  description: 'Force removal of running container',
                  default: false
                }
              },
              required: ['container'],
            },
          },
          {
            name: 'container_logs',
            description: 'Get container logs',
            inputSchema: {
              type: 'object',
              properties: {
                container: {
                  type: 'string',
                  description: 'Container name or ID',
                },
                tail: {
                  type: 'number',
                  description: 'Number of lines to show from end (default: 100)',
                  default: 100
                },
                timestamps: {
                  type: 'boolean',
                  description: 'Show timestamps',
                  default: true
                }
              },
              required: ['container'],
            },
          },
          {
            name: 'execute_in_container',
            description: 'Execute a command in a running container',
            inputSchema: {
              type: 'object',
              properties: {
                container: {
                  type: 'string',
                  description: 'Container name or ID',
                },
                command: {
                  type: 'string',
                  description: 'Command to execute',
                },
                user: {
                  type: 'string',
                  description: 'Username or UID (optional)',
                }
              },
              required: ['container', 'command'],
            },
          },
          
          // Image Management
          {
            name: 'list_images',
            description: 'List Docker images',
            inputSchema: {
              type: 'object',
              properties: {
                all: {
                  type: 'boolean',
                  description: 'Show all images (default: false)',
                  default: false
                }
              },
            },
          },
          {
            name: 'pull_image',
            description: 'Pull an image from a registry',
            inputSchema: {
              type: 'object',
              properties: {
                image: {
                  type: 'string',
                  description: 'Image name and tag (e.g., nginx:latest)',
                }
              },
              required: ['image'],
            },
          },
          {
            name: 'remove_image',
            description: 'Remove one or more images',
            inputSchema: {
              type: 'object',
              properties: {
                image: {
                  type: 'string',
                  description: 'Image name or ID',
                },
                force: {
                  type: 'boolean',
                  description: 'Force removal',
                  default: false
                }
              },
              required: ['image'],
            },
          },
          
          // Resource Management (Volumes and Networks)
          {
            name: 'manage_resources',
            description: 'List or create Docker volumes and networks',
            inputSchema: {
              type: 'object',
              properties: {
                resource_type: {
                  type: 'string',
                  description: 'Type of resource to manage',
                  enum: ['volumes', 'networks'],
                },
                action: {
                  type: 'string',
                  description: 'Action to perform',
                  enum: ['list', 'create'],
                },
                name: {
                  type: 'string',
                  description: 'Name for create operations (required for create)',
                }
              },
              required: ['resource_type', 'action'],
            },
          },
          
          // Cleanup Commands
          {
            name: 'docker_prune',
            description: 'Remove unused Docker objects (containers, images, networks, volumes)',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Type to prune (system, container, image, volume, network)',
                  enum: ['system', 'container', 'image', 'volume', 'network'],
                  default: 'system'
                },
                force: {
                  type: 'boolean',
                  description: 'Do not prompt for confirmation',
                  default: true
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
          // System Commands
          case 'docker_system_info':
            return await this.dockerSystemInfo(args);
          
          // Container Management
          case 'list_containers':
            return await this.listContainers(args);
          case 'create_container':
            return await this.createContainer(args);
          case 'manage_container':
            return await this.manageContainer(args);
          case 'remove_container':
            return await this.removeContainer(args.container, args.force);
          case 'container_logs':
            return await this.containerLogs(args);
          case 'execute_in_container':
            return await this.executeInContainer(args);
          
          // Image Management
          case 'list_images':
            return await this.listImages(args);
          case 'pull_image':
            return await this.pullImage(args.image);
          case 'remove_image':
            return await this.removeImage(args.image, args.force);
          
          // Resource Management
          case 'manage_resources':
            return await this.manageResources(args);
          
          // Cleanup
          case 'docker_prune':
            return await this.dockerPrune(args);

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
          `Docker operation failed: ${error.message}`
        );
      }
    });
  }

  async executeDockerCommand(command, options = {}) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout || 30000,
        ...options
      });
      
      return {
        content: [
          {
            type: 'text',
            text: stdout || stderr || 'Command executed successfully'
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Docker command failed: ${error.message}`
      );
    }
  }

  async dockerSystemInfo(args = {}) {
    try {
      let output = '=== DOCKER SYSTEM INFORMATION ===\n\n';
      
      // Get version info
      const { stdout: versionOut } = await execAsync('docker version --format json');
      const versionInfo = JSON.parse(versionOut);
      
      output += '📋 VERSION INFORMATION:\n';
      output += `Client Version: ${versionInfo.Client.Version}\n`;
      output += `Server Version: ${versionInfo.Server.Version}\n`;
      output += `API Version: ${versionInfo.Client.ApiVersion}\n\n`;
      
      if (args.detailed) {
        // Get detailed system info
        const { stdout: infoOut } = await execAsync('docker system df');
        output += '💾 SYSTEM USAGE:\n';
        output += infoOut + '\n';
        
        const { stdout: statusOut } = await execAsync('docker system info --format "{{.ContainersRunning}} running, {{.ContainersStopped}} stopped, {{.Images}} images"');
        output += '📊 SYSTEM STATUS:\n';
        output += statusOut + '\n';
      }

      return {
        content: [
          {
            type: 'text',
            text: output
          }
        ]
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to get Docker system info: ${error.message}`
      );
    }
  }

  async listContainers(args = {}) {
    const allFlag = args.all ? '-a' : '';
    const formatFlag = args.format === 'json' ? '--format "{{json .}}"' : '';
    
    return await this.executeDockerCommand(`docker ps ${allFlag} ${formatFlag}`);
  }

  async createContainer(args) {
    const { image, name, ports, environment, volumes, detached, command } = args;
    
    let dockerCommand = 'docker run';
    
    if (detached) dockerCommand += ' -d';
    if (name) dockerCommand += ` --name ${name}`;
    
    // Add port mappings
    ports.forEach(port => {
      dockerCommand += ` -p ${port}`;
    });
    
    // Add environment variables
    environment.forEach(env => {
      dockerCommand += ` -e "${env}"`;
    });
    
    // Add volume mounts
    volumes.forEach(volume => {
      dockerCommand += ` -v ${volume}`;
    });
    
    dockerCommand += ` ${image}`;
    
    if (command) dockerCommand += ` ${command}`;
    
    return await this.executeDockerCommand(dockerCommand);
  }

  async manageContainer(args) {
    const { container, action, timeout } = args;
    
    let command;
    switch (action) {
      case 'start':
        command = `docker start ${container}`;
        break;
      case 'stop':
        command = `docker stop --time ${timeout || 10} ${container}`;
        break;
      case 'restart':
        command = `docker restart --time ${timeout || 10} ${container}`;
        break;
      default:
        throw new McpError(ErrorCode.InvalidParams, `Invalid action: ${action}`);
    }
    
    return await this.executeDockerCommand(command);
  }

  async removeContainer(container, force = false) {
    const forceFlag = force ? '-f' : '';
    return await this.executeDockerCommand(`docker rm ${forceFlag} ${container}`);
  }

  async containerLogs(args) {
    const { container, tail, timestamps } = args;
    
    let command = `docker logs`;
    if (tail) command += ` --tail ${tail}`;
    if (timestamps) command += ' --timestamps';
    command += ` ${container}`;
    
    return await this.executeDockerCommand(command);
  }

  async executeInContainer(args) {
    const { container, command, user } = args;
    
    let dockerCommand = `docker exec`;
    if (user) dockerCommand += ` --user ${user}`;
    dockerCommand += ` ${container} ${command}`;
    
    return await this.executeDockerCommand(dockerCommand);
  }

  async listImages(args = {}) {
    const allFlag = args.all ? '-a' : '';
    return await this.executeDockerCommand(`docker images ${allFlag}`);
  }

  async pullImage(image) {
    return await this.executeDockerCommand(`docker pull ${image}`);
  }

  async removeImage(image, force = false) {
    const forceFlag = force ? '-f' : '';
    return await this.executeDockerCommand(`docker rmi ${forceFlag} ${image}`);
  }

  async manageResources(args) {
    const { resource_type, action, name } = args;
    
    if (action === 'list') {
      if (resource_type === 'volumes') {
        return await this.executeDockerCommand('docker volume ls');
      } else if (resource_type === 'networks') {
        return await this.executeDockerCommand('docker network ls');
      }
    } else if (action === 'create') {
      if (!name) {
        throw new McpError(ErrorCode.InvalidParams, 'Name is required for create operations');
      }
      
      if (resource_type === 'volumes') {
        return await this.executeDockerCommand(`docker volume create ${name}`);
      } else if (resource_type === 'networks') {
        return await this.executeDockerCommand(`docker network create ${name}`);
      }
    }
    
    throw new McpError(ErrorCode.InvalidParams, `Invalid resource_type or action: ${resource_type}/${action}`);
  }

  async dockerPrune(args = {}) {
    const { type, force } = args;
    const forceFlag = force ? '-f' : '';
    
    let command;
    switch (type) {
      case 'system':
        command = `docker system prune ${forceFlag}`;
        break;
      case 'container':
        command = `docker container prune ${forceFlag}`;
        break;
      case 'image':
        command = `docker image prune ${forceFlag}`;
        break;
      case 'volume':
        command = `docker volume prune ${forceFlag}`;
        break;
      case 'network':
        command = `docker network prune ${forceFlag}`;
        break;
      default:
        command = `docker system prune ${forceFlag}`;
    }
    
    return await this.executeDockerCommand(command);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Docker MCP Server (Optimized) running on stdio');
  }
}

const server = new DockerMCPServer();
server.run().catch(console.error); 