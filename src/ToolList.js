import React, { useState, useEffect } from 'react';
import { getTools } from './api';

function ToolList({ refreshTrigger }) {
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTools = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await getTools();
                setTools(response.data);
            } catch (err) {
                console.error('工具一覧取得エラー:', err);
                setError('工具一覧の取得に失敗しました: ' + (err.response?.data?.detail || err.message));
            } finally {
                setLoading(false);
            }
        };
        fetchTools();
    }, [refreshTrigger]); // refreshTriggerが変更されると再フェッチ

    if (loading) return <p>工具データを読み込み中...</p>;
    if (error) return <p style={{ color: 'red' }}>エラー: {error}</p>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>工具・治具一覧</h2>
            {tools.length === 0 ? (
                <p>登録されている工具・治具はありません。</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f2f2f2' }}>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>工具治具ID</th> {/* 表示名 */}
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>名称</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>型番品番</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>種類</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>保管場所</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>状態</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>画像</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>QRコード</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tools.map((tool) => (
                            <tr key={tool.id}>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tool.id}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tool.name}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tool.modelNumber}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tool.type}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tool.storageLocation}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{tool.status}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                    {tool.imageUrl && <img src={tool.imageUrl} alt={tool.name} style={{ maxWidth: '50px', maxHeight: '50px' }} />}
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                    {tool.qr_code_base64 && <img src={`data:image/png;base64,${tool.qr_code_base64}`} alt="QR Code" style={{ width: '50px', height: '50px' }} />}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default ToolList;