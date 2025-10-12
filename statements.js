// --- statements.js ---
// Handles generation and export of financial statements.

import { state } from './state.js';
import { showToast } from './ui.js';

// Renders the ledger for a specific contact
export const renderContactLedger = (id) => {
    const contact = state.contacts.find(c => c.id === id);
    if (!contact) return;

    let ledgerItems = [];
    if (contact.openingBalance && contact.openingBalance.amount > 0) {
        ledgerItems.push({
            date: '0000-01-01',
            description: 'Opening Balance',
            debit: contact.openingBalance.type === 'receivable' ? contact.openingBalance.amount : 0,
            credit: contact.openingBalance.type === 'payable' ? contact.openingBalance.amount : 0,
        });
    }

    const getPayments = (history) => (history || []).reduce((sum, p) => sum + p.amount, 0);
    state.transactions.forEach(t => {
        if (t.type === 'trade') {
            if (t.supplierName === contact.name) {
                ledgerItems.push({ date: t.date, description: `Purchase: ${t.item}`, debit: 0, credit: t.supplierTotal });
                (t.paymentsToSupplier || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Made (${p.method})`, debit: p.amount, credit: 0 }));
            }
            if (t.buyerName === contact.name) {
                ledgerItems.push({ date: t.date, description: `Sale: ${t.item}`, debit: t.buyerTotal, credit: 0 });
                (t.paymentsFromBuyer || []).forEach(p => ledgerItems.push({ date: p.date, description: `Payment Received (${p.method})`, debit: 0, credit: p.amount }));
            }
        } else if (t.type === 'payment' && t.name === contact.name) {
            ledgerItems.push({
                date: t.date,
                description: `Direct Payment - ${t.description}`,
                debit: t.paymentType === 'made' ? t.amount : 0,
                credit: t.paymentType === 'received' ? t.amount : 0,
            });
        }
    });

    ledgerItems.sort((a, b) => new Date(a.date) - new Date(b.date));
    state.currentStatementData = { type: 'contact', data: ledgerItems, name: contact.name };

    let runningBalance = 0;
    const ledgerRows = ledgerItems.map(item => {
        runningBalance += (item.debit - item.credit);
        const bal = runningBalance > 0.01 ? `৳${runningBalance.toFixed(2)} Dr` : runningBalance < -0.01 ? `৳${Math.abs(runningBalance).toFixed(2)} Cr` : '৳0.00';
        return `<tr class="border-b border-slate-200 text-sm">
            <td class="p-2 whitespace-nowrap">${item.date === '0000-01-01' ? 'Initial' : item.date}</td>
            <td class="p-2">${item.description}</td>
            <td class="p-2 text-right text-green-600">${item.debit > 0 ? `৳${item.debit.toFixed(2)}` : ''}</td>
            <td class="p-2 text-right text-rose-500">${item.credit > 0 ? `৳${item.credit.toFixed(2)}` : ''}</td>
            <td class="p-2 text-right font-semibold">${bal}</td>
        </tr>`;
    }).join('');

    const finalBalance = runningBalance;
    const balanceStatus = finalBalance > 0.01 ? "Receivable" : (finalBalance < -0.01 ? "Payable" : "Settled");
    const balanceClass = finalBalance > 0.01 ? 'text-green-500' : (finalBalance < -0.01 ? 'text-rose-500' : 'text-slate-500');

    document.getElementById('statement-output').innerHTML = `
        <div id="statement-to-export" class="bg-white rounded-xl shadow-md border border-slate-200 p-6">
            <div class="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                <div>
                    <h2 class="text-xl font-bold text-slate-800">Account Ledger: ${contact.name}</h2>
                    <p class="text-sm text-slate-500">${contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="statement-csv-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300">CSV</button>
                    <button id="statement-png-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300">PNG</button>
                    <button id="statement-pdf-btn" class="px-3 py-1.5 text-sm rounded-md font-semibold bg-slate-200 hover:bg-slate-300">PDF</button>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full text-xs sm:text-sm mb-6">
                    <thead class="bg-slate-100">
                        <tr>
                            <th class="text-left p-2">Date</th>
                            <th class="text-left p-2">Particulars</th>
                            <th class="text-right p-2">Debit (+)</th>
                            <th class="text-right p-2">Credit (-)</th>
                            <th class="text-right p-2">Balance</th>
                        </tr>
                    </thead>
                    <tbody>${ledgerRows}</tbody>
                </table>
            </div>
            <div class="flex justify-end pt-2 mt-2 border-t border-slate-200">
                <div class="w-full md:w-1/2 text-right font-bold text-lg flex justify-between">
                    <span>Final Balance (${balanceStatus}):</span>
                    <span class="${balanceClass}">৳${Math.abs(finalBalance).toFixed(2)}</span>
                </div>
            </div>
        </div>`;
    bindStatementExportButtons();
};

// Renders the overall business statement (not yet implemented in detail)
export const renderOverallStatement = () => {
    showToast("Overall statement feature is under development.");
    // In the future, you would build a complex ledger here similar to the contact ledger
    // by iterating through ALL transactions and contacts' opening balances.
    document.getElementById('statement-output').innerHTML = `
        <div class="text-center py-12 text-slate-500">
            <h3 class="font-semibold mt-2">Overall Statement</h3>
            <p>This feature is not yet fully implemented.</p>
        </div>`;
};

// Binds click events to the export buttons
export const bindStatementExportButtons = () => {
    document.getElementById('statement-csv-btn')?.addEventListener('click', () => handleContentExport('csv'));
    document.getElementById('statement-png-btn')?.addEventListener('click', () => handleContentExport('png'));
    document.getElementById('statement-pdf-btn')?.addEventListener('click', () => handleContentExport('pdf'));
};

// Main function to handle exporting content in various formats
const handleContentExport = async (format) => {
    const { type, data, name } = state.currentStatementData;
    if (!data || data.length === 0) {
        showToast('No data to export.');
        return;
    }
    const filename = `Statement-${name}-${new Date().toISOString().slice(0, 10)}`;

    if (format === 'png') {
        showToast(`Generating PNG...`);
        try {
            const content = document.getElementById('statement-to-export');
            if (!content) throw new Error("Exportable content not found.");
            const canvas = await html2canvas(content, { scale: 2, backgroundColor: '#ffffff' });
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (error) {
            showToast('Failed to generate PNG.');
            console.error(error);
        }
    } else if (format === 'pdf' && type === 'contact') { // Only contact PDF is implemented for this example
        showToast(`Generating PDF...`);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        
        const head = [['Date', 'Particulars', 'Debit', 'Credit', 'Balance']];
        const body = [];
        let runningBalance = 0;
        data.forEach(item => {
            runningBalance += (item.debit || 0) - (item.credit || 0);
            const bal = runningBalance > 0.01 ? `${runningBalance.toFixed(2)} Dr` : runningBalance < -0.01 ? `${Math.abs(runningBalance).toFixed(2)} Cr` : '0.00';
            body.push([
                item.date === '0000-01-01' ? 'Initial' : item.date,
                item.description,
                item.debit > 0 ? item.debit.toFixed(2) : '',
                item.credit > 0 ? item.credit.toFixed(2) : '',
                bal
            ]);
        });

        doc.autoTable({
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [8, 145, 178] }, // Cyan-600
            didDrawPage: (data) => {
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.text('Errum Enterprise', data.settings.margin.left, 40);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.text(`Account Ledger for: ${name}`, data.settings.margin.left, 58);
            },
            margin: { top: 70 },
        });

        doc.save(`${filename}.pdf`);

    } else if (format === 'csv' && type === 'contact') {
        let csvContent = "Date,Particulars,Debit,Credit,Balance\n";
        let runningBalance = 0;
        data.forEach(item => {
            runningBalance += (item.debit || 0) - (item.credit || 0);
            const row = [
                item.date === '0000-01-01' ? 'Opening Balance' : item.date,
                `"${item.description.replace(/"/g, '""')}"`, // Escape quotes
                item.debit || 0,
                item.credit || 0,
                runningBalance.toFixed(2)
            ].join(',');
            csvContent += row + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        showToast(`Export to ${format.toUpperCase()} for this statement type is not yet available.`);
    }
};
