/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD format
  description: string;
  sender: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  account: string;
  avatarUrl?: string;
  notes?: string;
  clientId?: string; // Links transaction to a specific client
}

export interface BudgetGoal {
  id: string;
  name: string;
  allocated: number;
  spent: number;
}

export interface Client {
  id: string;
  name: string;
  contract_value: number;
  is_recurring: boolean;
  status: 'active' | 'churned';
  email?: string;
  phone?: string;
  segment?: string;
  start_date?: string;
  notes?: string;
  nextPaymentDate?: string;
  logo?: string;
}

export type ActiveTab = 'dashboard' | 'budgeting' | 'transactions' | 'clients' | 'settings' | 'help' | 'expenses' | 'general_expenses';

export interface BudgetFilters {
  account: string;
  type: string;
  date: string;
}
