import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200"
};

const statusTranslations = {
  pending: "in attesa",
  processing: "in elaborazione",
  shipped: "spedito",
  delivered: "consegnato",
  cancelled: "annullato"
};

export default function Orders() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const queryClient = useQueryClient();

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Order.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Ordini</h1>
          <p className="text-slate-500 mt-2 text-lg">Traccia e gestisci gli ordini dei clienti</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {orders.length === 0 ? (
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-12 text-center">
                <p className="text-slate-500 text-lg">Nessun ordine ancora</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card 
                key={order.id}
                className="border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{order.customer_name}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {order.order_number} • {format(new Date(order.created_date), "d MMM yyyy 'alle' HH:mm", { locale: it })}
                      </p>
                    </div>
                    <Badge className={`${statusColors[order.status]} border font-medium`}>
                      {statusTranslations[order.status] || order.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {order.customer_email}
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {order.customer_phone}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <span className="text-sm text-slate-500">
                      {order.items?.length || 0} articoli
                    </span>
                    <span className="text-2xl font-bold text-slate-900">
                      €{order.total_amount?.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {selectedOrder && (
          <div className="lg:col-span-1">
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-6">
              <CardHeader className="border-b border-slate-200/60">
                <h2 className="text-xl font-bold text-slate-900">Dettagli Ordine</h2>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Info Cliente</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-slate-600">{selectedOrder.customer_name}</p>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4" />
                      {selectedOrder.customer_email}
                    </div>
                    {selectedOrder.customer_phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4" />
                        {selectedOrder.customer_phone}
                      </div>
                    )}
                  </div>
                </div>

                {selectedOrder.shipping_address && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Indirizzo di Spedizione</h3>
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <p>{selectedOrder.shipping_address}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Articoli</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{item.book_title}</p>
                          <p className="text-slate-500">Qtà: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-slate-900">€{item.subtotal?.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Totale</span>
                    <span className="text-2xl font-bold text-slate-900">
                      €{selectedOrder.total_amount?.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Aggiorna Stato</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['pending', 'processing', 'shipped', 'delivered'].map((status) => (
                      <Button
                        key={status}
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ id: selectedOrder.id, status })}
                        className={selectedOrder.status === status ? 'border-slate-900 bg-slate-900 text-white' : ''}
                      >
                        {statusTranslations[status]}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}