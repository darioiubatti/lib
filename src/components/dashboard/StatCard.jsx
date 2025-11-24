import React from 'react';
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ title, value, icon: Icon, trend, trendUp, bgGradient }) {
  return (
    <Card className="relative overflow-hidden border-slate-200/60 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${bgGradient} rounded-full opacity-10`} />
      <div className="p-6 relative">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">{value}</h3>
          </div>
          <div className={`p-3 rounded-xl ${bgGradient} bg-opacity-20 shadow-sm`}>
            <Icon className="w-6 h-6 text-slate-700" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-sm">
            {trendUp ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={trendUp ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
              {trend}
            </span>
            <span className="text-slate-500 ml-1">rispetto al mese scorso</span>
          </div>
        )}
      </div>
    </Card>
  );
}