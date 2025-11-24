import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, BookOpen, CheckCircle, AlertCircle, Upload } from "lucide-react";

export default function MultiISBNLookup({ onBooksFound }) {
  const [isbnInput, setIsbnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleManualSearch = async () => {
    const isbns = isbnInput
      .split(/[\n,;]/)
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
          prompt: `Cerca informazioni sul libro con ISBN: ${isbn}
          Fornisci i seguenti dati in formato JSON:
          {
            "titolo_composto": "titolo completo",
            "autore": "nome autore",
            "editore": "casa editrice",
            "anno": anno_pubblicazione (numero),
            "luogo": "luogo pubblicazione",
            "isbn": "${isbn}",
            "lingua": "Italiano/Inglese/etc",
            "pagine": numero_pagine (numero),
            "descrizione": "breve descrizione",
            "prezzo_online": prezzo_copertina (numero),
            "peso_gr": peso_grammi (numero)
          }`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              titolo_composto: { type: "string" },
              autore: { type: "string" },
              editore: { type: "string" },
              anno: { type: "number" },
              luogo: { type: "string" },
              isbn: { type: "string" },
              lingua: { type: "string" },
              pagine: { type: "number" },
              descrizione: { type: "string" },
              prezzo_online: { type: "number" },
              peso_gr: { type: "number" }
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
      onBooksFound(foundBooks);
    }
  };

  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setResults([]);

    try {
      const text = await file.text();
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      const isbns = lines
        .map(line => {
          const parts = line.split(/[,;\t]/);
          return parts[0].trim();
        })
        .filter(isbn => isbn.length > 0);

      setIsbnInput(isbns.join('\n'));
      
      const foundBooks = [];
      for (const isbn of isbns) {
        try {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Cerca informazioni sul libro con ISBN: ${isbn}
            Fornisci i seguenti dati in formato JSON`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                titolo_composto: { type: "string" },
                autore: { type: "string" },
                editore: { type: "string" },
                anno: { type: "number" },
                luogo: { type: "string" },
                isbn: { type: "string" },
                lingua: { type: "string" },
                pagine: { type: "number" },
                descrizione: { type: "string" },
                prezzo_online: { type: "number" },
                peso_gr: { type: "number" }
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
        onBooksFound(foundBooks);
      }
    } catch (error) {
      setLoading(false);
      alert('Errore nella lettura del file CSV');
    }

    event.target.value = null;
  };

  return (
    <Card className="border-2" style={{ borderColor: '#45877F' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-6 h-6" style={{ color: '#45877F' }} />
          Ricerca ISBN Multipli
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Inserisci ISBN (uno per riga, oppure separati da virgola)
          </label>
          <Textarea
            value={isbnInput}
            onChange={(e) => setIsbnInput(e.target.value)}
            placeholder="9788804668237&#10;9788845292613&#10;9788807884691"
            rows={6}
            className="font-mono"
          />
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleManualSearch}
            disabled={loading || !isbnInput.trim()}
            className="flex-1"
            style={{ backgroundColor: '#45877F' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ricerca in corso...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4 mr-2" />
                Cerca Libri
              </>
            )}
          </Button>

          <label className="flex-1">
            <Button
              disabled={loading}
              variant="outline"
              className="w-full"
              asChild
            >
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Carica CSV
              </span>
            </Button>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVUpload}
              disabled={loading}
              className="hidden"
            />
          </label>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          <p className="font-semibold mb-1">Formato CSV:</p>
          <p className="text-xs">Il file CSV deve contenere un ISBN per riga nella prima colonna</p>
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
                  <p className="font-semibold text-sm">{result.isbn}</p>
                  {result.status === 'success' ? (
                    <p className="text-xs text-slate-600">
                      {result.data.titolo_composto} - {result.data.autore}
                    </p>
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