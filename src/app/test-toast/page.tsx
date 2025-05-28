"use client";

import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

export default function TestToastPage() {
  const { toast } = useToast();

  const testToasts = () => {
    // Test olika typer av toast-meddelanden
    toast({
      title: "Test meddelande",
      description: "Detta är ett vanligt meddelande",
      variant: "default",
    });

    setTimeout(() => {
      toast({
        title: "Framgång!",
        description: "Detta är ett framgångsmeddelande",
        variant: "success",
      });
    }, 1000);

    setTimeout(() => {
      toast({
        title: "Fel uppstod",
        description: "Detta är ett felmeddelande",
        variant: "destructive",
      });
    }, 2000);
  };

  const testSessionExpired = () => {
    toast({
      title: "Session har gått ut",
      description: "Du omdirigeras till inloggningssidan...",
      variant: "destructive",
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Toast Test</h1>
      
      <div className="space-y-4">
        <p className="text-gray-600 mb-6">
          Testa våra nya toast-meddelanden som ersätter popup-fönster.
        </p>
        
        <Button onClick={testToasts} className="mr-4">
          Testa alla toast-typer
        </Button>
        
        <Button onClick={testSessionExpired} variant="destructive">
          Testa session utgången
        </Button>
        
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Vad som ska hända:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>Toast-meddelanden ska visas i övre högra hörnet</li>
            <li>De ska försvinna automatiskt efter 5 sekunder</li>
            <li>Inga popup-fönster från webbläsaren ska visas</li>
            <li>Meddelanden ska ha olika färger beroende på typ</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 