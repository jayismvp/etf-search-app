const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const CSV_FILE_PATH = 'C:/Users/jayis/OneDrive - University of Utah/Development/etf/stock_to_etf.csv';
const SQL_OUTPUT_PATH = path.join(__dirname, 'etf_data.sql');

const results = [];

console.log('Starting conversion...');

fs.createReadStream(CSV_FILE_PATH)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log(`Read ${results.length} rows. Generating SQL...`);
    
    // Helper to escape single quotes and handle nulls
    const escape = (val) => {
      if (val === undefined || val === null || val === '') return 'NULL';
      const escaped = val.toString().replace(/'/g, "''");
      return `'${escaped}'`;
    };

    // Helper to find value by partial key match (handles BOM/special chars)
    const getVal = (item, targetKey) => {
      const keys = Object.keys(item);
      const foundKey = keys.find(k => k.toLowerCase().includes(targetKey.toLowerCase()));
      return foundKey ? item[foundKey] : null;
    };

    const sqlHeader = `DELETE FROM stocks;\n`;
    const sqlFooter = ``;
    
    let sqlContent = sqlHeader;
    const batchSize = 100;
    
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      const values = batch.map(row => {
        const sTicker = getVal(row, 'stock_ticker');
        const sName = getVal(row, 'stock_name');
        const eTicker = getVal(row, 'etf_ticker');
        const eName = getVal(row, 'etf_name');
        const lDate = getVal(row, 'listing_date');
        const navVal = getVal(row, 'NAV');
        const feeVal = getVal(row, 'fee');
        const weightVal = getVal(row, 'weight');
        const taxVal = getVal(row, 'taxation');
        const premVal = getVal(row, 'premium/discount');
        
        return `(${escape(sTicker)}, ${row.contract || 'NULL'}, ${row.amount || 'NULL'}, ${weightVal || 'NULL'}, ${escape(eTicker)}, ${escape(eName)}, ${escape(lDate)}, ${escape(row.market)}, ${escape(row.asset)}, ${escape(row.underlying)}, ${escape(row.AP)}, ${escape(row.leverage)}, ${feeVal || 'NULL'}, ${navVal || 'NULL'}, ${row.active || 'NULL'}, ${escape(sName)}, ${escape(taxVal)}, ${premVal || 'NULL'})`;
      }).join(',\n');
      
      sqlContent += `INSERT INTO stocks (stock_ticker, contract, amount, weight, etf_ticker, etf_name, listing_date, market, asset, underlying, AP, leverage, fee, NAV, active, stock_name, taxation, premium_discount) VALUES \n${values};\n\n`;
    }

    fs.writeFileSync(SQL_OUTPUT_PATH, sqlContent, 'utf8');
    console.log(`Successfully generated: ${SQL_OUTPUT_PATH}`);
  })
  .on('error', (err) => {
    console.error('Error:', err);
  });
