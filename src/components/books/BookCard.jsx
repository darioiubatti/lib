import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Package } from "lucide-react";

export default function BookCard({ book, onEdit }) {
  const isLowStock = book.stock_quantity < 10;

  return (
    <Card className="group overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative h-64 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {book.cover_image_url ? (
          <img 
            src={book.cover_image_url} 
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-slate-400" />
          </div>
        )}
        {book.featured && (
          <Badge className="absolute top-3 right-3 bg-amber-500 text-white border-0 shadow-lg">
            In Evidenza
          </Badge>
        )}
        {isLowStock && (
          <Badge className="absolute top-3 left-3 bg-red-500 text-white border-0 shadow-lg">
            Scorte Basse
          </Badge>
        )}
      </div>
      
      <div className="p-5">
        <div className="mb-3">
          <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{book.title}</h3>
          <p className="text-sm text-slate-500 mt-1">{book.author_name}</p>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
            {book.category}
          </Badge>
          <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
            Giacenza: {book.stock_quantity}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <p className="text-2xl font-bold text-slate-900">€{book.price?.toFixed(2)}</p>
          <Button 
            onClick={() => onEdit(book)}
            size="sm"
            variant="outline"
            className="hover:bg-slate-900 hover:text-white transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifica
          </Button>
        </div>
      </div>
    </Card>
  );
}