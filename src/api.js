import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const createTool = (toolData) => api.post('/tools/', toolData);
export const getTools = () => api.get('/tools/');

// 今後、更新、削除、QRコード読み取りAPIなどを追加していく