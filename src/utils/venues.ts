import type { Venue } from '../types';

// 全国24競艇場マスタデータ
export const VENUES: Venue[] = [
  { code: '01', name: '桐生', prefecture: '群馬' },
  { code: '02', name: '戸田', prefecture: '埼玉' },
  { code: '03', name: '江戸川', prefecture: '東京' },
  { code: '04', name: '平和島', prefecture: '東京' },
  { code: '05', name: '多摩川', prefecture: '東京' },
  { code: '06', name: '浜名湖', prefecture: '静岡' },
  { code: '07', name: '蒲郡', prefecture: '愛知' },
  { code: '08', name: '常滑', prefecture: '愛知' },
  { code: '09', name: '津', prefecture: '三重' },
  { code: '10', name: '三国', prefecture: '福井' },
  { code: '11', name: 'びわこ', prefecture: '滋賀' },
  { code: '12', name: '住之江', prefecture: '大阪' },
  { code: '13', name: '尼崎', prefecture: '兵庫' },
  { code: '14', name: '鳴門', prefecture: '徳島' },
  { code: '15', name: '丸亀', prefecture: '香川' },
  { code: '16', name: '児島', prefecture: '岡山' },
  { code: '17', name: '宮島', prefecture: '広島' },
  { code: '18', name: '徳山', prefecture: '山口' },
  { code: '19', name: '下関', prefecture: '山口' },
  { code: '20', name: '若松', prefecture: '福岡' },
  { code: '21', name: '芦屋', prefecture: '福岡' },
  { code: '22', name: '福岡', prefecture: '福岡' },
  { code: '23', name: '唐津', prefecture: '佐賀' },
  { code: '24', name: '大村', prefecture: '長崎' },
];

// コードから場名を取得
export const getVenueName = (code: VenueCode): string => {
  const venue = VENUES.find((v) => v.code === code);
  return venue?.name || code;
};

// 場名からコードを取得
export const getVenueCode = (name: string): VenueCode | undefined => {
  const venue = VENUES.find((v) => v.name === name);
  return venue?.code;
};

type VenueCode = string;
