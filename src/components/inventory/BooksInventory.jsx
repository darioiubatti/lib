import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Search, Download, Upload, Barcode, SlidersHorizontal, Image, FileText, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import BookInventoryCard from "./BookInventoryCard.jsx";
import BookInventoryForm from "./BookInventoryForm.jsx";
import ISBNLookup from "./ISBNLookup.jsx";
import ExportMenu from "./ExportMenu.jsx";
import ImageLinksImport from "./ImageLinksImport.jsx";
import OPACAutoFill from "./OPACAutoFill.jsx";
import BooksFieldsImport from "./BooksFieldsImport.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BooksInventory({ onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [showISBNLookup, setShowISBNLookup] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImageImport, setShowImageImport] = useState(false);
  const [showOPACAutoFill, setShowOPACAutoFill] = useState(false);
  const [opacBookData, setOpacBookData] = useState(null);
  const [prefilledData, setPrefilledData] = useState(null);
  const [showFieldsImport, setShowFieldsImport] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  
  const [filters, setFilters] = useState({
    autore: '',
    editore: '',
    lingua: '',
    condizione: '',
    minPrezzo: '',
    maxPrezzo: '',
    disponibilita: 'all',
    collocazione: '',
    collana: '',
    soggetti: ''
  });
  const [sortBy, setSortBy] = useState('-created_date');
  
  const queryClient = useQueryClient();

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ['drafts'],
    queryFn: async () => {
      const allDrafts = await base44.entities.Draft.list();
      return allDrafts.filter(d => d.type === 'Book');
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
      setPrefilledData(draftData);
      setShowDrafts(false);
      setShowForm(true);
    },
  });

  const sortedBooks = useMemo(() => {
    const booksToSort = [...books];
    
    const sortField = sortBy.startsWith('-') ? sortBy.substring(1) : sortBy;
    const isDescending = sortBy.startsWith('-');
    
    return booksToSort.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'id_univoco') {
        const aNum = parseInt((aVal || '').replace(/\D/g, '')) || 0;
        const bNum = parseInt((bVal || '').replace(/\D/g, '')) || 0;
        return isDescending ? bNum - aNum : aNum - bNum;
      }
      
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      
      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return isDescending ? -comparison : comparison;
      }
      
      return isDescending ? bVal - aVal : aVal - bVal;
    });
  }, [books, sortBy]);

  const createMutation = useMutation({
    mutationFn: async (bookData) => {
      const existingIds = books
        .map(b => b.id_univoco)
        .filter(id => id && id.startsWith('A'))
        .map(id => parseInt(id.substring(1)))
        .filter(n => !isNaN(n));
      
      const nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      bookData.id_univoco = `A${nextNumber}`;
      
      return base44.entities.Book.create(bookData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setShowForm(false);
      setEditingBook(null);
      setPrefilledData(null);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (booksData) => {
      const existingIds = books
        .map(b => b.id_univoco)
        .filter(id => id && id.startsWith('A'))
        .map(id => parseInt(id.substring(1)))
        .filter(n => !isNaN(n));
      
      let nextNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      
      for (const bookData of booksData) {
        bookData.id_univoco = `A${nextNumber}`;
        await base44.entities.Book.create(bookData);
        nextNumber++;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      alert('Libri creati con successo!');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, bookData }) => base44.entities.Book.update(id, bookData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setShowForm(false);
      setEditingBook(null);
      setPrefilledData(null);
    },
  });

  const handleSave = (bookData) => {
    if (editingBook) {
      updateMutation.mutate({ id: editingBook.id, bookData });
    } else {
      createMutation.mutate(bookData);
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setPrefilledData(null);
    setShowForm(true);
  };

  const handleISBNFound = (bookData) => {
    if (Array.isArray(bookData)) {
      bulkCreateMutation.mutate(bookData);
      setShowISBNLookup(false);
    } else {
      setPrefilledData(bookData);
      setShowISBNLookup(false);
      setShowForm(true);
    }
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 1) return;
      
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
        
        if (values.length === 0 || values.every(v => v === '')) continue;

        const bookData = {};
        headers.forEach((header, index) => {
          const value = values[index];
          if (value !== undefined) {
            const fieldMap = {
              'ID Univoco': 'id_univoco',
              'Prezzo Online': 'prezzo_online',
              'Collocazione': 'collocazione',
              'Stock': 'stock',
              'Autore': 'autore',
              'Autore Alfa': 'autore_alfa',
              'Titolo Composto': 'titolo_composto',
              'Descrizione': 'descrizione',
              'Anno': 'anno',
              'Luogo': 'luogo',
              'Editore': 'editore',
              'Collana': 'collana',
              'ISBN': 'isbn',
              'Peso Gr': 'peso_gr',
              'Prefatori': 'prefatori',
              'Curatori': 'curatori',
              'Traduttore': 'traduttore',
              'Illustratore': 'illustratore',
              'Soggetti': 'soggetti',
              'Lingua': 'lingua',
              'Stato Conservazione': 'stato_conservazione',
              'Condizione': 'condizione',
              'Edizione': 'edizione',
              'Prima Edizione': 'prima_edizione',
              'Autografato': 'autografato',
              'Sovraccoperta': 'sovraccoperta',
              'Legatura': 'legatura',
              'Formato': 'formato',
              'Volumi': 'volumi',
              'Pagine': 'pagine',
              'ID Vecchio': 'id_vecchio',
              'Foto': 'foto',
              'Cover Image URL': 'cover_image_url'
            };
            
            const fieldName = fieldMap[header];
            if (fieldName) {
              if (value.toLowerCase() === 'true') {
                bookData[fieldName] = true;
              } else if (value.toLowerCase() === 'false') {
                bookData[fieldName] = false;
              } else if (!isNaN(Number(value)) && ['prezzo_online', 'stock', 'anno', 'peso_gr', 'volumi', 'pagine'].includes(fieldName)) {
                bookData[fieldName] = Number(value);
              } else {
                bookData[fieldName] = value;
              }
            }
          }
        });
        
        try {
          await base44.entities.Book.create(bookData);
        } catch (error) {
          console.error('Error creating book:', error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['books'] });
    };
    
    reader.readAsText(file);
    event.target.value = null;
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

  const incompleteCount = useMemo(() => {
    return sortedBooks.filter(b => b.is_incomplete === true).length;
  }, [sortedBooks]);

  const { filteredBooks, outOfStockMatchingCount } = useMemo(() => {
    const hasActiveFilters = searchTerm || filters.autore || filters.editore || filters.lingua || 
      filters.condizione || filters.minPrezzo || filters.maxPrezzo || filters.collocazione || 
      filters.collana || filters.soggetti || filters.disponibilita !== 'all';

    const allMatching = sortedBooks.filter(book => {
      const normalizedSearch = normalizeText(searchTerm);
      const matchSearch = searchTerm === '' || 
        normalizeText(book.titolo_composto).includes(normalizedSearch) ||
        normalizeText(book.autore).includes(normalizedSearch) ||
        normalizeText(book.id_univoco).includes(normalizedSearch) ||
        normalizeText(book.isbn).includes(normalizedSearch) ||
        normalizeText(book.editore).includes(normalizedSearch);

      const matchAutore = !filters.autore || normalizeText(book.autore).includes(normalizeText(filters.autore));
      const matchEditore = !filters.editore || normalizeText(book.editore).includes(normalizeText(filters.editore));
      const matchLingua = !filters.lingua || book.lingua === filters.lingua;
      const matchCondizione = !filters.condizione || book.condizione === filters.condizione;
      const matchCollocazione = !filters.collocazione || normalizeText(book.collocazione).includes(normalizeText(filters.collocazione));
      const matchCollana = !filters.collana || normalizeText(book.collana).includes(normalizeText(filters.collana));
      const matchSoggetti = !filters.soggetti || normalizeText(book.soggetti).includes(normalizeText(filters.soggetti));

      const matchPrezzo = (!filters.minPrezzo || book.prezzo_online >= parseFloat(filters.minPrezzo)) &&
                          (!filters.maxPrezzo || book.prezzo_online <= parseFloat(filters.maxPrezzo));

      const matchDisponibilita = filters.disponibilita === 'all' ||
                                  (filters.disponibilita === 'available' && book.stock > 0) ||
                                  (filters.disponibilita === 'unavailable' && book.stock === 0);

      return matchSearch && matchAutore && matchEditore && matchLingua && matchCondizione && matchPrezzo && matchDisponibilita && matchCollocazione && matchCollana && matchSoggetti;
    });

    const outOfStockMatching = hasActiveFilters ? allMatching.filter(b => b.stock === 0).length : 0;
    const filtered = showOutOfStock ? allMatching : allMatching.filter(b => b.stock > 0);

    return {
      filteredBooks: filtered,
      outOfStockMatchingCount: outOfStockMatching
    };
  }, [sortedBooks, searchTerm, filters, showOutOfStock]);

  if (showISBNLookup) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => setShowISBNLookup(false)} className="mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Torna all'Inventario
        </Button>
        <ISBNLookup onBookFound={handleISBNFound} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {!showForm ? (
        <>
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={onBack} size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Inventario Libri</h1>
              <p className="text-slate-500 mt-2 text-lg">Gestisci il catalogo completo dei libri</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setShowISBNLookup(true)}>
                <Barcode className="w-5 h-5 mr-2" />
                ISBN
              </Button>
              <Button variant="outline" onClick={() => setShowImageImport(true)}>
                <Image className="w-5 h-5 mr-2" />
                Importa Link Immagini
              </Button>
              <Button variant="outline" onClick={() => setShowFieldsImport(true)}>
              <Upload className="w-5 h-5 mr-2" />
              Importa Campi
              </Button>
              <Button variant="outline" onClick={() => setShowExportMenu(true)}>
                <Download className="w-5 h-5 mr-2" />
                Esporta
              </Button>
              <Button variant="outline" asChild>
                <label className="flex items-center cursor-pointer px-4 py-2 text-sm font-medium">
                  <Upload className="w-5 h-5 mr-2" />
                  Importa
                  <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                </label>
              </Button>
              <Button
                onClick={() => {
                  setEditingBook(null);
                  setPrefilledData(null);
                  setShowForm(true);
                }}
                className="btn-primary shadow-lg"
                style={{ backgroundColor: '#45877F', color: 'white', fontFamily: 'Montserrat', fontWeight: 600 }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Aggiungi
              </Button>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {incompleteCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-bold mb-3">
                  Attenzione: {incompleteCount} {incompleteCount === 1 ? 'scheda incompleta' : 'schede incomplete'}
                </p>
                <div className="space-y-2">
                  {sortedBooks.filter(b => b.is_incomplete === true).map(book => (
                    <div key={book.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                      <div className="flex items-center gap-2">
                        <Badge className="font-mono" style={{ backgroundColor: '#45877F', color: 'white' }}>
                          {book.id_univoco}
                        </Badge>
                        <span className="text-sm font-semibold">{book.titolo_composto || 'Senza titolo'}</span>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleEdit(book)}
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
                  <strong>Nota:</strong> {outOfStockMatchingCount} {outOfStockMatchingCount === 1 ? 'libro ha' : 'libri hanno'} stock = 0 e {outOfStockMatchingCount === 1 ? 'corrisponde' : 'corrispondono'} ai criteri di ricerca.{' '}
                  <button 
                    onClick={() => setShowOutOfStock(true)}
                    className="underline font-semibold hover:text-amber-900"
                  >
                    Vuoi visualizzarli?
                  </button>
                </p>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Cerca per ID, titolo, autore, ISBN o editore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 border-slate-300 bg-white/80 backdrop-blur-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {showFilters ? 'Nascondi Filtri' : 'Mostra Filtri'}
              </Button>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ordina per..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_date">Più recenti</SelectItem>
                  <SelectItem value="created_date">Meno recenti</SelectItem>
                  <SelectItem value="id_univoco">ID crescente</SelectItem>
                  <SelectItem value="-id_univoco">ID decrescente</SelectItem>
                  <SelectItem value="titolo_composto">Titolo A-Z</SelectItem>
                  <SelectItem value="-titolo_composto">Titolo Z-A</SelectItem>
                  <SelectItem value="autore">Autore A-Z</SelectItem>
                  <SelectItem value="-autore">Autore Z-A</SelectItem>
                  <SelectItem value="prezzo_online">Prezzo crescente</SelectItem>
                  <SelectItem value="-prezzo_online">Prezzo decrescente</SelectItem>
                  <SelectItem value="stock">Stock crescente</SelectItem>
                  <SelectItem value="-stock">Stock decrescente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-50 rounded-lg p-4 border border-slate-200"
              >
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Autore</label>
                    <Input
                      placeholder="Filtra per autore"
                      value={filters.autore}
                      onChange={(e) => setFilters({...filters, autore: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Editore</label>
                    <Input
                      placeholder="Filtra per editore"
                      value={filters.editore}
                      onChange={(e) => setFilters({...filters, editore: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Collocazione</label>
                    <Input
                      placeholder="Filtra per collocazione"
                      value={filters.collocazione}
                      onChange={(e) => setFilters({...filters, collocazione: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Collana</label>
                    <Input
                      placeholder="Filtra per collana"
                      value={filters.collana}
                      onChange={(e) => setFilters({...filters, collana: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Soggetti</label>
                    <Input
                      placeholder="Filtra per soggetti"
                      value={filters.soggetti}
                      onChange={(e) => setFilters({...filters, soggetti: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Lingua</label>
                    <Select value={filters.lingua} onValueChange={(val) => setFilters({...filters, lingua: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tutte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Tutte</SelectItem>
                        <SelectItem value="Italiano">Italiano</SelectItem>
                        <SelectItem value="Inglese">Inglese</SelectItem>
                        <SelectItem value="Francese">Francese</SelectItem>
                        <SelectItem value="Tedesco">Tedesco</SelectItem>
                        <SelectItem value="Spagnolo">Spagnolo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Condizione</label>
                    <Select value={filters.condizione} onValueChange={(val) => setFilters({...filters, condizione: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tutte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Tutte</SelectItem>
                        <SelectItem value="Nuovo">Nuovo</SelectItem>
                        <SelectItem value="Usato">Usato</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Disponibilità</label>
                    <Select value={filters.disponibilita} onValueChange={(val) => setFilters({...filters, disponibilita: val})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tutti</SelectItem>
                        <SelectItem value="available">Disponibili</SelectItem>
                        <SelectItem value="unavailable">Non disponibili</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-sm font-semibold mb-2 block">Prezzo min (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={filters.minPrezzo}
                        onChange={(e) => setFilters({...filters, minPrezzo: e.target.value})}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-semibold mb-2 block">Prezzo max (€)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="∞"
                        value={filters.maxPrezzo}
                        onChange={(e) => setFilters({...filters, maxPrezzo: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({
                    autore: '',
                    editore: '',
                    lingua: '',
                    condizione: '',
                    minPrezzo: '',
                    maxPrezzo: '',
                    disponibilita: 'all',
                    collocazione: '',
                    collana: '',
                    soggetti: ''
                  })}
                  className="mt-4"
                >
                  Azzera Filtri
                </Button>
              </motion.div>
            )}
          </div>

          <div className="mb-4 text-sm text-slate-600">
            Trovati <strong>{filteredBooks.length}</strong> libri
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">Nessun libro trovato</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="wait">
                {filteredBooks.map((book) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <BookInventoryCard book={book} onEdit={handleEdit} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {showImageImport && (
            <ImageLinksImport
              items={books}
              entityType="Book"
              onClose={() => setShowImageImport(false)}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['books'] })}
            />
          )}

          {showExportMenu && (
            <ExportMenu
              items={filteredBooks}
              onClose={() => setShowExportMenu(false)}
              entityType="Book"
            />
          )}

          {showFieldsImport && (
            <BooksFieldsImport
              books={books}
              onClose={() => setShowFieldsImport(false)}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['books'] })}
            />
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <BookInventoryForm
            book={editingBook || prefilledData}
            existingBooks={books}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingBook(null);
              setPrefilledData(null);
            }}
            isProcessing={createMutation.isPending || updateMutation.isPending}
          />
        </motion.div>
      )}
    </div>
  );
}