import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, MapPin, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Gallery() {
  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: otherItems = [] } = useQuery({
    queryKey: ['otherItems'],
    queryFn: () => base44.entities.OtherItem.list(),
  });

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.includes('drive.google.com') && url.includes('/file/d/')) {
      const match = url.match(/\/file\/d\/([^/]+)/);
      if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
  };

  const processedBooks = useMemo(() => {
    return books.map(book => {
      const imageUrls = book.image_urls && book.image_urls.length > 0 
        ? book.image_urls 
        : (book.photo_url || book.cover_image_url) ? [book.photo_url || book.cover_image_url] : [];
      
      return {
        ...book,
        imageUrl: imageUrls.length > 0 ? getImageUrl(imageUrls[0]) : null,
        hasImages: imageUrls.length > 0
      };
    });
  }, [books]);

  const processedItems = useMemo(() => {
    return otherItems.map(item => {
      const imageUrls = item.image_urls && item.image_urls.length > 0 
        ? item.image_urls 
        : (item.photo_url || item.cover_image_url) ? [item.photo_url || item.cover_image_url] : [];
      
      return {
        ...item,
        imageUrl: imageUrls.length > 0 ? getImageUrl(imageUrls[0]) : null,
        hasImages: imageUrls.length > 0
      };
    });
  }, [otherItems]);

  const booksWithImages = processedBooks.filter(b => b.hasImages);
  const booksWithoutImages = processedBooks.filter(b => !b.hasImages && b.stock > 0);
  const itemsWithImages = processedItems.filter(i => i.hasImages);
  const itemsWithoutImages = processedItems.filter(i => !i.hasImages && (i.stock || 0) - (i.venduto || 0) > 0);

  const exportBooksWithoutImages = () => {
    const headers = ['ID Univoco', 'Titolo', 'Collocazione'];
    const rows = booksWithoutImages.map(b => [
      b.id_univoco || '',
      b.titolo_composto || '',
      b.collocazione || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'libri_senza_immagini.csv';
    link.click();
  };

  const exportItemsWithoutImages = () => {
    const headers = ['ID Univoco', 'Oggetto', 'Tipo'];
    const rows = itemsWithoutImages.map(i => [
      i.id_univoco || '',
      i.oggetto || '',
      i.tipo_oggetto || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'oggetti_senza_immagini.csv';
    link.click();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black tracking-tight flex items-center gap-3">
          <ImageIcon className="w-10 h-10" style={{ color: '#45877F' }} />
          Galleria
        </h1>
        <p className="text-slate-500 mt-2 text-lg">Visualizza prodotti con e senza immagini</p>
      </div>

      <Tabs defaultValue="books-with" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="books-with">
            Libri con Immagini ({booksWithImages.length})
          </TabsTrigger>
          <TabsTrigger value="books-without">
            Libri senza Immagini ({booksWithoutImages.length})
          </TabsTrigger>
          <TabsTrigger value="items-with">
            Oggetti con Immagini ({itemsWithImages.length})
          </TabsTrigger>
          <TabsTrigger value="items-without">
            Oggetti senza Immagini ({itemsWithoutImages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books-with" className="space-y-4">
          {booksWithImages.length === 0 ? (
            <p className="text-center text-slate-500 py-12">Nessun libro con immagini</p>
          ) : (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {booksWithImages.map((book) => (
                <Card key={book.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-[3/4] bg-slate-100 relative">
                    {book.imageUrl && (
                      <img
                        src={book.imageUrl}
                        alt={book.titolo_composto}
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge style={{ backgroundColor: '#45877F' }} className="text-white text-xs">
                        {book.id_univoco}
                      </Badge>
                      {book.collocazione && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {book.collocazione}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-1 line-clamp-2">{book.titolo_composto}</h3>
                    {book.autore && <p className="text-xs text-slate-600 mb-2">{book.autore}</p>}
                    <p className="text-lg font-bold" style={{ color: '#45877F' }}>
                      €{book.prezzo_online?.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="books-without" className="space-y-4">
          {booksWithoutImages.length === 0 ? (
            <p className="text-center text-slate-500 py-12">Nessun libro senza immagini in stock</p>
          ) : (
            <>
              <Button onClick={exportBooksWithoutImages} style={{ backgroundColor: '#45877F' }} className="text-white">
                <Download className="w-5 h-5 mr-2" />
                Scarica Lista CSV
              </Button>
              <div className="space-y-2">
                {booksWithoutImages.map((book) => (
                <Card key={book.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge style={{ backgroundColor: '#45877F' }} className="text-white font-mono">
                            {book.id_univoco}
                          </Badge>
                          {book.collocazione && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {book.collocazione}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-bold text-lg mb-1">{book.titolo_composto}</h3>
                        {book.autore && <p className="text-sm text-slate-600 mb-2">{book.autore}</p>}
                        <div className="flex gap-4 text-sm text-slate-600">
                          {book.editore && <span>{book.editore}</span>}
                          {book.anno && <span>• {book.anno}</span>}
                          {book.lingua && <span>• {book.lingua}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: '#45877F' }}>
                          €{book.prezzo_online?.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Stock: {book.stock || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="items-with" className="space-y-4">
          {itemsWithImages.length === 0 ? (
            <p className="text-center text-slate-500 py-12">Nessun oggetto con immagini</p>
          ) : (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {itemsWithImages.map((item) => (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-[3/4] bg-slate-100 relative">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.oggetto}
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge style={{ backgroundColor: '#45877F' }} className="text-white text-xs">
                        {item.id_univoco}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.tipo_oggetto}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">{item.oggetto}</h3>
                    <p className="text-lg font-bold" style={{ color: '#45877F' }}>
                      €{item.prezzo_pubblico?.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="items-without" className="space-y-4">
          {itemsWithoutImages.length === 0 ? (
            <p className="text-center text-slate-500 py-12">Nessun oggetto senza immagini in stock</p>
          ) : (
            <>
              <Button onClick={exportItemsWithoutImages} style={{ backgroundColor: '#45877F' }} className="text-white">
                <Download className="w-5 h-5 mr-2" />
                Scarica Lista CSV
              </Button>
              <div className="space-y-2">
                {itemsWithoutImages.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge style={{ backgroundColor: '#45877F' }} className="text-white font-mono">
                            {item.id_univoco}
                          </Badge>
                          <Badge variant="outline">{item.tipo_oggetto}</Badge>
                        </div>
                        <h3 className="font-bold text-lg mb-2">{item.oggetto}</h3>
                        <p className="text-xs text-slate-500">
                          Stock: {item.stock || 0} | Giacenza: {((item.stock || 0) - (item.venduto || 0))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold" style={{ color: '#45877F' }}>
                          €{item.prezzo_pubblico?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}