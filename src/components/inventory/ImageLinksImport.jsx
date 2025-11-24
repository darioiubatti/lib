import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ImageLinksImport({ items, entityType, onClose, onUpdate }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setResults(null);
    const debugLog = [];

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      debugLog.push(`📄 File caricato: ${lines.length} righe`);
      debugLog.push(`📦 Tipo entità: ${entityType}`);
      debugLog.push(`📊 Items disponibili: ${items.length}`);
      setDebugInfo([...debugLog]);
      
      const imagesByItem = {};
      
      // Parse CSV
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const commaIndex = line.indexOf(',');
        if (commaIndex === -1) {
          debugLog.push(`⚠️ Riga ${i+1} ignorata (no comma): ${line}`);
          continue;
        }
        
        const idUnivoco = line.substring(0, commaIndex).replace(/"/g, '').trim();
        let imageUrl = line.substring(commaIndex + 1).replace(/"/g, '').trim();
        
        if (!idUnivoco || !imageUrl) {
          debugLog.push(`⚠️ Riga ${i+1} ignorata (vuota): ${line}`);
          continue;
        }
        
        // Converti Google Drive links
        if (imageUrl.includes('drive.google.com') && imageUrl.includes('/file/d/')) {
          const match = imageUrl.match(/\/file\/d\/([^/]+)/);
          if (match) {
            const originalUrl = imageUrl;
            imageUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
            debugLog.push(`🔄 Convertito link Drive per ${idUnivoco}`);
          }
        }
        
        if (!imagesByItem[idUnivoco]) {
          imagesByItem[idUnivoco] = [];
        }
        imagesByItem[idUnivoco].push(imageUrl);
      }

      debugLog.push(`✅ Parsed ${Object.keys(imagesByItem).length} ID univoci`);
      setDebugInfo([...debugLog]);

      const updateResults = {
        updated: 0,
        notFound: [],
        errors: []
      };

      const entityName = entityType === 'Book' ? 'Book' : 'OtherItem';
      debugLog.push(`🎯 Entity name: ${entityName}`);
      setDebugInfo([...debugLog]);

      // Update items one by one
      for (const [idUnivoco, urls] of Object.entries(imagesByItem)) {
        const item = items.find(i => i.id_univoco === idUnivoco);
        
        if (!item) {
          updateResults.notFound.push(idUnivoco);
          debugLog.push(`❌ ${idUnivoco} non trovato nel database`);
          setDebugInfo([...debugLog]);
          continue;
        }

        try {
          debugLog.push(`⏳ Aggiornamento ${idUnivoco} (${urls.length} immagini)...`);
          setDebugInfo([...debugLog]);
          
          // Create update data with all item fields plus new images
          const updateData = {
            ...item,
            photo_url: urls[0],
            image_urls: urls
          };
          
          // Remove fields that shouldn't be updated
          delete updateData.id;
          delete updateData.created_date;
          delete updateData.updated_date;
          delete updateData.created_by;
          
          await base44.entities[entityName].update(item.id, updateData);
          
          updateResults.updated++;
          debugLog.push(`✅ ${idUnivoco} aggiornato con successo`);
          setDebugInfo([...debugLog]);
        } catch (error) {
          const errorMsg = error?.message || error?.toString() || 'Errore sconosciuto';
          updateResults.errors.push({ id: idUnivoco, error: errorMsg });
          debugLog.push(`❌ ${idUnivoco} errore: ${errorMsg}`);
          setDebugInfo([...debugLog]);
          console.error(`Error updating ${idUnivoco}:`, error);
        }
      }

      setResults(updateResults);
      setIsProcessing(false);
      
      if (updateResults.updated > 0) {
        setTimeout(() => {
          onUpdate();
        }, 500);
      }
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      debugLog.push(`💥 ERRORE CRITICO: ${error.message}`);
      setDebugInfo([...debugLog]);
      setResults({
        updated: 0,
        notFound: [],
        errors: [{ id: 'Sistema', error: error.message }]
      });
      setIsProcessing(false);
    }

    event.target.value = null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Importa Link Immagini</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 mb-2 font-semibold">
              Formato CSV richiesto:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside mb-3">
              <li>Prima colonna: ID Univoco</li>
              <li>Seconda colonna: Link immagine</li>
              <li>Se ci sono più immagini per lo stesso ID, aggiungi più righe</li>
            </ul>
            <div className="mt-3 p-3 bg-white rounded border border-blue-300 font-mono text-xs">
              A123,https://esempio.com/img1.jpg<br/>
              A123,https://esempio.com/img2.jpg<br/>
              OGG00001,https://esempio.com/img3.jpg
            </div>
          </div>

          {isProcessing && (
            <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="font-semibold text-blue-900">Importazione in corso...</span>
              </div>
              {debugInfo.length > 0 && (
                <div className="bg-white rounded p-4 max-h-64 overflow-y-auto border border-blue-200">
                  <div className="text-xs font-mono space-y-1 text-slate-700">
                    {debugInfo.map((info, idx) => (
                      <div key={idx} className="py-0.5">{info}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!results && !isProcessing && (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:border-slate-400 transition-colors">
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                <p className="text-base font-semibold text-slate-700 mb-2">
                  Clicca per selezionare file CSV
                </p>
                <p className="text-sm text-slate-500">Accettiamo file .csv e .txt</p>
              </label>
            </div>
          )}

          {results && !isProcessing && (
            <div className="space-y-3">
              {results.updated > 0 && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <Check className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-green-900 text-lg">
                      ✅ Successo!
                    </p>
                    <p className="text-sm text-green-800">
                      {results.updated} elementi aggiornati con le immagini
                    </p>
                  </div>
                </div>
              )}

              {results.notFound.length > 0 && (
                <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-amber-900 mb-2">
                        ⚠️ {results.notFound.length} ID non trovati nell'inventario:
                      </p>
                      <div className="text-sm text-amber-800 bg-amber-100 p-2 rounded max-h-32 overflow-y-auto">
                        {results.notFound.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {results.errors.length > 0 && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-red-900 mb-2">❌ Errori durante l'importazione:</p>
                      <div className="text-sm text-red-800 space-y-2 max-h-48 overflow-y-auto">
                        {results.errors.map((err, idx) => (
                          <div key={idx} className="bg-red-100 p-2 rounded">
                            <span className="font-semibold">{err.id}:</span> {err.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {debugInfo.length > 0 && (
                <details className="bg-slate-100 rounded-lg p-4 border border-slate-300">
                  <summary className="cursor-pointer text-sm font-bold text-slate-700 hover:text-slate-900">
                    📋 Log Dettagliato (clicca per espandere)
                  </summary>
                  <div className="mt-3 bg-white rounded p-3 max-h-64 overflow-y-auto border border-slate-200">
                    <div className="text-xs font-mono space-y-1 text-slate-600">
                      {debugInfo.map((info, idx) => (
                        <div key={idx} className="py-0.5 border-b border-slate-100 last:border-0">
                          {info}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              <div className="flex gap-3 pt-2">
                {(results.updated > 0 || results.errors.length > 0 || results.notFound.length > 0) && (
                  <Button
                    onClick={() => {
                      setResults(null);
                      setDebugInfo([]);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Importa Altro File
                  </Button>
                )}
                <Button
                  onClick={onClose}
                  className="flex-1"
                  style={{ backgroundColor: '#45877F' }}
                >
                  Chiudi
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}