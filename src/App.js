import React, { useState } from 'react';
import ToolForm from './ToolForm';
import ToolList from './ToolList';
import './App.css'; // 必要であればCSSファイルをインポート

function App() {
    const [refreshList, setRefreshList] = useState(0);

    // 工具登録後に一覧を更新するためのコールバック
    const handleToolRegistered = () => {
        setRefreshList(prev => prev + 1);
    };

    return (
        <div className="App" style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '20px auto', padding: '20px', border: '1px solid #eee', boxShadow: '2px 2px 10px rgba(0,0,0,0.1)' }}>
            <h1>工具・治具管理システム</h1>
            <ToolForm onToolRegistered={handleToolRegistered} />
            <hr style={{ margin: '40px 0' }} />
            <ToolList refreshTrigger={refreshList} />
        </div>
    );
}

export default App;