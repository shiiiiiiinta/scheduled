import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const DiagnosticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
  const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || !API_BASE_URL;

  useEffect(() => {
    const runDiagnostics = async () => {
      setLoading(true);
      const results: any = {
        timestamp: new Date().toISOString(),
        environment: {
          VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
          VITE_USE_MOCK_DATA: import.meta.env.VITE_USE_MOCK_DATA,
          API_BASE_URL,
          USE_MOCK_DATA,
          mode: import.meta.env.MODE,
          dev: import.meta.env.DEV,
          prod: import.meta.env.PROD,
        },
        endpoints: {},
      };

      // Test API endpoints
      if (API_BASE_URL) {
        const endpoints = [
          '/api/races/g1',
          '/api/prize-ranking',
          '/api/fan-vote-ranking',
          '/api/racer/4320',
          '/api/racer-performances?ids=4320,4444',
        ];

        for (const endpoint of endpoints) {
          try {
            const startTime = Date.now();
            const response = await fetch(`${API_BASE_URL}${endpoint}`);
            const endTime = Date.now();
            const contentType = response.headers.get('content-type') || 'unknown';
            const text = await response.text();
            
            let data;
            let isJSON = false;
            try {
              data = JSON.parse(text);
              isJSON = true;
            } catch {
              data = text.substring(0, 500); // HTMLの場合は最初の500文字のみ
            }
            
            results.endpoints[endpoint] = {
              status: response.status,
              ok: response.ok,
              responseTime: `${endTime - startTime}ms`,
              contentType,
              isJSON,
              dataKeys: isJSON ? Object.keys(data) : null,
              dataSize: text.length,
              preview: isJSON ? JSON.stringify(data).substring(0, 200) : text.substring(0, 200),
              fullUrl: `${API_BASE_URL}${endpoint}`,
            };
          } catch (error: any) {
            results.endpoints[endpoint] = {
              status: 'ERROR',
              error: error.message,
              fullUrl: `${API_BASE_URL}${endpoint}`,
            };
          }
        }
      }

      setTestResults(results);
      setLoading(false);
    };

    runDiagnostics();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ← ホームに戻る
        </button>
      </div>

      <h1 style={{ fontSize: '28px', marginBottom: '20px', color: '#dc3545' }}>
        🔧 システム診断
      </h1>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div
            style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #dc3545',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ marginTop: '20px' }}>診断を実行中...</p>
        </div>
      ) : (
        <>
          {/* Environment Variables */}
          <section style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#333' }}>
              📋 環境変数
            </h2>
            <div
              style={{
                backgroundColor: USE_MOCK_DATA ? '#fff3cd' : '#d4edda',
                border: `1px solid ${USE_MOCK_DATA ? '#ffc107' : '#28a745'}`,
                borderRadius: '4px',
                padding: '15px',
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <strong>状態:</strong>{' '}
                <span
                  style={{
                    color: USE_MOCK_DATA ? '#856404' : '#155724',
                    fontWeight: 'bold',
                  }}
                >
                  {USE_MOCK_DATA ? '⚠️ モックデータモード' : '✅ API接続モード'}
                </span>
              </div>
              <pre
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px',
                }}
              >
                {JSON.stringify(testResults.environment, null, 2)}
              </pre>
            </div>
          </section>

          {/* API Endpoints */}
          {API_BASE_URL && (
            <section style={{ marginBottom: '30px' }}>
              <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#333' }}>
                🌐 APIエンドポイント
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(testResults.endpoints).map(([endpoint, result]: [string, any]) => (
                  <div
                    key={endpoint}
                    style={{
                      backgroundColor: 'white',
                      border: `2px solid ${result.ok ? '#28a745' : '#dc3545'}`,
                      borderRadius: '4px',
                      padding: '15px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                      }}
                    >
                      <strong style={{ color: '#333' }}>{endpoint}</strong>
                      <span
                        style={{
                          padding: '4px 12px',
                          backgroundColor: result.ok ? '#28a745' : '#dc3545',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px',
                        }}
                      >
                        {result.status}
                      </span>
                    </div>
                    <pre
                      style={{
                        backgroundColor: '#f8f9fa',
                        padding: '10px',
                        borderRadius: '4px',
                        overflow: 'auto',
                        fontSize: '11px',
                        margin: 0,
                      }}
                    >
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Instructions */}
          <section
            style={{
              backgroundColor: '#d1ecf1',
              border: '1px solid #bee5eb',
              borderRadius: '4px',
              padding: '20px',
              marginTop: '30px',
            }}
          >
            <h2 style={{ fontSize: '20px', marginBottom: '15px', color: '#0c5460' }}>
              💡 解決方法
            </h2>

            {USE_MOCK_DATA ? (
              <>
                <p style={{ marginBottom: '10px', color: '#0c5460' }}>
                  <strong>現在、モックデータモードで動作しています。</strong>
                </p>
                <p style={{ marginBottom: '10px', color: '#0c5460' }}>
                  実際のデータを使用するには、Cloudflare Pagesで以下の環境変数を設定してください：
                </p>
                <ol style={{ marginLeft: '20px', color: '#0c5460' }}>
                  <li>
                    Cloudflare Dashboard → Workers & Pages → scheduled → Settings →
                    Environment variables
                  </li>
                  <li>
                    <code>VITE_API_BASE_URL</code> を設定（例：
                    https://boatrace-api-worker.your-subdomain.workers.dev）
                  </li>
                  <li>
                    <code>VITE_USE_MOCK_DATA</code> を <code>false</code> に設定
                  </li>
                  <li>保存して再デプロイ</li>
                </ol>
                <p style={{ marginTop: '15px', color: '#0c5460' }}>
                  詳細は{' '}
                  <a
                    href="https://github.com/shiiiiiiinta/scheduled/blob/main/CLOUDFLARE_PAGES_SETUP.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#007bff', textDecoration: 'underline' }}
                  >
                    CLOUDFLARE_PAGES_SETUP.md
                  </a>{' '}
                  を参照してください。
                </p>
              </>
            ) : (
              <>
                <p style={{ marginBottom: '10px', color: '#0c5460' }}>
                  <strong>✅ API接続モードで動作しています。</strong>
                </p>
                <p style={{ color: '#0c5460' }}>
                  上記のエンドポイントテスト結果を確認して、すべてのAPIが正常に動作しているか確認してください。
                </p>
              </>
            )}
          </section>

          {/* Reload Button */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              🔄 再診断
            </button>
          </div>
        </>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};
