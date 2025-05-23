import { IconDemo } from '@/components/ui/HandbookSectionIcons'

export default function IconDemoPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Ikoner för Handbok-sektioner</h1>
          <p className="text-lg text-muted-foreground">
            Här kan du se alla olika ikonalternativ som är tillgängliga för ditt projekt.
            Du har redan Lucide React och Heroicons installerat, plus nu också React Icons.
          </p>
        </div>
        
        <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold mb-3 text-blue-900">Rekommendationer:</h2>
          <ul className="space-y-2 text-blue-800">
            <li><strong>Emojis:</strong> Enkla, universella, fungerar överallt utan extra paket</li>
            <li><strong>Lucide:</strong> Bäst för shadcn/ui, konsistent design, många ikoner</li>
            <li><strong>Heroicons:</strong> Minimalistiska, skapad av Tailwind-teamet</li>
            <li><strong>React Icons:</strong> Största utbudet, innehåller Material Design, Font Awesome, osv.</li>
          </ul>
        </div>

        <IconDemo />
      </div>
    </div>
  )
} 