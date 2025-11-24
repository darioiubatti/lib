import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Books from "./Books";

import Authors from "./Authors";

import Orders from "./Orders";

import Inventory from "./Inventory";

import Sale from "./Sale";

import Desiderata from "./Desiderata";

import Gallery from "./Gallery";

import Accounting from "./Accounting";

import FidelityCard from "./FidelityCard";

import CatalogedBooks from "./CatalogedBooks";

import Customers from "./Customers";

import Suppliers from "./Suppliers";

import Shifts from "./Shifts";

import Recommendations from "./Recommendations";

import Cassa from "./Cassa";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Books: Books,
    
    Authors: Authors,
    
    Orders: Orders,
    
    Inventory: Inventory,
    
    Sale: Sale,
    
    Desiderata: Desiderata,
    
    Gallery: Gallery,
    
    Accounting: Accounting,
    
    FidelityCard: FidelityCard,
    
    CatalogedBooks: CatalogedBooks,
    
    Customers: Customers,
    
    Suppliers: Suppliers,
    
    Shifts: Shifts,
    
    Recommendations: Recommendations,
    
    Cassa: Cassa,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Books" element={<Books />} />
                
                <Route path="/Authors" element={<Authors />} />
                
                <Route path="/Orders" element={<Orders />} />
                
                <Route path="/Inventory" element={<Inventory />} />
                
                <Route path="/Sale" element={<Sale />} />
                
                <Route path="/Desiderata" element={<Desiderata />} />
                
                <Route path="/Gallery" element={<Gallery />} />
                
                <Route path="/Accounting" element={<Accounting />} />
                
                <Route path="/FidelityCard" element={<FidelityCard />} />
                
                <Route path="/CatalogedBooks" element={<CatalogedBooks />} />
                
                <Route path="/Customers" element={<Customers />} />
                
                <Route path="/Suppliers" element={<Suppliers />} />
                
                <Route path="/Shifts" element={<Shifts />} />
                
                <Route path="/Recommendations" element={<Recommendations />} />
                
                <Route path="/Cassa" element={<Cassa />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}