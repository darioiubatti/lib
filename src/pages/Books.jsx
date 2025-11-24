import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import BookCard from "../components/books/BookCard";
import BookForm from "../components/books/BookForm";
import ISBNLookup from "../components/books/ISBNLookup";

export default function Books() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [showISBNLookup, setShowISBNLookup] = useState(false);
  const queryClient = useQueryClient();

  const { data: books = [], isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (bookData) => base44.entities.Book.create(bookData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setShowForm(false);
      setEditingBook(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, bookData }) => base44.entities.Book.update(id, bookData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      setShowForm(false);
      setEditingBook(null);
    },
  });

  const handleSave = (bookData) => {
    if (editingBook) {
      updateMutation.mutate({ id: editingBook.id, bookData });
    } else {
      createMutation.mutate(bookData);
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setShowForm(true);
    setShowISBNLookup(false);
  };

  const handleBookFound = (bookData) => {
    setEditingBook(bookData);
    setShowISBNLookup(false);
    setShowForm(true);
  };

  const filteredBooks = books.filter(book =>
    book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {!showForm && !showISBNLookup ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Libri</h1>
              <p className="text-slate-500 mt-2 text-lg">Gestisci l'inventario della tua libreria</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setEditingBook(null);
                  setShowISBNLookup(true);
                  setShowForm(false);
                }}
                variant="outline"
                className="shadow-lg"
              >
                <Search className="w-5 h-5 mr-2" />
                Aggiungi con ISBN
              </Button>
              <Button
                onClick={() => {
                  setEditingBook(null);
                  setShowForm(true);
                  setShowISBNLookup(false);
                }}
                className="bg-slate-900 hover:bg-slate-800 shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Aggiungi Nuovo Libro
              </Button>
            </div>
          </div>

          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Cerca libri per titolo, autore o categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 border-slate-300 bg-white/80 backdrop-blur-sm"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-lg">Nessun libro trovato</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="wait">
                {filteredBooks.map((book) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <BookCard book={book} onEdit={handleEdit} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      ) : showISBNLookup ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => setShowISBNLookup(false)}
            className="mb-4"
          >
            ← Torna ai Libri
          </Button>
          <ISBNLookup onBookFound={handleBookFound} />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <BookForm
            book={editingBook}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingBook(null);
            }}
            isProcessing={createMutation.isPending || updateMutation.isPending}
          />
        </motion.div>
      )}
    </div>
  );
}