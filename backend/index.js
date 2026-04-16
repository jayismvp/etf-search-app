const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json());

const CSV_FILE_PATH = 'C:/Users/jayis/OneDrive - University of Utah/Development/etf/stock_to_etf.csv';
let stockData = [];

// Load CSV into memory on startup
function loadData() {
    console.log('Loading CSV data...');
    stockData = [];
    fs.createReadStream(CSV_FILE_PATH)
        .pipe(csv())
        .on('data', (row) => {
            if (stockData.length === 0) {
                console.log('Sample Data Row:', row);
            }
            stockData.push(row);
        })
        .on('end', () => {
            console.log(`CSV data loaded successfully. Total records: ${stockData.length}`);
        })
        .on('error', (error) => {
            console.error('Error loading CSV data:', error);
        });
}

loadData();

// Helper function to find value by partial key match (handles BOM/special chars)
function getVal(item, targetKey) {
    const keys = Object.keys(item);
    const foundKey = keys.find(k => k.toLowerCase().includes(targetKey.toLowerCase()));
    return foundKey ? item[foundKey] : '';
}

// Autocomplete suggestions endpoint
app.get('/suggestions', (req, res) => {
    const query = req.query.query;
    if (!query || query.length < 1) {
        return res.json([]);
    }

    const lowerQuery = query.toLowerCase();
    const suggestionsMap = new Map();

    for (const item of stockData) {
        if (suggestionsMap.size >= 10) break;

        const sName = getVal(item, 'stock_name');
        const sTicker = getVal(item, 'stock_ticker');

        const nameMatch = sName && sName.toLowerCase().includes(lowerQuery);
        const tickerMatch = sTicker && sTicker.toLowerCase().includes(lowerQuery);

        if (nameMatch || tickerMatch) {
            const key = `${sName} (${sTicker})`;
            if (!suggestionsMap.has(key)) {
                suggestionsMap.set(key, { name: sName, ticker: sTicker });
            }
        }
    }

    res.json(Array.from(suggestionsMap.values()));
});

// Search endpoint
app.get('/search', (req, res) => {
    const query = req.query.query;
    if (!query) return res.json([]);

    const lowerQuery = query.toLowerCase();
    const results = stockData.filter(item => {
        const sName = getVal(item, 'stock_name');
        const sTicker = getVal(item, 'stock_ticker');
        return (sName && sName.toLowerCase().includes(lowerQuery)) || (sTicker && sTicker.toLowerCase().includes(lowerQuery));
    }).map(item => ({
        stock_name: getVal(item, 'stock_name'),
        stock_ticker: getVal(item, 'stock_ticker'),
        etf_name: getVal(item, 'etf_name'),
        etf_ticker: getVal(item, 'etf_ticker'),
        listing_date: getVal(item, 'listing_date'),
        nav: getVal(item, 'NAV'),
        fee: getVal(item, 'fee'),
        weight: getVal(item, 'weight')
    }));

    res.json(results);
});

// ETF Holdings endpoint
app.get('/etf-holdings', (req, res) => {
    const etfTicker = req.query.ticker;
    if (!etfTicker) return res.json([]);

    const holdings = stockData.filter(item => getVal(item, 'etf_ticker') === etfTicker)
        .map(item => ({
            stock_name: getVal(item, 'stock_name'),
            stock_ticker: getVal(item, 'stock_ticker'),
            contract: getVal(item, 'contract'),
            amount: getVal(item, 'amount'),
            weight: getVal(item, 'weight'),
            fee: getVal(item, 'fee'),
            taxation: getVal(item, 'taxation'),
            premium_discount: getVal(item, 'premium/discount')
        }));

    res.json(holdings);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
