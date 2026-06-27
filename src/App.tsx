import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RacerPage } from './pages/RacerPage';
import { G1RacesPage } from './pages/G1RacesPage';
import { RaceEntryPage } from './pages/RaceEntryPage';
import { SGRankingPage } from './pages/SGRankingPage';
import SGListPage from './pages/SGListPage';
import SGDetailPage from './pages/SGDetailPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import './App.css';

// モックデータ使用中かどうか（本番はD1データを使用）
const USE_MOCK_DATA =
  import.meta.env.VITE_USE_MOCK_DATA === 'true' || !import.meta.env.VITE_API_BASE_URL;

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <header
          style={{
            backgroundColor: '#1976d2',
            color: 'white',
            padding: '16px 20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              🚤 競艇選手 出走予定
            </h1>
          </div>
        </header>

        <main style={{ padding: '20px 0' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/racer/:racerId" element={<RacerPage />} />
            <Route path="/races/g1" element={<G1RacesPage />} />
            <Route path="/race/:raceId" element={<RaceEntryPage />} />
            <Route path="/sg-ranking" element={<SGRankingPage />} />
            <Route path="/sg" element={<SGListPage />} />
            <Route path="/sg/:sgType" element={<SGDetailPage />} />
            <Route path="/diagnostics" element={<DiagnosticsPage />} />
          </Routes>
        </main>

        <footer
          style={{
            marginTop: '40px',
            padding: '20px',
            backgroundColor: '#fff',
            borderTop: '1px solid #ddd',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px',
          }}
        >
          <p style={{ margin: 0 }}>
            競艇選手 出走予定管理アプリ | データは boatrace.jp を参照
          </p>
          {USE_MOCK_DATA && (
            <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
              ※このアプリはモックデータを使用しています。実際の出走予定データとは異なる場合があります。
            </p>
          )}
        </footer>
      </div>
    </Router>
  );
}

export default App;
