interface PriceData {
  timestamp: number;
  price: number;
}

interface LatestPrices {
  quai: number;
  qi: number;
  timestamp: number;
}

const API_BASE_URL = 'https://conversions.quai.network/api';

export async function getQuaiPriceHistory(): Promise<PriceData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/prices/quai`);
    if (!response.ok) {
      throw new Error('Failed to fetch QUAI price history');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching QUAI price history:', error);
    return [];
  }
}

export async function getQiPriceHistory(): Promise<PriceData[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/prices/qi`);
    if (!response.ok) {
      throw new Error('Failed to fetch QI price history');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching QI price history:', error);
    return [];
  }
}

export async function getLatestPrices(): Promise<LatestPrices> {
  try {
    const response = await fetch(`${API_BASE_URL}/prices/latest`);
    if (!response.ok) {
      throw new Error('Failed to fetch latest prices');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching latest prices:', error);
    return {
      quai: 0,
      qi: 0,
      timestamp: Date.now()
    };
  }
} 