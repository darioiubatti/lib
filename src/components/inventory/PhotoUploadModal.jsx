import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function PhotoUploadModal({ books, items, onClose, onUpdate, entityType = "Book" }) {
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setUploadResults([]);
    const results = [];

    const allProducts = entityType === "Book" 
      ? books.map(b => ({ ...b, type: 'book', code: b.id_univoco }))
      : items.map(i => ({ ...i, type: 'item', code: i.id_univoco }));

    for (const file of files) {
      const fileName = file.name;
      const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
      
      const parts = fileNameWithoutExt.split('_');
      const productCode = parts[0];
      const imageIndex = parts.length > 1 ? parts[1] : '0';

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const product = allProducts.find(p => p.code === productCode);
        
        if (product) {
          if (imageIndex === '0' || parts.length === 1) {
            const entityName = entityType === "Book" ? 'Book' : 'OtherItem';
            await base44.entities[entityName].update(product.id, { cover_image_url: file_url });
            results.push({ fileName, status: 'success', message: `Immagine principale caricata per ${productCode}` });
          } else {
            results.push({ fileName, status: 'success', message: `Immagine ${imageIndex} caricata per ${productCode}` });
          }
        } else {
          results.push({ fileName, status: 'warning', message: `Prodotto ${productCode} non trovato` });
        }
      } catch (error) {
        results.push({ fileName, status: 'error', message: `Errore: ${error.message}` });
      }
    }

    setUploadResults(results);
    setUploading(false);
    onUpdate();
    event.target.value = null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Carica Foto</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Nomenclatura File</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p><span className="font-mono bg-white px-2 py-1 rounded">A1.jpg</span> → Immagine principale libro A1</p>
                <p><span className="font-mono bg-white px-2 py-1 rounded">A1_0.jpg</span> → Prima immagine libro A1</p>
                <p><span className="font-mono bg-white px-2 py-1 rounded">O5.jpg</span> → Immagine principale oggetto O5</p>
              </div>
            </div>

            <label className="cursor-pointer block">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors hover:bg-slate-50">
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-semibold text-slate-700 mb-2">
                  {uploading ? 'Caricamento in corso...' : 'Seleziona file da caricare'}
                </p>
                <p className="text-sm text-slate-500">
                  Trascina qui i file o clicca per selezionare
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            {uploading && (
              <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <p className="text-blue-900 font-medium">Caricamento immagini in corso...</p>
              </div>
            )}

            {uploadResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-900">Risultati:</h3>
                {uploadResults.map((result, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border flex items-start gap-3 ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-200'
                        : result.status === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{result.fileName}</p>
                      <p className="text-xs text-slate-600">{result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}