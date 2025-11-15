#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadEnv();

const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
const monitorId = 236774905;

async function checkMonitor() {
  const response = await fetch(`https://api.datadoghq.com/api/v1/monitor/${monitorId}`, {
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey
    }
  });
  
  const monitor = await response.json();
  
  console.log('Monitor encontrado:');
  console.log('Nome:', monitor.name);
  console.log('Tags:', monitor.tags.join(', '));
  
  const hasTipoTag = monitor.tags.some(t => t.startsWith('tipo:'));
  
  if (!hasTipoTag) {
    console.log('\n⚠️  Monitor não possui tag de tipo, atualizando...');
    
    const currentTags = monitor.tags || [];
    const tagsWithoutTipo = currentTags.filter(t => !t.startsWith('tipo:') && !t.startsWith('type:'));
    const newTags = [...tagsWithoutTipo, 'tipo:infraestrutura'];
    
    const updateResponse = await fetch(`https://api.datadoghq.com/api/v1/monitor/${monitorId}`, {
      method: 'PUT',
      headers: {
        'DD-API-KEY': apiKey,
        'DD-APPLICATION-KEY': appKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tags: newTags })
    });
    
    const updated = await updateResponse.json();
    console.log('✅ Tag adicionada: tipo:infraestrutura');
    console.log('Novas tags:', updated.tags.join(', '));
  } else {
    console.log('\n✅ Monitor já possui tag de tipo');
  }
}

checkMonitor().catch(console.error);

