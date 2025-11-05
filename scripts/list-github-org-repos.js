#!/usr/bin/env node
/**
 * Script para listar repositórios de uma organização GitHub
 * Uso: node scripts/list-github-org-repos.js [org-name]
 */

const https = require('https');

const ORG_NAME = process.argv[2] || process.env.GITHUB_ORG || 'CodeIA-Tech';
// Tentar obter token do GitHub CLI se disponível
let GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GIT_TOKEN;

// Se não encontrar, tentar via GitHub CLI
if (!GITHUB_TOKEN && process.env.USE_GH_CLI === 'true') {
  const { execSync } = require('child_process');
  try {
    GITHUB_TOKEN = execSync('gh secret get GIT_TOKEN --repo CodeIA-Tech/codeia-mcp-servers 2>/dev/null', { encoding: 'utf-8' }).trim();
  } catch (e) {
    // Ignorar erro
  }
}

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN ou GIT_TOKEN é obrigatório');
  console.error('💡 Configure: export GITHUB_TOKEN="seu-token"');
  process.exit(1);
}

function listOrgRepos(org, page = 1, perPage = 100) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/orgs/${org}/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`;
    
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/orgs/${org}/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`,
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'codeia-mcp-servers',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const repos = JSON.parse(data);
            const links = res.headers.link;
            
            // Verificar se há mais páginas
            const hasMore = links && links.includes('rel="next"');
            
            resolve({ repos, hasMore, nextPage: hasMore ? page + 1 : null });
          } catch (e) {
            reject(new Error(`Erro ao parsear resposta: ${e.message}`));
          }
        } else if (res.statusCode === 404) {
          reject(new Error(`Organização '${org}' não encontrada ou sem acesso`));
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error(`Erro de autenticação (${res.statusCode}). Verifique seu token.`));
        } else {
          reject(new Error(`Erro da API: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function getAllRepos(org) {
  let allRepos = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const { repos, hasMore: more, nextPage } = await listOrgRepos(org, page);
      allRepos = allRepos.concat(repos);
      hasMore = more;
      page = nextPage;
    } catch (error) {
      throw error;
    }
  }

  return allRepos;
}

function formatRepoInfo(repo) {
  return {
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description || '(sem descrição)',
    private: repo.private,
    language: repo.language || 'N/A',
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    open_issues: repo.open_issues_count,
    updated_at: repo.updated_at,
    url: repo.html_url,
    clone_url: repo.clone_url
  };
}

async function main() {
  try {
    console.log(`🔍 Listando repositórios da organização: ${ORG_NAME}`);
    console.log('');

    const repos = await getAllRepos(ORG_NAME);

    if (repos.length === 0) {
      console.log('📭 Nenhum repositório encontrado');
      return;
    }

    console.log(`📦 Total de repositórios encontrados: ${repos.length}`);
    console.log('');

    // Formatar e exibir
    const formattedRepos = repos.map(formatRepoInfo);

    // Tabela simples
    console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ Repositórios da Organização CodeIA-Tech                                     │');
    console.log('├─────────────────────────────────────────────────────────────────────────────┤');
    
    formattedRepos.forEach((repo, index) => {
      const privateLabel = repo.private ? '🔒' : '🌐';
      const stars = repo.stars > 0 ? `⭐ ${repo.stars}` : '';
      const forks = repo.forks > 0 ? `🍴 ${repo.forks}` : '';
      
      console.log(`│ ${index + 1}. ${privateLabel} ${repo.name.padEnd(35)} ${repo.language.padEnd(10)} ${stars} ${forks} │`);
      if (repo.description && repo.description.length > 0) {
        const desc = repo.description.substring(0, 65).padEnd(65);
        console.log(`│    ${desc} │`);
      }
    });
    
    console.log('└─────────────────────────────────────────────────────────────────────────────┘');
    console.log('');

    // Estatísticas
    const publicRepos = repos.filter(r => !r.private).length;
    const privateRepos = repos.filter(r => r.private).length;
    const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];

    console.log('📊 Estatísticas:');
    console.log(`   • Total: ${repos.length}`);
    console.log(`   • Públicos: ${publicRepos}`);
    console.log(`   • Privados: ${privateRepos}`);
    console.log(`   • Linguagens: ${languages.join(', ')}`);
    console.log('');

    // JSON output (para uso programático)
    if (process.env.JSON_OUTPUT === 'true') {
      console.log(JSON.stringify(formattedRepos, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();

