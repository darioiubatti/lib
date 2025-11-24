import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Image as ImageIcon } from "lucide-react";

export default function OtherItemCard({ item, onEdit }) {
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

  const images = item.image_urls && item.image_urls.length > 0 
    ? item.image_urls 
    : (item.photo_url || item.cover_image_url) 
      ? [item.photo_url || item.cover_image_url] 
      : [];

  const imageUrl = images.length > 0 ? getImageUrl(images[0]) : null;
  const hasMultipleImages = images.length > 1;

  const isContoVendita = item.contovendita === 'SI';
  const giacenza = (item.stock || 0) - (item.venduto || 0);

  return (
    <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {imageUrl && (
            <div className="w-24 h-32 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden relative">
              <img
                src={imageUrl}
                alt={item.oggetto}
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
                    {item.id_univoco}
                  </Badge>
                  {item.is_incomplete && (
                    <Badge className="bg-orange-500 text-white font-semibold">
                      Scheda Incompleta
                    </Badge>
                  )}
                  <Badge variant="outline">{item.tipo_oggetto}</Badge>
                  {isContoVendita && (
                    <Badge className="bg-blue-600 text-white">Conto Vendita</Badge>
                  )}
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-1">
                  {item.oggetto}
                </h3>
                {isContoVendita && item.proprietario && (
                  <p className="text-sm text-slate-600">Proprietario: {item.proprietario}</p>
                )}
              </div>
              <Button
                onClick={() => onEdit(item)}
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
                <p className="font-bold text-slate-900">€{item.prezzo_pubblico?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stock</p>
                <p className="font-bold text-slate-900">{item.stock || 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Giacenza</p>
                <p className={`font-bold ${giacenza < 1 ? 'text-red-600' : 'text-slate-900'}`}>
                  {giacenza}
                </p>
              </div>
              {isContoVendita && (
                <div>
                  <p className="text-xs text-slate-500">Da Pagare</p>
                  <p className="font-bold text-amber-600">€{item.da_pagare_art?.toFixed(2) || '0.00'}</p>
                </div>
              )}
            </div>

            {isContoVendita && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500">Venduto</p>
                    <p className="font-semibold text-slate-700">{item.venduto || 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Ricavo Fornitore</p>
                    <p className="font-semibold text-blue-600">€{item.ricavo_fornitore?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Ricavo Libreria</p>
                    <p className="font-semibold text-green-600">€{item.ricavo_libreria?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}