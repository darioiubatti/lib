import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar, ChevronLeft, ChevronRight, Download, Clock, User, Upload, Trash2, FileText, Plus, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, parse } from "date-fns";
import { it } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Shifts() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const monthYear = format(currentMonth, 'yyyy-MM');

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', monthYear],
    queryFn: () => base44.entities.Shift.filter({ month_year: monthYear }),
  });

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] })
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setEditingShift(null);
    }
  });

  const bulkCreateShiftsMutation = useMutation({
    mutationFn: async (shiftsData) => {
      for (const shift of shiftsData) {
        await base44.entities.Shift.create(shift);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      alert('Piano turni generato!');
    }
  });

  const deleteAllShiftsMutation = useMutation({
    mutationFn: async () => {
      for (const shift of shifts) {
        await base44.entities.Shift.delete(shift.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setShowDeleteAllDialog(false);
      alert('Tutti i turni sono stati eliminati!');
    }
  });



  const italianHolidays = (year) => [
    `${year}-01-01`, // Capodanno
    `${year}-01-06`, // Epifania
    `${year}-04-25`, // Liberazione
    `${year}-05-01`, // Festa del Lavoro
    `${year}-06-02`, // Festa della Repubblica
    `${year}-08-15`, // Ferragosto
    `${year}-11-01`, // Tutti i Santi
    `${year}-12-08`, // Immacolata
    `${year}-12-25`, // Natale
    `${year}-12-26`, // Santo Stefano
  ];

  const isHoliday = (dateStr, year) => {
    return italianHolidays(year).includes(dateStr);
  };

  const generateMonthlyShifts = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    const year = currentMonth.getFullYear();
    const holidays = italianHolidays(year);

    // === FASE 1: Calcolo dei Turni Disponibili ===
    const shifts = days.map((date) => {
      const dayOfWeek = getDay(date);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEEE', { locale: it });
      const isHolidayDay = holidays.includes(dateStr);

      return {
        date: dateStr,
        month_year: monthYear,
        day_of_week: dayName,
        morning_shift: 'Chiuso',
        afternoon_shift: 'Chiuso',
        notes: '',
        dayOfWeek,
        isHoliday: isHolidayDay,
        isSaturday: dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isMonday: dayOfWeek === 1
      };
    });

    // Applica chiusure fisse
    shifts.forEach(shift => {
      if (shift.isHoliday) {
        shift.notes = 'Festività';
      } else if (shift.isMonday) {
        // Lunedì chiuso
      } else if (shift.isSunday) {
        shift.morning_shift = 'Chiuso'; // Domenica mattina chiusa
      } else {
        shift.morning_shift = 'LIBERO';
        shift.afternoon_shift = 'LIBERO';
      }
      
      if (shift.isSunday && !shift.isHoliday) {
        shift.afternoon_shift = 'LIBERO';
      }
    });

    // Calcola turni disponibili
    const S_avail = shifts.filter(s => s.morning_shift === 'LIBERO' || s.afternoon_shift === 'LIBERO').reduce((sum, s) => {
      return sum + (s.morning_shift === 'LIBERO' ? 1 : 0) + (s.afternoon_shift === 'LIBERO' ? 1 : 0);
    }, 0);

    const S_Wk = shifts.filter(s => s.isSaturday || s.isSunday).reduce((sum, s) => {
      return sum + (s.morning_shift === 'LIBERO' ? 1 : 0) + (s.afternoon_shift === 'LIBERO' ? 1 : 0);
    }, 0);

    // === FASE 2: Calcolo Quote Dinamiche ===
    const Q_Mo_Base = 16;
    const S_rem = S_avail - Q_Mo_Base;
    const Q_D = Math.floor(S_rem / 2);
    const Q_M = Math.floor(S_rem / 2);
    const Q_Mo = Q_Mo_Base + (S_rem % 2);

    // === FASE 3: Allocazione Turni Weekend ===
    const weekendSlots = [];
    shifts.forEach(shift => {
      if ((shift.isSaturday || shift.isSunday) && !shift.isHoliday) {
        if (shift.morning_shift === 'LIBERO') {
          weekendSlots.push({ shift, period: 'morning' });
        }
        if (shift.afternoon_shift === 'LIBERO') {
          weekendSlots.push({ shift, period: 'afternoon' });
        }
      }
    });

    const Q_Wk_Base = Math.floor(S_Wk / 3);
    const weekendRest = S_Wk % 3;
    
    let darioWeekend = 0, marcoWeekend = 0, morenaWeekend = 0;
    const Q_Wk_D = Q_Wk_Base;
    const Q_Wk_M = Q_Wk_Base;
    const Q_Wk_Mo = Q_Wk_Base + weekendRest;

    // Assegna weekend con priorità: Dario mattina, Marco pomeriggio, resto Morena
    weekendSlots.forEach(slot => {
      if (slot.period === 'morning' && darioWeekend < Q_Wk_D) {
        slot.shift.morning_shift = 'Dario';
        darioWeekend++;
      } else if (slot.period === 'afternoon' && marcoWeekend < Q_Wk_M) {
        slot.shift.afternoon_shift = 'Marco';
        marcoWeekend++;
      } else if (morenaWeekend < Q_Wk_Mo) {
        if (slot.period === 'morning') {
          slot.shift.morning_shift = 'Morena';
        } else {
          slot.shift.afternoon_shift = 'Morena';
        }
        morenaWeekend++;
      }
    });

    // === FASE 4: Allocazione Turni Feriali ===
    // Separa settimane per rotazione Morena
    const ferialDays = shifts.filter(s => !s.isHoliday && !s.isMonday && !s.isSaturday && !s.isSunday);
    const weeks = [];
    let currentWeek = [];
    
    ferialDays.forEach((shift, idx) => {
      currentWeek.push(shift);
      if (shift.dayOfWeek === 5 || idx === ferialDays.length - 1) {
        if (currentWeek.length > 0) {
          weeks.push([...currentWeek]);
          currentWeek = [];
        }
      }
    });

    // Rotazione 8 turni Morena (Mercoledì/Giovedì alternati)
    let morenaRotation = 0;
    weeks.forEach((week, weekIndex) => {
      if (morenaRotation >= 8) return;
      
      const wednesday = week.find(s => s.dayOfWeek === 3);
      const thursday = week.find(s => s.dayOfWeek === 4);
      
      if (weekIndex % 2 === 0) {
        // Settimana pari: Mercoledì Mattina + Giovedì Pomeriggio
        if (wednesday && wednesday.morning_shift === 'LIBERO' && morenaRotation < 8) {
          wednesday.morning_shift = 'Morena';
          morenaRotation++;
        }
        if (thursday && thursday.afternoon_shift === 'LIBERO' && morenaRotation < 8) {
          thursday.afternoon_shift = 'Morena';
          morenaRotation++;
        }
      } else {
        // Settimana dispari: Giovedì Mattina + Mercoledì Pomeriggio
        if (thursday && thursday.morning_shift === 'LIBERO' && morenaRotation < 8) {
          thursday.morning_shift = 'Morena';
          morenaRotation++;
        }
        if (wednesday && wednesday.afternoon_shift === 'LIBERO' && morenaRotation < 8) {
          wednesday.afternoon_shift = 'Morena';
          morenaRotation++;
        }
      }
    });

    // Assegna turni feriali a Dario (mattina) e Marco (pomeriggio)
    let darioCount = darioWeekend;
    let marcoCount = marcoWeekend;
    let morenaCount = morenaWeekend + morenaRotation;

    shifts.forEach(shift => {
      if (shift.morning_shift === 'LIBERO' && darioCount < Q_D) {
        shift.morning_shift = 'Dario';
        darioCount++;
      }
      if (shift.afternoon_shift === 'LIBERO' && marcoCount < Q_M) {
        shift.afternoon_shift = 'Marco';
        marcoCount++;
      }
    });

    // Turni jolly per Morena (completa quota)
    shifts.forEach(shift => {
      if (morenaCount >= Q_Mo) return;
      if (shift.morning_shift === 'LIBERO') {
        shift.morning_shift = 'Morena';
        morenaCount++;
      } else if (shift.afternoon_shift === 'LIBERO') {
        shift.afternoon_shift = 'Morena';
        morenaCount++;
      }
    });

    // === FASE 5: Verifica e Pulizia ===
    const finalShifts = shifts.map(s => ({
      date: s.date,
      month_year: s.month_year,
      day_of_week: s.day_of_week,
      morning_shift: s.morning_shift === 'LIBERO' ? 'Chiuso' : s.morning_shift,
      afternoon_shift: s.afternoon_shift === 'LIBERO' ? 'Chiuso' : s.afternoon_shift,
      notes: s.notes
    }));

    bulkCreateShiftsMutation.mutate(finalShifts);
  };

  const exportToICS = (person) => {
    const personShifts = shifts.filter(s => 
      s.morning_shift === person || s.afternoon_shift === person
    );

    if (personShifts.length === 0) {
      alert('Nessun turno da esportare per questa persona');
      return;
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Liberìa//Turni//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    personShifts.forEach(shift => {
      if (!shift.date) return;
      const shiftDate = new Date(shift.date);
      if (isNaN(shiftDate.getTime())) return;
      const dateStr = format(shiftDate, 'yyyyMMdd');
      
      if (shift.morning_shift === person) {
        icsContent.push(
          'BEGIN:VEVENT',
          `DTSTART:${dateStr}T100000`,
          `DTEND:${dateStr}T130000`,
          `SUMMARY:Turno Mattina - ${person}`,
          `DESCRIPTION:Turno mattina presso Liberìa`,
          'END:VEVENT'
        );
      }
      
      if (shift.afternoon_shift === person) {
        icsContent.push(
          'BEGIN:VEVENT',
          `DTSTART:${dateStr}T170000`,
          `DTEND:${dateStr}T200000`,
          `SUMMARY:Turno Pomeriggio - ${person}`,
          `DESCRIPTION:Turno pomeriggio presso Liberìa`,
          'END:VEVENT'
        );
      }
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `turni_${person}_${monthYear}.ics`;
    link.click();
  };

  const calculateStats = () => {
    const year = currentMonth.getFullYear();
    const holidays = italianHolidays(year);
    
    const calculatePersonStats = (person) => {
      const morningCount = shifts.filter(s => s.morning_shift === person).length;
      const afternoonCount = shifts.filter(s => s.afternoon_shift === person).length;
      const total = morningCount + afternoonCount;
      
      const saturday = shifts.filter(s => {
        if (!s.date) return false;
        const date = new Date(s.date);
        if (isNaN(date.getTime())) return false;
        const isSat = getDay(date) === 6;
        return isSat && (s.morning_shift === person || s.afternoon_shift === person);
      }).reduce((sum, s) => sum + (s.morning_shift === person ? 1 : 0) + (s.afternoon_shift === person ? 1 : 0), 0);
      
      const sunday = shifts.filter(s => {
        if (!s.date) return false;
        const date = new Date(s.date);
        if (isNaN(date.getTime())) return false;
        const isSun = getDay(date) === 0;
        return isSun && (s.morning_shift === person || s.afternoon_shift === person);
      }).reduce((sum, s) => sum + (s.morning_shift === person ? 1 : 0) + (s.afternoon_shift === person ? 1 : 0), 0);
      
      const holiday = shifts.filter(s => {
        return s.date && holidays.includes(s.date) && (s.morning_shift === person || s.afternoon_shift === person);
      }).reduce((sum, s) => sum + (s.morning_shift === person ? 1 : 0) + (s.afternoon_shift === person ? 1 : 0), 0);
      
      const preHoliday = shifts.filter(s => {
        if (!s.date) return false;
        const date = new Date(s.date);
        if (isNaN(date.getTime())) return false;
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = format(nextDay, 'yyyy-MM-dd');
        return holidays.includes(nextDayStr) && (s.morning_shift === person || s.afternoon_shift === person);
      }).reduce((sum, s) => sum + (s.morning_shift === person ? 1 : 0) + (s.afternoon_shift === person ? 1 : 0), 0);
      
      return {
        total,
        saturday,
        sunday,
        holiday,
        preHoliday,
        special: saturday + sunday + holiday + preHoliday
      };
    };

    return {
      dario: calculatePersonStats('Dario'),
      marco: calculatePersonStats('Marco'),
      morena: calculatePersonStats('Morena')
    };
  };

  const stats = calculateStats();

  const exportToCSV = () => {
    const headers = ['Data', 'Giorno', 'Turno Mattina', 'Turno Pomeriggio', 'Note'];
    const rows = shifts
      .filter(s => s.date)
      .map(s => {
        const date = new Date(s.date);
        return [
          isNaN(date.getTime()) ? s.date : format(date, 'dd/MM/yyyy'),
          s.day_of_week,
          s.morning_shift || '',
          s.afternoon_shift || '',
          s.notes || ''
        ];
      });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `turni_${monthYear}.csv`;
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
        
        if (values.length < 3) continue;

        const dateParts = values[0].split('/');
        if (dateParts.length !== 3) continue;
        
        const date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        
        const shiftData = {
          date,
          month_year: format(new Date(date), 'yyyy-MM'),
          day_of_week: values[1],
          morning_shift: values[2] || 'Chiuso',
          afternoon_shift: values[3] || 'Chiuso',
          notes: values[4] || ''
        };

        try {
          await base44.entities.Shift.create(shiftData);
        } catch (error) {
          console.error('Error importing shift:', error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      alert('Importazione completata!');
    };
    
    reader.readAsText(file);
    event.target.value = null;
  };

  const exportToPDF = () => {
    let content = `
      <html>
        <head>
          <title>Piano Turni</title>
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
          <h1>Piano Turni - ${format(currentMonth, 'MMMM yyyy', { locale: it })}</h1>
          
          <div class="stats">
            <h2>Statistiche</h2>
            <p><strong>Totale Turni Dario:</strong> ${stats.dario}</p>
            <p><strong>Totale Turni Marco:</strong> ${stats.marco}</p>
            <p><strong>Totale Turni Morena:</strong> ${stats.morena}</p>
          </div>

          <h2>Dettaglio Turni</h2>
          <table>
            <tr>
              <th>Data</th>
              <th>Giorno</th>
              <th>Turno Mattina</th>
              <th>Turno Pomeriggio</th>
              <th>Note</th>
            </tr>
            ${shifts.filter(s => s.date).map(s => {
              const date = new Date(s.date);
              const dateStr = isNaN(date.getTime()) ? s.date : format(date, 'd MMMM yyyy', { locale: it });
              return `
              <tr>
                <td>${dateStr}</td>
                <td>${s.day_of_week}</td>
                <td><strong>${s.morning_shift}</strong></td>
                <td><strong>${s.afternoon_shift}</strong></td>
                <td>${s.notes || '-'}</td>
              </tr>
            `;
            }).join('')}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Piano_Turni_${monthYear}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Tutti i Turni</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare tutti i {shifts.length} turni di questo mese? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllShiftsMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina Tutti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      


      <Dialog open={editingShift !== null} onOpenChange={(open) => !open && setEditingShift(null)}>
        <DialogContent className="bg-white border-2 shadow-2xl" style={{ borderColor: '#45877F' }}>
          <DialogHeader className="bg-white border-b pb-4">
            <DialogTitle className="text-xl font-bold">
              Modifica Turno - {editingShift && editingShift.date && (() => {
                const date = new Date(editingShift.date);
                return isNaN(date.getTime()) ? editingShift.date : format(date, 'd MMMM yyyy', { locale: it });
              })()}
            </DialogTitle>
          </DialogHeader>
          {editingShift && (
            <div className="space-y-4 py-4 bg-white">
              <div>
                <Label className="font-semibold text-base mb-2 block">Turno Mattina (10:00-13:00)</Label>
                <Select
                  value={editingShift.morning_shift}
                  onValueChange={(val) => setEditingShift({...editingShift, morning_shift: val})}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dario">Dario</SelectItem>
                    <SelectItem value="Marco">Marco (eccezionale)</SelectItem>
                    <SelectItem value="Morena">Morena</SelectItem>
                    <SelectItem value="Doppia presenza">Doppia presenza</SelectItem>
                    <SelectItem value="Chiuso">Chiuso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-semibold text-base mb-2 block">Turno Pomeriggio (17:00-20:00)</Label>
                <Select
                  value={editingShift.afternoon_shift}
                  onValueChange={(val) => setEditingShift({...editingShift, afternoon_shift: val})}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Marco">Marco</SelectItem>
                    <SelectItem value="Dario">Dario (eccezionale)</SelectItem>
                    <SelectItem value="Morena">Morena</SelectItem>
                    <SelectItem value="Doppia presenza">Doppia presenza</SelectItem>
                    <SelectItem value="Chiuso">Chiuso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-semibold text-base mb-2 block">Note</Label>
                <Textarea
                  value={editingShift.notes || ''}
                  onChange={(e) => setEditingShift({...editingShift, notes: e.target.value})}
                  placeholder="Note aggiuntive..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter className="bg-white border-t pt-4">
            <Button variant="outline" onClick={() => setEditingShift(null)} className="px-6">
              Annulla
            </Button>
            <Button
              onClick={() => updateShiftMutation.mutate({
                id: editingShift.id,
                data: editingShift
              })}
              style={{ backgroundColor: '#45877F' }}
              className="text-white px-6"
            >
              Salva Modifiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
              <Calendar className="w-10 h-10" style={{ color: '#45877F' }} />
              Turni
            </h1>
            <p className="text-slate-500 mt-2 text-lg">Gestione turni mensili</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="outline" disabled className="min-w-[200px]">
              {format(currentMonth, 'MMMM yyyy', { locale: it })}
            </Button>
            <Button variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={generateMonthlyShifts}
            style={{ backgroundColor: '#45877F' }}
            className="text-white"
            disabled={shifts.length > 0}
          >
            <Plus className="w-5 h-5 mr-2" />
            Genera Turni
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={shifts.length === 0}>
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
          <Button variant="outline" onClick={exportToPDF} disabled={shifts.length === 0}>
            <FileText className="w-5 h-5 mr-2" />
            Esporta PDF
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteAllDialog(true)}
            disabled={shifts.length === 0}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Elimina Tutto
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowStatsDialog(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Dario</h3>
              <User className="w-5 h-5" style={{ color: '#45877F' }} />
            </div>
            <p className="text-3xl font-bold mb-2" style={{ color: '#45877F' }}>{stats.dario.total}</p>
            <p className="text-xs text-slate-500 mb-4">Clicca per dettagli</p>
            <Button variant="outline" size="sm" disabled={stats.dario.total === 0} onClick={(e) => { e.stopPropagation(); exportToICS('Dario'); }} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Scarica Calendario
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowStatsDialog(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Marco</h3>
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-2">{stats.marco.total}</p>
            <p className="text-xs text-slate-500 mb-4">Clicca per dettagli</p>
            <Button variant="outline" size="sm" disabled={stats.marco.total === 0} onClick={(e) => { e.stopPropagation(); exportToICS('Marco'); }} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Scarica Calendario
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowStatsDialog(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Morena</h3>
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-purple-600 mb-2">{stats.morena.total}</p>
            <p className="text-xs text-slate-500 mb-4">Clicca per dettagli</p>
            <Button variant="outline" size="sm" disabled={stats.morena.total === 0} onClick={(e) => { e.stopPropagation(); exportToICS('Morena'); }} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Scarica Calendario
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">Statistiche Dettagliate - {format(currentMonth, 'MMMM yyyy', { locale: it })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" style={{ color: '#45877F' }} />
                    Dario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Totali:</span>
                    <span className="font-bold">{stats.dario.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Sabato:</span>
                    <span className="font-semibold">{stats.dario.saturday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Domenica:</span>
                    <span className="font-semibold">{stats.dario.sunday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Festivi:</span>
                    <span className="font-semibold">{stats.dario.holiday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Prefestivi:</span>
                    <span className="font-semibold">{stats.dario.preHoliday}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-sm font-semibold">Turni Speciali:</span>
                    <span className="font-bold" style={{ color: '#45877F' }}>{stats.dario.special}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Marco
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Totali:</span>
                    <span className="font-bold">{stats.marco.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Sabato:</span>
                    <span className="font-semibold">{stats.marco.saturday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Domenica:</span>
                    <span className="font-semibold">{stats.marco.sunday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Festivi:</span>
                    <span className="font-semibold">{stats.marco.holiday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Prefestivi:</span>
                    <span className="font-semibold">{stats.marco.preHoliday}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-sm font-semibold">Turni Speciali:</span>
                    <span className="font-bold text-blue-600">{stats.marco.special}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-600" />
                    Morena
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Totali:</span>
                    <span className="font-bold">{stats.morena.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Sabato:</span>
                    <span className="font-semibold">{stats.morena.saturday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Domenica:</span>
                    <span className="font-semibold">{stats.morena.sunday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Festivi:</span>
                    <span className="font-semibold">{stats.morena.holiday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Turni Prefestivi:</span>
                    <span className="font-semibold">{stats.morena.preHoliday}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-sm font-semibold">Turni Speciali:</span>
                    <span className="font-bold text-purple-600">{stats.morena.special}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Riepilogo Equità</h4>
                <div className="space-y-1 text-sm">
                  <p>• <strong>Dario vs Marco:</strong> {stats.dario.total === stats.marco.total ? '✅ Perfettamente bilanciati' : `⚠️ Differenza di ${Math.abs(stats.dario.total - stats.marco.total)} turni`}</p>
                  <p>• <strong>Morena:</strong> {stats.morena.total} turni su 16 massimi</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {shifts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 text-lg mb-4">Nessun turno presente per questo mese</p>
            <Button 
              onClick={generateMonthlyShifts}
              style={{ backgroundColor: '#45877F', color: 'white', fontFamily: 'Montserrat', fontWeight: 600 }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Genera Turni Vuoti
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Piano Turni {format(currentMonth, 'MMMM yyyy', { locale: it })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-7 gap-2">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day, idx) => (
                <div key={day} className={`text-center font-semibold text-sm py-2 ${idx >= 5 ? 'text-red-600' : 'text-slate-700'}`}>
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {(() => {
                const start = startOfMonth(currentMonth);
                const end = endOfMonth(currentMonth);
                const days = eachDayOfInterval({ start, end });
                
                const firstDayOfWeek = getDay(start);
                const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
                
                const calendarDays = [];
                for (let i = 0; i < offset; i++) {
                  calendarDays.push(null);
                }
                calendarDays.push(...days);
                
                return calendarDays.map((date, idx) => {
                  if (!date) {
                    return <div key={`empty-${idx}`} className="p-2 min-h-[140px]" />;
                  }
                  
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const shift = shifts.find(s => s.date === dateStr);
                  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                  const dayOfWeek = getDay(date);
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const year = currentMonth.getFullYear();
                  const isHolidayDay = isHoliday(dateStr, year);

                  return (
                    <div
                      key={dateStr}
                      className={`p-2 border rounded-lg min-h-[140px] ${
                        isToday ? 'border-2 border-blue-500 bg-blue-50' : 
                        shift?.morning_shift === 'Chiuso' && shift?.afternoon_shift === 'Chiuso' ? 'border-slate-400 bg-slate-200' :
                        isHolidayDay ? 'border-red-300 bg-red-100' :
                        dayOfWeek === 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'
                      }`}
                    >
                      <div className="mb-2">
                        <p className={`font-bold text-sm ${isHolidayDay ? 'text-red-600' : 'text-black'}`}>
                          {format(date, 'd')}
                        </p>
                        {isHolidayDay && (
                          <p className="text-[9px] text-red-600 font-semibold">FESTIVITÀ</p>
                        )}
                        {shift?.morning_shift === 'Chiuso' && shift?.afternoon_shift === 'Chiuso' && (
                          <p className="text-[9px] text-slate-600 font-semibold">CHIUSO</p>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div>
                          <Label className="text-[10px] text-slate-500 block">Mattina</Label>
                          <Select
                            value={shift?.morning_shift || 'Chiuso'}
                            onValueChange={(val) => {
                              if (shift) {
                                updateShiftMutation.mutate({
                                  id: shift.id,
                                  data: { ...shift, morning_shift: val }
                                });
                              } else {
                                createShiftMutation.mutate({
                                  date: dateStr,
                                  month_year: monthYear,
                                  day_of_week: format(date, 'EEEE', { locale: it }),
                                  morning_shift: val,
                                  afternoon_shift: 'Chiuso'
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dario" className="bg-blue-50">Dario</SelectItem>
                              <SelectItem value="Marco" className="bg-green-50">Marco</SelectItem>
                              <SelectItem value="Morena" className="bg-purple-50">Morena</SelectItem>
                              <SelectItem value="Doppia presenza" className="bg-yellow-50">Doppia</SelectItem>
                              <SelectItem value="Chiuso" className="bg-slate-100">Chiuso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-[10px] text-slate-500 block">Pomeriggio</Label>
                          <Select
                            value={shift?.afternoon_shift || 'Chiuso'}
                            onValueChange={(val) => {
                              if (shift) {
                                updateShiftMutation.mutate({
                                  id: shift.id,
                                  data: { ...shift, afternoon_shift: val }
                                });
                              } else {
                                createShiftMutation.mutate({
                                  date: dateStr,
                                  month_year: monthYear,
                                  day_of_week: format(date, 'EEEE', { locale: it }),
                                  morning_shift: 'Chiuso',
                                  afternoon_shift: val
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Marco" className="bg-green-50">Marco</SelectItem>
                              <SelectItem value="Dario" className="bg-blue-50">Dario</SelectItem>
                              <SelectItem value="Morena" className="bg-purple-50">Morena</SelectItem>
                              <SelectItem value="Doppia presenza" className="bg-yellow-50">Doppia</SelectItem>
                              <SelectItem value="Chiuso" className="bg-slate-100">Chiuso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {shift?.notes && (
                        <p className="text-[9px] text-slate-500 mt-1 italic truncate">📝 {shift.notes}</p>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}