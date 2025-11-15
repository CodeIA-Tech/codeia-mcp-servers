#!/usr/bin/env node
/**
 * Cliente HTTP compartilhado para interagir com a API do Datadog
 */

import { getDatadogCredentials } from './env-loader.js';

/**
 * Faz uma requisição HTTP para a API do Datadog
 * @param {string} endpoint - Endpoint da API (ex: '/api/v1/monitor/123')
 * @param {Object} options - Opções da requisição (method, body, etc.)
 * @returns {Promise<Object>} Resposta da API parseada como JSON
 * @throws {Error} Se a requisição falhar
 */
export async function datadogRequest(endpoint, options = {}) {
  const { apiKey, appKey, site } = getDatadogCredentials();
  
  const url = `https://api.${site}${endpoint}`;
  const method = options.method || 'GET';
  
  const headers = {
    'DD-API-KEY': apiKey,
    'DD-APPLICATION-KEY': appKey,
    'Content-Type': 'application/json',
    ...options.headers
  };

  const config = {
    method,
    headers
  };

  if (options.body) {
    config.body = typeof options.body === 'string' 
      ? options.body 
      : JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  
  const text = await response.text();
  let data;
  
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    // Se não conseguir fazer parse, retorna o texto
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Erro ${response.status} na API do Datadog: ${JSON.stringify(data)}`
    );
  }

  return data;
}

/**
 * Obtém um monitor específico pelo ID
 * @param {string|number} monitorId - ID do monitor
 * @returns {Promise<Object>} Dados do monitor
 */
export async function getMonitor(monitorId) {
  return datadogRequest(`/api/v1/monitor/${monitorId}`);
}

/**
 * Atualiza um monitor existente
 * @param {string|number} monitorId - ID do monitor
 * @param {Object} payload - Dados para atualizar
 * @returns {Promise<Object>} Monitor atualizado
 */
export async function updateMonitor(monitorId, payload) {
  return datadogRequest(`/api/v1/monitor/${monitorId}`, {
    method: 'PUT',
    body: payload
  });
}

/**
 * Cria um novo monitor
 * @param {Object} payload - Dados do monitor
 * @returns {Promise<Object>} Monitor criado
 */
export async function createMonitor(payload) {
  return datadogRequest('/api/v1/monitor', {
    method: 'POST',
    body: payload
  });
}

/**
 * Busca monitores com base em uma query
 * @param {string} query - Query de busca (ex: 'service:my-service')
 * @param {Object} options - Opções adicionais (page, per_page, etc.)
 * @returns {Promise<Object>} Lista de monitores encontrados
 */
export async function searchMonitors(query, options = {}) {
  const params = new URLSearchParams({
    query,
    ...options
  });
  
  return datadogRequest(`/api/v1/monitor/search?${params.toString()}`);
}

/**
 * Cria ou atualiza um dashboard
 * @param {Object} dashboard - Dados do dashboard
 * @returns {Promise<Object>} Dashboard criado/atualizado
 */
export async function createDashboard(dashboard) {
  return datadogRequest('/api/v1/dashboard', {
    method: 'POST',
    body: dashboard
  });
}

