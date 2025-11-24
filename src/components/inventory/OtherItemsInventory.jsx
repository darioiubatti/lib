import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Download, Upload, Image, FileText, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import OtherItemCard from "./OtherItemCard.jsx";
import OtherItemForm from "./OtherItemForm.jsx";
import ExportMenu from "./ExportMenu.jsx";
import ImageLinksImport from "./ImageLinksImport.jsx";
import OtherItemsFieldsImport from "./OtherItemsFieldsImport.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_PREFIXES = {
  'Opere': 'OPE',
  'Vinili': 'VIN',
  'Giochi': 'GIO',
  'Oggetti': 'OGG',
  'Libri in contovendita': 'LIC'
};

export default function OtherItemsInventory({ onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImageImport, setShowImageImport] = useState(false);
  const [showFieldsImport, setShowFieldsImport] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('created_date');
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['otherItems'],
    queryFn: () => base44.entities.OtherItem.list('-created_date'),
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ['drafts'],
    queryFn: async () => {
      const allDrafts = await base44.entities.Draft.list();
      return allDrafts.filter(d => d.type === 'OtherItem');
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: (id) => base44.entities.Draft.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drafts'] }),
  });

  const loadDraftMutation = useMutation({
    mutationFn: async (draft) => {
      await base44.entities.Draft.delete(draft.id);
      return draft.data;
    },
    onSuccess: (draftData) => {
      queryClient.invalidateQueries({ queryKey: ['drafts'] });
      setEditingItem(draftData);
      setShowDrafts(false);
      setShowForm(true);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (itemData) => {
      const prefix = TYPE_PREFIXES[itemData.tipo_oggetto] || 'OGG';
      
      const existingIdsForType = items
        .filter(i => i.id_univoco?.startsWith(prefix))
        .map(i => parseInt(i.id_univoco.substring(prefix.length)))
        .filter(n => !isNaN(n));
      
      const nextNumber = existingIdsForType.length > 0 ? Math.max(...existingIdsForType) + 1 : 1;
      itemData.id_univoco = `${prefix}${String(nextNumber).padStart(5, '0')}`;
      
      itemData.stock = Number(itemData.stock) || 0;
      itemData.venduto = Number(itemData.venduto) || 0;
      itemData.prezzo_pubblico = Number(itemData.prezzo_pubblico) || 0;
      itemData.costo = Number(itemData.costo) || 0;
      itemData.da_pagare = Number(itemData.da_pagare) || 0;

      itemData.giacenza = itemData.stock - itemData.venduto;
      itemData.ricavo_libreria = itemData.prezzo_pubblico - itemData.costo;
      itemData.ricavo_fornitore = itemData.costo * itemData.venduto;
      itemData.da_pagare_art = itemData.costo * itemData.da_pagare;
      
      return base44.entities.OtherItem.create(itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherItems'] });
      setShowForm(false);
      setEditingItem(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, itemData }) => {
      itemData.stock = Number(itemData.stock) || 0;
      itemData.venduto = Number(itemData.venduto) || 0;
      itemData.prezzo_pubblico = Number(itemData.prezzo_pubblico) || 0;
      itemData.costo = Number(itemData.costo) || 0;
      itemData.da_pagare = Number(itemData.da_pagare) || 0;

      itemData.giacenza = itemData.stock - itemData.venduto;
      itemData.ricavo_libreria = itemData.prezzo_pubblico - itemData.costo;
      itemData.ricavo_fornitore = itemData.costo * itemData.venduto;
      itemData.da_pagare_art = itemData.costo * itemData.da_pagare;
      
      return base44.entities.OtherItem.update(id, itemData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherItems'] });
      setShowForm(false);
      setEditingItem(null);
    },
  });

  const handleSave = (itemData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, itemData });
    } else {
      createMutation.mutate(itemData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length === 0) return;

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)
                          ?.map(v => v ? v.replace(/"/g, '').trim() : '') || [];

        const itemData = {};
        const fieldMap = {
          'ID Univoco': 'id_univoco',
          'Tipo Oggetto': 'tipo_oggetto',
          'Contovendita': 'contovendita',
          'Proprietario': 'proprietario',
          'Tel Proprietario': 'tel_proprietario',
          'Mail Proprietario': 'mail_proprietario',
          'Oggetto': 'oggetto',
          'Prezzo Pubblico': 'prezzo_pubblico',
          'Venduto': 'venduto',
          'Da Pagare': 'da_pagare',
          'Stock': 'stock',
          'Costo': 'costo',
          'Fornitore Pagato': 'fornitore_pagato'
        };

        headers.forEach((header, index) => {
          const value = values[index];
          const fieldName = fieldMap[header];
          if (fieldName) {
            if (['prezzo_pubblico', 'venduto', 'da_pagare', 'stock', 'costo'].includes(fieldName)) {
              itemData[fieldName] = Number(value) || 0;
            } else if (fieldName === 'contovendita' || fieldName === 'fornitore_pagato') {
              itemData[fieldName] = value.toLowerCase() === 'true' || value.toLowerCase() === 'sì' || value === '1';
            }
            else {
              itemData[fieldName] = value;
            }
          }
        });
        
        itemData.stock = Number(itemData.stock) || 0;
        itemData.venduto = Number(itemData.venduto) || 0;
        itemData.prezzo_pubblico = Number(itemData.prezzo_pubblico) || 0;
        itemData.costo = Number(itemData.costo) || 0;
        itemData.da_pagare = Number(itemData.da_pagare) || 0;

        itemData.giacenza = itemData.stock - itemData.venduto;
        itemData.ricavo_libreria = itemData.prezzo_pubblico - itemData.costo;
        itemData.ricavo_fornitore = itemData.costo * itemData.venduto;
        itemData.da_pagare_art = itemData.costo * itemData.da_pagare;
        
        if (itemData.oggetto) {
          try {
            await base44.entities.OtherItem.create(itemData);
          } catch (error) {
            console.error('Error creating item from CSV:', itemData, error);
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['otherItems'] });
      event.target.value = null; 
    };
    
    reader.readAsText(file);
  };

  const normalizeText = (text) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[čć]/g, 'c')
      .replace(/[šś]/g, 's')
      .replace(/[žź]/g, 'z')
      .replace(/đ/g, 'd')
      .replace(/ñ/g, 'n')
      .replace(/ł/g, 'l')
      .replace(/ø/g, 'o')
      .replace(/æ/g, 'ae')
      .replace(/œ/g, 'oe')
      .replace(/ß/g, 'ss');
  };

  const [showOutOfStock, setShowOutOfStock] = useState(false);

  const incompleteCount = useMemo(() => {
    return items.filter(i => i.is_incomplete === true).length;
  }, [items]);

  const { filteredItems, outOfStockMatchingCount } = useMemo(() => {
    const hasActiveFilters = searchTerm || filterType !== 'all';

    const allMatching = items.filter(item => {
      const normalizedSearch = normalizeText(searchTerm);
      const matchesSearch = normalizeText(item.oggetto).includes(normalizedSearch) ||
        normalizeText(item.tipo_oggetto).includes(normalizedSearch) ||
        normalizeText(item.id_univoco).includes(normalizedSearch);

      const matchesType = filterType === 'all' || item.tipo_oggetto === filterType;

      return matchesSearch && matchesType;
    });

    const giacenzaZero = allMatching.filter(i => (i.stock || 0) - (i.venduto || 0) === 0).length;
    const outOfStockMatching = hasActiveFilters ? giacenzaZero : 0;
    const filtered = showOutOfStock ? allMatching : allMatching.filter(i => (i.stock || 0) - (i.venduto || 0) > 0);

    let result = filtered;

    result = result.sort((a, b) => {
      switch (sortBy) {
        case 'nome':
          return (a.oggetto || '').localeCompare(b.oggetto || '');
        case 'id_univoco':
          const aNum = parseInt((a.id_univoco || '').replace(/\D/g, '')) || 0;
          const bNum = parseInt((b.id_univoco || '').replace(/\D/g, '')) || 0;
          return bNum - aNum;
        case 'prezzo-asc':
          return (a.prezzo_pubblico || 0) - (b.prezzo_pubblico || 0);
        case 'prezzo-desc':
          return (b.prezzo_pubblico || 0) - (a.prezzo_pubblico || 0);
        case 'tipo':
          return (a.tipo_oggetto || '').localeCompare(b.tipo_oggetto || '');
        case 'stock':
          return (b.stock || 0) - (a.stock || 0);
        case 'giacenza':
          return ((b.stock || 0) - (b.venduto || 0)) - ((a.stock || 0) - (a.venduto || 0));
        case 'created_date':
        default:
          return 0;
      }
      });

      return {
      filteredItems: result,
      outOfStockMatchingCount: outOfStockMatching
      };
      }, [items, searchTerm, filterType, sortBy, showOutOfStock]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {!showForm ? (
        <>
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={onBack} size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Inventario Altro</h1>
              <p className="text-slate-500 mt-2 text-lg">Gestisci opere, vinili, giochi e altri oggetti</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowImageImport(true)}>
                <Image className="w-5 h-5 mr-2" />
                Importa Link Immagini
              </Button>
              <Button variant="outline" onClick={() => setShowFieldsImport(true)}>
                <Upload className="w-5 h-5 mr-2" />
                Importa Campo Oggetto
              </Button>
              <Button variant="outline" onClick={() => setShowExportMenu(true)}>
                <Download className="w-5 h-5 mr-2" />
                Esporta
              </Button>
              <Button variant="outline" asChild>
                <label className="flex items-center cursor-pointer px-4 py-2">
                  <Upload className="w-5 h-5 mr-2" />
                  Importa
                  <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                </label>
              </Button>
              <Button
                onClick={() => {
                  setEditingItem(null);
                  setShowForm(true);
                }}
                style={{ backgroundColor: '#45877F' }}
                className="hover:opacity-90 shadow-lg text-white"
              >
                <Plus className="w-5 h-5 mr-2" />
                Aggiungi
              </Button>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {incompleteCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-bold mb-3">
                  Attenzione: {incompleteCount} {incompleteCount === 1 ? 'scheda incompleta' : 'schede incomplete'}
                </p>
                <div className="space-y-2">
                  {items.filter(i => i.is_incomplete === true).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                      <div className="flex items-center gap-2">
                        <Badge className="font-mono" style={{ backgroundColor: '#45877F', color: 'white' }}>
                          {item.id_univoco}
                        </Badge>
                        <span className="text-sm font-semibold">{item.oggetto || 'Senza nome'}</span>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleEdit(item)}
                        style={{ backgroundColor: '#45877F' }}
                        className="text-white"
                      >
                        Completa
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {outOfStockMatchingCount > 0 && !showOutOfStock && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="text-amber-800">
                  <strong>Nota:</strong> {outOfStockMatchingCount} {outOfStockMatchingCount === 1 ? 'oggetto ha' : 'oggetti hanno'} giacenza = 0 e {outOfStockMatchingCount === 1 ? 'corrisponde' : 'corrispondono'} ai criteri di ricerca.{' '}
                  <button 
                    onClick={() => setShowOutOfStock(true)}
                    className="underline font-semibold hover:text-amber-900"
                  >
                    Vuoi visualizzarli?
                  </button>
                </p>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Cerca per ID, nome o tipo oggetto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 border-slate-300 bg-white/80 backdrop-blur-sm"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Filtra per tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le tipologie</SelectItem>
                <SelectItem value="Opere">Opere</SelectItem>
                <SelectItem value="Vinili">Vinili</SelectItem>
                <SelectItem value="Giochi">Giochi</SelectItem>
                <SelectItem value="Oggetti">Oggetti</SelectItem>
                <SelectItem value="Libri in contovendita">Libri in contovendita</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Ordina per" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_date">Più recenti</SelectItem>
                <SelectItem value="id_univoco">ID decrescente</SelectItem>
                <SelectItem value="nome">Nome A-Z</SelectItem>
                <SelectItem value="prezzo-asc">Prezzo crescente</SelectItem>
                <SelectItem value="prezzo-desc">Prezzo decrescente</SelectItem>
                <SelectItem value="tipo">Tipologia</SelectItem>
                <SelectItem value="stock">Stock decrescente</SelectItem>
                <SelectItem value="giacenza">Giacenza decrescente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">Nessun oggetto trovato con giacenza disponibile</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="wait">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <OtherItemCard item={item} onEdit={handleEdit} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Replaced PhotoUploadModal with ImageLinksImport */}
          {showImageImport && (
            <ImageLinksImport
              items={items}
              entityType="OtherItem"
              onClose={() => setShowImageImport(false)}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['otherItems'] })}
            />
          )}

          {showExportMenu && (
            <ExportMenu
              items={filteredItems}
              onClose={() => setShowExportMenu(false)}
              entityType="OtherItem"
            />
          )}

          {showFieldsImport && (
            <OtherItemsFieldsImport
              items={items}
              onClose={() => setShowFieldsImport(false)}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['otherItems'] })}
            />
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <OtherItemForm
            item={editingItem}
            existingItems={items}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
            isProcessing={createMutation.isPending || updateMutation.isPending}
          />
        </motion.div>
      )}
    </div>
  );
}