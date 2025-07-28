// src/components/ToolList.js
import React, { useState, useEffect } from 'react';
import { getAllTools } from '../api'; // 修正済みパスであることを確認

function ToolList({ refresh }) {
    // tools ステートを空の配列で初期化
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTools = async () => {
            try {
                setLoading(true);
                setError(null); // エラーをリセット
                const data = await getAllTools();
                // APIから返されたデータが配列であることを確認
                if (Array.isArray(data)) {
                    setTools(data);
                } else {
                    // データが配列でない場合のハンドリング
                    console.error("APIが予期しない形式のデータを返しました (期待:配列):", data);
                    setTools([]); // エラー時は空の配列を設定
                    setError('工具リストのデータ形式が不正です。');
                }
            } catch (err) {
                // エラー発生時はエラーメッセージを設定し、toolsを空の配列に
                setError('工具リストの取得に失敗しました。サーバーまたはネットワークの問題を確認してください。');
                console.error("工具リストのフェッチに失敗しました:", err);
                setTools([]); // エラー時は空の配列を設定
            } finally {
                setLoading(false);
            }
        };

        fetchTools();
    }, [refresh]); // refresh propが変更されたら再フェッチ

    if (loading) {
        return <p>工具データを読み込み中...</p>;
    }

    if (error) {
        return <p style={{ color: 'red' }}>エラー: {error}</p>;
    }

    return (
        <div>
            <h2>工具一覧</h2>
            {/* toolsが常に配列であることを保証しているので、lengthへのアクセスは安全 */}
            {tools.length === 0 ? (
                // データが空で、かつロード中でなく、エラーでもない場合に表示
                <p>登録されている工具はありません。</p>
            ) : (
                <div style={styles.toolGrid}>
                    {tools.map(tool => (
                        <div key={tool.id} style={styles.card}>
                            <h3>{tool.name}</h3>
                            <p><strong>ID:</strong> {tool.id}</p>
                            <p><strong>型番品番:</strong> {tool.modelNumber}</p>
                            <p><strong>種類:</strong> {tool.type}</p>
                            <p><strong>保管場所:</strong> {tool.storageLocation}</p>
                            <p><strong>状態:</strong> {tool.status}</p>
                            {tool.qr_code_base64 && (
                                <img src={tool.qr_code_base64} alt={`QR Code for ${tool.name}`} style={{ width: '100px', height: '100px' }} />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// スタイルは以前のままでOK
const styles = {
    toolGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
    },
    card: {
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
    },
    h3: {
        color: '#333',
        marginBottom: '10px',
    },
    p: {
        color: '#555',
        marginBottom: '5px',
    },
};

export default ToolList;