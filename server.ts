/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { OpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  // Vercel, Hostinger node instances, or Heroku define process.env.PORT. AI Studio uses 3000 implicitly based on internal proxy.
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Lazy initialize the OpenAI SDK safely
  let openaiClient: OpenAI | null = null;
  function getOpenAi(): OpenAI | null {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }
    if (!openaiClient) {
      openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
  }

  // Lazy initialize the Gemini SDK safely
  let geminiClient: GoogleGenAI | null = null;
  function getGemini(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    if (!geminiClient) {
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return geminiClient;
  }

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Initialize Supabase Client if env secrets exist
  let supabaseClient: any = null;
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_KEY || '';

  const tablesReady = {
    transactions: false,
    budget_goals: false,
    system_settings: false,
    clients: false
  };

  const tables = {
    transactions: 'leadium_transactions',
    budget_goals: 'leadium_budget_goals',
    system_settings: 'system_settings',
    clients: 'leadium_clients'
  };

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      console.log('--- SUPABASE DATABASE CLIENT ACTIVE ---');
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
    }
  } else {
    console.log('--- SUPABASE SECRETS MISSING: USING FULL-STACK LOCAL FILE STORAGE AUTOSYNC ---');
  }

  async function probeSupabaseTables() {
    if (!supabaseClient) return;
    try {
      // Test leadium_transactions
      const { error: txNewErr } = await supabaseClient
        .from('leadium_transactions')
        .select('id')
        .limit(1);
      
      if (!txNewErr) {
        tables.transactions = 'leadium_transactions';
        tablesReady.transactions = true;
        console.log('Supabase check: leadium_transactions table is ready.');
      } else {
        const { error: txOldErr } = await supabaseClient
          .from('transactions')
          .select('id')
          .limit(1);
        if (!txOldErr) {
          tables.transactions = 'transactions';
          tablesReady.transactions = true;
          console.log('Supabase check: Fallback transactions table is ready.');
        } else {
          tables.transactions = 'leadium_transactions';
          tablesReady.transactions = false;
          console.warn('Supabase info: leadium_transactions/transactions tables are not ready:', txNewErr.message);
        }
      }

      // Test leadium_budget_goals
      const { error: goalsNewErr } = await supabaseClient
        .from('leadium_budget_goals')
        .select('id')
        .limit(1);
      
      if (!goalsNewErr) {
        tables.budget_goals = 'leadium_budget_goals';
        tablesReady.budget_goals = true;
        console.log('Supabase check: leadium_budget_goals table is ready.');
      } else {
        const { error: goalsOldErr } = await supabaseClient
          .from('budget_goals')
          .select('id')
          .limit(1);
        if (!goalsOldErr) {
          tables.budget_goals = 'budget_goals';
          tablesReady.budget_goals = true;
          console.log('Supabase check: Fallback budget_goals table is ready.');
        } else {
          tables.budget_goals = 'leadium_budget_goals';
          tablesReady.budget_goals = false;
          console.warn('Supabase info: leadium_budget_goals/budget_goals tables are not ready:', goalsNewErr.message);
        }
      }

      // Test system_settings table
      const { error: settingsErr } = await supabaseClient
        .from('system_settings')
        .select('key')
        .limit(1);

      if (settingsErr) {
        tablesReady.system_settings = false;
        console.warn('Supabase info: system_settings table not ready or accessible:', settingsErr.message);
      } else {
        tablesReady.system_settings = true;
        console.log('Supabase check: system_settings table is ready.');
      }

      // Test leadium_clients
      const { error: clientsErr } = await supabaseClient
        .from('leadium_clients')
        .select('id')
        .limit(1);

      if (!clientsErr) {
        tablesReady.clients = true;
        console.log('Supabase check: leadium_clients table is ready.');
      } else {
        console.warn('Supabase info: leadium_clients table not ready:', clientsErr.message);
      }
    } catch (err: any) {
      console.warn('Supabase check: Table check failed, bypassing Supabase sync:', err.message || err);
    }
  }

  if (supabaseClient) {
    await probeSupabaseTables();
  }

  // Local JSON Backup File path
  const DB_FILE_PATH = path.join(process.cwd(), 'data-store.json');

  // Verify and seed local JSON database (in case Supabase keys are not set yet)
  function fetchLocalDbData() {
    if (!fs.existsSync(DB_FILE_PATH)) {
      const defaultState = {
        transactions: [],
        budgetGoals: [
          { id: 'Investimentos', name: 'Investimentos', allocated: 2000, spent: 0 },
          { id: 'Salários', name: 'Salários', allocated: 5000, spent: 0 },
          { id: 'Custo Mensal', name: 'Custo Mensal', allocated: 3000, spent: 0 },
          { id: 'Emergências', name: 'Emergências', allocated: 1500, spent: 0 },
          { id: 'Despesa Variável', name: 'Despesa Variável', allocated: 1000, spent: 0 }
        ],
        clients: [],
        faturamento_meta: 100000
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(defaultState, null, 2), 'utf-8');
      return defaultState;
    }
    try {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error parsing local db file:', e);
      return { transactions: [], budgetGoals: [], clients: [], faturamento_meta: 100000 };
    }
  }

  function writeLocalDbData(data: any) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing local db:', e);
    }
  }

  // Helper getters/setters supporting clean dual-writes
  async function loadTransactions() {
    if (supabaseClient && tablesReady.transactions) {
      try {
        const { data, error } = await supabaseClient
          .from(tables.transactions)
          .select('*')
          .order('date', { ascending: false });
        if (!error && data) {
          return data.map((t: any) => ({
            id: t.id,
            date: t.date,
            description: t.description || '',
            sender: t.sender || '',
            type: t.type,
            amount: Number(t.amount) || 0,
            category: t.category || '',
            account: t.account || '',
            avatarUrl: t.avatar_url || '',
            notes: t.notes || '',
            clientId: t.client_id || undefined
          }));
        } else if (error) {
          console.warn('[Supabase Sync Logger] Fetch transactions issue:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase Sync Logger] Failed to query transactions:', err.message || err);
      }
    }
    const local = fetchLocalDbData();
    return local.transactions || [];
  }

  async function loadGoals() {
    if (supabaseClient && tablesReady.budget_goals) {
      try {
        const { data, error } = await supabaseClient
          .from(tables.budget_goals)
          .select('*');
        if (!error && data && data.length > 0) {
          return data.map((g: any) => ({
            id: g.id || g.name,
            name: g.name,
            allocated: Number(g.allocated) || 0,
            spent: Number(g.spent) || 0
          }));
        } else if (error) {
          console.warn('[Supabase Sync Logger] Fetch goals issue:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase Sync Logger] Failed to query goals:', err.message || err);
      }
    }
    const local = fetchLocalDbData();
    return local.budgetGoals || [];
  }

  async function loadClients() {
    if (supabaseClient && tablesReady.clients) {
      try {
        const { data, error } = await supabaseClient
          .from(tables.clients)
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((c: any) => ({
            id: c.id,
            name: c.name,
            contract_value: Number(c.contract_value) || 0,
            is_recurring: c.is_recurring,
            status: c.status,
            email: c.email || '',
            phone: c.phone || '',
            segment: c.segment || '',
            start_date: c.start_date || '',
            notes: c.notes || ''
          }));
        } else if (error) {
          console.warn('[Supabase Sync Logger] Fetch clients issue:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase Sync Logger] Failed to query clients:', err.message || err);
      }
    }
    const local = fetchLocalDbData();
    return local.clients || [];
  }

  async function loadRevenueGoal() {
    if (supabaseClient && tablesReady.system_settings) {
      try {
        const { data, error } = await supabaseClient
          .from('system_settings')
          .select('*')
          .eq('key', 'faturamento_meta')
          .single();
        if (!error && data && data.value) {
          return Number(data.value.value) || 100000;
        } else if (error) {
          console.log('[Supabase Sync Logger] Key faturamento_meta empty, using fallback:', error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase Sync Logger] Failed to query faturamento_meta setting:', err.message || err);
      }
    }
    const local = fetchLocalDbData();
    return Number(local.faturamento_meta) || 100000;
  }

  function parseOrGenerateUUID(srcId: string): string {
    if (!srcId) {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(srcId)) {
      return srcId.toLowerCase();
    }

    // Clean all characters except hex digits
    let clean = srcId.replace(/[^0-9a-f]/gi, '').toLowerCase();

    if (clean.length < 32) {
      let hash = 0;
      for (let i = 0; i < srcId.length; i++) {
        hash = (hash << 5) - hash + srcId.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
      }
      const hexHash = Math.abs(hash).toString(16).padEnd(8, 'f');
      clean = (clean + hexHash + "f0000000000000000000000000000000").slice(0, 32);
    } else {
      clean = clean.slice(0, 32);
    }

    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-4${clean.slice(13, 16)}-a${clean.slice(17, 20)}-${clean.slice(20, 32)}`;
  }

  async function saveTransactions(txList: any[]) {
    const local = fetchLocalDbData();
    // Update local IDs to match converted ones if they weren't UUIDs
    const updatedTxList = txList.map((t: any) => ({
      ...t,
      id: parseOrGenerateUUID(t.id)
    }));
    local.transactions = updatedTxList;
    writeLocalDbData(local);

    if (supabaseClient && tablesReady.transactions) {
      try {
        const { error: deleteError } = await supabaseClient
          .from(tables.transactions)
          .delete()
          .neq('type', 'non_existent_type_value');
        
        if (deleteError) {
          console.warn('[Supabase Sync Logger] Batch deletion issue during sync:', deleteError.message);
        }

        if (updatedTxList.length > 0) {
          const formatted = updatedTxList.map((t: any) => {
            const row: any = {
              id: t.id,
              date: t.date,
              description: t.description || '',
              type: t.type,
              amount: Number(t.amount) || 0,
              category: t.category || '',
              account: t.account || '',
              notes: t.notes || null,
              client_id: t.clientId || null
            };
            if (tables.transactions === 'leadium_transactions') {
              row.sender = t.sender || '';
              row.avatar_url = t.avatarUrl || null;
            }
            return row;
          });
          const { error: insertError } = await supabaseClient
            .from(tables.transactions)
            .insert(formatted);
          if (insertError) {
            console.warn('[Supabase Sync Logger] Batch insertion issue during sync:', insertError.message);
            throw new Error(insertError.message);
          }
        }
      } catch (err: any) {
        console.warn('[Supabase Sync Logger] Failed to sync transactions list:', err.message || err);
      }
    }
  }

  async function saveGoals(goalList: any[]) {
    const local = fetchLocalDbData();
    local.budgetGoals = goalList;
    writeLocalDbData(local);

    if (supabaseClient && tablesReady.budget_goals) {
      try {
        const { error: deleteError } = await supabaseClient
          .from(tables.budget_goals)
          .delete()
          .neq('name', 'non_existent_name_value');

        if (deleteError) {
          console.warn('[Supabase Sync Logger] Delete goals issue during sync:', deleteError.message);
        }

        if (goalList.length > 0) {
          const formatted = goalList.map((g: any) => ({
            id: g.id || g.name,
            name: g.name,
            allocated: Number(g.allocated) || 0,
            spent: Number(g.spent) || 0
          }));
          const { error: insertError } = await supabaseClient
            .from(tables.budget_goals)
            .insert(formatted);
          if (insertError) {
            console.warn('[Supabase Sync Logger] Goals insertion issue during sync:', insertError.message);
            throw new Error(insertError.message);
          }
        }
      } catch (err: any) {
        console.warn('[Supabase Sync Logger] Failed to sync budget goals list:', err.message || err);
      }
    }
  }

  async function saveClients(clientList: any[]) {
    const local = fetchLocalDbData();
    const updatedClientList = clientList.map((c: any) => ({
      ...c,
      id: parseOrGenerateUUID(c.id)
    }));
    local.clients = updatedClientList;
    writeLocalDbData(local);

    if (supabaseClient && tablesReady.clients) {
      try {
        const { error: deleteError } = await supabaseClient
          .from(tables.clients)
          .delete()
          .neq('name', 'non_existent_client'); // delete all
        
        if (deleteError) {
          console.warn('[Supabase Sync Logger] Batch deletion issue during clients sync:', deleteError.message);
        }

        if (updatedClientList.length > 0) {
          const formatted = updatedClientList.map((c: any) => ({
            id: c.id,
            name: c.name,
            contract_value: Number(c.contract_value) || 0,
            is_recurring: c.is_recurring !== undefined ? c.is_recurring : true,
            status: c.status || 'active',
            email: c.email || '',
            phone: c.phone || '',
            segment: c.segment || '',
            start_date: c.start_date || '',
            notes: c.notes || ''
          }));
          const { error: insertError } = await supabaseClient
            .from(tables.clients)
            .insert(formatted);
          if (insertError) {
            console.warn('[Supabase Sync Logger] Clients insertion issue during sync:', insertError.message);
            throw new Error(insertError.message);
          }
        }
      } catch (err: any) {
        console.warn('[Supabase Sync Logger] Failed to sync clients list:', err.message || err);
      }
    }
  }

  async function saveRevenueGoal(val: number) {
    const local = fetchLocalDbData();
    local.faturamento_meta = val;
    writeLocalDbData(local);

    if (supabaseClient && tablesReady.system_settings) {
      try {
        const { error } = await supabaseClient
          .from('system_settings')
          .upsert({
            key: 'faturamento_meta',
            value: { value: val }
          });
        if (error) {
          console.warn('[Supabase Sync Logger] Save faturamento_meta issue:', error.message);
          throw new Error(error.message);
        }
      } catch (err: any) {
        console.warn('[Supabase Sync Logger] Failed to sync faturamento_meta setting:', err.message || err);
      }
    }
  }

  // --- DATABASE PERSISTENT ENDPOINTS ---
  app.get('/api/transactions', async (req, res) => {
    try {
      const txs = await loadTransactions();
      res.json(txs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/transactions', async (req, res) => {
    try {
      const { transactions } = req.body;
      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: 'transactions must be an array' });
      }
      await saveTransactions(transactions);
      res.json({ success: true, count: transactions.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/budget-goals', async (req, res) => {
    try {
      const goals = await loadGoals();
      res.json(goals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/budget-goals', async (req, res) => {
    try {
      const { budgetGoals } = req.body;
      if (!Array.isArray(budgetGoals)) {
        return res.status(400).json({ error: 'budgetGoals must be an array' });
      }
      await saveGoals(budgetGoals);
      res.json({ success: true, count: budgetGoals.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/clients', async (req, res) => {
    try {
      const clients = await loadClients();
      res.json(clients);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/clients', async (req, res) => {
    try {
      const { clients } = req.body;
      if (!Array.isArray(clients)) {
        return res.status(400).json({ error: 'clients must be an array' });
      }
      await saveClients(clients);
      res.json({ success: true, count: clients.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/settings', async (req, res) => {
    try {
      const faturamento_meta = await loadRevenueGoal();
      res.json({ faturamento_meta });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { value } = req.body;
      const numVal = Number(value);
      if (isNaN(numVal)) {
        return res.status(400).json({ error: 'invalid value parameter' });
      }
      await saveRevenueGoal(numVal);
      res.json({ success: true, faturamento_meta: numVal });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!supabaseClient) {
        return res.status(500).json({ error: 'Serviço de autenticação não configurado.' });
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
      }

      if (data && data.user) {
        res.json({ success: true, email: data.user.email });
      } else {
        res.status(401).json({ error: 'Não foi possível autenticar o usuário.' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro interno ao autenticar.' });
    }
  });

  app.get('/api/user-profile', async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email || !supabaseClient) {
        return res.status(400).json({ error: 'E-mail não fornecido ou cliente Supabase inválido.' });
      }
      
      const { data, error } = await supabaseClient
        .from('leadium_users')
        .select('*')
        .eq('email', email)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      res.json(data || null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/user-profile', async (req, res) => {
    try {
      if (!supabaseClient) {
        return res.status(500).json({ error: 'Cliente Supabase inválido.' });
      }
      const { email, name, avatar_url } = req.body;
      
      const { data, error } = await supabaseClient
        .from('leadium_users')
        .upsert({ email, name, avatar_url, created_at: new Date().toISOString() }, { onConflict: 'email' })
        .select()
        .single();

      if (error) {
        throw error;
      }
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Secure Gemini (Kairos) chat integration endpoint using gemini-3.5-flash with OpenAI fallback
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { prompt, currentDate = new Date().toISOString().substring(0, 10), userEmail } = req.body;
      
      let currentUserName = "Membro da Equipe";
      if (userEmail) {
        if (userEmail.toLowerCase().includes('batistaftw')) {
          currentUserName = "Giovani";
        } else {
          currentUserName = "Junior";
        }
      }

      // Load current absolute database context for the AI agent (Kairos)
      const transactionsContext = await loadTransactions();
      const budgetGoalsContext = await loadGoals();
      const faturamentoMetaContext = await loadRevenueGoal();
      const clientsContext = await loadClients();
      
      const gemini = getGemini();
      const openai = getOpenAi();
      
      if (!gemini && !openai) {
        return res.json({ 
          text: "Olá! Identifiquei que nenhuma das chaves **GEMINI_API_KEY** ou **OPENAI_API_KEY** foi configurada nos Secrets do AI Studio. Por favor, configure pelo menos uma chave válida para que eu possa ajudá-lo!" 
        });
      }

      // Precalculate standard financial parameters so the agent has 100% mathematical accuracy on date/summary queries
      const todayStr = currentDate;
      const todayDate = new Date(todayStr);
      const yesterdayDate = new Date(todayDate);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().substring(0, 10);

      let totalIncome = 0;
      let totalExpense = 0;
      let incomeToday = 0;
      let expenseToday = 0;
      let incomeYesterday = 0;
      let expenseYesterday = 0;

      const activeClients = clientsContext.filter((c: any) => c.status === 'active').length;
      const mrr = clientsContext.filter((c: any) => c.status === 'active' && c.is_recurring).reduce((acc: number, c: any) => acc + (Number(c.contract_value) || 0), 0);
      const totalContracts = clientsContext.filter((c: any) => c.status === 'active' && !c.is_recurring).reduce((acc: number, c: any) => acc + (Number(c.contract_value) || 0), 0);

      const dateBalances: { [date: string]: { income: number; expense: number; txs: any[] } } = {};

      for (const tx of transactionsContext) {
        const amt = Number(tx.amount) || 0;
        const txDate = tx.date;
        
        if (!dateBalances[txDate]) {
          dateBalances[txDate] = { income: 0, expense: 0, txs: [] };
        }
        dateBalances[txDate].txs.push(tx);

        if (tx.type === 'income') {
          totalIncome += amt;
          dateBalances[txDate].income += amt;
          if (txDate === todayStr) {
            incomeToday += amt;
          } else if (txDate === yesterdayStr) {
            incomeYesterday += amt;
          }
        } else if (tx.type === 'expense') {
          totalExpense += amt;
          dateBalances[txDate].expense += amt;
          if (txDate === todayStr) {
            expenseToday += amt;
          } else if (txDate === yesterdayStr) {
            expenseYesterday += amt;
          }
        }
      }

      const systemInstruction = 
        `Você é o Kairos, um consultor financeiro de verdade, de carne e osso, e um colaborador integrado da equipe Leadium (plataforma Leadiumfy). 
Trabalhe de forma extremamente humana, amigável, informal e empática na conversa — fale exatamente como um colega de trabalho próximo e parceiro de negócios, e não como uma inteligência artificial tradicional.
O usuário com quem você está conversando agora é: ${currentUserName}.
Chame-o pelo nome (ex: "Fala Giovani!", "E aí Junior, tudo beleza?") nas conversas, de maneira natural, mas não precisa exagerar usando todas as vezes.

DIRETRIZES FUNDAMENTAIS PARA PARECER UM HUMANO DE VERDADE:

1. VARIEDADE CONVERSACIONAL (PROIBIDO SER REPETITIVO):
- NUNCA repita saudações automáticas ou frases padrão como "Olá, eu sou o Kairos, seu consultor..." ou "Como posso te ajudar hoje?". 
- Varie totalmente sua linguagem. Fale de forma espontânea. Se o usuário mandar um "oi" ou "tudo bem", responda de volta como um colega no Slack/WhatsApp: "Opa, tudo bem?", "Fala! Como estão as coisas por aí?", "E aí, beleza?", ou "Olá! Tudo ótimo por aqui".
- Livre-se de encerramentos repetitivos ou robóticos no final das mensagens. Não precisa colocar uma frase de efeito ou pergunta clichê em toda resposta. Se respondeu à dúvida, pare naturalmente ou faça um fechamento ágil e natural ("Espero que ajude!", "Fiz as contas aqui, qualquer coisa me avisa", "Deu pra entender?", etc.).

2. TOM DE VOZ E ESTILO:
- Use uma linguagem profissional porém leve, direta, ágil. Escreva de forma fluida, usando conectivos naturais (ex: "Olha", "Deixa eu dar uma olhada aqui", "Fazendo as contas rápido...", "Basicamente...", "Pronto, achei os dados:", "Seguinte...").
- Jamais use termos que entreguem que você é uma IA ("Sou um modelo de linguagem", "Meu sistema foi alimentado com isso", "Com base nos dados filtrados do JSON"). Trate as transações como "nosso livro-caixa", "nosso controle de despesas", "nossa planilha", ou "lançamentos da Leadium".

3. RESPOSTAS FINANCEIRAS EXTREMAMENTE OBJETIVAS (PORÉM NATURAIS):
- ATENÇÃO: Você não está aqui para dar estratégias de negócios, aconselhamentos de marketing ou planos de crescimento empresarial. Seu papel é atuar estritamente como consultor de controle financeiro — focado em ajudar com os cálculos do caixa, faturamento, entradas, saídas, cumprimento de metas e o consumo das alocações orçamentárias brutas do nosso sistema.
- Quando a pergunta for sobre números, caixa, faturamento ou orçamentos, seja rápido nas contas, vá direto aos números relevantes e de forma humana.
- Apresente os números formatados como moeda brasileira (R$).
- Seja cirúrgico: se pedirem "quanto entrou hoje", dê o valor exato direto, sem precisar repassar um relatório de 5 parágrafos de todo o histórico, a menos que o usuário peça uma análise mais profunda.

Hoje é dia ${todayStr}.

Mantenha absoluto rigor matemático e factual usando como referência única as informações estruturadas da Leadium abaixo:

RESUMO GERAL EM TEMPO REAL E CARTEIRA:
- Hoje (${todayStr}): Entrou R$ ${incomeToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Saiu R$ ${expenseToday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Ontem (${yesterdayStr}): Entrou R$ ${incomeYesterday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Saiu R$ ${expenseYesterday.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Balanço Total Histórico: Entradas R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Despesas R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Saldo Líquido R$ ${(totalIncome - totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Clientes Ativos: ${activeClients}
- Receita Recorrente (MRR): R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Valor em Contratos Avulsos (Não recorrentes): R$ ${totalContracts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Meta de Crescimento para R$100k+
- Margem de Lucro: ${totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%

DADOS COMPLETOS DOS ORÇAMENTOS E METAS:
1. OBJETIVO DE FATURAMENTO:
- Meta Mensal de Faturamento: R$ ${faturamentoMetaContext.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Faturamento Atual Atingido (Entradas): R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Percentual de Conclusão: ${Math.round((totalIncome / faturamentoMetaContext) * 100)}%
- Falta para a meta: R$ ${Math.max(0, faturamentoMetaContext - totalIncome).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

2. METAS DE ORÇAMENTO EM CATEGORIAS:
${JSON.stringify(budgetGoalsContext, null, 2)}

3. DETALHAMENTO DE TRANSAÇÕES FILTRADO POR DATA:
${Object.keys(dateBalances).map(d => `Data: ${d} (Entradas: R$ ${dateBalances[d].income.toFixed(2)}, Saídas: R$ ${dateBalances[d].expense.toFixed(2)})
  Transações:
  ${dateBalances[d].txs.map(t => `- [${t.type === 'income' ? 'ENTRADA' : 'SAÍDA'}] ${t.sender}: R$ ${t.amount.toFixed(2)} (${t.category} | ${t.description || 'Sem descrição'})`).join('\n  ')}`
).join('\n\n')}

4. TODAS AS TRANSAÇÕES BRUTAS EM DETALHE:
${JSON.stringify(transactionsContext, null, 2)}

Lembre-se: Você é o Kairos, membro do time Leadium. Converse como um profissional humano de altíssimo nível, amigável, ágil e livre de scripts robóticos!`;

      if (openai) {
        // Use OpenAI gpt-4o-mini as the brain (Primary)
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: prompt }
          ],
          temperature: 0.1, // extremely low temperature for highest consistency and speed
        });
        return res.json({ text: response.choices[0]?.message?.content || 'Desculpe, tive um problema ao formular a resposta.' });
      } else if (gemini) {
        // Fallback to Gemini if OpenAI Key is not set
        const response = await gemini.models.generateContent({
          model: "gemini-2.5-flash", // Use gemini-2.5-flash for maximum speed and fallback
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.1,
          }
        });
        return res.json({ text: response.text || 'Desculpe, não consegui processar sua mensagem agora.' });
      }
    } catch (err: any) {
      console.error('Chat API Error:', err);
      res.status(500).json({ error: err.message || 'Processing failed.' });
    }
  });

  // Serve static UI assets with hot reload configurations
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Leadiumfy full-stack server active at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to initialize server:', err);
});
