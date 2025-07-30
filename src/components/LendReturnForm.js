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
                    console.log("実際に取得された工具データ:", data); 
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

        // toolIdが変更されたとき、かつscanning中でない場合にfetchDetailsを呼び出す
        // これにより、QRスキャン中にfetchDetailsが誤ってトリガーされるのを防ぐ
        if (toolId && !scanning) {
            fetchDetails();
        }
    }, [toolId, scanning]); // scanningも依存配列に追加

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
        console.log(`LendReturnForm.js:onScanSuccess: QR Code Scanned: ${decodedText}`, decodedResult);
        setToolId(decodedText); // スキャン結果を工具IDとして設定
        setScanning(false); // スキャンを停止（useEffectで停止処理が走る）
    };

    // QRコードスキャンエラー時のコールバック関数
    const onScanError = async (errorMessage) => {
        console.log(`LendReturnForm.js:onScanError: ${errorMessage}`);

        if (errorMessage.includes("NotReadableError") || errorMessage.includes("permission")) {
            setError('カメラが使用できません。アクセスが拒否されたか、他のアプリがカメラを使用している可能性があります。');
            setScanning(false); // カメラエラーの場合はスキャンを停止
        } else if (errorMessage.includes("No MultiFormat Readers") || errorMessage.includes("NotFoundException")) {
            // QRコードが検出されない場合など、頻繁に発生するエラーなのでユーザーには表示しない
            // console.log("LendReturnForm.js:onScanError: No QR code detected in frame."); // デバッグ用にログは残す
        } else {
            setError(`カメラエラーが発生しました: ${errorMessage}`);
            setScanning(false); // その他のエラーでもスキャンを停止
        }
    };

    // QRスキャナーの起動/停止ロジックをuseEffectで管理
    useEffect(() => {
        if (scanning) { // scanningがtrueになったらスキャナーを起動
            setError('');
            setMessage('');

            const readerElement = document.getElementById('reader');
            if (!readerElement) {
                setError("カメラの表示領域が見つかりません。ページの読み込みに問題がある可能性があります。");
                setScanning(false);
                return;
            }

            // 既存のインスタンスをクリアしてから新しいインスタンスを作成する
            // Html5Qrcodeインスタンスは毎回新しいIDで作成することを推奨
            if (html5QrCodeRef.current) {
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

                } catch (err) {
                    console.error("LendReturnForm.js:useEffect[scanning]: Camera start error:", err);
                    setError(`カメラ起動エラー: ${err.message}`);
                    setScanning(false);
                }
            };

            startScanner();
        }

        // クリーンアップ関数
        return () => {
            console.log("LendReturnForm.js:useEffect[scanning] return cleanup: Checking scanner state for unmount.");
            if (html5QrCodeRef.current) {
                // isScanningを確認してから停止を試みる
                if (html5QrCodeRef.current.isScanning) {
                    console.log("LendReturnForm.js:useEffect[scanning] cleanup: Stopping scanner.");
                    html5QrCodeRef.current.stop().then(() => {
                        console.log("LendReturnForm.js:useEffect[scanning] cleanup: Scanner stopped.");
                        // 停止が完了したらクリアを試みる
                        html5QrCodeRef.current.clear().then(() => {
                            console.log("LendReturnForm.js:useEffect[scanning] cleanup: Scanner cleared after stop.");
                        }).catch(err => {
                            console.error("LendReturnForm.js:useEffect[scanning] cleanup: Failed to clear scanner after stop:", err);
                        });
                    }).catch(err => {
                        console.error("LendReturnForm.js:useEffect[scanning] cleanup: Failed to stop scanner:", err);
                        // 停止に失敗した場合でも、念のためクリアを試みる
                        html5QrCodeRef.current.clear().then(() => {
                            console.log("LendReturnForm.js:useEffect[scanning] cleanup: Scanner cleared after stop attempt failed.");
                        }).catch(clearErr => {
                            console.error("LendReturnForm.js:useEffect[scanning] cleanup: Failed to clear scanner after stop attempt failed:", clearErr);
                        });
                    });
                } else {
                    // スキャン中ではないがインスタンスが存在する場合、クリアを試みる
                    html5QrCodeRef.current.clear().then(() => {
                        console.log("LendReturnForm.js:useEffect[scanning] cleanup: Scanner cleared (not scanning).");
                    }).catch(err => {
                        console.error("LendReturnForm.js:useEffect[scanning] cleanup: Failed to clear scanner (not scanning):", err);
                    });
                }
                html5QrCodeRef.current = null; // 参照をクリア
            }
        };
    }, [scanning]); // scanningのみを依存配列に含める

    // スキャン開始/停止ボタンのハンドラ
    const toggleScanner = () => {
        setScanning(prev => !prev);
        if (scanning) { // scanningがtrueからfalseに変わる瞬間
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

            {/* スキャン中のみQRリーダーコンテナを表示 */}
            {scanning ? (
                <div style={styles.qrReaderContainer}>
                    {/* #reader は html5-qrcode がビデオやキャンバスを挿入する場所 */}
                    <div id="reader" style={styles.qrReaderVideoDiv}></div>
                    {/* QRコード未検出のエラーは頻繁に出るため、ユーザーには表示しない。カメラ自体のエラーのみ表示。 */}
                    {error && <p style={styles.errorText}>{error}</p>}
                </div>
            ) : (
                // スキャン中でない場合、かつtoolIdがある場合は、スキャン結果と工具情報エリアを表示
                // toolIdが入力された場合やスキャンされた場合に、即座に工具情報部分を表示する
                toolId ? (
                    <>
                        <div style={styles.qrCodeDisplay}>
                            <h3>スキャン結果</h3>
                            <p style={styles.qrCodeText}>スキャンされたID: {toolId}</p>
                        </div>
                        {/* ここに工具情報表示部分が続く */}
                        {loading && <p style={styles.loadingText}>ロード中...</p>}
                        {error && <p style={styles.errorText}>{error}</p>}
                        {message && <p style={styles.messageText}>{message}</p>}

                        {/* toolDataが存在する場合にのみ工具情報を表示し、ボタンを表示 */}
                        {toolData && ( 
                            <div style={styles.toolDetails}>
                                <h2>工具情報</h2>
                                [cite_start]{/* 工具IDの表示を追加 [cite: 1] */}
                                <p><strong>ID:</strong> {toolData["ID (QRコード)"]}</p> 
                                <p><strong>名称:</strong> {toolData.名称}</p>
                                <p><strong>状態:</strong> {toolData.状態}</p>
                                <p><strong>備考:</strong> {toolData.備考}</p>

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
                        {/* 手動入力フィールドも引き続き表示 */}
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
                    </>
                ) : (
                    // スキャン中でなく、toolIdもまだ設定されていない場合（初期状態など）
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
                )
            )}
            {/* 全体メッセージは常に表示 */}
            {!scanning && !toolId && (
                <>
                    {loading && <p style={styles.loadingText}>ロード中...</p>}
                    {error && <p style={styles.errorText}>{error}</p>}
                    {message && <p style={styles.messageText}>{message}</p>}
                </>
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
        padding: '0px',
        overflow: 'hidden',
    },
    qrReaderVideoDiv: {
        width: '100%',
        height: '300px', // 固定の高さを設定して、コンテンツが確実に見えるように
        backgroundColor: '#eee', // 映像が全くない場合に背景色を表示してデバッグしやすく
    },
};

export default LendReturnForm;