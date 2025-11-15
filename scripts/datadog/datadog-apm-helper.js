#!/usr/bin/env node
/**
 * Datadog APM Helper
 * 
 * Coleta dados do Datadog APM para gerar diagramas de arquitetura
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para carregar .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// Carregar .env automaticamente
loadEnv();

class DatadogAPMHelper {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.DD_API_KEY || process.env.DATADOG_API_KEY;
    this.appKey = options.appKey || process.env.DD_APP_KEY || process.env.DATADOG_APP_KEY;
    this.site = options.site || process.env.DATADOG_SITE || 'datadoghq.com';
    
    if (!this.apiKey || !this.appKey) {
      throw new Error('DD_API_KEY/DATADOG_API_KEY e DD_APP_KEY/DATADOG_APP_KEY são obrigatórios');
    }
  }

  /**
   * Faz requisição para API do Datadog
   */
  async request(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      const queryString = new URLSearchParams(params).toString();
      const url = `https://api.${this.site}/api/v2/${endpoint}${queryString ? '?' + queryString : ''}`;
      
      const options = {
        headers: {
          'DD-API-KEY': this.apiKey,
          'DD-APPLICATION-KEY': this.appKey,
          'Content-Type': 'application/json'
        }
      };

      https.get(url, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          } else {
            reject(new Error(`API Error: ${res.statusCode} - ${data}`));
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Lista serviços do APM
   */
  async listServices(env = 'prod') {
    try {
      const response = await this.request('services', {
        'filter[env]': env
      });
      return response.data || [];
    } catch (error) {
      console.error('Erro ao listar serviços:', error.message);
      return [];
    }
  }

  /**
   * Obtém dependências de um serviço
   */
  async getServiceDependencies(serviceName, env = 'prod') {
    try {
      // Usar API v1 para dependências
      const url = `https://api.${this.site}/api/v1/service_dependencies`;
      
      return new Promise((resolve, reject) => {
        const options = {
          headers: {
            'DD-API-KEY': this.apiKey,
            'DD-APPLICATION-KEY': this.appKey,
            'Content-Type': 'application/json'
          }
        };

        https.get(`${url}?env=${env}`, options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (e) {
              resolve({ dependencies: [] });
            }
          });
        }).on('error', reject);
      });
    } catch (error) {
      console.error('Erro ao obter dependências:', error.message);
      return { dependencies: [] };
    }
  }

  /**
   * Gera estrutura de arquitetura a partir dos serviços APM
   */
  async generateArchitecture(env = 'prod') {
    console.log(`🔍 Coletando dados do APM (env: ${env})...`);
    
    const services = await this.listServices(env);
    const dependencies = await this.getServiceDependencies(null, env);
    
    // Organizar serviços por tipo
    const architecture = {
      services: [],
      databases: [],
      caches: [],
      queues: [],
      external: [],
      dependencies: []
    };

    // Processar serviços
    services.forEach(service => {
      const serviceData = {
        id: service.id,
        name: service.attributes?.name || service.id,
        type: this.identifyServiceType(service),
        language: service.attributes?.language || 'unknown',
        env: service.attributes?.env || env
      };

      // Classificar serviço
      switch (serviceData.type) {
        case 'database':
          architecture.databases.push(serviceData);
          break;
        case 'cache':
          architecture.caches.push(serviceData);
          break;
        case 'queue':
          architecture.queues.push(serviceData);
          break;
        case 'external':
          architecture.external.push(serviceData);
          break;
        default:
          architecture.services.push(serviceData);
      }
    });

    // Processar dependências
    if (dependencies && dependencies.dependencies) {
      dependencies.dependencies.forEach(dep => {
        architecture.dependencies.push({
          from: dep.caller_service || dep.from,
          to: dep.callee_service || dep.to,
          type: dep.type || 'http'
        });
      });
    }

    console.log(`✅ Coletados: ${architecture.services.length} serviços, ${architecture.databases.length} databases, ${architecture.dependencies.length} dependências`);
    
    return architecture;
  }

  /**
   * Identifica tipo de serviço baseado no nome
   */
  identifyServiceType(service) {
    const name = (service.attributes?.name || service.id || '').toLowerCase();
    
    if (name.includes('postgres') || name.includes('mysql') || name.includes('mongodb') || 
        name.includes('database') || name.includes('db') || name.includes('sql')) {
      return 'database';
    }
    
    if (name.includes('redis') || name.includes('memcache') || name.includes('cache')) {
      return 'cache';
    }
    
    if (name.includes('kafka') || name.includes('rabbitmq') || name.includes('sqs') || 
        name.includes('queue') || name.includes('mq')) {
      return 'queue';
    }
    
    if (name.includes('external') || name.includes('third-party') || name.includes('api')) {
      return 'external';
    }
    
    return 'service';
  }

  /**
   * Exporta arquitetura como JSON
   */
  async exportArchitecture(env = 'prod', outputPath = null) {
    const architecture = await this.generateArchitecture(env);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(architecture, null, 2));
      console.log(`📁 Arquitetura exportada: ${outputPath}`);
    }
    
    return architecture;
  }
}

export default DatadogAPMHelper;

