#!/usr/bin/env node
/**
 * Inspeciona repositório de Terraform no Azure DevOps
 * 
 * Uso: node scripts/azure-devops/inspect-terraform-repo.js [repo-name]
 */

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

async function apiRequest(path, options = {}) {
  loadEnv();
  const org = process.env.AZURE_DEVOPS_ORG;
  const project = process.env.AZURE_DEVOPS_PROJECT;
  const pat = process.env.AZURE_DEVOPS_PAT;
  const apiVersion = process.env.AZURE_DEVOPS_API_VERSION || '7.0';

  if (!org || !project || !pat) {
    throw new Error('Variáveis de ambiente não configuradas');
  }

  const baseUrl = `https://dev.azure.com/${org}/${project}/`;
  const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
  
  const url = new URL(path.replace(/^\//, ''), baseUrl);
  url.searchParams.set('api-version', apiVersion);
  
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ${response.status}: ${text}`);
  }

  return await response.json();
}

async function getRepository(repoName) {
  const repos = await apiRequest('_apis/git/repositories');
  const repo = repos.value.find(r => 
    r.name.toLowerCase().includes(repoName.toLowerCase()) || 
    repoName.toLowerCase().includes(r.name.toLowerCase())
  );
  return repo;
}

async function getBranches(repoId) {
  return await apiRequest(`_apis/git/repositories/${repoId}/refs`, {
    query: { filter: 'heads/' }
  });
}

async function getCommits(repoId, branch = 'main', top = 10) {
  return await apiRequest(`_apis/git/repositories/${repoId}/commits`, {
    query: {
      branch: branch,
      '$top': top
    }
  });
}

async function getItems(repoId, branch = 'main', path = '') {
  return await apiRequest(`_apis/git/repositories/${repoId}/items`, {
    query: {
      version: branch,
      recursionLevel: 'Full',
      ...(path && { scopePath: path })
    }
  });
}

async function main() {
  const repoName = process.argv[2] || 'terraform';
  
  console.log(`🔍 Verificando repositório de Terraform: ${repoName}\n`);

  try {
    // Buscar repositório
    console.log('📦 Buscando repositório...');
    const repo = await getRepository(repoName);
    
    if (!repo) {
      console.error(`❌ Repositório "${repoName}" não encontrado`);
      console.log('\n💡 Repositórios relacionados a Terraform encontrados:');
      const allRepos = await apiRequest('_apis/git/repositories');
      const terraformRepos = allRepos.value.filter(r => 
        r.name.toLowerCase().includes('terraform') || 
        r.name.toLowerCase().includes('iac')
      );
      terraformRepos.forEach(r => console.log(`   - ${r.name}`));
      return;
    }

    console.log(`✅ Repositório encontrado: ${repo.name}\n`);
    console.log('📋 Informações do Repositório:');
    console.log(`   Nome: ${repo.name}`);
    console.log(`   ID: ${repo.id}`);
    console.log(`   URL: ${repo.webUrl || repo.url}`);
    console.log(`   Default Branch: ${repo.defaultBranch || 'N/A'}`);
    console.log(`   Size: ${repo.size ? (repo.size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
    console.log(`   Remote URL: ${repo.remoteUrl || 'N/A'}\n`);

    // Buscar branches
    console.log('🌿 Buscando branches...');
    const branches = await getBranches(repo.id);
    const branchNames = branches.value.map(b => b.name.replace('refs/heads/', ''));
    console.log(`✅ ${branchNames.length} branches encontrados:`);
    branchNames.slice(0, 10).forEach(b => console.log(`   - ${b}`));
    if (branchNames.length > 10) {
      console.log(`   ... e mais ${branchNames.length - 10} branches`);
    }
    console.log('');

    // Determinar branch principal
    const defaultBranch = repo.defaultBranch 
      ? repo.defaultBranch.replace('refs/heads/', '')
      : branchNames.find(b => ['main', 'master', 'dev'].includes(b)) || branchNames[0];

    console.log(`📝 Analisando branch: ${defaultBranch}\n`);

    // Buscar commits recentes
    console.log('📅 Buscando commits recentes...');
    try {
      const commits = await getCommits(repo.id, defaultBranch, 10);
      if (commits.value && commits.value.length > 0) {
        console.log(`✅ ${commits.value.length} commits recentes:\n`);
        commits.value.slice(0, 5).forEach((commit, idx) => {
          const date = new Date(commit.committer.date).toLocaleString('pt-BR');
          console.log(`${idx + 1}. [${date}] ${commit.comment || 'Sem mensagem'}`);
          console.log(`   Autor: ${commit.committer.name || commit.committer.email}`);
          console.log(`   Hash: ${commit.commitId.substring(0, 7)}`);
          console.log(`   Link: ${commit.remoteUrl || repo.webUrl + '/commit/' + commit.commitId}\n`);
        });
      }
    } catch (error) {
      console.log(`⚠️  Não foi possível buscar commits: ${error.message}\n`);
    }

    // Buscar estrutura de arquivos
    console.log('📁 Analisando estrutura de arquivos...');
    try {
      const items = await getItems(repo.id, defaultBranch);
      if (items.value && items.value.length > 0) {
        console.log(`✅ ${items.value.length} itens encontrados\n`);
        
        // Filtrar apenas arquivos .tf
        const tfFiles = items.value.filter(item => 
          item.path && (item.path.endsWith('.tf') || item.path.endsWith('.tfvars'))
        );
        
        if (tfFiles.length > 0) {
          console.log(`📄 Arquivos Terraform encontrados: ${tfFiles.length}\n`);
          
          // Agrupar por diretório
          const byDir = {};
          tfFiles.forEach(file => {
            const dir = file.path.includes('/') 
              ? file.path.substring(0, file.path.lastIndexOf('/'))
              : '/';
            if (!byDir[dir]) byDir[dir] = [];
            byDir[dir].push(file.path);
          });

          Object.entries(byDir).sort().forEach(([dir, files]) => {
            console.log(`📂 ${dir || 'raiz'}:`);
            files.forEach(file => {
              const fileName = file.includes('/') ? file.substring(file.lastIndexOf('/') + 1) : file;
              const size = items.value.find(i => i.path === file)?.size || 0;
              console.log(`   - ${fileName} (${size} bytes)`);
            });
            console.log('');
          });
        } else {
          console.log('⚠️  Nenhum arquivo .tf encontrado na raiz');
        }

        // Listar diretórios principais
        const directories = items.value
          .filter(item => item.isFolder)
          .map(item => item.path)
          .filter(path => path && !path.includes('/') || path.split('/').length === 1)
          .slice(0, 20);

        if (directories.length > 0) {
          console.log('📂 Diretórios principais:');
          directories.forEach(dir => console.log(`   - ${dir}`));
          console.log('');
        }
      }
    } catch (error) {
      console.log(`⚠️  Não foi possível buscar estrutura: ${error.message}\n`);
    }

    // Resumo
    console.log('='.repeat(80));
    console.log('📊 RESUMO');
    console.log('='.repeat(80));
    console.log(`Repositório: ${repo.name}`);
    console.log(`Branches: ${branchNames.length}`);
    console.log(`Branch Principal: ${defaultBranch}`);
    console.log(`URL: ${repo.webUrl || repo.url}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Erro ao verificar repositório:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

