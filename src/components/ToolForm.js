import React, { useState } from 'react';
import { createTool } from '../api';

function ToolForm({ onToolRegistered }) {
    const [tool, setTool] = useState({
        name: '', // 名称
        modelNumber: '', // 型番品番
        type: '', // 種類
        storageLocation: '', // 保管場所
        status: '在庫', // 状態
        purchaseDate: '', // 購入日
        purchasePrice: '', // 購入価格
        recommendedReplacement: '', // 推奨交換時期
        remarks: '', // 備考
        imageUrl: '' // 画像URL
    });
    const [message, setMessage] = useState('');
    const [qrCodeImage, setQrCodeImage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTool(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setQrCodeImage('');
        try {
            const dataToSend = {
                name: tool.name,
                modelNumber: tool.modelNumber,
                type: tool.type,
                storageLocation: tool.storageLocation,
                status: tool.status,
                purchaseDate: tool.purchaseDate,
                purchasePrice: tool.purchasePrice === '' ? null : parseFloat(tool.purchasePrice),
                recommendedReplacement: tool.recommendedReplacement,
                remarks: tool.remarks,
                imageUrl: tool.imageUrl,
            };

            // API呼び出し
            const response = await createTool(dataToSend);
            setMessage('工具が正常に登録されました！ ID: ' + response.data['工具治具ID']);
            setQrCodeImage(`data:image/png;base64,${response.data.qr_code_base64}`);
            setTool({ // フォームをリセット
                name: '', modelNumber: '', type: '', storageLocation: '', status: '在庫',
                purchaseDate: '', purchasePrice: '', recommendedReplacement: '', remarks: '', imageUrl: ''
            });
            onToolRegistered(); // 親コンポーネントに通知して一覧を更新させる
        } catch (error) {
            console.error('工具登録エラー:', error);
            // エラーメッセージの表示を改善
            let errorMessage = '不明なエラーが発生しました。';
            if (error.response && error.response.data && error.response.data.detail) {
                // FastAPIのバリデーションエラーは detail に配列で入ることが多い
                if (Array.isArray(error.response.data.detail)) {
                    errorMessage = error.response.data.detail.map(err => `${err.loc.join('.')} - ${err.msg}`).join('; ');
                } else if (typeof error.response.data.detail === 'string') {
                    errorMessage = error.response.data.detail;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            setMessage('工具登録に失敗しました: ' + errorMessage);
        }
    };

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
            <h2>新しい工具・治具を登録</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}>
                    <label>名称: </label>
                    <input type="text" name="name" value={tool.name} onChange={handleChange} required />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>型番／品番: </label>
                    <input type="text" name="modelNumber" value={tool.modelNumber} onChange={handleChange} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>種類: </label>
                    <input type="text" name="type" value={tool.type} onChange={handleChange} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>保管場所: </label>
                    <input type="text" name="storageLocation" value={tool.storageLocation} onChange={handleChange} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>状態: </label>
                    <select name="status" value={tool.status} onChange={handleChange}>
                        <option value="在庫">在庫</option>
                        <option value="貸出中">貸出中</option>
                        <option value="メンテナンス中">メンテナンス中</option>
                        <option value="廃棄済">廃棄済</option>
                    </select>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>購入日: </label>
                    <input type="date" name="purchaseDate" value={tool.purchaseDate} onChange={handleChange} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>購入価格: </label>
                    <input type="number" name="purchasePrice" value={tool.purchasePrice} onChange={handleChange} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>推奨交換時期: </label>
                    <input type="text" name="recommendedReplacement" value={tool.recommendedReplacement} onChange={handleChange} placeholder="例: 使用回数200回" />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>備考: </label>
                    <textarea name="remarks" value={tool.remarks} onChange={handleChange}></textarea>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>画像URL: </label>
                    <input type="url" name="imageUrl" value={tool.imageUrl} onChange={handleChange} placeholder="Google Driveなどの画像URL" />
                </div>
                <button type="submit">登録</button>
            </form>
            {message && <p style={{ color: qrCodeImage ? 'green' : 'red' }}>{message}</p>}
            {qrCodeImage && (
                <div>
                    <h3>生成されたQRコード</h3>
                    <img src={qrCodeImage} alt="QR Code" style={{ border: '1px solid #ddd', padding: '5px' }} />
                    <p>このQRコードを印刷して工具・治具に貼り付けてください。</p>
                </div>
            )}
        </div>
    );
}

export default ToolForm;