import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Upload } from "lucide-react";

export default function OCRBookLookup({ onBookFound }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analizza questa copertina di libro e estrai le seguenti informazioni:
        - Titolo del libro
        - Autore
        - Casa editrice
        - Anno di pubblicazione (se visibile)
        - ISBN (se visibile)
        - Qualsiasi altra informazione rilevante
        
        Fornisci i dati in formato JSON:
        {
          "titolo_composto": "titolo completo",
          "autore": "nome autore",
          "autore_alfa": "Cognome, Nome",
          "editore": "casa editrice",
          "anno": anno_pubblicazione (numero o null),
          "isbn": "codice isbn o stringa vuota",
          "descrizione": "breve descrizione del libro"
        }`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            titolo_composto: { type: "string" },
            autore: { type: "string" },
            autore_alfa: { type: "string" },
            editore: { type: "string" },
            anno: { type: ["number", "null"] },
            isbn: { type: "string" },
            descrizione: { type: "string" }
          }
        }
      });

      if (result && result.titolo_composto) {
        onBookFound({ ...result, cover_image_url: file_url });
      } else {
        setError('Non sono riuscito a leggere le informazioni dalla copertina. Riprova con un\'immagine più chiara.');
      }
    } catch (err) {
      setError('Errore durante l\'analisi. Riprova.');
    } finally {
      setLoading(false);
      event.target.value = null;
    }
  };

  return (
    <Card style={{ borderColor: '#45877F' }} className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" style={{ color: '#45877F' }} />
          Riconoscimento da Copertina (OCR)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
          {loading ? (
            <div className="space-y-3">
              <Loader2 className="w-12 h-12 text-slate-400 mx-auto animate-spin" />
              <p className="text-slate-600">Analisi copertina in corso...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <label className="cursor-pointer">
                <Button style={{ backgroundColor: '#45877F' }} className="text-white">
                  <Camera className="w-4 h-4 mr-2" />
                  Carica Foto Copertina
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={loading}
                />
              </label>
              <p className="text-sm text-slate-500 mt-2">
                Supporta JPG, PNG. Massima qualità per migliori risultati.
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          <strong>Suggerimento:</strong> Per risultati ottimali, assicurati che la copertina sia ben illuminata 
          e che il testo sia leggibile.
        </div>
      </CardContent>
    </Card>
  );
}