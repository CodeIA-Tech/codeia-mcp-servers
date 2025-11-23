#!/usr/bin/env node
/**
 * Script para buscar work items do roadmap do projeto PortoPlus no Azure DevOps
 * 
 * Uso: node scripts/azure-devops/fetch-roadmap-items.js
 * 
 * Variáveis de ambiente necessárias:
 * - AZURE_DEVOPS_ORG (obrigatório)
 * - AZURE_DEVOPS_PAT (obrigatório; Personal Access Token)
 * - AZURE_DEVOPS_PROJECT (opcional; padrão: "DevSecOps - Kanban")
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente do arquivo .env se existir
function loadEnvFile() {
    const envPath = path.join(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                    if (!process.env[key.trim()]) {
                        process.env[key.trim()] = value;
                    }
                }
            }
        });
    }
}

// Carregar .env antes de acessar as variáveis
loadEnvFile();

const ORG = process.env.AZURE_DEVOPS_ORG || process.env.AZURE_DEVOPS_ORGANIZATION || process.env.AZDO_ORG;
const PAT = process.env.AZURE_DEVOPS_PAT || process.env.AZDO_PAT || process.env.AZURE_DEVOPS_PERSONAL_ACCESS_TOKEN;
const PROJECT = process.env.AZURE_DEVOPS_PROJECT || 'DevSecOps - Kanban';
const API_VERSION = process.env.AZURE_DEVOPS_API_VERSION || '7.0';

if (!ORG || !PAT) {
    console.error('❌ Erro: Variáveis de ambiente necessárias não configuradas');
    console.error('💡 Configure:');
    console.error('   export AZURE_DEVOPS_ORG="grupoltm"');
    console.error('   export AZURE_DEVOPS_PAT="seu-personal-access-token"');
    console.error('   export AZURE_DEVOPS_PROJECT="DevSecOps - Kanban" (opcional)');
    process.exit(1);
}

// Codificar PAT para Basic Auth
const auth = Buffer.from(`:${PAT}`).toString('base64');

function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const encodedPath = encodeURI(path);
        // Codificar o nome do projeto para URL (espaços viram %20)
        const encodedProject = encodeURIComponent(PROJECT);
        const encodedOrg = encodeURIComponent(ORG);
        const options = {
            hostname: 'dev.azure.com',
            port: 443,
            path: `/${encodedOrg}/${encodedProject}/_apis/${encodedPath}?api-version=${API_VERSION}`,
            method: method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Erro da API: ${res.statusCode} - ${data}`));
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

async function getWorkItemsByQuery(wiqlQuery) {
    try {
        // Primeiro, executar a query WIQL
        const queryResult = await makeRequest(
            `wit/wiql`,
            'POST',
            { query: wiqlQuery }
        );

        if (!queryResult.workItems || queryResult.workItems.length === 0) {
            return [];
        }

        // Buscar detalhes dos work items
        const workItemIds = queryResult.workItems.map(wi => wi.id);
        const idsString = workItemIds.join(',');
        
        const encodedProject = encodeURIComponent(PROJECT);
        const encodedOrg = encodeURIComponent(ORG);
        const workItemsUrl = `/${encodedOrg}/${encodedProject}/_apis/wit/workitems?ids=${idsString}&$expand=all&api-version=${API_VERSION}`;
        
        const workItems = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'dev.azure.com',
                port: 443,
                path: workItemsUrl,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            resolve(data);
                        }
                    } else {
                        reject(new Error(`Erro da API: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });

        return workItems.value || [];
    } catch (error) {
        console.error('❌ Erro ao buscar work items:', error.message);
        throw error;
    }
}

async function getRoadmapFeatures() {
    // Query WIQL para buscar Features do projeto PortoPlus
    // Ajustar conforme necessário baseado na estrutura do seu projeto
    const wiqlQuery = `
        SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], 
               [System.AssignedTo], [Microsoft.VSTS.Common.Priority], 
               [System.Tags], [System.AreaPath]
        FROM WorkItems
        WHERE [System.TeamProject] = '${PROJECT}'
          AND [System.WorkItemType] = 'Feature'
          AND [System.AreaPath] UNDER '${PROJECT}\\Projetos'
        ORDER BY [System.Id] DESC
    `;

    try {
        const features = await getWorkItemsByQuery(wiqlQuery);
        return features;
    } catch (error) {
        console.error('❌ Erro ao buscar features:', error.message);
        return [];
    }
}

async function getTasksByFeature(featureId) {
    try {
        // Buscar a feature com seus relacionamentos usando a API REST
        const encodedProject = encodeURIComponent(PROJECT);
        const encodedOrg = encodeURIComponent(ORG);
        const featureUrl = `/${encodedOrg}/${encodedProject}/_apis/wit/workitems/${featureId}?$expand=all&api-version=${API_VERSION}`;
        
        const featureDetails = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'dev.azure.com',
                port: 443,
                path: featureUrl,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            resolve(data);
                        }
                    } else {
                        reject(new Error(`Erro da API: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });

        // Buscar relacionamentos hierárquicos (filhos)
        const relations = featureDetails.relations || [];
        console.log(`   📎 Relacionamentos encontrados: ${relations.length}`);
        
        // Filtrar relacionamentos hierárquicos (filhos diretos)
        const childRelations = relations.filter(rel => {
            return rel.rel === 'System.LinkTypes.Hierarchy-Forward' || 
                   rel.rel === 'System.LinkTypes.Hierarchy-Reverse';
        });
        
        // Se não encontrar hierárquicos, tentar outros tipos de relacionamento
        if (childRelations.length === 0 && relations.length > 0) {
            console.log(`   ⚠️  Nenhum relacionamento hierárquico encontrado, tentando todos os tipos...`);
            // Tentar todos os relacionamentos que podem conter tasks
            const allChildRelations = relations.filter(rel => {
                const url = rel.url || '';
                return url.includes('/workitems/');
            });
            if (allChildRelations.length > 0) {
                console.log(`   📎 Usando ${allChildRelations.length} relacionamentos alternativos`);
                return await getTasksFromRelations(allChildRelations, featureId);
            }
        }

        if (childRelations.length === 0) {
            console.log(`   ℹ️  Nenhuma task encontrada para a feature ${featureId}`);
            return [];
        }
        
        console.log(`   ✅ ${childRelations.length} relacionamentos hierárquicos encontrados`);

        // Extrair IDs das tasks relacionadas
        const taskIds = [];
        for (const rel of childRelations) {
            // A URL do relacionamento pode ter workitems ou workItems (case insensitive)
            const match = rel.url.match(/workitems?\/(\d+)/i);
            if (match) {
                taskIds.push(parseInt(match[1]));
            } else {
                console.log(`   ⚠️  URL de relacionamento não reconhecida: ${rel.url}`);
            }
        }

        console.log(`   🔢 IDs extraídos: ${taskIds.length} - ${taskIds.join(', ')}`);

        if (taskIds.length === 0) {
            console.log(`   ⚠️  Nenhum ID de task encontrado nos relacionamentos`);
            return [];
        }

        // Buscar detalhes das tasks
        const idsString = taskIds.join(',');
        const tasksUrl = `/${encodedOrg}/${encodedProject}/_apis/wit/workitems?ids=${idsString}&$expand=all&api-version=${API_VERSION}`;
        
        const tasksResponse = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'dev.azure.com',
                port: 443,
                path: tasksUrl,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            resolve(data);
                        }
                    } else {
                        reject(new Error(`Erro da API: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });

        const allItems = tasksResponse.value || [];
        console.log(`   📦 Total de work items retornados: ${allItems.length}`);
        
        // Debug: mostrar tipos de work items encontrados
        if (allItems.length > 0) {
            const itemTypes = {};
            allItems.forEach(wi => {
                const type = wi.fields?.['System.WorkItemType'] || 'Unknown';
                itemTypes[type] = (itemTypes[type] || 0) + 1;
            });
            console.log(`   📊 Tipos encontrados:`, JSON.stringify(itemTypes));
        }
        
        // Filtrar apenas Tasks
        const tasks = allItems.filter(wi => {
            const workItemType = wi.fields?.['System.WorkItemType'] || '';
            return workItemType.toLowerCase() === 'task';
        });
        
        console.log(`   ✅ ${tasks.length} tasks encontradas para a feature ${featureId}`);
        return tasks;
    } catch (error) {
        console.error(`❌ Erro ao buscar tasks da feature ${featureId}:`, error.message);
        // Tentar método alternativo usando WIQL mais específico
        return await getTasksByFeatureWIQL(featureId);
    }
}

async function getTasksFromRelations(relations, featureId) {
    const encodedProject = encodeURIComponent(PROJECT);
    const encodedOrg = encodeURIComponent(ORG);
    const taskIds = [];
    
    for (const rel of relations) {
        const match = rel.url.match(/workitems\/(\d+)/);
        if (match) {
            taskIds.push(parseInt(match[1]));
        }
    }
    
    if (taskIds.length === 0) {
        return [];
    }
    
    // Buscar detalhes dos work items
    const idsString = taskIds.join(',');
    const workItemsUrl = `/${encodedOrg}/${encodedProject}/_apis/wit/workitems?ids=${idsString}&$expand=all&api-version=${API_VERSION}`;
    
    const workItems = await new Promise((resolve, reject) => {
        const options = {
            hostname: 'dev.azure.com',
            port: 443,
            path: workItemsUrl,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`Erro da API: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });

    const allItems = workItems.value || [];
    
    // Filtrar apenas Tasks
    const tasks = allItems.filter(wi => {
        const workItemType = wi.fields?.['System.WorkItemType'] || '';
        return workItemType.toLowerCase() === 'task';
    });
    
    return tasks;
}

async function getTasksByFeatureWIQL(featureId) {
    // Método alternativo usando WIQL mais específico
    const wiqlQuery = `
        SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
               [System.AssignedTo], [System.Tags]
        FROM WorkItemLinks
        WHERE [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
          AND [Source].[System.Id] = ${featureId}
          AND [System.WorkItemType] = 'Task'
        ORDER BY [System.Id]
    `;

    try {
        const queryResult = await makeRequest(
            `wit/wiql`,
            'POST',
            { query: wiqlQuery }
        );

        if (!queryResult.workItems || queryResult.workItems.length === 0) {
            return [];
        }

        // Buscar detalhes dos work items
        const workItemIds = queryResult.workItems.map(wi => wi.id);
        const idsString = workItemIds.join(',');
        
        const encodedProject = encodeURIComponent(PROJECT);
        const encodedOrg = encodeURIComponent(ORG);
        const workItemsUrl = `/${encodedOrg}/${encodedProject}/_apis/wit/workitems?ids=${idsString}&$expand=all&api-version=${API_VERSION}`;
        
        const workItems = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'dev.azure.com',
                port: 443,
                path: workItemsUrl,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            resolve(data);
                        }
                    } else {
                        reject(new Error(`Erro da API: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });

        return workItems.value || [];
    } catch (error) {
        console.error(`❌ Erro no método WIQL para feature ${featureId}:`, error.message);
        return [];
    }
}

function getStateColor(state) {
    const stateLower = state.toLowerCase();
    if (stateLower.includes('done') || stateLower.includes('closed') || stateLower.includes('concluído')) {
        return '#2ecc71'; // Verde
    } else if (stateLower.includes('in progress') || stateLower.includes('em andamento') || stateLower.includes('active')) {
        return '#3498db'; // Azul
    } else if (stateLower.includes('new') || stateLower.includes('novo') || stateLower.includes('to do')) {
        return '#95a5a6'; // Cinza
    } else if (stateLower.includes('blocked') || stateLower.includes('bloqueado')) {
        return '#e74c3c'; // Vermelho
    }
    return '#f39c12'; // Laranja (padrão)
}

function formatWorkItem(workItem) {
    const fields = workItem.fields || {};
    return {
        id: workItem.id,
        title: fields['System.Title'] || 'Sem título',
        state: fields['System.State'] || 'Unknown',
        workItemType: fields['System.WorkItemType'] || 'Unknown',
        assignedTo: fields['System.AssignedTo']?.displayName || 'Não atribuído',
        priority: fields['Microsoft.VSTS.Common.Priority'] || 'Não definida',
        tags: fields['System.Tags'] || '',
        areaPath: fields['System.AreaPath'] || '',
        url: workItem._links?.html?.href || `https://dev.azure.com/${ORG}/${PROJECT}/_workitems/edit/${workItem.id}`,
        stateColor: getStateColor(fields['System.State'] || '')
    };
}

async function main() {
    console.log('🔍 Buscando features do roadmap...\n');
    console.log(`📋 Projeto: ${PROJECT}`);
    console.log(`🏢 Organização: ${ORG}\n`);
    
    try {
        const features = await getRoadmapFeatures();
        
        if (features.length === 0) {
            console.log('⚠️  Nenhuma feature encontrada.');
            console.log('💡 Verifique se:');
            console.log('   - O projeto está correto:', PROJECT);
            console.log('   - O token tem permissões adequadas');
            console.log('   - A query WIQL está correta para sua estrutura');
            return;
        }

        console.log(`✅ Encontradas ${features.length} features\n`);

        const roadmapData = {
            features: [],
            summary: {
                total: features.length,
                byState: {},
                byPriority: {}
            }
        };

        for (const feature of features) {
            console.log(`📦 Processando feature #${feature.id}: ${feature.fields?.['System.Title'] || 'Sem título'}`);
            const formattedFeature = formatWorkItem(feature);
            const tasks = await getTasksByFeature(feature.id);
            
            formattedFeature.tasks = tasks.map(formatWorkItem);
            formattedFeature.tasksCompleted = tasks.filter(t => {
                const state = t.fields?.['System.State']?.toLowerCase() || '';
                return state.includes('done') || state.includes('closed') || state.includes('concluído');
            }).length;
            formattedFeature.tasksTotal = tasks.length;
            formattedFeature.progress = tasks.length > 0 
                ? Math.round((formattedFeature.tasksCompleted / tasks.length) * 100) 
                : 0;

            roadmapData.features.push(formattedFeature);

            // Estatísticas
            const state = formattedFeature.state;
            roadmapData.summary.byState[state] = (roadmapData.summary.byState[state] || 0) + 1;
        }

        // Salvar em JSON para uso na apresentação
        const outputPath = path.join(__dirname, '../../reports/roadmap-data.json');
        fs.writeFileSync(outputPath, JSON.stringify(roadmapData, null, 2));
        
        console.log('\n📊 Resumo do Roadmap:');
        console.log(`   Total de Features: ${roadmapData.summary.total}`);
        console.log('\n   Por Estado:');
        Object.entries(roadmapData.summary.byState).forEach(([state, count]) => {
            console.log(`     ${state}: ${count}`);
        });

        console.log('\n✅ Dados salvos em:', outputPath);
        console.log('\n📋 Features encontradas:');
        roadmapData.features.forEach(feature => {
            console.log(`\n   [${feature.id}] ${feature.title}`);
            console.log(`      Estado: ${feature.state}`);
            console.log(`      Progresso: ${feature.progress}% (${feature.tasksCompleted}/${feature.tasksTotal} tarefas)`);
            console.log(`      URL: ${feature.url}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.message.includes('401') || error.message.includes('403')) {
            console.error('\n💡 Verifique suas credenciais:');
            console.error('   - AZURE_DEVOPS_ORG está correto?');
            console.error('   - AZURE_DEVOPS_PAT é válido e tem permissões adequadas?');
        }
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { getRoadmapFeatures, getTasksByFeature, formatWorkItem };
