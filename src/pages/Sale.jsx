
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, Trash2, Plus, Minus, Check, X, AlertCircle, MapPin, SlidersHorizontal, Download, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";

export default function Sale() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSaleLogs, setShowSaleLogs] = useState(false);
  const [filters, setFilters] = useState({
    autore: '',
    editore: '',
    tipo: '',
    minPrezzo: '',
    maxPrezzo: '',
    collocazione: ''
  });
  const [sortBy, setSortBy] = useState('name');
  const queryClient = useQueryClient();

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: otherItems = [] } = useQuery({
    queryKey: ['otherItems'],
    queryFn: () => base44.entities.OtherItem.list(),
  });

  const { data: saleLogs = [] } = useQuery({
    queryKey: ['saleLogs'],
    queryFn: () => base44.entities.SaleLog.list('-created_date', 50),
  });

  const updateBookStock = useMutation({
    mutationFn: ({ id, newStock }) => base44.entities.Book.update(id, { stock: newStock }),
  });

  const updateItemStock = useMutation({
    mutationFn: ({ id, item }) => {
      const newStock = item.stock - item.cartQuantity;
      const newVenduto = (item.venduto || 0) + item.cartQuantity;
      const newDaPagare = (item.da_pagare || 0) + item.cartQuantity;
      
      return base44.entities.OtherItem.update(id, {
        stock: newStock,
        venduto: newVenduto,
        da_pagare: item.contovendita === 'SI' ? newDaPagare : item.da_pagare,
        giacenza: newStock - newVenduto,
        ricavo_fornitore: item.costo * newVenduto,
        da_pagare_art: item.costo * (item.contovendita === 'SI' ? newDaPagare : item.da_pagare || 0)
      });
    },
  });

  const createSaleLog = useMutation({
    mutationFn: (data) => base44.entities.SaleLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saleLogs'] });
    }
  });

  const allProducts = [
    ...books.map(b => ({ ...b, type: 'book', displayName: b.titolo_composto, price: b.prezzo_online, availableStock: b.stock || 0 })),
    ...otherItems.map(i => ({ ...i, type: 'item', displayName: i.oggetto, price: i.prezzo_pubblico, availableStock: i.stock || 0 }))
  ];

  let searchResults = allProducts.filter(p => {
    const matchSearch = searchTerm === '' || 
      p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.type === 'book' && p.autore?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.type === 'book' && p.isbn?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.type === 'book' && p.editore?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.id_univoco?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchAutore = !filters.autore || (p.type === 'book' && p.autore?.toLowerCase().includes(filters.autore.toLowerCase()));
    const matchEditore = !filters.editore || (p.type === 'book' && p.editore?.toLowerCase().includes(filters.editore.toLowerCase()));
    const matchTipo = !filters.tipo || 
      (filters.tipo === 'libri' && p.type === 'book') ||
      (filters.tipo === 'oggetti' && p.type === 'item');
    const matchCollocazione = !filters.collocazione || p.collocazione?.toLowerCase().includes(filters.collocazione.toLowerCase());
    const matchPrezzo = (!filters.minPrezzo || p.price >= parseFloat(filters.minPrezzo)) &&
                        (!filters.maxPrezzo || p.price <= parseFloat(filters.maxPrezzo));

    return matchSearch && matchAutore && matchEditore && matchTipo && matchCollocazione && matchPrezzo;
  });

  searchResults.sort((a, b) => {
    switch(sortBy) {
      case 'name': return (a.displayName || '').localeCompare(b.displayName || '');
      case 'price-asc': return a.price - b.price;
      case 'price-desc': return b.price - a.price;
      case 'stock-asc': return a.availableStock - b.availableStock;
      case 'stock-desc': return b.availableStock - a.availableStock;
      default: return 0;
    }
  });

  const inStockProducts = searchResults.filter(p => p.availableStock > 0);
  const outOfStockProducts = searchResults.filter(p => p.availableStock === 0);

  const filteredProducts = showOutOfStock ? searchResults : inStockProducts;

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id && item.type === product.type);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id && item.type === product.type
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const isNewBook = product.type === 'book' && product.condizione === 'Nuovo';
      setCart([...cart, {
        ...product,
        quantity: 1,
        discount: isNewBook ? 30 : 0,
        applyDiscount: isNewBook
      }]);
    }
  };

  const removeFromCart = (productId, type) => {
    setCart(cart.filter(item => !(item.id === productId && item.type === type)));
  };

  const updateQuantity = (productId, type, delta) => {
    setCart(cart.map(item => {
      if (item.id === productId && item.type === type) {
        const newQuantity = Math.max(1, Math.min(item.availableStock, item.quantity + delta));
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const toggleDiscount = (productId, type) => {
    setCart(cart.map(item =>
      item.id === productId && item.type === type
        ? { ...item, applyDiscount: !item.applyDiscount }
        : item
    ));
  };

  const getItemPrice = (item) => {
    const basePrice = item.price * item.quantity;
    if (item.applyDiscount && item.discount > 0) {
      return basePrice * (1 - item.discount / 100);
    }
    return basePrice;
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + getItemPrice(item), 0);
  };

  const confirmSale = async () => {
    for (const item of cart) {
      if (item.type === 'book') {
        await updateBookStock.mutateAsync({
          id: item.id,
          newStock: item.availableStock - item.quantity
        });
      } else {
        await updateItemStock.mutateAsync({
          id: item.id,
          item: { ...item, cartQuantity: item.quantity }
        });
      }
    }

    const saleLogData = {
      date: format(new Date(), 'yyyy-MM-dd'),
      items: cart.map(item => ({
        product_id: item.id_univoco,
        product_name: item.displayName,
        product_type: item.type,
        quantity: item.quantity,
        price: item.price,
        discount: item.applyDiscount ? item.discount : 0,
        total: getItemPrice(item)
      })),
      total_amount: getTotalPrice()
    };

    await createSaleLog.mutateAsync(saleLogData);

    queryClient.invalidateQueries({ queryKey: ['books'] });
    queryClient.invalidateQueries({ queryKey: ['otherItems'] });
    
    setCart([]);
    alert('Vendita confermata! Stock aggiornato e log salvato.');
  };

  const exportSaleLogs = () => {
    const csvContent = [
      'Data,Articoli,Quantità,Totale',
      ...saleLogs.map(log => {
        const items = log.items?.map(i => `${i.product_id} ${i.product_name} (x${i.quantity})`).join('; ') || '';
        const totalQty = log.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
        return `"${format(new Date(log.date), 'dd/MM/yyyy')}","${items}","${totalQty}","€${log.total_amount.toFixed(2)}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `log_vendite_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (showSaleLogs) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
              <Calendar className="w-10 h-10" style={{ color: '#45877F' }} />
              Log delle Vendite
            </h1>
            <p className="text-slate-500 mt-2 text-lg">Storico vendite giornaliere</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportSaleLogs} variant="outline">
              <Download className="w-5 h-5 mr-2" />
              Esporta CSV
            </Button>
            <Button onClick={() => setShowSaleLogs(false)} variant="outline">
              Torna alla Vendita
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {saleLogs.map(log => (
            <Card key={log.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-500">{format(new Date(log.date), 'EEEE d MMMM yyyy', { locale: it })}</p>
                    <p className="text-2xl font-bold" style={{ color: '#45877F' }}>€{log.total_amount?.toFixed(2)}</p>
                  </div>
                  <Badge>
                    {log.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} articoli
                  </Badge>
                </div>
                <div className="space-y-2">
                  {log.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{item.product_name}</p>
                        <p className="text-xs text-slate-500">
                          {item.product_id} • Qty: {item.quantity} • €{item.price?.toFixed(2)}
                          {item.discount > 0 && ` • Sconto ${item.discount}%`}
                        </p>
                      </div>
                      <p className="font-bold">€{item.total?.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-black tracking-tight">Vendita in Negozio</h1>
          <p className="text-slate-500 mt-2 text-lg">Seleziona articoli per la vendita</p>
        </div>
        <Button onClick={() => setShowSaleLogs(true)} variant="outline">
          <Calendar className="w-5 h-5 mr-2" />
          Log Vendite
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Cerca per nome, autore, ISBN, editore..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 border-slate-300"
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
                  <SelectItem value="name">Nome A-Z</SelectItem>
                  <SelectItem value="price-asc">Prezzo crescente</SelectItem>
                  <SelectItem value="price-desc">Prezzo decrescente</SelectItem>
                  <SelectItem value="stock-asc">Stock crescente</SelectItem>
                  <SelectItem value="stock-desc">Stock decrescente</SelectItem>
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
                    <label className="text-sm font-semibold mb-2 block">Tipo</label>
                    <Select value={filters.tipo} onValueChange={(val) => setFilters({...filters, tipo: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tutti" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Tutti</SelectItem>
                        <SelectItem value="libri">Solo Libri</SelectItem>
                        <SelectItem value="oggetti">Solo Oggetti</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Collocazione</label>
                    <Input
                      placeholder="Filtra per collocazione"
                      value={filters.collocazione}
                      onChange={(e) => setFilters({...filters, collocazione: e.target.value})}
                    />
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
                    tipo: '',
                    minPrezzo: '',
                    maxPrezzo: '',
                    collocazione: ''
                  })}
                  className="mt-4"
                >
                  Azzera Filtri
                </Button>
              </motion.div>
            )}

            <div className="text-sm text-slate-600">
              Trovati <strong>{filteredProducts.length}</strong> articoli
            </div>
          </div>

          {searchTerm && outOfStockProducts.length > 0 && !showOutOfStock && (
            <Card className="mb-4 bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-900">
                        {outOfStockProducts.length} articolo/i trovato/i ma non disponibile/i
                      </p>
                      <p className="text-sm text-amber-700">
                        Questi articoli hanno quantità a 0
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOutOfStock(true)}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    Mostra comunque
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showOutOfStock && outOfStockProducts.length > 0 && (
            <Card className="mb-4 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-900">
                    Stai visualizzando anche articoli non disponibili
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOutOfStock(false)}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Nascondi
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredProducts.map((product) => (
              <Card key={`${product.type}-${product.id}`} className={`hover:shadow-md transition-shadow ${product.availableStock === 0 ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge style={{ backgroundColor: '#45877F' }} className="text-white font-mono">
                          {product.id_univoco}
                        </Badge>
                        {product.collocazione && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {product.collocazione}
                          </Badge>
                        )}
                        {product.type === 'book' && product.condizione === 'Nuovo' && (
                          <Badge className="bg-green-600">Nuovo</Badge>
                        )}
                        {product.type === 'item' && product.contovendita === 'SI' && (
                          <Badge className="bg-blue-600">Conto Vendita</Badge>
                        )}
                        {product.availableStock === 0 && (
                          <Badge variant="destructive">Non Disponibile</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-black">{product.displayName}</h3>
                      {product.type === 'book' && <p className="text-sm text-slate-500">{product.autore}</p>}
                      <p className={`text-sm font-medium mt-1 ${product.availableStock === 0 ? 'text-red-600' : product.availableStock < 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                        Stock: {product.availableStock}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-black">€{product.price?.toFixed(2)}</p>
                      <Button
                        onClick={() => addToCart(product)}
                        size="sm"
                        className="mt-2"
                        style={{ backgroundColor: '#45877F' }}
                        disabled={product.availableStock < 1}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Aggiungi
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Carrello ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {cart.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Il carrello è vuoto</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={`cart-${item.type}-${item.id}`} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-black text-sm">{item.displayName}</p>
                            <p className="text-xs text-slate-500">€{item.price?.toFixed(2)} cad.</p>
                            {item.type === 'item' && item.contovendita === 'SI' && (
                              <p className="text-xs text-blue-600 font-semibold">Conto Vendita</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.id, item.type)}
                            className="h-6 w-6"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item.id, item.type, -1)}
                              className="h-7 w-7"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item.id, item.type, 1)}
                              className="h-7 w-7"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="font-bold text-black">
                            €{getItemPrice(item).toFixed(2)}
                          </p>
                        </div>

                        {item.discount > 0 && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                            <Checkbox
                              id={`discount-${item.type}-${item.id}`}
                              checked={item.applyDiscount}
                              onCheckedChange={() => toggleDiscount(item.id, item.type)}
                              className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                              style={item.applyDiscount ? { borderColor: '#45877F', borderWidth: '2px' } : { borderColor: '#cbd5e1' }}
                            />
                            <label
                              htmlFor={`discount-${item.type}-${item.id}`}
                              className="text-xs cursor-pointer"
                              style={{ 
                                fontFamily: 'DM Sans', 
                                color: item.applyDiscount ? '#15803d' : '#64748b',
                                fontWeight: item.applyDiscount ? 600 : 400
                              }}
                            >
                              Sconto {item.discount}% (Nuovo)
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-black">Totale:</span>
                      <span className="text-3xl font-bold text-black">
                        €{getTotalPrice().toFixed(2)}
                      </span>
                    </div>
                    <Button
                      onClick={confirmSale}
                      className="w-full btn-primary"
                      style={{ backgroundColor: '#45877F', color: 'white', fontFamily: 'Montserrat', fontWeight: 600 }}
                      size="lg"
                    >
                      <Check className="w-5 h-5 mr-2" />
                      Conferma Vendita
                    </Button>
                    <Button
                      onClick={() => setCart([])}
                      variant="outline"
                      className="w-full"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Svuota Carrello
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
