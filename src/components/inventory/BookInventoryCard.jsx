import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, MapPin, Image as ImageIcon } from "lucide-react";

export default function BookInventoryCard({ book, onEdit }) {
  const getImageUrl = (url) => {
    if (!url) return null;
    
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
      const match = url.match(/\/file\/d\/([^/]+)/);
      if (match) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }
    
    return url;
  };

  const images = book.image_urls && book.image_urls.length > 0 
    ? book.image_urls 
    : (book.photo_url || book.cover_image_url) 
      ? [book.photo_url || book.cover_image_url] 
      : [];

  const imageUrl = images.length > 0 ? getImageUrl(images[0]) : null;
  const hasMultipleImages = images.length > 1;

  return (
    <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {imageUrl && (
            <div className="w-24 h-32 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden relative">
              <img
                src={imageUrl}
                alt={book.titolo_composto}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {hasMultipleImages && (
                <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {images.length}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge style={{ backgroundColor: '#45877F' }} className="text-white font-mono font-bold">
                    {book.id_univoco}
                  </Badge>
                  {book.is_incomplete && (
                    <Badge className="bg-orange-500 text-white font-semibold">
                      Scheda Incompleta
                    </Badge>
                  )}
                  {book.collocazione && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {book.collocazione}
                    </Badge>
                  )}
                  {book.condizione === 'Nuovo' && (
                    <Badge className="bg-green-600 text-white">Nuovo</Badge>
                  )}
                  {book.prima_edizione && (
                    <Badge className="bg-purple-600 text-white">Prima Ed.</Badge>
                  )}
                  {book.autografato && (
                    <Badge className="bg-amber-600 text-white">Autografato</Badge>
                  )}
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1">
                  {book.titolo_composto}
                </h3>
                {book.autore && (
                  <p className="text-sm text-slate-600 mb-1">{book.autore}</p>
                )}
              </div>
              <Button
                onClick={() => onEdit(book)}
                size="sm"
                variant="outline"
                className="flex-shrink-0"
              >
                <Edit className="w-4 h-4 mr-1" />
                Modifica
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div>
                <p className="text-xs text-slate-500">Prezzo</p>
                <p className="font-bold text-slate-900">€{book.prezzo_online?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stock</p>
                <p className={`font-bold ${book.stock < 5 ? 'text-red-600' : 'text-slate-900'}`}>
                  {book.stock || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stato</p>
                <p className="text-sm text-slate-700">{book.stato_conservazione}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Anno</p>
                <p className="text-sm text-slate-700">{book.anno || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
              {book.editore && <span>{book.editore}</span>}
              {book.luogo && <span>• {book.luogo}</span>}
              {book.legatura && <span>• {book.legatura}</span>}
              {book.lingua && <span>• {book.lingua}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}