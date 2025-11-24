import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function LowStockAlert({ books }) {
  const lowStockBooks = books.filter(book => (book.stock || 0) < 10);

  return (
    <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-200/60 pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          Allarme Scorte Basse
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {lowStockBooks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Tutti i libri sono ben forniti
          </div>
        ) : (
          <div className="space-y-3">
            {lowStockBooks.slice(0, 5).map((book) => (
              <div key={book.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200/60">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{book.titolo_composto}</p>
                  <p className="text-sm text-slate-500">{book.autore}</p>
                </div>
                <Badge variant="outline" className="bg-white border-amber-300 text-amber-700 font-bold">
                  {book.stock || 0} rimasti
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}