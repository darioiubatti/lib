import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Package } from "lucide-react";

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

export default function RecentOrders({ orders }) {
  return (
    <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-200/60 pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-500" />
          Ordini Recenti
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Nessun ordine ancora
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/60">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{order.customer_name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {order.order_number} • {format(new Date(order.created_date), "d MMM yyyy", { locale: it })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-slate-900">€{order.total_amount?.toFixed(2)}</p>
                  <Badge className={`${statusColors[order.status]} border font-medium`}>
                    {statusTranslations[order.status] || order.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}