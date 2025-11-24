
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Package, Heart, Image, Calculator, Award, BookMarked, Users, Wallet, Clock, Lightbulb, ShoppingBag, FileText } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    pageName: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Cassa",
    pageName: "Cassa",
    url: createPageUrl("Cassa"),
    icon: ShoppingBag,
  },
  {
    title: "Libri Catalogati",
    pageName: "CatalogedBooks",
    url: createPageUrl("CatalogedBooks"),
    icon: BookMarked,
  },
  {
    title: "Consigli",
    pageName: "Recommendations",
    url: createPageUrl("Recommendations"),
    icon: Lightbulb,
  },
  {
    title: "Fidelity Card",
    pageName: "FidelityCard",
    url: createPageUrl("FidelityCard"),
    icon: Award,
  },
  {
    title: "Desiderata/Prenotazioni",
    pageName: "Desiderata",
    url: createPageUrl("Desiderata"),
    icon: Heart,
  },
  {
    title: "Clienti",
    pageName: "Customers",
    url: createPageUrl("Customers"),
    icon: Users,
  },
];

const otherItems = [
  {
    title: "Inventario",
    pageName: "Inventory",
    url: createPageUrl("Inventory"),
    icon: Package,
  },
  {
    title: "Galleria",
    pageName: "Gallery",
    url: createPageUrl("Gallery"),
    icon: Image,
  },
  {
    title: "Contabilità",
    pageName: "Accounting",
    url: createPageUrl("Accounting"),
    icon: Calculator,
  },
  {
    title: "Turni",
    pageName: "Shifts",
    url: createPageUrl("Shifts"),
    icon: Clock,
  },
  {
    title: "Fornitori",
    pageName: "Suppliers",
    url: createPageUrl("Suppliers"),
    icon: Wallet,
  },
];

export default function Layout({ children, currentPageName }) {
  const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a4989ccd24d15996cb573/5fd85a247_logo.png';

  return (
    <SidebarProvider>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        :root {
          --primary: #000000;
          --primary-light: #1a1a1a;
          --accent: #45877F;
          --accent-hover: #5a9d95;
          --background: #ffffff;
          --text-primary: #000000;
          --text-secondary: #64748b;
          --text-disabled: #cbd5e1;
        }
        
        * {
          font-family: 'DM Sans', sans-serif;
        }
        
        h1, h2, h3, h4, h5, h6, button, .font-heading {
          font-family: 'Montserrat', sans-serif;
        }
        
        .btn-primary {
          background-color: #45877F;
          color: white;
          font-family: 'Montserrat', sans-serif;
          font-weight: 600;
        }
        
        .btn-primary:hover {
          background-color: white;
          color: #45877F;
          border: 2px solid #45877F;
        }
        
        .btn-primary:active {
          background-color: #000000;
          color: white;
          border: 2px solid #000000;
        }
        
        .btn-primary:disabled {
          background-color: white;
          color: #cbd5e1;
          border: 1px solid #e2e8f0;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-white">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-200 p-6" style={{ backgroundColor: '#45877F' }}>
            <div className="flex items-center gap-3">
              <img 
                src={logoUrl} 
                alt="Liberìa Logo" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h2 className="font-bold text-white text-lg tracking-tight">LIBERÌA</h2>
                <p className="text-xs text-black font-medium">Sistema di Gestione</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                Principale
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const isActive = currentPageName === item.pageName;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`transition-all duration-200 rounded-xl mb-1 ${
                            isActive 
                              ? 'bg-black text-white shadow-lg' 
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className={`w-5 h-5 ${isActive ? '' : ''}`} style={isActive ? { color: '#45877F' } : {}} />
                            <span className="font-semibold">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                Altro
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {otherItems.map((item) => {
                    const isActive = currentPageName === item.pageName;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`transition-all duration-200 rounded-xl mb-1 ${
                            isActive 
                              ? 'bg-black text-white shadow-lg' 
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className={`w-5 h-5 ${isActive ? '' : ''}`} style={isActive ? { color: '#45877F' } : {}} />
                            <span className="font-semibold">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-4 md:hidden sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <div className="flex items-center gap-2">
                <img 
                  src={logoUrl} 
                  alt="Liberìa Logo" 
                  className="w-5 h-5 object-contain"
                />
                <h1 className="text-xl font-bold text-black">LIBERÌA</h1>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-white">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
