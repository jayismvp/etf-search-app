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

type SortField = 'etf_name' | 'listing_date' | 'nav' | 'fee' | 'weight';
type SortOrder = 'asc' | 'desc';

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAllView, setIsAllView] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterQuery, setFilterQuery] = useState('');
  
  const [sortField, setSortField] = useState<SortField>('nav');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [selectedETF, setSelectedETF] = useState<SearchResult | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const touchStartY = useRef<number>(0);
  const modalBodyRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (query.trim().length > 0 && !isLoading) {
      const delayDebounce = setTimeout(async () => {
        try {
          const res = await fetch(`${apiBase}/suggestions?query=${encodeURIComponent(query)}`);
          const data = await res.json();
          setSuggestions(data);
          if (data.length > 0) setShowSuggestions(true);
        } catch (err) {
          console.error("Failed to fetch suggestions", err);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, apiBase, isLoading]);

  const handleSearch = async (targetQuery: string) => {
    setIsLoading(true);
    setError(null);
    setCurrentPage(1);
    setFilterQuery('');
    setShowSuggestions(false);
    setSuggestions([]);
    
    setIsAllView(targetQuery.trim() === '');

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
    setSortField('nav');
    setSortOrder('desc');
    setShowSuggestions(false);
    setSuggestions([]);
    setIsAllView(false);
  };

  const handleETFClick = async (item: SearchResult) => {
    setSelectedETF(item);
    setIsModalLoading(true);
    setHoldings([]);
    try {
      const res = await fetch(`${apiBase}/holdings?ticker=${encodeURIComponent(item.etf_ticker)}`);
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
      item.etf_name.toLowerCase().includes(filterQuery.toLowerCase())
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

  const formatNAV = (nav: string | undefined) => {
    if (!nav) return '-';
    const millions = Math.round(parseFloat(nav) / 1000000);
    return millions.toLocaleString();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;
    const isAtTop = modalBodyRef.current ? modalBodyRef.current.scrollTop === 0 : true;

    if (isAtTop && deltaY > 150) {
      setSelectedETF(null);
    }
  };

  return (
    <div className={`container ${results.length > 0 ? 'has-results' : 'landing'}`}>
      {results.length === 0 && (
        <header className="main-header">
          <h1>ETF Finder</h1>
          <p className="hero-text">찾고 싶은 종목이 포함된 ETF를 바로 검색해 보세요.</p>
        </header>
      )}

      <main>
        <div className={`search-section ${results.length > 0 ? 'sticky' : 'centered'}`}>
          {results.length > 0 && (
            <h2 className="mini-title" onClick={handleHome} title="처음으로 돌아가기">
              ETF Finder
            </h2>
          )}
          <div className="search-container" ref={suggestionRef}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }} className="search-form">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="주식명 또는 티커 입력"
                className="search-input primary-input"
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              />
              <button type="submit" className="search-button main-btn" disabled={isLoading}>
                {isLoading ? '...' : '검색'}
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
                      setShowSuggestions(false);
                      setSuggestions([]);
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
                placeholder="결과 내 ETF 검색..."
                value={filterQuery}
                onChange={(e) => {
                  setFilterQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-input"
              />
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
                    {!isAllView && (
                      <th onClick={() => toggleSort('weight')} className="sortable">
                        비중 <SortIcon field="weight" />
                      </th>
                    )}
                    <th onClick={() => toggleSort('fee')} className="sortable">
                      수수료 <SortIcon field="fee" />
                    </th>
                    <th onClick={() => toggleSort('nav')} className="sortable">
                      NAV(백만) <SortIcon field="nav" />
                    </th>
                    <th onClick={() => toggleSort('listing_date')} className="sortable hide-mobile">
                      상장일 <SortIcon field="listing_date" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => (
                    <tr key={index}>
                      <td className="etf-name-cell" onClick={() => handleETFClick(item)}>
                        {item.etf_name}
                      </td>
                      {!isAllView && <td className="weight-cell">{item.weight ? `${item.weight}%` : '-'}</td>}
                      <td className="fee-cell">{item.fee ? `${item.fee}%` : '-'}</td>
                      <td className="nav-cell">{formatNAV(item.nav)}</td>
                      <td className="hide-mobile">{item.listing_date || '-'}</td>
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
                  &lt;
                </button>
                <span className="page-info">{currentPage}/{totalPages}</span>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="nav-btn"
                >
                  &gt;
                </button>
              </div>
            </>
          ) : (
            results.length > 0 && <div className="no-results">결과 없음</div>
          )}
        </div>
      </main>

      {results.length === 0 && (
        <footer className="landing-footer">
          <button className="load-all-btn" onClick={() => handleSearch('')}>
            전체 ETF 목록 불러오기
          </button>
          <div className="footer-card">
            <p>기준일자: 2026-04-17</p>
            <p>Pool: 국내 주식형 ETF 378종</p>
            <p>업데이트 예정일: 매월 말</p>
          </div>
        </footer>
      )}

      {selectedETF && (
        <div className="modern-modal-overlay" onClick={() => setSelectedETF(null)}>
          <div 
            className="modern-modal-content" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="modal-drag-handle"></div>
            
            <div className="modern-modal-header">
              <h3>{selectedETF.etf_name}</h3>
              <p>상세 구성 종목 리스트 ({holdings.length}개 종목)</p>
              <a 
                href={`https://finance.naver.com/item/main.naver?code=${selectedETF.etf_ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                className="naver-finance-link"
              >
                네이버 증권에서 자세히 보기
                <svg className="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>

            <div className="modern-modal-body" ref={modalBodyRef}>
              {isModalLoading ? (
                <div className="modal-shimmer">로딩 중...</div>
              ) : (
                <div className="holdings-minimal-list">
                  <div className="holding-row header">
                    <div className="holding-stock-name">종목명</div>
                    <div className="holding-weight">비중</div>
                  </div>
                  {holdings.map((h, i) => (
                    <div className="holding-row" key={i}>
                      <div className="holding-stock-name">
                        {h.stock_name} <span className="ticker-mini">({h.stock_ticker})</span>
                      </div>
                      <div className="holding-weight">{h.weight}%</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button className="modal-bottom-close" onClick={() => setSelectedETF(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
