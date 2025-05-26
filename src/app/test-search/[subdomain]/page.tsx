import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon } from 'lucide-react';

interface TestSearchPageProps {
  params: Promise<{
    subdomain: string;
  }>;
}

export default async function TestSearchPage({ params }: TestSearchPageProps) {
  const { subdomain } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Sökresultat funkar! 🎉
          </h1>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Du valde förening:</p>
            <p className="text-lg font-semibold text-blue-600">
              {subdomain}
            </p>
          </div>
          
          <p className="text-gray-600 mb-6">
            I produktion skulle detta ta dig till <br />
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              https://{subdomain}.handbok.org
            </code>
          </p>
          
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Tillbaka till startsidan
          </Link>
        </div>
      </div>
    </div>
  );
} 