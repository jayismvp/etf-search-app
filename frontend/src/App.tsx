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
      const data = await response.json();
      setResults(data);
      if (data.length === 0) {
        setError("검색 결과가 없습니다.");
      }
    } catch (err) {
      setError("데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHome = () => {
    setQuery('');
    setResults([]);
    setError(null);
    setFilterQuery('');
  };

  const handleETFClick = async (etfName: string, etfTicker: string) => {
    setSelectedETF({ name: etfName, ticker: etfTicker });
    setIsModalLoading(true);
    setHoldings([]);
    try {
      const res = await fetch(`${apiBase}/holdings?ticker=${encodeURIComponent(etfTicker)}`);
      const data = await res.json();
      setHoldings(data);
    } catch (err) {
      console.error("Failed to fetch holdings", err);
    } finally {
      setIsModalLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    return results.filter(item => 
      item.etf_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.etf_ticker.toLowerCase().includes(filterQuery.toLowerCase())
    );
  }, [results, filterQuery]);

  const sortedResults = useMemo(() => {
    const sorted = [...filteredResults].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'weight' || sortField === 'nav' || sortField === 'fee') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredResults, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedResults.length / itemsPerPage);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className={`container ${results.length > 0 ? 'has-results' : 'landing'}`}>
      <button className="home-btn" onClick={handleHome} title="처음으로">🏠</button>
      
      {results.length === 0 && (
        <header className="main-header">
          <h1>ETF Finder</h1>
          <p className="hero-text">찾고 싶은 종목이 포함된 ETF를 바로 검색해 보세요.</p>
        </header>
      )}

      <main>
        <div className={`search-section ${results.length > 0 ? 'sticky' : 'centered'}`}>
          {results.length > 0 && <h2 className="mini-title">ETF Finder</h2>}
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
                      <td className="etf-name-cell" onClick={() => handleETFClick(item.etf_name, item.etf_ticker)}>
                        {item.etf_name}
                      </td>
                      <td><span className="ticker-badge">{item.etf_ticker}</span></td>
                      <td className="weight-cell">{item.weight ? `${item.weight}%` : '-'}</td>
                      <td>{item.listing_date || '-'}</td>
                      <td>{item.fee ? `${item.fee}%` : '-'}</td>
                      <td className="nav-cell">{item.nav ? parseInt(item.nav).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pagination-nav">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="nav-btn"
                >
                  이전
                </button>
                <span className="page-info">{currentPage} / {totalPages}</span>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="nav-btn"
                >
                  다음
                </button>
              </div>
            </>
          ) : (
            results.length > 0 && <div className="no-results">검색 결과가 없습니다.</div>
          )}
        </div>
      </main>

      {selectedETF && (
        <div className="modal-overlay" onClick={() => setSelectedETF(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedETF(null)}>&times;</button>
            <div className="modal-header">
              <div className="modal-title-group">
                <h2>{selectedETF.name} <small>({selectedETF.ticker})</small></h2>
              </div>
            </div>
            <div className="modal-body">
              {isModalLoading ? (
                <div className="modal-loading">구성 종목을 불러오는 중...</div>
              ) : (
                <div className="holdings-table-container">
                  <table className="holdings-table">
                    <thead>
                      <tr>
                        <th>종목명</th>
                        <th>티커</th>
                        <th>비중</th>
                        <th>금액</th>
                        <th>과세구분</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map((h, i) => (
                        <tr key={i}>
                          <td className="stock-name-cell">{h.stock_name}</td>
                          <td><span className="ticker-badge small">{h.stock_ticker}</span></td>
                          <td className="weight-cell">{h.weight}%</td>
                          <td>{h.amount ? parseInt(h.amount).toLocaleString() : '-'}</td>
                          <td className="tax-cell">{h.taxation || '-'}</td>
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
  );
}

export default App;
