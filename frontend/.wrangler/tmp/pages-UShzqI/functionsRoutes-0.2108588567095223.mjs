import { onRequest as __api_holdings_ts_onRequest } from "C:\\Users\\jayis\\OneDrive - University of Utah\\Coding\\etf-search-app\\frontend\\functions\\api\\holdings.ts"
import { onRequest as __api_search_ts_onRequest } from "C:\\Users\\jayis\\OneDrive - University of Utah\\Coding\\etf-search-app\\frontend\\functions\\api\\search.ts"
import { onRequest as __api_suggestions_ts_onRequest } from "C:\\Users\\jayis\\OneDrive - University of Utah\\Coding\\etf-search-app\\frontend\\functions\\api\\suggestions.ts"

export const routes = [
    {
      routePath: "/api/holdings",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_holdings_ts_onRequest],
    },
  {
      routePath: "/api/search",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_search_ts_onRequest],
    },
  {
      routePath: "/api/suggestions",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_suggestions_ts_onRequest],
    },
  ]