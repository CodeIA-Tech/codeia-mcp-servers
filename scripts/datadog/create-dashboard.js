#!/usr/bin/env node
/**
 * Criador de Dashboard no Datadog
 *
 * Utiliza as credenciais configuradas no .env (DD/DATADOG API e APP KEY)
 * para criar um dashboard a partir de um arquivo JSON local.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (!match) return;

    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function resolveDashboardPath(inputPath) {
  if (!inputPath) {
    return path.join(__dirname, '..', 'dashboards', 'sre-porto-motor-de-porto.json');
  }

  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  return path.join(process.cwd(), inputPath);
}

async function createDashboard(dashboardPath, options = {}) {
  loadEnv();

  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || 'datadoghq.com';

  if (!apiKey || !appKey) {
    throw new Error('Credenciais ausentes: defina DD_API_KEY (ou DATADOG_API_KEY) e DD_APP_KEY (ou DATADOG_APP_KEY) no .env');
  }

  if (!fs.existsSync(dashboardPath)) {
    throw new Error(`Arquivo de dashboard não encontrado: ${dashboardPath}`);
  }

  const rawContent = fs.readFileSync(dashboardPath, 'utf-8');
  const dashboardPayload = JSON.parse(rawContent);

  if (options.dryRun) {
    console.log('💡 Modo dry-run ativado. Payload que seria enviado:');
    console.dir(dashboardPayload, { depth: null, colors: true });
    return null;
  }

  const response = await fetch(`https://api.${site}/api/v1/dashboard`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey
    },
    body: JSON.stringify(dashboardPayload)
  });

  const resultText = await response.text();
  let result;
  try {
    result = JSON.parse(resultText);
  } catch {
    result = resultText;
  }

  if (!response.ok) {
    throw new Error(`Falha ao criar dashboard (${response.status}): ${resultText}`);
  }

  return {
    id: result.id,
    title: result.title || dashboardPayload.title,
    url: result.url || `https://${site.replace('app.', '')}/dashboard/${result.id}`,
    response: result
  };
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set();
  const positional = [];

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      flags.add(arg);
    } else {
      positional.push(arg);
    }
  });

  const dashboardPath = resolveDashboardPath(positional[0]);
  const dryRun = flags.has('--dry-run');

  console.log('📊 Criador de Dashboard - Datadog');
  console.log(`📁 Arquivo: ${dashboardPath}`);
  console.log(`🔐 Site: ${process.env.DATADOG_SITE || 'datadoghq.com'}`);
  if (dryRun) {
    console.log('🛠️  Executando em modo dry-run (nenhuma chamada à API será feita).');
  }
  console.log('');

  try {
    const result = await createDashboard(dashboardPath, { dryRun });

    if (dryRun) {
      console.log('✅ Dry-run concluído.');
      return;
    }

    if (result) {
      console.log('✅ Dashboard criado com sucesso!');
      console.log(`🆔 ID: ${result.id}`);
      console.log(`🏷️  Título: ${result.title}`);
      if (result.response?.url) {
        console.log(`🔗 URL: ${result.response.url}`);
      } else {
        console.log(`🔗 URL (estimada): ${result.url}`);
      }
    } else {
      console.log('✅ Operação concluída.');
    }
  } catch (error) {
    console.error('❌ Erro ao criar dashboard:', error.message);
    process.exitCode = 1;
  }
}

main();


