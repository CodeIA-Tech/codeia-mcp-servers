#!/usr/bin/env node
/**
 * Datadog MCP Server
 * 
 * Servidor MCP customizado para integração com Datadog API
 * Suporta: monitores, dashboards, análises, workflows, post-mortems, relatórios
 */

const https = require('https');
const readline = require('readline');

const DATADOG_API_KEY = process.env.DATADOG_API_KEY;
const DATADOG_APP_KEY = process.env.DATADOG_APP_KEY;
const DATADOG_SITE = process.env.DATADOG_SITE || 'datadoghq.com';
const DATADOG_API_BASE = `https://api.${DATADOG_SITE}/api/v1`;

if (!DATADOG_API_KEY || !DATADOG_APP_KEY) {
  console.error('❌ DATADOG_API_KEY e DATADOG_APP_KEY são obrigatórias');
  process.exit(1);
}

// Função para fazer requisições HTTP
function datadogRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${DATADOG_API_BASE}${path}`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'DD-API-KEY': DATADOG_API_KEY,
        'DD-APPLICATION-KEY': DATADOG_APP_KEY,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Datadog API Error: ${res.statusCode} - ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Tool handlers
const tools = {
  'datadog_get_monitors': {
    description: 'Lista todos os monitores do Datadog',
    handler: async (args) => {
      const response = await datadogRequest('GET', '/monitor');
      return JSON.stringify(response, null, 2);
    }
  },
  
  'datadog_create_monitor': {
    description: 'Cria um novo monitor no Datadog',
    handler: async (args) => {
      const monitor = JSON.parse(args.monitor_config || '{}');
      const response = await datadogRequest('POST', '/monitor', monitor);
      return JSON.stringify(response, null, 2);
    }
  },
  
  'datadog_get_dashboards': {
    description: 'Lista todos os dashboards',
    handler: async (args) => {
      const response = await datadogRequest('GET', '/dashboard');
      return JSON.stringify(response, null, 2);
    }
  },
  
  'datadog_create_dashboard': {
    description: 'Cria um novo dashboard',
    handler: async (args) => {
      const dashboard = JSON.parse(args.dashboard_config || '{}');
      const response = await datadogRequest('POST', '/dashboard', dashboard);
      return JSON.stringify(response, null, 2);
    }
  },
  
  'datadog_query_metrics': {
    description: 'Consulta métricas do Datadog',
    handler: async (args) => {
      const query = args.query || '';
      const from = args.from || Math.floor(Date.now() / 1000) - 3600;
      const to = args.to || Math.floor(Date.now() / 1000);
      const response = await datadogRequest('GET', `/query?query=${encodeURIComponent(query)}&from=${from}&to=${to}`);
      return JSON.stringify(response, null, 2);
    }
  },
  
  'datadog_get_events': {
    description: 'Busca eventos do Datadog',
    handler: async (args) => {
      const start = args.start || Math.floor(Date.now() / 1000) - 3600;
      const end = args.end || Math.floor(Date.now() / 1000);
      const priority = args.priority || '';
      const sources = args.sources || '';
      const tags = args.tags || '';
      
      let path = `/events?start=${start}&end=${end}`;
      if (priority) path += `&priority=${priority}`;
      if (sources) path += `&sources=${sources}`;
      if (tags) path += `&tags=${tags}`;
      
      const response = await datadogRequest('GET', path);
      return JSON.stringify(response, null, 2);
    }
  },
  
  'datadog_get_incidents': {
    description: 'Lista incidentes do Datadog',
    handler: async (args) => {
      const response = await datadogRequest('GET', '/incidents');
      return JSON.stringify(response, null, 2);
    }
  },
  
  'datadog_get_workflows': {
    description: 'Lista workflows de automação',
    handler: async (args) => {
      // Note: Workflows API pode variar dependendo da versão do Datadog
      const response = await datadogRequest('GET', '/workflows');
      return JSON.stringify(response, null, 2);
    }
  },
  
  'datadog_analyze_metrics': {
    description: 'Analisa métricas e fornece insights',
    handler: async (args) => {
      const query = args.query || '';
      const from = args.from || Math.floor(Date.now() / 1000) - 86400;
      const to = args.to || Math.floor(Date.now() / 1000);
      
      const response = await datadogRequest('GET', `/query?query=${encodeURIComponent(query)}&from=${from}&to=${to}`);
      
      // Análise básica
      const analysis = {
        query: query,
        timeRange: { from: new Date(from * 1000).toISOString(), to: new Date(to * 1000).toISOString() },
        data: response,
        insights: []
      };
      
      // Adicionar insights básicos se houver dados
      if (response.series && response.series.length > 0) {
        const series = response.series[0];
        if (series.pointlist && series.pointlist.length > 0) {
          const values = series.pointlist.map(p => p[1]).filter(v => v !== null);
          if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const max = Math.max(...values);
            const min = Math.min(...values);
            
            analysis.insights.push({
              type: 'statistics',
              average: avg,
              maximum: max,
              minimum: min,
              samples: values.length
            });
          }
        }
      }
      
      return JSON.stringify(analysis, null, 2);
    }
  }
};

// MCP Protocol Implementation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function sendResponse(response) {
  console.log(JSON.stringify(response));
}

// Initialize
sendResponse({
  jsonrpc: '2.0',
  result: {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: 'datadog-mcp-server',
      version: '1.0.0'
    }
  },
  id: null
});

// List tools
rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    
    if (request.method === 'tools/list') {
      const toolList = Object.keys(tools).map(name => ({
        name,
        description: tools[name].description,
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Query string ou parâmetros JSON' },
            monitor_config: { type: 'string', description: 'Configuração do monitor em JSON' },
            dashboard_config: { type: 'string', description: 'Configuração do dashboard em JSON' },
            from: { type: 'number', description: 'Timestamp início (Unix)' },
            to: { type: 'number', description: 'Timestamp fim (Unix)' },
            priority: { type: 'string', description: 'Prioridade do evento' },
            sources: { type: 'string', description: 'Fontes do evento' },
            tags: { type: 'string', description: 'Tags para filtrar' }
          }
        }
      }));
      
      sendResponse({
        jsonrpc: '2.0',
        result: { tools: toolList },
        id: request.id
      });
    }
    
    else if (request.method === 'tools/call') {
      const { name, arguments: args } = request.params;
      
      if (!tools[name]) {
        sendResponse({
          jsonrpc: '2.0',
          error: { code: -32601, message: `Tool ${name} not found` },
          id: request.id
        });
        return;
      }
      
      try {
        const result = await tools[name].handler(args || {});
        sendResponse({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          },
          id: request.id
        });
      } catch (error) {
        sendResponse({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error.message
          },
          id: request.id
        });
      }
    }
  } catch (error) {
    sendResponse({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: `Parse error: ${error.message}`
      },
      id: null
    });
  }
});

