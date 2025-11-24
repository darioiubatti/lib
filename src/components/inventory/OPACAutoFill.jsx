import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, CheckCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function OPACAutoFill({ initialData, onDataFetched }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titolo: initialData?.titolo_composto || '',
    autore: initialData?.autore || '',
    isbn: initialData?.isbn || '',
    editore: initialData?.editore || '',
    anno: initialData?.anno || ''
  });
  const [result, setResult] = useState(null);

  const handleSearch = async () => {
    if (!formData.titolo && !formData.autore && !formData.isbn) {
      alert('Compila almeno uno dei campi: Titolo, Autore o ISBN');
      return;
    }

    setLoading(true);
    setResult(null);

    const prompt = `
Sei un assistente bibliotecario esperto. Il tuo compito è interrogare OPAC SBN e restituire dati catalografici completi di un libro.

DATI FORNITI:
- Titolo: ${formData.titolo || 'non specificato'}
- Autore: ${formData.autore || 'non specificato'}
- ISBN: ${formData.isbn || 'non specificato'}
- Editore: ${formData.editore || 'non specificato'}
- Anno: ${formData.anno || 'non specificato'}

ISTRUZIONI:
1. Cerca il libro su OPAC SBN usando l'URL: https://opac.sbn.it/opacsbn/opaclib?db=opac
2. Se hai l'ISBN, usalo come criterio principale
3. Altrimenti usa Titolo + Autore
4. Estrai dalla scheda OPAC i seguenti dati:
   - titolo completo
   - autore/i
   - editore
   - luogo di pubblicazione
   - anno
   - pagine e formato
   - collana
   - note
   - lingua
   - ISBN
   - BID SBN

5. Se trovi più risultati, seleziona il più pertinente

FORMATO OUTPUT (JSON):
Restituisci SOLO un oggetto JSON con questa struttura, senza altri testi:
{
  "found": true/false,
  "best_match": {
    "titolo": "",
    "autore": "",
    "editore": "",
    "luogo_pubblicazione": "",
    "anno": "",
    "pagine": "",
    "formato": "",
    "collana": "",
    "note": "",
    "isbn": "",
    "lingua": ""
  }
}

Se non trovi il libro, imposta "found": false e lascia best_match vuoto.
NON inventare dati. Usa solo informazioni reali da OPAC.
`;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            found: { type: "boolean" },
            best_match: {
              type: "object",
              properties: {
                titolo: { type: "string" },
                autore: { type: "string" },
                editore: { type: "string" },
                luogo_pubblicazione: { type: "string" },
                anno: { type: "string" },
                pagine: { type: "string" },
                formato: { type: "string" },
                collana: { type: "string" },
                note: { type: "string" },
                isbn: { type: "string" },
                lingua: { type: "string" }
              }
            }
          }
        }
      });

      setResult(response);
    } catch (error) {
      console.error('Errore ricerca OPAC:', error);
      alert('Errore durante la ricerca. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseData = () => {
    if (result && result.found && result.best_match) {
      const opacData = {
        titolo_composto: result.best_match.titolo || formData.titolo,
        autore: result.best_match.autore || formData.autore,
        editore: result.best_match.editore || formData.editore,
        anno: result.best_match.anno ? parseInt(result.best_match.anno) : (formData.anno ? parseInt(formData.anno) : null),
        luogo: result.best_match.luogo_pubblicazione || '',
        collana: result.best_match.collana || '',
        isbn: result.best_match.isbn || formData.isbn,
        pagine: result.best_match.pagine ? parseInt(result.best_match.pagine.replace(/\D/g, '')) : null,
        formato: result.best_match.formato || '',
        lingua: result.best_match.lingua || 'Italiano',
        descrizione: result.best_match.note || ''
      };
      onDataFetched(opacData);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-2" style={{ borderColor: '#45877F' }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5" style={{ color: '#45877F' }} />
            <h3 className="font-bold text-lg">Ricerca OPAC SBN</h3>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">Titolo</Label>
              <Input
                value={formData.titolo}
                onChange={(e) => setFormData({...formData, titolo: e.target.value})}
                placeholder="Titolo del libro"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">Autore</Label>
              <Input
                value={formData.autore}
                onChange={(e) => setFormData({...formData, autore: e.target.value})}
                placeholder="Nome autore"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold">ISBN</Label>
              <Input
                value={formData.isbn}
                onChange={(e) => setFormData({...formData, isbn: e.target.value})}
                placeholder="Codice ISBN"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-semibold">Editore</Label>
                <Input
                  value={formData.editore}
                  onChange={(e) => setFormData({...formData, editore: e.target.value})}
                  placeholder="Editore"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Anno</Label>
                <Input
                  value={formData.anno}
                  onChange={(e) => setFormData({...formData, anno: e.target.value})}
                  placeholder="Anno"
                />
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full"
              style={{ backgroundColor: '#45877F', color: 'white' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ricerca in corso...
                </>
              ) : (
                'Cerca su OPAC SBN'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.found ? "border-2 border-green-500" : "border-2 border-red-500"}>
          <CardContent className="p-4">
            {result.found ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="font-bold text-lg text-green-600">Libro Trovato!</h3>
                </div>

                <div className="space-y-3">
                  {result.best_match.titolo && (
                    <div>
                      <p className="text-xs text-slate-500">Titolo</p>
                      <p className="font-semibold">{result.best_match.titolo}</p>
                    </div>
                  )}

                  {result.best_match.autore && (
                    <div>
                      <p className="text-xs text-slate-500">Autore</p>
                      <p className="font-semibold">{result.best_match.autore}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {result.best_match.editore && (
                      <div>
                        <p className="text-xs text-slate-500">Editore</p>
                        <p>{result.best_match.editore}</p>
                      </div>
                    )}

                    {result.best_match.anno && (
                      <div>
                        <p className="text-xs text-slate-500">Anno</p>
                        <p>{result.best_match.anno}</p>
                      </div>
                    )}
                  </div>

                  {result.best_match.luogo_pubblicazione && (
                    <div>
                      <p className="text-xs text-slate-500">Luogo</p>
                      <p>{result.best_match.luogo_pubblicazione}</p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {result.best_match.pagine && (
                      <Badge variant="outline">{result.best_match.pagine} pagine</Badge>
                    )}
                    {result.best_match.formato && (
                      <Badge variant="outline">{result.best_match.formato}</Badge>
                    )}
                    {result.best_match.lingua && (
                      <Badge style={{ backgroundColor: '#45877F' }} className="text-white">
                        {result.best_match.lingua}
                      </Badge>
                    )}
                  </div>

                  {result.best_match.collana && (
                    <div>
                      <p className="text-xs text-slate-500">Collana</p>
                      <p>{result.best_match.collana}</p>
                    </div>
                  )}

                  {result.best_match.isbn && (
                    <div>
                      <p className="text-xs text-slate-500">ISBN</p>
                      <p className="font-mono">{result.best_match.isbn}</p>
                    </div>
                  )}

                  {result.best_match.note && (
                    <div>
                      <p className="text-xs text-slate-500">Note</p>
                      <p className="text-sm">{result.best_match.note}</p>
                    </div>
                  )}

                  <Button
                    onClick={handleUseData}
                    className="w-full"
                    style={{ backgroundColor: '#45877F', color: 'white' }}
                  >
                    Usa Questi Dati per il Libro
                  </Button>
                </div>
              </>
            ) : (
              <div>
                <h3 className="font-bold text-lg text-red-600 mb-2">Libro Non Trovato</h3>
                <p className="text-sm text-slate-600">
                  Non sono riuscito a trovare il libro su OPAC SBN con i dati forniti.
                  Prova a modificare i parametri di ricerca.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}