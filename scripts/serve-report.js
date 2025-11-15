#!/usr/bin/env node
/**
 * Servidor HTTP simples para servir relatórios HTML
 * 
 * Uso: node scripts/serve-report.js [porta] [arquivo]
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.argv[2] || 8080;
const REPORT_FILE = process.argv[3] || path.join(__dirname, '../reports/pps-acompanhamento-diretoria-2025-11-06.html');

const server = http.createServer((req, res) => {
  // Servir o arquivo HTML
  if (req.url === '/' || req.url === '/report.html') {
    fs.readFile(REPORT_FILE, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Erro ao ler arquivo: ${err.message}`);
        return;
      }
      
      res.writeHead(200, { 
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 - Página não encontrada');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Servidor HTTP iniciado!');
  console.log(`📄 Servindo: ${REPORT_FILE}`);
  console.log(`\n🌐 Acesse o relatório em:`);
  console.log(`   Local: http://localhost:${PORT}/`);
  console.log(`   Rede: http://0.0.0.0:${PORT}/`);
  console.log(`\n💡 Para acessar de outra máquina na mesma rede:`);
  console.log(`   1. Descubra o IP desta máquina:`);
  console.log(`      - Windows: ipconfig`);
  console.log(`      - Linux/Mac: ifconfig ou ip addr`);
  console.log(`   2. Acesse: http://[SEU_IP]:${PORT}/`);
  console.log(`\n⏹️  Pressione Ctrl+C para parar o servidor\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PORT} já está em uso. Tente outra porta:`);
    console.error(`   node scripts/serve-report.js ${PORT + 1} ${REPORT_FILE}`);
  } else {
    console.error('❌ Erro no servidor:', err);
  }
  process.exit(1);
});

