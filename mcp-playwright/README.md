# Playwright MCP Server - Optimizado

Playwright MCP Server optimizado para automatización de navegadores web y testing. Integra perfectamente las capacidades de Playwright en Cursor IDE con una interfaz simplificada.

## 🎯 Optimizaciones Realizadas

**Reducción de herramientas: 13 → 9 (-31%)**

### Consolidaciones:

- `playwright_open` + `playwright_close_browser` → `playwright_browser`
- `playwright_test_runner` + `playwright_assert` → `playwright_test`
- `playwright_network_mock` + `playwright_device_emulation` → `playwright_config`

## 🚀 Instalación

```bash
npm install
```

## 🛠️ Herramientas Disponibles

### 1. playwright_browser

**Gestión unificada de navegadores**

- **Acciones:** `open`, `close`, `switch`
- **Navegadores:** chromium, firefox, webkit
- **Configuración:** viewport, device emulation, modo headless

```typescript
// Abrir navegador
{
  action: "open",
  url: "https://example.com",
  browser: "chromium",
  options: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    device: "iPhone 12"
  }
}

// Cerrar navegadores
{
  action: "close",
  browser_type: "all" // o un tipo específico
}
```

### 2. playwright_click

**Interacciones con elementos**

```typescript
{
  selector: "button[data-testid='submit']",
  options: {
    timeout: 30000,
    button: "left",
    clickCount: 1
  }
}
```

### 3. playwright_fill

**Llenado de formularios**

```typescript
{
  selector: "input[name='email']",
  value: "test@example.com",
  options: {
    timeout: 30000,
    force: false
  }
}
```

### 4. playwright_screenshot

**Capturas de pantalla avanzadas**

```typescript
{
  path: "./screenshots/test.png",
  options: {
    fullPage: true,
    selector: ".main-content", // Screenshot de elemento específico
    type: "png",
    quality: 90
  }
}
```

### 5. playwright_text

**Extracción de texto**

```typescript
{
  selector: ".product-title",
  options: {
    all: false, // true para todos los elementos coincidentes
    timeout: 30000
  }
}
```

### 6. playwright_wait_for

**Esperas inteligentes**

```typescript
{
  condition: "networkidle", // o selector, load, domcontentloaded
  timeout: 30000,
  options: {
    state: "visible" // attached, detached, visible, hidden
  }
}
```

### 7. playwright_execute_script

**Ejecución de JavaScript**

```typescript
{
  script: "return document.title;",
  args: [] // argumentos opcionales
}
```

### 8. playwright_test ⭐

**Testing completo con assertions**

#### Modo Test Suite Completo:

```typescript
{
  test_config: {
    name: "Login Test",
    steps: [
      "Navigate to login page",
      "Fill username",
      "Fill password",
      "Click submit"
    ],
    assertions: [
      {
        type: "text",
        selector: ".welcome-message",
        expected: "Welcome",
        description: "Check welcome message"
      },
      {
        type: "url",
        expected: "/dashboard",
        description: "Check redirect to dashboard"
      }
    ],
    browsers: ["chromium", "firefox"],
    parallel: false,
    retries: 3
  }
}
```

#### Modo Assertion Individual:

```typescript
{
  assertion_type: "visible",
  selector: ".success-message",
  expected_value: true,
  options: {
    timeout: 10000,
    ignoreCase: false
  }
}
```

**Tipos de assertions disponibles:**

- `text`: Verificar contenido de texto
- `visible`: Verificar visibilidad
- `hidden`: Verificar que esté oculto
- `enabled`: Verificar que esté habilitado
- `disabled`: Verificar que esté deshabilitado
- `checked`: Verificar checkbox marcado
- `url`: Verificar URL actual
- `title`: Verificar título de página
- `count`: Verificar número de elementos

### 9. playwright_config ⭐

**Configuración avanzada unificada**

#### Network Mocking:

```typescript
{
  config_type: "network_mock",
  network_mock: {
    url_pattern: "**/api/users",
    response_data: {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { users: [] },
      delay: 1000
    }
  }
}
```

#### Device Emulation:

