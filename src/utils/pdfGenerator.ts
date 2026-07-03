/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, BudgetGoal } from '../types';

// Helper to format currency consistently inside the PDF
const formatBRL = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2
  }).format(val);
};

// Helper to format date
const formatDateBR = (dateStr: string) => {
  if (!dateStr) return 'Não definido';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

/**
 * Generates and downloads a clean, professional PDF report of monthly expenses, budgets, and sales goals.
 */
export const generateMonthlyReportPDF = (params: {
  transactions: Transaction[];
  budgetGoals: BudgetGoal[];
  revenueGoal: number;
  startDate?: string;
  endDate?: string;
}) => {
  const { transactions, budgetGoals, revenueGoal, startDate, endDate } = params;

  // Compute stats
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
    }
  });

  const netSavings = totalIncome - totalExpenses;
  const percentageReached = revenueGoal > 0 ? Math.round((totalIncome / revenueGoal) * 100) : 0;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Draw elegant top bar accent
  doc.setFillColor(255, 77, 0); // Leadium Orange (#FF4D00)
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Header Typography
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(17, 24, 39); // Deep dark gray
  doc.text('LEADIUMFY', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate gray
  doc.text('Relatório Executivo de Desempenho e Metas', 14, 23);

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 27, pageWidth - 14, 27);

  // Metadata block (Left: Period, Right: Generated at)
  const todayStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Período do Relatório:', 14, 34);
  
  doc.setFont('helvetica', 'normal');
  const periodText = startDate || endDate 
    ? `${startDate ? formatDateBR(startDate) : 'Início'} até ${endDate ? formatDateBR(endDate) : 'Hoje'}`
    : 'Todo o histórico acumulado';
  doc.text(periodText, 48, 34);

  doc.setFont('helvetica', 'bold');
  doc.text('Data de Emissão:', pageWidth - 70, 34);
  doc.setFont('helvetica', 'normal');
  doc.text(todayStr, pageWidth - 42, 34);

  // Executive Summary Panel Section
  doc.setFillColor(248, 250, 252); // Very light slate background
  doc.rect(14, 39, pageWidth - 28, 30, 'F');
  doc.setDrawColor(241, 245, 249);
  doc.rect(14, 39, pageWidth - 28, 30, 'S');

  // Mini decorative left bar on summary panel
  doc.setFillColor(255, 77, 0);
  doc.rect(14, 39, 1.5, 30, 'F');

  // Summary Metrics inside panel
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  
  doc.text('FATURAMENTO REALIZADO', 19, 46);
  doc.text('DESPESAS TOTAIS', 67, 46);
  doc.text('SALDO LÍQUIDO', 115, 46);
  doc.text('META DE VENDAS', 158, 46);

  // Values
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text(formatBRL(totalIncome), 19, 53);

  doc.setTextColor(239, 68, 68); // Rose-500
  doc.text(formatBRL(totalExpenses), 67, 53);

  if (netSavings >= 0) {
    doc.setTextColor(16, 185, 129);
    doc.text(formatBRL(netSavings), 115, 53);
  } else {
    doc.setTextColor(239, 68, 68);
    doc.text(`-${formatBRL(Math.abs(netSavings))}`, 115, 53);
  }

  doc.setTextColor(30, 41, 59);
  doc.text(formatBRL(revenueGoal), 158, 53);

  // Subtitle/Status in executive card
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Atingido ${percentageReached}% da meta`, 158, 60);
  doc.text(netSavings >= 0 ? 'Superávit acumulado no período' : 'Déficit no período', 115, 60);

  // Section: Orçamentos e Metas por Categoria
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Orçamento Alocado vs. Despesa Realizada', 14, 78);

  // Compile budgeting lines for table
  const budgetTableBody = budgetGoals.map((goal) => {
    // calculate spent for this category in the filtered range
    const spent = transactions
      .filter((tx) => tx.type === 'expense' && tx.category === goal.name)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const diff = goal.allocated - spent;
    const usagePercent = goal.allocated > 0 ? Math.round((spent / goal.allocated) * 100) : 0;

    return [
      goal.name,
      formatBRL(goal.allocated),
      formatBRL(spent),
      diff >= 0 ? formatBRL(diff) : `-${formatBRL(Math.abs(diff))}`,
      `${usagePercent}%`
    ];
  });

  // Calculate totals for the footer row of the table
  const totalAllocated = budgetGoals.reduce((sum, g) => sum + g.allocated, 0);
  const totalSpentInGoals = budgetGoals.reduce((sum, g) => {
    return sum + transactions
      .filter((tx) => tx.type === 'expense' && tx.category === g.name)
      .reduce((s, tx) => s + tx.amount, 0);
  }, 0);
  const totalDiff = totalAllocated - totalSpentInGoals;
  const overallUsagePercent = totalAllocated > 0 ? Math.round((totalSpentInGoals / totalAllocated) * 100) : 0;

  budgetTableBody.push([
    'TOTAL GERAL',
    formatBRL(totalAllocated),
    formatBRL(totalSpentInGoals),
    totalDiff >= 0 ? formatBRL(totalDiff) : `-${formatBRL(Math.abs(totalDiff))}`,
    `${overallUsagePercent}%`
  ]);

  autoTable(doc, {
    startY: 83,
    head: [['Categoria do Planejamento', 'Orçamento Planejado', 'Despesa Realizada', 'Saldo Restante', 'Utilização']],
    body: budgetTableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [17, 24, 39], // deep grey
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    },
    styles: {
      fontSize: 8,
      font: 'helvetica',
      cellPadding: 3.5,
    },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' }
    },
    didParseCell: (data) => {
      // Highlight total row at the bottom
      if (data.row.index === budgetTableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.textColor = [17, 24, 39];
      }
      
      // Color coding for diff
      if (data.column.index === 3 && data.row.index < budgetTableBody.length - 1) {
        const valStr = data.cell.raw as string;
        if (valStr.startsWith('-')) {
          data.cell.styles.textColor = [239, 68, 68]; // danger red
        } else {
          data.cell.styles.textColor = [16, 185, 129]; // emerald green
        }
      }
    }
  });

  // Footer decoration and page number
  const finalY = (doc as any).lastAutoTable.finalY || 120;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  
  doc.text('Nota: Este documento reflete as metas financeiras sincronizadas e os lançamentos consolidados no banco de dados local.', 14, finalY + 12);
  
  doc.setFont('helvetica', 'normal');
  doc.text('Gerado via Leadiumfy Inteligência Financeira.', 14, pageHeight - 10);
  doc.text(`Página 1 de 1`, pageWidth - 30, pageHeight - 10);

  // Trigger download
  doc.save(`Relatorio_Mensal_Leadiumfy_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Generates and downloads a clean, professional PDF containing the full filtered list of financial transactions.
 */
