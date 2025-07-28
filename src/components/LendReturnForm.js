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
            } else {
                setToolData(null);
                setMessage('');
                setError('');
            }
        };

        const handler = setTimeout(() => {
            fetchDetails();
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [toolId]);

    const handleIdChange = (e) => {
        setToolId(e.target.value);
        // 手動入力中はスキャンを停止
        if (scanning) {
            setScanning(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!toolId) {
            setError('工具IDが入力されていません。');
            return;
        }

        if (!toolData) {
            setError('まず工具情報を取得してください。');
            return;
        }

        if (toolData.status === newStatus) {
            setMessage(`この工具は既に「${newStatus}」です。`);
            setError('');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');
        try {
            const updatedData = await updateToolStatus(toolId, newStatus);
            setToolData(updatedData); // 更新後のデータを反映
            setMessage(`工具「${updatedData.name}」の状態を「${newStatus}」に更新しました！`);
        } catch (err) {
            setError(`状態の更新に失敗しました: ${err.response ? err.response.data.detail : err.message}`);
            console.error("Failed to update tool status:", err);
        } finally {
            setLoading(false);
        }
    };

    // html5-qrcode のロジックを useEffect で管理
    useEffect(() => {
        let currentScannerInstance = html5QrcodeScannerRef.current;

        if (scanning) {
            // スキャナーを表示する要素がDOMに存在するか確認
            const readerElement = document.getElementById("reader");
            if (!readerElement) {
                console.error("QR reader element 'reader' not found in DOM. Cannot start scanner.");
                setError("スキャナーの表示要素が見つかりませんでした。");
                setScanning(false); // 要素がない場合はスキャンを停止
                return;
            }

            // スキャナーインスタンスがまだ作成されていない場合のみ新規作成
            if (!currentScannerInstance) {
                try {
                    currentScannerInstance = new Html5QrcodeScanner(
                        "reader", // HTML要素のID
                        {
                            fps: 10, // フレームレート
                            qrbox: { width: 250, height: 250 }, // スキャンボックスのサイズ
                            rememberLastUsedCamera: true, // 最後に使ったカメラを記憶
                            supportedScanFormats: [
                                Html5QrcodeSupportedFormats.QR_CODE,
                                Html5QrcodeSupportedFormats.CODE_128,
                                Html5QrcodeSupportedFormats.CODE_39,
                            ]
                        },
                        /* verbose= */ false // 詳細ログを非表示
                    );
                    html5QrcodeScannerRef.current = currentScannerInstance; // 新しいインスタンスをRefに格納
                    console.log("New Html5QrcodeScanner instance created and stored in ref.");
                    console.log("Is currentScannerInstance valid?", currentScannerInstance);
                    console.log("Does currentScannerInstance have render method?", typeof currentScannerInstance.render);
                } catch (instantiationError) {
                    console.error("Failed to instantiate Html5QrcodeScanner:", instantiationError);
                    setError("スキャナーの初期化に失敗しました。ブラウザの互換性を確認してください。");
                    setScanning(false);
                    return;
                }
            }

            // ここで currentScannerInstance が null/undefined の場合は、初期化に失敗したと判断
            if (!currentScannerInstance) {
                console.error("Html5QrcodeScanner instance is null/undefined after attempted creation.");
                setError("スキャナーの初期化に失敗しました。");
                setScanning(false);
                return;
            }

            // スキャン成功時のコールバック関数
            const onScanSuccess = (decodedText, decodedResult) => {
                console.log(`QR Code Scanned Result: ${decodedText}`, decodedResult);
                setToolId(decodedText); // スキャン結果をtoolIdにセット
                setScanning(false); // スキャンを停止
                setMessage('QRコードをスキャンしました。');
                setError('');
                // スキャン成功後、スキャナーを停止し、リソースを解放
                if (html5QrcodeScannerRef.current && html5QrcodeScannerRef.current.isScanning) {
                    html5QrcodeScannerRef.current.clear().catch(err => console.error("Failed to clear scanner on success:", err));
                }
            };

            // スキャンエラー時のコールバック関数
            const onScanError = (errorMessage) => {
                // console.warn(`QR Code Scan Error: ${errorMessage}`);
                // カメラの読み取りエラー（例: カメラが使用中、権限拒否）の場合のみエラーメッセージを表示し、スキャンを停止
                if (errorMessage.includes("NotReadableError") || errorMessage.includes("permission denied")) {
                    setError('カメラの起動に失敗しました。他のアプリがカメラを使用していないか確認してください。');
                    setScanning(false); // 重大なエラーの場合はスキャンを停止
                }
            };

            // スキャナーが現在スキャン中でない場合のみ render() を呼び出す
            if (!currentScannerInstance.isScanning) {
                currentScannerInstance.render(onScanSuccess, onScanError)
                    .catch(err => {
                        console.error("Failed to start QR scanner (Html5QrcodeScanner.render):", err);
                        setError('カメラの起動に失敗しました。他のアプリがカメラを使用していないか確認してください。');
                        setScanning(false);
                    });
            } else {
                console.log("Scanner is already active, not re-rendering.");
            }

            // クリーンアップ関数（コンポーネントのアンマウント時、または scanning が変更されたときに実行）
            return () => {
                // スキャナーがアクティブな場合のみクリアを試みる
                if (html5QrcodeScannerRef.current && html5QrcodeScannerRef.current.isScanning) {
                    console.log("Cleanup: Clearing scanner.");
                    // clear() は Promise を返すので .catch() でエラーハンドリング
                    html5QrcodeScannerRef.current.clear().catch(err => console.error("Failed to clear scanner during cleanup:", err));
                }
            };

        } else { // scanning が false の場合
            // scanning が false になった場合、スキャナーが起動中であれば停止し、refをクリア
            if (html5QrcodeScannerRef.current) {
                if (html5QrcodeScannerRef.current.isScanning) {
                    console.log("Stopping QR scanner because 'scanning' is false.");
                    html5QrcodeScannerRef.current.clear().then(() => {
                        console.log("QR scanner stopped (via scanning=false).");
                        html5QrcodeScannerRef.current = null; // スキャナー停止後、refをクリア
                    }).catch(err => {
                        console.error("Failed to clear scanner when scanning turned off:", err);
                    });
                } else {
                    // スキャナーインスタンスは存在するがスキャン中でない場合（例：起動に失敗した、既にクリアされた）
                    console.log("QR scanner instance exists but not scanning. Nullifying ref.");
                    html5QrcodeScannerRef.current = null; // 無駄なインスタンスがあればクリア
                }
            }
        }
    }, [scanning]); // scanning ステートが変更されたときに実行

    const toggleScanner = async () => {
        if (!scanning) {
            setMessage('');
            setError('');
            setToolId(''); // 新しいスキャンに備えてIDをクリア
        }
        setScanning(prev => !prev);
    };


    return (
        <div style={styles.container}>
            <h2>工具の貸し出し・返却</h2>

            <div style={styles.scannerToggle}>
                <button onClick={toggleScanner} style={styles.scannerButton}>
                    {scanning ? 'スキャナーを停止' : 'QRコードをスキャン'}
                </button>
            </div>

            {scanning && (
                <div style={styles.qrReaderContainer}>
                    {/* QRリーダーを表示する要素。html5-qrcodeはここに映像をレンダリングします */}
                    <div id="reader" style={styles.qrReaderVideoDiv}></div>
                    <p style={styles.scanningText}>カメラでQRコードを読み取ってください...</p>
                </div>
            )}

            {!scanning && (
                <div style={styles.inputGroup}>
                    <label htmlFor="toolIdInput" style={styles.label}>工具ID (手動入力)</label>
                    <input
                        type="text"
                        id="toolIdInput"
                        value={toolId}
                        onChange={handleIdChange}
                        placeholder="ここに工具IDを入力してください"
                        style={styles.input}
                        autoFocus
                    />
                </div>
            )}
            {scanning && toolId && <p style={styles.scannedIdText}>スキャンされたID: <strong>{toolId}</strong></p>}


            {loading && <p style={styles.loading}>データを取得中...</p>}
            {error && <p style={styles.error}>{error}</p>}
            {message && !error && <p style={styles.success}>{message}</p>}

            {toolData && (
                <div style={styles.toolDetails}>
                    <h3>工具情報</h3>
                    <p><strong>名称:</strong> {toolData.name}</p>
                    <p><strong>型番品番:</strong> {toolData.modelNumber}</p>
                    <p><strong>種類:</strong> {toolData.type}</p>
                    <p><strong>保管場所:</strong> {toolData.storageLocation}</p>
                    <p><strong>現在の状態:</strong> <span style={toolData.status === '貸出中' ? styles.statusLent : styles.statusAvailable}>{toolData.status}</span></p>
                    <div style={styles.buttonGroup}>
                        <button
                            onClick={() => handleUpdateStatus('貸出中')}
                            disabled={loading || toolData.status === '貸出中'}
                            style={{ ...styles.button, ...styles.lendButton }}
                        >
                            貸出中にする
                        </button>
                        <button
                            onClick={() => handleUpdateStatus('在庫')}
                            disabled={loading || toolData.status === '在庫'}
                            style={{ ...styles.button, ...styles.returnButton }}
                        >
                            在庫にする
                        </button>
                    </div>
                    {toolData.qr_code_base64 && (
                        <div style={styles.qrCodeContainer}>
                            <h4>QRコード (参照用)</h4>
                            <img src={toolData.qr_code_base64} alt="QR Code" style={styles.qrCodeImage} />
                            <p style={styles.qrCodeText}>この工具のQRコード</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// styles オブジェクトの最後に追加または修正
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
    inputGroup: {
        marginBottom: '15px',
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    input: {
        width: 'calc(100% - 20px)',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '16px',
    },
    loading: {
        color: '#007bff',
        textAlign: 'center',
    },
    error: {
        color: 'red',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    success: {
        color: 'green',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    toolDetails: {
        marginTop: '20px',
        paddingTop: '15px',
        borderTop: '1px solid #eee',
    },
    h3: {
        color: '#444',
        marginBottom: '10px',
    },
    p: {
        marginBottom: '5px',
        lineHeight: '1.5',
    },
    statusLent: {
        fontWeight: 'bold',
        color: 'orange',
    },
    statusAvailable: {
        fontWeight: 'bold',
        color: 'green',
    },
    buttonGroup: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px',
        justifyContent: 'center',
    },
    button: {
        padding: '10px 20px',
        fontSize: '16px',
        borderRadius: '5px',
        cursor: 'pointer',
        border: 'none',
        color: '#fff',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
    },
    lendButton: {
        backgroundColor: '#ffc107', // 貸出中を表す色
        '&:hover': {
            backgroundColor: '#e0a800',
        },
        '&:disabled': {
            backgroundColor: '#ffe08a',
            cursor: 'not-allowed',
        },
    },
    returnButton: {
        backgroundColor: '#28a745', // 在庫を表す色
        '&:hover': {
            backgroundColor: '#218838',
        },
        '&:disabled': {
            backgroundColor: '#90ee90',
            cursor: 'not-allowed',
        },
    },
    qrCodeContainer: {
        textAlign: 'center',
        marginTop: '20px',
        padding: '10px',
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
    // html5-qrcode が描画する div のスタイル
    qrReaderVideoDiv: {
        width: '100%',
        minHeight: '200px', // 少なくともこれくらいの高さがあると良い
        display: 'flex', // 内部要素を中央寄せするため
        justifyContent: 'center', // 内部要素を水平中央寄せ
        alignItems: 'center', // 内部要素を垂直中央寄せ
    },
    scanningText: {
        textAlign: 'center',
        color: '#666',
        marginTop: '10px',
    },
    scannedIdText: {
        textAlign: 'center',
        marginTop: '10px',
        fontSize: '1.1em',
        fontWeight: 'bold',
        color: '#333',
    }
};

export default LendReturnForm;