```typescript
{
  config_type: "device_emulation",
  device_emulation: {
    device_name: "iPhone 12" // o "custom"
    // Para custom:
    custom_config: {
      viewport: { width: 375, height: 812 },
      userAgent: "...",
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true
    }
  }
}
```

#### Configuración Combinada:

```typescript
{
  config_type: "both",
  network_mock: { /* ... */ },
  device_emulation: { /* ... */ }
}
```

## 📱 Dispositivos Soportados

- iPhone 12, iPhone 12 Pro, iPhone 13
- iPad, iPad Pro
- Samsung Galaxy S21, Pixel 5
- Desktop (1920x1080, 1366x768)
- Custom configurations

## 🔧 Configuración

El servidor usa estas configuraciones por defecto:

```javascript
{
  defaultBrowser: 'chromium',
  headless: false,
  timeout: 30000,
  retries: 3,
  viewport: { width: 1280, height: 720 },
  screenshotDir: './screenshots',
  videoDir: './videos',
  traceDir: './traces'
}
```

## 🚦 Flujo de Trabajo Típico

```typescript
// 1. Abrir navegador
playwright_browser({
  action: "open",
  url: "https://myapp.com",
  browser: "chromium",
});

// 2. Configurar mocks si es necesario
playwright_config({
  config_type: "network_mock",
  network_mock: {
    url_pattern: "**/api/data",
    response_data: { status: 200, body: { success: true } },
  },
});

// 3. Interactuar con la página
playwright_fill({
  selector: "#username",
  value: "testuser",
});

playwright_click({
  selector: "#login-btn",
});

// 4. Realizar tests
playwright_test({
  assertion_type: "text",
  selector: ".dashboard-title",
  expected_value: "Dashboard",
});

// 5. Capturar evidencia
playwright_screenshot({
  path: "./evidence/login-success.png",
});

// 6. Cerrar navegador
playwright_browser({
  action: "close",
});
```

## 🎨 Beneficios de la Optimización

### ✅ Ventajas:

- **Simplicidad**: Menos herramientas para aprender
- **Coherencia**: Funciones relacionadas agrupadas lógicamente
- **Eficiencia**: Menos decisiones para el usuario
- **Potencia**: Mantiene toda la funcionalidad original
- **Escalabilidad**: Estructura más fácil de extender

### 🔄 Compatibilidad:

- ✅ Todas las funcionalidades previas mantenidas
- ✅ Parámetros más intuitivos y organizados
- ✅ Mejor manejo de errores
- ✅ Documentación mejorada

## 🧪 Casos de Uso

### E2E Testing

```typescript
playwright_test({
  test_config: {
    name: "Complete User Journey",
    steps: ["Login", "Browse products", "Add to cart", "Checkout"],
    assertions: [
      { type: "url", expected: "/success" },
      { type: "text", selector: ".order-number", expected: "ORD-" },
    ],
  },
});
```

### API Testing con Mocks

```typescript
playwright_config({
  config_type: "network_mock",
  network_mock: {
    url_pattern: "**/api/orders",
    response_data: {
      status: 500,
      body: { error: "Server Error" },
    },
  },
});
```

### Mobile Testing

```typescript
playwright_browser({
  action: "open",
  url: "https://mobile-app.com",
  options: { device: "iPhone 12" },
});
```

## 📊 Comparación: Antes vs Después

| Aspecto                | Antes (13 tools)  | Después (9 tools)   | Mejora       |
| ---------------------- | ----------------- | ------------------- | ------------ |
| **Browser Management** | 2 tools separadas | 1 tool unificada    | -50%         |
| **Testing**            | 2 tools separadas | 1 tool completa     | -50%         |
| **Configuration**      | 2 tools separadas | 1 tool avanzada     | -50%         |
| **Core Features**      | 7 tools           | 6 tools optimizadas | -14%         |
| **Funcionalidad**      | 100%              | 100%                | ✅ Mantenida |
| **Complejidad**        | Alta              | Baja                | ⬇️ Reducida  |

La optimización del Playwright MCP reduce significativamente la complejidad mientras mantiene toda la potencia y flexibilidad del framework original.

## Licencia

MIT
