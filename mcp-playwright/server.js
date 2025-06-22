#!/usr/bin/env node

/**
 * Playwright MCP Server
 * Integrates Playwright browser automation and testing capabilities into Cursor IDE
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const { chromium, firefox, webkit, devices } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

class PlaywrightMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'playwright-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Browser management
    this.browsers = new Map(); // browser type -> browser instance
    this.contexts = new Map(); // context id -> context instance
    this.pages = new Map(); // page id -> page instance
    this.currentPage = null;
    this.currentContext = null;
    
    // Configuration
    this.config = {
      defaultBrowser: 'chromium',
      headless: false,
      timeout: 30000,
      retries: 3,
      baseURL: 'http://localhost:3000',
      viewport: { width: 1280, height: 720 },
      screenshotDir: './screenshots',
      videoDir: './videos',
      traceDir: './traces'
    };

    // Test state
    this.testResults = [];
    this.networkRequests = [];
    this.mockResponses = new Map();

    this.setupDirectories();
    this.setupToolHandlers();
  }

  async setupDirectories() {
    const dirs = [this.config.screenshotDir, this.config.videoDir, this.config.traceDir];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        console.error(`Failed to create directory ${dir}:`, error);
      }
    }
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  getBrowserLauncher(browserType) {
    const browsers = { chromium, firefox, webkit };
    return browsers[browserType] || browsers[this.config.defaultBrowser];
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'playwright_open',
            description: 'Open a URL in the browser with optional browser and configuration',
            inputSchema: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to navigate to',
                },
                browser: {
                  type: 'string',
                  enum: ['chromium', 'firefox', 'webkit'],
                  description: 'Browser type to use',
                  default: 'chromium'
                },
                options: {
                  type: 'object',
                  description: 'Browser launch options',
                  properties: {
                    headless: {
                      type: 'boolean',
                      description: 'Run in headless mode',
                      default: false
                    },
                    viewport: {
                      type: 'object',
                      description: 'Viewport size',
                      properties: {
                        width: { type: 'number', default: 1280 },
                        height: { type: 'number', default: 720 }
                      }
                    },
                    device: {
                      type: 'string',
                      description: 'Device to emulate (e.g., iPhone 12, iPad)'
                    }
                  }
                }
              },
              required: ['url'],
            },
          },
          {
            name: 'playwright_click',
            description: 'Click on an element with smart waiting and retry logic',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'CSS selector, text selector, or role selector',
                },
                options: {
                  type: 'object',
                  description: 'Click options',
                  properties: {
                    timeout: { type: 'number', default: 30000 },
                    force: { type: 'boolean', default: false },
                    noWaitAfter: { type: 'boolean', default: false },
                    button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' },
                    clickCount: { type: 'number', default: 1 },
                    position: {
                      type: 'object',
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' }
                      }
                    }
                  }
                }
              },
              required: ['selector'],
            },
          },
          {
            name: 'playwright_fill',
            description: 'Fill form inputs with automatic clearing and validation',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'Input field selector',
                },
                value: {
                  type: 'string',
                  description: 'Value to fill',
                },
                options: {
                  type: 'object',
                  description: 'Fill options',
                  properties: {
                    timeout: { type: 'number', default: 30000 },
                    force: { type: 'boolean', default: false },
                    noWaitAfter: { type: 'boolean', default: false }
                  }
                }
              },
              required: ['selector', 'value'],
            },
          },
          {
            name: 'playwright_screenshot',
            description: 'Take screenshot of full page or specific element',
            inputSchema: {
              type: 'object',
              properties: {
                path: {
                  type: 'string',
                  description: 'Screenshot file path (optional, auto-generated if not provided)',
                },
                options: {
                  type: 'object',
                  description: 'Screenshot options',
                  properties: {
                    fullPage: { type: 'boolean', default: true },
                    selector: { type: 'string', description: 'Element selector to screenshot' },
                    quality: { type: 'number', minimum: 0, maximum: 100 },
                    type: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
                    omitBackground: { type: 'boolean', default: false },
                    clip: {
                      type: 'object',
                      properties: {
                        x: { type: 'number' },
                        y: { type: 'number' },
                        width: { type: 'number' },
                        height: { type: 'number' }
                      }
                    }
                  }
                }
              },
            },
          },
          {
            name: 'playwright_text',
            description: 'Extract text content from elements',
            inputSchema: {
              type: 'object',
              properties: {
                selector: {
                  type: 'string',
                  description: 'Element selector to extract text from',
                },
                options: {
                  type: 'object',
                  description: 'Text extraction options',
                  properties: {
                    timeout: { type: 'number', default: 30000 },
                    all: { type: 'boolean', description: 'Get all matching elements', default: false }
                  }
                }
              },
              required: ['selector'],
            },
          },
          {
            name: 'playwright_wait_for',
            description: 'Wait for selector, condition, or network state',
            inputSchema: {
              type: 'object',
              properties: {
                condition: {
                  type: 'string',
                  description: 'What to wait for: selector, networkidle, load, domcontentloaded, or custom condition',
                },
                timeout: {
                  type: 'number',
                  description: 'Timeout in milliseconds',
                  default: 30000
                },
                options: {
                  type: 'object',
                  description: 'Wait options',
                  properties: {
                    state: { type: 'string', enum: ['attached', 'detached', 'visible', 'hidden'], default: 'visible' }
                  }
                }
              },
              required: ['condition'],
            },
          },
          {
            name: 'playwright_execute_script',
            description: 'Execute JavaScript in the browser context',
            inputSchema: {
              type: 'object',
              properties: {
                script: {
                  type: 'string',
                  description: 'JavaScript code to execute',
                },
                args: {
                  type: 'array',
                  description: 'Arguments to pass to the script',
                  items: {}
                }
              },
              required: ['script'],
            },
          },
          {
            name: 'playwright_test_runner',
            description: 'Execute a complete test suite with multiple steps',
            inputSchema: {
              type: 'object',
              properties: {
                test_config: {
                  type: 'object',
                  description: 'Test configuration',
                  properties: {
                    name: { type: 'string', description: 'Test name' },
                    steps: {
                      type: 'array',
                      description: 'Array of test steps as strings',
                      items: { type: 'string' }
                    },
                    browsers: {
                      type: 'array',
                      description: 'Browsers to run test on',
                      items: { type: 'string', enum: ['chromium', 'firefox', 'webkit'] }
                    },
                    parallel: { type: 'boolean', default: false },
                    retries: { type: 'number', default: 3 }
                  },
                  required: ['name', 'steps']
                }
              },
              required: ['test_config'],
            },
          },
          {
            name: 'playwright_assert',
            description: 'Perform assertions for testing with built-in matchers',
            inputSchema: {
              type: 'object',
              properties: {
                assertion_type: {
                  type: 'string',
                  enum: ['text', 'visible', 'hidden', 'enabled', 'disabled', 'checked', 'url', 'title', 'count'],
                  description: 'Type of assertion to perform'
                },
                selector: {
                  type: 'string',
                  description: 'Element selector (not needed for url/title assertions)',
                },
                expected_value: {
                  description: 'Expected value for comparison'
                },
                options: {
                  type: 'object',
                  description: 'Assertion options',
                  properties: {
                    timeout: { type: 'number', default: 10000 },
                    ignoreCase: { type: 'boolean', default: false }
                  }
                }
              },
              required: ['assertion_type'],
            },
          },
          {
            name: 'playwright_network_mock',
            description: 'Mock network requests with custom responses',
            inputSchema: {
              type: 'object',
              properties: {
                url_pattern: {
                  type: 'string',
                  description: 'URL pattern to mock (supports wildcards)',
                },
                response_data: {
                  type: 'object',
                  description: 'Mock response configuration',
                  properties: {
                    status: { type: 'number', default: 200 },
                    headers: { type: 'object' },
                    body: { description: 'Response body (string or object)' },
                    delay: { type: 'number', description: 'Response delay in ms' }
                  }
                }
              },
              required: ['url_pattern', 'response_data'],
            },
          },
          {
            name: 'playwright_device_emulation',
            description: 'Emulate mobile devices and set viewport/user agent',
            inputSchema: {
              type: 'object',
              properties: {
                device_name: {
                  type: 'string',
                  description: 'Device name (e.g., iPhone 12, iPad, Pixel 5) or "custom"',
                },
                custom_config: {
                  type: 'object',
                  description: 'Custom device configuration (when device_name is "custom")',
                  properties: {
                    viewport: {
                      type: 'object',
                      properties: {
                        width: { type: 'number' },
                        height: { type: 'number' }
                      }
                    },
                    userAgent: { type: 'string' },
                    deviceScaleFactor: { type: 'number' },
                    isMobile: { type: 'boolean' },
                    hasTouch: { type: 'boolean' }
                  }
                }
              },
              required: ['device_name'],
            },
          },
          {
            name: 'playwright_close_browser',
            description: 'Close browser instances and cleanup resources',
            inputSchema: {
              type: 'object',
              properties: {
                browser_type: {
                  type: 'string',
                  description: 'Specific browser to close, or "all" for all browsers',
                  default: 'all'
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
          case 'playwright_open':
            return await this.openPage(args);
          case 'playwright_click':
            return await this.clickElement(args);
          case 'playwright_fill':
            return await this.fillInput(args);
          case 'playwright_screenshot':
            return await this.takeScreenshot(args);
          case 'playwright_text':
            return await this.extractText(args);
          case 'playwright_wait_for':
            return await this.waitFor(args);
          case 'playwright_execute_script':
            return await this.executeScript(args);
          case 'playwright_test_runner':
            return await this.runTestSuite(args);
          case 'playwright_assert':
            return await this.performAssertion(args);
          case 'playwright_network_mock':
            return await this.setupNetworkMock(args);
          case 'playwright_device_emulation':
            return await this.setupDeviceEmulation(args);
          case 'playwright_close_browser':
            return await this.closeBrowser(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Playwright operation failed: ${error.message}`
        );
      }
    });
  }

  async openPage(args) {
    try {
      const browserType = args.browser || this.config.defaultBrowser;
      const launcher = this.getBrowserLauncher(browserType);
      
      let browser = this.browsers.get(browserType);
      if (!browser) {
        browser = await launcher.launch({ headless: this.config.headless });
        this.browsers.set(browserType, browser);
      }

      const context = await browser.newContext({
        viewport: this.config.viewport
      });
      
      const page = await context.newPage();
      const pageId = this.generateId();
      
      this.pages.set(pageId, page);
      this.currentPage = page;
      this.currentContext = context;

      await page.goto(args.url);

      return {
        content: [
          {
            type: 'text',
            text: `🌐 Page opened successfully!\n` +
                  `URL: ${args.url}\n` +
                  `Browser: ${browserType}\n` +
                  `Page ID: ${pageId}\n` +
                  `Title: ${await page.title()}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to open page: ${error.message}`);
    }
  }

  async clickElement(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      await this.currentPage.click(args.selector);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Clicked element: ${args.selector}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to click element: ${error.message}`);
    }
  }

  async fillInput(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      await this.currentPage.fill(args.selector, args.value);
      return {
        content: [
          {
            type: 'text',
            text: `📝 Filled input: ${args.selector} with "${args.value}"`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to fill input: ${error.message}`);
    }
  }

  async takeScreenshot(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      const fileName = args.path || `screenshot-${Date.now()}.png`;
      const fullPath = path.join(this.config.screenshotDir, fileName);
      
      await this.currentPage.screenshot({ path: fullPath, fullPage: true });
      
      return {
        content: [
          {
            type: 'text',
            text: `📸 Screenshot saved: ${fullPath}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to take screenshot: ${error.message}`);
    }
  }

  async extractText(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      const text = await this.currentPage.textContent(args.selector);
      return {
        content: [
          {
            type: 'text',
            text: `📄 Text from ${args.selector}: "${text}"`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to extract text: ${error.message}`);
    }
  }

  async waitFor(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      await this.currentPage.waitForSelector(args.selector, {
        state: args.options?.state,
        timeout: args.timeout
      });
      return {
        content: [
          {
            type: 'text',
            text: `✅ Wait for ${args.selector} completed successfully`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to wait for selector: ${error.message}`);
    }
  }

  async executeScript(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      const result = await this.currentPage.evaluate(args.script, ...args.args);
      return {
        content: [
          {
            type: 'text',
            text: `💻 Executed script, result: ${JSON.stringify(result)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to execute script: ${error.message}`);
    }
  }

  async runTestSuite(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      const results = await Promise.all(args.test_config.steps.map(async (step) => {
        const [stepName, stepArgs] = step.split(':');
        const result = await this.currentPage.evaluate(stepName, ...stepArgs);
        return { name: stepName, result };
      }));

      return {
        content: [
          {
            type: 'text',
            text: `🏁 Test suite completed, ${results.length} steps executed`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to run test suite: ${error.message}`);
    }
  }

  async performAssertion(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      const result = await this.currentPage.evaluate(args.assertion_type, args.selector, args.expected_value);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Assertion ${args.assertion_type} on ${args.selector} completed successfully, result: ${result}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to perform assertion: ${error.message}`);
    }
  }

  async setupNetworkMock(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      const { url_pattern, response_data } = args;
      const mock = this.mockResponses.get(url_pattern);
      if (mock) {
        throw new McpError(ErrorCode.InvalidRequest, `Network mock already exists for URL pattern: ${url_pattern}`);
      }

      const mockResponse = {
        status: response_data.status,
        headers: response_data.headers,
        body: response_data.body,
        delay: response_data.delay
      };

      this.mockResponses.set(url_pattern, mockResponse);

      return {
        content: [
          {
            type: 'text',
            text: `🌐 Network mock setup successfully for URL pattern: ${url_pattern}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to setup network mock: ${error.message}`);
    }
  }

  async setupDeviceEmulation(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      const { device_name, custom_config } = args;
      const browserType = device_name === 'custom' ? custom_config.browser : device_name;
      const launcher = this.getBrowserLauncher(browserType);
      
      let browser = this.browsers.get(browserType);
      if (!browser) {
        browser = await launcher.launch({ headless: this.config.headless });
        this.browsers.set(browserType, browser);
      }

      const context = await browser.newContext({
        viewport: custom_config?.viewport || this.config.viewport,
        userAgent: custom_config?.userAgent,
        deviceScaleFactor: custom_config?.deviceScaleFactor,
        isMobile: custom_config?.isMobile,
        hasTouch: custom_config?.hasTouch
      });
      
      const page = await context.newPage();
      const pageId = this.generateId();
      
      this.pages.set(pageId, page);
      this.currentPage = page;
      this.currentContext = context;

      await page.goto(this.config.baseURL);

      return {
        content: [
          {
            type: 'text',
            text: `🌐 Device emulation setup successfully for ${device_name}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to setup device emulation: ${error.message}`);
    }
  }

  async closeBrowser(args) {
    try {
      let closed = 0;
      for (const [type, browser] of this.browsers.entries()) {
        await browser.close();
        closed++;
      }
      
      this.browsers.clear();
      this.contexts.clear();
      this.pages.clear();
      this.currentPage = null;
      this.currentContext = null;

      return {
        content: [
          {
            type: 'text',
            text: `🔒 Closed ${closed} browser(s) successfully`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to close browser: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Playwright MCP server running on stdio');
  }
}

const server = new PlaywrightMCPServer();
server.run().catch(console.error); 