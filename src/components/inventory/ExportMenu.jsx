import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ExportMenu({ items, onClose, entityType }) {
  const [format, setFormat] = useState('csv');
  const [period, setPeriod] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  const handleExport = () => {
    let filteredItems = [...items];

    // Filtra per periodo
    if (period !== 'all') {
      const days = parseInt(period);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      filteredItems = filteredItems.filter(item => {
        const createdDate = new Date(item.created_date);
        return createdDate >= cutoffDate;
      });
    }

    // Filtra per stock
    if (stockFilter === 'zero') {
      filteredItems = filteredItems.filter(item => (item.stock || 0) === 0);
    }

    const headers = entityType === 'Book' ? [
      'ID Univoco', 'Prezzo Online', 'Collocazione', 'Stock', 'Autore', 'Autore Alfa',
      'Titolo Composto', 'Descrizione', 'Anno', 'Luogo', 'Editore', 'Collana', 'ISBN',
      'Peso Gr', 'Lingua', 'Stato Conservazione', 'Condizione'
    ] : [
      'ID Univoco', 'Tipo Oggetto', 'Oggetto', 'Prezzo Pubblico', 'Stock', 'Costo',
      'Contovendita', 'Proprietario', 'Giacenza'
    ];

    const rows = filteredItems.map(item => 
      entityType === 'Book' ? [
        item.id_univoco, item.prezzo_online, item.collocazione, item.stock, item.autore,
        item.autore_alfa, item.titolo_composto, item.descrizione, item.anno, item.luogo,
        item.editore, item.collana, item.isbn, item.peso_gr, item.lingua,
        item.stato_conservazione, item.condizione
      ] : [
        item.id_univoco, item.tipo_oggetto, item.oggetto, item.prezzo_pubblico, item.stock,
        item.costo, item.contovendita, item.proprietario, item.giacenza
      ]
    );

    const separator = format === 'csv' ? ',' : '\t';
    const fileExtension = format === 'csv' ? 'csv' : 'txt';
    
    const content = [
      headers.join(separator),
      ...rows.map(row => row.map(cell => {
        const cellStr = (cell !== null && cell !== undefined) ? String(cell) : '';
        if (format === 'csv') {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr.replace(/\t/g, ' ').replace(/\n/g, ' ');
      }).join(separator))
    ].join('\n');

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${entityType === 'Book' ? 'libri' : 'oggetti'}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
    link.click();

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Opzioni Esportazione</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="format">Formato</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="txt">TXT (con tabulatore)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="period">Periodo</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id="period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="7">Ultimi 7 giorni</SelectItem>
                <SelectItem value="15">Ultimi 15 giorni</SelectItem>
                <SelectItem value="30">Ultimi 30 giorni</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="stock">Disponibilità</Label>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger id="stock">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="zero">Solo con disponibilità 0</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExport}
            className="w-full"
            style={{ backgroundColor: '#45877F' }}
          >
            <Download className="w-5 h-5 mr-2" />
            Esporta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}