# Guia de Contribuição

Obrigado por contribuir com o Codeia MCP Servers! 🎉

## Como Contribuir

### Reportar Bugs

1. Verifique se o bug já não foi reportado nas Issues
2. Crie uma nova Issue com:
   - Descrição clara do problema
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Ambiente (OS, versão do Cursor, etc.)

### Sugerir Melhorias

1. Abra uma Issue descrevendo:
   - O problema ou necessidade
   - Como a melhoria ajudaria
   - Exemplos de uso

### Adicionar Configurações MCP

1. Crie um novo arquivo em `mcp/` seguindo o padrão:
   ```json
   {
     "mcpServers": {
       "nome-do-servidor": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-nome"],
         "env": {
           "VARIAVEL": "${VARIAVEL}"
         },
         "description": "Descrição clara do que faz"
       }
     }
   }
   ```

2. Documente no README.md
3. Teste a configuração

### Adicionar System Prompts

1. Crie arquivo em `rules/<contexto>/<nome>.md`
2. Siga a estrutura:
   - Título claro
   - Seções organizadas
   - Exemplos práticos
   - Comandos úteis quando aplicável

3. Atualize o README.md

### Melhorar Scripts

1. Mantenha compatibilidade com bash (evite bashisms específicos)
2. Adicione validação de inputs
3. Forneça mensagens de erro claras
4. Teste em diferentes ambientes quando possível

## Padrões de Código

- **JSON**: Use 2 espaços para indentação
- **Markdown**: Siga o estilo do projeto
- **Bash**: Use `#!/bin/bash` e `set -e`

## Processo de Pull Request

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/minha-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona feature'`)
4. Push para a branch (`git push origin feature/minha-feature`)
5. Abra um Pull Request

## Checklist antes de fazer PR

- [ ] Código/documentação segue os padrões
- [ ] Testado localmente
- [ ] README atualizado se necessário
- [ ] Sem secrets ou tokens hardcoded
- [ ] Scripts têm permissão de execução

Obrigado! 🚀

