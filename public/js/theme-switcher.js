// Theme Switcher for Congressional Award Tracker

// Get saved theme or default to 'dark'
function getTheme() {
    return localStorage.getItem('theme') || 'dark';
}

// Set theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeButtons();
}

// Update active state of theme buttons
function updateThemeButtons() {
    const currentTheme = getTheme();
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.dataset.theme === currentTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Initialize theme toggle
function initThemeToggle() {
    // Apply saved theme
    setTheme(getTheme());
    
    // Create theme toggle UI
    const themeToggle = document.createElement('div');
    themeToggle.className = 'theme-toggle';
    themeToggle.innerHTML = `
        <button class="theme-btn" data-theme="dark" title="Dark Tech Theme">
            🌙
        </button>
        <button class="theme-btn" data-theme="light" title="Light Minimal Theme">
            ☀️
        </button>
    `;
    
    document.body.appendChild(themeToggle);
    
    // Add click handlers
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.theme);
        });
    });
    
    // Update initial state
    updateThemeButtons();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
    initThemeToggle();
}