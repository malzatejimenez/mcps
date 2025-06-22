#!/usr/bin/env node

/**
 * Docker MCP Server
 * Provides complete Docker container management through MCP protocol
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
        version: '0.1.0',
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
          // Docker System Commands
          {
            name: 'docker_version',
            description: 'Get Docker version and system information',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'docker_info',
            description: 'Display system-wide Docker information',
            inputSchema: {
              type: 'object',
              properties: {},
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
            name: 'start_container',
            description: 'Start a stopped container',
            inputSchema: {
              type: 'object',
              properties: {
                container: {
                  type: 'string',
                  description: 'Container name or ID',
                }
              },
              required: ['container'],
            },
          },
          {
            name: 'stop_container',
            description: 'Stop a running container',
            inputSchema: {
              type: 'object',
              properties: {
                container: {
                  type: 'string',
                  description: 'Container name or ID',
                },
                timeout: {
                  type: 'number',
                  description: 'Seconds to wait before killing (default: 10)',
                  default: 10
                }
              },
              required: ['container'],
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
          
          // Volume Management
          {
            name: 'list_volumes',
            description: 'List Docker volumes',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'create_volume',
            description: 'Create a volume',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Volume name',
                }
              },
              required: ['name'],
            },
          },
          
          // Network Management
          {
            name: 'list_networks',
            description: 'List Docker networks',
            inputSchema: {
              type: 'object',
              properties: {},
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
          case 'docker_version':
            return await this.dockerVersion();
          case 'docker_info':
            return await this.dockerInfo();
          
          // Container Management
          case 'list_containers':
            return await this.listContainers(args);
          case 'create_container':
            return await this.createContainer(args);
          case 'start_container':
            return await this.startContainer(args.container);
          case 'stop_container':
            return await this.stopContainer(args.container, args.timeout);
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
          
          // Volume Management
          case 'list_volumes':
            return await this.listVolumes();
          case 'create_volume':
            return await this.createVolume(args.name);
          
          // Network Management
          case 'list_networks':
            return await this.listNetworks();
          
          // Cleanup
          case 'docker_prune':
            return await this.dockerPrune(args);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
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

  // Utility function to execute Docker commands
  async executeDockerCommand(command, options = {}) {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: options.timeout || 30000,
        ...options
      });
      
      if (stderr && !options.allowStderr) {
        console.warn('Docker command stderr:', stderr);
      }
      
      return stdout.trim();
    } catch (error) {
      throw new Error(`Docker command failed: ${error.message}`);
    }
  }

  // System Commands
  async dockerVersion() {
    const output = await this.executeDockerCommand('docker version');
    return {
      content: [
        {
          type: 'text',
          text: `🐳 Docker Version Information:\n\n${output}`,
        },
      ],
    };
  }

  async dockerInfo() {
    const output = await this.executeDockerCommand('docker info');
    return {
      content: [
        {
          type: 'text',
          text: `🐳 Docker System Information:\n\n${output}`,
        },
      ],
    };
  }

  // Container Management
  async listContainers(args = {}) {
    let command = 'docker ps';
    if (args.all) command += ' -a';
    if (args.format === 'json') command += ' --format "{{json .}}"';

    const output = await this.executeDockerCommand(command);
    return {
      content: [
        {
          type: 'text',
          text: `📦 Docker Containers:\n\n${output}`,
        },
      ],
    };
  }

  async createContainer(args) {
    let command = 'docker run';
    
    if (args.detached) command += ' -d';
    if (args.name) command += ` --name ${args.name}`;
    
    // Add port mappings
    args.ports?.forEach(port => {
      command += ` -p ${port}`;
    });
    
    // Add environment variables
    args.environment?.forEach(env => {
      command += ` -e "${env}"`;
    });
    
    // Add volume mounts
    args.volumes?.forEach(volume => {
      command += ` -v "${volume}"`;
    });
    
    command += ` ${args.image}`;
    
    if (args.command) {
      command += ` ${args.command}`;
    }

    const output = await this.executeDockerCommand(command);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Container created successfully:\n${output}`,
        },
      ],
    };
  }

  async startContainer(container) {
    const output = await this.executeDockerCommand(`docker start ${container}`);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Container '${container}' started successfully:\n${output}`,
        },
      ],
    };
  }

  async stopContainer(container, timeout = 10) {
    const output = await this.executeDockerCommand(`docker stop -t ${timeout} ${container}`);
    return {
      content: [
        {
          type: 'text',
          text: `⏹️ Container '${container}' stopped successfully:\n${output}`,
        },
      ],
    };
  }

  async removeContainer(container, force = false) {
    let command = `docker rm`;
    if (force) command += ' -f';
    command += ` ${container}`;

    const output = await this.executeDockerCommand(command);
    return {
      content: [
        {
          type: 'text',
          text: `🗑️ Container '${container}' removed successfully:\n${output}`,
        },
      ],
    };
  }

  async containerLogs(args) {
    let command = `docker logs`;
    if (args.tail) command += ` --tail ${args.tail}`;
    if (args.timestamps) command += ' -t';
    command += ` ${args.container}`;

    const output = await this.executeDockerCommand(command, { timeout: 30000 });
    return {
      content: [
        {
          type: 'text',
          text: `📋 Logs for container '${args.container}':\n\n${output}`,
        },
      ],
    };
  }

  async executeInContainer(args) {
    let command = `docker exec`;
    if (args.user) command += ` -u ${args.user}`;
    command += ` ${args.container} ${args.command}`;

    const output = await this.executeDockerCommand(command, { allowStderr: true });
    return {
      content: [
        {
          type: 'text',
          text: `💻 Command execution result in '${args.container}':\n\n${output}`,
        },
      ],
    };
  }

  // Image Management
  async listImages(args = {}) {
    let command = 'docker images';
    if (args.all) command += ' -a';

    const output = await this.executeDockerCommand(command);
    return {
      content: [
        {
          type: 'text',
          text: `📋 Docker Images:\n\n${output}`,
        },
      ],
    };
  }

  async pullImage(image) {
    const output = await this.executeDockerCommand(`docker pull ${image}`, { timeout: 300000 }); // 5 minutes
    return {
      content: [
        {
          type: 'text',
          text: `⬇️ Image pull completed:\n\n${output}`,
        },
      ],
    };
  }

  async removeImage(image, force = false) {
    let command = `docker rmi`;
    if (force) command += ' -f';
    command += ` ${image}`;

    const output = await this.executeDockerCommand(command);
    return {
      content: [
        {
          type: 'text',
          text: `🗑️ Image '${image}' removed:\n\n${output}`,
        },
      ],
    };
  }

  // Volume Management
  async listVolumes() {
    const output = await this.executeDockerCommand('docker volume ls');
    return {
      content: [
        {
          type: 'text',
          text: `💾 Docker Volumes:\n\n${output}`,
        },
      ],
    };
  }

  async createVolume(name) {
    const output = await this.executeDockerCommand(`docker volume create ${name}`);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Volume '${name}' created:\n${output}`,
        },
      ],
    };
  }

  // Network Management
  async listNetworks() {
    const output = await this.executeDockerCommand('docker network ls');
    return {
      content: [
        {
          type: 'text',
          text: `🌐 Docker Networks:\n\n${output}`,
        },
      ],
    };
  }

  // Cleanup Commands
  async dockerPrune(args = {}) {
    let command = `docker ${args.type || 'system'} prune`;
    if (args.force) command += ' -f';

    const output = await this.executeDockerCommand(command);
    return {
      content: [
        {
          type: 'text',
          text: `🧹 Docker cleanup completed:\n\n${output}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Docker MCP server running on stdio');
  }
}

const server = new DockerMCPServer();
server.run().catch(console.error); 