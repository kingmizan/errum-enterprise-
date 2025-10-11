// js/components/statement.js

import { state } from '../main.js';
import { showToast } from '../ui.js';

let statementCurrentPage = 1;
const STATEMENT_ITEMS_PER_PAGE = 20;
let currentStatementData = { type: null, data: [], name: '' };

function getStatementModalTemplate() {
    // This HTML should be inside your ui.js AppShellHTML
    // I am including it here for clarity.
    return `
        <div id="statement-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
                <div class="p-4 flex justify-between items-center border-b dark:border-slate-800">
                    <h2 id="statement-title" class="text-xl font-bold">Statement</h2>
                    <div class="flex items-center gap-2">
                        <button id="statement-csv-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700">CSV</button>
                        <button id="statement-png-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700">PNG</button>
                        <button id="statement-pdf-btn" class="px-3 py-1.5 text-sm rounded-md bg-slate-200 dark:bg-slate-700">PDF</button>
                        <button data-close-modal="statement-modal" class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg></button>
                    </div>
                </div>
                <div class="overflow-y-auto flex-grow" id="statement-content-wrapper"><div class="p-6" id="statement-content"></div></div>
                <div id="statement-pagination-controls" class="p-4 flex justify-center items-center gap-2 border-t dark:border-slate-800"></div>
            </div>
        </div>
    `;
}

// ... (generateLedgerItems and renderStatement functions remain the same) ...

// ✨ --- NEW: EXPORT FUNCTIONS --- ✨

async function handleExportPNG() {
    const content = document.getElementById('statement-to-export');
    if (!content || !window.html2canvas) return showToast('Export library not found.');
    showToast('Generating PNG...');
    try {
        const isDark = document.documentElement.classList.contains('dark');
        const canvas = await html2canvas(content, { scale: 2, backgroundColor: isDark ? '#020617' : '#ffffff' });
        const link = document.createElement('a');
        link.download = `Statement-${currentStatementData.name}-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL();
        link.click();
    } catch (e) {
        showToast('Error generating PNG.');
    }
}

function handleExportCSV() {
    if (!currentStatementData.data.length) return showToast('No data to export.');
    showToast('Generating CSV...');
    const headers = ["Date", "Particulars", "Debit", "Credit", "Balance"];
    const data = [...currentStatementData.data].reverse(); // Use chronological data
    
    const rows = data.map(item => [
        item.date === '0000-01-01' ? 'Initial' : item.date,
        `"${item.description.replace(/"/g, '""')}"`,
        item.debit?.toFixed(2) || '0.00',
        item.credit?.toFixed(2) || '0.00',
        item.balance.toFixed(2)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Statement-${currentStatementData.name}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleExportPDF() {
    if (!currentStatementData.data.length || !window.jspdf) return showToast('Export library not found.');
    showToast('Generating PDF...');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Errum Enterprise", 14, 22);
    doc.setFontSize(11);
    doc.text(`Statement for: ${currentStatementData.name}`, 14, 30);
    
    const head = [["Date", "Particulars", "Debit", "Credit", "Balance"]];
    const body = [...currentStatementData.data].reverse().map(item => [
        item.date === '0000-01-01' ? 'Initial' : item.date,
        item.description,
        item.debit ? `৳${item.debit.toFixed(2)}` : '',
        item.credit ? `৳${item.credit.toFixed(2)}` : '',
        `৳${item.balance.toFixed(2)}`
    ]);

    doc.autoTable({
        startY: 35,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
        didDrawPage: (data) => {
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(10);
            doc.text(`Page ${String(data.pageNumber)} of ${String(pageCount)}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    doc.save(`Statement-${currentStatementData.name}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ✨ FIX: Initialize listeners for all export buttons
document.addEventListener('DOMContentLoaded', () => {
    // ... (keep pagination and close modal listeners)
    document.getElementById('statement-pdf-btn')?.addEventListener('click', handleExportPDF);
    document.getElementById('statement-png-btn')?.addEventListener('click', handleExportPNG);
    document.getElementById('statement-csv-btn')?.addEventListener('click', handleExportCSV);
});

// ... (The rest of your functions: showPaginatedStatement, showContactLedger, etc., remain the same)
