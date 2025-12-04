import { Request } from 'express';

export interface HateoasLink {
  href: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  rel: string;
  type?: string;
}

export interface HateoasResponse<T = unknown> {
  data: T;
  _links: Record<string, HateoasLink>;
  _meta?: Record<string, unknown>;
}

export interface PaginatedHateoasResponse<T = unknown> extends HateoasResponse<T[]> {
  _meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Helper to build HATEOAS links
 */
export class HateoasBuilder {
  private links: Record<string, HateoasLink> = {};
  private meta: Record<string, unknown> = {};

  /**
   * Add a link to the response
   */
  addLink(rel: string, href: string, method?: string, type?: string): this {
    // eslint-disable-next-line security/detect-object-injection -- Controlled assignment using validated rel parameter
    this.links[rel] = {
      href,
      rel,
      method: method as HateoasLink['method'],
      type,
    };
    return this;
  }

  /**
   * Add self link
   */
  self(href: string): this {
    return this.addLink('self', href, 'GET', 'application/json');
  }

  /**
   * Add collection link
   */
  collection(href: string): this {
    return this.addLink('collection', href, 'GET', 'application/json');
  }

  /**
   * Add create link
   */
  create(href: string): this {
    return this.addLink('create', href, 'POST', 'application/json');
  }

  /**
   * Add update link
   */
  update(href: string): this {
    return this.addLink('update', href, 'PUT', 'application/json');
  }

  /**
   * Add delete link
   */
  delete(href: string): this {
    return this.addLink('delete', href, 'DELETE');
  }

  /**
   * Add pagination links
   */
  pagination(baseUrl: string, page: number, pageSize: number, total: number): this {
    const totalPages = Math.ceil(total / pageSize);

    // First page
    if (page > 1) {
      this.addLink('first', `${baseUrl}?page=1&pageSize=${pageSize}`, 'GET');
    }

    // Previous page
    if (page > 1) {
      this.addLink('prev', `${baseUrl}?page=${page - 1}&pageSize=${pageSize}`, 'GET');
    }

    // Next page
    if (page < totalPages) {
      this.addLink('next', `${baseUrl}?page=${page + 1}&pageSize=${pageSize}`, 'GET');
    }

    // Last page
    if (page < totalPages) {
      this.addLink('last', `${baseUrl}?page=${totalPages}&pageSize=${pageSize}`, 'GET');
    }

    return this;
  }

  /**
   * Add metadata
   */
  addMeta(key: string, value: unknown): this {
    // eslint-disable-next-line security/detect-object-injection -- Controlled metadata assignment using validated key parameter
    this.meta[key] = value;
    return this;
  }

  /**
   * Build the HATEOAS response
   */
  build<T>(data: T): HateoasResponse<T> {
    const response: HateoasResponse<T> = {
      data,
      _links: this.links,
    };

    if (Object.keys(this.meta).length > 0) {
      response._meta = this.meta;
    }

    return response;
  }

  /**
   * Build paginated HATEOAS response
   */
  buildPaginated<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number
  ): PaginatedHateoasResponse<T> {
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      _links: this.links,
      _meta: {
        total,
        page,
        pageSize,
        totalPages,
        ...this.meta,
      },
    };
  }
}

/**
 * Create a HATEOAS response builder
 */
export function hateoas(): HateoasBuilder {
  return new HateoasBuilder();
}

/**
 * Get base URL from request
 */
export function getBaseUrl(req: Request): string {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

/**
 * Build full URL from request path
 */
export function buildUrl(req: Request, path?: string): string {
  const baseUrl = getBaseUrl(req);
  const resourcePath = path || req.originalUrl.split('?')[0];
  return `${baseUrl}${resourcePath}`;
}

/**
 * Helper to create standard resource links
 */
export function createResourceLinks(
  req: Request,
  resourceId: string,
  basePath: string
): HateoasBuilder {
  const baseUrl = getBaseUrl(req);

  return hateoas()
    .self(`${baseUrl}${basePath}/${resourceId}`)
    .collection(`${baseUrl}${basePath}`)
    .update(`${baseUrl}${basePath}/${resourceId}`)
    .delete(`${baseUrl}${basePath}/${resourceId}`);
}

/**
 * Helper to create collection links with pagination
 */
export function createCollectionLinks(
  req: Request,
  basePath: string,
  page: number,
  pageSize: number,
  total: number
): HateoasBuilder {
  const baseUrl = getBaseUrl(req);

  return hateoas()
    .self(buildUrl(req))
    .create(`${baseUrl}${basePath}`)
    .pagination(`${baseUrl}${basePath}`, page, pageSize, total);
}
