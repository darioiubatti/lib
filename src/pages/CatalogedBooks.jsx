import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Download, Save, ChevronLeft, ChevronRight, Trash2, Upload } from "lucide-react";
import { format, subDays, getDay, addDays } from "date-fns";
import { it } from "date-fns/locale";

export default function CatalogedBooks() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  
  const currentDateStr = format(currentDate, 'yyyy-MM-dd');
  const isToday = format(currentDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');

  const [numberOfBooks, setNumberOfBooks] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);

  const queryClient = useQueryClient();

  const { data: catalogData = [] } = useQuery({
    queryKey: ['catalogedBooks'],
    queryFn: async () => {
      const allData = await base44.entities.CatalogedBooks.list('-date');
      const cutoffDate = format(subDays(today, 35), 'yyyy-MM-dd');
      return allData.filter(d => d.date >= cutoffDate);
    },
  });

  const { data: currentDayData } = useQuery({
    queryKey: ['catalogedBooks', currentDateStr],
    queryFn: async () => {
      const filtered = await base44.entities.CatalogedBooks.filter({ date: currentDateStr });
      return filtered[0];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CatalogedBooks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogedBooks'] });
      setIsSaved(true);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CatalogedBooks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogedBooks'] });
      setIsSaved(true);
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const allData = await base44.entities.CatalogedBooks.list();
      for (const record of allData) {
        await base44.entities.CatalogedBooks.delete(record.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogedBooks'] });
      setNumberOfBooks(0);
      setIsSaved(false);
      alert('Tutti i dati sono stati azzerati!');
    }
  });

  const deleteOldDataMutation = useMutation({
    mutationFn: async () => {
      const allData = await base44.entities.CatalogedBooks.list();
      const cutoffDate = format(subDays(today, 35), 'yyyy-MM-dd');
      const oldData = allData.filter(d => d.date < cutoffDate);
      
      for (const record of oldData) {
        await base44.entities.CatalogedBooks.delete(record.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogedBooks'] });
    }
  });

  useEffect(() => {
    deleteOldDataMutation.mutate();
  }, []);

  useEffect(() => {
    if (currentDayData) {
      setNumberOfBooks(currentDayData.total || 0);
      setIsSaved(true);
    } else {
      setNumberOfBooks(0);
      setIsSaved(false);
    }
  }, [currentDayData, currentDateStr]);

  // Auto-save when leaving page
  useEffect(() => {
    return () => {
      if (numberOfBooks > 0) {
        handleSave();
      }
    };
  }, []);

  const handleSave = async () => {
    const dayOfWeek = format(currentDate, 'EEEE', { locale: it });
    const monthYear = format(currentDate, 'yyyy-MM');

    const data = {
      date: currentDateStr,
      day_of_week: dayOfWeek,
      month_year: monthYear,
      is_open: true,
      total: numberOfBooks
    };

    if (currentDayData) {
      await updateMutation.mutateAsync({ id: currentDayData.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const triggerAutoSave = () => {
    setIsSaved(false);
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    const timeout = setTimeout(() => {
      handleSave();
    }, 1000);
    setAutoSaveTimeout(timeout);
  };

  useEffect(() => {
    if (currentDayData || numberOfBooks > 0) {
      triggerAutoSave();
    }
  }, [numberOfBooks]);

  const goToPreviousDay = () => {
    const newDate = subDays(currentDate, 1);
    const cutoffDate = subDays(today, 35);
    if (newDate >= cutoffDate) {
      setCurrentDate(newDate);
    }
  };

  const goToNextDay = () => {
    const newDate = addDays(currentDate, 1);
    if (newDate <= today) {
      setCurrentDate(newDate);
    }
  };

  const calculateStats = () => {
    const openDays = catalogData.filter(d => d.is_open);
    const totalBooks = openDays.reduce((sum, d) => sum + (d.total || 0), 0);

    return {
      totalBooks,
      openDaysCount: openDays.length
    };
  };

  const stats = calculateStats();

  const exportToCSV = () => {
    const headers = ['Data', 'Giorno', 'Totale'];
    const rows = catalogData.filter(d => d.is_open).map(d => [
      format(new Date(d.date), 'dd/MM/yyyy'),
      d.day_of_week,
      d.total || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `libri_catalogati_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
          alert('Il file CSV è vuoto o non contiene dati validi.');
          return;
      }

      const importPromises = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== 3) {
            console.warn(`Skipping invalid row (incorrect column count): ${lines[i]}`);
            continue;
        }
        
        try {
          const dateParts = values[0].split('/');
          if (dateParts.length !== 3 || isNaN(parseInt(dateParts[0])) || isNaN(parseInt(dateParts[1])) || isNaN(parseInt(dateParts[2]))) {
            console.warn(`Skipping invalid row (invalid date format): ${lines[i]}`);
            continue;
          }
          const date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          
          const total = parseInt(values[2]) || 0;

          const recordData = {
            date,
            day_of_week: values[1],
            month_year: format(new Date(date), 'yyyy-MM'),
            is_open: true,
            total
          };

          const existingRecords = await base44.entities.CatalogedBooks.filter({ date: recordData.date });
          if (existingRecords.length > 0) {
            importPromises.push(base44.entities.CatalogedBooks.update(existingRecords[0].id, recordData));
          } else {
            importPromises.push(base44.entities.CatalogedBooks.create(recordData));
          }

        } catch (error) {
          console.error('Error importing row:', lines[i], error);
        }
      }
      
      try {
        await Promise.all(importPromises);
        queryClient.invalidateQueries({ queryKey: ['catalogedBooks'] });
        alert('Importazione completata!');
      } catch (error) {
        console.error('Error during batch import:', error);
        alert('Si è verificato un errore durante l\'importazione. Controlla la console per i dettagli.');
      }
    };
    
    reader.readAsText(file);
    event.target.value = null;
  };

  const exportToPDF = () => {
    let content = `
      <html>
        <head>
          <title>Libri Catalogati</title>
          <style>
            body { font-family: 'Montserrat', Arial, sans-serif; padding: 20px; }
            h1 { color: #45877F; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #45877F; color: white; }
            .stats { background-color: #f5f5f5; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>Libri Catalogati - Ultimi 35 Giorni</h1>
          
          <div class="stats">
            <h2>Statistiche</h2>
            <p><strong>Totale Libri:</strong> ${stats.totalBooks}</p>
            <p><strong>Giorni Lavorati:</strong> ${stats.openDaysCount}</p>
          </div>

          <h2>Dettaglio Giornaliero</h2>
          <table>
            <tr><th>Data</th><th>Totale</th></tr>
            ${catalogData.filter(d => d.is_open).map(d => `
              <tr>
                <td>${format(new Date(d.date), 'd MMMM yyyy', { locale: it })}</td>
                <td><strong>${d.total || 0}</strong></td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Libri_Catalogati.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-10 h-10" style={{ color: '#45877F' }} />
            Libri Catalogati
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Inserimento giornaliero</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline">
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
          <Button onClick={exportToPDF} variant="outline">
            <Download className="w-5 h-5 mr-2" />
            Esporta PDF
          </Button>
          <Button onClick={() => deleteAllMutation.mutate()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
            <Trash2 className="w-5 h-5 mr-2" />
            Azzera Tutto
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-2" style={{ borderColor: '#45877F' }}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousDay}
                  disabled={format(subDays(currentDate, 1), 'yyyy-MM-dd') < format(subDays(today, 35), 'yyyy-MM-dd')}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <span>{format(currentDate, 'EEEE d MMMM yyyy', { locale: it })}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextDay}
                  disabled={currentDate >= today}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              {isSaved && <span className="text-sm text-green-600">✓ Salvato</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Numero libri catalogati</label>
              <Input
                type="number"
                value={numberOfBooks}
                onChange={(e) => setNumberOfBooks(parseInt(e.target.value) || 0)}
                className="text-xl font-bold h-16 text-center"
                placeholder="0"
              />
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={handleSave}
                className="w-full btn-primary"
                style={{ backgroundColor: '#45877F', color: 'white', fontFamily: 'Montserrat', fontWeight: 600 }}
                size="lg"
              >
                <Save className="w-5 h-5 mr-2" />
                Salva Giornata
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiche Ultimi 35 Giorni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Totale Libri Catalogati</p>
              <p className="text-4xl font-bold" style={{ color: '#45877F' }}>{stats.totalBooks}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Giorni Lavorati</p>
              <p className="text-2xl font-bold">{stats.openDaysCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storico Ultimi 35 Giorni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Data</th>
                  <th className="text-center py-3 px-4 font-semibold">Totale</th>
                </tr>
              </thead>
              <tbody>
                {catalogData.filter(d => d.is_open).length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center py-8 text-slate-500">
                      Nessun dato ancora
                    </td>
                  </tr>
                ) : (
                  catalogData.filter(d => d.is_open).map((day) => (
                    <tr key={day.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{format(new Date(day.date), 'EEEE', { locale: it })}</p>
                          <p className="text-sm text-slate-500">{format(new Date(day.date), 'd MMM yyyy', { locale: it })}</p>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 font-bold text-black text-lg">
                        {day.total || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}