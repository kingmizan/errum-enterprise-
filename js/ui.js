// js/ui.js

/**
 * Shows a toast notification message.
 * It creates the toast element dynamically if it doesn't already exist.
 * @param {string} message - The message to display.
 */
export function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = "fixed bottom-5 right-5 bg-slate-900 text-white dark:text-slate-900 dark:bg-slate-200 py-2 px-5 rounded-lg shadow-xl text-sm font-semibold opacity-0 translate-y-10 transition-all duration-300 z-50";
        toast.innerHTML = `<span id="toast-message"></span>`;
        document.body.appendChild(toast);
    }
    
    toast.querySelector('#toast-message').textContent = message;
    
    // Animate in
    toast.classList.remove('opacity-0', 'translate-y-10');
    toast.classList.add('opacity-100', 'translate-y-0');

    // Animate out after 3 seconds
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-10');
    }, 3000);
}

/**
 * Displays a custom confirmation modal and returns a promise.
 * The promise resolves if the user clicks "Confirm" and rejects if they click "Cancel".
 * @param {string} title - The title of the modal.
 * @param {string} message - The confirmation message.
 * @returns {Promise<void>}
 */
export function showConfirmModal(title, message) {
    return new Promise((resolve, reject) => {
        // Remove any existing modal first to prevent duplicates
        document.getElementById('confirm-modal')?.remove();

        const modalHTML = `
            <div id="confirm-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm border dark:border-slate-700">
                    <div class="p-6">
                        <h3 class="text-lg font-bold h2">${title}</h3>
                        <p class="text-sm text-slate-600 dark:text-slate-400 mt-2">${message}</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800/50 p-4 flex justify-end gap-3 rounded-b-lg">
                        <button id="confirm-cancel-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
                        <button id="confirm-ok-btn" class="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700">Confirm</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('confirm-modal');
        const confirmBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        confirmBtn.onclick = () => {
            modal.remove();
            resolve(); // Promise resolves on confirm
        };

        cancelBtn.onclick = () => {
            modal.remove();
            reject(); // Promise rejects on cancel
        };
    });
}
