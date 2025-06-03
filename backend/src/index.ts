import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Store price history
let quaiPriceHistory: Array<{ timestamp: number; price: number }> = [];
let qiPriceHistory: Array<{ timestamp: number; price: number }> = [];

// Constants for data retention
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
const BLOCKS_PER_DAY = (24 * 60 * 60) / 5; // 17280 blocks per day
const BLOCKS_FOR_90_DAYS = BLOCKS_PER_DAY * 90;

// Fallback price data (last known good prices)
const FALLBACK_PRICES = {
  quai: 0.068177, // Last known QUAI price
  qiToQuaiRate: 1000, // Last known QI to QUAI rate
};

// Function to fetch latest block number
async function fetchLatestBlockNumber(): Promise<string> {
  try {
    const response = await fetch('https://rpc.quai.network/cyprus1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'quai_blockNumber',
        params: [],
      }),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch latest block number: ${response.status}`);
      return '0x0';
    }

    const data = await response.json();
    return data.result || '0x0';
  } catch (error) {
    console.error('Error fetching latest block number:', error);
    return '0x0';
  }
}

// Function to fetch block header by number
async function fetchBlockHeader(blockNumber: string): Promise<{ timestamp: number; number: string } | null> {
  try {
    const response = await fetch('https://rpc.quai.network/cyprus1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'quai_getHeaderByNumber',
        params: [blockNumber],
      }),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch block header for block ${blockNumber}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.result) {
      console.warn(`No block data received for block ${blockNumber}`);
      return null;
    }

    // Convert hex timestamp to decimal and then to milliseconds
    const timestampHex = data.result.woHeader.timestamp;
    console.log(`Raw timestamp hex for block ${blockNumber}: ${timestampHex}`);
    
    const timestampDecimal = parseInt(timestampHex, 16);
    const timestampMs = timestampDecimal * 1000;

    // Validate timestamp
    if (isNaN(timestampMs) || timestampMs <= 0) {
      console.warn(`Invalid timestamp received for block ${blockNumber}: ${timestampHex}`);
      return null;
    }

    return {
      timestamp: timestampMs,
      number: data.result.number,
    };
  } catch (error) {
    console.error(`Error fetching block header for block ${blockNumber}:`, error);
    return null;
  }
}

// Function to fetch QI to QUAI rate for a specific block
async function fetchQiToQuaiRateForBlock(blockNumber: string): Promise<number> {
  try {
    const response = await fetch('https://rpc.quai.network/cyprus1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'quai_qiToQuai',
        params: ['0x3E8', blockNumber],
      }),
    });

    if (!response.ok) {
      console.warn(`Failed to fetch QI to QUAI rate for block ${blockNumber}: ${response.status}`);
      return FALLBACK_PRICES.qiToQuaiRate;
    }

    const data = await response.json();
    // Convert from hex to decimal and divide by 10^18 (matching frontend calculation)
    const rate = parseInt(data.result, 16) / 10 ** 18;

    if (isNaN(rate) || rate === 0) {
      console.warn(`Invalid QI to QUAI rate received for block ${blockNumber}`);
      return FALLBACK_PRICES.qiToQuaiRate;
    }

    return rate;
  } catch (error) {
    console.error(`Error fetching QI to QUAI rate for block ${blockNumber}:`, error);
    return FALLBACK_PRICES.qiToQuaiRate;
  }
}

// Function to fetch current QUAI price from CoinGecko
async function fetchCurrentQuaiPrice(): Promise<number> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=quai-network&vs_currencies=usd',
      {
        timeout: 5000, // 5 second timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0' // Add user agent to avoid some API restrictions
        }
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch current QUAI price: ${response.status}`);
      return FALLBACK_PRICES.quai;
    }

    const data = await response.json();
    const price = data['quai-network']?.usd;

    if (!price) {
      console.warn('No current price data available');
      return FALLBACK_PRICES.quai;
    }

    return price;
  } catch (error) {
    console.error('Error fetching current QUAI price:', error);
    return FALLBACK_PRICES.quai;
  }
}

// Function to clean old data
function cleanOldData() {
  const cutoffTime = Date.now() - THREE_MONTHS_MS;
  quaiPriceHistory = quaiPriceHistory.filter(data => data.timestamp >= cutoffTime);
  qiPriceHistory = qiPriceHistory.filter(data => data.timestamp >= cutoffTime);
  console.log(`Cleaned old data. Current data points: ${quaiPriceHistory.length}`);
}

