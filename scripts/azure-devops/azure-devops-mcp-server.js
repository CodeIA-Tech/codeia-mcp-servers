#!/usr/bin/env node
/**
 * MCP Server para integração com Azure DevOps
 *
 * Funcionalidades principais:
 * - Listar projetos, repositórios e pipelines
 * - Consultar execuções de pipelines
 * - Buscar e detalhar Work Items
 * - Criar Pull Requests automaticamente
 *
 * Variáveis de ambiente necessárias:
 * - AZURE_DEVOPS_ORG (obrigatório)
 * - AZURE_DEVOPS_PAT (obrigatório; Personal Access Token)
 * - AZURE_DEVOPS_PROJECT (opcional; projeto padrão)
 * - AZURE_DEVOPS_API_VERSION (opcional; padrão: 7.0)
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

const organization =
  getEnv('AZURE_DEVOPS_ORG') ||
  getEnv('AZURE_DEVOPS_ORGANIZATION') ||
  getEnv('AZDO_ORG');

const personalAccessToken =
  getEnv('AZURE_DEVOPS_PAT') ||
  getEnv('AZDO_PAT') ||
  getEnv('AZURE_DEVOPS_PERSONAL_ACCESS_TOKEN');

const defaultProject =
  getEnv('AZURE_DEVOPS_PROJECT') ||
  getEnv('AZDO_PROJECT') ||
  null;

const apiVersion = getEnv('AZURE_DEVOPS_API_VERSION', '7.0');

if (!organization) {
  console.error('❌ Variável AZURE_DEVOPS_ORG não configurada.');
  process.exit(1);
}

if (!personalAccessToken) {
  console.error('❌ Variável AZURE_DEVOPS_PAT não configurada.');
  process.exit(1);
}

const baseUrl = `https://dev.azure.com/${organization}/`;
const authHeader = `Basic ${Buffer.from(`:${personalAccessToken}`).toString('base64')}`;

function encodeSegment(segment) {
  return encodeURIComponent(segment);
}

function buildUrl(path, query = {}) {
  const relativePath = path.replace(/^\//, '');
  const url = new URL(relativePath, baseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  if (!url.searchParams.has('api-version')) {
    url.searchParams.set('api-version', apiVersion);
  }

  return url.toString();
}

async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body = undefined,
    headers = {},
    query = {},
  } = options;

  const url = buildUrl(path, query);
  const finalHeaders = {
    Authorization: authHeader,
    Accept: 'application/json;api-version=' + apiVersion,
    ...headers,
  };

  if (body !== undefined && body !== null) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
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
      data?.error?.message ||
      data?.Message ||
      `Status ${response.status}`;
    throw new Error(`Azure DevOps retornou erro: ${message}`);
  }

  return data;
}

function ensureProject(project) {
  const finalProject = project || defaultProject;
  if (!finalProject) {
    throw new Error(
      'Projeto Azure DevOps não informado. Forneça "project" nos argumentos ou configure AZURE_DEVOPS_PROJECT.'
    );
  }
  return finalProject;
}

async function listProjects() {
  const data = await apiRequest('_apis/projects');
  return data;
}

async function listRepositories(project) {
  const projectSegment = encodeSegment(ensureProject(project));
  const data = await apiRequest(`${projectSegment}/_apis/git/repositories`);
  return data;
}

async function listPipelines(project) {
  const projectSegment = encodeSegment(ensureProject(project));
  const data = await apiRequest(`${projectSegment}/_apis/pipelines`);
  return data;
}

async function getPipelineRuns(project, pipelineId, top = 20) {
  if (!pipelineId) {
    throw new Error('pipelineId é obrigatório.');
  }

  const projectSegment = encodeSegment(ensureProject(project));
  const data = await apiRequest(
    `${projectSegment}/_apis/pipelines/${pipelineId}/runs`,
    {
      query: { '$top': top },
    }
  );
  return data;
}

async function getWorkItem(workItemId) {
  if (!workItemId) {
    throw new Error('workItemId é obrigatório.');
  }

  const data = await apiRequest(`_apis/wit/workitems/${workItemId}`, {
    query: { expand: 'relations' },
  });
  return data;
}

async function searchWorkItems(project, wiql, fields = null, top = 20) {
  const projectName = ensureProject(project);
  const projectSegment = encodeSegment(projectName);

  if (!wiql || wiql.trim() === '') {
    throw new Error('wiql é obrigatório para executar a busca.');
  }

  const wiqlBody = { query: wiql };
  const wiqlResult = await apiRequest(
    `${projectSegment}/_apis/wit/wiql`,
    {
      method: 'POST',
      body: wiqlBody,
    }
  );

  const workItems = wiqlResult.workItems || [];
  const limitedItems = workItems.slice(0, top);

  if (limitedItems.length === 0) {
    return {
      query: wiql,
      totalFound: workItems.length,
      items: [],
    };
  }

  const ids = limitedItems.map((item) => item.id);
  const batchBody = {
    ids,
  };

  if (Array.isArray(fields) && fields.length > 0) {
    batchBody.fields = fields;
  }

  const batchResult = await apiRequest('_apis/wit/workitemsbatch', {
    method: 'POST',
    body: batchBody,
  });

  return {
    query: wiql,
    project: projectName,
    totalFound: workItems.length,
    returned: batchResult.count || ids.length,
    items: batchResult.value || [],
  };
}

async function getRepositoryId(project, repositoryName) {
  const projectSegment = encodeSegment(ensureProject(project));
  const data = await apiRequest(`${projectSegment}/_apis/git/repositories`);
  const repo = data.value?.find((r) => r.name === repositoryName);
  if (!repo) {
    throw new Error(`Repositório "${repositoryName}" não encontrado no projeto.`);
  }
  return repo.id;
}

async function createPullRequest(
  project,
  repositoryName,
  sourceBranch,
  targetBranch,
  title,
  description = ''
) {
  const projectSegment = encodeSegment(ensureProject(project));
  const repoId = await getRepositoryId(project, repositoryName);

  // Adicionar nota de criação automática se não houver descrição
  const autoNote = `> 🤖 **PR criado automaticamente pelo assistente Vertem IA**\n> \n> Este Pull Request foi gerado automaticamente. Por favor, revise antes de aprovar.\n\n---\n\n`;
  const finalDescription = description || `${autoNote}## Descrição\n\n${title}\n\n## Mudanças\n\n- Alterações realizadas automaticamente`;

  const prData = {
    sourceRefName: `refs/heads/${sourceBranch}`,
    targetRefName: `refs/heads/${targetBranch}`,
    title: title,
    description: finalDescription,
  };

  const data = await apiRequest(
    `${projectSegment}/_apis/git/repositories/${repoId}/pullrequests`,
    {
      method: 'POST',
      body: prData,
    }
  );

  return {
    pullRequestId: data.pullRequestId,
    title: data.title,
    status: data.status,
    url: data.url || data._links?.web?.href || `${baseUrl}${projectSegment}/_git/${repositoryName}/pullrequest/${data.pullRequestId}`,
    ...data,
  };
}

class AzureDevOpsMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'azure-devops-mcp-server',
        version: '1.0.0',
        description: 'Integração com Azure DevOps (Boards, Repos, Pipelines)',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registerHandlers();
  }

  registerHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_projects',
          description: 'Lista projetos disponíveis na organização do Azure DevOps.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'list_repositories',
          description:
            'Lista repositórios Git de um projeto. Se "project" não for informado, usa o projeto padrão.',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Nome do projeto no Azure DevOps.',
              },
            },
          },
        },
        {
          name: 'list_pipelines',
          description:
            'Lista pipelines de um projeto. Se "project" não for informado, usa o projeto padrão.',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Nome do projeto no Azure DevOps.',
              },
            },
          },
        },
        {
          name: 'get_pipeline_runs',
          description:
            'Lista últimas execuções de um pipeline específico.',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Nome do projeto no Azure DevOps.',
              },
              pipelineId: {
                type: 'integer',
                description: 'ID numérico do pipeline.',
              },
              top: {
                type: 'integer',
                description: 'Quantidade máxima de execuções a retornar (padrão: 20).',
                default: 20,
              },
            },
            required: ['pipelineId'],
          },
        },
        {
          name: 'get_work_item',
          description:
            'Obtém detalhes de um Work Item (incluindo relações).',
          inputSchema: {
            type: 'object',
            properties: {
              workItemId: {
                type: 'integer',
                description: 'ID do Work Item.',
              },
            },
            required: ['workItemId'],
          },
        },
        {
          name: 'search_work_items',
          description:
            'Executa uma consulta WIQL e retorna os Work Items correspondentes.',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Projeto onde a consulta será executada.',
              },
              wiql: {
                type: 'string',
                description: 'Consulta WIQL a ser executada.',
              },
              fields: {
                type: 'array',
                items: { type: 'string' },
                description: 'Lista opcional de campos a retornar nos Work Items.',
              },
              top: {
                type: 'integer',
                description: 'Limite de Work Items detalhados a retornar (padrão: 20).',
                default: 20,
              },
            },
            required: ['wiql'],
          },
        },
        {
          name: 'create_pull_request',
          description:
            'Cria um Pull Request no Azure DevOps. Usa o projeto padrão se não informado.',
          inputSchema: {
            type: 'object',
            properties: {
              project: {
                type: 'string',
                description: 'Nome do projeto no Azure DevOps. Se não informado, usa o projeto padrão.',
              },
              repositoryName: {
                type: 'string',
                description: 'Nome do repositório Git (ex: vertem-ia-assessment).',
              },
              sourceBranch: {
                type: 'string',
                description: 'Branch de origem (ex: feature/add-waha-integration).',
              },
              targetBranch: {
                type: 'string',
                description: 'Branch de destino (ex: main).',
                default: 'main',
              },
              title: {
                type: 'string',
                description: 'Título do Pull Request.',
              },
              description: {
                type: 'string',
                description: 'Descrição do Pull Request (opcional). Se não informado, será gerada automaticamente.',
              },
            },
            required: ['repositoryName', 'sourceBranch', 'title'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;

      try {
        switch (name) {
          case 'list_projects': {
            const data = await listProjects();
            return this.success(data);
          }
          case 'list_repositories': {
            const data = await listRepositories(args.project);
            return this.success(data);
          }
          case 'list_pipelines': {
            const data = await listPipelines(args.project);
            return this.success(data);
          }
          case 'get_pipeline_runs': {
            const data = await getPipelineRuns(
              args.project,
              args.pipelineId,
              args.top
            );
            return this.success(data);
          }
          case 'get_work_item': {
            const data = await getWorkItem(args.workItemId);
            return this.success(data);
          }
          case 'search_work_items': {
            const data = await searchWorkItems(
              args.project,
              args.wiql,
              args.fields,
              args.top
            );
            return this.success(data);
          }
          case 'create_pull_request': {
            const data = await createPullRequest(
              args.project,
              args.repositoryName,
              args.sourceBranch,
              args.targetBranch || 'main',
              args.title,
              args.description
            );
            return this.success(data);
          }
          default:
            throw new Error(`Ferramenta desconhecida: ${name}`);
        }
      } catch (error) {
        return this.error(error);
      }
    });
  }

  success(payload) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }

  error(error) {
    return {
      content: [
        {
          type: 'text',
          text: `Erro: ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Azure DevOps MCP Server rodando');
  }
}

const server = new AzureDevOpsMCPServer();
server.run().catch((error) => {
  console.error('Falha ao iniciar Azure DevOps MCP Server:', error);
  process.exit(1);
});


