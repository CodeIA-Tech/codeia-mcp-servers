#!/usr/bin/env node
/**
 * Diagram Generator
 * 
 * Gera diagramas de arquitetura usando formato compatível com draw.io
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DiagramGenerator {
  constructor(options = {}) {
    this.width = options.width || 1200;
    this.height = options.height || 800;
    this.startX = 50;
    this.startY = 50;
    this.spacing = 200;
  }

  /**
   * Gera diagrama em formato mxGraph (draw.io)
   */
  generateMxGraph(architecture) {
    const { services, databases, caches, queues, external, dependencies } = architecture;
    
    let cells = [];
    let cellId = 2;
    const positions = new Map();

    // Adicionar serviços
    let yPos = this.startY;
    services.forEach((service, idx) => {
      const xPos = this.startX + (idx % 3) * this.spacing;
      if (idx % 3 === 0 && idx > 0) yPos += this.spacing;
      
      cells.push(this.createServiceCell(cellId++, service.name, xPos, yPos, '#4A90E2'));
      positions.set(service.name, cellId - 1);
    });

    // Adicionar databases
    yPos += this.spacing;
    databases.forEach((db, idx) => {
      const xPos = this.startX + idx * this.spacing;
      cells.push(this.createDatabaseCell(cellId++, db.name, xPos, yPos));
      positions.set(db.name, cellId - 1);
    });

    // Adicionar caches
    if (caches.length > 0) {
      yPos += this.spacing;
      caches.forEach((cache, idx) => {
        const xPos = this.startX + idx * this.spacing;
        cells.push(this.createCacheCell(cellId++, cache.name, xPos, yPos));
        positions.set(cache.name, cellId - 1);
      });
    }

    // Adicionar queues
    if (queues.length > 0) {
      yPos += this.spacing;
      queues.forEach((queue, idx) => {
        const xPos = this.startX + idx * this.spacing;
        cells.push(this.createQueueCell(cellId++, queue.name, xPos, yPos));
        positions.set(queue.name, cellId - 1);
      });
    }

    // Adicionar conexões
    dependencies.forEach(dep => {
      const sourceId = positions.get(dep.from);
      const targetId = positions.get(dep.to);
      
      if (sourceId && targetId) {
        cells.push(this.createConnection(cellId++, sourceId, targetId, dep.type));
      }
    });

    return this.wrapInMxGraphXML(cells);
  }

  /**
   * Cria célula de serviço
   */
  createServiceCell(id, name, x, y, color = '#4A90E2') {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${color};fontColor=#ffffff;strokeColor=#2874A6;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="120" height="60" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula de database
   */
  createDatabaseCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#E74C3C;fontColor=#ffffff;strokeColor=#C0392B;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="100" height="80" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula de cache
   */
  createCacheCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fillColor=#F39C12;fontColor=#ffffff;strokeColor=#D68910;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="120" height="60" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula de queue
   */
  createQueueCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fillColor=#27AE60;fontColor=#ffffff;strokeColor=#1E8449;fontSize=12;fontStyle=1" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="120" height="60" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria conexão entre células
   */
  createConnection(id, source, target, type = 'http') {
    const label = type.toUpperCase();
    return `<mxCell id="${id}" value="${label}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=2;strokeColor=#7F8C8D;fontSize=10" edge="1" parent="1" source="${source}" target="${target}">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Envolve células em XML mxGraph
   */
  wrapInMxGraphXML(cells) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Datadog APM Generator" version="21.0.0" type="device">
  <diagram name="Architecture" id="architecture">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${cells.join('\n        ')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
  }

  /**
   * Gera SVG do diagrama para embed em HTML
   */
  generateSVG(architecture) {
    const { services, databases, caches, queues, dependencies } = architecture;
    
    let svgContent = [];
    let yPos = 50;
    const positions = new Map();

    // Adicionar serviços
    services.forEach((service, idx) => {
      const xPos = 50 + (idx % 3) * 200;
      if (idx % 3 === 0 && idx > 0) yPos += 150;
      
      svgContent.push(`
        <g>
          <rect x="${xPos}" y="${yPos}" width="120" height="60" rx="5" fill="#4A90E2" stroke="#2874A6" stroke-width="2"/>
          <text x="${xPos + 60}" y="${yPos + 35}" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${this.escapeXML(service.name)}</text>
        </g>
      `);
      positions.set(service.name, { x: xPos + 60, y: yPos + 60 });
    });

    // Adicionar databases
    yPos += 150;
    databases.forEach((db, idx) => {
      const xPos = 50 + idx * 200;
      svgContent.push(`
        <g>
          <ellipse cx="${xPos + 50}" cy="${yPos}" rx="50" ry="30" fill="#E74C3C" stroke="#C0392B" stroke-width="2"/>
          <ellipse cx="${xPos + 50}" cy="${yPos - 5}" rx="50" ry="8" fill="#C0392B"/>
          <text x="${xPos + 50}" y="${yPos + 5}" text-anchor="middle" fill="white" font-size="11" font-weight="bold">${this.escapeXML(db.name)}</text>
        </g>
      `);
      positions.set(db.name, { x: xPos + 50, y: yPos - 30 });
    });

    // Adicionar conexões
    dependencies.forEach(dep => {
      const from = positions.get(dep.from);
      const to = positions.get(dep.to);
      
      if (from && to) {
        svgContent.push(`
          <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#7F8C8D" stroke-width="2" marker-end="url(#arrowhead)"/>
          <text x="${(from.x + to.x) / 2}" y="${(from.y + to.y) / 2 - 5}" text-anchor="middle" fill="#7F8C8D" font-size="10">${dep.type}</text>
        `);
      }
    });

    return `<svg width="${this.width}" height="${this.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#7F8C8D"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#f9f9f9"/>
  ${svgContent.join('\n  ')}
</svg>`;
  }

  /**
   * Gera HTML5 completo com diagrama interativo
   */
  generateHTML(architecture, title = 'Arquitetura de Serviços') {
    const svg = this.generateSVG(architecture);
    const mxGraph = this.generateMxGraph(architecture);
    const mxGraphBase64 = Buffer.from(mxGraph).toString('base64');
    const drawioUrl = `https://app.diagrams.net/#U${mxGraphBase64}`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 2rem;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
    }
    
    .header h1 {
      margin-bottom: 0.5rem;
    }
    
    .actions {
      background: #f9f9f9;
      padding: 1rem 2rem;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    
    .btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .btn:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .diagram-container {
      padding: 2rem;
      overflow: auto;
    }
    
    .diagram-container svg {
      max-width: 100%;
      height: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }
    
    .legend {
      padding: 2rem;
      background: #f9f9f9;
      border-top: 1px solid #e0e0e0;
    }
    
    .legend h3 {
      margin-bottom: 1rem;
      color: #333;
    }
    
    .legend-items {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .legend-color {
      width: 30px;
      height: 20px;
      border-radius: 3px;
      border: 1px solid rgba(0,0,0,0.2);
    }
    
    .stats {
      padding: 2rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-card h4 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    
    .stat-card p {
      opacity: 0.9;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏗️ ${title}</h1>
      <p>Diagrama gerado automaticamente a partir do Datadog APM</p>
    </div>
    
    <div class="actions">
      <a href="${drawioUrl}" target="_blank" class="btn">
        📝 Editar no draw.io
      </a>
      <button class="btn" onclick="downloadSVG()">
        💾 Download SVG
      </button>
      <button class="btn" onclick="downloadMxGraph()">
        📁 Download draw.io
      </button>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <h4>${architecture.services.length}</h4>
        <p>Serviços</p>
      </div>
      <div class="stat-card">
        <h4>${architecture.databases.length}</h4>
        <p>Databases</p>
      </div>
      <div class="stat-card">
        <h4>${architecture.caches.length}</h4>
        <p>Caches</p>
      </div>
      <div class="stat-card">
        <h4>${architecture.dependencies.length}</h4>
        <p>Dependências</p>
      </div>
    </div>
    
    <div class="diagram-container">
      ${svg}
    </div>
    
    <div class="legend">
      <h3>Legenda</h3>
      <div class="legend-items">
        <div class="legend-item">
          <div class="legend-color" style="background: #4A90E2;"></div>
          <span>Serviço / Aplicação</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #E74C3C;"></div>
          <span>Database</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #F39C12;"></div>
          <span>Cache (Redis, Memcache)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #27AE60;"></div>
          <span>Queue (Kafka, RabbitMQ)</span>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const mxGraphData = \`${mxGraph}\`;
    
    function downloadSVG() {
      const svg = document.querySelector('svg');
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'arquitetura.svg';
      a.click();
      URL.revokeObjectURL(url);
    }
    
    function downloadMxGraph() {
      const blob = new Blob([mxGraphData], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'arquitetura.drawio';
      a.click();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
  }

  /**
   * Escape XML
   */
  escapeXML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Salva diagrama
   */
  async saveDiagram(architecture, outputPath, format = 'html') {
    let content;
    
    switch (format) {
      case 'html':
        content = this.generateHTML(architecture);
        break;
      case 'svg':
        content = this.generateSVG(architecture);
        break;
      case 'drawio':
      case 'xml':
        content = this.generateMxGraph(architecture);
        break;
      default:
        throw new Error(`Formato não suportado: ${format}`);
    }
    
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`✅ Diagrama salvo: ${outputPath}`);
    return outputPath;
  }
}

export default DiagramGenerator;