export const generateTransactionsPDF = (params: {
  transactions: Transaction[];
  categoryFilter?: string;
  searchQuery?: string;
}) => {
  const { transactions, categoryFilter = 'All', searchQuery = '' } = params;

  // Calculate totals of this exported batch
  let totalIncome = 0;
  let totalExpenses = 0;
  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
    }
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Draw elegant top bar accent
  doc.setFillColor(17, 24, 39); // Deep dark gray
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Header Typography
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text('LEADIUMFY', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Extrato Consolidado de Lançamentos Financeiros', 14, 23);

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 26, pageWidth - 14, 26);

  // Metadata block (Left: Filters used, Right: Date of generation)
  const todayStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Filtros Aplicados:', 14, 33);
  doc.setFont('helvetica', 'normal');
  
  let filterText = '';
  if (categoryFilter !== 'All') {
    filterText += `Categoria: ${categoryFilter} | `;
  }
  if (searchQuery.trim() !== '') {
    filterText += `Busca: "${searchQuery}" | `;
  }
  filterText += `Total: ${transactions.length} lançamentos`;
  doc.text(filterText, 42, 33);

  doc.setFont('helvetica', 'bold');
  doc.text('Data de Emissão:', pageWidth - 70, 33);
  doc.setFont('helvetica', 'normal');
  doc.text(todayStr, pageWidth - 42, 33);

  // Mini summary summary card before table
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 38, pageWidth - 28, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 38, pageWidth - 28, 14, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('RESUMO DO LOTE EXPORTADO:', 18, 46);

  doc.text('FATURAMENTO (+):', 75, 46);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(formatBRL(totalIncome), 108, 46);

  doc.setTextColor(100, 116, 139);
  doc.text('DESPESAS (-):', 138, 46);
  doc.setTextColor(239, 68, 68);
  doc.text(formatBRL(totalExpenses), 162, 46);

  // Table header & rows
  const transactionTableBody = transactions.map((tx) => {
    return [
      formatDateBR(tx.date),
      tx.sender || 'Favorecido não informado',
      tx.type === 'income' ? 'Entrada' : 'Saída',
      tx.category === 'Cafe & Restaurants' ? 'Café e Restaurantes' : tx.category === 'Groceries' ? 'Supermercado' : tx.category === 'Money Transfer' ? 'Transferência' : tx.category === 'Salary' ? 'Salário' : tx.category === 'Utilities' ? 'Serviços Públicos' : tx.category,
      tx.description || '',
      tx.type === 'income' ? `+ ${formatBRL(tx.amount)}` : `- ${formatBRL(tx.amount)}`
    ];
  });

  autoTable(doc, {
    startY: 57,
    head: [['Data', 'Favorecido/Origem', 'Tipo', 'Categoria', 'Descrição', 'Valor']],
    body: transactionTableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // dark gray/slate
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    styles: {
      fontSize: 8,
      font: 'helvetica',
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 32 },
      5: { cellWidth: 25, halign: 'right' }
    },
    didParseCell: (data) => {
      // Color-coding the row/type cell
      if (data.column.index === 2) {
        const val = data.cell.raw as string;
        if (val === 'Entrada') {
          data.cell.styles.textColor = [16, 185, 129]; // emerald
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Saída') {
          data.cell.styles.textColor = [239, 68, 68]; // danger
        }
      }

      // Color-coding values column
      if (data.column.index === 5) {
        const val = data.cell.raw as string;
        if (val.startsWith('+')) {
          data.cell.styles.textColor = [16, 185, 129];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    }
  });

  // Footer
  const footerText = `Gerado via Leadiumfy Inteligência Financeira.`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  
  // Dynamic page numbering for multi-page tables
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.text(footerText, 14, pageHeight - 10);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, pageHeight - 10);
  }

  doc.save(`Extrato_Leadiumfy_${new Date().toISOString().split('T')[0]}.pdf`);
};
