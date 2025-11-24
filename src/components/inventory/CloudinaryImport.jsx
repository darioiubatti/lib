import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, CheckCircle2, XCircle, Image as ImageIcon } from "lucide-react";

export default function CloudinaryImport({ books, items, onComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [folderPath, setFolderPath] = useState('foto catalogo');
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const updateBookMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Book.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OtherItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherItems'] });
    },
  });

  const fetchCloudinaryImages = async () => {
    setIsLoading(true);
    setError(null);
    setMatches([]);

    try {
      const cloudName = 'denuqodb3';
      const apiKey = '291841583314127';
      const apiSecret = '_9GUp2FoYuuTh2rxYv0zEd7GOVM';

      // Cloudinary API per listare le risorse
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image`;
      
      const auth = btoa(`${apiKey}:${apiSecret}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'upload',
          prefix: folderPath,
          max_results: 500
        })
      });

      if (!response.ok) {
        throw new Error(`Errore Cloudinary: ${response.status}`);
      }

      const data = await response.json();
      
      // Abbina le immagini ai libri/oggetti
      const foundMatches = [];
      
      data.resources.forEach(resource => {
        // Estrai l'ID dal nome del file (es. "foto catalogo/A621.jpg" -> "A621")
        const fileName = resource.public_id.split('/').pop();
        const idMatch = fileName.match(/^([A-Z]+\d+)/);
        
        if (idMatch) {
          const itemId = idMatch[1];
          
          // Cerca nei libri
          const book = books.find(b => b.id_univoco === itemId);
          if (book) {
            foundMatches.push({
              type: 'book',
              id: itemId,
              entityId: book.id,
              entity: book,
              imageUrl: resource.secure_url,
              publicId: resource.public_id,
              hasExistingPhoto: !!(book.photo_url || book.cover_image_url)
            });
            return;
          }
          
          // Cerca negli oggetti
          const item = items.find(i => i.id_univoco === itemId);
          if (item) {
            foundMatches.push({
              type: 'item',
              id: itemId,
              entityId: item.id,
              entity: item,
              imageUrl: resource.secure_url,
              publicId: resource.public_id,
              hasExistingPhoto: !!(item.photo_url || item.cover_image_url)
            });
          }
        }
      });

      setMatches(foundMatches);
      
      if (foundMatches.length === 0) {
        setError('Nessuna corrispondenza trovata. Verifica che i nomi dei file corrispondano agli ID (es. A621.jpg)');
      }
    } catch (err) {
      console.error('Errore durante il fetch da Cloudinary:', err);
      setError(err.message || 'Errore durante il caricamento da Cloudinary');
    } finally {
      setIsLoading(false);
    }
  };

  const applyMatches = async () => {
    setIsLoading(true);
    try {
      for (const match of matches) {
        if (match.type === 'book') {
          await updateBookMutation.mutateAsync({
            id: match.entityId,
            data: {
              ...match.entity,
              photo_url: match.imageUrl
            }
          });
        } else {
          await updateItemMutation.mutateAsync({
            id: match.entityId,
            data: {
              ...match.entity,
              photo_url: match.imageUrl
            }
          });
        }
      }
      
      alert(`✅ ${matches.length} foto abbinate con successo!`);
      setMatches([]);
      if (onComplete) onComplete();
    } catch (err) {
      setError('Errore durante il salvataggio: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-2" style={{ borderColor: '#45877F' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-6 h-6" style={{ color: '#45877F' }} />
          Importa Foto da Cloudinary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="folderPath">Percorso Cartella Cloudinary</Label>
          <Input
            id="folderPath"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="foto catalogo"
          />
          <p className="text-xs text-slate-500">
            Le foto devono essere nominate con l'ID (es. A621.jpg, A622.jpg)
          </p>
        </div>

        <Button
          onClick={fetchCloudinaryImages}
          disabled={isLoading || !folderPath}
          style={{ backgroundColor: '#45877F' }}
          className="text-white w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Caricamento...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Cerca Foto
            </>
          )}
        </Button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {matches.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  {matches.length} corrispondenze trovate
                </span>
              </div>
              <Button
                onClick={applyMatches}
                disabled={isLoading}
                style={{ backgroundColor: '#45877F' }}
                className="text-white"
              >
                {isLoading ? 'Salvataggio...' : 'Applica Tutte'}
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {matches.map((match, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                  <img
                    src={match.imageUrl}
                    alt={match.id}
                    className="w-16 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="font-mono" style={{ backgroundColor: '#45877F' }}>
                        {match.id}
                      </Badge>
                      <Badge variant="outline">
                        {match.type === 'book' ? 'Libro' : 'Oggetto'}
                      </Badge>
                      {match.hasExistingPhoto && (
                        <Badge className="bg-amber-100 text-amber-800">
                          Sovrascrive foto esistente
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 font-medium">
                      {match.entity.titolo_composto || match.entity.oggetto}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}