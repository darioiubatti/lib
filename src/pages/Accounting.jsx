import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calculator, Plus, Trash2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Download, Upload, Lock, FileText, EyeOff, Edit2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { it } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const generateMonths = () => {
  const months = [];
  for (let year = 2024; year <= 2030; year++) {
    const startMonth = year === 2024 ? 12 : 1;
    for (let month = startMonth; month <= 12; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const date = new Date(year, month - 1);
      months.push({
        value: monthStr,
        label: format(date, 'MMMM yyyy', { locale: it })
      });
    }
  }
  return months;
};

const MONTHS = generateMonths();
const DAYS_OF_WEEK = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

export default function Accounting() {
  const currentMonthValue = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [showSummary, setShowSummary] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState('accounting');
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const authStatus = localStorage.getItem('accounting_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    if (password === "stocazzo") {
      setIsAuthenticated(true);
      localStorage.setItem('accounting_auth', 'true');
      setPassword('');
    } else {
      alert("Password errata!");
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('accounting_auth');
    setPassword('');
  };

  const exportSalesToCSV = () => {
    const headers = ['Data', 'Prodotti', 'Quantità Totale', 'Importo Totale'];
    const rows = saleLogs.map(log => [
      format(new Date(log.date), 'dd/MM/yyyy'),
      log.items.map(i => `${i.product_name} (${i.quantity})`).join('; '),
      log.items.reduce((sum, i) => sum + i.quantity, 0),
      `€${log.total_amount.toFixed(2)}`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `log_vendite_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const { data: rawDailyData = [] } = useQuery({
    queryKey: ['dailyAccounting', selectedMonth],
    queryFn: () => base44.entities.DailyAccounting.filter({ month_year: selectedMonth }),
    enabled: isAuthenticated,
  });

  // Rimuovi duplicati - prendi solo il record più recente per ogni data
  const dailyData = React.useMemo(() => {
    const byDate = {};
    rawDailyData.forEach(d => {
      // Ensure updated_date is treated as a Date object for comparison
      const currentEntryDate = new Date(d.updated_date);
      const existingEntryDate = byDate[d.date] ? new Date(byDate[d.date].updated_date) : null;

      if (!byDate[d.date] || currentEntryDate > existingEntryDate) {
        byDate[d.date] = d;
      }
    });
    return Object.values(byDate);
  }, [rawDailyData]);

  const { data: onlinePurchases = [] } = useQuery({
    queryKey: ['onlinePurchases', selectedMonth],
    queryFn: () => base44.entities.OnlinePurchase.filter({ month_year: selectedMonth }),
    enabled: isAuthenticated,
  });

  const { data: allMonthsRawData = [] } = useQuery({ // Renamed from allDailyData to allMonthsRawData
    queryKey: ['allDailyAccounting'],
    queryFn: () => base44.entities.DailyAccounting.list(),
    enabled: showSummary && isAuthenticated,
  });

  const { data: allOnlinePurchases = [] } = useQuery({
    queryKey: ['allOnlinePurchases'],
    queryFn: () => base44.entities.OnlinePurchase.list(),
    enabled: showSummary && isAuthenticated,
  });

  const { data: saleLogs = [] } = useQuery({
    queryKey: ['saleLogs'],
    queryFn: () => base44.entities.SaleLog.list('-created_date'),
    enabled: isAuthenticated && activeTab === 'sales'
  });

  const [editingSaleLog, setEditingSaleLog] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const updateSaleLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SaleLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saleLogs'] });
      setShowEditDialog(false);
      setEditingSaleLog(null);
    }
  });

  const deleteSaleLogMutation = useMutation({
    mutationFn: (id) => base44.entities.SaleLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saleLogs'] });
    }
  });

  const totalSales = saleLogs.reduce((sum, log) => sum + log.total_amount, 0);
  const totalSalesItems = saleLogs.reduce((sum, log) => 
    sum + log.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );

  const updateDailyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyAccounting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyAccounting'] });
      queryClient.invalidateQueries({ queryKey: ['allDailyAccounting'] });
    },
  });

  const createDailyMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyAccounting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyAccounting'] });
      queryClient.invalidateQueries({ queryKey: ['allDailyAccounting'] });
    },
  });

  const createPurchaseMutation = useMutation({
    mutationFn: (data) => base44.entities.OnlinePurchase.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onlinePurchases'] });
      queryClient.invalidateQueries({ queryKey: ['allOnlinePurchases'] });
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: (id) => base44.entities.OnlinePurchase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onlinePurchases'] });
      queryClient.invalidateQueries({ queryKey: ['allOnlinePurchases'] });
    },
  });

  const [year, month] = selectedMonth.split('-').map(Number);
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayData = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return dailyData.find(d => d.date === dateStr);
  };

  const handleDayToggle = async (date, currentData) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (currentData) {
      await updateDailyMutation.mutateAsync({
        id: currentData.id,
        data: { ...currentData, is_open: !currentData.is_open }
      });
    } else {
      const isMonday = getDay(date) === 1;
      await createDailyMutation.mutateAsync({
        date: dateStr,
        month_year: selectedMonth,
        is_open: isMonday ? false : true, // If Monday, default to closed, otherwise default to open
        pos: 0,
        contanti: 0
      });
    }
  };

  const handleValueUpdate = async (date, field, value, currentData) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const numValue = parseFloat(value) || 0;
    
    if (currentData) {
      await updateDailyMutation.mutateAsync({
        id: currentData.id,
        data: { ...currentData, [field]: numValue }
      });
    } else {
      await createDailyMutation.mutateAsync({
        date: dateStr,
        month_year: selectedMonth,
        is_open: true,
        pos: field === 'pos' ? numValue : 0,
        contanti: field === 'contanti' ? numValue : 0
      });
    }
  };

  const calculateStats = (data, purchases) => {
    const openDays = data.filter(d => d.is_open);
    const totalContanti = openDays.reduce((sum, d) => sum + (d.contanti || 0), 0);
    const totalPosWithCommission = openDays.reduce((sum, d) => sum + (d.pos || 0), 0);
    const totalPosWithoutCommission = totalPosWithCommission * 0.98;
    const totalOnline = purchases.reduce((sum, p) => sum + (p.importo || 0), 0);
    const totalGeneral = totalContanti + totalPosWithoutCommission + totalOnline;
    const dailyAverage = openDays.length > 0 ? totalGeneral / openDays.length : 0;

    const dayStats = {};
    openDays.forEach(d => {
      const dayOfWeek = getDay(new Date(d.date));
      if (!dayStats[dayOfWeek]) {
        dayStats[dayOfWeek] = { total: 0, count: 0 };
      }
      dayStats[dayOfWeek].total += (d.contanti || 0) + ((d.pos || 0) * 0.98); // Apply commission for day averages
      dayStats[dayOfWeek].count += 1;
    });

    const dayAverages = Object.entries(dayStats).map(([day, stats]) => ({
      day: parseInt(day),
      dayName: DAYS_OF_WEEK[parseInt(day)],
      average: stats.total / stats.count
    })).sort((a, b) => b.average - a.average);

    return {
      totalContanti,
      totalPosWithCommission,
      totalPosWithoutCommission,
      totalOnline,
      totalGeneral,
      openDaysCount: openDays.length,
      dailyAverage,
      bestDay: dayAverages[0],
      worstDay: dayAverages.length > 1 ? dayAverages[dayAverages.length - 1] : null, // Handle case with one or zero days
      dayRanking: dayAverages
    };
  };

  const stats = calculateStats(dailyData, onlinePurchases);

  const handleAddPurchase = async () => {
    await createPurchaseMutation.mutateAsync({
      month_year: selectedMonth,
      numero_ordine: '',
      libro: '',
      importo: 0
    });
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 3) {
          const [date, pos, contanti] = values;
          try {
            await createDailyMutation.mutateAsync({
              date,
              month_year: selectedMonth,
              is_open: true,
              pos: parseFloat(pos) || 0,
              contanti: parseFloat(contanti) || 0
            });
          } catch (error) {
            console.error('Import error:', error);
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['dailyAccounting'] });
    };
    reader.readAsText(file);
  };

  const exportToPDF = () => {
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;
    
    let content = `
      <html>
        <head>
          <title>Contabilità ${monthLabel}</title>
          <style>
            body { font-family: 'Montserrat', Arial, sans-serif; padding: 20px; }
            h1 { color: #45877F; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #45877F; color: white; }
            .stats { background-color: #f5f5f5; padding: 15px; margin: 20px 0; }
            .stat-item { margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>Contabilità ${monthLabel}</h1>
          
          <div class="stats">
            <h2>Statistiche</h2>
            <div class="stat-item"><strong>Totale Contanti:</strong> €${stats.totalContanti.toFixed(2)}</div>
            <div class="stat-item"><strong>Totale POS (con commissioni):</strong> €${stats.totalPosWithCommission.toFixed(2)}</div>
            <div class="stat-item"><strong>Totale POS (senza commissioni):</strong> €${stats.totalPosWithoutCommission.toFixed(2)}</div>
            <div class="stat-item"><strong>Totale Acquisti Online:</strong> €${stats.totalOnline.toFixed(2)}</div>
            <div class="stat-item"><strong>Totale Generale:</strong> €${stats.totalGeneral.toFixed(2)}</div>
            <div class="stat-item"><strong>Giorni Apertura:</strong> ${stats.openDaysCount}</div>
            <div class="stat-item"><strong>Media Giornaliera:</strong> €${stats.dailyAverage.toFixed(2)}</div>
          </div>

          <h2>Incassi Giornalieri</h2>
          <table>
            <tr><th>Data</th><th>POS</th><th>Contanti</th><th>Totale</th></tr>
            ${dailyData.filter(d => d.is_open).map(d => `
              <tr>
                <td>${format(new Date(d.date), 'd MMMM yyyy', { locale: it })}</td>
                <td>€${(d.pos || 0).toFixed(2)}</td>
                <td>€${(d.contanti || 0).toFixed(2)}</td>
                <td>€${((d.pos || 0) + (d.contanti || 0)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>

          <h2>Acquisti Online</h2>
          <table>
            <tr><th>Data</th><th>N. Ordine</th><th>Libro</th><th>Importo</th></tr>
            ${onlinePurchases.map(p => `
              <tr>
                <td>${format(new Date(p.created_date), 'd MMM yyyy', { locale: it })}</td>
                <td>${p.numero_ordine}</td>
                <td>${p.libro}</td>
                <td>€${(p.importo || 0).toFixed(2)}</td>
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
    a.download = `Contabilita_${monthLabel.replace(' ', '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentMonthIndex = MONTHS.findIndex(m => m.value === selectedMonth);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Lock className="w-8 h-8" style={{ color: '#45877F' }} />
              Accesso Contabilità
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Inserisci password"
              />
            </div>
            <Button
              onClick={handleLogin}
              className="w-full text-white"
              style={{ backgroundColor: '#45877F' }}
            >
              Accedi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSummary) {
    // Rimuovi duplicati anche per il summary
    const deduplicatedData = React.useMemo(() => {
      const byDate = {};
      allMonthsRawData.forEach(d => {
        const currentEntryDate = new Date(d.updated_date);
        const existingEntryDate = byDate[d.date] ? new Date(byDate[d.date].updated_date) : null;

        if (!byDate[d.date] || currentEntryDate > existingEntryDate) {
          byDate[d.date] = d;
        }
      });
      return Object.values(byDate);
    }, [allMonthsRawData]);

    const monthlyStats = MONTHS.map(month => {
      const monthData = deduplicatedData.filter(d => d.month_year === month.value);
      const monthPurchases = allOnlinePurchases.filter(p => p.month_year === month.value);
      return {
        month: month.label,
        monthValue: month.value,
        ...calculateStats(monthData, monthPurchases)
      };
    }).filter(s => s.openDaysCount > 0);

    const exportSummaryPDF = () => {
      let content = `
        <html>
          <head>
            <title>Riepilogo Annuale Contabilità</title>
            <style>
              body { font-family: 'Montserrat', Arial, sans-serif; padding: 20px; }
              h1 { color: #45877F; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #45877F; color: white; }
            </style>
          </head>
          <body>
            <h1>Riepilogo Annuale Contabilità</h1>
            <table>
              <tr>
                <th>Mese</th>
                <th>Giorni Apertura</th>
                <th>Totale Generale</th>
                <th>Media Giornaliera</th>
                <th>Totale Online</th>
              </tr>
              ${monthlyStats.map(s => `
                <tr>
                  <td>${s.month}</td>
                  <td>${s.openDaysCount}</td>
                  <td>€${s.totalGeneral.toFixed(2)}</td>
                  <td>€${s.dailyAverage.toFixed(2)}</td>
                  <td>€${s.totalOnline.toFixed(2)}</td>
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
      a.download = 'Riepilogo_Annuale_Contabilita.html';
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
              <Calculator className="w-10 h-10" style={{ color: '#45877F' }} />
              Riepilogo Annuale
            </h1>
            <p className="text-slate-500 mt-2 text-lg">Statistiche di tutti i mesi</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportSummaryPDF} variant="outline">
              <Download className="w-5 h-5 mr-2" />
              Esporta PDF
            </Button>
            <Button onClick={() => setShowSummary(false)} variant="outline">
              Torna ai Mesi
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {monthlyStats.map((stat, idx) => (
            <Card key={idx}>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-black mb-4">{stat.month}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Giorni Apertura</p>
                    <p className="text-2xl font-bold">{stat.openDaysCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Totale Generale</p>
                    <p className="text-2xl font-bold text-green-600">€{stat.totalGeneral.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Media Giornaliera</p>
                    <p className="text-2xl font-bold">€{stat.dailyAverage.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Totale Online</p>
                    <p className="text-2xl font-bold" style={{ color: '#45877F' }}>€{stat.totalOnline.toFixed(2)}</p>
                  </div>
                </div>
                {stat.bestDay && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-slate-500">Giorno migliore</p>
                        <p className="font-bold text-green-600">{stat.bestDay.dayName}: €{stat.bestDay.average.toFixed(2)}</p>
                      </div>
                    </div>
                    {stat.worstDay && (
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="text-xs text-slate-500">Giorno peggiore</p>
                          <p className="font-bold text-red-600">{stat.worstDay.dayName}: €{stat.worstDay.average.toFixed(2)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
          <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
            <Calculator className="w-10 h-10" style={{ color: '#45877F' }} />
            Contabilità
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Gestione incassi e log vendite</p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <EyeOff className="w-5 h-5 mr-2" />
          Disconnetti
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="accounting">Incassi</TabsTrigger>
          <TabsTrigger value="sales">Log Vendite</TabsTrigger>
        </TabsList>

        <TabsContent value="accounting" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  <Upload className="w-5 h-5 mr-2" />
                  Importa Excel
                  <input type="file" accept=".csv" onChange={handleImportExcel} className="hidden" />
                </label>
              </Button>
              <Button onClick={exportToPDF} variant="outline">
                <Download className="w-5 h-5 mr-2" />
                Esporta PDF
              </Button>
              <Button onClick={() => setShowSummary(true)} style={{ backgroundColor: '#45877F' }} className="text-white">
                Vedi Riepilogo
              </Button>
            </div>
          </div>

      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => setSelectedMonth(MONTHS[Math.max(0, currentMonthIndex - 1)].value)}
          disabled={currentMonthIndex === 0}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold text-black">{MONTHS[currentMonthIndex].label}</h2>
        <Button
          variant="outline"
          onClick={() => setSelectedMonth(MONTHS[Math.min(MONTHS.length - 1, currentMonthIndex + 1)].value)}
          disabled={currentMonthIndex === MONTHS.length - 1}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Incassi Giornalieri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {daysInMonth.map((date) => {
                const dayData = getDayData(date);
                const isMonday = getDay(date) === 1;
                // If currentData exists, use its is_open status, otherwise, if it's Monday, default to closed, else default to open.
                const isOpen = dayData ? dayData.is_open : !isMonday; 
                const dayTotal = (dayData?.pos || 0) + (dayData?.contanti || 0);
                
                return (
                  <div key={date.toString()} className={`flex items-center gap-4 p-3 rounded-lg border ${!isOpen ? 'bg-slate-50 opacity-60' : 'bg-white'}`}>
                    <Checkbox
                      checked={isOpen}
                      onCheckedChange={() => handleDayToggle(date, dayData)}
                    />
                    <div className="w-32">
                      <p className="font-semibold text-sm">{format(date, 'EEEE', { locale: it })}</p>
                      <p className="text-xs text-slate-500">{format(date, 'd MMMM', { locale: it })}</p>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">POS (€)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dayData?.pos || ''}
                          onChange={(e) => handleValueUpdate(date, 'pos', e.target.value, dayData)}
                          onBlur={(e) => {
                            if (e.target.value && (!dayData || !dayData.is_open)) { // If value is entered and day is not open, open it
                              handleDayToggle(date, dayData);
                            }
                          }}
                          disabled={!isOpen}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Contanti (€)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dayData?.contanti || ''}
                          onChange={(e) => handleValueUpdate(date, 'contanti', e.target.value, dayData)}
                          onBlur={(e) => {
                            if (e.target.value && (!dayData || !dayData.is_open)) { // If value is entered and day is not open, open it
                              handleDayToggle(date, dayData);
                            }
                          }}
                          disabled={!isOpen}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Totale</label>
                        <div className="h-9 flex items-center px-3 bg-slate-100 rounded border font-bold" style={{ color: '#45877F' }}>
                          €{dayTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiche Mese</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Totale Contanti</p>
              <p className="text-2xl font-bold">€{stats.totalContanti.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Totale POS (con commissioni)</p>
              <p className="text-2xl font-bold">€{stats.totalPosWithCommission.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Totale POS (senza commissioni)</p>
              <p className="text-2xl font-bold">€{stats.totalPosWithoutCommission.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Totale Acquisti Online</p>
              <p className="text-2xl font-bold" style={{ color: '#45877F' }}>€{stats.totalOnline.toFixed(2)}</p>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-slate-500 mb-1">Totale Generale</p>
              <p className="text-3xl font-bold text-green-600">€{stats.totalGeneral.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Giorni Apertura</p>
              <p className="text-xl font-bold">{stats.openDaysCount}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">Media Giornaliera</p>
              <p className="text-xl font-bold">€{stats.dailyAverage.toFixed(2)}</p>
            </div>
            
            {stats.dayRanking && stats.dayRanking.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-semibold text-slate-700 mb-3">Classifica Giorni Settimana</p>
                <div className="space-y-2">
                  {stats.dayRanking.map((day, idx) => (
                    <div key={day.day} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <TrendingUp className="w-4 h-4 text-green-600" />}
                        {idx === stats.dayRanking.length - 1 && <TrendingDown className="w-4 h-4 text-red-600" />}
                        <span className="text-sm font-medium">{day.dayName}</span>
                      </div>
                      <span className={`text-sm font-bold ${idx === 0 ? 'text-green-600' : idx === stats.dayRanking.length - 1 ? 'text-red-600' : 'text-slate-700'}`}>
                        €{day.average.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Acquisti Online</CardTitle>
            <Button onClick={handleAddPurchase} size="sm" style={{ backgroundColor: '#45877F' }} className="text-white">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {onlinePurchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center gap-4 p-3 rounded-lg border bg-white">
                <div className="text-sm text-slate-500 w-32">
                  {format(new Date(purchase.created_date), 'd MMM yyyy', { locale: it })}
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <Input
                    type="text"
                    placeholder="N. Ordine"
                    value={purchase.numero_ordine}
                    onChange={async (e) => {
                      await base44.entities.OnlinePurchase.update(purchase.id, { numero_ordine: e.target.value });
                      queryClient.invalidateQueries({ queryKey: ['onlinePurchases'] });
                    }}
                    className="h-9"
                  />
                  <Input
                    type="text"
                    placeholder="Libro"
                    value={purchase.libro}
                    onChange={async (e) => {
                      await base44.entities.OnlinePurchase.update(purchase.id, { libro: e.target.value });
                      queryClient.invalidateQueries({ queryKey: ['onlinePurchases'] });
                    }}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Importo"
                    value={purchase.importo}
                    onChange={async (e) => {
                      await base44.entities.OnlinePurchase.update(purchase.id, { importo: parseFloat(e.target.value) || 0 });
                      queryClient.invalidateQueries({ queryKey: ['onlinePurchases'] });
                    }}
                    className="h-9"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deletePurchaseMutation.mutate(purchase.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {onlinePurchases.length === 0 && (
              <p className="text-center text-slate-500 py-8">Nessun acquisto online ancora</p>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={exportSalesToCSV} disabled={saleLogs.length === 0}>
              <Download className="w-5 h-5 mr-2" />
              Esporta CSV
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Vendite Totali</p>
                <p className="text-3xl font-bold" style={{ color: '#45877F' }}>€{totalSales.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Numero Vendite</p>
                <p className="text-3xl font-bold text-slate-900">{saleLogs.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Articoli Venduti</p>
                <p className="text-3xl font-bold text-slate-900">{totalSalesItems}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Storico Vendite</CardTitle>
            </CardHeader>
            <CardContent>
              {saleLogs.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nessuna vendita registrata</p>
              ) : (
                <div className="space-y-4">
                  {saleLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-lg">
                          {format(new Date(log.date), 'd MMMM yyyy', { locale: it })}
                        </p>
                        <div className="flex items-center gap-3">
                          <p className="text-xl font-bold" style={{ color: '#45877F' }}>
                            €{log.total_amount.toFixed(2)}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingSaleLog(log);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Eliminare questa vendita?')) {
                                deleteSaleLogMutation.mutate(log.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {log.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-slate-50 p-2 rounded">
                            <div className="flex-1">
                              <span className="font-semibold">{item.product_name}</span>
                              <span className="text-slate-600 ml-2">({item.product_id})</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-600">×{item.quantity}</span>
                              <span className="ml-3 font-semibold">€{item.total.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Modifica Vendita</DialogTitle>
              </DialogHeader>
              {editingSaleLog && (
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={editingSaleLog.date}
                      onChange={(e) => setEditingSaleLog({...editingSaleLog, date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Articoli</Label>
                    <div className="space-y-2">
                      {editingSaleLog.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2 p-2 border rounded">
                          <Input
                            placeholder="Nome"
                            value={item.product_name}
                            onChange={(e) => {
                              const newItems = [...editingSaleLog.items];
                              newItems[idx].product_name = e.target.value;
                              setEditingSaleLog({...editingSaleLog, items: newItems});
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="Quantità"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...editingSaleLog.items];
                              newItems[idx].quantity = parseInt(e.target.value);
                              newItems[idx].total = newItems[idx].price * newItems[idx].quantity;
                              setEditingSaleLog({
                                ...editingSaleLog,
                                items: newItems,
                                total_amount: newItems.reduce((sum, i) => sum + i.total, 0)
                              });
                            }}
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Prezzo"
                            value={item.price}
                            onChange={(e) => {
                              const newItems = [...editingSaleLog.items];
                              newItems[idx].price = parseFloat(e.target.value);
                              newItems[idx].total = newItems[idx].price * newItems[idx].quantity;
                              setEditingSaleLog({
                                ...editingSaleLog,
                                items: newItems,
                                total_amount: newItems.reduce((sum, i) => sum + i.total, 0)
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Totale: €{editingSaleLog.total_amount.toFixed(2)}</Label>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Annulla</Button>
                <Button
                  onClick={() => updateSaleLogMutation.mutate({
                    id: editingSaleLog.id,
                    data: editingSaleLog
                  })}
                  style={{ backgroundColor: '#45877F' }}
                  className="text-white"
                >
                  Salva
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </TabsContent>
          </Tabs>
          </div>
          );
          }