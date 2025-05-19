import { getHandbookBySubdomain } from '@/lib/handbook-service';
import HandbookClient from './HandbookClient';

// Ny serverkomponent som hämtar handboken och skickar till client component
export default async function HandbookViewPage({
  searchParams,
}: {
  searchParams: { company?: string };
}) {
  if (!searchParams.company) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Välkommen till Handbok.org</h1>
        <p className="mb-4">Ange din företagssubdomän i URL:en för att se din handbok.</p>
        <p className="text-gray-500">Exempel: <code>handbok.org/view?company=företagsnamn</code></p>
      </div>
    );
  }
  let handbook = null;
  try {
    handbook = await getHandbookBySubdomain(searchParams.company);
  } catch (error) {
    console.error('Error fetching handbook:', error);
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Något gick fel</h1>
        <p>Vi kunde inte hämta handboken just nu. Försök igen senare.</p>
        <p className="text-gray-500 mt-4">Företag: {searchParams.company}</p>
      </div>
    );
  }
  if (!handbook) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Handbok saknas</h1>
        <p>Handboken för "{searchParams.company}" kunde inte hittas.</p>
        <p className="text-gray-500 mt-4">Kontrollera att du använder rätt namn.</p>
      </div>
    );
  }
  return <HandbookClient handbook={handbook} />;
} 