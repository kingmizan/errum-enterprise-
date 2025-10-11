// js/ui.js

/**
 * Shows a toast notification message.
 * It creates the toast element if it doesn't already exist on the page.
 * @param {string} message - The message to display.
 */
export function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        // These classes are from the original project for consistent styling
        toast.className = "fixed bottom-5 right-5 bg-slate-900 text-white dark:text-slate-900 dark:bg-slate-200 py-2 px-5 rounded-lg shadow-xl text-sm font-semibold opacity-0 translate-y-10 transition-all duration-300";
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
 * Animates a number counting up from 0 to a target value.
 * Used for the dashboard metrics.
 * @param {HTMLElement} el - The element to update.
 * @param {number} endValue - The final number to display.
 */
export function animateCountUp(el, endValue) {
    if (!el) return;
    let startValue = 0;
    const duration = 1500; // Animation duration in milliseconds
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
