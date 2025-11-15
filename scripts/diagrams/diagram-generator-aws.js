#!/usr/bin/env node
/**
 * Diagram Generator com ícones AWS e cloud providers
 * 
 * Usa shapes oficiais da AWS, Azure, GCP, Kubernetes no draw.io
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DiagramGeneratorAWS {
  constructor(options = {}) {
    this.width = options.width || 1600;
    this.height = options.height || 1200;
    this.startX = 100;
    this.startY = 100;
    this.spacing = 250;
    this.iconSize = 78; // Tamanho padrão dos ícones AWS
  }

  /**
   * Cria célula com ícone AWS EC2
   */
  createEC2Cell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;gradientColor=#F78E04;gradientDirection=north;fillColor=#D05C17;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${this.iconSize}" height="${this.iconSize}" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula com ícone AWS RDS
   */
  createRDSCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;gradientColor=#4D72F3;gradientDirection=north;fillColor=#3334B9;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.rds;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${this.iconSize}" height="${this.iconSize}" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula com ícone AWS ElastiCache (Redis)
   */
  createElastiCacheCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;gradientColor=#4D72F3;gradientDirection=north;fillColor=#3334B9;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elasticache;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${this.iconSize}" height="${this.iconSize}" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula com ícone AWS SQS
   */
  createSQSCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;gradientColor=#FF4F8B;gradientDirection=north;fillColor=#BC1356;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sqs;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${this.iconSize}" height="${this.iconSize}" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula com ícone AWS Lambda
   */
  createLambdaCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;gradientColor=#F78E04;gradientDirection=north;fillColor=#D05C17;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${this.iconSize}" height="${this.iconSize}" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula com ícone AWS API Gateway
   */
  createAPIGatewayCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;gradientColor=#FF4F8B;gradientDirection=north;fillColor=#BC1356;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.api_gateway;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${this.iconSize}" height="${this.iconSize}" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula com ícone AWS ECS/Container
   */
  createECSCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="sketch=0;points=[[0,0,0],[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0,0],[0,1,0],[0.25,1,0],[0.5,1,0],[0.75,1,0],[1,1,0],[0,0.25,0],[0,0.5,0],[0,0.75,0],[1,0.25,0],[1,0.5,0],[1,0.75,0]];outlineConnect=0;fontColor=#232F3E;gradientColor=#F78E04;gradientDirection=north;fillColor=#D05C17;strokeColor=#ffffff;dashed=0;verticalLabelPosition=bottom;verticalAlign=top;align=center;html=1;fontSize=12;fontStyle=0;aspect=fixed;shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ecs;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${this.iconSize}" height="${this.iconSize}" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Cria célula com ícone Kubernetes Pod
   */
  createK8sPodCell(id, name, x, y) {
    return `<mxCell id="${id}" value="${this.escapeXML(name)}" style="sketch=0;html=1;dashed=0;whitespace=wrap;fillColor=#2188D6;strokeColor=#ffffff;points=[[0.005,0.63,0],[0.1,0.2,0],[0.9,0.2,0],[0.5,0,0],[0.995,0.63,0],[0.72,0.99,0],[0.5,1,0],[0.28,0.99,0]];verticalLabelPosition=bottom;align=center;verticalAlign=top;shape=mxgraph.kubernetes.icon;prIcon=pod" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="${this.iconSize}" height="${this.iconSize}" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Determina qual ícone usar baseado no serviço
   */
  identifyServiceIcon(service) {
    const name = service.name.toLowerCase();
    
    // EC2 / Tomcat
    if (name.includes('tomcat') || name.includes('ec2')) {
      return 'ec2';
    }
    
    // Container / ECS / Kubernetes
    if (name.includes('eks') || name.includes('kubernetes') || name.includes('k8s')) {
      return 'k8s';
    }
    if (name.includes('ecs') || name.includes('container') || name.includes('docker')) {
      return 'ecs';
    }
    
    // Lambda
    if (name.includes('lambda') || name.includes('function') || name.includes('worker')) {
      return 'lambda';
    }
    
    // API Gateway
    if (name.includes('api-gateway') || name.includes('gateway')) {
      return 'apigateway';
    }
    
    // Default para serviços
    return 'ec2';
  }

  /**
   * Gera diagrama em formato mxGraph com ícones AWS
   */
  generateMxGraph(architecture) {
    const { services, databases, caches, queues, dependencies } = architecture;
    
    let cells = [];
    let cellId = 2;
    const positions = new Map();

    // Adicionar serviços com ícones apropriados
    console.log('\n🎨 Adicionando serviços com ícones AWS...');
    let yPos = this.startY;
    services.forEach((service, idx) => {
      const xPos = this.startX + (idx % 4) * this.spacing;
      if (idx % 4 === 0 && idx > 0) yPos += this.spacing;
      
      const iconType = this.identifyServiceIcon(service);
      let cell;
      
      switch (iconType) {
        case 'k8s':
          cell = this.createK8sPodCell(cellId, service.name, xPos, yPos);
          console.log(`   ☸️  ${service.name} → Kubernetes Pod`);
          break;
        case 'ecs':
          cell = this.createECSCell(cellId, service.name, xPos, yPos);
          console.log(`   🐳 ${service.name} → ECS/Container`);
          break;
        case 'lambda':
          cell = this.createLambdaCell(cellId, service.name, xPos, yPos);
          console.log(`   ⚡ ${service.name} → Lambda`);
          break;
        case 'apigateway':
          cell = this.createAPIGatewayCell(cellId, service.name, xPos, yPos);
          console.log(`   🚪 ${service.name} → API Gateway`);
          break;
        default:
          cell = this.createEC2Cell(cellId, service.name, xPos, yPos);
          console.log(`   🖥️  ${service.name} → EC2`);
      }
      
      cells.push(cell);
      positions.set(service.name, cellId);
      cellId++;
    });

    // Adicionar databases com ícone RDS
    if (databases.length > 0) {
      yPos += this.spacing;
      console.log('\n💾 Adicionando databases com ícones RDS...');
      databases.forEach((db, idx) => {
        const xPos = this.startX + idx * this.spacing;
        cells.push(this.createRDSCell(cellId, db.name, xPos, yPos));
        console.log(`   🗄️  ${db.name} → RDS`);
        positions.set(db.name, cellId);
        cellId++;
      });
    }

    // Adicionar caches com ícone ElastiCache
    if (caches.length > 0) {
      yPos += this.spacing;
      console.log('\n🗄️  Adicionando caches com ícones ElastiCache...');
      caches.forEach((cache, idx) => {
        const xPos = this.startX + idx * this.spacing;
        cells.push(this.createElastiCacheCell(cellId, cache.name, xPos, yPos));
        console.log(`   ⚡ ${cache.name} → ElastiCache`);
        positions.set(cache.name, cellId);
        cellId++;
      });
    }

    // Adicionar queues com ícone SQS
    if (queues.length > 0) {
      yPos += this.spacing;
      console.log('\n📬 Adicionando queues com ícones SQS...');
      queues.forEach((queue, idx) => {
        const xPos = this.startX + idx * this.spacing;
        cells.push(this.createSQSCell(cellId, queue.name, xPos, yPos));
        console.log(`   📮 ${queue.name} → SQS`);
        positions.set(queue.name, cellId);
        cellId++;
      });
    }

    // Adicionar conexões
    console.log('\n🔗 Adicionando conexões...');
    dependencies.forEach(dep => {
      const sourceId = positions.get(dep.from);
      const targetId = positions.get(dep.to);
      
      if (sourceId && targetId) {
        cells.push(this.createConnection(cellId, sourceId, targetId, dep.type));
        cellId++;
      }
    });

    return this.wrapInMxGraphXML(cells);
  }

  /**
   * Cria conexão entre células
   */
  createConnection(id, source, target, type = 'http') {
    const label = type.toUpperCase();
    return `<mxCell id="${id}" value="${label}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeWidth=2;strokeColor=#545B64;fontSize=10;fontColor=#232F3E;" edge="1" parent="1" source="${source}" target="${target}">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>`;
  }

  /**
   * Envolve células em XML mxGraph
   */
  wrapInMxGraphXML(cells) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Datadog APM Generator AWS" version="21.0.0" type="device">
  <diagram name="AWS Architecture" id="aws-architecture">
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
   * Gera HTML5 completo com instruções para bibliotecas AWS
   */
  generateHTML(architecture, title = 'Arquitetura AWS') {
    const mxGraph = this.generateMxGraph(architecture);
    const mxGraphBase64 = Buffer.from(mxGraph).toString('base64');
    const drawioUrl = `https://app.diagrams.net/?libs=aws4;kubernetes#U${mxGraphBase64}`;

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
      max-width: 1600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #FF9900 0%, #FF6600 100%);
      color: white;
      padding: 2rem;
    }
    
    .header h1 {
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .aws-badge {
      background: white;
      color: #FF9900;
      padding: 0.3rem 0.8rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
    }
    
    .actions {
      background: #f9f9f9;
      padding: 1rem 2rem;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
    }
    
    .btn {
      background: #FF9900;
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
      background: #FF6600;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .btn-secondary {
      background: #232F3E;
    }
    
    .btn-secondary:hover {
      background: #37475A;
    }
    
    .info-box {
      background: #FFF4E6;
      border-left: 4px solid #FF9900;
      padding: 1.5rem;
      margin: 2rem;
    }
    
    .info-box h3 {
      color: #FF9900;
      margin-bottom: 1rem;
    }
    
    .info-box ul {
      list-style: none;
      padding: 0;
    }
    
    .info-box li {
      padding: 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .stats {
      padding: 2rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #FF9900 0%, #FF6600 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-card h4 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }
    
    .icon-legend {
      padding: 2rem;
      background: #f9f9f9;
    }
    
    .icon-legend h3 {
      margin-bottom: 1.5rem;
      color: #232F3E;
    }
    
    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }
    
    .icon-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: white;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    
    .icon-preview {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        🏗️ ${title}
        <span class="aws-badge">AWS ICONS</span>
      </h1>
      <p>Diagrama gerado automaticamente com ícones oficiais da AWS</p>
    </div>
    
    <div class="actions">
      <a href="${drawioUrl}" target="_blank" class="btn">
        📝 Editar no draw.io (com bibliotecas AWS carregadas)
      </a>
      <button class="btn btn-secondary" onclick="downloadDrawio()">
        💾 Download arquivo .drawio
      </button>
    </div>
    
    <div class="info-box">
      <h3>✨ Bibliotecas AWS Incluídas</h3>
      <p>Este diagrama usa ícones oficiais da AWS e Kubernetes. Ao abrir no draw.io, as bibliotecas já estarão carregadas!</p>
      <ul>
        <li>✅ AWS Architecture Icons (aws4)</li>
        <li>✅ Kubernetes Icons</li>
        <li>💡 Você pode adicionar mais: Azure, GCP, Terraform, etc.</li>
      </ul>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <h4>${architecture.services.length}</h4>
        <p>Serviços / Aplicações</p>
      </div>
      <div class="stat-card">
        <h4>${architecture.databases.length}</h4>
        <p>Databases (RDS)</p>
      </div>
      <div class="stat-card">
        <h4>${architecture.caches.length}</h4>
        <p>Caches (ElastiCache)</p>
      </div>
      <div class="stat-card">
        <h4>${architecture.dependencies.length}</h4>
        <p>Conexões</p>
      </div>
    </div>
    
    <div class="icon-legend">
      <h3>🎨 Ícones Disponíveis no Diagrama</h3>
      <div class="icon-grid">
        <div class="icon-item">
          <div class="icon-preview">🖥️</div>
          <div>
            <strong>EC2 Instance</strong>
            <p>Servidores Tomcat, Apps</p>
          </div>
        </div>
        <div class="icon-item">
          <div class="icon-preview">🗄️</div>
          <div>
            <strong>RDS Database</strong>
            <p>PostgreSQL, MySQL, etc</p>
          </div>
        </div>
        <div class="icon-item">
          <div class="icon-preview">⚡</div>
          <div>
            <strong>ElastiCache</strong>
            <p>Redis, Memcached</p>
          </div>
        </div>
        <div class="icon-item">
          <div class="icon-preview">☸️</div>
          <div>
            <strong>Kubernetes Pod</strong>
            <p>Containers K8s</p>
          </div>
        </div>
        <div class="icon-item">
          <div class="icon-preview">🐳</div>
          <div>
            <strong>ECS/Container</strong>
            <p>Docker, ECS</p>
          </div>
        </div>
        <div class="icon-item">
          <div class="icon-preview">⚡</div>
          <div>
            <strong>Lambda Function</strong>
            <p>Serverless, Workers</p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    const mxGraphData = \`${mxGraph}\`;
    
    function downloadDrawio() {
      const blob = new Blob([mxGraphData], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'arquitetura-aws.drawio';
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

export default DiagramGeneratorAWS;

