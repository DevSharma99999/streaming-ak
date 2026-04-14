// Consistent Theme System for Streaming Platform
export const theme = {
    // Color Palette
    colors: {
        // Dark Mode
        dark: {
            bg: '#0f0f0f',
            bgSecondary: '#1a1a1a',
            bgTertiary: '#272727',
            text: '#ffffff',
            textMuted: 'rgba(255, 255, 255, 0.6)',
            textSecondary: 'rgba(255, 255, 255, 0.4)',
            border: 'rgba(255, 255, 255, 0.1)',
            borderLight: 'rgba(255, 255, 255, 0.15)',
        },
        // Light Mode
        light: {
            bg: '#f9fafb',
            bgSecondary: '#ffffff',
            bgTertiary: '#f3f4f6',
            text: '#111827',
            textMuted: 'rgba(0, 0, 0, 0.6)',
            textSecondary: 'rgba(0, 0, 0, 0.4)',
            border: 'rgba(0, 0, 0, 0.1)',
            borderLight: 'rgba(0, 0, 0, 0.05)',
        },
        // Accent Colors
        primary: '#dc2626', // Red
        primaryHover: '#b91c1c',
        secondary: '#7f1d1d', // Dark Red
        secondaryHover: '#991b1b',
        success: '#10b981',
        danger: '#dc2626',
        warning: '#f59e0b',
        accent: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
    },

    // Spacing
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
    },

    // Typography
    typography: {
        titleXL: 'text-3xl font-bold tracking-tight',
        titleL: 'text-2xl font-bold tracking-tight',
        titleM: 'text-xl font-semibold',
        titleS: 'text-lg font-semibold',
        bodyL: 'text-base font-medium',
        body: 'text-sm font-normal',
        small: 'text-xs font-normal',
        caption: 'text-xs font-normal opacity-70',
    },

    // Border Radius
    radius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        full: '9999px',
    },

    // Shadows
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
    },
};

// Tailwind Classes Helpers
export const classNames = {
    // Cards
    card: 'bg-zinc-900/50 dark:bg-zinc-900/50 border border-zinc-800/50 rounded-xl backdrop-blur-sm',
    cardLight: 'bg-white border border-zinc-200 rounded-xl shadow-sm',

    // Buttons
    btnPrimary: 'px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-red-600 hover:bg-red-700 active:scale-95 text-white',
    btnSecondary: 'px-4 py-2.5 rounded-lg font-medium transition-all duration-200 bg-zinc-800 hover:bg-zinc-700 text-white',
    btnGhost: 'px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:bg-zinc-800/50 text-white',

    // Inputs
    input: 'w-full px-4 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all',

    // Text
    heading: 'text-2xl font-bold tracking-tight',
    subheading: 'text-lg font-semibold',
    body: 'text-sm text-zinc-400',
};
