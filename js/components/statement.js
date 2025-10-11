// js/components/statement.js

import { state } from '../main.js';
import { showToast } from '../ui.js';

let statementCurrentPage = 1;
const STATEMENT_ITEMS_PER_PAGE = 20;
let currentStatementData = { type: null, data: [], name: '' };

// ... generateLedgerItems and renderStatement functions remain the same as before ...

// ✨ --- COMPLETE EXPORT FUNCTIONS --- ✨

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
        console.error("PNG Export Error:", e);
    }
}

function handleExportCSV() {
    if (!currentStatementData.data.length) return showToast('No data to export.');
    showToast('Generating CSV...');
    const headers = ["Date", "Particulars", "Debit", "Credit", "Balance"];
    const data = [...currentStatementData.data].reverse(); // Use chronological data for export
    
    const rows = data.map(item => [
        item.date === '0000-01-01' ? 'Initial Balance' : item.date,
        `"${item.description.replace(/"/g, '""')}"`, // Escape quotes
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
    if (!currentStatementData.data.length || !window.jspdf) return showToast('PDF library not found.');
    showToast('Generating PDF...');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Errum Enterprise", 14, 22);
    doc.setFontSize(11);
    doc.text(`Ledger For: ${currentStatementData.name}`, 14, 30);
    
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
        theme: 'striped',
        headStyles: { fillColor: [13, 148, 136] }, // Teal color
    });

    doc.save(`Statement-${currentStatementData.name}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ✨ FIX: This function sets up all listeners for the modal
function initializeStatementListeners() {
    const modal = document.getElementById('statement-modal');
    if (modal.dataset.initialized) return; // Prevent re-attaching listeners

    modal.addEventListener('click', e => {
        if (e.target.closest('[data-close-modal="statement-modal"]')) {
            modal.classList.add('hidden');
        }
    });

    document.getElementById('statement-pdf-btn')?.addEventListener('click', handleExportPDF);
    document.getElementById('statement-png-btn')?.addEventListener('click', handleExportPNG);
    document.getElementById('statement-csv-btn')?.addEventListener('click', handleExportCSV);

    document.getElementById('statement-pagination-controls')?.addEventListener('click', e => {
        const button = e.target.closest('button[data-page]');
        if (button && !button.disabled) {
            statementCurrentPage = parseInt(button.dataset.page);
            renderStatement();
        }
    });

    modal.dataset.initialized = 'true';
}


export function showPaginatedStatement() {
    const modal = document.getElementById('statement-modal');
    if (!modal) return;
    
    document.getElementById('statement-title').textContent = 'Overall Statement';
    const ledgerItems = generateLedgerItems();
    currentStatementData = { type: 'overall', data: ledgerItems.reverse(), name: 'Overall' };
    statementCurrentPage = 1;
    renderStatement();
    initializeStatementListeners(); // Ensure listeners are ready
    modal.classList.remove('hidden');
}

export function showContactLedger(contactId) {
    const modal = document.getElementById('statement-modal');
    if (!modal) return;
    
    const contact = state.contacts.find(c => c.id === contactId);
    if (!contact) return showToast('Contact not found.');

    document.getElementById('statement-title').textContent = `Ledger: ${contact.name}`;
    const ledgerItems = generateLedgerItems(contact.name);
    currentStatementData = { type: 'contact', data: ledgerItems.reverse(), name: contact.name };
    statementCurrentPage = 1;
    renderStatement();
    initializeStatementListeners(); // Ensure listeners are ready
    modal.classList.remove('hidden');
}
