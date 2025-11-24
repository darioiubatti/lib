import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, AlertCircle, Plus, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TYPE_PREFIXES = {
  'Opere': 'OPE',
  'Vinili': 'VIN',
  'Giochi': 'GIO',
  'Oggetti': 'OGG',
  'Libri in contovendita': 'LIC'
};

export default function OtherItemForm({ item, existingItems, onSave, onCancel, isProcessing }) {
  const [formData, setFormData] = useState(item || {
    tipo_oggetto: 'Oggetti',
    contovendita: 'NO',
    proprietario: '',
    tel_proprietario: '',
    mail_proprietario: '',
    oggetto: '',
    prezzo_pubblico: 0,
    venduto: 0,
    da_pagare: 0,
    stock: 0,
    costo: 0,
    fornitore_pagato: 'NO',
    photo_url: '' // Initialize photo_url
  });

  const [displayIdUnivoco, setDisplayIdUnivoco] = useState('');
  const [similarItems, setSimilarItems] = useState([]);
  const [showSimilarAlert, setShowSimilarAlert] = useState(false);

  useEffect(() => {
    if (item && item.id_univoco) {
      setDisplayIdUnivoco(item.id_univoco);
    } else {
      const prefix = TYPE_PREFIXES[formData.tipo_oggetto] || 'OGG';
      
      const existingIdsForType = existingItems
        .filter(i => i.id_univoco?.startsWith(prefix))
        .map(i => parseInt(i.id_univoco.substring(prefix.length)))
        .filter(n => !isNaN(n));
      
      const nextNumber = existingIdsForType.length > 0 ? Math.max(...existingIdsForType) + 1 : 1;
      setDisplayIdUnivoco(`${prefix}${String(nextNumber).padStart(5, '0')}`);
    }
  }, [item, existingItems, formData.tipo_oggetto]);

  useEffect(() => {
    if (!item && formData.oggetto && formData.oggetto.length > 3 && formData.tipo_oggetto) {
      const similar = existingItems.filter(i => 
        i.oggetto?.toLowerCase().includes(formData.oggetto.toLowerCase()) &&
        i.tipo_oggetto === formData.tipo_oggetto
      );
      
      if (similar.length > 0) {
        setSimilarItems(similar);
        setShowSimilarAlert(true);
      } else {
        setSimilarItems([]);
        setShowSimilarAlert(false);
      }
    } else {
      setSimilarItems([]);
      setShowSimilarAlert(false);
    }
  }, [formData.oggetto, formData.tipo_oggetto, item, existingItems]);

  const getUniqueOwners = () => {
    return [...new Set(
      existingItems
        .filter(i => i.contovendita === 'SI' && i.proprietario)
        .map(i => ({
          nome: i.proprietario,
          tel: i.tel_proprietario,
          mail: i.mail_proprietario
        }))
    )];
  };

  const uniqueOwners = getUniqueOwners();

  const handleOwnerSelect = (e) => {
    const selectedName = e.target.value;
    const owner = uniqueOwners.find(o => o.nome === selectedName);
    if (owner) {
      setFormData({
        ...formData,
        proprietario: owner.nome,
        tel_proprietario: owner.tel || '',
        mail_proprietario: owner.mail || ''
      });
    } else {
      setFormData({ ...formData, proprietario: selectedName });
    }
  };

  const saveDraft = async () => {
    try {
      const draftTitle = `${formData.oggetto || 'Senza nome'} - ${formData.tipo_oggetto}`;
      await base44.entities.Draft.create({
        type: 'OtherItem',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if essential fields are missing
    const missingFields = [];
    if (!formData.oggetto || formData.oggetto.trim() === '') missingFields.push('Oggetto');
    if (!formData.prezzo_pubblico || formData.prezzo_pubblico === 0) missingFields.push('Prezzo Pubblico');
    if (!formData.tipo_oggetto) missingFields.push('Tipo Oggetto');
    
    const isIncomplete = missingFields.length > 0;
    
    if (isIncomplete) {
      const confirmed = window.confirm(
        `Attenzione: i seguenti campi non sono compilati:\n${missingFields.join(', ')}\n\n` +
        'La scheda verrà salvata come incompleta e contrassegnata.\nVuoi continuare?'
      );
      
      if (!confirmed) {
        return;
      }
    }
    
    const dataToSave = { ...formData, is_incomplete: isIncomplete };
    
    setShowSimilarAlert(false);
    onSave(dataToSave);
  };

  const handleIncreaseStock = (existingItem) => {
    const newStock = (existingItem.stock || 0) + (formData.stock || 1);
    onSave({ ...existingItem, stock: newStock });
  };

  const isContoVendita = formData.contovendita === 'SI';

  return (
    <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="border-b border-slate-200/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-slate-900">
            {item ? 'Modifica Oggetto' : 'Aggiungi Nuovo Oggetto'}
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
          {showSimilarAlert && similarItems.length > 0 && (
            <Card className="border-2" style={{ borderColor: '#45877F' }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 mt-0.5" style={{ color: '#45877F' }} />
                  <div className="flex-1">
                    <p className="font-bold text-black mb-2">
                      Trovati {similarItems.length} oggetti simili già in inventario
                    </p>
                    <p className="text-sm text-slate-700 mb-4">
                      Vuoi aumentare lo stock di uno esistente invece di creare una nuova scheda?
                    </p>
                    <div className="space-y-3">
                      {similarItems.slice(0, 3).map(similar => (
                        <div key={similar.id_univoco} className="bg-white rounded-lg p-4 border-2 border-slate-200">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="font-mono font-bold" style={{ backgroundColor: '#45877F', color: 'white' }}>
                                  {similar.id_univoco}
                                </Badge>
                                <Badge variant="outline">Stock: {similar.stock || 0}</Badge>
                              </div>
                              <p className="font-bold text-black mb-1">{similar.oggetto}</p>
                              <p className="text-sm text-slate-600">€{similar.prezzo_pubblico?.toFixed(2)}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleIncreaseStock(similar)}
                              style={{ backgroundColor: '#45877F' }}
                              className="text-white"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              +{formData.stock || 1} Stock
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
                      style={{ borderColor: '#45877F', color: '#45877F' }}
                    >
                      Crea comunque nuova scheda
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Informazioni Base</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_oggetto">Tipo Oggetto</Label>
                <Select value={formData.tipo_oggetto} onValueChange={(value) => setFormData({ ...formData, tipo_oggetto: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Opere">Opere (OPE)</SelectItem>
                    <SelectItem value="Vinili">Vinili (VIN)</SelectItem>
                    <SelectItem value="Giochi">Giochi (GIO)</SelectItem>
                    <SelectItem value="Oggetti">Oggetti (OGG)</SelectItem>
                    <SelectItem value="Libri in contovendita">Libri in contovendita (LIC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contovendita">Conto Vendita</Label>
                <Select value={formData.contovendita} onValueChange={(value) => setFormData({ ...formData, contovendita: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SI">SI</SelectItem>
                    <SelectItem value="NO">NO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oggetto">Descrizione Oggetto *</Label>
              <Input
                id="oggetto"
                value={formData.oggetto}
                onChange={(e) => setFormData({ ...formData, oggetto: e.target.value })}
              />
            </div>
          </div>

          {isContoVendita && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Dati Proprietario</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proprietario">Nome Proprietario</Label>
                  <Input
                    id="proprietario"
                    value={formData.proprietario}
                    onChange={handleOwnerSelect}
                    list="owners-list"
                  />
                  <datalist id="owners-list">
                    {uniqueOwners.map((o, i) => <option key={i} value={o.nome} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel_proprietario">Telefono</Label>
                  <Input
                    id="tel_proprietario"
                    value={formData.tel_proprietario}
                    onChange={(e) => setFormData({ ...formData, tel_proprietario: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail_proprietario">Email</Label>
                  <Input
                    id="mail_proprietario"
                    type="email"
                    value={formData.mail_proprietario}
                    onChange={(e) => setFormData({ ...formData, mail_proprietario: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Prezzi e Quantità</h3>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prezzo_pubblico">Prezzo Pubblico (€) *</Label>
                <Input
                  id="prezzo_pubblico"
                  type="number"
                  step="0.01"
                  value={formData.prezzo_pubblico}
                  onChange={(e) => setFormData({ ...formData, prezzo_pubblico: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="costo">Costo (€)</Label>
                <Input
                  id="costo"
                  type="number"
                  step="0.01"
                  value={formData.costo}
                  onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venduto">Venduto</Label>
                <Input
                  id="venduto"
                  type="number"
                  value={formData.venduto}
                  onChange={(e) => setFormData({ ...formData, venduto: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {isContoVendita && (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="da_pagare">Da Pagare (pezzi)</Label>
                  <Input
                    id="da_pagare"
                    type="number"
                    value={formData.da_pagare}
                    onChange={(e) => setFormData({ ...formData, da_pagare: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fornitore_pagato">Fornitore Pagato</Label>
                  <Select value={formData.fornitore_pagato} onValueChange={(value) => setFormData({ ...formData, fornitore_pagato: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SI">SI</SelectItem>
                      <SelectItem value="NO">NO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Giacenza:</span>
              <span className="font-bold">{(formData.stock || 0) - (formData.venduto || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Ricavo Libreria:</span>
              <span className="font-bold text-green-600">
                €{((formData.prezzo_pubblico || 0) - (formData.costo || 0)).toFixed(2)}
              </span>
            </div>
            {isContoVendita && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Ricavo Fornitore:</span>
                  <span className="font-bold text-blue-600">
                    €{((formData.costo || 0) * (formData.venduto || 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Da Pagare per Articolo:</span>
                  <span className="font-bold text-amber-600">
                    €{((formData.costo || 0) * (formData.da_pagare || 0)).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo_url">URL Foto</Label>
            <Input
              id="photo_url"
              type="url"
              value={formData.photo_url || ''}
              onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
              placeholder="https://esempio.com/foto.jpg"
            />
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
            style={{ backgroundColor: '#45877F' }}
            className="text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isProcessing ? 'Salvataggio...' : 'Salva Oggetto'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}