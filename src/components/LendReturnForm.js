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

    // ★html5-qrcode のロジックを useEffect で管理
    useEffect(() => {
        let currentScannerInstance = html5QrcodeScannerRef.current; // useRefを使ってインスタンスを管理するよう修正

        if (scanning) {
            const readerElement = document.getElementById("reader");
            if (!readerElement) {
                console.error("QR reader element 'reader' not found in DOM. Cannot start scanner.");
                setError("スキャナーの表示要素が見つかりませんでした。");
                setScanning(false);
                return;
            }

            if (!currentScannerInstance) {
                try {
                    currentScannerInstance = new Html5QrcodeScanner(
                        "reader",
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            rememberLastUsedCamera: true,
                            supportedScanFormats: [
                                Html5QrcodeSupportedFormats.QR_CODE,
                                Html5QrcodeSupportedFormats.CODE_128,
                                Html5QrcodeSupportedFormats.CODE_39,
                            ]
                        },
                        /* verbose= */ false
                    );
                    html5QrcodeScannerRef.current = currentScannerInstance;
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

            // At this point, currentScannerInstance should be non-null if instantiation was successful.
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
                // html5QrcodeScanner.clear() の代わりに currentScannerInstance.clear() を使う
                if (currentScannerInstance && currentScannerInstance.isScanning) {
                    currentScannerInstance.clear().catch(err => console.error("Failed to clear scanner on success:", err));
                }
            };

            // スキャンエラー時のコールバック関数 (詳細ログを再有効化)
            const onScanError = (errorMessage) => {
                console.error(`QR Code Scan Error: ${errorMessage}`); // ★変更: console.error に変更して必ずログに出す
                // エラータイプによってはユーザーに通知することも可能
                if (errorMessage.includes("NotReadableError") || errorMessage.includes("permission")) {
                    setError('カメラが使用できません。アクセスが拒否されたか、他のアプリがカメラを使用している可能性があります。');
                } else {
                    setError(`カメラエラーが発生しました: ${errorMessage}`);
                }
                setScanning(false); // エラー時はスキャンを停止
                // スキャンエラー後もスキャナーを停止し、リソースを解放
                if (currentScannerInstance && currentScannerInstance.isScanning) {
                    currentScannerInstance.clear().catch(err => console.error("Failed to clear scanner on error:", err));
                }
            };

            // ★追加: render() 呼び出しの直前に id="reader" 要素の存在を確認
            const readerDiv = document.getElementById("reader");
            console.log("Before render: 'reader' element exists?", !!readerDiv, readerDiv);

            // スキャナーのレンダリング開始
            try {
                // ★変更: render() の戻り値をログに出力
                const renderResult = currentScannerInstance.render(onScanSuccess, onScanError);
                console.log("Html5QrcodeScanner.render() returned:", renderResult); // ★追加

                if (renderResult && typeof renderResult.then === 'function') { // Promiseかどうかを確認
                    renderResult.catch(err => {
                        console.error("Failed to start QR scanner (Html5QrcodeScanner.render) promise rejection:", err);
                        setError('カメラの起動に失敗しました。ブラウザの権限を確認してください。');
                        setScanning(false);
                        // renderがPromiseを返したがrejectされた場合もクリアを試みる
                        if (currentScannerInstance && currentScannerInstance.isScanning) {
                            currentScannerInstance.clear().catch(clearErr => console.error("Failed to clear scanner after render rejection:", clearErr));
                        }
                    });
                } else {
                    // Promiseを返さなかった場合のハンドリング（現在発生しているUndefinedのエラーケース）
                    console.error("Html5QrcodeScanner.render() did not return a Promise. Returned:", renderResult);
                    setError('カメラの初期化中に予期せぬエラーが発生しました。');
                    setScanning(false);
                    // このケースでは clear() は不要か、安全に呼び出せない可能性がある
                }
            } catch (renderCallError) {
                // render() 呼び出し自体がエラーを投げた場合 (これは通常起こらないが念のため)
                console.error("Html5QrcodeScanner.render() call itself threw an error:", renderCallError);
                setError('カメラの起動中に致命的なエラーが発生しました。');
                setScanning(false);
            }

            // コンポーネントのアンマウント時、または scanning が false になった時にクリーンアップ
            return () => {
                // 修正: useRef に保存されたインスタンスに対して clear() を呼ぶ
                if (html5QrcodeScannerRef.current && html5QrcodeScannerRef.current.isScanning) {
                    html5QrcodeScannerRef.current.clear().catch(err => console.error("Failed to clear scanner on unmount/stop:", err));
                }
                // scanning が false になった時にスキャナーを停止するロジックは、toggleScanner内で setScanning(false) が行われた場合に
                // この useEffect が再実行され、上の if (!scanning) ブロックで制御される。
                // あるいは、ここで explicit に clear() を呼ぶことで対応。
                // html5QrcodeScannerRef.current を使うのが最も安全。
            };
        } else {
            // scanning が false になった場合、もしスキャナーが起動中であれば停止
            if (html5QrcodeScannerRef.current && html5QrcodeScannerRef.current.isScanning) {
                html5QrcodeScannerRef.current.clear().catch(err => console.error("Failed to clear scanner when scanning becomes false:", err));
            }
        }
    }, [scanning]); // scanning ステートが変更されたときに実行

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