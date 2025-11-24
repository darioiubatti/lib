import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2, BookOpen } from "lucide-react";

export default function VialibriSearch({ book }) {
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  const searchVialibri = async () => {
    setSearching(true);
    
    // Costruisci URL ricerca Vialibri
    const params = new URLSearchParams();
    if (book.author || book.autore) params.append('author', book.author || book.autore);
    if (book.title || book.titolo_composto) params.append('title', book.title || book.titolo_composto);
    if (book.isbn) params.append('isbn', book.isbn);
    
    const vialibriUrl = `https://www.vialibri.net/years/books/${params.toString()}`;
    
    // Apri in nuova finestra
    window.open(vialibriUrl, '_blank');
    
    setSearching(false);
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={searchVialibri}
        disabled={searching}
        variant="outline"
        size="sm"
        className="w-full border-2 hover:bg-slate-50"
        style={{ borderColor: '#45877F', color: '#45877F' }}
      >
        {searching ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Ricerca...
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4 mr-2" />
            Cerca su Vialibri
          </>
        )}
      </Button>
      
      <div className="text-xs text-slate-500 text-center">
        Apre la ricerca su Vialibri.net con i dati del libro
      </div>
    </div>
  );
}