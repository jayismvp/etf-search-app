import { useState, useMemo, useEffect, useRef } from 'react'
import './App.css'

interface SearchResult {
  stock_name: string;
  stock_ticker: string;
  etf_name: string;
  etf_ticker: string;
  listing_date?: string;
  nav?: string;
  fee?: string;
  weight?: string;
}

interface Suggestion {
  name: string;
  ticker: string;
}

interface Holding {
  stock_name: string;
  stock_ticker: string;
  contract: string;
  amount: string;
  weight: string;
  fee: string;
  taxation: string;
  premium_discount: string;
}

type SortField = 'etf_name' | 'etf_ticker' | 'listing_date' | 'nav' | 'fee' | 'weight';
type SortOrder = 'asc' | 'desc';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Pagination, Filtering, Sorting states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('etf_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // ETF Detail Modal states
  const [selectedETF, setSelectedETF] = useState<{ name: string; ticker: string } | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Handle outside click for suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '/api';

  // Fetch suggestions
  useEffect(() => {
    if (query.trim().length > 0) {
      const delayDebounce = setTimeout(async () => {
        try {
          const res = await fetch(`${apiBase}/suggestions?query=${encodeURIComponent(query)}`);
          const data = await res.json();
          setSuggestions(data);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Failed to fetch suggestions", err);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, apiBase]);

  const handleSearch = async (targetQuery: string) => {
    if (!targetQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setCurrentPage(1);
    setFilterQuery('');
    setShowSuggestions(false);

    try {
      const response = await fetch(`${apiBase}/search?query=${encodeURIComponent(targetQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHome = () => {
    setQuery('');
    setResults([]);
    setFilterQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setCurrentPage(1);
    setError(null);
  };

  const handleETFClick = async (etfName: string, etfTicker: string) => {
    setSelectedETF({ name: etfName, ticker: etfTicker });
    setIsModalLoading(true);
    setHoldings([]);

    try {
      const response = await fetch(`${apiBase}/etf-holdings?ticker=${etfTicker}`);
      const data = await response.json();
      setHoldings(data);
    } catch (err) {
      console.error("Failed to fetch ETF holdings", err);
    } finally {
      setIsModalLoading(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredResults = useMemo(() => {
    let list = results;
    if (filterQuery) {
      list = list.filter(item => 
        item.etf_name.toLowerCase().includes(filterQuery.toLowerCase())
      );
    }
    return list;
  }, [results, filterQuery]);

  const sortedResults = useMemo(() => {
    const list = [...filteredResults];
    return list.sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';
      if (sortField === 'nav' || sortField === 'fee' || sortField === 'weight') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredResults, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return sortedResults.slice(indexOfFirstItem, indexOfLastItem);
  }, [sortedResults, currentPage, itemsPerPage]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const commonInfo = holdings.length > 0 ? holdings[0] : null;

  return (
    <div className="container">
      <button className="home-btn" onClick={handleHome} title="처음으로">🏠</button>
      <header>
        <h1><span className="icon">🐂</span> ETF Search App <span className="icon">🐻</span></h1>
        <p>어떤 ETF가 이 종목을 담고 있을까요?</p>
      </header>

      <main>
        <div className="search-container" ref={suggestionRef}>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} className="search-form">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="주식명 또는 티커 입력 (예: 삼성전자, 005930)"
              className="search-input primary-input"
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            />
            <button type="submit" className="search-button main-btn" disabled={isLoading}>
              {isLoading ? '찾는 중...' : '검색'}
            </button>
          </form>

          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-list">
              {suggestions.map((s, idx) => (
                <div 
                  key={idx} 
                  className="suggestion-item"
                  onClick={() => {
                    setQuery(s.name);
                    handleSearch(s.name);
                  }}
                >
                  <span className="s-name">{s.name}</span>
                  <span className="s-ticker">{s.ticker}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="toolbar">
            <div className="sub-search">
              <input
                type="text"
                placeholder="결과 내 ETF 이름 검색..."
                value={filterQuery}
                onChange={(e) => {
                  setFilterQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-input"
              />
            </div>
            
            <div className="pagination-controls">
              <span>한 페이지 표시:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="page-select"
              >
                <option value={10}>10개</option>
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="results-section">
          {currentItems.length > 0 ? (
            <>
              <table className="results-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('etf_name')} className="sortable">
                      ETF 이름 <SortIcon field="etf_name" />
                    </th>
                    <th onClick={() => toggleSort('etf_ticker')} className="sortable">
                      ETF 티커 <SortIcon field="etf_ticker" />
                    </th>
                    <th onClick={() => toggleSort('weight')} className="sortable">
                      해당주식 비중 <SortIcon field="weight" />
                    </th>
                    <th onClick={() => toggleSort('listing_date')} className="sortable">
                      상장일 <SortIcon field="listing_date" />
                    </th>
                    <th onClick={() => toggleSort('fee')} className="sortable">
                      총수수료 <SortIcon field="fee" />
                    </th>
                    <th onClick={() => toggleSort('nav')} className="sortable">
                      NAV(백만) <SortIcon field="nav" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => (
                    <tr key={index}>
                      <td className="etf-name-cell link-style" onClick={() => handleETFClick(item.etf_name, item.etf_ticker)}>
                        {item.etf_name}
                      </td>
                      <td><span className="ticker-badge">{item.etf_ticker}</span></td>
                      <td className="weight-cell">{item.weight ? `${item.weight}%` : '-'}</td>
                      <td>{item.listing_date || '-'}</td>
                      <td>{item.fee ? `${item.fee}%` : '-'}</td>
                      <td className="nav-cell">{item.nav ? Math.round(Number(item.nav) / 1000000).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination-nav">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="nav-btn"
                >
                  이전
                </button>
                <span className="page-info">
                  {currentPage} / {totalPages || 1}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="nav-btn"
                >
                  다음
                </button>
              </div>
            </>
          ) : (
            !isLoading && query && <p className="no-results">검색 결과가 없어요 😢</p>
          )}
        </div>
      </main>

      {/* ETF Detail Modal */}
      {selectedETF && (
        <div className="modal-overlay" onClick={() => setSelectedETF(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h2>{selectedETF.name} <small>({selectedETF.ticker})</small></h2>
                {commonInfo && (
                  <div className="common-info-badges">
                    <span className="info-badge">수수료: {commonInfo.fee}%</span>
                    <span className="info-badge">과세: {commonInfo.taxation}</span>
                    <span className={`info-badge ${Number(commonInfo.premium_discount) > 0 ? 'pos-bg' : 'neg-bg'}`}>
                      괴리율: {commonInfo.premium_discount}%
                    </span>
                  </div>
                )}
              </div>
              <button className="close-btn" onClick={() => setSelectedETF(null)}>×</button>
            </div>
            <div className="modal-body">
              {isModalLoading ? (
                <div className="modal-loading">구성 종목을 불러오는 중...</div>
              ) : (
                <div className="holdings-table-container">
                  <table className="holdings-table">
                    <thead>
                      <tr>
                        <th>주식</th>
                        <th>티커</th>
                        <th>계약수</th>
                        <th>계약금액</th>
                        <th>비중 (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((h, i) => (
                        <tr key={i}>
                          <td className="stock-name-cell">{h.stock_name || 'N/A'}</td>
                          <td><span className="ticker-badge small">{h.stock_ticker || 'N/A'}</span></td>
                          <td>{Number(h.contract).toLocaleString()}</td>
                          <td>{Number(h.amount).toLocaleString()}</td>
                          <td className="weight-cell">{h.weight}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
