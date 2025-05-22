import { MainLayout } from "@/components/layout/MainLayout";
import AutoSuggestHandbookSearch from "@/components/AutoSuggestHandbookSearch";

export default function SearchPage() {
  return (
    <MainLayout variant="landing" showHeader={true} noWhiteTop={false}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Hitta din
              <span className="text-blue-600"> förening</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Sök efter din bostadsrättsförening för att få tillgång till er digitala handbok.
            </p>
          </div>
          
          <div className="max-w-xl mx-auto">
            <AutoSuggestHandbookSearch hideHeader={true} />
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-600 text-sm">
              Saknas din förening? Kontakta din styrelse och berätta om Handbok.org.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 