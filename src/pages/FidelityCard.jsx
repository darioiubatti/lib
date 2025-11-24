import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Award, Plus, Save, X, CheckCircle, Circle, Download, Upload, Search } from "lucide-react";

export default function FidelityCard() {
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    numero_tessera: 0,
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    accenti: Array(10).fill(false),
    libri_donati: 0
  });

  const queryClient = useQueryClient();

  const { data: cards = [] } = useQuery({
    queryKey: ['fidelityCards'],
    queryFn: () => base44.entities.FidelityCard.list('numero_tessera'),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: desiderata = [] } = useQuery({
    queryKey: ['desiderata'],
    queryFn: () => base44.entities.Desiderata.list(),
  });

  useEffect(() => {
    if (!editingCard && showForm) {
      const nextNumber = cards.length > 0 ? Math.max(...cards.map(c => c.numero_tessera)) + 1 : 1;
      setFormData(prev => ({ ...prev, numero_tessera: nextNumber }));
    }
  }, [cards, editingCard, showForm]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FidelityCard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fidelityCards'] });
      setShowForm(false);
      setEditingCard(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FidelityCard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fidelityCards'] });
      setShowForm(false);
      setEditingCard(null);
    },
  });

  const autoFillCustomer = (nome, cognome) => {
    const fullName = `${nome} ${cognome}`.toLowerCase();
    
    const customer = customers.find(c => 
      `${c.nome} ${c.cognome}`.toLowerCase() === fullName
    );
    
    if (customer) {
      setFormData(prev => ({
        ...prev,
        telefono: customer.telefono || prev.telefono,
        email: customer.email || prev.email
      }));
      return;
    }

    const desideratum = desiderata.find(d => 
      `${d.nome} ${d.cognome}`.toLowerCase() === fullName
    );
    
    if (desideratum) {
      setFormData(prev => ({
        ...prev,
        telefono: desideratum.tel_cliente || prev.telefono,
        email: desideratum.mail_cliente || prev.email
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCard) {
      updateMutation.mutate({ id: editingCard.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setFormData({
      numero_tessera: card.numero_tessera,
      nome: card.nome,
      cognome: card.cognome,
      telefono: card.telefono || '',
      email: card.email || '',
      accenti: card.accenti || Array(10).fill(false),
      libri_donati: card.libri_donati || 0
    });
    setShowForm(true);
  };

  const toggleAccent = (index) => {
    const newAccenti = [...formData.accenti];
    newAccenti[index] = !newAccenti[index];
    setFormData({ ...formData, accenti: newAccenti });
  };

  const exportToCSV = () => {
    const headers = [
      'Numero Tessera', 'Nome', 'Cognome', 'Telefono', 'Email', 
      'Accento 1', 'Accento 2', 'Accento 3', 'Accento 4', 'Accento 5',
      'Accento 6', 'Accento 7', 'Accento 8', 'Accento 9', 'Accento 10',
      'Libri Donati'
    ];

    const rows = cards.map(card => [
      card.numero_tessera,
      card.nome,
      card.cognome,
      card.telefono || '',
      card.email || '',
      ...(card.accenti || Array(10).fill(false)).map(a => a ? 'SI' : 'NO'),
      card.libri_donati || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fidelity_cards_${new Date().toISOString().split('T')[0]}.csv`;
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
        
        const cardData = {
          numero_tessera: parseInt(values[0]) || 0,
          nome: values[1] || '',
          cognome: values[2] || '',
          telefono: values[3] || '',
          email: values[4] || '',
          accenti: values.slice(5, 15).map(v => v?.toUpperCase() === 'SI'),
          libri_donati: parseInt(values[15]) || 0
        };

        try {
          await base44.entities.FidelityCard.create(cardData);
        } catch (error) {
          console.error('Error importing card:', error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['fidelityCards'] });
      alert('Importazione completata!');
    };
    
    reader.readAsText(file);
    event.target.value = null;
  };

  const filteredCards = cards.filter(card =>
    card.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.telefono?.includes(searchTerm) ||
    card.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.numero_tessera?.toString().includes(searchTerm)
  );

  const completedAccents = (card) => (card.accenti || []).filter(a => a).length;
  const isCardComplete = (card) => completedAccents(card) >= 10;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
            <Award className="w-10 h-10" style={{ color: '#45877F' }} />
            Fidelity Card
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Gestisci le tessere fedeltà dei clienti</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-5 h-5 mr-2" />
            Esporta CSV
          </Button>
          <Button variant="outline" asChild>
            <label className="cursor-pointer flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Importa CSV
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
          </Button>
          <Button
            onClick={() => {
              setEditingCard(null);
              const nextNumber = cards.length > 0 ? Math.max(...cards.map(c => c.numero_tessera)) + 1 : 1;
              setFormData({
                numero_tessera: nextNumber,
                nome: '',
                cognome: '',
                telefono: '',
                email: '',
                accenti: Array(10).fill(false),
                libri_donati: 0
              });
              setShowForm(true);
            }}
            style={{ backgroundColor: '#45877F' }}
            className="text-white hover:opacity-90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuova Tessera
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6 border-2" style={{ borderColor: '#45877F' }}>
          <CardHeader className="border-b" style={{ borderColor: '#45877F20' }}>
            <div className="flex items-center justify-between">
              <CardTitle>{editingCard ? 'Modifica Tessera' : 'Nuova Tessera'}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Numero Tessera:</span>
                <Badge className="text-xl font-bold font-mono px-3 py-1" style={{ backgroundColor: '#45877F', color: 'white' }}>
                  #{formData.numero_tessera}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
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
                  <Label htmlFor="telefono">Telefono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="libri_donati">Libri Donati</Label>
                  <Input
                    id="libri_donati"
                    type="number"
                    value={formData.libri_donati}
                    onChange={(e) => setFormData({ ...formData, libri_donati: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label style={{ fontFamily: 'Montserrat', fontWeight: 600 }}>Accenti (10 caselle)</Label>
                <div className="flex gap-2 flex-wrap">
                  {formData.accenti.map((accent, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleAccent(idx)}
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all ${
                        accent
                          ? 'bg-black'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                      style={accent ? { borderColor: '#45877F' } : { borderColor: '#cbd5e1' }}
                    >
                      {accent ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
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
          placeholder="Cerca per nome, cognome, numero tessera..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCards.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 text-lg">Nessuna tessera trovata</p>
            </CardContent>
          </Card>
        ) : (
          filteredCards.map((card) => (
            <Card
              key={card.id}
              className={`hover:shadow-lg transition-shadow ${
                isCardComplete(card) ? 'border-2 border-green-600' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Badge className="mb-2 font-mono text-lg" style={{ backgroundColor: '#45877F' }}>
                      #{card.numero_tessera}
                    </Badge>
                    {isCardComplete(card) && (
                      <Badge className="ml-2 bg-green-600 text-white">Completata!</Badge>
                    )}
                    <h3 className="text-xl font-bold text-black">
                      {card.nome} {card.cognome}
                    </h3>
                    {card.telefono && <p className="text-sm text-slate-600">{card.telefono}</p>}
                    {card.email && <p className="text-sm text-slate-500">{card.email}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(card)}>
                    Modifica
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-1">
                    {(card.accenti || Array(10).fill(false)).map((accent, idx) => (
                      <div
                        key={idx}
                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center ${
                          accent ? 'bg-green-600 border-green-600' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        {accent && <CheckCircle className="w-5 h-5 text-white" />}
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-sm text-slate-500">Libri donati</p>
                    <p className="text-2xl font-bold text-black">{card.libri_donati || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}