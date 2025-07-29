// src/components/LendReturnForm.js
import React, { useState, useEffect, useRef } from 'react';
import { getToolById, updateToolStatus } from '../api';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';

function LendReturnForm() {
    const [toolId, setToolId] = useState(''); // 入力された工具ID
    const [toolData, setToolData] = useState(null); // 取得した工具データ
    const [message, setMessage] = useState(''); // ユーザーへのメッセージ
    const [error, setError] = useState(''); // エラーメッセージ
    const [loading, setLoading] = useState(false); // ローディング状態
    const [scanning, setScanning] = useState(false); // QRコードスキャン中かどうか

    // QRコードスキャナーのインスタンスを保持するためのRef
    const html5QrcodeScannerRef = useRef(null);

    // 工具IDが入力されたら、自動で情報をフェッチ
    useEffect(() => {
        const fetchDetails = async () => {
            if (toolId) {
                setLoading(true);
                setMessage('');
                setError('');
                try {
                    const data = await getToolById(toolId);
                    setToolData(data);
                    setMessage('工具情報を取得しました。');
                } catch (err) {
                    setToolData(null);
                    setError('工具情報の取得に失敗しました。IDを確認してください。');
                    console.error("Failed to fetch tool details:", err);
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchDetails();
    }, [toolId]);

    // 工具の状態を更新
    const handleStatusUpdate = async (newStatus) => {
        if (!toolData || !toolData.ID) {
            setError('工具情報がありません。');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');
        try {
            await updateToolStatus(toolData.ID, newStatus);
            setToolData(prevData => ({ ...prevData, 状態: newStatus }));
            setMessage(`工具ID: ${toolData.ID} の状態を「${newStatus}」に更新しました。`);
        } catch (err) {
            setError('状態の更新に失敗しました。');
            console.error("Failed to update tool status:", err);
        } finally {
            setLoading(false);
        }
    };

    // QRコードスキャン成功時のコールバック関数
    const onScanSuccess = (decodedText, decodedResult) => {
        console.log(`QR Code Scanned: ${decodedText}`, decodedResult);
        setToolId(decodedText); // スキャン結果を工具IDとして設定
        setScanning(false); // スキャンを停止
    };

    // QRコードスキャンエラー時のコールバック関数
    const onScanError = async (errorMessage) => {
        console.error(`QR Code Scan Error: ${errorMessage}`);
        if (errorMessage.includes("NotReadableError") || errorMessage.includes("permission")) {
            setError('カメラが使用できません。アクセスが拒否されたか、他のアプリがカメラを使用している可能性があります。');
        } else {
            setError(`カメラエラーが発生しました: ${errorMessage}`);
        }

        // エラー発生時に即座にスキャナーをクリアしようと試みる
        if (html5QrcodeScannerRef.current) {
            try {
                // isScanningの状態に関わらずclearを試みる
                await html5QrcodeScannerRef.current.clear();
                console.log("LendReturnForm.js:onScanError: Scanner cleared successfully.");
            } catch (clearErr) {
                console.error("LendReturnForm.js:onScanError: Failed to clear scanner:", clearErr);
            } finally {
                html5QrcodeScannerRef.current = null; // 参照をクリア
            }
        }
        setScanning(false); // エラー時はスキャンを停止
    };

    // ★主要な変更点: QRスキャナーの起動/停止ロジックをuseEffectで管理
    useEffect(() => {
        if (scanning) { // scanningがtrueになったらスキャナーを起動
            setError('');
            setMessage('');

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                // ★ここを修正/追加★
                // enumerateDevicesで取得したカメラのIDをここに直接入力してください
                cameraId: "aa6eb4a8129c02f2f52a90e71e8f9d9b19acd1d03e0dfc19a9548d966918107b",
                rememberLastUsedCamera: false, // 明示的に指定するので、これはfalseにするか削除してください
                disableFlip: false, // 必要であれば残す
                // supportedScanFormats: [Html5QrcodeSupportedFormats.QR_CODE] はコメントアウトのままでOKです。
            };

            const readerElement = document.getElementById('reader');
            console.log("LendReturnForm.js:useEffect[scanning]: 'reader' element exists?", !!readerElement, readerElement);
            if (!readerElement) { // Safety check, though should be true due to conditional rendering
                setError("カメラの表示領域が見つかりません。ページの読み込みに問題がある可能性があります。");
                setScanning(false);
                return;
            }

            if (!html5QrcodeScannerRef.current) {
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    config,
                    /* verbose= */ true
                );
                html5QrcodeScannerRef.current = scanner;
                console.log("LendReturnForm.js:useEffect[scanning]: New Html5QrcodeScanner instance created.");
            } else {
                // インスタンスが既に存在し、もしスキャン中なら停止してから再レンダリング
                if (html5QrcodeScannerRef.current.isScanning) {
                    console.log("LendReturnForm.js:useEffect[scanning]: Scanner already active, attempting to clear before re-render.");
                    html5QrcodeScannerRef.current.clear().catch(err => {
                        console.error("LendReturnForm.js:useEffect[scanning]: Failed to clear existing scanner before re-render:", err);
                    });
                }
            }

            // スキャナーをレンダリング（起動）
            try {
                const renderResult = html5QrcodeScannerRef.current.render(onScanSuccess, onScanError);
                if (renderResult && typeof renderResult.then === 'function') {
                    renderResult.catch(err => {
                        console.error("LendReturnForm.js:useEffect[scanning]: QR scanner render promise rejection:", err);
                        setError('QRスキャナーの起動中にエラーが発生しました。');
                        setScanning(false);
                    });
                } else {
                    console.warn("LendReturnForm.js:useEffect[scanning]: Html5QrcodeScanner.render() did not return a Promise.");
                }
            } catch (renderCallError) {
                console.error("LendReturnForm.js:useEffect[scanning]: Error calling Html5QrcodeScanner.render directly:", renderCallError);
                setError(`カメラの起動に失敗しました: ${renderCallError.message || '不明なエラー'}`);
                setScanning(false);
            }
        }

        // クリーンアップ関数: scanning が false になった時、またはコンポーネントがアンマウントされる時に実行
        return () => {
            console.log("LendReturnForm.js:useEffect[scanning] cleanup: Stopping scanner if active.");
            if (html5QrcodeScannerRef.current) {
                // stop()ではなくclear()を直接呼び出すことで、UIとカメラ両方をクリーンアップ
                html5QrcodeScannerRef.current.clear().then(() => {
                    console.log("LendReturnForm.js:useEffect[scanning] cleanup: Scanner cleared.");
                    html5QrcodeScannerRef.current = null; // 参照をクリア
                }).catch(err => {
                    console.error("LendReturnForm.js:useEffect[scanning] cleanup: Failed to clear scanner:", err);
                });
            }
        };
    }, [scanning]); // scanning ステートが変化したときにこの useEffect を再実行

    // 「QRコードをスキャン」ボタンクリックハンドラ
    const handleScanQrCode = () => {
        setScanning(prev => !prev); // scanning ステートを切り替える
    };


    return (
        <div style={styles.container}>
            <h2>工具貸出/返却 ver001</h2>
            <div style={styles.scannerToggle}>
                <button onClick={handleScanQrCode} style={styles.scannerButton}>
                    {scanning ? 'スキャン停止' : 'QRコードをスキャン'}
                </button>
            </div>

            {/* scanningがtrueのときにのみ表示されるdiv */}
            {scanning && (
                <div id="reader" style={styles.qrReaderContainer}>
                    {/* QRスキャナーがここにレンダリングされます */}
                </div>
            )}

            {loading && <p>読み込み中...</p>}
            {error && <p style={styles.errorText}>エラー: {error}</p>}
            {message && <p style={styles.messageText}>{message}</p>}

            <div style={styles.formSection}>
                <label style={styles.label}>
                    工具ID:
                    <input
                        type="text"
                        value={toolId}
                        onChange={(e) => setToolId(e.target.value)}
                        style={styles.input}
                        disabled={scanning} // スキャン中は入力無効
                    />
                </label>
                <button onClick={() => setToolId('')} disabled={scanning} style={styles.clearButton}>クリア</button>
            </div>

            {toolData && (
                <div style={styles.toolDetails}>
                    <h3>工具情報</h3>
                    <p><strong>名称:</strong> {toolData.名称}</p>
                    <p><strong>型番/品番:</strong> {toolData['型番品番']}</p>
                    <p><strong>種類:</strong> {toolData.種類}</p>
                    <p><strong>保管場所:</strong> {toolData.保管場所}</p>
                    <p><strong>状態:</strong> {toolData.状態}</p>
                    <p><strong>推奨交換時期:</strong> {toolData.推奨交換時期}</p>
                    <p><strong>備考:</strong> {toolData.備考}</p>
                    {toolData.画像URL && (
                        <div>
                            <strong>画像:</strong><br />
                            <img src={toolData.画像URL} alt={toolData.名称} style={styles.toolImage} />
                        </div>
                    )}

                    <div style={styles.buttonGroup}>
                        {toolData.状態 === '在庫' && (
                            <button onClick={() => handleStatusUpdate('貸出中')} style={styles.lendButton}>貸出</button>
                        )}
                        {toolData.状態 === '貸出中' && (
                            <button onClick={() => handleStatusUpdate('在庫')} style={styles.returnButton}>返却</button>
                        )}
                        {toolData.状態 === '故障' && (
                            <button onClick={() => handleStatusUpdate('在庫')} style={styles.repairButton}>修理完了→在庫</button>
                        )}
                        {toolData.状態 !== '故障' && (
                            <button onClick={() => handleStatusUpdate('故障')} style={styles.breakdownButton}>故障</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const baseButtonStyles = {
    padding: '10px 20px',
    fontSize: '16px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
};

const styles = {
    container: {
        padding: '20px',
        maxWidth: '600px',
        margin: '20px auto',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        backgroundColor: '#fff',
    },
    h2: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '20px',
    },
    formSection: {
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: 'bold',
        color: '#555',
        flexGrow: 1,
    },
    input: {
        width: 'calc(100% - 100px)', // ボタンの幅を考慮
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '16px',
        marginTop: '5px',
    },
    clearButton: {
        padding: '10px 15px',
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        whiteSpace: 'nowrap',
    },
    toolDetails: {
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #eee',
    },
    h3: {
        color: '#007bff',
        marginBottom: '15px',
    },
    p: {
        marginBottom: '8px',
        lineHeight: '1.6',
    },
    toolImage: {
        maxWidth: '100%',
        height: 'auto',
        marginTop: '10px',
        border: '1px solid #eee',
        borderRadius: '4px',
    },
    buttonGroup: {
        marginTop: '20px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
    },
    lendButton: {
        backgroundColor: '#28a745', // Green
        ...baseButtonStyles,
    },
    returnButton: {
        backgroundColor: '#007bff', // Blue
        ...baseButtonStyles,
    },
    breakdownButton: {
        backgroundColor: '#dc3545', // Red
        ...baseButtonStyles,
    },
    repairButton: {
        backgroundColor: '#ffc107', // Yellow-ish
        color: '#333', // Dark text for contrast
        ...baseButtonStyles,
    },
    messageText: {
        color: 'green',
        fontWeight: 'bold',
        marginTop: '10px',
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        fontWeight: 'bold',
        marginTop: '10px',
        textAlign: 'center',
    },
    qrCodeDisplay: {
        marginTop: '20px',
        padding: '15px',
        border: '1px dashed #ccc',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    qrCodeImage: {
        maxWidth: '150px',
        height: 'auto',
        border: '1px solid #ddd',
        padding: '5px',
        backgroundColor: '#fff',
    },
    qrCodeText: {
        fontSize: '14px',
        color: '#666',
        marginTop: '5px',
    },
    scannerToggle: {
        textAlign: 'center',
        marginBottom: '15px',
    },
    scannerButton: {
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: '#0056b3',
        },
    },
    qrReaderContainer: {
        width: '100%',
        maxWidth: '400px', // スキャナーの最大幅を設定
        margin: '0 auto 20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        padding: '10px' // html5-qrcode の描画スペースを確保
    },
    qrReaderVideoDiv: {
        width: '100%',
        minHeight: '200px', // 少なくともこれくらいの高さがあると良い
        display: 'flex', // 内部要素を中央寄せするため
        justifyContent: 'center',
        alignItems: 'center',
    },
};

export default LendReturnForm;