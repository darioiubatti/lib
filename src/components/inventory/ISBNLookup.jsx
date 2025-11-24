import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Barcode, CheckCircle, AlertCircle } from "lucide-react";

export default function ISBNLookup({ onBookFound }) {
  const [isbnInput, setIsbnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    const isbns = isbnInput
      .split(/[\n,;\s]+/)
      .map(isbn => isbn.trim())
      .filter(isbn => isbn.length > 0);

    if (isbns.length === 0) {
      alert('Inserisci almeno un ISBN');
      return;
    }

    setLoading(true);
    setResults([]);
    const foundBooks = [];

    for (const isbn of isbns) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Cerca informazioni dettagliate sul libro con ISBN: ${isbn}
          Fornisci i seguenti dati in formato JSON:
          {
            "titolo_composto": "titolo completo del libro",
            "autore": "nome completo autore",
            "autore_alfa": "Cognome, Nome",
            "editore": "casa editrice",
            "anno": anno_pubblicazione (numero),
            "luogo": "luogo di pubblicazione",
            "isbn": "${isbn}",
            "lingua": "Italiano/Inglese/etc",
            "pagine": numero_pagine (numero),
            "descrizione": "descrizione del libro",
            "prezzo_online": prezzo_copertina_euro (numero),
            "peso_gr": peso_grammi (numero),
            "collana": "nome collana se disponibile",
            "formato": "In folio/In-4°/In-8°/In-16°/In-32°"
          }`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              titolo_composto: { type: "string" },
              autore: { type: "string" },
              autore_alfa: { type: "string" },
              editore: { type: "string" },
              anno: { type: "number" },
              luogo: { type: "string" },
              isbn: { type: "string" },
              lingua: { type: "string" },
              pagine: { type: "number" },
              descrizione: { type: "string" },
              prezzo_online: { type: "number" },
              peso_gr: { type: "number" },
              collana: { type: "string" },
              formato: { type: "string" }
            }
          }
        });

        if (result && result.titolo_composto) {
          foundBooks.push(result);
          setResults(prev => [...prev, { isbn, status: 'success', data: result }]);
        } else {
          setResults(prev => [...prev, { isbn, status: 'error', message: 'Libro non trovato' }]);
        }
      } catch (error) {
        setResults(prev => [...prev, { isbn, status: 'error', message: error.message }]);
      }
    }

    setLoading(false);
    
    if (foundBooks.length > 0) {
      if (foundBooks.length === 1) {
        onBookFound(foundBooks[0]);
      } else {
        onBookFound(foundBooks);
      }
    }
  };

  return (
    <Card className="border-2" style={{ borderColor: '#45877F' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Barcode className="w-6 h-6" style={{ color: '#45877F' }} />
          Ricerca ISBN
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Inserisci uno o più ISBN (separati da virgola, spazio o a capo)
          </label>
          <Textarea
            value={isbnInput}
            onChange={(e) => setIsbnInput(e.target.value)}
            placeholder="9788804668237&#10;9788845292613, 9788807884691"
            rows={6}
            className="font-mono"
          />
        </div>

        <Button
          onClick={handleSearch}
          disabled={loading || !isbnInput.trim()}
          className="w-full"
          style={{ backgroundColor: '#45877F' }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Ricerca in corso...
            </>
          ) : (
            <>
              <Barcode className="w-4 h-4 mr-2" />
              Cerca {isbnInput.split(/[\n,;\s]+/).filter(i => i.trim()).length > 1 ? 'Libri' : 'Libro'}
            </>
          )}
        </Button>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          <p className="font-semibold mb-1">💡 Suggerimento:</p>
          <p className="text-xs">Puoi inserire più ISBN contemporaneamente separandoli con virgola, spazio o andando a capo</p>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="font-semibold text-slate-900">Risultati ({results.length}):</h3>
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex items-start gap-3 ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {result.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm font-mono">{result.isbn}</p>
                  {result.status === 'success' ? (
                    <>
                      <p className="text-sm text-slate-900 font-medium">{result.data.titolo_composto}</p>
                      <p className="text-xs text-slate-600">{result.data.autore}</p>
                    </>
                  ) : (
                    <p className="text-xs text-red-600">{result.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}