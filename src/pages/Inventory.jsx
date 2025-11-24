
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Package } from "lucide-react";
import { motion } from "framer-motion";
import BooksInventory from "../components/inventory/BooksInventory.jsx";
import OtherItemsInventory from "../components/inventory/OtherItemsInventory.jsx";

export default function Inventory() {
  const [selectedType, setSelectedType] = useState(null);

  if (!selectedType) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-black mb-4" style={{ fontFamily: 'Montserrat' }}>Inventario</h1>
            <p className="text-xl text-slate-500">Cosa desideri catalogare?</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card 
                className="group cursor-pointer border-2 border-slate-200 hover:border-black transition-all duration-300 hover:shadow-2xl overflow-hidden"
                onClick={() => setSelectedType('books')}
              >
                <CardContent className="p-12 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg" style={{ backgroundColor: '#45877F' }}>
                    <BookOpen className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-black mb-3" style={{ fontFamily: 'Montserrat' }}>Libri</h2>
                  <p className="text-slate-600">Gestisci l'inventario dei libri con tutti i dettagli bibliografici</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card 
                className="group cursor-pointer border-2 border-slate-200 hover:border-black transition-all duration-300 hover:shadow-2xl overflow-hidden"
                onClick={() => setSelectedType('other')}
              >
                <CardContent className="p-12 text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-black rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Package className="w-12 h-12" style={{ color: '#45877F' }} />
                  </div>
                  <h2 className="text-3xl font-bold text-black mb-3" style={{ fontFamily: 'Montserrat' }}>Altro</h2>
                  <p className="text-slate-600">Gestisci opere, vinili, giochi e altri oggetti</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {selectedType === 'books' ? (
        <BooksInventory onBack={() => setSelectedType(null)} />
      ) : (
        <OtherItemsInventory onBack={() => setSelectedType(null)} />
      )}
    </div>
  );
}
