# Git Configuration

## 🚀 Setup Inicial

### 1. Instalar Git
- Baixe em: https://git-scm.com/download/win
- Instale com configurações padrão

### 2. Configurar Git (primeira vez)
```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

### 3. Criar Repositório no GitHub
1. Acesse: https://github.com
2. Clique em "New repository"
3. Nome: `playlist-creator`
4. Descrição: `Intelligent playlist creator with multi-platform integration`
5. Público ou Privado (sua escolha)
6. **NÃO** marque "Add README" (já criamos)
7. Clique "Create repository"

### 4. Conectar Repositório Local
```bash
# Inicializar git no projeto
git init

# Adicionar arquivos
git add .

# Primeiro commit
git commit -m "feat: initial project setup with documentation"

# Conectar com GitHub (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/playlist-creator.git

# Enviar para GitHub
git push -u origin main
```

## 📝 Convenções de Commit

### Formato
```
tipo(escopo): descrição

Corpo da mensagem (opcional)

Rodapé (opcional)
```

### Tipos
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Tarefas de manutenção

### Exemplos
```bash
git commit -m "feat(auth): implement Spotify OAuth integration"
git commit -m "fix(playlist): resolve duplicate songs issue"
git commit -m "docs(api): add playlist endpoints documentation"
git commit -m "refactor(components): extract PlaylistCard component"
```

## 🌿 Estratégia de Branches

### Branches Principais
- `main`: Código de produção
- `develop`: Desenvolvimento principal

### Branches de Feature
- `feature/auth-system`: Sistema de autenticação
- `feature/spotify-integration`: Integração Spotify
- `feature/mood-analysis`: Análise de humor
- `feature/playlist-conversion`: Conversão entre plataformas

### Branches de Correção
- `hotfix/critical-bug`: Correções urgentes
- `bugfix/playlist-sync`: Correções de bugs

## 🔄 Workflow de Desenvolvimento

### 1. Criar Branch
```bash
git checkout -b feature/nova-funcionalidade
```

### 2. Desenvolver
```bash
# Fazer mudanças
git add .
git commit -m "feat: implement new feature"
```

### 3. Sincronizar
```bash
# Atualizar branch principal
git checkout main
git pull origin main

# Voltar para feature branch
git checkout feature/nova-funcionalidade
git rebase main
```

### 4. Enviar Pull Request
```bash
git push origin feature/nova-funcionalidade
```

## 🏷️ Tags e Releases

### Criar Tag
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Releases no GitHub
1. Acesse: https://github.com/SEU_USUARIO/playlist-creator/releases
2. Clique "Create a new release"
3. Escolha a tag
4. Adicione descrição das mudanças
5. Publique

## 🔧 Comandos Úteis

### Status e Log
```bash
git status                    # Ver arquivos modificados
git log --oneline            # Histórico compacto
git log --graph --oneline    # Histórico com gráfico
```

### Desfazer Mudanças
```bash
git checkout -- arquivo.txt  # Desfazer mudanças não commitadas
git reset HEAD~1             # Desfazer último commit
git revert HEAD              # Criar commit que desfaz mudanças
```

### Stash (Salvar temporariamente)
```bash
git stash                    # Salvar mudanças temporariamente
git stash pop                # Restaurar mudanças salvas
git stash list               # Listar stashes
```

## 🚨 Resolução de Conflitos

### Quando ocorrem conflitos
```bash
# Durante merge ou rebase
git status                   # Ver arquivos com conflito
# Editar arquivos manualmente
git add arquivo-resolvido.txt
git commit                   # Finalizar resolução
```

### Prevenir conflitos
```bash
# Sempre sincronizar antes de trabalhar
git pull origin main
git rebase main
```

---

**Git é essencial para desenvolvimento colaborativo! Vamos usar desde o início! 🚀**
