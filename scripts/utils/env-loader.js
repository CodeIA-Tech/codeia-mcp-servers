#!/usr/bin/env node
/**
 * Utilitário compartilhado para carregar variáveis de ambiente do arquivo .env
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Carrega variáveis de ambiente do arquivo .env na raiz do projeto
 * @param {string} customPath - Caminho customizado para o arquivo .env (opcional)
 */
export function loadEnv(customPath = null) {
  const envPath = customPath || path.join(__dirname, '..', '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    // Ignora comentários e linhas vazias
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (!match) return;
    
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    
    // Só define se não existir (permite override via variáveis de ambiente do sistema)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

/**
 * Obtém credenciais do Datadog das variáveis de ambiente
 * @returns {{apiKey: string, appKey: string, site: string}}
 * @throws {Error} Se as credenciais não estiverem configuradas
 */
export function getDatadogCredentials() {
  loadEnv();
  
  const apiKey = process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
  const appKey = process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
  const site = process.env.DATADOG_SITE || process.env.DD_SITE || 'datadoghq.com';

  if (!apiKey || !appKey) {
    throw new Error(
      'Credenciais do Datadog não encontradas. ' +
      'Defina DD_API_KEY e DD_APP_KEY (ou DATADOG_API_KEY / DATADOG_APP_KEY) no .env'
    );
  }

  return { apiKey, appKey, site };
}

/**
 * Obtém credenciais do Azure DevOps das variáveis de ambiente
 * @returns {{org: string, pat: string, project: string, apiVersion: string}}
 * @throws {Error} Se as credenciais não estiverem configuradas
 */
export function getAzureDevOpsCredentials() {
  loadEnv();
  
  const org = process.env.AZURE_DEVOPS_ORG;
  const pat = process.env.AZURE_DEVOPS_PAT;
  const project = process.env.AZURE_DEVOPS_PROJECT;
  const apiVersion = process.env.AZURE_DEVOPS_API_VERSION || '7.0';

  if (!org || !pat) {
    throw new Error(
      'Credenciais do Azure DevOps não encontradas. ' +
      'Defina AZURE_DEVOPS_ORG e AZURE_DEVOPS_PAT no .env'
    );
  }

  return { org, pat, project, apiVersion };
}

/**
 * Obtém credenciais do Rundeck das variáveis de ambiente
 * @returns {{url: string, token: string, apiVersion: string}}
 * @throws {Error} Se as credenciais não estiverem configuradas
 */
export function getRundeckCredentials() {
  loadEnv();
  
  const url = process.env.RUNDECK_API_URL;
  const token = process.env.RUNDECK_API_TOKEN;
  const apiVersion = process.env.RUNDECK_API_VERSION || '28';

  if (!url || !token) {
    throw new Error(
      'Credenciais do Rundeck não encontradas. ' +
      'Defina RUNDECK_API_URL e RUNDECK_API_TOKEN no .env'
    );
  }

  return { url, token, apiVersion };
}

