import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 工具登録API
export const createTool = async (toolData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/tools/`, toolData);
        return response.data;
    } catch (error) {
        console.error('工具登録エラー:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// 全ての工具情報取得API
export const getAllTools = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/tools/`);
        return response.data;
    } catch (error) {
        console.error('工具一覧取得エラー:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// 特定の工具情報取得API
export const getToolById = async (toolId) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/tools/${toolId}`);
        return response.data;
    } catch (error) {
        console.error(`工具ID ${toolId} の取得エラー:`, error.response ? error.response.data : error.message);
        throw error;
    }
};

// 工具の状態更新API
export const updateToolStatus = async (toolId, newStatus) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/tools/${toolId}/status`, { status: newStatus });
        return response.data;
    } catch (error) {
        console.error(`工具ID ${toolId} の状態更新エラー:`, error.response ? error.response.data : error.message);
        throw error;
    }
};