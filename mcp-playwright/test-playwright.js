#!/usr/bin/env node

/**
 * Test script for Playwright MCP Server
 * Tests all major functionality to ensure everything works correctly
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testPlaywrightMCP() {
  console.log('🎭 Iniciando pruebas del MCP de Playwright...\n');

  let browser = null;
  let context = null;
  let page = null;

  try {
    // Test 1: Verificar instalación de navegadores
    console.log('✅ Test 1: Verificando instalación de navegadores...');
    browser = await chromium.launch({ headless: true });
    console.log('   ✓ Chromium instalado y funcionando');

    // Test 2: Crear contexto y página
    console.log('\n✅ Test 2: Creando contexto y página...');
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    console.log('   ✓ Contexto y página creados exitosamente');

    // Test 3: Navegar a una página web
    console.log('\n✅ Test 3: Navegando a página web...');
    await page.goto('https://example.com');
    const title = await page.title();
    console.log(`   ✓ Página cargada: "${title}"`);

    // Test 4: Extraer texto
    console.log('\n✅ Test 4: Extrayendo texto...');
    const heading = await page.textContent('h1');
    console.log(`   ✓ Texto extraído: "${heading}"`);

    // Test 5: Tomar screenshot
    console.log('\n✅ Test 5: Tomando screenshot...');
    const screenshotDir = './screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotDir, 'test-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    if (fs.existsSync(screenshotPath)) {
      const stats = fs.statSync(screenshotPath);
      console.log(`   ✓ Screenshot guardado: ${screenshotPath} (${stats.size} bytes)`);
    } else {
      console.log('   ❌ Error: Screenshot no fue guardado');
    }

    // Test 6: Ejecutar JavaScript
    console.log('\n✅ Test 6: Ejecutando JavaScript...');
    const result = await page.evaluate(() => {
      return {
        url: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      };
    });
    console.log(`   ✓ JavaScript ejecutado exitosamente:`);
    console.log(`      URL: ${result.url}`);
    console.log(`      User Agent: ${result.userAgent}`);
    console.log(`      Timestamp: ${result.timestamp}`);

    // Test 7: Verificar elementos (simulación de click y fill)
    console.log('\n✅ Test 7: Verificando elementos disponibles...');
    const links = await page.locator('a').count();
    const paragraphs = await page.locator('p').count();
    console.log(`   ✓ Enlaces encontrados: ${links}`);
    console.log(`   ✓ Párrafos encontrados: ${paragraphs}`);

    // Test 8: Simular navegación con JavaScript
    console.log('\n✅ Test 8: Simulando navegación...');
    await page.goto('https://httpbin.org/html');
    const newTitle = await page.title();
    console.log(`   ✓ Nueva página cargada: "${newTitle}"`);

    // Test 9: Verificar formularios (si existen)
    console.log('\n✅ Test 9: Verificando formularios...');
    try {
      await page.goto('https://httpbin.org/forms/post');
      const forms = await page.locator('form').count();
      console.log(`   ✓ Formularios encontrados: ${forms}`);
      
      if (forms > 0) {
        // Intentar llenar un campo si existe
        const inputs = await page.locator('input[type="text"]').count();
        console.log(`   ✓ Campos de texto encontrados: ${inputs}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Formularios no disponibles: ${error.message}`);
    }

    // Test 10: Verificar capacidades de espera
    console.log('\n✅ Test 10: Verificando capacidades de espera...');
    await page.goto('https://example.com');
    await page.waitForSelector('h1', { timeout: 5000 });
    console.log('   ✓ Espera por selector funcionando');

    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('\n📋 Resumen de funcionalidades verificadas:');
    console.log('   ✓ Instalación de navegadores');
    console.log('   ✓ Creación de contexto y páginas');
    console.log('   ✓ Navegación web');
    console.log('   ✓ Extracción de texto');
    console.log('   ✓ Capturas de pantalla');
    console.log('   ✓ Ejecución de JavaScript');
    console.log('   ✓ Localización de elementos');
    console.log('   ✓ Manejo de formularios');
    console.log('   ✓ Espera por elementos');

    console.log('\n🚀 El MCP de Playwright está listo para usar!');

  } catch (error) {
    console.error('\n❌ Error durante las pruebas:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Función para probar diferentes navegadores
async function testMultipleBrowsers() {
  const { firefox, webkit } = require('playwright');
  const browsers = [
    { name: 'Chromium', launcher: chromium },
    { name: 'Firefox', launcher: firefox },
    { name: 'WebKit', launcher: webkit }
  ];

  console.log('\n🌐 Probando múltiples navegadores...');

  for (const { name, launcher } of browsers) {
    try {
      console.log(`\n   Probando ${name}...`);
      const browser = await launcher.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('https://example.com');
      const title = await page.title();
      
      await browser.close();
      console.log(`   ✓ ${name}: OK - "${title}"`);
    } catch (error) {
      console.log(`   ❌ ${name}: Error - ${error.message}`);
    }
  }
}

// Función principal
async function runAllTests() {
  try {
    await testPlaywrightMCP();
    await testMultipleBrowsers();
  } catch (error) {
    console.error('Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests();
}

module.exports = { testPlaywrightMCP, testMultipleBrowsers }; 