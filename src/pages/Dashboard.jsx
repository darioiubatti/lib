import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight, BookOpen, Package, Calendar, Heart, BookmarkCheck, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { it } from "date-fns/locale";

export default function Dashboard() {
  const queryClient = useQueryClient();

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: items = [] } = useQuery({
    queryKey: ['otherItems'],
    queryFn: () => base44.entities.OtherItem.list(),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const { data: desiderata = [] } = useQuery({
    queryKey: ['desiderata'],
    queryFn: () => base44.entities.Desiderata.list(),
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const allReservations = await base44.entities.Reservation.list('-created_date');
      return allReservations.filter(r => r.status === 'active');
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async (reservation) => {
      // Restore stock for all items
      for (const item of reservation.items) {
        if (item.product_type === 'book') {
          const book = books.find(b => b.id_univoco === item.product_id);
          if (book) {
            await base44.entities.Book.update(book.id, {
              ...book,
              stock: book.stock + item.quantity
            });
          }
        } else if (item.product_type === 'item') {
          const otherItem = items.find(i => i.id_univoco === item.product_id);
          if (otherItem) {
            const newVenduto = Math.max(0, (otherItem.venduto || 0) - item.quantity);
            const newStock = otherItem.stock + item.quantity;
            const newDaPagare = Math.max(0, (otherItem.da_pagare || 0) - item.quantity);
            const newGiacenza = newStock - newVenduto;
            
            const updateData = {
              ...otherItem,
              stock: newStock,
              venduto: newVenduto,
              giacenza: newGiacenza
            };
            
            if (otherItem.contovendita === 'SI') {
              updateData.da_pagare = newDaPagare;
            }
            
            await base44.entities.OtherItem.update(otherItem.id, updateData);
          }
        }
      }
      
      await base44.entities.Reservation.delete(reservation.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['otherItems'] });
    },
  });

  const deleteIncompletesMutation = useMutation({
    mutationFn: async () => {
      for (const book of incompleteBooks) {
        await base44.entities.Book.delete(book.id);
      }
      for (const item of incompleteItems) {
        await base44.entities.OtherItem.delete(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['otherItems'] });
      alert('Schede incomplete eliminate con successo!');
    },
  });

  const totalBooks = books.length;
  const availableBooks = books.filter(b => b.stock > 0).length;
  const totalItems = items.length;
  const availableItems = items.filter(i => (i.stock || 0) > 0).length;

  const incompleteBooks = books.filter(b => b.is_incomplete === true);
  const incompleteItems = items.filter(i => i.is_incomplete === true);
  const totalIncomplete = incompleteBooks.length + incompleteItems.length;

  const supplierPayments = items
    .filter(i => i.contovendita === 'SI' && i.fornitore_pagato === 'NO' && i.da_pagare > 0)
    .reduce((acc, item) => {
      const supplier = item.proprietario || 'Non specificato';
      if (!acc[supplier]) {
        acc[supplier] = { name: supplier, total: 0 };
      }
      acc[supplier].total += item.da_pagare_art || 0;
      return acc;
    }, {});

  const suppliersList = Object.values(supplierPayments);
  const totalSupplierPayments = suppliersList.reduce((sum, s) => sum + s.total, 0);

  // Turni della settimana corrente
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekShifts = daysInWeek.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const shift = shifts.find(s => s.date === dateStr);
    return {
      date: day,
      shift: shift
    };
  });

  // Desiderata in attesa
  const pendingDesiderata = desiderata.filter(d => d.status === 'da cercare' || d.status === 'ordinato');

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black tracking-tight">Benvenuto in Liberìa</h1>
        <p className="text-slate-500 mt-2 text-lg">Il tuo sistema di gestione completo</p>
      </div>

      <div className="space-y-6">
        {totalIncomplete > 0 && (
          <Card className="border-2 border-red-400">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-black mb-2">Schede Incomplete</h3>
                  <p className="text-slate-600 mb-4">
                    Ci {totalIncomplete === 1 ? 'è' : 'sono'} <strong>{totalIncomplete}</strong> {totalIncomplete === 1 ? 'scheda incompleta' : 'schede incomplete'} da completare
                  </p>

                  {incompleteBooks.length > 0 && (
                    <div className="mb-4">
                      <p className="font-semibold text-sm mb-2">Libri:</p>
                      <div className="space-y-2">
                        {incompleteBooks.map(book => (
                          <div key={book.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                            <div>
                              <span className="font-mono font-semibold text-sm mr-2">{book.id_univoco}</span>
                              <span className="text-sm">{book.titolo_composto || 'Senza titolo'}</span>
                            </div>
                            <Link to={createPageUrl('Inventory')}>
                              <Button size="sm" variant="outline" className="text-xs">
                                Completa
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {incompleteItems.length > 0 && (
                    <div className="mb-4">
                      <p className="font-semibold text-sm mb-2">Oggetti:</p>
                      <div className="space-y-2">
                        {incompleteItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                            <div>
                              <span className="font-mono font-semibold text-sm mr-2">{item.id_univoco}</span>
                              <span className="text-sm">{item.oggetto || 'Senza nome'}</span>
                            </div>
                            <Link to={createPageUrl('Inventory')}>
                              <Button size="sm" variant="outline" className="text-xs">
                                Completa
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm(`Sei sicuro di voler eliminare tutte le ${totalIncomplete} schede incomplete?\n\nQuesta azione è irreversibile!`)) {
                          deleteIncompletesMutation.mutate();
                        }
                      }}
                      disabled={deleteIncompletesMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleteIncompletesMutation.isPending ? 'Eliminazione...' : 'Elimina Tutte'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {suppliersList.length > 0 && (
          <Card className="border-2 border-amber-400">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-black mb-2">Fornitori da Pagare</h3>
                    <p className="text-slate-600 mb-4">
                      Ci sono <strong>{suppliersList.length}</strong> fornitori da pagare per un totale di <strong className="text-amber-600">€{totalSupplierPayments.toFixed(2)}</strong>
                    </p>
                    <Link to={createPageUrl('Suppliers')}>
                      <Button style={{ backgroundColor: '#45877F' }} className="text-white">
                        Vai ai Fornitori
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" style={{ color: '#45877F' }} />
                Libri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Totale a Catalogo</p>
                  <p className="text-3xl font-bold">{totalBooks}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Disponibili</p>
                  <p className="text-3xl font-bold" style={{ color: '#45877F' }}>{availableBooks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" style={{ color: '#45877F' }} />
                Altri Oggetti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Totale a Catalogo</p>
                  <p className="text-3xl font-bold">{totalItems}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Disponibili</p>
                  <p className="text-3xl font-bold" style={{ color: '#45877F' }}>{availableItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {weekShifts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: '#45877F' }} />
                Turni della Settimana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weekShifts.map(({ date, shift }) => (
                  <div key={date.toString()} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-semibold">{format(date, 'EEEE d MMMM', { locale: it })}</p>
                      {shift ? (
                        <div className="text-sm text-slate-600 mt-1">
                          {shift.morning_shift && (
                            <span>Mattina: <strong>{shift.morning_shift}</strong></span>
                          )}
                          {shift.afternoon_shift && (
                            <span className="ml-3">Pomeriggio: <strong>{shift.afternoon_shift}</strong></span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">Nessun turno programmato</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {pendingDesiderata.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" style={{ color: '#45877F' }} />
                Promemoria Desiderata/Prenotazioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingDesiderata.slice(0, 5).map(d => (
                  <div key={d.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-black">{d.nome} {d.cognome}</p>
                      <p className="text-sm text-slate-600">{d.prodotto}</p>
                    </div>
                    <Badge className={d.status === 'da cercare' ? 'bg-yellow-600' : 'bg-blue-600'}>
                      {d.status}
                    </Badge>
                  </div>
                ))}
                {pendingDesiderata.length > 5 && (
                  <Link to={createPageUrl('Desiderata')}>
                    <Button variant="outline" className="w-full mt-2">
                      Vedi tutte ({pendingDesiderata.length})
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {reservations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5" style={{ color: '#45877F' }} />
                Prenotazioni Attive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reservations.map(reservation => (
                  <Card key={reservation.id} className="border-2" style={{ borderColor: '#45877F' }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-black">
                            {reservation.customer_name} {reservation.customer_surname}
                          </p>
                          <p className="text-sm text-slate-600">{reservation.customer_contact}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(reservation.reservation_date), 'd MMM yyyy', { locale: it })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Eliminare questa prenotazione? Lo stock verrà ripristinato.')) {
                              deleteReservationMutation.mutate(reservation);
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="text-sm space-y-1 mb-2">
                        {reservation.items.map((item, idx) => (
                          <div key={idx} className="text-slate-700">
                            • {item.product_name} (×{item.quantity})
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                       <div className="text-sm">
                         <span className="text-slate-600">Totale: </span>
                         <span className="font-bold">€{reservation.total_amount.toFixed(2)}</span>
                       </div>
                       <div className="text-sm">
                         <span className="text-slate-600">Acconto: </span>
                         <span className="font-semibold text-green-600">€{reservation.deposit.toFixed(2)}</span>
                       </div>
                       <div className="text-sm">
                         <span className="text-slate-600">Da pagare: </span>
                         <span className="font-bold text-orange-600">€{reservation.remaining.toFixed(2)}</span>
                       </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                       <Link to={createPageUrl('Cassa') + `?reservation=${reservation.id}`}>
                         <Button className="w-full" style={{ backgroundColor: '#45877F' }}>
                           <ShoppingBag className="w-4 h-4 mr-2" />
                           Vai in Cassa
                         </Button>
                       </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}