import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { boatraceAPI } from '../api/boatrace';
import type { Racer } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Racer[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await boatraceAPI.searchRacers(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('検索エラー:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRacerClick = (racerId: string) => {
    navigate(`/racer/${racerId}`);
  };

  const handleG1RacesClick = () => {
    navigate('/races/g1');
  };

  const handleSGRankingClick = () => {
    navigate('/sg-ranking');
  };

  const handleSGListClick = () => {
    navigate('/sg');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>競艇選手 出走予定</h1>

      {/* ①選手番号で検索 */}
      <div style={{ marginBottom: '40px', padding: '24px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '16px' }}>①選手番号で検索</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="選手番号を入力（例: 4444）"
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              padding: '8px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {isSearching ? '検索中...' : '検索'}
          </button>
        </div>

        {/* 検索結果 */}
        {searchResults.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>検索結果</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map((racer) => (
                <div
                  key={racer.id}
                  onClick={() => handleRacerClick(racer.id)}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: '#f8f9fa',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e9ecef')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{racer.name}</strong>
                      <span style={{ marginLeft: '8px', color: '#666' }}>({racer.id})</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          fontSize: '12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          borderRadius: '4px',
                        }}
                      >
                        {racer.rank}
                      </span>
                      <span style={{ fontSize: '14px', color: '#666' }}>勝率: {racer.winRate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ②今後のG1以上のレースから探す */}
      <div style={{ marginBottom: '40px', padding: '24px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '16px' }}>②今後のG1以上のレースから探す</h2>
        <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          向こう3ヶ月のG1以上のレースが一覧表示されます
        </p>
        <button
          onClick={handleG1RacesClick}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          G1以上のレース一覧を見る
        </button>
      </div>

      {/* ③SG競走スケジュール */}
      <div style={{ marginBottom: '40px', padding: '24px', border: '1px solid #ddd', borderRadius: '8px', background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%)' }}>
        <h2 style={{ marginBottom: '16px', color: '#c41e3a' }}>③SG競走スケジュール</h2>
        <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          2026年の全8大会のSG競走スケジュールと出場資格選手を確認できます
        </p>
        <button
          onClick={handleSGListClick}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            backgroundColor: '#c41e3a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          SG競走スケジュールを見る
        </button>
      </div>

      {/* SG出場資格選手 */}
      <div style={{ padding: '24px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2 style={{ marginBottom: '16px' }}>SG出場資格選手（旧版）</h2>
        <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          SG出場資格を持つ選手の順位とポイントを確認できます
        </p>
        <button
          onClick={handleSGRankingClick}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            backgroundColor: '#ffc107',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          SG出場資格選手を見る
        </button>
      </div>
    </div>
  );
};
