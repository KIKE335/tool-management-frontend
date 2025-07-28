// src/App.js
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import ToolForm from './components/ToolForm';
import ToolList from './components/ToolList';
import LendReturnForm from './components/LendReturnForm'; // ★新しく追加

function App() {
    // ToolListを再フェッチするための状態（必要に応じてToolFormから呼び出す）
    const [refreshList, setRefreshList] = useState(false);

    const handleToolRegistered = () => {
        setRefreshList(prev => !prev); // 状態をトグルしてToolListに再フェッチを促す
    };

    return (
        <Router>
            <div style={styles.container}>
                <h1 style={styles.header}>工具・治具 管理システム</h1>
                <nav style={styles.nav}>
                    <ul style={styles.navList}>
                        <li style={styles.navItem}>
                            <Link to="/" style={styles.navLink}>工具一覧</Link>
                        </li>
                        <li style={styles.navItem}>
                            <Link to="/register" style={styles.navLink}>工具登録</Link>
                        </li>
                        <li style={styles.navItem}>
                            <Link to="/lend-return" style={styles.navLink}>貸出・返却</Link> {/* ★新しく追加 */}
                        </li>
                    </ul>
                </nav>

                <div style={styles.content}>
                    <Routes>
                        <Route path="/" element={<ToolList refresh={refreshList} />} />
                        <Route path="/register" element={<ToolForm onToolRegistered={handleToolRegistered} />} />
                        <Route path="/lend-return" element={<LendReturnForm />} /> {/* ★新しく追加 */}
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

const styles = {
    container: {
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
        backgroundColor: '#f4f7f6',
        minHeight: '100vh',
    },
    header: {
        textAlign: 'center',
        color: '#333',
        marginBottom: '30px',
    },
    nav: {
        backgroundColor: '#e9ecef',
        padding: '10px 0',
        borderRadius: '8px',
        marginBottom: '20px',
    },
    navList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
    },
    navItem: {
        // 必要であればスタイルを追加
    },
    navLink: {
        textDecoration: 'none',
        color: '#007bff',
        fontWeight: 'bold',
        padding: '8px 15px',
        borderRadius: '5px',
        transition: 'background-color 0.2s, color 0.2s',
    },
    content: {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
    },
};

export default App;