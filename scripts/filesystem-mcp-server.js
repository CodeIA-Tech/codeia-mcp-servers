#!/usr/bin/env node
/**
 * MCP Server para Acesso a Arquivos Locais
 * 
 * Suporta leitura de:
 * - Arquivos de texto (txt, md, json, yaml, etc)
 * - Documentos Office (Word, Excel, PowerPoint)
 * - PDFs
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Importar bibliotecas para arquivos Office (opcional, instalar se necessário)
let mammoth = null;
let XLSX = null;
let pdfParse = null;

// Função para carregar bibliotecas dinamicamente
async function loadLibraries() {
  if (mammoth === null) {
    try {
      mammoth = (await import('mammoth')).default;
    } catch (e) {
      // Silencioso - biblioteca opcional
    }
  }
  if (XLSX === null) {
    try {
      XLSX = (await import('xlsx')).default;
    } catch (e) {
      // Silencioso - biblioteca opcional
    }
  }
  if (pdfParse === null) {
    try {
      pdfParse = (await import('pdf-parse')).default;
    } catch (e) {
      // Silencioso - biblioteca opcional
    }
  }
}

class FilesystemMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'filesystem-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.basePath = process.env.FILESYSTEM_BASE_PATH || process.cwd();
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_files',
          description: 'Lista arquivos e diretórios em um caminho especificado. Retorna informações sobre arquivos e subdiretórios.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Caminho do diretório a listar. Se não especificado, usa o diretório base.',
              },
              recursive: {
                type: 'boolean',
                description: 'Se true, lista recursivamente todos os subdiretórios. Padrão: false',
                default: false,
              },
              extensions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filtrar por extensões de arquivo (ex: [".txt", ".docx"]). Se não especificado, retorna todos os arquivos.',
              },
            },
          },
        },
        {
          name: 'read_file',
          description: 'Lê o conteúdo de um arquivo. Suporta arquivos de texto, documentos Office (Word, Excel, PowerPoint) e PDFs.',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Caminho completo do arquivo a ser lido (relativo ao diretório base ou absoluto).',
              },
              max_length: {
                type: 'number',
                description: 'Número máximo de caracteres a retornar. Se não especificado, retorna o arquivo completo.',
              },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'read_file_info',
          description: 'Obtém informações sobre um arquivo (tamanho, data de modificação, tipo, etc) sem ler o conteúdo.',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Caminho completo do arquivo (relativo ao diretório base ou absoluto).',
              },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'search_files',
          description: 'Busca arquivos por nome ou padrão. Suporta busca recursiva.',
          inputSchema: {
            type: 'object',
            properties: {
              pattern: {
                type: 'string',
                description: 'Padrão de busca (nome do arquivo ou parte dele). Suporta wildcards (* e ?).',
              },
              directory: {
                type: 'string',
                description: 'Diretório onde buscar. Se não especificado, usa o diretório base.',
              },
              recursive: {
                type: 'boolean',
                description: 'Se true, busca recursivamente em subdiretórios. Padrão: true',
                default: true,
              },
            },
            required: ['pattern'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_files':
            return await this.listFiles(args);
          case 'read_file':
            return await this.readFile(args);
          case 'read_file_info':
            return await this.readFileInfo(args);
          case 'search_files':
            return await this.searchFiles(args);
          default:
            throw new Error(`Ferramenta desconhecida: ${name}`);
        }
      } catch (error) {
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
    });
  }

  /**
   * Resolve o caminho do arquivo (relativo ou absoluto)
   */
  resolvePath(filePath) {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this.basePath, filePath);
  }

  /**
   * Verifica se o caminho está dentro do diretório base (segurança)
   */
  isPathSafe(resolvedPath) {
    const base = path.resolve(this.basePath);
    const resolved = path.resolve(resolvedPath);
    return resolved.startsWith(base);
  }

  /**
   * Lista arquivos em um diretório
   */
  async listFiles(args) {
    const { path: dirPath = this.basePath, recursive = false, extensions = null } = args || {};
    const resolvedPath = this.resolvePath(dirPath);

    if (!this.isPathSafe(resolvedPath)) {
      throw new Error('Caminho fora do diretório base permitido');
    }

    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error('O caminho especificado não é um diretório');
    }

    const files = [];
    
    async function scanDirectory(currentPath, currentRelative = '') {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.join(currentRelative, entry.name);
        
        if (entry.isDirectory()) {
          files.push({
            name: entry.name,
            path: relativePath,
            type: 'directory',
            full_path: fullPath,
          });
          
          if (recursive) {
            await scanDirectory(fullPath, relativePath);
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          
          // Filtrar por extensões se especificado
          if (extensions && extensions.length > 0 && !extensions.includes(ext)) {
            continue;
          }
          
          const fileStats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: relativePath,
            type: 'file',
            extension: ext,
            size: fileStats.size,
            modified: fileStats.mtime.toISOString(),
            full_path: fullPath,
          });
        }
      }
    }

    await scanDirectory(resolvedPath, dirPath === this.basePath ? '' : path.relative(this.basePath, resolvedPath));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            directory: resolvedPath,
            total_files: files.filter(f => f.type === 'file').length,
            total_directories: files.filter(f => f.type === 'directory').length,
            files: files,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Lê o conteúdo de um arquivo
   */
  async readFile(args) {
    const { file_path, max_length } = args || {};
    
    if (!file_path) {
      throw new Error('file_path é obrigatório');
    }

    const resolvedPath = this.resolvePath(file_path);

    if (!this.isPathSafe(resolvedPath)) {
      throw new Error('Caminho fora do diretório base permitido');
    }

    const stats = await fs.stat(resolvedPath);
    if (!stats.isFile()) {
      throw new Error('O caminho especificado não é um arquivo');
    }

    const ext = path.extname(file_path).toLowerCase();
    let content = '';

    // Arquivos de texto simples
    if (['.txt', '.md', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.log'].includes(ext)) {
      content = await fs.readFile(resolvedPath, 'utf-8');
    }
    // Word (.docx)
    else if (ext === '.docx') {
      await loadLibraries();
      if (mammoth) {
        const result = await mammoth.extractRawText({ path: resolvedPath });
        content = result.value;
        if (result.messages.length > 0) {
          content += '\n\n[Avisos: ' + result.messages.map(m => m.message).join(', ') + ']';
        }
      } else {
        throw new Error('Biblioteca mammoth não instalada. Instale com: npm install mammoth');
      }
    }
    // Excel (.xlsx, .xls)
    else if (['.xlsx', '.xls'].includes(ext)) {
      await loadLibraries();
      if (XLSX) {
        const workbook = XLSX.readFile(resolvedPath);
        const sheets = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          sheets.push({
            name: sheetName,
            data: data,
          });
        });
        
        content = JSON.stringify(sheets, null, 2);
      } else {
        throw new Error('Biblioteca xlsx não instalada. Instale com: npm install xlsx');
      }
    }
    // PowerPoint (.pptx) - leitura básica
    else if (ext === '.pptx') {
      // Para PPTX, precisaríamos de uma biblioteca específica
      // Por enquanto, retornamos informação básica
      content = `[Arquivo PowerPoint (.pptx) detectado. Leitura de conteúdo ainda não implementada. Use read_file_info para obter informações do arquivo.]`;
    }
    // PDF
    else if (ext === '.pdf') {
      await loadLibraries();
      if (pdfParse) {
        const dataBuffer = await fs.readFile(resolvedPath);
        const pdfData = await pdfParse(dataBuffer);
        content = pdfData.text;
      } else {
        throw new Error('Biblioteca pdf-parse não instalada. Instale com: npm install pdf-parse');
      }
    }
    // Outros arquivos binários
    else {
      // Tentar ler como texto UTF-8, se falhar, informar que é binário
      try {
        content = await fs.readFile(resolvedPath, 'utf-8');
        // Verificar se contém caracteres não imprimíveis
        if (/[\x00-\x08\x0E-\x1F]/.test(content)) {
          throw new Error('Arquivo binário detectado');
        }
      } catch (e) {
        throw new Error(`Tipo de arquivo não suportado ou binário: ${ext}. Use read_file_info para obter informações.`);
      }
    }

    // Limitar tamanho se especificado
    if (max_length && content.length > max_length) {
      content = content.substring(0, max_length) + '\n\n[... conteúdo truncado ...]';
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            file_path: file_path,
            full_path: resolvedPath,
            extension: ext,
            size: stats.size,
            content: content,
            content_length: content.length,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Obtém informações sobre um arquivo
   */
  async readFileInfo(args) {
    const { file_path } = args || {};
    
    if (!file_path) {
      throw new Error('file_path é obrigatório');
    }

    const resolvedPath = this.resolvePath(file_path);

    if (!this.isPathSafe(resolvedPath)) {
      throw new Error('Caminho fora do diretório base permitido');
    }

    const stats = await fs.stat(resolvedPath);
    const ext = path.extname(file_path).toLowerCase();

    const info = {
      file_path: file_path,
      full_path: resolvedPath,
      name: path.basename(file_path),
      extension: ext,
      type: stats.isFile() ? 'file' : stats.isDirectory() ? 'directory' : 'other',
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
      permissions: stats.mode.toString(8),
    };

    // Adicionar informações específicas por tipo
    if (stats.isFile()) {
      if (['.docx', '.xlsx', '.pptx', '.pdf'].includes(ext)) {
        info.supported = true;
        info.format = ext === '.docx' ? 'Microsoft Word' :
                     ext === '.xlsx' ? 'Microsoft Excel' :
                     ext === '.pptx' ? 'Microsoft PowerPoint' :
                     'PDF';
      } else {
        info.supported = ['.txt', '.md', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.log'].includes(ext);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  }

  /**
   * Busca arquivos por padrão
   */
  async searchFiles(args) {
    const { pattern, directory = this.basePath, recursive = true } = args || {};
    
    if (!pattern) {
      throw new Error('pattern é obrigatório');
    }

    const resolvedPath = this.resolvePath(directory);

    if (!this.isPathSafe(resolvedPath)) {
      throw new Error('Caminho fora do diretório base permitido');
    }

    const results = [];
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'), 'i');

    async function searchDirectory(currentPath, currentRelative = '') {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          const relativePath = path.join(currentRelative, entry.name);
          
          if (entry.isDirectory() && recursive) {
            await searchDirectory(fullPath, relativePath);
          } else if (entry.isFile() && regex.test(entry.name)) {
            const fileStats = await fs.stat(fullPath);
            results.push({
              name: entry.name,
              path: relativePath,
              full_path: fullPath,
              size: fileStats.size,
              modified: fileStats.mtime.toISOString(),
              extension: path.extname(entry.name).toLowerCase(),
            });
          }
        }
      } catch (error) {
        // Ignorar erros de permissão
        if (error.code !== 'EACCES' && error.code !== 'EPERM') {
          throw error;
        }
      }
    }

    await searchDirectory(resolvedPath, directory === this.basePath ? '' : path.relative(this.basePath, resolvedPath));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            pattern: pattern,
            directory: resolvedPath,
            total_results: results.length,
            results: results,
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Filesystem MCP Server rodando');
  }
}

// Executar servidor
const server = new FilesystemMCPServer();
server.run().catch(console.error);

