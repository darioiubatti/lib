import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save } from "lucide-react";

const categories = [
  "Narrativa", "Saggistica", "Giallo e Thriller", "Romantico", 
  "Fantascienza e Fantasy", "Biografia e Memorie", "Storia", 
  "Economia e Business", "Sviluppo Personale", "Poesia", "Libri per Bambini", 
  "Young Adult", "Cucina", "Arte e Fotografia", "Viaggi", 
  "Scienza e Tecnologia", "Altro"
];

export default function BookForm({ book, onSave, onCancel, isProcessing }) {
  const [formData, setFormData] = useState(book || {
    title: '',
    author_name: '',
    isbn: '',
    price: 0,
    cost: 0,
    stock_quantity: 0,
    category: 'Narrativa',
    description: '',
    cover_image_url: '',
    publisher: '',
    publication_year: new Date().getFullYear(),
    pages: 0,
    language: 'Italiano',
    featured: false
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="border-b border-slate-200/60">
        <CardTitle className="text-2xl font-bold text-slate-900">
          {book ? 'Modifica Libro' : 'Aggiungi Nuovo Libro'}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author_name">Autore *</Label>
              <Input
                id="author_name"
                value={formData.author_name}
                onChange={(e) => handleChange('author_name', e.target.value)}
                required
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                value={formData.isbn}
                onChange={(e) => handleChange('isbn', e.target.value)}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Prezzo *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                required
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Costo</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => handleChange('cost', parseFloat(e.target.value))}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Quantità in Giacenza</Label>
              <Input
                id="stock_quantity"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => handleChange('stock_quantity', parseInt(e.target.value))}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publisher">Editore</Label>
              <Input
                id="publisher"
                value={formData.publisher}
                onChange={(e) => handleChange('publisher', e.target.value)}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="publication_year">Anno di Pubblicazione</Label>
              <Input
                id="publication_year"
                type="number"
                value={formData.publication_year}
                onChange={(e) => handleChange('publication_year', parseInt(e.target.value))}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pages">Pagine</Label>
              <Input
                id="pages"
                type="number"
                value={formData.pages}
                onChange={(e) => handleChange('pages', parseInt(e.target.value))}
                className="border-slate-300"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cover_image_url">URL Immagine Copertina</Label>
            <Input
              id="cover_image_url"
              value={formData.cover_image_url}
              onChange={(e) => handleChange('cover_image_url', e.target.value)}
              placeholder="https://..."
              className="border-slate-300"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="border-slate-300"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t border-slate-200/60 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            <X className="w-4 h-4 mr-2" />
            Annulla
          </Button>
          <Button
            type="submit"
            disabled={isProcessing}
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Save className="w-4 h-4 mr-2" />
            {isProcessing ? 'Salvataggio...' : 'Salva Libro'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}