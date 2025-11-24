import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Plus, Save, X, Download, Upload, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Desiderata() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    tel_cliente: '',
    mail_cliente: '',
    prodotto: '',
    costo: 0,
    prezzo_vendita: 0,
    acconto: 0,
    status: 'da cercare',
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: desiderata = [] } = useQuery({
    queryKey: ['desiderata'],
    queryFn: () => base44.entities.Desiderata.list('-created_date'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: fidelityCards = [] } = useQuery({
    queryKey: ['fidelityCards'],
    queryFn: () => base44.entities.FidelityCard.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Desiderata.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['desiderata'] });
      setShowForm(false);
      setEditingItem(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Desiderata.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['desiderata'] });
      setShowForm(false);
      setEditingItem(null);
    },
  });

  useEffect(() => {
    const da_pagare = (formData.prezzo_vendita || 0) - (formData.acconto || 0);
    const ricavo = (formData.prezzo_vendita || 0) - (formData.costo || 0);
    setFormData(prev => ({ ...prev, da_pagare, ricavo }));
  }, [formData.prezzo_vendita, formData.acconto, formData.costo]);

  const autoFillCustomer = (nome, cognome) => {
    const fullName = `${nome} ${cognome}`.toLowerCase();
    
    const customer = customers.find(c => 
      `${c.nome} ${c.cognome}`.toLowerCase() === fullName
    );
    
    if (customer) {
      setFormData(prev => ({
        ...prev,
        tel_cliente: customer.telefono || prev.tel_cliente,
        mail_cliente: customer.email || prev.mail_cliente
      }));
      return;
    }

    const card = fidelityCards.find(fc => 
      `${fc.nome} ${fc.cognome}`.toLowerCase() === fullName
    );
    
    if (card) {
      setFormData(prev => ({
        ...prev,
        tel_cliente: card.telefono || prev.tel_cliente,
        mail_cliente: card.email || prev.mail_cliente
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome || '',
      cognome: item.cognome || '',
      tel_cliente: item.tel_cliente || '',
      mail_cliente: item.mail_cliente || '',
      prodotto: item.prodotto || '',
      costo: item.costo || 0,
      prezzo_vendita: item.prezzo_vendita || 0,
      acconto: item.acconto || 0,
      status: item.status || 'da cercare',
      note: item.note || ''
    });
    setShowForm(true);
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Cognome', 'Tel Cliente', 'Mail Cliente', 'Prodotto', 'Costo', 'Prezzo Vendita', 'Acconto', 'Da Pagare', 'Ricavo', 'Status', 'Note'];
    const rows = desiderata.map(d => [
      d.nome, d.cognome, d.tel_cliente, d.mail_cliente, d.prodotto,
      d.costo, d.prezzo_vendita, d.acconto, d.da_pagare, d.ricavo, d.status, d.note
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `desiderata_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || [];
        
        const itemData = {
          nome: values[0] || '',
          cognome: values[1] || '',
          tel_cliente: values[2] || '',
          mail_cliente: values[3] || '',
          prodotto: values[4] || '',
          costo: parseFloat(values[5]) || 0,
          prezzo_vendita: parseFloat(values[6]) || 0,
          acconto: parseFloat(values[7]) || 0,
          da_pagare: parseFloat(values[8]) || 0,
          ricavo: parseFloat(values[9]) || 0,
          status: values[10] || 'da cercare',
          note: values[11] || ''
        };

        try {
          await base44.entities.Desiderata.create(itemData);
        } catch (error) {
          console.error('Error importing item:', error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['desiderata'] });
      alert('Importazione completata!');
    };
    
    reader.readAsText(file);
    event.target.value = null;
  };

  const filteredDesiderata = desiderata.filter(d =>
    d.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.prodotto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.tel_cliente?.includes(searchTerm) ||
    d.mail_cliente?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    'da cercare': 'bg-yellow-100 text-yellow-800',
    'ordinato': 'bg-blue-100 text-blue-800',
    'rinuncia': 'bg-red-100 text-red-800',
    'completato': 'bg-green-100 text-green-800'
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
            <Heart className="w-10 h-10" style={{ color: '#45877F' }} />
            Desiderata/Prenotazioni
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Richieste e prenotazioni dei clienti</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-5 h-5 mr-2" />
            Esporta
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Importa
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                nome: '',
                cognome: '',
                tel_cliente: '',
                mail_cliente: '',
                prodotto: '',
                costo: 0,
                prezzo_vendita: 0,
                acconto: 0,
                status: 'da cercare',
                note: ''
              });
              setShowForm(true);
            }}
            style={{ backgroundColor: '#45877F' }}
            className="text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            Aggiungi
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6 border-2" style={{ borderColor: '#45877F' }}>
          <CardHeader>
            <CardTitle>{editingItem ? 'Modifica Richiesta' : 'Nuova Richiesta'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
                      if (formData.cognome) autoFillCustomer(e.target.value, formData.cognome);
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cognome">Cognome *</Label>
                  <Input
                    id="cognome"
                    value={formData.cognome}
                    onChange={(e) => {
                      setFormData({ ...formData, cognome: e.target.value });
                      if (formData.nome) autoFillCustomer(formData.nome, e.target.value);
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tel_cliente">Telefono</Label>
                  <Input
                    id="tel_cliente"
                    value={formData.tel_cliente}
                    onChange={(e) => setFormData({ ...formData, tel_cliente: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mail_cliente">Email</Label>
                  <Input
                    id="mail_cliente"
                    type="email"
                    value={formData.mail_cliente}
                    onChange={(e) => setFormData({ ...formData, mail_cliente: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prodotto">Prodotto *</Label>
                <Textarea
                  id="prodotto"
                  value={formData.prodotto}
                  onChange={(e) => setFormData({ ...formData, prodotto: e.target.value })}
                  rows={2}
                  required
                />
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costo">Costo (€)</Label>
                  <Input
                    id="costo"
                    type="number"
                    step="0.01"
                    value={formData.costo}
                    onChange={(e) => setFormData({ ...formData, costo: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prezzo_vendita">Prezzo Vendita (€)</Label>
                  <Input
                    id="prezzo_vendita"
                    type="number"
                    step="0.01"
                    value={formData.prezzo_vendita}
                    onChange={(e) => setFormData({ ...formData, prezzo_vendita: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acconto">Acconto (€)</Label>
                  <Input
                    id="acconto"
                    type="number"
                    step="0.01"
                    value={formData.acconto}
                    onChange={(e) => setFormData({ ...formData, acconto: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="da cercare">Da cercare</SelectItem>
                      <SelectItem value="ordinato">Ordinato</SelectItem>
                      <SelectItem value="rinuncia">Rinuncia</SelectItem>
                      <SelectItem value="completato">Completato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Da Pagare</p>
                  <p className="text-2xl font-bold text-black">€{formData.da_pagare?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ricavo</p>
                  <p className="text-2xl font-bold" style={{ color: '#45877F' }}>€{formData.ricavo?.toFixed(2) || '0.00'}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Annulla
                </Button>
                <Button type="submit" style={{ backgroundColor: '#45877F' }} className="text-white">
                  <Save className="w-4 h-4 mr-2" />
                  Salva
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Cerca desiderata..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12"
        />
      </div>

      <div className="space-y-3">
        {filteredDesiderata.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 text-lg">Nessuna richiesta ancora</p>
            </CardContent>
          </Card>
        ) : (
          filteredDesiderata.map((item) => (
            <Card key={item.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[item.status]}>
                        {item.status}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold text-black mb-1">
                      {item.nome} {item.cognome}
                    </h3>
                    {item.tel_cliente && <p className="text-sm text-slate-600">📞 {item.tel_cliente}</p>}
                    {item.mail_cliente && <p className="text-sm text-slate-600">✉️ {item.mail_cliente}</p>}
                    <p className="text-slate-700 mt-3 font-semibold">{item.prodotto}</p>
                    
                    {item.note && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Note:</p>
                        <p className="text-sm text-slate-700">{item.note}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-slate-500">Costo</p>
                        <p className="font-bold">€{item.costo?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Prezzo</p>
                        <p className="font-bold">€{item.prezzo_vendita?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Acconto</p>
                        <p className="font-bold">€{item.acconto?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Da Pagare</p>
                        <p className="font-bold text-red-600">€{item.da_pagare?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Ricavo</p>
                        <p className="font-bold" style={{ color: '#45877F' }}>€{item.ricavo?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                    Modifica
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}