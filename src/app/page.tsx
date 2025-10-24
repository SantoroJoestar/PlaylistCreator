import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">
            🎵 Playlist Creator
          </h1>
          <p className="text-xl text-gray-300">
            Intelligent playlist creator with multi-platform integration
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="text-white font-semibold mb-2">MVC Architecture</h3>
            <p className="text-gray-300 text-sm">
              Model-View-Controller pattern with clean separation of concerns
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <div className="text-3xl mb-3">🏭</div>
            <h3 className="text-white font-semibold mb-2">Design Patterns</h3>
            <p className="text-gray-300 text-sm">
              Factory, Repository, Object Literals and Strategy patterns
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-white font-semibold mb-2">SOLID Principles</h3>
            <p className="text-gray-300 text-sm">
              Single Responsibility, Open/Closed, and Dependency Inversion
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Link 
            href="/test"
            className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            🧪 Testar Arquitetura MVC
          </Link>
          
          <div className="text-gray-400 text-sm">
            Acesse <code className="bg-black/20 px-2 py-1 rounded">/test</code> para ver nossa implementação funcionando
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-12 bg-white/5 backdrop-blur-lg rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">🛠️ Tech Stack:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-green-400 font-medium">Next.js 14</div>
              <div className="text-gray-400">React Framework</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 font-medium">TypeScript</div>
              <div className="text-gray-400">Type Safety</div>
            </div>
            <div className="text-center">
              <div className="text-purple-400 font-medium">Tailwind CSS</div>
              <div className="text-gray-400">Styling</div>
            </div>
            <div className="text-center">
              <div className="text-orange-400 font-medium">Prisma</div>
              <div className="text-gray-400">Database ORM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}