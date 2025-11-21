import { Router, Request, Response } from 'express';
import { container } from 'tsyringe';
import { StorageService } from '../services/storage/storage.service';
import { upload, uploadImage, uploadDocument, uploadVideo } from '../config/multer';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     FileMetadata:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *           description: Generated filename
 *         originalName:
 *           type: string
 *           description: Original filename
 *         mimeType:
 *           type: string
 *           description: MIME type of the file
 *         size:
 *           type: number
 *           description: File size in bytes
 *         path:
 *           type: string
 *           description: File path in storage
 *         url:
 *           type: string
 *           description: URL to access the file
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           description: Upload timestamp
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload a single file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 description: Optional folder path
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileMetadata'
 *       400:
 *         description: Invalid file or missing file
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/upload', authenticateJWT, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const storageService = container.resolve(StorageService);
    const folder = (req.body.folder as string) || 'uploads';

    const metadata = await storageService.upload(req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      folder,
    });

    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/files/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               folder:
 *                 type: string
 *                 description: Optional folder path
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FileMetadata'
 *       400:
 *         description: Invalid files or missing files
 *       401:
 *         description: Unauthorized
 */
router.post('/upload/multiple', authenticateJWT, upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const storageService = container.resolve(StorageService);
    const folder = (req.body.folder as string) || 'uploads';

    const filesData = req.files.map((file) => ({
      data: file.buffer,
      options: {
        filename: file.originalname,
        contentType: file.mimetype,
        folder,
      },
    }));

    const metadata = await storageService.uploadMultiple(filesData);

    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/files/upload/image:
 *   post:
 *     summary: Upload an image file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: Invalid image file
 *       401:
 *         description: Unauthorized
 */
router.post('/upload/image', authenticateJWT, uploadImage.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const storageService = container.resolve(StorageService);

    const metadata = await storageService.upload(req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      folder: 'images',
    });

    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/files/upload/document:
 *   post:
 *     summary: Upload a document file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *       400:
 *         description: Invalid document file
 *       401:
 *         description: Unauthorized
 */
router.post('/upload/document', authenticateJWT, uploadDocument.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const storageService = container.resolve(StorageService);

    const metadata = await storageService.upload(req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      folder: 'documents',
    });

    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/files/{path}:
 *   get:
 *     summary: Get a file's signed URL or download it
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: File path
 *       - in: query
 *         name: download
 *         schema:
 *           type: boolean
 *         description: Whether to download the file (default false, returns signed URL)
 *     responses:
 *       200:
 *         description: File URL or file content
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:path(*)', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const filePath = req.params.path;
    const shouldDownload = req.query.download === 'true';

    const storageService = container.resolve(StorageService);

    // Check if file exists
    const exists = await storageService.exists(filePath);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (shouldDownload) {
      // Download and return file content
      const buffer = await storageService.download(filePath);
      const metadata = await storageService.getMetadata(filePath);

      res.setHeader('Content-Type', metadata.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
      res.send(buffer);
    } else {
      // Return signed URL
      const url = await storageService.getSignedUrl(filePath);
      res.json({ url });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/files/{path}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: File path
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:path(*)', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const filePath = req.params.path;
    const storageService = container.resolve(StorageService);

    const success = await storageService.delete(filePath);

    if (success) {
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found or could not be deleted' });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/files/list:
 *   get:
 *     summary: List files in a folder
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *         description: Folder path
 *       - in: query
 *         name: prefix
 *         schema:
 *           type: string
 *         description: File path prefix filter
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: List of files
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FileMetadata'
 *       401:
 *         description: Unauthorized
 */
router.get('/list', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const storageService = container.resolve(StorageService);

    const files = await storageService.list({
      folder: req.query.folder as string,
      prefix: req.query.prefix as string,
      maxResults: req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : undefined,
    });

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/files/health:
 *   get:
 *     summary: Check storage health
 *     tags: [Files]
 *     responses:
 *       200:
 *         description: Storage is healthy
 *       503:
 *         description: Storage is unhealthy
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const storageService = container.resolve(StorageService);
    const isHealthy = await storageService.healthCheck();

    if (isHealthy) {
      res.json({
        status: 'healthy',
        provider: storageService.getProviderName(),
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        provider: storageService.getProviderName(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: (error as Error).message,
    });
  }
});

export default router;
