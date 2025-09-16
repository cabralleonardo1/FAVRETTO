import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// Import components
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ClientsManager from './components/ClientsManager';
import SellersManager from './components/SellersManager';
import PriceTableManager from './components/PriceTableManager';
import BudgetCreator from './components/BudgetCreator';
import BudgetsList from './components/BudgetsList';
import CommissionsManager from './components/CommissionsManager';
import Navbar from './components/Navbar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add axios interceptors for better auth handling
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Moved 401 handling to individual components to avoid forced page reloads

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get(`${API}/auth/me`);
        setUser(response.data);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    }
    setLoading(false);
  };

  const login = async (credentials) => {
    try {
      const response = await axios.post(`${API}/auth/login`, credentials);
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      
      toast.success('Login realizado com sucesso!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Erro ao fazer login';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logout realizado com sucesso!');
  };

  const handleAuthError = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.error('Sessão expirada. Faça login novamente.');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Toaster position="top-right" />
        
        {user ? (
          <>
            <Navbar user={user} onLogout={logout} />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Dashboard user={user} />} />
                <Route path="/clients" element={<ClientsManager />} />
                <Route path="/sellers" element={<SellersManager onAuthError={handleAuthError} />} />
                <Route path="/price-table" element={<PriceTableManager user={user} onAuthError={handleAuthError} />} />
                <Route path="/budgets/new" element={<BudgetCreator user={user} onAuthError={handleAuthError} />} />
                <Route path="/budgets/edit/:budgetId" element={<BudgetCreator user={user} onAuthError={handleAuthError} mode="edit" />} />
                <Route path="/budgets" element={<BudgetsList onAuthError={handleAuthError} />} />
                <Route path="/commissions" element={<CommissionsManager />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={login} />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;