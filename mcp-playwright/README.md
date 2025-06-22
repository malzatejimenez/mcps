# Playwright MCP Server

Un servidor MCP que integra Playwright para automatización de navegador y testing web.

## Funcionalidades

- Automatización web con múltiples navegadores (Chromium, Firefox, WebKit)
- Capturas de pantalla y videos
- Ejecución de tests automatizados
- Simulación de dispositivos móviles
- Mocking de APIs

## Instalación

```bash
cd mcp-playwright
npm install
npm run install-browsers
```

## Configuración Claude Desktop

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["C:\\ruta\\completa\\a\\mcps\\mcp-playwright\\server.js"]
    }
  }
}
```

## Herramientas Disponibles

- `playwright_open(url, browser?)` - Abrir página
- `playwright_click(selector)` - Hacer clic
- `playwright_fill(selector, value)` - Llenar campos
- `playwright_screenshot(path?)` - Captura de pantalla
- `playwright_text(selector)` - Extraer texto
- `playwright_close_browser()` - Cerrar navegador

## Ejemplo de Uso

```typescript
playwright_open("http://localhost:3000");
playwright_fill("#email", "test@example.com");
playwright_click("#login-btn");
playwright_screenshot("result.png");
```

## Licencia

MIT
