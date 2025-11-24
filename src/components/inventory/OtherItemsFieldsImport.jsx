import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function OtherItemsFieldsImport({ items, onClose, onUpdate }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setResults(null);
    setLogs([]);

    const addLog = (message) => {
      setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    addLog('Inizio lettura file CSV...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        addLog('Errore: File vuoto o non valido');
        setResults({ success: [], notFound: [], errors: ["File vuoto o non valido"] });
        setIsProcessing(false);
        return;
      }

      addLog(`File letto: ${lines.length - 1} righe di dati`);
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      addLog(`Colonne rilevate: ${headers.join(', ')}`);
      
      const successList = [];
      const notFoundList = [];
      const errorsList = [];

      addLog('Inizio elaborazione righe...');
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
          
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header.toLowerCase()] = values[index];
          });

          const idUnivoco = rowData['id univoco'] || rowData['id_univoco'];
          if (!idUnivoco) {
            errorsList.push(`Riga ${i + 1}: ID univoco mancante`);
            continue;
          }

          const item = items.find(it => it.id_univoco === idUnivoco);
          if (!item) {
            addLog(`❌ ${idUnivoco}: Articolo non trovato`);
            notFoundList.push(idUnivoco);
            continue;
          }

          const updateData = { ...item };
          
          if (rowData['oggetto'] !== undefined && rowData['oggetto'].trim() !== '') {
            updateData.oggetto = rowData['oggetto'];
            await base44.entities.OtherItem.update(item.id, updateData);
            addLog(`✅ ${idUnivoco}: Aggiornato oggetto`);
            successList.push(idUnivoco);
          } else {
            addLog(`⚠️ ${idUnivoco}: Campo oggetto vuoto, saltato`);
          }

        } catch (error) {
          const errorMsg = `Riga ${i + 1}: ${error.message}`;
          addLog(`⚠️ ${errorMsg}`);
          errorsList.push(errorMsg);
        }
      }

      addLog(`Completato: ${successList.length} successi, ${notFoundList.length} non trovati, ${errorsList.length} errori`);
      
      setResults({
        success: successList,
        notFound: notFoundList,
        errors: errorsList
      });
      setIsProcessing(false);
      
      if (successList.length > 0) {
        onUpdate();
      }
    };

    reader.readAsText(file);
    event.target.value = null;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-white">
        <DialogHeader className="bg-white">
          <DialogTitle>Importa Campo Oggetto da CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4 bg-white">
          <Alert className="bg-white">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Formato CSV richiesto:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Colonne: <code>id univoco, oggetto</code></li>
                <li>Prima riga deve contenere i nomi delle colonne</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="hidden"
              id="csv-upload-items-fields"
            />
            <label
              htmlFor="csv-upload-items-fields"
              className={`cursor-pointer flex flex-col items-center gap-3 ${isProcessing ? 'opacity-50' : ''}`}
            >
              <Upload className="w-12 h-12" style={{ color: '#45877F' }} />
              <div>
                <p className="font-semibold mb-1">
                  {isProcessing ? 'Elaborazione...' : 'Clicca per selezionare il file CSV'}
                </p>
                <p className="text-sm text-slate-500">
                  Aggiorna il campo oggetto degli articoli
                </p>
              </div>
            </label>
          </div>

          {logs.length > 0 && (
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-64 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="mb-1">{log}</div>
              ))}
            </div>
          )}

          {results && (
            <div className="space-y-3">
              {results.success.length > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <p className="font-semibold text-green-800 mb-2">
                      {results.success.length} articoli aggiornati con successo
                    </p>
                    <div className="text-xs text-green-700 max-h-32 overflow-y-auto">
                      {results.success.join(', ')}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {results.notFound.length > 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription>
                    <p className="font-semibold text-amber-800 mb-2">
                      {results.notFound.length} articoli non trovati
                    </p>
                    <div className="text-xs text-amber-700 max-h-32 overflow-y-auto">
                      {results.notFound.join(', ')}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {results.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">{results.errors.length} errori</p>
                    <div className="text-xs max-h-32 overflow-y-auto">
                      {results.errors.map((err, idx) => (
                        <div key={idx}>{err}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t bg-white">
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}