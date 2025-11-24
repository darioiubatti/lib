import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Wallet, AlertCircle } from "lucide-react";

export default function Suppliers() {
  const queryClient = useQueryClient();

  const { data: otherItems = [] } = useQuery({
    queryKey: ['otherItems'],
    queryFn: () => base44.entities.OtherItem.list(),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OtherItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherItems'] });
    },
  });

  const handlePayItem = async (item) => {
    const newDaPagare = Math.max(0, (item.da_pagare || 0) - 1);
    
    const updatedData = {
      ...item,
      da_pagare: newDaPagare,
      fornitore_pagato: newDaPagare === 0 ? 'SI' : 'NO',
      giacenza: item.stock - item.venduto,
      ricavo_libreria: item.prezzo_pubblico - item.costo,
      ricavo_fornitore: item.costo * item.venduto,
      da_pagare_art: item.costo * newDaPagare
    };
    
    await updateItemMutation.mutateAsync({ id: item.id, data: updatedData });
  };

  const suppliersData = otherItems
    .filter(item => item.contovendita === 'SI' && item.fornitore_pagato !== 'SI' && item.da_pagare > 0)
    .reduce((acc, item) => {
      const key = item.proprietario || 'Sconosciuto';
      if (!acc[key]) {
        acc[key] = {
          nome: item.proprietario || 'Sconosciuto',
          telefono: item.tel_proprietario || '',
          email: item.mail_proprietario || '',
          items: [],
          totalToPay: 0
        };
      }
      
      const amountToPay = (item.da_pagare_art || 0);
      acc[key].items.push({
        ...item,
        amountToPay
      });
      acc[key].totalToPay += amountToPay;
      
      return acc;
    }, {});

  const suppliers = Object.values(suppliersData);
  const totalOverall = suppliers.reduce((sum, s) => sum + s.totalToPay, 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
          <Wallet className="w-10 h-10" style={{ color: '#45877F' }} />
          Fornitori da Pagare
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Riepilogo pagamenti conto vendita</p>
      </div>

      {suppliers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-slate-500 text-lg">Nessun fornitore da pagare</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6 bg-amber-50 border-amber-200 border-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                  <div>
                    <p className="font-bold text-lg text-amber-900">
                      Totale da Pagare: €{totalOverall.toFixed(2)}
                    </p>
                    <p className="text-sm text-amber-700">
                      {suppliers.length} fornitore/i in attesa di pagamento
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {suppliers.map((supplier, idx) => (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{supplier.nome}</CardTitle>
                      {supplier.telefono && (
                        <p className="text-sm text-slate-500 mt-1">📞 {supplier.telefono}</p>
                      )}
                      {supplier.email && (
                        <p className="text-sm text-slate-500">✉️ {supplier.email}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-1">Totale da Pagare</p>
                      <p className="text-3xl font-bold text-red-600">
                        €{supplier.totalToPay.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {supplier.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={false}
                            onCheckedChange={() => handlePayItem(item)}
                            className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge style={{ backgroundColor: '#45877F' }} className="text-white font-mono">
                                {item.id_univoco}
                              </Badge>
                              <Badge className="bg-blue-600 text-white">Conto Vendita</Badge>
                            </div>
                            <p className="font-semibold text-black">{item.oggetto}</p>
                            <div className="flex gap-4 text-sm text-slate-600 mt-1">
                              <span>Venduto: {item.venduto || 0}</span>
                              <span>Da Pagare: {item.da_pagare || 0} pz</span>
                              <span>Costo: €{(item.costo || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500 mb-1">Importo</p>
                          <p className="text-2xl font-bold text-red-600">
                            €{item.amountToPay.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}