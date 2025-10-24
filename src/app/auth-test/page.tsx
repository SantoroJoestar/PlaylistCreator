/**
 * 🔐 Authentication Test Page
 * 
 * Página para testar sistema de autenticação:
 * - Registro e login
 * - OAuth com plataformas
 * - Gerenciamento de tokens
 */

'use client';

import { useState, useEffect } from 'react';
import { Platform } from '@/lib/config/platforms';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface PlatformIntegration {
  platform: string;
  isActive: boolean;
  connectedAt: string;
  lastSyncAt?: string;
}

export default function AuthTestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [platforms, setPlatforms] = useState<PlatformIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para formulários
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', name: '' });

  // Verificar se usuário está logado
  useEffect(() => {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (storedTokens) {
      const parsedTokens = JSON.parse(storedTokens);
      setTokens(parsedTokens);
      fetchUserData(parsedTokens.accessToken);
    }
  }, []);

  const fetchUserData = async (accessToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.data.user);
        setPlatforms(result.data.platforms);
      } else {
        // Token inválido, limpar dados
        localStorage.removeItem('auth_tokens');
        setTokens(null);
        setUser(null);
        setPlatforms([]);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerForm)
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.data.user);
        setTokens(result.data.tokens);
        localStorage.setItem('auth_tokens', JSON.stringify(result.data.tokens));
        setRegisterForm({ email: '', password: '', name: '' });
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.data.user);
        setTokens(result.data.tokens);
        localStorage.setItem('auth_tokens', JSON.stringify(result.data.tokens));
        setLoginForm({ email: '', password: '' });
        await fetchUserData(result.data.tokens.accessToken);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (tokens) {
        await fetch('/api/auth/logout', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_tokens');
      setUser(null);
      setTokens(null);
      setPlatforms([]);
    }
  };

  const handleOAuthConnect = async (platform: Platform) => {
    if (!user) {
      setError('Please login first');
      return;
    }

    try {
      const response = await fetch(`/api/auth/oauth/${platform}?userId=${user.id}`);
      const result = await response.json();

      if (result.success) {
        // Abrir popup para OAuth
        const popup = window.open(
          result.data.authUrl,
          `${platform}_oauth`,
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );

        // Escutar mensagem do popup
        const messageListener = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'oauth_success') {
            popup?.close();
            window.removeEventListener('message', messageListener);
            
            // Atualizar dados do usuário
            fetchUserData(tokens!.accessToken);
            setError(null);
          } else if (event.data.type === 'oauth_error') {
            popup?.close();
            window.removeEventListener('message', messageListener);
            setError(event.data.error);
          }
        };

        window.addEventListener('message', messageListener);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(`Failed to connect to ${platform}`);
    }
  };

  const handleOAuthDisconnect = async (platform: string) => {
    if (!tokens) return;

    try {
      const response = await fetch(`/api/auth/oauth/${platform}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`
        }
      });

      const result = await response.json();

      if (result.success) {
        await fetchUserData(tokens.accessToken);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(`Failed to disconnect from ${platform}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🔐 Authentication Test
          </h1>
          <p className="text-xl text-gray-300">
            Teste completo do sistema de autenticação
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* User Status */}
        {user ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              ✅ Usuário Autenticado
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-white font-medium mb-3">Dados do Usuário:</h3>
                <div className="space-y-2 text-gray-300">
                  <p><strong>ID:</strong> {user.id}</p>
                  <p><strong>Nome:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Criado em:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <h3 className="text-white font-medium mb-3">Tokens:</h3>
                <div className="space-y-2 text-gray-300">
                  <p><strong>Access Token:</strong> {tokens?.accessToken.substring(0, 20)}...</p>
                  <p><strong>Refresh Token:</strong> {tokens?.refreshToken.substring(0, 20)}...</p>
                  <p><strong>Expira em:</strong> {tokens?.expiresIn} segundos</p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Register Form */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">
                📝 Registrar Usuário
              </h2>
              
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Nome:
                  </label>
                  <input
                    type="text"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                    placeholder="Seu nome"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Email:
                  </label>
                  <input
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Senha:
                  </label>
                  <input
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? '⏳ Registrando...' : '📝 Registrar'}
                </button>
              </form>
            </div>

            {/* Login Form */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
              <h2 className="text-2xl font-semibold text-white mb-6">
                🔑 Login
              </h2>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Email:
                  </label>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Senha:
                  </label>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white"
                    placeholder="Sua senha"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all disabled:opacity-50"
                >
                  {isLoading ? '⏳ Entrando...' : '🔑 Login'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Platform Integrations */}
        {user && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
            <h2 className="text-2xl font-semibold text-white mb-6">
              🎵 Integrações com Plataformas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['spotify', 'youtube', 'apple'] as Platform[]).map((platform) => {
                const isConnected = platforms.some(p => 
                  p.platform.toLowerCase() === platform && p.isActive
                );

                return (
                  <div
                    key={platform}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      isConnected
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-gray-600 bg-white/5'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl mb-3">
                        {platform === 'spotify' && '🎵'}
                        {platform === 'youtube' && '📺'}
                        {platform === 'apple' && '🍎'}
                      </div>
                      
                      <h3 className="text-white font-semibold mb-2 capitalize">
                        {platform}
                      </h3>
                      
                      <p className="text-gray-400 text-sm mb-4">
                        {isConnected ? '✅ Conectado' : '❌ Não conectado'}
                      </p>

                      {isConnected ? (
                        <button
                          onClick={() => handleOAuthDisconnect(platform)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Desconectar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOAuthConnect(platform)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Conectar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connected Platforms Details */}
            {platforms.length > 0 && (
              <div className="mt-8">
                <h3 className="text-white font-semibold mb-4">Plataformas Conectadas:</h3>
                <div className="space-y-3">
                  {platforms.map((platform) => (
                    <div
                      key={platform.platform}
                      className="bg-white/5 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-medium capitalize">
                            {platform.platform}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Conectado em: {new Date(platform.connectedAt).toLocaleDateString()}
                          </p>
                          {platform.lastSyncAt && (
                            <p className="text-gray-400 text-sm">
                              Última sincronização: {new Date(platform.lastSyncAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className="text-green-400 text-sm font-medium">
                          ✅ Ativo
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Architecture Info */}
        <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">🏗️ Arquitetura de Autenticação:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <div className="font-medium text-white mb-2">✅ Autenticação Local</div>
              <div>JWT tokens, bcrypt, validação</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">✅ OAuth Multiplataforma</div>
              <div>Spotify, YouTube, Apple Music</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">✅ Middleware de Proteção</div>
              <div>Validação automática de tokens</div>
            </div>
            <div>
              <div className="font-medium text-white mb-2">✅ Refresh Tokens</div>
              <div>Renovação automática de acesso</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
