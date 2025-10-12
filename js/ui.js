// js/ui.js

/**
 * Shows a toast notification message.
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
    toast.classList.remove('opacity-0', 'translate-y-10');
    toast.classList.add('opacity-100', 'translate-y-0');

    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0');
        toast.classList.add('opacity-0', 'translate-y-10');
    }, 3000);
}

/**
 * Displays a custom confirmation modal.
 */
export function showConfirmModal(title, message) {
    return new Promise((resolve, reject) => {
        document.getElementById('confirm-modal')?.remove();
        const modalHTML = `
            <div id="confirm-modal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div class="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-sm border dark:border-slate-700">
                    <div class="p-6"><h3 class="text-lg font-bold">${title}</h3><p class="text-sm text-slate-600 dark:text-slate-400 mt-2">${message}</p></div>
                    <div class="bg-slate-50 dark:bg-slate-800/50 p-4 flex justify-end gap-3 rounded-b-lg">
                        <button id="confirm-cancel-btn" class="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-700">Cancel</button>
                        <button id="confirm-ok-btn" class="px-4 py-2 rounded-lg font-semibold bg-red-600 text-white">Confirm</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-ok-btn').onclick = () => { modal.remove(); resolve(); };
        document.getElementById('confirm-cancel-btn').onclick = () => { modal.remove(); reject(); };
    });
}

/**
 * ✨ FIX: This function now has the 'export' keyword, making it available to other files.
 * Animates a number counting up from 0 to a target value.
 * @param {HTMLElement} el - The element to update.
 * @param {number} endValue - The final number to display.
 */
export function animateCountUp(el, endValue) {
    if (!el) return;
    let startValue = 0;
    const duration = 1500;
    const startTime = performance.now();

    const formatNumber = (value) => `৳${value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;

    const step = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        if (elapsedTime > duration) {
            el.textContent = formatNumber(endValue);
            return;
        }
        const progress = (elapsedTime / duration);
        const current = startValue + (endValue - startValue) * progress;
        el.textContent = formatNumber(current);
        requestAnimationFrame(step);
    };
    
    requestAnimationFrame(step);
}
