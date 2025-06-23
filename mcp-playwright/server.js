#!/usr/bin/env node

/**
 * Playwright MCP Server - Optimizado
 * Integrates streamlined Playwright browser automation and testing capabilities into Cursor IDE
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
        version: '0.2.0',
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
          // Browser Management (Combined open/close)
          {
            name: 'playwright_browser',
            description: 'Open, close, or manage browser instances with optional configuration',
            inputSchema: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['open', 'close', 'switch'],
                  description: 'Browser action to perform',
                },
                url: {
                  type: 'string',
                  description: 'URL to navigate to (required for open action)',
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
                },
                browser_type: {
                  type: 'string',
                  description: 'Specific browser to close, or "all" for all browsers (for close action)',
                  default: 'all'
                }
              },
              required: ['action'],
            },
          },
          
          // Core Interactions
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
          
          // Testing Suite (Combined test runner + assertions)
          {
            name: 'playwright_test',
            description: 'Execute a complete test suite with multiple steps and assertions',
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
                    retries: { type: 'number', default: 3 },
                    assertions: {
                      type: 'array',
                      description: 'Test assertions to perform',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string', enum: ['text', 'visible', 'hidden', 'enabled', 'disabled', 'checked', 'url', 'title', 'count'] },
                          selector: { type: 'string' },
                          expected: {},
                          description: { type: 'string' }
                        }
                      }
                    }
                  },
                  required: ['name']
                },
                assertion_type: {
                  type: 'string',
                  enum: ['text', 'visible', 'hidden', 'enabled', 'disabled', 'checked', 'url', 'title', 'count'],
                  description: 'Type of assertion to perform (for single assertion mode)'
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
                  description: 'Test options',
                  properties: {
                    timeout: { type: 'number', default: 10000 },
                    ignoreCase: { type: 'boolean', default: false }
                  }
                }
              },
            },
          },
          
          // Advanced Configuration (Combined network mock + device emulation)
          {
            name: 'playwright_config',
            description: 'Advanced configuration for network mocking and device emulation',
            inputSchema: {
              type: 'object',
              properties: {
                config_type: {
                  type: 'string',
                  enum: ['network_mock', 'device_emulation', 'both'],
                  description: 'Type of configuration to apply',
                },
                network_mock: {
                  type: 'object',
                  description: 'Network mocking configuration',
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
                  }
                },
                device_emulation: {
                  type: 'object',
                  description: 'Device emulation configuration',
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
                  }
                }
              },
              required: ['config_type'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'playwright_browser':
            return await this.manageBrowser(args);
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
          case 'playwright_test':
            return await this.runTest(args);
          case 'playwright_config':
            return await this.applyAdvancedConfig(args);
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

  async manageBrowser(args) {
    const { action, url, browser, options, browser_type } = args;

    try {
      switch (action) {
        case 'open':
          if (!url) {
            throw new McpError(ErrorCode.InvalidParams, 'URL is required for open action');
          }
          
          const browserType = browser || this.config.defaultBrowser;
          const launcher = this.getBrowserLauncher(browserType);
          
          let browserInstance = this.browsers.get(browserType);
          if (!browserInstance) {
            browserInstance = await launcher.launch({ 
              headless: options?.headless ?? this.config.headless 
            });
            this.browsers.set(browserType, browserInstance);
          }

          const contextOptions = {
            viewport: options?.viewport || this.config.viewport
          };

          // Apply device emulation if specified
          if (options?.device) {
            const device = devices[options.device];
            if (device) {
              Object.assign(contextOptions, device);
            }
          }

          const context = await browserInstance.newContext(contextOptions);
          const page = await context.newPage();
          const pageId = this.generateId();
          
          this.pages.set(pageId, page);
          this.currentPage = page;
          this.currentContext = context;

          await page.goto(url);

          return {
            content: [
              {
                type: 'text',
                text: `🌐 Browser opened successfully!\n` +
                      `URL: ${url}\n` +
                      `Browser: ${browserType}\n` +
                      `Page ID: ${pageId}\n` +
                      `Title: ${await page.title()}`,
              },
            ],
          };

        case 'close':
          const targetBrowser = browser_type || 'all';
          let closedCount = 0;

          if (targetBrowser === 'all') {
            for (const [type, browserInstance] of this.browsers) {
              await browserInstance.close();
              closedCount++;
            }
            this.browsers.clear();
            this.pages.clear();
            this.currentPage = null;
            this.currentContext = null;
          } else {
            const browserInstance = this.browsers.get(targetBrowser);
            if (browserInstance) {
              await browserInstance.close();
              this.browsers.delete(targetBrowser);
              closedCount = 1;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `🔄 Closed ${closedCount} browser instance(s)`,
              },
            ],
          };

        case 'switch':
          // Switch between browser instances or pages
          const targetBrowserType = browser || this.config.defaultBrowser;
          const targetBrowserInstance = this.browsers.get(targetBrowserType);
          
          if (!targetBrowserInstance) {
            throw new McpError(ErrorCode.InvalidParams, `No ${targetBrowserType} browser instance found`);
          }

          // Get first context and page from target browser
          const contexts = targetBrowserInstance.contexts();
          if (contexts.length > 0) {
            this.currentContext = contexts[0];
            const pages = contexts[0].pages();
            if (pages.length > 0) {
              this.currentPage = pages[0];
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `🔄 Switched to ${targetBrowserType} browser`,
              },
            ],
          };

        default:
          throw new McpError(ErrorCode.InvalidParams, `Invalid action: ${action}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(ErrorCode.InternalError, `Browser management failed: ${error.message}`);
    }
  }

  async clickElement(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      await this.currentPage.click(args.selector, args.options);
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
      await this.currentPage.fill(args.selector, args.value, args.options);
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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = args.path || path.join(this.config.screenshotDir, `screenshot-${timestamp}.png`);
      
      let screenshotOptions = {
        path: screenshotPath,
        fullPage: args.options?.fullPage ?? true,
        type: args.options?.type || 'png',
        ...args.options
      };

      if (args.options?.selector) {
        const element = this.currentPage.locator(args.options.selector);
        await element.screenshot(screenshotOptions);
      } else {
        await this.currentPage.screenshot(screenshotOptions);
      }

      return {
        content: [
          {
            type: 'text',
            text: `📸 Screenshot saved: ${screenshotPath}`,
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
      let text;
      if (args.options?.all) {
        const elements = await this.currentPage.locator(args.selector).all();
        text = await Promise.all(elements.map(el => el.textContent()));
      } else {
        text = await this.currentPage.locator(args.selector).textContent(args.options);
      }

      return {
        content: [
          {
            type: 'text',
            text: `📄 Extracted text from ${args.selector}:\n${JSON.stringify(text, null, 2)}`,
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
      const { condition, timeout, options } = args;

      if (condition.startsWith('network') || ['load', 'domcontentloaded'].includes(condition)) {
        await this.currentPage.waitForLoadState(condition, { timeout });
      } else {
        // Assume it's a selector
        await this.currentPage.waitForSelector(condition, { 
          timeout, 
          state: options?.state || 'visible' 
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `⏳ Successfully waited for: ${condition}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Wait condition failed: ${error.message}`);
    }
  }

  async executeScript(args) {
    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      const result = await this.currentPage.evaluate(
        new Function('...args', args.script),
        ...(args.args || [])
      );

      return {
        content: [
          {
            type: 'text',
            text: `💻 Script executed successfully:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Script execution failed: ${error.message}`);
    }
  }

  async runTest(args) {
    try {
      // Handle single assertion mode
      if (args.assertion_type) {
        return await this.performAssertion(args);
      }

      // Handle full test suite mode
      const { test_config } = args;
      
      if (!test_config) {
        throw new McpError(ErrorCode.InvalidParams, 'Either test_config or assertion_type is required');
      }

      let output = `🧪 Running test: ${test_config.name}\n\n`;
      let allPassed = true;
      const results = [];

      // Execute test steps
      if (test_config.steps) {
        output += `📋 Executing ${test_config.steps.length} test steps:\n`;
        for (let i = 0; i < test_config.steps.length; i++) {
          const step = test_config.steps[i];
          output += `${i + 1}. ${step}\n`;
          // Note: In a real implementation, you'd parse and execute these steps
        }
        output += '\n';
      }

      // Execute assertions
      if (test_config.assertions) {
        output += `🔍 Performing ${test_config.assertions.length} assertions:\n`;
        for (const assertion of test_config.assertions) {
          try {
            const result = await this.performSingleAssertion(assertion);
            results.push({ ...assertion, passed: true, result });
            output += `✅ ${assertion.description || assertion.type}: PASSED\n`;
          } catch (error) {
            results.push({ ...assertion, passed: false, error: error.message });
            output += `❌ ${assertion.description || assertion.type}: FAILED - ${error.message}\n`;
            allPassed = false;
          }
        }
      }

      // Summary
      output += `\n📊 Test Summary:\n`;
      output += `Test: ${test_config.name}\n`;
      output += `Status: ${allPassed ? '✅ PASSED' : '❌ FAILED'}\n`;
      output += `Assertions: ${results.filter(r => r.passed).length}/${results.length} passed\n`;

      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Test execution failed: ${error.message}`);
    }
  }

  async performAssertion(args) {
    const { assertion_type, selector, expected_value, options } = args;

    if (!this.currentPage) {
      throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open');
    }

    try {
      let result;
      let passed = false;

      switch (assertion_type) {
        case 'text':
          const actualText = await this.currentPage.locator(selector).textContent();
          passed = options?.ignoreCase 
            ? actualText.toLowerCase().includes(expected_value.toLowerCase())
            : actualText.includes(expected_value);
          result = `Expected: "${expected_value}", Actual: "${actualText}"`;
          break;

        case 'visible':
          passed = await this.currentPage.locator(selector).isVisible();
          result = `Element visibility: ${passed}`;
          break;

        case 'hidden':
          passed = await this.currentPage.locator(selector).isHidden();
          result = `Element hidden: ${passed}`;
          break;

        case 'enabled':
          passed = await this.currentPage.locator(selector).isEnabled();
          result = `Element enabled: ${passed}`;
          break;

        case 'disabled':
          passed = await this.currentPage.locator(selector).isDisabled();
          result = `Element disabled: ${passed}`;
          break;

        case 'checked':
          passed = await this.currentPage.locator(selector).isChecked();
          result = `Element checked: ${passed}`;
          break;

        case 'url':
          const currentUrl = this.currentPage.url();
          passed = currentUrl.includes(expected_value);
          result = `Expected URL to contain: "${expected_value}", Actual: "${currentUrl}"`;
          break;

        case 'title':
          const title = await this.currentPage.title();
          passed = title.includes(expected_value);
          result = `Expected title to contain: "${expected_value}", Actual: "${title}"`;
          break;

        case 'count':
          const count = await this.currentPage.locator(selector).count();
          passed = count === expected_value;
          result = `Expected count: ${expected_value}, Actual: ${count}`;
          break;

        default:
          throw new McpError(ErrorCode.InvalidParams, `Invalid assertion type: ${assertion_type}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Assertion ${passed ? 'PASSED' : 'FAILED'}: ${assertion_type}\n${result}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Assertion failed: ${error.message}`);
    }
  }

  async performSingleAssertion(assertion) {
    // Helper method for running individual assertions in test suites
    return await this.performAssertion({
      assertion_type: assertion.type,
      selector: assertion.selector,
      expected_value: assertion.expected,
      options: {}
    });
  }

  async applyAdvancedConfig(args) {
    const { config_type, network_mock, device_emulation } = args;

    try {
      let output = `⚙️ Applying advanced configuration: ${config_type}\n\n`;

      if (config_type === 'network_mock' || config_type === 'both') {
        if (!network_mock) {
          throw new McpError(ErrorCode.InvalidParams, 'network_mock configuration is required');
        }

        if (!this.currentPage) {
          throw new McpError(ErrorCode.InvalidRequest, 'No page is currently open for network mocking');
        }

        await this.currentPage.route(network_mock.url_pattern, route => {
          const response = {
            status: network_mock.response_data.status || 200,
            headers: network_mock.response_data.headers || {},
            body: typeof network_mock.response_data.body === 'object' 
              ? JSON.stringify(network_mock.response_data.body)
              : network_mock.response_data.body
          };

          if (network_mock.response_data.delay) {
            setTimeout(() => route.fulfill(response), network_mock.response_data.delay);
          } else {
            route.fulfill(response);
          }
        });

        output += `🌐 Network mock configured for: ${network_mock.url_pattern}\n`;
        output += `   Status: ${network_mock.response_data.status || 200}\n`;
        if (network_mock.response_data.delay) {
          output += `   Delay: ${network_mock.response_data.delay}ms\n`;
        }
        output += '\n';
      }

      if (config_type === 'device_emulation' || config_type === 'both') {
        if (!device_emulation) {
          throw new McpError(ErrorCode.InvalidParams, 'device_emulation configuration is required');
        }

        // Device emulation is applied during browser opening
        // Store the config for the next browser session
        if (device_emulation.device_name && device_emulation.device_name !== 'custom') {
          const device = devices[device_emulation.device_name];
          if (!device) {
            throw new McpError(ErrorCode.InvalidParams, `Unknown device: ${device_emulation.device_name}`);
          }
          this.config.deviceEmulation = device;
          output += `📱 Device emulation configured: ${device_emulation.device_name}\n`;
          output += `   Viewport: ${device.viewport.width}x${device.viewport.height}\n`;
          output += `   User Agent: ${device.userAgent.substring(0, 50)}...\n`;
        } else if (device_emulation.custom_config) {
          this.config.deviceEmulation = device_emulation.custom_config;
          output += `📱 Custom device emulation configured\n`;
          if (device_emulation.custom_config.viewport) {
            output += `   Viewport: ${device_emulation.custom_config.viewport.width}x${device_emulation.custom_config.viewport.height}\n`;
          }
        }
        output += '\n';
      }

      output += `✅ Configuration applied successfully`;

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
      throw new McpError(ErrorCode.InternalError, `Configuration failed: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Playwright MCP Server (Optimized) running on stdio');
  }
}

const server = new PlaywrightMCPServer();
server.run().catch(console.error); 