import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, BookOpen, Search, Sparkles, MapPin, X, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Recommendations() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [sortBy, setSortBy] = useState('compatibility');
  const [selectedBook, setSelectedBook] = useState(null);

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const searchRecommendations = async () => {
    if (!query.trim()) {
      alert('Inserisci una descrizione di ciò che il cliente cerca');
      return;
    }

    setLoading(true);
    try {
      const booksList = books
        .filter(b => b.stock > 0)
        .map(b => ({
          id: b.id,
          id_univoco: b.id_univoco,
          titolo: b.titolo_composto,
          autore: b.autore,
          editore: b.editore,
          descrizione: b.descrizione,
          soggetti: b.soggetti,
          anno: b.anno,
          lingua: b.lingua,
          prezzo: b.prezzo_online,
          stock: b.stock,
          collocazione: b.collocazione
        }));

      // Limit to first 50 books for efficiency
      const limitedBooks = booksList.slice(0, 50);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Hai a disposizione il seguente catalogo di libri (primi 50 disponibili):

${JSON.stringify(limitedBooks, null, 2)}

Un cliente cerca: "${query}"

Analizza il catalogo e suggerisci i libri più adatti alla richiesta del cliente.
Per ogni libro suggerito, calcola una percentuale di compatibilità (0-100) basata su:
- Pertinenza del titolo
- Autore e stile
- Soggetti/categorie
- Descrizione
- Lingua se specificata
- Anno se rilevante

Restituisci MASSIMO 10 suggerimenti, ordinati per compatibilità decrescente.
Fornisci il risultato in formato JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggerimenti: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id_univoco: { type: "string" },
                  compatibilita: { type: "number" },
                  motivazione: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result && result.suggerimenti) {
        const enrichedRecommendations = result.suggerimenti.map(sug => {
          const book = books.find(b => b.id_univoco === sug.id_univoco);
          return {
            ...sug,
            book
          };
        }).filter(r => r.book);

        setRecommendations(enrichedRecommendations);
      }
    } catch (error) {
      console.error('Errore nella ricerca:', error);
      alert('Errore nella ricerca dei consigli. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  let sortedRecommendations = [...recommendations];
  if (sortBy === 'compatibility') {
    sortedRecommendations.sort((a, b) => b.compatibilita - a.compatibilita);
  } else if (sortBy === 'price-asc') {
    sortedRecommendations.sort((a, b) => a.book.prezzo_online - b.book.prezzo_online);
  } else if (sortBy === 'price-desc') {
    sortedRecommendations.sort((a, b) => b.book.prezzo_online - a.book.prezzo_online);
  }

  const [localSearchTerm, setLocalSearchTerm] = useState('');
  
  const localFilteredBooks = books.filter(b => {
    if (!localSearchTerm.trim()) return false;
    if (b.stock <= 0) return false;
    const searchLower = localSearchTerm.toLowerCase();
    return (
      b.soggetti?.toLowerCase().includes(searchLower) ||
      b.descrizione?.toLowerCase().includes(searchLower)
    );
  }).slice(0, 20);

  const addToCart = (book) => {
    const currentCart = JSON.parse(localStorage.getItem('cassaCart') || '[]');
    const existingItem = currentCart.find(item => item.id === book.id && item.type === 'book');
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      currentCart.push({
        id: book.id,
        type: 'book',
        name: book.titolo_composto,
        price: book.prezzo_online,
        quantity: 1,
        id_univoco: book.id_univoco,
        hasDiscount: book.condizione === 'Nuovo',
        discountApplied: book.condizione === 'Nuovo'
      });
    }
    
    localStorage.setItem('cassaCart', JSON.stringify(currentCart));
    alert(`"${book.titolo_composto}" aggiunto al carrello!`);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
          <Lightbulb className="w-10 h-10" style={{ color: '#45877F' }} />
          Consigli per Clienti
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Trova i libri perfetti per i tuoi clienti</p>
      </div>

      <Card className="mb-8 border-2" style={{ borderColor: '#45877F' }}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Cosa cerca il cliente?
              </label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Es: Libri divertenti per ragazzi di 12 anni, romanzi storici ambientati in Italia, poesie contemporanee..."
                rows={4}
                className="resize-none"
              />
            </div>
            <Button
              onClick={searchRecommendations}
              disabled={loading || !query.trim()}
              className="w-full btn-primary"
              style={{ backgroundColor: '#45877F', color: 'white', fontFamily: 'Montserrat', fontWeight: 600 }}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Ricerca in corso...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 mr-2" />
                  Trova Consigli
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" style={{ color: '#45877F' }} />
            Ricerca Rapida per Soggetto/Descrizione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Cerca nei soggetti e descrizioni..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="mb-4"
          />
          {localFilteredBooks.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {localFilteredBooks.map(book => (
                <div key={book.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {book.collocazione && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {book.collocazione}
                          </Badge>
                        )}
                        {book.soggetti && <Badge variant="outline">{book.soggetti}</Badge>}
                      </div>
                      <p className="font-bold">{book.titolo_composto}</p>
                      {book.autore && <p className="text-sm text-slate-600 mb-1">{book.autore}</p>}
                      {book.descrizione && (
                        <div className="group relative">
                          <p className="text-xs text-slate-500 mb-2 line-clamp-2 group-hover:line-clamp-none transition-all">
                            {book.descrizione}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-bold" style={{ color: '#45877F' }}>€{book.prezzo_online?.toFixed(2)}</p>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(book);
                        }}
                        style={{ backgroundColor: '#45877F', color: 'white' }}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Aggiungi
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: '#45877F' }} />
              <h2 className="text-2xl font-bold text-black">
                {recommendations.length} Suggerimenti Trovati
              </h2>
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compatibility">Compatibilità decrescente</SelectItem>
                <SelectItem value="price-asc">Prezzo crescente</SelectItem>
                <SelectItem value="price-desc">Prezzo decrescente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {sortedRecommendations.map((rec, idx) => (
              <Card key={rec.book.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedBook(rec.book)}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      {rec.book.cover_image_url ? (
                        <img
                          src={rec.book.cover_image_url}
                          alt={rec.book.titolo_composto}
                          className="w-24 h-32 object-cover rounded-lg shadow-md"
                        />
                      ) : (
                        <div className="w-24 h-32 bg-slate-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className="font-mono" style={{ backgroundColor: '#45877F', color: 'white' }}>
                              {rec.book.id_univoco}
                            </Badge>
                            {rec.book.collocazione && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {rec.book.collocazione}
                              </Badge>
                            )}
                            <Badge className={`text-lg font-bold ${
                              rec.compatibilita >= 80 ? 'bg-green-600' :
                              rec.compatibilita >= 60 ? 'bg-blue-600' :
                              rec.compatibilita >= 40 ? 'bg-amber-600' :
                              'bg-slate-600'
                            } text-white`}>
                              {rec.compatibilita}% Compatibile
                            </Badge>
                          </div>
                          <h3 className="text-xl font-bold text-black mb-1">{rec.book.titolo_composto}</h3>
                          {rec.book.autore && (
                            <p className="text-slate-600 mb-2">{rec.book.autore}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Prezzo</p>
                          <p className="text-2xl font-bold text-black">€{rec.book.prezzo_online?.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <p className="text-sm text-blue-900">
                          <strong>Perché consigliato:</strong> {rec.motivazione}
                        </p>
                      </div>

                      {rec.book.descrizione && (
                        <div className="text-sm text-slate-600 mb-3 p-3 bg-slate-50 rounded group relative">
                          <strong className="block mb-1">Descrizione:</strong>
                          <p className="line-clamp-3 group-hover:line-clamp-none transition-all">
                            {rec.book.descrizione}
                          </p>
                          <span className="text-xs text-slate-400 mt-1 block group-hover:hidden">
                            (passa il mouse per leggere tutto)
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        {rec.book.editore && (
                          <Badge variant="outline">{rec.book.editore}</Badge>
                        )}
                        {rec.book.anno && (
                          <Badge variant="outline">{rec.book.anno}</Badge>
                        )}
                        {rec.book.lingua && (
                          <Badge variant="outline">{rec.book.lingua}</Badge>
                        )}
                        {rec.book.soggetti && (
                          <Badge variant="outline">{rec.book.soggetti}</Badge>
                        )}
                        <Badge className={`${
                          rec.book.stock > 5 ? 'bg-green-100 text-green-800' :
                          rec.book.stock > 0 ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          Stock: {rec.book.stock}
                        </Badge>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(rec.book);
                        }}
                        className="w-full"
                        style={{ backgroundColor: '#45877F', color: 'white', fontFamily: 'Montserrat', fontWeight: 600 }}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Aggiungi in Cassa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!loading && recommendations.length === 0 && query && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 text-lg">Nessun suggerimento trovato per questa ricerca</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={selectedBook !== null} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{selectedBook?.titolo_composto}</DialogTitle>
          </DialogHeader>
          {selectedBook && (
            <div className="space-y-6 py-4">
              <div className="flex gap-6">
                <div className="w-48 h-64 bg-slate-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {selectedBook.image_urls?.[0] || selectedBook.photo_url || selectedBook.cover_image_url ? (
                    <img 
                      src={selectedBook.image_urls?.[0] || selectedBook.photo_url || selectedBook.cover_image_url} 
                      alt={selectedBook.titolo_composto}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <Label className="text-sm text-slate-500">Autore</Label>
                    <p className="text-lg font-semibold">{selectedBook.autore || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-slate-500">Editore</Label>
                      <p>{selectedBook.editore || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">Anno</Label>
                      <p>{selectedBook.anno || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">Lingua</Label>
                      <p>{selectedBook.lingua || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">Condizione</Label>
                      <p>{selectedBook.condizione || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">Prezzo</Label>
                      <p className="text-2xl font-bold" style={{ color: '#45877F' }}>€{selectedBook.prezzo_online?.toFixed(2)}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-slate-500">Stock</Label>
                      <p className="text-lg font-semibold">{selectedBook.stock || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedBook.descrizione && (
                <div>
                  <Label className="text-sm text-slate-500">Descrizione</Label>
                  <p className="text-slate-700 mt-2">{selectedBook.descrizione}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedBook.isbn && (
                  <div>
                    <Label className="text-sm text-slate-500">ISBN</Label>
                    <p>{selectedBook.isbn}</p>
                  </div>
                )}
                {selectedBook.pagine && (
                  <div>
                    <Label className="text-sm text-slate-500">Pagine</Label>
                    <p>{selectedBook.pagine}</p>
                  </div>
                )}
                {selectedBook.collana && (
                  <div>
                    <Label className="text-sm text-slate-500">Collana</Label>
                    <p>{selectedBook.collana}</p>
                  </div>
                )}
                {selectedBook.edizione && (
                  <div>
                    <Label className="text-sm text-slate-500">Edizione</Label>
                    <p>{selectedBook.edizione}</p>
                  </div>
                )}
                {selectedBook.stato_conservazione && (
                  <div>
                    <Label className="text-sm text-slate-500">Stato Conservazione</Label>
                    <p>{selectedBook.stato_conservazione}</p>
                  </div>
                )}
                {selectedBook.legatura && (
                  <div>
                    <Label className="text-sm text-slate-500">Legatura</Label>
                    <p>{selectedBook.legatura}</p>
                  </div>
                )}
                {selectedBook.collocazione && (
                  <div>
                    <Label className="text-sm text-slate-500">Collocazione</Label>
                    <p className="font-mono font-semibold">{selectedBook.collocazione}</p>
                  </div>
                )}
                {selectedBook.id_univoco && (
                  <div>
                    <Label className="text-sm text-slate-500">ID Univoco</Label>
                    <p className="font-mono font-bold" style={{ color: '#45877F' }}>{selectedBook.id_univoco}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedBook.prima_edizione && <Badge className="bg-green-600 text-white">Prima Edizione</Badge>}
                {selectedBook.autografato && <Badge className="bg-purple-600 text-white">Autografato</Badge>}
                {selectedBook.sovraccoperta && <Badge className="bg-blue-600 text-white">Con Sovraccoperta</Badge>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}