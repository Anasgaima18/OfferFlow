const env = {
    API_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
    WS_URL: import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:5000/api/v1/interviews/ws`,
} as const;

export default env;
