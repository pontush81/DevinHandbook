import Link from 'next/link';
import NotFoundActions from './components/not-found/NotFoundActions';
import { MainLayout } from '@/components/layout/MainLayout';
import { NotFoundClientScript } from './components/not-found/NotFoundClientScript';

export default function NotFound() {
  return (
    <MainLayout variant="landing" showAuth={false}>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404 - Sidan kunde inte hittas</h1>
          <p className="text-xl text-gray-600 mb-8">
            Vi kan tyvärr inte hitta sidan du letar efter. Den kan ha flyttats eller tagits bort.
          </p>
          <div className="border-t border-b border-gray-200 py-8 my-8">
            <p className="text-md text-gray-500 mb-4">Felkod: 404 Not Found</p>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <Link href="/" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white shadow hover:bg-blue-700 h-10 px-6 py-3">
                Gå till startsidan
              </Link>
              <Link href="/debug.html" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-100 hover:text-gray-800 h-10 px-6 py-3">
                CORS Diagnos
              </Link>
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-2">Har du problem med att ladda resurser?</h2>
            <p className="text-gray-600 mb-4">
              Detta kan bero på CORS-begränsningar. Prova någon av dessa lösningar:
            </p>
            <div className="flex flex-col gap-2 mt-4">
              <Link 
                href="/debug.html" 
                className="text-blue-600 hover:underline text-sm inline-flex items-center"
              >
                <span className="mr-1">→</span> Använd diagnosverktyget
              </Link>
              <NotFoundActions />
            </div>
          </div>
        </div>
        <NotFoundClientScript />
      </div>
    </MainLayout>
  );
} 