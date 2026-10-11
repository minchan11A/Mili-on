export const APP_MODE = (process.env.NEXT_PUBLIC_APP_MODE ?? 'server') as 'demo' | 'server';
export const IS_DEMO = APP_MODE === 'demo';
