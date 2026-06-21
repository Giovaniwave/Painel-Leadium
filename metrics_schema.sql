-- ==========================================
-- LEADIUMFY - NOVAS MÉTRICAS PARA ESCALA (Rumo aos 100k)
-- ==========================================

-- 1. Tabela de Clientes e Contratos Diários/Mensais com CRM Completo e Integrado
-- Ajuda a rastrear de onde vem a 'Venda de Serviços', calcular LTV (Life Time Value) e MRR (Receita Recorrente).
CREATE TABLE IF NOT EXISTS leadium_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contract_value NUMERIC NOT NULL DEFAULT 0,
  is_recurring BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active', -- 'active', 'churned'
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  segment TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Comandos ALTER TABLE seguros para banco de dados ativo (caso a tabela já existisse no Supabase)
ALTER TABLE leadium_clients ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE leadium_clients ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE leadium_clients ADD COLUMN IF NOT EXISTS segment TEXT DEFAULT '';
ALTER TABLE leadium_clients ADD COLUMN IF NOT EXISTS start_date TEXT DEFAULT '';
ALTER TABLE leadium_clients ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 2. Tabela de Metas Avançadas
-- Em vez de armazenar tudo em configurações soltas, separe metas de crescimento.
CREATE TABLE IF NOT EXISTS leadium_growth_metrics (
  year INTEGER PRIMARY KEY,
  revenue_goal NUMERIC NOT NULL DEFAULT 100000, -- R$100k faturado no ano
  profit_margin_goal NUMERIC NOT NULL DEFAULT 30, -- Meta de Margem de Lucro de 30%
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. VIEW: Resumo Financeiro Mensal (Calcula automaticamente as métricas de saúde e Margem de Lucro)
-- Com essa View, você puxa instantaneamente o resumo em qualquer lugar do dashboard.
CREATE OR REPLACE VIEW leadium_monthly_metrics AS
WITH monthly_data AS (
  SELECT 
    date_trunc('month', date) AS month,
    COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS total_revenue,
    COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS total_expenses,
    COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND category = 'Salários'), 0) AS payroll_expenses,
    COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND category = 'Custo Mensal'), 0) AS fixed_costs
  FROM leadium_transactions
  GROUP BY date_trunc('month', date)
)
SELECT 
  month,
  total_revenue,
  total_expenses,
  (total_revenue - total_expenses) AS net_profit,
  -- Cálculo de Margem de Lucro (%): (Lucro / Receita) * 100
  CASE 
    WHEN total_revenue > 0 THEN ROUND(((total_revenue - total_expenses) / total_revenue) * 100, 2)
    ELSE 0 
  END AS profit_margin_percentage,
  fixed_costs,
  payroll_expenses
FROM monthly_data
ORDER BY month DESC;

-- ==========================================
-- PERMISSÕES E SEGURANÇA
-- ==========================================
ALTER TABLE leadium_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leadium_growth_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on leadium_clients" ON leadium_clients FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on leadium_clients" ON leadium_clients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on leadium_clients" ON leadium_clients FOR UPDATE TO public WITH CHECK (true);
CREATE POLICY "Allow public delete on leadium_clients" ON leadium_clients FOR DELETE TO public USING (true);

CREATE POLICY "Allow public select on leadium_growth_metrics" ON leadium_growth_metrics FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on leadium_growth_metrics" ON leadium_growth_metrics FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on leadium_growth_metrics" ON leadium_growth_metrics FOR UPDATE TO public WITH CHECK (true);
CREATE POLICY "Allow public delete on leadium_growth_metrics" ON leadium_growth_metrics FOR DELETE TO public USING (true);
