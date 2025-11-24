import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Plus, User, BookOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function Authors() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', bio: '', photo_url: '', nationality: '', birth_year: '' });
  const queryClient = useQueryClient();

  const { data: authors = [] } = useQuery({
    queryKey: ['authors'],
    queryFn: () => base44.entities.Author.list('-created_date'),
  });

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const createMutation = useMutation({
    mutationFn: (authorData) => base44.entities.Author.create(authorData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      setShowForm(false);
      setFormData({ name: '', bio: '', photo_url: '', nationality: '', birth_year: '' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getBookCountForAuthor = (authorName) => {
    return books.filter(book => book.author_name === authorName).length;
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Autori</h1>
          <p className="text-slate-500 mt-2 text-lg">Gestisci i profili degli autori</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-900 hover:bg-slate-800 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Aggiungi Autore
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8"
          >
            <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-xl">
              <CardHeader className="border-b border-slate-200/60">
                <h2 className="text-2xl font-bold text-slate-900">Aggiungi Nuovo Autore</h2>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nome *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Nazionalità</label>
                      <Input
                        value={formData.nationality}
                        onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Anno di Nascita</label>
                      <Input
                        type="number"
                        value={formData.birth_year}
                        onChange={(e) => setFormData({ ...formData, birth_year: parseInt(e.target.value) })}
                        className="border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">URL Foto</label>
                      <Input
                        value={formData.photo_url}
                        onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Biografia</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full rounded-md border border-slate-300 p-3"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                      Annulla
                    </Button>
                    <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                      Salva Autore
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {authors.map((author) => (
          <Card key={author.id} className="border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden">
                  {author.photo_url ? (
                    <img src={author.photo_url} alt={author.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900">{author.name}</h3>
                  {author.nationality && (
                    <p className="text-sm text-slate-500">{author.nationality}</p>
                  )}
                  {author.birth_year && (
                    <p className="text-sm text-slate-500">Nato nel {author.birth_year}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <BookOpen className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700">
                      {getBookCountForAuthor(author.name)} libri
                    </span>
                  </div>
                </div>
              </div>
              {author.bio && (
                <p className="text-sm text-slate-600 mt-4 line-clamp-3">{author.bio}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}