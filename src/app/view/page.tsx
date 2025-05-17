import { getHandbookBySubdomain } from '@/lib/handbook-service';
import { Suspense } from 'react';

// Ny komponent som använder searchParams istället för dynamic routes
export default function HandbookViewPage({
  searchParams,
}: {
  searchParams: { company?: string };
}) {
  return (
    <div className="min-h-screen bg-white p-4">
      <Suspense fallback={<HandbookLoading />}>
        <HandbookContent company={searchParams.company} />
      </Suspense>
    </div>
  );
}

// Loading-state
function HandbookLoading() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Laddar handbok...</h1>
      <div className="animate-pulse h-8 bg-gray-200 rounded mb-4 w-1/3"></div>
      <div className="animate-pulse h-4 bg-gray-200 rounded mb-8 w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1">
          <div className="animate-pulse h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded mb-2 w-full"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded mb-2 w-full"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded mb-2 w-full"></div>
        </div>
        <div className="md:col-span-3">
          <div className="animate-pulse h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded mb-8 w-3/4"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded mb-2 w-full"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded mb-2 w-full"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded mb-2 w-full"></div>
        </div>
      </div>
    </div>
  );
}

// Async component för att hämta handboken
async function HandbookContent({ company }: { company?: string }) {
  // Om ingen company är angiven
  if (!company) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Välkommen till Handbok.org</h1>
        <p className="mb-4">Ange din företagssubdomän i URL:en för att se din handbok.</p>
        <p className="text-gray-500">Exempel: <code>handbok.org/view?company=företagsnamn</code></p>
      </div>
    );
  }

  // Försök hämta handbook
  let handbook = null;
  try {
    handbook = await getHandbookBySubdomain(company);
  } catch (error) {
    console.error('Error fetching handbook:', error);
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Något gick fel</h1>
        <p>Vi kunde inte hämta handboken just nu. Försök igen senare.</p>
        <p className="text-gray-500 mt-4">Företag: {company}</p>
      </div>
    );
  }
  
  // Om ingen handbook hittades
  if (!handbook) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Handbok saknas</h1>
        <p>Handboken för "{company}" kunde inte hittas.</p>
        <p className="text-gray-500 mt-4">Kontrollera att du använder rätt namn.</p>
      </div>
    );
  }
  
  return (
    <div>
      <header className="bg-white border-b mb-8 p-4">
        <h1 className="text-3xl font-bold">{handbook.name}</h1>
        <p className="text-gray-500">Digital handbok</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 p-4">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <nav className="space-y-1 sticky top-8">
            <h2 className="font-medium mb-4">Innehåll</h2>
            {handbook.sections?.map((section) => (
              <a
                key={section.id}
                href={`#section-${section.id}`}
                className="block p-2 text-sm hover:bg-gray-50 rounded"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="md:col-span-3 space-y-12">
          {handbook.sections?.map((section) => (
            <section key={section.id} id={`section-${section.id}`} className="space-y-6">
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <p className="text-gray-500">{section.description}</p>
              
              <div className="space-y-8">
                {section.pages?.map((page) => (
                  <div key={page.id} className="space-y-2">
                    <h3 className="text-xl font-medium">{page.title}</h3>
                    <div className="prose prose-sm max-w-none">
                      {page.content}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      
      <footer className="bg-gray-50 border-t mt-12 p-6 text-center">
        <p className="text-gray-500 text-sm">
          Powered by <span className="font-medium">Handbok.org</span>
        </p>
      </footer>
    </div>
  );
} 