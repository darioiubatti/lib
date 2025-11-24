import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, AlertCircle, Plus, Loader2, Sparkles, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BookInventoryForm({ book, existingBooks, onSave, onCancel, isProcessing }) {
  const [formData, setFormData] = useState(book || {
    prezzo_online: '',
    collocazione: '',
    stock: 1,
    autore: '',
    autore_alfa: '',
    titolo_composto: '',
    descrizione: '',
    anno: new Date().getFullYear(),
    luogo: '',
    editore: '',
    collana: '',
    isbn: '',
    peso_gr: 750,
    prefatori: '',
    curatori: '',
    traduttore: '',
    illustratore: '',
    soggetti: '',
    lingua: 'Italiano',
    lingue_specificate: '', // Added field
    stato_conservazione: 'Buono',
    condizione: 'Usato',
    edizione: '',
    prima_edizione: false,
    autografato: false,
    sovraccoperta: false,
    legatura: 'Brossura',
    formato: 'In-8°',
    volumi: 1,
    pagine: 0,
    id_vecchio: '',
    foto: 'NO', // This field indicates if a photo exists (SI/NO)
    photo_url: '' // New field for the actual photo URL
  });

  const [similarBooks, setSimilarBooks] = useState([]);
  const [showSimilarAlert, setShowSimilarAlert] = useState(false);
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [priceRange, setPriceRange] = useState(null);
  const [displayIdUnivoco, setDisplayIdUnivoco] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (book && book.id_univoco) {
      setDisplayIdUnivoco(book.id_univoco);
    } else {
      const existingIds = existingBooks
        .map(b => b.id_univoco)
        .filter(id => id && String(id).startsWith('A'))
        .map(id => parseInt(String(id).substring(1)))
        .filter(n => !isNaN(n));
      
      const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      const newIdUnivoco = `A${nextNumber}`;
      setDisplayIdUnivoco(newIdUnivoco);
    }
  }, [book, existingBooks]);

  useEffect(() => {
    if (formData.condizione === 'Nuovo' && formData.stato_conservazione === 'Buono') {
      setFormData(prev => ({ ...prev, stato_conservazione: 'Nuovo' }));
    } else if (formData.condizione === 'Usato' && formData.stato_conservazione === 'Nuovo') {
      setFormData(prev => ({ ...prev, stato_conservazione: 'Buono' }));
    }
  }, [formData.condizione]);

  useEffect(() => {
    if (!book && formData.titolo_composto && formData.titolo_composto.length > 3) {
      const similar = existingBooks.filter(b => 
        b.titolo_composto?.toLowerCase().includes(formData.titolo_composto.toLowerCase()) ||
        (formData.autore && b.autore?.toLowerCase() === formData.autore.toLowerCase() && 
         b.titolo_composto?.toLowerCase().includes(formData.titolo_composto.toLowerCase().split(' ')[0]))
      );
      
      if (similar.length > 0) {
        setSimilarBooks(similar);
        setShowSimilarAlert(true);
      } else {
        setSimilarBooks([]);
        setShowSimilarAlert(false);
      }
    } else {
      setSimilarBooks([]);
      setShowSimilarAlert(false);
    }
  }, [formData.titolo_composto, formData.autore, book, existingBooks]);

  const validateForm = () => {
    const errors = [];
    
    if (!formData.titolo_composto || formData.titolo_composto.trim() === '') {
      errors.push('Titolo Composto');
    }
    
    if (!formData.prezzo_online || formData.prezzo_online === '' || formData.prezzo_online <= 0) {
      errors.push('Prezzo Online');
    }
    
    return errors;
  };

  const autoCompleteBookData = async () => {
    if (!formData.titolo_composto || !formData.autore) {
      alert('Inserisci almeno titolo e autore prima di completare automaticamente i campi');
      return;
    }

    setIsAutoCompleting(true);
    try {
      const searchQuery = `Libro: "${formData.titolo_composto}" di ${formData.autore}${formData.editore ? `, editore ${formData.editore}` : ''}${formData.anno ? `, anno ${formData.anno}` : ''}`;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Cerca informazioni dettagliate sul seguente libro: ${searchQuery}

Fornisci i dati in questo formato JSON preciso. Se un campo non è disponibile, usa stringa vuota "" per testi e 0 per numeri:

{
  "luogo": "città di pubblicazione",
  "editore": "nome editore",
  "anno": anno_pubblicazione,
  "isbn": "codice ISBN-10 o ISBN-13",
  "lingua": "Italiano/Inglese/Francese/Tedesco/Spagnolo",
  "pagine": numero_pagine,
  "descrizione": "descrizione breve del contenuto del libro (max 200 parole)",
  "collana": "nome della collana editoriale",
  "formato": "In-8°",
  "peso_gr": peso_stimato_grammi,
  "photo_url": ""
}

Rispondi SOLO con il JSON valido, senza testo aggiuntivo.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            luogo: { type: "string" },
            editore: { type: "string" },
            anno: { type: "number" },
            isbn: { type: "string" },
            lingua: { type: "string" },
            pagine: { type: "number" },
            descrizione: { type: "string" },
            collana: { type: "string" },
            formato: { type: "string" },
            peso_gr: { type: "number" },
            photo_url: { type: "string" }
          }
        }
      });

      if (result) {
        setFormData(prev => ({
          ...prev,
          luogo: result.luogo || prev.luogo,
          editore: result.editore || prev.editore,
          anno: result.anno || prev.anno,
          isbn: result.isbn || prev.isbn,
          lingua: result.lingua || prev.lingua,
          pagine: result.pagine || prev.pagine,
          descrizione: result.descrizione || prev.descrizione,
          collana: result.collana || prev.collana,
          formato: result.formato || prev.formato,
          peso_gr: result.peso_gr || prev.peso_gr,
          photo_url: result.photo_url || prev.photo_url
        }));
        alert('Dati completati con successo!');
      }
    } catch (error) {
      console.error('Errore nel completamento automatico:', error);
      alert('Errore nel recupero dei dati. Riprova.');
    } finally {
      setIsAutoCompleting(false);
    }
  };

  const saveDraft = async () => {
    try {
      const draftTitle = `${formData.titolo_composto || 'Senza titolo'} - ${formData.autore || 'Autore sconosciuto'}`;
      await base44.entities.Draft.create({
        type: 'Book',
        title: draftTitle,
        data: formData
      });
      alert('Bozza salvata con successo!');
      onCancel();
    } catch (error) {
      console.error('Errore nel salvataggio della bozza:', error);
      alert('Errore nel salvataggio della bozza');
    }
  };

  const fetchBookPrice = async () => {
    if (!formData.autore || !formData.titolo_composto) {
      alert('Inserisci autore e titolo prima di cercare il prezzo');
      return;
    }

    setIsFetchingPrice(true);
    setPriceRange(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Cerca i prezzi online per il libro "${formData.titolo_composto}" di ${formData.autore}.
        
        Condizione: ${formData.condizione}
        ${formData.isbn ? `ISBN: ${formData.isbn}` : ''}
        
        Trova prezzi da marketplace italiani come Amazon, IBS, Libreria Universitaria, librerie antiquarie online, etc.
        
        Fornisci:
        - prezzo_minimo: prezzo più basso trovato
        - prezzo_massimo: prezzo più alto trovato
        - prezzo_medio: media dei prezzi
        
        Rispondi in formato JSON`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            prezzo_minimo: { type: "number" },
            prezzo_massimo: { type: "number" },
            prezzo_medio: { type: "number" }
          }
        }
      });

      if (result) {
        setPriceRange({
          min: result.prezzo_minimo,
          max: result.prezzo_massimo,
          avg: result.prezzo_medio
        });
        
        if (result.prezzo_medio) {
          setFormData(prev => ({ ...prev, prezzo_online: result.prezzo_medio }));
        }
      }
    } catch (error) {
      console.error('Errore nella ricerca del prezzo:', error);
      alert('Errore nella ricerca del prezzo. Riprova.');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const getUniqueValues = (field) => {
    return [...new Set(existingBooks.map(b => b[field]).filter(Boolean))];
  };

  const autori = getUniqueValues('autore');
  const editori = getUniqueValues('editore');
  const collane = getUniqueValues('collana');
  const edizioni = getUniqueValues('edizione');
  const collocazioni = getUniqueValues('collocazione');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleIncreaseStock = (existingBook) => {
    onSave({ ...existingBook, stock: (existingBook.stock || 0) + 1 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check for missing essential fields
    const missingFields = validateForm();
    const isIncomplete = missingFields.length > 0 || !formData.autore || !formData.collocazione || !formData.edizione;

    if (isIncomplete) {
      const allMissingFields = [...missingFields];
      if (!formData.autore) allMissingFields.push('Autore');
      if (!formData.collocazione) allMissingFields.push('Collocazione');
      if (!formData.edizione) allMissingFields.push('Edizione');

      const confirmed = window.confirm(
        `Attenzione: i seguenti campi non sono compilati:\n${allMissingFields.join(', ')}\n\n` +
        'La scheda verrà salvata come incompleta e contrassegnata.\nVuoi continuare?'
      );

      if (!confirmed) {
        setValidationErrors(missingFields);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    const dataToSave = { ...formData, is_incomplete: isIncomplete };

    setShowSimilarAlert(false);
    onSave(dataToSave);
  };

  const canAutoComplete = formData.titolo_composto && formData.autore;

  return (
    <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-slate-900">
            {book ? 'Modifica Libro' : 'Aggiungi Nuovo Libro'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">ID Univoco:</span>
            <span className="text-xl font-bold font-mono px-3 py-1 bg-slate-100 rounded" style={{ color: '#45877F' }}>
              {displayIdUnivoco}
            </span>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6">
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Attenzione: campi essenziali mancanti</p>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm">Clicca su "Salva Libro" per confermare il salvataggio come scheda incompleta.</p>
              </AlertDescription>
            </Alert>
          )}

          {showSimilarAlert && similarBooks.length > 0 && (
            <Card className="border-2" style={{ borderColor: '#45877F' }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 mt-0.5" style={{ color: '#45877F' }} />
                  <div className="flex-1">
                    <p className="font-bold text-black mb-2" style={{ fontFamily: 'Montserrat' }}>
                      Trovati {similarBooks.length} libri simili già in inventario
                    </p>
                    <p className="text-sm text-slate-700 mb-4" style={{ fontFamily: 'DM Sans' }}>
                      Vuoi aumentare lo stock di uno esistente invece di creare una nuova scheda?
                    </p>
                    <div className="space-y-3">
                      {similarBooks.slice(0, 3).map(similar => (
                        <div key={similar.id_univoco} className="bg-white rounded-lg p-4 border-2 border-slate-200 hover:border-slate-300 transition-colors">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="font-mono font-bold" style={{ backgroundColor: '#45877F', color: 'white' }}>
                                  {similar.id_univoco}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Stock: {similar.stock || 0}
                                </Badge>
                              </div>
                              <p className="font-bold text-black text-base mb-1" style={{ fontFamily: 'Montserrat' }}>
                                {similar.titolo_composto}
                              </p>
                              <p className="text-sm text-slate-600 mb-2" style={{ fontFamily: 'DM Sans' }}>
                                {similar.autore}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3" style={{ fontFamily: 'DM Sans' }}>
                                {similar.editore && (
                                  <div className="text-slate-600">
                                    <span className="font-semibold">Editore:</span> {similar.editore}
                                  </div>
                                )}
                                {similar.anno && (
                                  <div className="text-slate-600">
                                    <span className="font-semibold">Anno:</span> {similar.anno}
                                  </div>
                                )}
                                {similar.stato_conservazione && (
                                  <div className="text-slate-600">
                                    <span className="font-semibold">Stato:</span> {similar.stato_conservazione}
                                  </div>
                                )}
                                {similar.prezzo_online && (
                                  <div className="font-bold text-black">
                                    <span className="font-semibold">Prezzo:</span> €{similar.prezzo_online.toFixed(2)}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {similar.prima_edizione && (
                                  <Badge className="bg-green-600 text-white text-xs">Prima Edizione</Badge>
                                )}
                                {similar.autografato && (
                                  <Badge className="bg-purple-600 text-white text-xs">Autografato</Badge>
                                )}
                                {similar.sovraccoperta && (
                                  <Badge className="bg-blue-600 text-white text-xs">Con Sovraccoperta</Badge>
                                )}
                                {similar.condizione === 'Nuovo' && (
                                  <Badge className="bg-green-700 text-white text-xs">Nuovo</Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleIncreaseStock(similar)}
                              className="btn-primary flex-shrink-0"
                              style={{ backgroundColor: '#45877F', color: 'white', fontFamily: 'Montserrat', fontWeight: 600 }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              +1 Stock
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSimilarAlert(false)}
                      className="mt-3 w-full border-2"
                      style={{ borderColor: '#45877F', color: '#45877F', fontFamily: 'Montserrat', fontWeight: 600 }}
                    >
                      Crea comunque nuova scheda
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Informazioni Base</h3>
              <Button
                type="button"
                onClick={autoCompleteBookData}
                disabled={isAutoCompleting || !canAutoComplete}
                variant="outline"
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                {isAutoCompleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Completamento...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Completa Automaticamente
                  </>
                )}
              </Button>
            </div>

            {!canAutoComplete && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
                <strong>Info:</strong> Compila almeno titolo e autore per abilitare il completamento automatico
              </div>
            )}
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titolo_composto" className="flex items-center gap-1">
                  Titolo Composto <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="titolo_composto"
                  value={formData.titolo_composto}
                  onChange={(e) => handleChange('titolo_composto', e.target.value)}
                  className={validationErrors.includes('Titolo Composto') ? 'border-red-500' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="autore">Autore</Label>
                <Input
                  id="autore"
                  value={formData.autore}
                  onChange={(e) => {
                    handleChange('autore', e.target.value);
                    // Auto-generate autore_alfa
                    const value = e.target.value;
                    if (value.trim()) {
                      const parts = value.trim().split(' ');
                      if (parts.length >= 2) {
                        const cognome = parts[parts.length - 1];
                        const nome = parts.slice(0, -1).join(' ');
                        handleChange('autore_alfa', `${cognome}, ${nome}`);
                      }
                    }
                  }}
                  list="autori-list"
                />
                <datalist id="autori-list">
                  {autori.map(a => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="autore_alfa">Autore Alfa</Label>
                <Input
                  id="autore_alfa"
                  value={formData.autore_alfa}
                  onChange={(e) => handleChange('autore_alfa', e.target.value)}
                  placeholder="Cognome, Nome (auto)"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prezzo_online" className="flex items-center gap-1">
                    Prezzo Online (€) <span className="text-red-600">*</span>
                  </Label>
                  <Button
                    type="button"
                    onClick={fetchBookPrice}
                    disabled={isFetchingPrice || !formData.autore || !formData.titolo_composto}
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs hover:bg-slate-100"
                    style={{ color: '#45877F', fontFamily: 'Montserrat', fontWeight: 600 }}
                  >
                    {isFetchingPrice ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Cerca online'
                    )}
                  </Button>
                </div>
                <Input
                  id="prezzo_online"
                  type="number"
                  step="0.01"
                  value={formData.prezzo_online}
                  onChange={(e) => handleChange('prezzo_online', parseFloat(e.target.value))}
                  className={validationErrors.includes('Prezzo Online') ? 'border-red-500' : ''}
                />
                {priceRange && (
                  <div className="text-xs space-y-1 p-2 bg-blue-50 rounded border border-blue-200">
                    {priceRange.min && priceRange.max && (
                      <>
                        <p className="text-blue-700">
                          <strong>Min:</strong> €{priceRange.min.toFixed(2)}
                        </p>
                        <p className="text-blue-700">
                          <strong>Max:</strong> €{priceRange.max.toFixed(2)}
                        </p>
                        {priceRange.avg && (
                          <p className="text-blue-900 font-semibold">
                            <strong>Medio:</strong> €{priceRange.avg.toFixed(2)}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleChange('stock', parseInt(e.target.value))}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collocazione">Collocazione</Label>
                <Input
                  id="collocazione"
                  value={formData.collocazione}
                  onChange={(e) => handleChange('collocazione', e.target.value)}
                  list="collocazioni-list"
                />
                <datalist id="collocazioni-list">
                  {collocazioni.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  value={formData.isbn}
                  onChange={(e) => handleChange('isbn', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Dati di Pubblicazione</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editore">Editore</Label>
                <Input
                  id="editore"
                  value={formData.editore}
                  onChange={(e) => handleChange('editore', e.target.value)}
                  list="editori-list"
                />
                <datalist id="editori-list">
                  {editori.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="anno">Anno</Label>
                <Input
                  id="anno"
                  type="number"
                  value={formData.anno}
                  onChange={(e) => handleChange('anno', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="luogo">Luogo</Label>
                <Input
                  id="luogo"
                  value={formData.luogo}
                  onChange={(e) => handleChange('luogo', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collana">Collana</Label>
                <Input
                  id="collana"
                  value={formData.collana}
                  onChange={(e) => handleChange('collana', e.target.value)}
                  list="collane-list"
                />
                <datalist id="collane-list">
                  {collane.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Collaboratori</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prefatori">Prefatori</Label>
                <Input id="prefatori" value={formData.prefatori} onChange={(e) => handleChange('prefatori', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="curatori">Curatori</Label>
                <Input id="curatori" value={formData.curatori} onChange={(e) => handleChange('curatori', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="traduttore">Traduttore</Label>
                <Input id="traduttore" value={formData.traduttore} onChange={(e) => handleChange('traduttore', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="illustratore">Illustratore</Label>
                <Input id="illustratore" value={formData.illustratore} onChange={(e) => handleChange('illustratore', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Caratteristiche</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condizione">Condizione</Label>
                <Select value={formData.condizione} onValueChange={(value) => handleChange('condizione', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Usato">Usato</SelectItem>
                    <SelectItem value="Nuovo">Nuovo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stato_conservazione">Stato di Conservazione</Label>
                <Select value={formData.stato_conservazione} onValueChange={(value) => handleChange('stato_conservazione', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Nuovo">Nuovo</SelectItem>
                    <SelectItem value="Come nuovo">Come nuovo</SelectItem>
                    <SelectItem value="In ottimo stato">In ottimo stato</SelectItem>
                    <SelectItem value="Molto buono">Molto buono</SelectItem>
                    <SelectItem value="Buono">Buono</SelectItem>
                    <SelectItem value="Accettabile">Accettabile</SelectItem>
                    <SelectItem value="Mediocre">Mediocre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="legatura">Legatura</Label>
                <Select value={formData.legatura} onValueChange={(value) => handleChange('legatura', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rilegato">Rilegato</SelectItem>
                    <SelectItem value="Brossura">Brossura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="formato">Formato</Label>
                <Select value={formData.formato} onValueChange={(value) => handleChange('formato', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In folio">In folio</SelectItem>
                    <SelectItem value="In-4°">In-4°</SelectItem>
                    <SelectItem value="In-8°">In-8°</SelectItem>
                    <SelectItem value="In-16°">In-16°</SelectItem>
                    <SelectItem value="In-32°">In-32°</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lingua">Lingua</Label>
                <Select value={formData.lingua} onValueChange={(value) => handleChange('lingua', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Italiano">Italiano</SelectItem>
                    <SelectItem value="Inglese">Inglese</SelectItem>
                    <SelectItem value="Francese">Francese</SelectItem>
                    <SelectItem value="Tedesco">Tedesco</SelectItem>
                    <SelectItem value="Spagnolo">Spagnolo</SelectItem>
                    <SelectItem value="Multilingua">Multilingua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.lingua === 'Multilingua' && (
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="lingue_specificate">Specifica lingue</Label>
                  <Input
                    id="lingue_specificate"
                    value={formData.lingue_specificate || ''}
                    onChange={(e) => handleChange('lingue_specificate', e.target.value)}
                    placeholder="es. Italiano, Inglese, Francese"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="pagine">Pagine</Label>
                <Input id="pagine" type="number" value={formData.pagine} onChange={(e) => handleChange('pagine', parseInt(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="volumi">Volumi</Label>
                <Input id="volumi" type="number" value={formData.volumi} onChange={(e) => handleChange('volumi', parseInt(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso_gr">Peso (gr)</Label>
                <Input id="peso_gr" type="number" value={formData.peso_gr} onChange={(e) => handleChange('peso_gr', parseInt(e.target.value))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="prima_edizione" 
                  checked={formData.prima_edizione} 
                  onCheckedChange={(checked) => handleChange('prima_edizione', checked)}
                  className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                  style={formData.prima_edizione ? { borderColor: '#45877F', borderWidth: '2px' } : { borderColor: '#cbd5e1' }}
                />
                <Label 
                  htmlFor="prima_edizione" 
                  className="cursor-pointer"
                  style={{ 
                    fontFamily: 'DM Sans', 
                    color: formData.prima_edizione ? '#000' : '#64748b',
                    fontWeight: formData.prima_edizione ? 600 : 400
                  }}
                >
                  Prima Edizione
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="autografato" 
                  checked={formData.autografato} 
                  onCheckedChange={(checked) => handleChange('autografato', checked)}
                  className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                  style={formData.autografato ? { borderColor: '#45877F', borderWidth: '2px' } : { borderColor: '#cbd5e1' }}
                />
                <Label 
                  htmlFor="autografato" 
                  className="cursor-pointer"
                  style={{ 
                    fontFamily: 'DM Sans', 
                    color: formData.autografato ? '#000' : '#64748b',
                    fontWeight: formData.autografato ? 600 : 400
                  }}
                >
                  Autografato
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sovraccoperta" 
                  checked={formData.sovraccoperta} 
                  onCheckedChange={(checked) => handleChange('sovraccoperta', checked)}
                  className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                  style={formData.sovraccoperta ? { borderColor: '#45877F', borderWidth: '2px' } : { borderColor: '#cbd5e1' }}
                />
                <Label 
                  htmlFor="sovraccoperta" 
                  className="cursor-pointer"
                  style={{ 
                    fontFamily: 'DM Sans', 
                    color: formData.sovraccoperta ? '#000' : '#64748b',
                    fontWeight: formData.sovraccoperta ? 600 : 400
                  }}
                >
                  Sovraccoperta
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Altro</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="soggetti">Soggetti</Label>
                <Input id="soggetti" value={formData.soggetti} onChange={(e) => handleChange('soggetti', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edizione">Edizione</Label>
                <Input id="edizione" value={formData.edizione} onChange={(e) => handleChange('edizione', e.target.value)} list="edizioni-list" />
                <datalist id="edizioni-list">
                  {edizioni.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_vecchio">ID Vecchio</Label>
                <Input id="id_vecchio" value={formData.id_vecchio} onChange={(e) => handleChange('id_vecchio', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foto">Foto</Label>
                <Select value={formData.foto} onValueChange={(value) => handleChange('foto', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SI">SI</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descrizione">Descrizione</Label>
              <Textarea id="descrizione" rows={3} value={formData.descrizione} onChange={(e) => handleChange('descrizione', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo_url">URL Foto</Label>
              <Input
                id="photo_url"
                type="url"
                value={formData.photo_url || ''}
                onChange={(e) => handleChange('photo_url', e.target.value)}
                placeholder="https://esempio.com/foto.jpg"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t border-slate-200/60 pt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
            <X className="w-4 h-4 mr-2" />
            Annulla
          </Button>
          <Button 
            type="submit" 
            disabled={isProcessing} 
            className="btn-primary"
            style={{ backgroundColor: '#45877F', color: 'white', fontFamily: 'Montserrat', fontWeight: 600 }}
          >
            <Save className="w-4 h-4 mr-2" />
            {isProcessing ? 'Salvataggio...' : 'Salva Libro'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}