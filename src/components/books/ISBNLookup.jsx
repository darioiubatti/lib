import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Search, Loader2, BookOpen } from "lucide-react";

export default function ISBNLookup({ onBookFound }) {
  const [isbn, setIsbn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    if (!isbn.trim()) {
      setError('Inserisci un codice ISBN');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Cerca il libro con ISBN: ${isbn}. Fornisci dettagli completi inclusi titolo, nome autore, descrizione, editore, anno di pubblicazione, numero di pagine e URL dell'immagine di copertina. Sii accurato e dettagliato. Rispondi in italiano.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            author_name: { type: "string" },
            isbn: { type: "string" },
            description: { type: "string" },
            publisher: { type: "string" },
            publication_year: { type: "number" },
            pages: { type: "number" },
            cover_image_url: { type: "string" },
            category: { type: "string" }
          }
        }
      });

      if (result.title) {
        onBookFound({
          ...result,
          isbn: isbn,
          price: 0,
          cost: 0,
          stock_quantity: 0,
          language: 'Italiano',
          featured: false
        });
        setIsbn('');
      } else {
        setError('Libro non trovato. Verifica il codice ISBN e riprova.');
      }
    } catch (err) {
      setError('Impossibile cercare il libro. Riprova.');
    }

    setIsLoading(false);
  };

  return (
    <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="border-b border-slate-200/60">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          Aggiunta Rapida tramite ISBN
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-3">
          <Input
            placeholder="Inserisci ISBN (es. 978-0-123456-78-9)"
            value={isbn}
            onChange={(e) => {
              setIsbn(e.target.value);
              setError('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleLookup()}
            className="border-slate-300 flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleLookup}
            disabled={isLoading}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ricerca...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Cerca
              </>
            )}
          </Button>
        </div>
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
        <p className="text-slate-500 text-xs mt-3">
          Inserisci un codice ISBN per recuperare automaticamente i dettagli del libro da internet
        </p>
      </CardContent>
    </Card>
  );
}