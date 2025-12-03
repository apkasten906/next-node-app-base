import { NextFunction, Request, Response } from 'express';

export interface ApiVersionMiddlewareOptions {
  defaultVersion?: string;
  supportedVersions?: string[];
  header?: string;
}

/**
 * Middleware to extract and validate API version from headers
 * Version format: application/vnd.api+json; version=1.0
 */
export function apiVersionMiddleware(options: ApiVersionMiddlewareOptions = {}) {
  const { defaultVersion = '1.0', supportedVersions = ['1.0'], header = 'accept' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    let version = defaultVersion;

    const acceptHeader = req.get(header);
    if (acceptHeader) {
      // Extract version from Accept header
      const versionMatch = acceptHeader.match(/version=([0-9.]+)/);
      if (versionMatch && versionMatch[1]) {
        version = versionMatch[1];
      }
    }

    // Check if version is supported
    if (!supportedVersions.includes(version)) {
      res.status(400).json({
        error: 'Unsupported API version',
        message: `API version ${version} is not supported. Supported versions: ${supportedVersions.join(', ')}`,
        supportedVersions,
      });
      return;
    }

    // Attach version to request object
    req.apiVersion = version;

    // Set version in response header
    res.setHeader('API-Version', version);

    next();
  };
}

/**
 * Helper to check if request is for a specific version or higher
 */
export function requireVersion(minVersion: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const currentVersion = req.apiVersion || '1.0';

    if (compareVersions(currentVersion, minVersion) < 0) {
      res.status(400).json({
        error: 'API version too old',
        message: `This endpoint requires API version ${minVersion} or higher`,
        currentVersion,
        requiredVersion: minVersion,
      });
      return;
    }

    next();
  };
}

/**
 * Compare two semantic version strings
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;

    if (aNum > bNum) return 1;
    if (aNum < bNum) return -1;
  }

  return 0;
}

/**
 * Get API version from request
 */
export function getApiVersion(req: Request): string {
  return req.apiVersion || '1.0';
}
