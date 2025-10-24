# 📚 Documentação da API - Playlist Creator

## 🎯 Visão Geral

A API do Playlist Creator oferece endpoints para gerenciar usuários, playlists, músicas e integrações com plataformas de streaming.

**Base URL**: `http://localhost:3000/api`

## 🔐 Autenticação

A API usa **JWT (JSON Web Tokens)** para autenticação.

### Headers Obrigatórios
```http
Authorization: Bearer <seu-jwt-token>
Content-Type: application/json
```

## 👤 Usuários

### POST /api/auth/register
Registra um novo usuário.

**Body:**
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "João Silva",
    "email": "joao@email.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /api/auth/login
Autentica um usuário existente.

**Body:**
```json
{
  "email": "joao@email.com",
  "password": "senha123"
}
```

## 🎵 Playlists

### GET /api/playlists
Lista todas as playlists do usuário autenticado.

**Response:**
```json
{
  "playlists": [
    {
      "id": 1,
      "name": "Minha Playlist",
      "description": "Músicas para relaxar",
      "platform": "spotify",
      "mood": "calm",
      "songCount": 15,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /api/playlists
Cria uma nova playlist.

**Body:**
```json
{
  "name": "Nova Playlist",
  "description": "Descrição da playlist",
  "platform": "spotify",
  "mood": "happy",
  "songs": [
    {
      "spotifyId": "4iV5W9uYEdYUVa79Axb7Rh",
      "title": "Bohemian Rhapsody",
      "artist": "Queen"
    }
  ]
}
```

### GET /api/playlists/:id
Obtém detalhes de uma playlist específica.

### PUT /api/playlists/:id
Atualiza uma playlist existente.

### DELETE /api/playlists/:id
Remove uma playlist.

## 🎶 Músicas

### GET /api/songs/search
Busca músicas em todas as plataformas conectadas.

**Query Parameters:**
- `q`: Termo de busca
- `platform`: spotify, youtube, apple (opcional)
- `limit`: Número de resultados (padrão: 20)

**Response:**
```json
{
  "songs": [
    {
      "id": "4iV5W9uYEdYUVa79Axb7Rh",
      "title": "Bohemian Rhapsody",
      "artist": "Queen",
      "album": "A Night at the Opera",
      "duration": 355,
      "platform": "spotify",
      "previewUrl": "https://p.scdn.co/mp3-preview/..."
    }
  ]
}
```

## 🧠 Análise de Humor

### POST /api/mood/analyze
Analisa o humor do usuário baseado em questionário.

**Body:**
```json
{
  "responses": {
    "currentMood": "happy",
    "energyLevel": "high",
    "activity": "exercise",
    "timeOfDay": "morning",
    "weather": "sunny"
  }
}
```

**Response:**
```json
{
  "moodAnalysis": {
    "primaryMood": "energetic",
    "confidence": 0.85,
    "recommendedGenres": ["pop", "rock", "electronic"],
    "playlistSuggestions": [
      {
        "name": "Energia Matinal",
        "description": "Músicas para começar o dia com energia",
        "estimatedDuration": 45
      }
    ]
  }
}
```

## 🔄 Conversão de Playlists

### POST /api/playlists/:id/convert
Converte uma playlist para outra plataforma.

**Body:**
```json
{
  "targetPlatform": "youtube",
  "options": {
    "matchByTitle": true,
    "matchByArtist": true,
    "fuzzyMatch": true
  }
}
```

**Response:**
```json
{
  "conversion": {
    "originalPlaylist": {
      "id": 1,
      "platform": "spotify",
      "songCount": 15
    },
    "newPlaylist": {
      "id": 2,
      "platform": "youtube",
      "songCount": 12,
      "matchedSongs": 12,
      "unmatchedSongs": 3
    },
    "conversionRate": 0.8
  }
}
```

## 🔗 Integrações

### GET /api/integrations/status
Verifica status das integrações com plataformas.

**Response:**
```json
{
  "integrations": {
    "spotify": {
      "connected": true,
      "userProfile": {
        "id": "spotify_user_id",
        "displayName": "João Silva",
        "email": "joao@email.com"
      },
      "lastSync": "2024-01-15T10:30:00Z"
    },
    "youtube": {
      "connected": false,
      "authUrl": "https://accounts.google.com/oauth/..."
    },
    "apple": {
      "connected": false,
      "authUrl": "https://appleid.apple.com/auth/..."
    }
  }
}
```

### POST /api/integrations/spotify/connect
Inicia processo de conexão com Spotify.

**Response:**
```json
{
  "authUrl": "https://accounts.spotify.com/authorize?client_id=...",
  "state": "random_state_string"
}
```

## 📊 Estatísticas

### GET /api/stats/user
Estatísticas do usuário.

**Response:**
```json
{
  "stats": {
    "totalPlaylists": 5,
    "totalSongs": 150,
    "favoriteGenres": ["pop", "rock", "electronic"],
    "mostUsedPlatform": "spotify",
    "averagePlaylistLength": 30,
    "moodDistribution": {
      "happy": 0.4,
      "calm": 0.3,
      "energetic": 0.2,
      "sad": 0.1
    }
  }
}
```

## ❌ Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token inválido |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro interno |

## 🔄 Rate Limits

- **Autenticação**: 5 requests/minuto
- **Busca de músicas**: 100 requests/hora
- **Criação de playlists**: 20 requests/hora
- **Conversão**: 10 requests/hora

## 📝 Exemplos de Uso

### Criar playlist baseada em humor
```bash
curl -X POST http://localhost:3000/api/playlists \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Playlist Energética",
    "mood": "energetic",
    "autoGenerate": true
  }'
```

### Buscar músicas
```bash
curl "http://localhost:3000/api/songs/search?q=queen&platform=spotify&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

**Documentação gerada automaticamente com Swagger/OpenAPI**
