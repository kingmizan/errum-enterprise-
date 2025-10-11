// js/ui.js

/**
 * The main HTML structure of the entire application.
 * This is injected once when the app loads.
 */
export const AppShellHTML = `
    <div id="loading-container" class="fixed ...">...</div>

    <div id="auth-container" class="hidden ...">
        </div>

    <div id="app-container" class="hidden">
        <div class="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
            <header class="flex ...">...</header>
            
            <nav class="bg-white/70 ...">...</nav>
            
            <main id="app-content"></main>
            
            <footer class="text-center ...">...</footer>
        </div>
    </div>
    
    <div id="modals-and-helpers">
        </div>
`;

/**
 * Renders a page template into the main content area with an animation.
 * @param {string} template - The HTML string for the page.
 */
export function renderPage(template) {
    const content = document.getElementById('app-content');
    if (!content) return;
    content.innerHTML = template;
    content.classList.remove('content-enter');
    void content.offsetWidth; // Trigger browser reflow to restart animation
    content.classList.add('content-enter');
}

/**
 * Shows a toast notification message.
 * @param {string} message - The message to display.
 */
export function showToast(message) {
    // Your existing showToast logic
}

// ... Add other UI helper functions like openModal, closeModal, animateCountUp, etc.
