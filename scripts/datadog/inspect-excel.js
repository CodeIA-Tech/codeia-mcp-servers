#!/usr/bin/env node
/**
 * Inspeciona a estrutura da planilha Excel
 * Uso: node scripts/datadog/inspect-excel.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.join(__dirname, '..', '..', 'docs', 'assets', 'Vertem-Datadog-Monitors.xlsx');

if (!fs.existsSync(excelPath)) {
  console.error(`❌ Arquivo não encontrado: ${excelPath}`);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
console.log('📊 Abas disponíveis:', workbook.SheetNames.join(', '));
console.log('\n');

if (workbook.SheetNames.includes('Build_Monitors')) {
  const worksheet = workbook.Sheets['Build_Monitors'];
  const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  console.log(`✅ Aba 'Build_Monitors' encontrada com ${data.length} linhas\n`);
  
  if (data.length > 0) {
    console.log('📋 Colunas disponíveis:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\n');
    
    console.log('📝 Primeiras 3 linhas:');
    data.slice(0, 3).forEach((row, idx) => {
      console.log(`\nLinha ${idx + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        if (value) {
          console.log(`  ${key}: ${value}`);
        }
      });
    });
    
    // Filtra P1
    const p1Monitors = data.filter(m => {
      const service = (m.Service || m.service || '').toLowerCase();
      const priority = (m.Prioridade || m.Priority || m.prioridade || '').toString().toUpperCase();
      return service.includes('motor-porto-tomcat') && priority === 'P1';
    });
    
    console.log(`\n🔍 Monitores P1 para motor-porto-tomcat: ${p1Monitors.length}`);
    if (p1Monitors.length > 0) {
      p1Monitors.forEach((m, idx) => {
        console.log(`\n${idx + 1}. ${m.Título || m.Titulo || m.Title || m.Name || 'Sem título'}`);
        console.log(`   Service: ${m.Service || m.service || 'N/A'}`);
        console.log(`   Prioridade: ${m.Prioridade || m.Priority || m.prioridade || 'N/A'}`);
        console.log(`   Query: ${(m.Query || m.query || '').substring(0, 80)}...`);
      });
    }
  }
} else {
  console.log('❌ Aba "Build_Monitors" não encontrada');
}

