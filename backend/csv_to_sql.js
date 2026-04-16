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

    const sqlHeader = `DELETE FROM stocks;\n`;
    const sqlFooter = ``;
    
    // Generate batches of INSERT statements for better performance
    let sqlContent = sqlHeader;
    const batchSize = 100; // 1000 -> 100으로 줄임 (SQLITE_TOOBIG 방지)
    
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      
      const values = batch.map(row => {
        return `(${escape(row.stock_ticker)}, ${row.contract || 'NULL'}, ${row.amount || 'NULL'}, ${row.weight || 'NULL'}, ${escape(row.etf_ticker)}, ${escape(row.etf_name)}, ${escape(row.listing_date)}, ${escape(row.market)}, ${escape(row.asset)}, ${escape(row.underlying)}, ${escape(row.AP)}, ${escape(row.leverage)}, ${row.fee || 'NULL'}, ${row.NAV || 'NULL'}, ${row.active || 'NULL'}, ${escape(row.stock_name)}, ${escape(row.taxation)}, ${row['premium/discount'] || 'NULL'})`;
      }).join(',\n');
      
      sqlContent += `INSERT INTO stocks (stock_ticker, contract, amount, weight, etf_ticker, etf_name, listing_date, market, asset, underlying, AP, leverage, fee, NAV, active, stock_name, taxation, premium_discount) VALUES \n${values};\n\n`;
    }

    fs.writeFileSync(SQL_OUTPUT_PATH, sqlContent, 'utf8');
    console.log(`Successfully generated: ${SQL_OUTPUT_PATH}`);
  })
  .on('error', (err) => {
    console.error('Error:', err);
  });