// Initialize historical data with block-based rates
async function initializeHistoricalData() {
  console.log('Initializing price data...');
  
  // Clear existing data
  quaiPriceHistory = [];
  qiPriceHistory = [];
  
  // Get current QUAI price
  const currentQuaiPrice = await fetchCurrentQuaiPrice();
  console.log(`Current QUAI price: $${currentQuaiPrice}`);
  
  // Get latest block number
  const latestBlockHex = await fetchLatestBlockNumber();
  const latestBlockNumber = parseInt(latestBlockHex, 16);
  console.log(`Latest block number: ${latestBlockNumber}`);
  
  // Calculate start block for 90 days
  const startBlock = Math.max(0, latestBlockNumber - BLOCKS_FOR_90_DAYS);
  
  // Process blocks in batches
  const batchSize = 60; // Process 60 blocks at a time (5 minutes worth of blocks)
  let processedCount = 0;
  
  // Initialize with current block data first
  const currentBlockHeader = await fetchBlockHeader(latestBlockHex);
  if (currentBlockHeader) {
    const qiToQuaiRate = await fetchQiToQuaiRateForBlock(latestBlockHex);
    const qiPrice = currentQuaiPrice * qiToQuaiRate;
    
    quaiPriceHistory.push({ timestamp: currentBlockHeader.timestamp, price: currentQuaiPrice });
    qiPriceHistory.push({ timestamp: currentBlockHeader.timestamp, price: qiPrice });
    console.log(`Added current block data: Block ${latestBlockNumber}, Time ${new Date(currentBlockHeader.timestamp).toLocaleString()}, QI Rate: ${qiToQuaiRate}, QI Price: $${qiPrice}`);
  }
  
  // Then process historical blocks
  for (let blockNumber = latestBlockNumber - batchSize; blockNumber >= startBlock; blockNumber -= batchSize) {
    try {
      const blockHex = `0x${blockNumber.toString(16)}`;
      const blockHeader = await fetchBlockHeader(blockHex);
      if (!blockHeader) continue;
      
      const qiToQuaiRate = await fetchQiToQuaiRateForBlock(blockHex);
      const qiPrice = currentQuaiPrice * qiToQuaiRate;
      
      quaiPriceHistory.push({ timestamp: blockHeader.timestamp, price: currentQuaiPrice });
      qiPriceHistory.push({ timestamp: blockHeader.timestamp, price: qiPrice });
      
      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`Processed ${processedCount} blocks. Current block: ${blockNumber}, Time: ${new Date(blockHeader.timestamp).toLocaleString()}, QI Rate: ${qiToQuaiRate}, QI Price: $${qiPrice}`);
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
    }
  }
  
  // Sort the data by timestamp
  quaiPriceHistory.sort((a, b) => a.timestamp - b.timestamp);
  qiPriceHistory.sort((a, b) => a.timestamp - b.timestamp);
  
  console.log(`Historical data initialization complete. Processed ${processedCount} blocks.`);
  console.log(`Total data points: ${quaiPriceHistory.length}`);
}

// Update prices every 5 minutes
async function updatePrices() {
  try {
    const quaiPrice = await fetchCurrentQuaiPrice();
    const latestBlockHex = await fetchLatestBlockNumber();
    const qiToQuaiRate = await fetchQiToQuaiRateForBlock(latestBlockHex);
    const qiPrice = quaiPrice * qiToQuaiRate;

    // Get block header for timestamp
    const blockHeader = await fetchBlockHeader(latestBlockHex);
    if (!blockHeader) {
      throw new Error('Failed to get block header for latest block');
    }

    // Update price histories
    quaiPriceHistory.push({ timestamp: blockHeader.timestamp, price: quaiPrice });
    qiPriceHistory.push({ timestamp: blockHeader.timestamp, price: qiPrice });

    // Clean old data
    cleanOldData();
    
    console.log(`Prices updated: QUAI=$${quaiPrice}, QI=$${qiPrice} (Block: ${latestBlockHex})`);
  } catch (error) {
    console.error('Error updating prices:', error);
  }
}

// Initialize historical data and start the update interval
initializeHistoricalData().then(() => {
  // Initial price update
  updatePrices();
  
  // Update prices every 5 minutes
  setInterval(updatePrices, 5 * 60 * 1000);
  
  // Clean old data every hour
  setInterval(cleanOldData, 60 * 60 * 1000);
});

// API endpoints
app.get('/api/prices/quai', (_, res) => {
  res.json(quaiPriceHistory);
});

app.get('/api/prices/qi', (_, res) => {
  res.json(qiPriceHistory);
});

app.get('/api/healthz', (_, res) => {
  res.status(200).send('OK');
});


app.get('/api/prices/latest', (_, res) => {
  const latestQuai = quaiPriceHistory[quaiPriceHistory.length - 1];
  const latestQi = qiPriceHistory[qiPriceHistory.length - 1];
  res.json({
    quai: latestQuai?.price || FALLBACK_PRICES.quai,
    qi: latestQi?.price || (FALLBACK_PRICES.quai / FALLBACK_PRICES.qiToQuaiRate),
    timestamp: Date.now(),
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 