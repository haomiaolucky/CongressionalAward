// Navbar Component - Unified Navigation Bar
function createNavbar(config = {}) {
    const {
        brandText = 'Congressional Award Tracker',
        brandLink = '/',
        menuItems = [],
        darkTheme = true
    } = config;

    const navbarHTML = `
        <nav class="navbar" style="background: rgba(15, 12, 41, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(0, 255, 234, 0.2);">
            <div class="container navbar-content">
                <a href="${brandLink}" class="navbar-brand" style="color: white;">
                    <img src="/image/logo.png" alt="Congressional Award Logo">
                    ${brandText}
                </a>
                <ul class="navbar-menu">
                    ${menuItems.map(item => `
                        <li><a href="${item.href}" ${item.id ? `id="${item.id}"` : ''} style="color: rgba(255, 255, 255, 0.9);">${item.text}</a></li>
                    `).join('')}
                </ul>
            </div>
        </nav>
    `;

    // Insert navbar at the beginning of body
    document.body.insertAdjacentHTML('afterbegin', navbarHTML);
}

// Predefined navbar configurations
const navbarConfigs = {
    home: {
        brandText: 'Congressional Award Tracker',
        brandLink: '/',
        menuItems: [
            { href: '/activities', text: 'Browse Activities' },
            { href: '/login', text: 'Login' },
            { href: '/register', text: 'Register' }
        ]
    },
    
    login: {
        brandText: 'Congressional Award Tracker',
        brandLink: '/',
        menuItems: [
            { href: '/', text: 'Home' },
            { href: '/register', text: 'Register' }
        ]
    },
    
    register: {
        brandText: 'Congressional Award Tracker',
        brandLink: '/',
        menuItems: [
            { href: '/', text: 'Home' },
            { href: '/login', text: 'Login' }
        ]
    },
    
    activities: {
        brandText: 'Congressional Award Tracker',
        brandLink: '/',
        menuItems: [
            { href: '/activities', text: 'Browse Activities' },
            { href: '/login', text: 'Login' },
            { href: '/register', text: 'Register' }
        ]
    },
    
    dashboard: {
        brandText: 'Congressional Award Tracker',
        brandLink: '/dashboard',
        menuItems: [
            { href: '/dashboard', text: 'Dashboard' },
            { href: '#', text: 'Logout', id: 'logoutBtn' }
        ]
    },
    
    admin: {
        brandText: 'Congressional Award Tracker - Admin',
        brandLink: '/admin',
        menuItems: [
            { href: '/admin', text: 'Admin Dashboard' },
            { href: '#', text: 'Logout', id: 'logoutBtn' }
        ]
    }
};

// Helper function to load navbar by page type
function loadNavbar(pageType) {
    const config = navbarConfigs[pageType];
    if (config) {
        createNavbar(config);
    } else {
        console.error(`Unknown page type: ${pageType}`);
    }
}