# 🎵 Playlist Creator

Um aplicativo web inteligente para criação de playlists multi-plataforma com análise de humor e personalidade.

## 🎯 Funcionalidades

### ✨ Principais
- **Criação Inteligente**: Playlists baseadas em humor e personalidade
- **Multi-Plataforma**: Integração com Spotify, YouTube Music, Apple Music
- **Conversão**: Migração de playlists entre plataformas
- **Colaboração**: Playlists compartilhadas entre usuários

### 🧠 Inteligência
- **Análise de Humor**: Questionários para detectar estado emocional
- **Perfil de Personalidade**: Algoritmos para entender gostos musicais
- **IA Generativa**: Recomendações baseadas em contexto e preferências
- **Tendências**: Músicas populares por região e humor

## 🛠️ Stack Tecnológica

### Frontend
- **Next.js 14** com TypeScript
- **Tailwind CSS** + **Shadcn/ui**
- **React Query** para estado da API
- **Framer Motion** para animações

### Backend
- **Node.js** com **Express**
- **Prisma** + **PostgreSQL**
- **Redis** para cache
- **JWT** para autenticação

### Integrações
- **Spotify Web API**
- **YouTube Data API v3**
- **Apple Music API**
- **OpenAI API** para análise de humor

## 📊 Banco de Dados

### Estrutura Relacional (PostgreSQL)
```
Users
├── id, name, email, password
├── created_at, updated_at
└── preferences (JSON)

Playlists
├── id, name, description
├── user_id (FK)
├── platform, mood, personality_score
└── created_at, updated_at

Songs
├── id, title, artist, album
├── spotify_id, youtube_id, apple_id
├── duration, genre, year
└── audio_features (JSON)

PlaylistSongs
├── playlist_id (FK)
├── song_id (FK)
└── position, added_at

MoodAnalysis
├── id, user_id (FK)
├── mood_type, intensity
├── questionnaire_responses (JSON)
└── created_at
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- PostgreSQL 14+
- Redis (opcional)

### Instalação
```bash
# Clone o repositório
git clone <seu-repo>
cd playlist-creator

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env.local

# Execute migrações do banco
npx prisma migrate dev

# Inicie o servidor de desenvolvimento
npm run dev
```

## 📚 Aprendizado

Este projeto é desenvolvido como uma experiência de aprendizado em:
- **React** e **TypeScript**
- **Next.js** e **App Router**
- **Prisma** e **PostgreSQL**
- **APIs** e **OAuth**
- **IA** e **Machine Learning**

## 🎓 Progresso

- [x] Planejamento e estruturação
- [ ] Configuração do ambiente
- [ ] Setup do banco de dados
- [ ] Autenticação OAuth
- [ ] Integração Spotify
- [ ] Sistema de playlists
- [ ] Análise de humor
- [ ] Interface do usuário
- [ ] Deploy e produção

## 📖 Documentação da API

A documentação da API será gerada automaticamente usando **Swagger/OpenAPI** e estará disponível em `/api/docs` quando o projeto estiver rodando.

## 🤝 Contribuição

Este é um projeto de aprendizado! Sinta-se à vontade para:
- Fazer perguntas
- Sugerir melhorias
- Reportar bugs
- Contribuir com código

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

**Desenvolvido com ❤️ para aprender React, TypeScript e desenvolvimento full-stack!**
