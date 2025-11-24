import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Search, Trash2, Plus, Minus, SlidersHorizontal, CreditCard, Banknote, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Cassa() {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('cassaCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => base44.entities.Reservation.list(),
  });

  // Load reservation from URL parameter
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reservationId = urlParams.get('reservation');
    
    if (reservationId && reservations.length > 0) {
      const reservation = reservations.find(r => r.id === reservationId);
      if (reservation && reservation.status === 'active') {
        const cartItems = reservation.items.map(item => ({
          id: item.product_id,
          type: item.product_type,
          name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          id_univoco: item.product_id,
          hasDiscount: false,
          discountApplied: false
        }));
        setCart(cartItems);
        
        // Clear URL parameter
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [reservations]);
  const [paymentMethod, setPaymentMethod] = useState('contanti');
  const [discount, setDiscount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showManualBook, setShowManualBook] = useState(false);
  const [showManualOther, setShowManualOther] = useState(false);
  const [manualBookPrice, setManualBookPrice] = useState('');
  const [manualOtherName, setManualOtherName] = useState('');
  const [manualOtherPrice, setManualOtherPrice] = useState('');
  const [showOnlineOrderDialog, setShowOnlineOrderDialog] = useState(false);
  const [onlineOrderNumber, setOnlineOrderNumber] = useState('');
  const [onlinePaymentMethod, setOnlinePaymentMethod] = useState('paypal');
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [reservationData, setReservationData] = useState({
    customer_name: '',
    customer_surname: '',
    customer_contact: '',
    deposit: 0
  });
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [filters, setFilters] = useState({
    autore: '',
    editore: '',
    lingua: '',
    condizione: '',
    minPrezzo: '',
    maxPrezzo: '',
    disponibilita: 'all',
    collocazione: '',
    tipo_oggetto: ''
  });
  const [sortBy, setSortBy] = useState('-created_date');

  const queryClient = useQueryClient();

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: otherItems = [] } = useQuery({
    queryKey: ['otherItems'],
    queryFn: () => base44.entities.OtherItem.list(),
  });

  const updateBookMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Book.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
  });

  const updateOtherItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OtherItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['otherItems'] }),
  });

  const createSaleLogMutation = useMutation({
    mutationFn: (data) => base44.entities.SaleLog.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saleLogs'] }),
  });

  const { data: dailyAccounting = [] } = useQuery({
    queryKey: ['dailyAccounting'],
    queryFn: () => base44.entities.DailyAccounting.list(),
  });

  const { data: catalogedBooks = [] } = useQuery({
    queryKey: ['catalogedBooks'],
    queryFn: () => base44.entities.CatalogedBooks.list(),
  });

  const { data: onlinePurchases = [] } = useQuery({
    queryKey: ['onlinePurchases'],
    queryFn: () => base44.entities.OnlinePurchase.list(),
  });

  const updateDailyAccountingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyAccounting.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dailyAccounting'] }),
  });

  const createDailyAccountingMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyAccounting.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dailyAccounting'] }),
  });

  const updateCatalogedBooksMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CatalogedBooks.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogedBooks'] }),
  });

  const createCatalogedBooksMutation = useMutation({
    mutationFn: (data) => base44.entities.CatalogedBooks.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catalogedBooks'] }),
  });

  const createOnlinePurchaseMutation = useMutation({
    mutationFn: (data) => base44.entities.OnlinePurchase.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onlinePurchases'] }),
  });

  const createReservationMutation = useMutation({
    mutationFn: (data) => base44.entities.Reservation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setCart([]);
      setDiscount(0);
      setReservationData({
        customer_name: '',
        customer_surname: '',
        customer_contact: '',
        deposit: 0
      });
      setShowReservationDialog(false);
      alert('Prenotazione creata con successo!');
    },
  });

  const createDesiderataMutation = useMutation({
    mutationFn: (data) => base44.entities.Desiderata.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['desiderata'] });
    },
  });

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
      const match = url.match(/\/file\/d\/([^/]+)/);
      if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
  };

  const allProducts = useMemo(() => {
    const bookProducts = books
      .filter(b => b.stock > 0)
      .map(b => ({
        ...b,
        type: 'book',
        name: b.titolo_composto,
        price: b.prezzo_online,
        imageUrl: getImageUrl(b.image_urls?.[0] || b.photo_url || b.cover_image_url)
      }));

    const itemProducts = otherItems
      .filter(i => (i.stock || 0) - (i.venduto || 0) > 0)
      .map(i => ({
        ...i,
        type: 'item',
        name: i.oggetto,
        price: i.prezzo_pubblico,
        imageUrl: getImageUrl(i.image_urls?.[0] || i.photo_url || i.cover_image_url)
      }));

    return [...bookProducts, ...itemProducts];
  }, [books, otherItems]);

  const [showOutOfStock, setShowOutOfStock] = useState(false);

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

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const search = normalizeText(customerSearch);
    return customers.filter(c => 
      normalizeText(c.nome).includes(search) ||
      normalizeText(c.cognome).includes(search) ||
      normalizeText(`${c.nome} ${c.cognome}`).includes(search)
    ).slice(0, 10);
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      // Filter out of stock unless explicitly showing them
      const hasStock = product.type === 'book' ? product.stock > 0 : (product.stock || 0) - (product.venduto || 0) > 0;
      if (!showOutOfStock && !hasStock) return false;

      const normalizedSearch = normalizeText(searchTerm);
      const matchSearch = searchTerm === '' || 
        normalizeText(product.name).includes(normalizedSearch) ||
        normalizeText(product.autore).includes(normalizedSearch) ||
        normalizeText(product.id_univoco).includes(normalizedSearch) ||
        normalizeText(product.editore).includes(normalizedSearch);

      const matchAutore = !filters.autore || normalizeText(product.autore).includes(normalizeText(filters.autore));
      const matchEditore = !filters.editore || normalizeText(product.editore).includes(normalizeText(filters.editore));
      const matchLingua = !filters.lingua || product.lingua === filters.lingua;
      const matchCondizione = !filters.condizione || product.condizione === filters.condizione;
      const matchCollocazione = !filters.collocazione || normalizeText(product.collocazione).includes(normalizeText(filters.collocazione));
      const matchTipo = !filters.tipo_oggetto || product.tipo_oggetto === filters.tipo_oggetto;
      
      const matchPrezzo = (!filters.minPrezzo || product.price >= parseFloat(filters.minPrezzo)) &&
                          (!filters.maxPrezzo || product.price <= parseFloat(filters.maxPrezzo));

      return matchSearch && matchAutore && matchEditore && matchLingua && matchCondizione && matchPrezzo && matchCollocazione && matchTipo;
    });
  }, [allProducts, searchTerm, filters, showOutOfStock]);

  const sortedProducts = useMemo(() => {
    const productsToSort = [...filteredProducts];
    const sortField = sortBy.startsWith('-') ? sortBy.substring(1) : sortBy;
    const isDescending = sortBy.startsWith('-');
    
    return productsToSort.sort((a, b) => {
      let aVal = sortField === 'name' ? a.name : a[sortField];
      let bVal = sortField === 'name' ? b.name : b[sortField];
      
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      
      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return isDescending ? -comparison : comparison;
      }
      
      return isDescending ? bVal - aVal : aVal - bVal;
    });
  }, [filteredProducts, sortBy]);

  const outOfStockCount = useMemo(() => {
    return allProducts.filter(p => {
      if (p.type === 'book') return p.stock === 0;
      return (p.stock || 0) - (p.venduto || 0) === 0;
    }).length;
  }, [allProducts]);

  // Save cart to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('cassaCart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.id === product.id && item.type === product.type);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id && item.type === product.type
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      const hasDiscount = product.condizione === 'Nuovo';
      setCart([...cart, { ...product, quantity, hasDiscount, discountApplied: hasDiscount }]);
    }
  };

  const addTwoEuroBook = () => {
    const twoEuroBook = {
      id: `2euro-${Date.now()}`,
      type: 'special',
      name: 'Libro a 2€',
      price: 2,
      quantity: 1,
      id_univoco: '2€'
    };
    addToCart(twoEuroBook);
  };

  const addManualBook = () => {
    if (!manualBookPrice || parseFloat(manualBookPrice) <= 0) return;
    const manualBook = {
      id: `manual-book-${Date.now()}`,
      type: 'manual',
      name: 'Libro non catalogato',
      price: parseFloat(manualBookPrice),
      quantity: 1,
      id_univoco: 'NC'
    };
    addToCart(manualBook);
    setManualBookPrice('');
    setShowManualBook(false);
  };

  const addManualOther = () => {
    if (!manualOtherName || !manualOtherPrice || parseFloat(manualOtherPrice) <= 0) return;
    const manualOther = {
      id: `manual-other-${Date.now()}`,
      type: 'manual',
      name: manualOtherName,
      price: parseFloat(manualOtherPrice),
      quantity: 1,
      id_univoco: 'ALT'
    };
    addToCart(manualOther);
    setManualOtherName('');
    setManualOtherPrice('');
    setShowManualOther(false);
  };

  const removeFromCart = (id, type) => {
    setCart(cart.filter(item => !(item.id === id && item.type === type)));
  };

  const updateCartQuantity = (id, type, change) => {
    setCart(cart.map(item => {
      if (item.id === id && item.type === type) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const toggleDiscount = (id, type) => {
    setCart(cart.map(item =>
      item.id === id && item.type === type
        ? { ...item, discountApplied: !item.discountApplied }
        : item
    ));
  };

  const calculateItemPrice = (item) => {
    const basePrice = item.price * item.quantity;
    if (item.hasDiscount && item.discountApplied) {
      return basePrice * 0.7; // 30% discount
    }
    return basePrice;
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + calculateItemPrice(item), 0);
    return Math.max(0, subtotal - (parseFloat(discount) || 0));
  };

  const calculateCommissions = (price, method) => {
    let C1 = 0;
    const T = price;

    if (T <= 500) {
      C1 = method === 'paypal' ? 0.105 * T : 0.085 * T;
    } else {
      C1 = method === 'paypal' 
        ? (0.105 * 500) + (0.035 * (T - 500))
        : (0.085 * 500) + (0.035 * (T - 500));
    }

    let C2 = 0;
    if (price <= 5) C2 = 0.25;
    else if (price <= 10) C2 = 0.50;
    else if (price <= 20) C2 = 1.00;
    else if (price <= 30) C2 = 1.50;
    else if (price <= 40) C2 = 2.00;
    else if (price <= 50) C2 = 2.50;
    else if (price <= 100) C2 = 4.00;
    else if (price <= 500) C2 = 10.00;
    else C2 = 25.00;

    const C_total = C1 + C2;
    const net = price - C_total;

    return {
      commission_percent: C1,
      commission_fixed: C2,
      commission_total: C_total,
      net_revenue: net
    };
  };

  const getUserMapping = () => {
    const user = base44.auth.me();
    if (user?.email === 'Dario Iubatti') return 'dario';
    if (user?.email === 'marco.bosio91') return 'marco';
    if (user?.email === 'morenada.81') return 'morena';
    return null;
  };

  const confirmSale = async () => {
    if (paymentMethod === 'online') {
      setShowOnlineOrderDialog(true);
      return;
    }
    await processSale();
  };

  const processSale = async (orderNumber = null) => {
    const today = new Date().toISOString().split('T')[0];
    const monthYear = today.substring(0, 7);
    const totalAmount = calculateTotal();
    
    const shouldUpdateAccounting = paymentMethod !== 'altro' && paymentMethod !== 'online';
    const shouldUpdateCatalogedBooks = paymentMethod === 'altro';

    // Update stock for catalog items and handle consignment
    for (const item of cart) {
      if (item.type === 'book') {
        const book = books.find(b => b.id === item.id);
        if (book) {
          await updateBookMutation.mutateAsync({
            id: item.id,
            data: { stock: book.stock - item.quantity }
          });
        }
      } else if (item.type === 'item') {
        const otherItem = otherItems.find(i => i.id === item.id);
        if (otherItem) {
          const newVenduto = (otherItem.venduto || 0) + item.quantity;
          const newStock = otherItem.stock - item.quantity;
          const newDaPagare = (otherItem.da_pagare || 0) + item.quantity;
          const newGiacenza = newStock - newVenduto;

          const updateData = {
            stock: newStock,
            venduto: newVenduto,
            giacenza: newGiacenza
          };

          if (otherItem.contovendita === 'SI') {
            updateData.da_pagare = newDaPagare;
          }

          await updateOtherItemMutation.mutateAsync({
            id: item.id,
            data: updateData
          });
        }
      }
    }

    // Create sale log
    await createSaleLogMutation.mutateAsync({
      date: today,
      items: cart.map(item => ({
        product_id: item.id_univoco,
        product_name: item.name,
        product_type: item.type,
        quantity: item.quantity,
        price: item.price,
        discount: 0,
        total: calculateItemPrice(item)
      })),
      total_amount: totalAmount
    });

    // Update cataloged books if payment method is "altro"
    if (shouldUpdateCatalogedBooks) {
      const totalAmountNumber = Number(totalAmount) || 0;
      const todayCatalog = catalogedBooks.find(c => c.date === today);

      if (todayCatalog) {
        const updatedData = {
          ...todayCatalog,
          total: (todayCatalog.total || 0) + totalAmountNumber
        };
        await updateCatalogedBooksMutation.mutateAsync({
          id: todayCatalog.id,
          data: updatedData
        });
      } else {
        const dayOfWeek = new Date(today).toLocaleDateString('it-IT', { weekday: 'long' });
        await createCatalogedBooksMutation.mutateAsync({
          date: today,
          day_of_week: dayOfWeek,
          month_year: monthYear,
          is_open: true,
          total: totalAmountNumber
        });
      }
    }

    // Update daily accounting only if not "altro" and not "online"
    if (shouldUpdateAccounting) {
      const todayAccounting = dailyAccounting.find(d => d.date === today);
      
      if (todayAccounting) {
        const updatedData = {
          ...todayAccounting,
          [paymentMethod]: (todayAccounting[paymentMethod] || 0) + totalAmount
        };
        await updateDailyAccountingMutation.mutateAsync({
          id: todayAccounting.id,
          data: updatedData
        });
      } else {
        await createDailyAccountingMutation.mutateAsync({
          date: today,
          month_year: monthYear,
          is_open: true,
          pos: paymentMethod === 'pos' ? totalAmount : 0,
          contanti: paymentMethod === 'contanti' ? totalAmount : 0
        });
      }
    }

    // Create online purchase if payment method is "online"
    if (paymentMethod === 'online' && orderNumber) {
      const totalWithCommissions = cart.reduce((sum, item) => {
        const itemPrice = calculateItemPrice(item);
        const commissions = calculateCommissions(itemPrice, onlinePaymentMethod);
        return sum + commissions.net_revenue;
      }, 0);

      await createOnlinePurchaseMutation.mutateAsync({
        month_year: monthYear,
        numero_ordine: orderNumber,
        libro: cart.map(item => item.name).join(', '),
        importo: totalWithCommissions
      });
    }

    setCart([]);
    setPaymentMethod('contanti');
    setDiscount(0);
    setOnlineOrderNumber('');
    setShowOnlineOrderDialog(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-10 h-10" style={{ color: '#45877F' }} />
            Cassa
          </h1>
          <p className="text-slate-500 mt-2">Gestione vendite in negozio</p>
        </div>
        <Card className="p-4 min-w-[200px]">
          <div className="text-sm text-slate-600 mb-1">Carrello</div>
          <div className="text-3xl font-bold" style={{ color: '#45877F' }}>
            €{calculateTotal().toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-1">{cart.length} articoli</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-3">
            {outOfStockCount > 0 && !showOutOfStock && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="text-amber-800">
                  <strong>Attenzione:</strong> {outOfStockCount} prodotti hanno stock = 0.{' '}
                  <button 
                    onClick={() => setShowOutOfStock(true)}
                    className="underline font-semibold hover:text-amber-900"
                  >
                    Clicca qui per visualizzarli
                  </button>
                </p>
              </div>
            )}
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Cerca prodotto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                {showFilters ? 'Nascondi' : 'Mostra'} Filtri
              </Button>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ordina per..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_date">Più recenti</SelectItem>
                  <SelectItem value="name">Nome A-Z</SelectItem>
                  <SelectItem value="-name">Nome Z-A</SelectItem>
                  <SelectItem value="price">Prezzo crescente</SelectItem>
                  <SelectItem value="-price">Prezzo decrescente</SelectItem>
                  <SelectItem value="autore">Autore A-Z</SelectItem>
                  <SelectItem value="-autore">Autore Z-A</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={addTwoEuroBook} style={{ backgroundColor: '#45877F' }} className="text-white ml-auto">
                <Plus className="w-4 h-4 mr-2" />
                Libro a 2€
              </Button>
              <Button onClick={() => {
                setManualOtherName('Altro');
                setManualOtherPrice('5');
                setShowManualOther(true);
              }} style={{ backgroundColor: '#45877F' }} className="text-white">
                <Plus className="w-4 h-4 mr-2" />
                Altro
              </Button>
            </div>

            {showFilters && (
              <Card className="p-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <Input placeholder="Autore" value={filters.autore} onChange={(e) => setFilters({...filters, autore: e.target.value})} />
                  <Input placeholder="Editore" value={filters.editore} onChange={(e) => setFilters({...filters, editore: e.target.value})} />
                  <Input placeholder="Collocazione" value={filters.collocazione} onChange={(e) => setFilters({...filters, collocazione: e.target.value})} />
                  <Select value={filters.lingua} onValueChange={(val) => setFilters({...filters, lingua: val})}>
                    <SelectTrigger><SelectValue placeholder="Lingua" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Tutte</SelectItem>
                      <SelectItem value="Italiano">Italiano</SelectItem>
                      <SelectItem value="Inglese">Inglese</SelectItem>
                      <SelectItem value="Francese">Francese</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.tipo_oggetto} onValueChange={(val) => setFilters({...filters, tipo_oggetto: val})}>
                    <SelectTrigger><SelectValue placeholder="Tipo Oggetto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Tutti</SelectItem>
                      <SelectItem value="Opere">Opere</SelectItem>
                      <SelectItem value="Vinili">Vinili</SelectItem>
                      <SelectItem value="Giochi">Giochi</SelectItem>
                      <SelectItem value="Oggetti">Oggetti</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setFilters({ autore: '', editore: '', lingua: '', condizione: '', minPrezzo: '', maxPrezzo: '', disponibilita: 'all', collocazione: '', tipo_oggetto: '' })}>
                    Azzera
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
            {sortedProducts.map(product => (
              <Card key={`${product.type}-${product.id}`} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => addToCart(product)}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-20 h-28 object-cover rounded" onError={(e) => e.target.style.display = 'none'} />
                    ) : (
                      <div className="w-20 h-28 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">No foto</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge style={{ backgroundColor: '#45877F' }} className="text-white text-xs">{product.id_univoco}</Badge>
                        {product.collocazione && <Badge variant="outline" className="text-xs">{product.collocazione}</Badge>}
                      </div>
                      <h3 className="font-semibold text-sm mb-1 line-clamp-2">{product.name}</h3>
                      {product.autore && <p className="text-xs text-slate-600 mb-1">{product.autore}</p>}
                      {product.editore && <p className="text-xs text-slate-500 mb-1">{product.editore}</p>}
                      {product.edizione && <p className="text-xs text-slate-500 italic mb-1">Ed: {product.edizione}</p>}
                      <p className="text-lg font-bold" style={{ color: '#45877F' }}>€{product.price.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Carrello
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-slate-500 text-center py-8">Carrello vuoto</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {cart.map(item => (
                      <div key={`${item.type}-${item.id}`} className="p-2 bg-slate-50 rounded space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold line-clamp-1">{item.name}</p>
                            <p className="text-xs text-slate-600">€{item.price.toFixed(2)} × {item.quantity}</p>
                            {item.hasDiscount && (
                              <div className="flex items-center gap-2 mt-1">
                                <input
                                  type="checkbox"
                                  checked={item.discountApplied}
                                  onChange={() => toggleDiscount(item.id, item.type)}
                                  className="w-3 h-3"
                                />
                                <span className="text-xs text-green-700 font-semibold">Sconto 30%</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => updateCartQuantity(item.id, item.type, -1)}>
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button size="icon" variant="ghost" onClick={() => updateCartQuantity(item.id, item.type, 1)}>
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeFromCart(item.id, item.type)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                        {item.hasDiscount && item.discountApplied && (
                          <div className="text-xs text-right text-green-700">
                            Totale scontato: €{calculateItemPrice(item).toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Sconto (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0.00"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Metodo di Pagamento</Label>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="contanti" id="contanti" />
                          <Label htmlFor="contanti" className="cursor-pointer flex items-center gap-2">
                            <Banknote className="w-4 h-4" />
                            Contanti
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pos" id="pos" />
                          <Label htmlFor="pos" className="cursor-pointer flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            POS
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="online" id="online" />
                          <Label htmlFor="online" className="cursor-pointer flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Online
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="altro" id="altro" />
                          <Label htmlFor="altro" className="cursor-pointer">
                            Altro (libri catalogati)
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="flex items-center justify-between text-xl font-bold pt-2">
                      <span>Totale:</span>
                      <span style={{ color: '#45877F' }}>€{calculateTotal().toFixed(2)}</span>
                    </div>

                    <div className="space-y-2">
                      <Button onClick={confirmSale} className="w-full" style={{ backgroundColor: '#45877F' }}>
                        Conferma Vendita
                      </Button>
                      <Button 
                        onClick={() => setShowReservationDialog(true)} 
                        className="w-full" 
                        variant="outline"
                        style={{ borderColor: '#45877F', color: '#45877F' }}
                      >
                        Prenota Articoli
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showManualBook} onOpenChange={setShowManualBook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Libro Non Catalogato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Prezzo (€)</Label>
              <Input type="number" step="0.01" value={manualBookPrice} onChange={(e) => setManualBookPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualBook(false)}>Annulla</Button>
            <Button onClick={addManualBook} style={{ backgroundColor: '#45877F' }}>Aggiungi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showManualOther} onOpenChange={setShowManualOther}>
        <DialogContent className="bg-white">
          <DialogHeader className="bg-white">
            <DialogTitle>Aggiungi Altro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 bg-white">
            <div>
              <Label>Nome Articolo</Label>
              <Input value={manualOtherName} onChange={(e) => setManualOtherName(e.target.value)} placeholder="Nome articolo" className="bg-white" />
            </div>
            <div>
              <Label>Prezzo (€)</Label>
              <Input type="number" step="0.01" value={manualOtherPrice} onChange={(e) => setManualOtherPrice(e.target.value)} placeholder="0.00" className="bg-white" />
            </div>
          </div>
          <DialogFooter className="bg-white">
            <Button variant="outline" onClick={() => setShowManualOther(false)}>Annulla</Button>
            <Button onClick={addManualOther} style={{ backgroundColor: '#45877F' }}>Aggiungi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOnlineOrderDialog} onOpenChange={setShowOnlineOrderDialog}>
        <DialogContent className="bg-white">
          <DialogHeader className="bg-white">
            <DialogTitle>Ordine Online</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 bg-white">
            <div>
              <Label>Numero Ordine</Label>
              <Input 
                value={onlineOrderNumber} 
                onChange={(e) => setOnlineOrderNumber(e.target.value)} 
                placeholder="Es. ORD-12345" 
                className="bg-white" 
              />
            </div>
            <div>
              <Label>Metodo Pagamento Online</Label>
              <RadioGroup value={onlinePaymentMethod} onValueChange={setOnlinePaymentMethod}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="cursor-pointer">PayPal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other-online" />
                  <Label htmlFor="other-online" className="cursor-pointer">Altro</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="text-sm text-slate-600">
              <p className="font-semibold mb-2">Riepilogo Commissioni:</p>
              {cart.map((item, idx) => {
                const itemPrice = calculateItemPrice(item);
                const commissions = calculateCommissions(itemPrice, onlinePaymentMethod);
                return (
                  <div key={idx} className="mb-2 p-2 bg-slate-50 rounded">
                    <p className="font-medium">{item.name}</p>
                    <p>Prezzo: €{itemPrice.toFixed(2)}</p>
                    <p>Commissioni: €{commissions.commission_total.toFixed(2)}</p>
                    <p className="font-bold" style={{ color: '#45877F' }}>
                      Netto: €{commissions.net_revenue.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="bg-white">
            <Button variant="outline" onClick={() => setShowOnlineOrderDialog(false)}>Annulla</Button>
            <Button 
              onClick={() => processSale(onlineOrderNumber)} 
              disabled={!onlineOrderNumber}
              style={{ backgroundColor: '#45877F' }}
            >
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReservationDialog} onOpenChange={setShowReservationDialog}>
        <DialogContent className="bg-white">
          <DialogHeader className="bg-white">
            <DialogTitle>Prenota Articoli</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 bg-white">
            <div>
              <Label>Cerca Cliente</Label>
              <Input 
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Cerca per nome o cognome..."
                className="bg-white mb-2"
              />
              {filteredCustomers.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto bg-white">
                  {filteredCustomers.map(customer => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-slate-100 cursor-pointer border-b last:border-0"
                      onClick={() => {
                        setReservationData({
                          ...reservationData,
                          customer_name: customer.nome,
                          customer_surname: customer.cognome,
                          customer_contact: customer.telefono || customer.email || ''
                        });
                        setCustomerSearch('');
                      }}
                    >
                      <p className="font-semibold">{customer.nome} {customer.cognome}</p>
                      {customer.telefono && <p className="text-xs text-slate-600">{customer.telefono}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome Cliente</Label>
                <Input 
                  value={reservationData.customer_name} 
                  onChange={(e) => setReservationData({...reservationData, customer_name: e.target.value})}
                  placeholder="Nome"
                  className="bg-white" 
                />
              </div>
              <div>
                <Label>Cognome Cliente</Label>
                <Input 
                  value={reservationData.customer_surname} 
                  onChange={(e) => setReservationData({...reservationData, customer_surname: e.target.value})}
                  placeholder="Cognome"
                  className="bg-white" 
                />
              </div>
            </div>
            <div>
              <Label>Contatto (Tel/Email)</Label>
              <Input 
                value={reservationData.customer_contact} 
                onChange={(e) => setReservationData({...reservationData, customer_contact: e.target.value})}
                placeholder="Telefono o email"
                className="bg-white" 
              />
            </div>
            <div>
              <Label>Acconto (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={reservationData.deposit} 
                onChange={(e) => setReservationData({...reservationData, deposit: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
                className="bg-white" 
              />
            </div>
            <div className="bg-slate-50 p-4 rounded">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Totale:</span>
                <span className="font-bold" style={{ color: '#45877F' }}>€{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Acconto:</span>
                <span>€{(reservationData.deposit || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Da pagare:</span>
                <span className="font-bold text-orange-600">
                  €{Math.max(0, calculateTotal() - (reservationData.deposit || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="bg-white">
            <Button variant="outline" onClick={() => setShowReservationDialog(false)}>Annulla</Button>
            <Button 
              onClick={async () => {
                if (!reservationData.customer_name || !reservationData.customer_surname || !reservationData.customer_contact) {
                  alert('Compila tutti i campi cliente');
                  return;
                }

                const totalAmount = calculateTotal();
                const today = new Date().toISOString().split('T')[0];

                // Update stock for all items
                for (const item of cart) {
                  if (item.type === 'book') {
                    const book = books.find(b => b.id === item.id);
                    if (book) {
                      await updateBookMutation.mutateAsync({
                        id: item.id,
                        data: { stock: book.stock - item.quantity }
                      });
                    }
                  } else if (item.type === 'item') {
                    const otherItem = otherItems.find(i => i.id === item.id);
                    if (otherItem) {
                      const newVenduto = (otherItem.venduto || 0) + item.quantity;
                      const newStock = otherItem.stock - item.quantity;
                      const newDaPagare = (otherItem.da_pagare || 0) + item.quantity;
                      const newGiacenza = newStock - newVenduto;

                      const updateData = {
                        stock: newStock,
                        venduto: newVenduto,
                        giacenza: newGiacenza
                      };

                      if (otherItem.contovendita === 'SI') {
                        updateData.da_pagare = newDaPagare;
                      }

                      await updateOtherItemMutation.mutateAsync({
                        id: item.id,
                        data: updateData
                      });
                    }
                  }
                }

                // Create reservation
                await createReservationMutation.mutateAsync({
                  ...reservationData,
                  items: cart.map(item => ({
                    product_id: item.id_univoco,
                    product_name: item.name,
                    product_type: item.type,
                    quantity: item.quantity,
                    price: item.price,
                    total: calculateItemPrice(item)
                  })),
                  total_amount: totalAmount,
                  remaining: totalAmount - (reservationData.deposit || 0),
                  reservation_date: today,
                  status: 'active'
                });

                // Also save in Desiderata
                await createDesiderataMutation.mutateAsync({
                  nome: reservationData.customer_name,
                  cognome: reservationData.customer_surname,
                  tel_cliente: reservationData.customer_contact,
                  mail_cliente: '',
                  prodotto: cart.map(item => `${item.name} (×${item.quantity})`).join(', '),
                  costo: 0,
                  prezzo_vendita: totalAmount,
                  acconto: reservationData.deposit || 0,
                  da_pagare: totalAmount - (reservationData.deposit || 0),
                  ricavo: totalAmount,
                  status: 'ordinato',
                  note: 'Prenotazione creata da Cassa'
                });
              }}
              disabled={!reservationData.customer_name || !reservationData.customer_surname || !reservationData.customer_contact}
              style={{ backgroundColor: '#45877F' }}
              className="text-white"
            >
              Conferma Prenotazione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      );
      }