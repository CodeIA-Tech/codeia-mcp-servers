#!/usr/bin/env node
/**
 * MCP Server para integração com Rundeck
 *
 * Funcionalidades principais:
 * - Listar projetos e jobs
 * - Obter detalhes de jobs e execuções
 * - Disparar jobs com parâmetros opcionais
 *
 * Variáveis de ambiente necessárias:
 * - RUNDECK_API_URL (obrigatória, ex: https://rundeck.example.com)
 * - RUNDECK_API_TOKEN (obrigatória, token de API)
 * - RUNDECK_API_VERSION (opcional, padrão: 45)
 */

import process from 'process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

function getEnv(name, fallback = undefined) {
  const value = process.env[name];
  if (value && value.trim() !== '') {
    return value.trim();
  }
  return fallback;
}

const apiUrlRaw = getEnv('RUNDECK_API_URL');
const apiToken = getEnv('RUNDECK_API_TOKEN');
const apiVersion = getEnv('RUNDECK_API_VERSION', '28');

if (!apiUrlRaw) {
  console.error('❌ Variável RUNDECK_API_URL não configurada.');
  process.exit(1);
}

if (!apiToken) {
  console.error('❌ Variável RUNDECK_API_TOKEN não configurada.');
  process.exit(1);
}

const apiUrl = apiUrlRaw.replace(/\/+$/, '');
const baseUrl = `${apiUrl}/api/${apiVersion}/`;

function buildUrl(path, query = {}) {
  const relativePath = path.replace(/^\//, '');
  const url = new URL(relativePath, baseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
  });

  return url.toString();
}

async function rundeckRequest(path, options = {}) {
  const {
    method = 'GET',
    query = {},
    body = undefined,
    headers = {},
  } = options;

  const url = buildUrl(path, query);
  const finalHeaders = {
    'X-Rundeck-Auth-Token': apiToken,
    Accept: 'application/json',
    ...headers,
  };

  let requestBody;
  if (body !== undefined && body !== null) {
    finalHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: requestBody,
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Falha ao parsear resposta (${response.status}): ${text}`);
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.errorMessage ||
      `Status ${response.status}`;
    throw new Error(`Rundeck retornou erro: ${message}`);
  }

  return data;
}

function ensureString(value, name, required = false) {
  if ((value === undefined || value === null || value === '') && required) {
    throw new Error(`${name} é obrigatório.`);
  }
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${name} deve ser uma string.`);
  }
  return value.trim();
}

function ensureNumber(value, name, required = false) {
  if ((value === undefined || value === null || value === '') && required) {
    throw new Error(`${name} é obrigatório.`);
  }
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${name} deve ser numérico.`);
  }
  return numeric;
}

async function listProjects() {
  const projects = await rundeckRequest('/projects');
  return {
    projects: (projects || []).map(project => ({
      name: project.name,
      description: project.description || '',
      url: project.url || '',
    })),
  };
}

async function listJobs(args = {}) {
  const project = ensureString(args.project, 'project', true);
  const jobFilter = ensureString(args.jobFilter, 'jobFilter', false);
  const groupPath = ensureString(args.groupPath, 'groupPath', false);

  const jobs = await rundeckRequest(`/project/${encodeURIComponent(project)}/jobs`, {
    query: {
      jobFilter,
      groupPath,
    },
  });

  return {
    project,
    jobs: (jobs || []).map(job => ({
      id: job.id,
      uuid: job.uuid,
      name: job.name,
      group: job.group,
      description: job.description,
      project: job.project,
      scheduleEnabled: job.scheduleEnabled,
      schedule: job.schedule,
      href: job.href,
    })),
  };
}

async function getJobDetails(args = {}) {
  const jobId = ensureString(args.jobId, 'jobId', true);
  const details = await rundeckRequest(`/job/${encodeURIComponent(jobId)}`);
  return details;
}

async function getJobExecutions(args = {}) {
  const jobId = ensureString(args.jobId, 'jobId', true);
  const max = ensureNumber(args.max, 'max', false);
  const statusFilter = ensureString(args.status, 'status', false);

  const executions = await rundeckRequest(
    `/job/${encodeURIComponent(jobId)}/executions`,
    {
      query: {
        max,
        statusFilter,
      },
    }
  );

  return executions;
}

async function runJob(args = {}) {
  const jobId = ensureString(args.jobId, 'jobId', true);
  const argString = ensureString(args.argString, 'argString', false);
  const asUser = ensureString(args.asUser, 'asUser', false);
  const logLevel = ensureString(args.logLevel, 'logLevel', false);
  const options = args.options && typeof args.options === 'object'
    ? args.options
    : undefined;

  const payload = {};
  if (argString) payload.argString = argString;
  if (asUser) payload.asUser = asUser;
  if (logLevel) payload.logLevel = logLevel;
  if (options) payload.options = options;

  const result = await rundeckRequest(
    `/job/${encodeURIComponent(jobId)}/run`,
    {
      method: 'POST',
      body: Object.keys(payload).length > 0 ? payload : undefined,
    }
  );

  return result;
}

const server = new Server(
  {
    name: 'codeia-rundeck-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_projects',
      description: 'Lista todos os projetos disponíveis no Rundeck.',
    },
    {
      name: 'list_jobs',
      description: 'Lista jobs de um projeto do Rundeck. Argumentos: project (obrigatório), jobFilter (opcional), groupPath (opcional).',
      inputSchema: {
        type: 'object',
        properties: {
          project: { type: 'string' },
          jobFilter: { type: 'string' },
          groupPath: { type: 'string' },
        },
        required: ['project'],
      },
    },
    {
      name: 'get_job_details',
      description: 'Obtém detalhes completos de um job do Rundeck pelo ID.',
      inputSchema: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
        },
        required: ['jobId'],
      },
    },
    {
      name: 'get_job_executions',
      description: 'Lista execuções de um job, com filtros opcionais. Argumentos: jobId (obrigatório), max (opcional), status (opcional: running, succeeded, failed, aborted).',
      inputSchema: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          max: { type: 'number' },
          status: { type: 'string' },
        },
        required: ['jobId'],
      },
    },
    {
      name: 'run_job',
      description: 'Dispara a execução de um job. Argumentos: jobId (obrigatório), argString, asUser, logLevel, options (objeto de parâmetros).',
      inputSchema: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          argString: { type: 'string' },
          asUser: { type: 'string' },
          logLevel: { type: 'string' },
          options: { type: 'object' },
        },
        required: ['jobId'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  switch (name) {
    case 'list_projects':
      return { content: [{ type: 'json', data: await listProjects() }] };
    case 'list_jobs':
      return { content: [{ type: 'json', data: await listJobs(args) }] };
    case 'get_job_details':
      return { content: [{ type: 'json', data: await getJobDetails(args) }] };
    case 'get_job_executions':
      return { content: [{ type: 'json', data: await getJobExecutions(args) }] };
    case 'run_job':
      return { content: [{ type: 'json', data: await runJob(args) }] };
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);

