/**
 * Search service interface for full-text search abstraction
 */
export interface ISearchService {
  /**
   * Index a document
   */
  index(document: SearchDocument): Promise<void>;

  /**
   * Index multiple documents in bulk
   */
  indexBulk(documents: SearchDocument[]): Promise<BulkIndexResult>;

  /**
   * Search for documents
   */
  search(query: SearchQuery): Promise<SearchResults>;

  /**
   * Delete document from index
   */
  deleteDocument(id: string, indexName?: string): Promise<void>;

  /**
   * Delete entire index
   */
  deleteIndex(indexName: string): Promise<void>;

  /**
   * Update document in index
   */
  updateDocument(id: string, document: Partial<SearchDocument>): Promise<void>;

  /**
   * Get suggestions/autocomplete
   */
  suggest(query: string, field: string, indexName?: string): Promise<string[]>;
}

export interface SearchDocument {
  id: string;
  indexName: string;
  fields: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SearchQuery {
  query: string;
  indexName: string;
  fields?: string[];
  filters?: SearchFilter[];
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: SearchSort[];
  highlight?: boolean;
}

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: any;
}

export interface SearchSort {
  field: string;
  order: 'asc' | 'desc';
}

export interface SearchResults {
  hits: SearchHit[];
  total: number;
  took: number;
  aggregations?: Record<string, any>;
}

export interface SearchHit {
  id: string;
  score: number;
  fields: Record<string, any>;
  highlights?: Record<string, string[]>;
}

export interface BulkIndexResult {
  indexed: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

export enum SearchProvider {
  ELASTICSEARCH = 'elasticsearch',
  ALGOLIA = 'algolia',
  MEILISEARCH = 'meilisearch',
  TYPESENSE = 'typesense',
}
