import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [data, setData] = useState({
    clients: [],
    factures: [],
    bankTransactions: [],
    rhStates: [],
    auditHistory: [],
    employees: [],
    quotes: [],
    loading: true,
    error: null
  });

  const refreshAll = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true }));
    try {
      const [clients, factures, transactions, rhStates, audit, quotes, employees] = await Promise.all([
        api.get('/clients'),
        api.get('/invoices'),
        api.get('/bank/transactions'),
        api.get('/rh-states'),
        api.get('/audit-history'),
        api.get('/quotes'),
        api.get('/employees')
      ]);

      setData({
        clients: clients || [],
        factures: factures || [],
        bankTransactions: transactions || [],
        rhStates: rhStates || [],
        auditHistory: audit || [],
        quotes: quotes || [],
        employees: employees || [],
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setData(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // CRUD Operations
  const addClient = async (client) => {
    const res = await api.post('/clients', client);
    setData(prev => ({ ...prev, clients: [res, ...prev.clients] }));
    return res;
  };

  const updateClient = async (id, client) => {
    const res = await api.put(`/clients/${id}`, client);
    setData(prev => ({ ...prev, clients: prev.clients.map(c => c.id === id ? res : c) }));
    return res;
  };

  const deleteClient = async (id) => {
    await api.delete(`/clients/${id}`);
    setData(prev => ({ ...prev, clients: prev.clients.filter(c => c.id !== id) }));
  };

  const addInvoice = async (invoice) => {
    const res = await api.post('/invoices', invoice);
    setData(prev => ({ ...prev, factures: [res, ...prev.factures] }));
    return res;
  };

  const updateInvoice = async (id, invoice) => {
    const res = await api.put(`/invoices/${id}`, invoice);
    setData(prev => ({ ...prev, factures: prev.factures.map(f => f.id === id ? res : f) }));
    return res;
  };

  const deleteInvoice = async (id) => {
    await api.delete(`/invoices/${id}`);
    setData(prev => ({ ...prev, factures: prev.factures.filter(f => f.id !== id) }));
  };

  const addBankTransaction = async (tx) => {
    const res = await api.post('/bank/transactions', tx);
    setData(prev => ({ ...prev, bankTransactions: [res, ...prev.bankTransactions] }));
    return res;
  };

  const updateBankTransaction = async (id, tx) => {
    const res = await api.put(`/bank/transactions/${id}`, tx);
    setData(prev => ({ ...prev, bankTransactions: prev.bankTransactions.map(t => t.id === id ? res : t) }));
    return res;
  };

  const deleteBankTransaction = async (id) => {
    await api.delete(`/bank/transactions/${id}`);
    setData(prev => ({ ...prev, bankTransactions: prev.bankTransactions.filter(t => t.id !== id) }));
  };

  const addQuote = async (quote) => {
    const res = await api.post('/quotes', quote);
    setData(prev => ({ ...prev, quotes: [res, ...prev.quotes] }));
    return res;
  };

  const updateQuote = async (id, quote) => {
    const res = await api.put(`/quotes/${id}`, quote);
    setData(prev => ({ ...prev, quotes: prev.quotes.map(q => q.id === id ? res : q) }));
    return res;
  };

  const deleteQuote = async (id) => {
    await api.delete(`/quotes/${id}`);
    setData(prev => ({ ...prev, quotes: prev.quotes.filter(q => q.id !== id) }));
  };

  const addEmployee = async (employee) => {
    const res = await api.post('/employees', employee);
    setData(prev => ({ ...prev, employees: [res, ...prev.employees] }));
    return res;
  };

  const updateEmployee = async (id, employee) => {
    const res = await api.put(`/employees/${id}`, employee);
    setData(prev => ({ ...prev, employees: prev.employees.map(e => e.id === id ? res : e) }));
    return res;
  };

  const deleteEmployee = async (id) => {
    await api.delete(`/employees/${id}`);
    setData(prev => ({ ...prev, employees: prev.employees.filter(e => e.id !== id) }));
  };

  return (
    <DataContext.Provider value={{
      ...data,
      refreshAll,
      addClient, updateClient, deleteClient,
      addInvoice, updateInvoice, deleteInvoice,
      addBankTransaction, updateBankTransaction, deleteBankTransaction,
      addQuote, updateQuote, deleteQuote,
      addEmployee, updateEmployee, deleteEmployee
    }}>
      {children}
    </DataContext.Provider>
  );
};
