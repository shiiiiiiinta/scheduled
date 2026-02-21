import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SG_SCHEDULE_2026 } from '../types/sg';
import type { SGRace } from '../types/sg';

export default function SGListPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // 開催日順にソート
  const sortedRaces = [...SG_SCHEDULE_2026].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  // SGグレード色
  const getGradeColor = (type: string) => {
    if (type === 'GRAND_PRIX') return 'bg-gradient-to-r from-purple-600 to-pink-600';
    return 'bg-gradient-to-r from-red-600 to-orange-600';
  };

  // 開催状態
  const getRaceStatus = (race: SGRace): 'upcoming' | 'ongoing' | 'finished' => {
    const now = new Date();
    const start = new Date(race.startDate);
    const end = new Date(race.endDate);

    if (now < start) return 'upcoming';
    if (now > end) return 'finished';
    return 'ongoing';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">SG競走スケジュール</h1>
              <p className="text-red-100">最高峰のレースカレンダー</p>
            </div>
            <Link
              to="/"
              className="px-6 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold"
            >
              ホームへ
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* 年度選択 */}
        <div className="mb-8 flex items-center gap-4">
          <label className="text-gray-700 font-semibold">開催年度:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value={2025}>2025年</option>
            <option value={2026}>2026年</option>
            <option value={2027}>2027年</option>
          </select>
        </div>

        {/* SG一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedRaces.map((race) => {
            const status = getRaceStatus(race);
            return (
              <Link
                key={race.id}
                to={`/sg/${race.type.toLowerCase()}`}
                className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                {/* カードヘッダー */}
                <div className={`${getGradeColor(race.type)} p-6 text-white relative`}>
                  {/* ステータスバッジ */}
                  {status === 'ongoing' && (
                    <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      開催中
                    </div>
                  )}
                  {status === 'finished' && (
                    <div className="absolute top-4 right-4 bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      終了
                    </div>
                  )}

                  <h2 className="text-2xl font-bold mb-2">{race.name}</h2>
                  <p className="text-sm opacity-90">{race.fullName}</p>
                </div>

                {/* カード本体 */}
                <div className="p-6">
                  {/* 開催日程 */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="font-semibold text-lg">
                        {formatDateRange(race.startDate, race.endDate)}
                      </span>
                    </div>

                    {/* 開催場 */}
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="font-semibold">{race.venue}</span>
                    </div>
                  </div>

                  {/* 優勝賞金 */}
                  <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-yellow-800 text-sm font-semibold mb-1">
                      優勝賞金
                    </div>
                    <div className="text-2xl font-bold text-yellow-900">
                      {race.prizeMoney.toLocaleString()}
                      <span className="text-lg ml-1">万円</span>
                    </div>
                  </div>

                  {/* 出場資格 */}
                  <div className="mb-4">
                    <div className="text-gray-600 text-sm font-semibold mb-1">
                      出場資格
                    </div>
                    <div className="text-gray-700 text-sm leading-relaxed">
                      {race.qualificationCriteria}
                    </div>
                  </div>

                  {/* 詳細ボタン */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <button className="w-full py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-semibold hover:from-red-700 hover:to-orange-700 transition-all">
                      出場資格者を確認 →
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* GRANDE5説明 */}
        <div className="mt-12 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-8 border-2 border-amber-200">
          <h3 className="text-2xl font-bold text-amber-900 mb-4 flex items-center gap-2">
            <svg
              className="w-8 h-8"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            GRANDE5（グランデファイブ）
          </h3>
          <p className="text-amber-800 mb-4 leading-relaxed">
            ボートレース界で最も歴史と格式を誇る5つのSGレースを総称して「GRANDE5」と呼びます。
            これら5つのレースを全て制覇した選手には、<strong className="text-amber-900">3億円相当の金塊（インゴット）</strong>が贈呈されます。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {['クラシック', 'オールスター', 'メモリアル', 'ダービー', 'グランプリ'].map((name) => (
              <div
                key={name}
                className="bg-white px-4 py-2 rounded-lg text-center font-semibold text-amber-900 border border-amber-300"
              >
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* 注意事項 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h4 className="text-blue-900 font-bold mb-2 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            ご注意
          </h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• 出場選手は各SGごとに異なる選出基準で決定されます</li>
            <li>• フライング等の事故により出場資格を喪失する場合があります</li>
            <li>• 最新の出場選手情報は公式サイトをご確認ください</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
