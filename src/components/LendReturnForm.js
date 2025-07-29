// src/components/LendReturnForm.js
import React, { useState, useEffect, useRef } from 'react';
import { getToolById, updateToolStatus } from '../api';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'; 

function LendReturnForm() {
    const [toolId, setToolId] = useState(''); // 入力された工具ID
    const [toolData, setToolData] = useState(null); // 取得した工具データ
    const [message, setMessage] = useState(''); // ユーザーへのメッセージ
    const [error, setError] = useState(''); // エラーメッセージ
    const [loading, setLoading] = useState(false); // ローディング状態
    const [scanning, setScanning] = useState(false); // QRコードスキャン中かどうか

    // QRコードスキャナーのインスタンスを保持するためのRef
    const html5QrCodeRef = useRef(null); 

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
    const onScanSuccess = async (decodedText, decodedResult) => {
        console.log(`QR Code Scanned: ${decodedText}`, decodedResult);
        setToolId(decodedText); // スキャン結果を工具IDとして設定
        setScanning(false); // スキャンを停止

        // スキャン成功後、カメラを停止
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                console.log("LendReturnForm.js:onScanSuccess: Scanner stopped after successful scan.");
            } catch (err) {
                console.error("LendReturnForm.js:onScanSuccess: Failed to stop scanner:", err);
            }
        }
    };

    // QRコードスキャンエラー時のコールバック関数
    const onScanError = async (errorMessage) => {
        console.log(`LendReturnForm.js:onScanError: ${errorMessage}`); 

        if (errorMessage.includes("NotReadableError") || errorMessage.includes("permission")) {
            setError('カメラが使用できません。アクセスが拒否されたか、他のアプリがカメラを使用している可能性があります。');
        } else if (errorMessage.includes("No MultiFormat Readers")) {
            // QRコードが検出されない場合など
        } else {
            setError(`カメラエラーが発生しました: ${errorMessage}`);
        }

        // エラー発生時にスキャナーを停止しようと試みる
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                console.log("LendReturnForm.js:onScanError: Scanner stopped due to error.");
            } catch (stopErr) {
                console.error("LendReturnForm.js:onScanError: Failed to stop scanner on error:", stopErr);
            }
        }
    };

    // QRスキャナーの起動/停止ロジックをuseEffectで管理
    useEffect(() => {
        if (scanning) { // scanningがtrueになったらスキャナーを起動
            setError('');
            setMessage('');

            const readerElement = document.getElementById('reader');
            console.log("LendReturnForm.js:useEffect[scanning]: 'reader' element exists?", !!readerElement, readerElement);

            if (!readerElement) {
                setError("カメラの表示領域が見つかりません。ページの読み込みに問題がある可能性があります。");
                setScanning(false);
                return;
            }

            // Html5Qrcode インスタンスをまだ作成していなければ作成
            // scanningがtrueになるたびに新しいインスタンスを作成する（または既存を再利用）
            // これにより、毎回クリーンな状態から開始できる
            if (html5QrCodeRef.current) {
                // 既存のインスタンスがある場合、完全にクリアしてから再利用
                // clear() は非同期なのでawaitする
                html5QrCodeRef.current.clear().then(() => {
                    console.log("LendReturnForm.js:useEffect[scanning]: Existing Html5Qrcode instance cleared.");
                }).catch(err => {
                    console.error("LendReturnForm.js:useEffect[scanning]: Failed to clear existing Html5Qrcode instance:", err);
                });
            }
            html5QrCodeRef.current = new Html5Qrcode("reader", { verbose: true });
            console.log("LendReturnForm.js:useEffect[scanning]: New Html5Qrcode instance created.");
            

            const startScanner = async () => {
                try {
                    // カメラ起動設定
                    const qrCodeConfig = {
                        fps: 10, // 1秒あたりのフレーム数
                        qrbox: { width: 250, height: 250 }, // QRコードの検出エリア
                        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
                    };

                    await html5QrCodeRef.current.start(
                        { facingMode: "environment" }, // 外付けカメラを優先
                        qrCodeConfig,
                        onScanSuccess,
                        onScanError
                    );
                    console.log("LendReturnForm.js:useEffect[scanning]: Html5Qrcode camera started successfully.");

                    // カメラが開始された後に、動画要素が存在するか確認
                    setTimeout(() => {
                        const videoElement = readerElement.querySelector('video');
                        if (videoElement) {
                            console.log("LendReturnForm.js:useEffect[scanning]: Video element found in #reader:", videoElement);
                            console.log("Video dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight);
                            // 映像が表示されない場合、ここで videoElement のスタイルを確認することもできます。
                            // console.log("Video style:", videoElement.style.cssText);
                        } else {
                            console.warn("LendReturnForm.js:useEffect[scanning]: No video element found in #reader after camera start.");
                            // さらに詳細なデバッグのため、readerElementの子要素を全てログ出力
                            console.log("LendReturnForm.js:useEffect[scanning]: Children of #reader:", readerElement.innerHTML);
                            setError("カメラ映像の表示に失敗しました。"); // ユーザーへのエラーメッセージ
                        }
                    }, 3000); // 3秒後にチェック
                } catch (err) {
                    console.error("LendReturnForm.js:useEffect[scanning]: Camera start error:", err);
                    setError(`カメラ起動エラー: ${err.message}`); // エラーメッセージを表示
                    setScanning(false); // エラー時はスキャンを停止
                }
            };
            
            startScanner();

        } else { // scanningがfalseになったらスキャナーを停止
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                console.log("LendReturnForm.js:useEffect[scanning] cleanup: Stopping scanner.");
                html5QrCodeRef.current.stop().then(() => {
                    console.log("Scanner stopped during cleanup.");
                }).catch(err => {
                    console.error("Failed to stop scanner during cleanup:", err);
                });
            }
            // scanningがfalseになったら、必ずクリアも行う
            if (html5QrCodeRef.current) {
                html5QrCodeRef.current.clear().then(() => {
                    console.log("Html5Qrcode cleared during cleanup (scanning is false).");
                }).catch(err => {
                    console.error("Failed to clear Html5Qrcode during cleanup (scanning is false):", err);
                });
            }
        }

        // クリーンアップ関数
        return () => {
            console.log("LendReturnForm.js:useEffect[scanning] return cleanup: Checking scanner state for unmount.");
            if (html5QrCodeRef.current) {
                if (html5QrCodeRef.current.isScanning) {
                    html5QrCodeRef.current.stop().then(() => {
                        console.log("Scanner stopped on component unmount.");
                    }).catch(err => {
                        console.error("Failed to stop scanner on component unmount:", err);
                    });
                }
                html5QrCodeRef.current.clear().then(() => {
                    console.log("Html5Qrcode cleared on component unmount.");
                }).catch(err => {
                    console.error("Failed to clear Html5Qrcode on component unmount:", err);
                });
            }
        };
    }, [scanning]);

    // スキャン開始/停止ボタンのハンドラ
    const toggleScanner = () => {
        setScanning(prev => !prev);
        if (scanning) { 
            setToolId(''); 
            setToolData(null);
            setMessage('');
            setError('');
        }
    };


    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>工具貸出・返却システム</h1>

            <div style={styles.scannerToggle}>
                <button onClick={toggleScanner} style={styles.scannerButton}>
                    {scanning ? 'スキャンを停止' : 'QRスキャンを開始'}
                </button>
            </div>

            {scanning && (
                <div style={styles.qrReaderContainer}>
                    {/* #reader は html5-qrcode がビデオやキャンバスを挿入する場所 */}
                    <div id="reader" style={styles.qrReaderVideoDiv}></div>
                    {error && <p style={styles.errorText}>{error}</p>}
                </div>
            )}

            {toolId && !scanning && ( // スキャン中でないときに結果を表示
                <div style={styles.qrCodeDisplay}>
                    <h3>スキャン結果</h3>
                    <p style={styles.qrCodeText}>スキャンされたID: {toolId}</p>
                </div>
            )}

            <div style={styles.inputSection}>
                <label htmlFor="toolIdInput" style={styles.label}>工具IDを手動で入力:</label>
                <input
                    type="text"
                    id="toolIdInput"
                    value={toolId}
                    onChange={(e) => setToolId(e.target.value)}
                    style={styles.input}
                    placeholder="工具IDを入力してください"
                />
            </div>

            {loading && <p style={styles.loadingText}>ロード中...</p>}
            {error && <p style={styles.errorText}>{error}</p>}
            {message && <p style={styles.messageText}>{message}</p>}

            {toolData && (
                <div style={styles.toolDetails}>
                    <h2>工具情報</h2>
                    <p><strong>ID:</strong> {toolData.ID}</p>
                    <p><strong>名称:</strong> {toolData.名称}</p>
                    <p><strong>状態:</strong> {toolData.状態}</p>

                    <div style={styles.buttonGroup}>
                        {toolData.状態 === '貸出可能' && (
                            <button
                                onClick={() => handleStatusUpdate('貸出中')}
                                style={{ ...styles.actionButton, ...styles.lendButton }}
                            >
                                貸出
                            </button>
                        )}
                        {toolData.状態 === '貸出中' && (
                            <button
                                onClick={() => handleStatusUpdate('貸出可能')}
                                style={{ ...styles.actionButton, ...styles.returnButton }}
                            >
                                返却
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// スタイル定義
const styles = {
    container: {
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '20px auto',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#fff',
    },
    heading: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '20px',
    },
    inputSection: {
        marginBottom: '20px',
        textAlign: 'center',
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontSize: '16px',
        color: '#555',
    },
    input: {
        width: 'calc(100% - 20px)',
        padding: '10px',
        fontSize: '16px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxSizing: 'border-box',
        maxWidth: '300px',
    },
    loadingText: {
        textAlign: 'center',
        color: '#007bff',
        marginTop: '10px',
    },
    errorText: {
        textAlign: 'center',
        color: 'red',
        marginTop: '10px',
    },
    messageText: {
        textAlign: 'center',
        color: 'green',
        marginTop: '10px',
    },
    toolDetails: {
        marginTop: '30px',
        padding: '20px',
        border: '1px solid #eee',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
    },
    buttonGroup: {
        marginTop: '20px',
        textAlign: 'center',
    },
    actionButton: {
        padding: '10px 20px',
        fontSize: '16px',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        margin: '0 10px',
        transition: 'background-color 0.2s',
    },
    lendButton: {
        backgroundColor: '#28a745',
        '&:hover': {
            backgroundColor: '#218838',
        },
    },
    returnButton: {
        backgroundColor: '#ffc107',
        color: '#333',
        '&:hover': {
            backgroundColor: '#e0a800',
        },
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
        position: 'relative',
        padding: '0px'
    },
    qrReaderVideoDiv: {
        width: '100%',
        height: '300px', // 固定の高さを設定して、コンテンツが確実に見えるように
        backgroundColor: '#eee', // 映像が全くない場合に背景色を表示してデバッグしやすく
    },
};

export default LendReturnForm;