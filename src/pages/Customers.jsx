import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Plus, Save, X, Download, Mail, MessageCircle, Search, Trash2 } from "lucide-react";

const capitalizeWords = (str) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export default function Customers() {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    note: ''
  });

  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('-created_date'),
  });

  const { data: desiderata = [] } = useQuery({
    queryKey: ['desiderata'],
    queryFn: () => base44.entities.Desiderata.list(),
  });

  const { data: fidelityCards = [] } = useQuery({
    queryKey: ['fidelityCards'],
    queryFn: () => base44.entities.FidelityCard.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const uniqueCustomers = useMemo(() => {
    const seen = new Map();
    return customers.map(c => ({
      ...c,
      nome: capitalizeWords(c.nome),
      cognome: capitalizeWords(c.cognome),
      telefono: c.telefono?.toLowerCase() === 'unknown' ? '-' : c.telefono,
      email: c.email?.toLowerCase() === 'unknown' ? '-' : c.email,
      note: c.note?.toLowerCase() === 'unknown' ? '-' : c.note
    })).filter(c => {
      const key = `${c.nome?.toLowerCase()}_${c.cognome?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.set(key, true);
      return true;
    });
  }, [customers]);

  const findContactDuplicates = () => {
    const phoneMap = new Map();
    const emailMap = new Map();
    const duplicateGroups = [];

    customers.forEach(customer => {
      if (customer.telefono && customer.telefono.toLowerCase() !== 'unknown') {
        const phone = customer.telefono.trim();
        if (!phoneMap.has(phone)) {
          phoneMap.set(phone, []);
        }
        phoneMap.get(phone).push(customer);
      }

      if (customer.email && customer.email.toLowerCase() !== 'unknown') {
        const email = customer.email.toLowerCase().trim();
        if (!emailMap.has(email)) {
          emailMap.set(email, []);
        }
        emailMap.get(email).push(customer);
      }
    });

    phoneMap.forEach((group, phone) => {
      if (group.length > 1) {
        duplicateGroups.push({ type: 'telefono', value: phone, customers: group });
      }
    });

    emailMap.forEach((group, email) => {
      if (group.length > 1) {
        duplicateGroups.push({ type: 'email', value: email, customers: group });
      }
    });

    return duplicateGroups;
  };

  const removeDuplicates = async () => {
    const duplicateGroups = findContactDuplicates();
    
    if (duplicateGroups.length === 0) {
      alert('Nessun duplicato trovato (stesso telefono o email)');
      return;
    }

    let message = `Trovati ${duplicateGroups.length} gruppi di duplicati:\n\n`;
    duplicateGroups.forEach((group, idx) => {
      message += `${idx + 1}. ${group.type === 'telefono' ? 'Tel' : 'Email'}: ${group.value}\n`;
      group.customers.forEach(c => {
        message += `   - ${c.nome} ${c.cognome}\n`;
      });
      message += '\n';
    });
    message += 'Vuoi unire i clienti duplicati? Il primo di ogni gruppo verrà mantenuto, gli altri eliminati.';

    if (!confirm(message)) return;

    let totalDeleted = 0;
    for (const group of duplicateGroups) {
      for (let i = 1; i < group.customers.length; i++) {
        try {
          await deleteMutation.mutateAsync(group.customers[i].id);
          totalDeleted++;
        } catch (error) {
          console.log(`Cliente ${group.customers[i].id} già eliminato o non trovato`);
        }
      }
    }

    alert(`Unificati ${totalDeleted} clienti duplicati!`);
  };

  const syncCustomersFromSources = async () => {
    setIsSyncing(true);
    try {
      const existingCustomers = customers.map(c => `${c.nome} ${c.cognome}`.toLowerCase());
      
      for (const item of desiderata) {
        const fullName = `${item.nome} ${item.cognome}`.toLowerCase();
        if (!existingCustomers.includes(fullName)) {
          const hasInFidelity = fidelityCards.some(fc => 
            `${fc.nome} ${fc.cognome}`.toLowerCase() === fullName
          );
          
          await base44.entities.Customer.create({
            nome: capitalizeWords(item.nome) || '',
            cognome: capitalizeWords(item.cognome) || '',
            telefono: item.tel_cliente || '',
            email: item.mail_cliente || '',
            note: hasInFidelity ? '' : 'Da desiderata'
          });
        }
      }

      for (const card of fidelityCards) {
        const fullName = `${card.nome} ${card.cognome}`.toLowerCase();
        if (!existingCustomers.includes(fullName)) {
          const hasInDesiderata = desiderata.some(d => 
            `${d.nome} ${d.cognome}`.toLowerCase() === fullName
          );
          
          await base44.entities.Customer.create({
            nome: capitalizeWords(card.nome),
            cognome: capitalizeWords(card.cognome),
            telefono: card.telefono || '',
            email: card.email || '',
            note: hasInDesiderata ? '' : 'Da fidelity card'
          });
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      alert('Clienti sincronizzati con successo!');
    } catch (error) {
      console.error('Errore sincronizzazione:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const lastSync = localStorage.getItem('customers_last_sync');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastSync !== today && customers.length > 0 && (desiderata.length > 0 || fidelityCards.length > 0)) {
      syncCustomersFromSources();
      localStorage.setItem('customers_last_sync', today);
    } else if (customers.length === 0 && (desiderata.length > 0 || fidelityCards.length > 0)) {
      syncCustomersFromSources();
      localStorage.setItem('customers_last_sync', today);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSave = {
      ...formData,
      nome: capitalizeWords(formData.nome),
      cognome: capitalizeWords(formData.cognome)
    };
    
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      nome: customer.nome,
      cognome: customer.cognome,
      telefono: customer.telefono || '',
      email: customer.email || '',
      note: customer.note || ''
    });
    setShowForm(true);
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Cognome', 'Telefono', 'Email', 'Note'];
    const rows = uniqueCustomers.map(c => [c.nome, c.cognome, c.telefono, c.email, c.note]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clienti_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportForMailchimp = () => {
    const csvContent = [
      'Email Address,First Name,Last Name,Phone Number',
      ...uniqueCustomers.filter(c => c.email).map(c => 
        `${c.email},"${c.nome}","${c.cognome}","${c.telefono || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mailchimp_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const openWhatsAppList = () => {
    const phones = uniqueCustomers.filter(c => c.telefono).map(c => c.telefono).join(', ');
    alert(`Numeri WhatsApp:\n${phones}`);
  };

  const filteredCustomers = uniqueCustomers.filter(c =>
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.cognome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono?.includes(searchTerm)
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
            <Users className="w-10 h-10" style={{ color: '#45877F' }} />
            Clienti
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Gestisci i contatti dei clienti</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={syncCustomersFromSources} 
            disabled={isSyncing}
            variant="outline"
            className="border-2"
            style={isSyncing ? {} : { borderColor: '#45877F', color: '#45877F' }}
          >
            {isSyncing ? 'Sincronizzazione...' : 'Sincronizza'}
          </Button>
          <Button onClick={removeDuplicates} variant="outline">
            <Trash2 className="w-5 h-5 mr-2" />
            Duplicati
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-5 h-5 mr-2" />
            CSV
          </Button>
          <Button onClick={exportForMailchimp} variant="outline">
            <Mail className="w-5 h-5 mr-2" />
            Mail
          </Button>
          <Button onClick={openWhatsAppList} variant="outline">
            <MessageCircle className="w-5 h-5 mr-2" />
            WhatsApp
          </Button>
          <Button
            onClick={() => {
              setEditingCustomer(null);
              setFormData({ nome: '', cognome: '', telefono: '', email: '', note: '' });
              setShowForm(true);
            }}
            style={{ backgroundColor: '#45877F' }}
            className="text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuovo
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6 border-2" style={{ borderColor: '#45877F' }}>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cognome">Cognome *</Label>
                  <Input
                    id="cognome"
                    value={formData.cognome}
                    onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={3}
                  />
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
          placeholder="Cerca clienti..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-12"
        />
      </div>

      <div className="space-y-3">
        {filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 text-lg">Nessun cliente ancora</p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-black mb-2">
                      {customer.nome} {customer.cognome}
                    </h3>
                    
                    <div className="space-y-1">
                      {customer.telefono && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MessageCircle className="w-4 h-4" />
                          <a href={`https://wa.me/${customer.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {customer.telefono}
                          </a>
                        </div>
                      )}
                      
                      {customer.email && customer.email !== '-' && (
                       <div className="flex items-center gap-2 text-sm text-slate-600">
                         <Mail className="w-4 h-4" />
                         <a href={`mailto:${customer.email}`} className="hover:underline">
                           {customer.email}
                         </a>
                       </div>
                      )}

                      {customer.note && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-slate-500">Note:</p>
                          <p className="text-sm text-slate-700">{customer.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
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