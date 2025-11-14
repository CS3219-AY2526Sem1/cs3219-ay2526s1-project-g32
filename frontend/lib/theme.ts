/* AI Assistance Disclosure:
Scope: Implement consistent themes.
Author Review: Validated for style and accuracy.
*/

import type { ThemeConfig } from 'antd';

// Shared theme configuration for consistent styling across all pages
export const peerPrepTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1380ec', // primary-600 from globals.css
    colorTextBase: '#ffffff',
    colorBgBase: '#0A1017', // --bg from globals.css
    colorBorder: 'rgba(255,255,255,0.1)', // --border from globals.css
    fontFamily: '"Space Grotesk","Noto Sans",system-ui,-apple-system,"Segoe UI",sans-serif',
  },
  components: {
    Layout: {
      headerBg: 'transparent',
      bodyBg: 'transparent',
      headerPadding: 0,
    },
    Button: {
      fontWeight: 600,
      borderRadius: 6,
    },
    Card: {
      colorBgContainer: 'rgba(255,255,255,0.04)', // Consistent with auth cards
      headerBg: 'transparent',
      headerPadding: 0,
    },
    Input: {
      colorBgContainer: '#111827', // Consistent input background
      colorBorder: '#374151',
      colorTextPlaceholder: '#9CA3AF',
      borderRadius: 10,
      controlHeight: 40,
    },
    Form: {
      labelColor: 'rgba(255,255,255,0.75)',
    },
    Typography: {
      colorTextBase: '#ffffff',
    },
  },
};

// Auth-specific theme for login/register pages
export const authTheme: ThemeConfig = {
  ...peerPrepTheme,
  token: {
    ...peerPrepTheme.token,
    colorPrimary: '#6366F1', // login-primary from globals.css
  },
};