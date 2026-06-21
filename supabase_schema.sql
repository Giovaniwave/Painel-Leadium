-- ==========================================
-- LEADIUMFY SUPABASE / POSTGRES TABLE SCHEMA - PROFESSIONAL VERSION
-- ==========================================

-- 1. Tabela Nova de Transações (leadium_transactions) - Sem restrições CHECK problemáticas
CREATE TABLE IF NOT EXISTS leadium_transactions (
  id UUID PRIMARY KEY,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT NOT NULL,
  sender TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL, -- 'income' or 'expense'
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  account TEXT NOT NULL,
  avatar_url TEXT,
  notes TEXT,
  client_id UUID, -- Vinculação segura com clientes para cálculo de LTV/receitas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Comando ALTER TABLE seguro (caso a tabela já existisse no Supabase)
ALTER TABLE leadium_transactions ADD COLUMN IF NOT EXISTS client_id UUID;

-- 2. Tabela Nova de Metas de Orçamentos (leadium_budget_goals)
CREATE TABLE IF NOT EXISTS leadium_budget_goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  allocated NUMERIC NOT NULL DEFAULT 0,
  spent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Tabela de Configurações Gerais
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- 4. Tabela de Usuários para salvar o Perfil / Avatar (leadium_users)
CREATE TABLE IF NOT EXISTS leadium_users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ==========================================
-- SEED INITIAL DATA (DADOS INICIAIS)
-- ==========================================

-- Inserir metas padrão de orçamento por categoria (Alocações Planejadas) nas novas tabelas
INSERT INTO leadium_budget_goals (id, name, allocated, spent)
VALUES 
  ('Investimentos', 'Investimentos', 2000, 0),
  ('Salários', 'Salários', 5000, 0),
  ('Custo Mensal', 'Custo Mensal', 3000, 0),
  ('Emergências', 'Emergências', 1500, 0),
  ('Despesa Variável', 'Despesa Variável', 1000, 0)
ON CONFLICT (id) DO UPDATE 
SET allocated = EXCLUDED.allocated;

-- Inserir meta padrão de Objetivo de Faturamento do Sistema
INSERT INTO system_settings (key, value)
VALUES ('faturamento_meta', '{"value": 100000}')
ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS nas tabelas para poder aplicar as políticas públicas liberadas
ALTER TABLE leadium_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadium_budget_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadium_users ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar erros de duplicidade ao re-executar
DROP POLICY IF EXISTS "Allow public select on leadium_transactions" ON leadium_transactions;
DROP POLICY IF EXISTS "Allow public insert on leadium_transactions" ON leadium_transactions;
DROP POLICY IF EXISTS "Allow public update on leadium_transactions" ON leadium_transactions;
DROP POLICY IF EXISTS "Allow public delete on leadium_transactions" ON leadium_transactions;

DROP POLICY IF EXISTS "Allow public select on leadium_budget_goals" ON leadium_budget_goals;
DROP POLICY IF EXISTS "Allow public insert on leadium_budget_goals" ON leadium_budget_goals;
DROP POLICY IF EXISTS "Allow public update on leadium_budget_goals" ON leadium_budget_goals;
DROP POLICY IF EXISTS "Allow public delete on leadium_budget_goals" ON leadium_budget_goals;

DROP POLICY IF EXISTS "Allow public select on system_settings" ON system_settings;
DROP POLICY IF EXISTS "Allow public insert on system_settings" ON system_settings;
DROP POLICY IF EXISTS "Allow public update on system_settings" ON system_settings;
DROP POLICY IF EXISTS "Allow public delete on system_settings" ON system_settings;

DROP POLICY IF EXISTS "Allow public select on leadium_users" ON leadium_users;
DROP POLICY IF EXISTS "Allow public insert on leadium_users" ON leadium_users;
DROP POLICY IF EXISTS "Allow public update on leadium_users" ON leadium_users;
DROP POLICY IF EXISTS "Allow public delete on leadium_users" ON leadium_users;

-- Criar políticas de acesso irrestrito para anon / public nas tabelas novas
CREATE POLICY "Allow public select on leadium_transactions" ON leadium_transactions FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on leadium_transactions" ON leadium_transactions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on leadium_transactions" ON leadium_transactions FOR UPDATE TO public WITH CHECK (true);
CREATE POLICY "Allow public delete on leadium_transactions" ON leadium_transactions FOR DELETE TO public USING (true);

CREATE POLICY "Allow public select on leadium_budget_goals" ON leadium_budget_goals FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on leadium_budget_goals" ON leadium_budget_goals FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on leadium_budget_goals" ON leadium_budget_goals FOR UPDATE TO public WITH CHECK (true);
CREATE POLICY "Allow public delete on leadium_budget_goals" ON leadium_budget_goals FOR DELETE TO public USING (true);

CREATE POLICY "Allow public select on system_settings" ON system_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on system_settings" ON system_settings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on system_settings" ON system_settings FOR UPDATE TO public WITH CHECK (true);
CREATE POLICY "Allow public delete on system_settings" ON system_settings FOR DELETE TO public USING (true);

CREATE POLICY "Allow public select on leadium_users" ON leadium_users FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on leadium_users" ON leadium_users FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on leadium_users" ON leadium_users FOR UPDATE TO public WITH CHECK (true);
CREATE POLICY "Allow public delete on leadium_users" ON leadium_users FOR DELETE TO public USING (true);
