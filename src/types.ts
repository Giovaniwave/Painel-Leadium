/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD format
  description: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  account: string;
  avatarUrl?: string;
  notes?: string;
  clientId?: string; // Links transaction to a specific client
  isRecurring?: boolean;
  frequency?: 'weekly' | 'monthly' | 'quarterly';
  nextOccurrenceDate?: string;
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

export interface Reimbursement {
  id: string;
  date: string;
  employeeId: string;
  description: string;
  amount: number;
  expenseType: 'fixed' | 'one_off'; // Despesa fixa | Avulsa
  category: string;
  clientId?: string; // Vínculo opcional com um cliente
  status: 'pending' | 'reimbursed'; // Pendente | Reembolsada
  receiptFile?: string; // URL do PDF do comprovante
  notes?: string;
}

export type ActiveTab = 'dashboard' | 'budgeting' | 'transactions' | 'clients' | 'prospecting' | 'settings' | 'help' | 'expenses' | 'reimbursements';

export interface BudgetFilters {
  account: string;
  type: string;
  date: string;
}
