@wip
Feature: File Storage Abstraction
  As a backend developer
  We need a multi-provider file storage system
  So that we can store files locally or in cloud storage providers

  Background:
    Given storage service is configured
    And environment variables specify the provider

  @storage @local
  Scenario: Local filesystem storage
    Given STORAGE_PROVIDER is set to "local"
    When I upload a file to local storage
    Then the file should be saved to the filesystem
    And file metadata should be returned
    And the file should be accessible via URL

  @storage @s3
  Scenario: AWS S3 storage
    Given STORAGE_PROVIDER is set to "s3"
    And AWS credentials are configured
    When I upload a file to S3
    Then the file should be uploaded to S3 bucket
    And S3 object key should be generated
    And file metadata should include S3 URL

  @storage @azure
  Scenario: Azure Blob Storage
    Given STORAGE_PROVIDER is set to "azure"
    And Azure Storage credentials are configured
    When I upload a file to Azure
    Then the file should be uploaded to Azure container
    And blob name should be generated
    And file metadata should include Azure URL

  @storage @gcp
  Scenario: Google Cloud Storage
    Given STORAGE_PROVIDER is set to "gcp"
    And GCP credentials are configured
    When I upload a file to GCP
    Then the file should be uploaded to GCS bucket
    And object name should be generated
    And file metadata should include GCS URL

  @storage @upload @single
  Scenario: Upload a single file
    When I upload a file with:
      | field       | value              |
      | filename    | document.pdf       |
      | contentType | application/pdf    |
      | folder      | documents          |
    Then the file should be stored successfully
    And file metadata should be returned with:
      | field        |
      | filename     |
      | originalName |
      | mimeType     |
      | size         |
      | path         |
      | url          |
      | uploadedAt   |

  @storage @upload @multiple
  Scenario: Upload multiple files
    When I upload 3 files simultaneously
    Then all files should be stored successfully
    And metadata for all files should be returned
    And each file should have unique path

  @storage @download
  Scenario: Download a file
    Given a file "documents/report.pdf" exists in storage
    When I download the file
    Then the file content should be returned as Buffer
    And the content should match the original file

  @storage @signed-url
  Scenario: Generate signed URL for temporary access
    Given a file exists in storage
    When I request a signed URL with expiration 3600 seconds
    Then a signed URL should be generated
    And the URL should be valid for 1 hour
    And the URL should allow file access without authentication

  @storage @delete
  Scenario: Delete a file
    Given a file "temp/old-file.txt" exists in storage
    When I delete the file
    Then the file should be removed from storage
    And the file should no longer be accessible

  @storage @delete @multiple
  Scenario: Delete multiple files
    Given 5 files exist in "temp/" folder
    When I delete all files in the folder
    Then all files should be removed
    And deletion results should indicate success for each file

  @storage @exists
  Scenario: Check if file exists
    When I check if "documents/report.pdf" exists
    Then existence check should return true
    When I check if "documents/nonexistent.pdf" exists
    Then existence check should return false

  @storage @list
  Scenario: List files in a folder
    Given 10 files exist in "images/" folder
    When I list files in "images/" folder
    Then I should receive a list of file metadata
    And the list should contain 10 items

  @storage @list @prefix
  Scenario: List files with prefix filter
    Given files exist with various prefixes
    When I list files with prefix "user-123-"
    Then only files matching the prefix should be returned

  @storage @list @pagination
  Scenario: List files with pagination
    Given 100 files exist in storage
    When I list files with maxResults=20
    Then I should receive 20 files
    And a continuation token should be provided

  @storage @metadata
  Scenario: Get file metadata
    Given a file exists in storage
    When I request metadata for the file
    Then metadata should be returned with:
      | field        |
      | filename     |
      | mimeType     |
      | size         |
      | uploadedAt   |
      | bucket       |

  @storage @copy
  Scenario: Copy a file
    Given a file "original/file.txt" exists
    When I copy the file to "backup/file.txt"
    Then a copy should be created at the new path
    And both files should exist independently
    And metadata for the copy should be returned

  @storage @move
  Scenario: Move a file
    Given a file "temp/file.txt" exists
    When I move the file to "archive/file.txt"
    Then the file should exist at new path
    And the file should no longer exist at old path
    And metadata for the moved file should be returned

  @storage @validation @file-type
  Scenario: File type validation
    Given allowed MIME types are configured
    When I upload a file with MIME type "<mimeType>"
    Then the upload should be "<result>"

    Examples:
      | mimeType            | result   |
      | image/jpeg          | accepted |
      | application/pdf     | accepted |
      | application/x-sh    | rejected |
      | text/html           | rejected |

  @storage @validation @file-size
  Scenario: File size validation
    Given maximum file size is 5MB
    When I upload a file of size "<size>"
    Then the upload should be "<result>"

    Examples:
      | size | result   |
      | 1MB  | accepted |
      | 5MB  | accepted |
      | 10MB | rejected |

  @storage @validation @filename
  Scenario: Filename sanitization
    When I upload a file with filename "<filename>"
    Then the filename should be sanitized to "<sanitized>"

    Examples:
      | filename                | sanitized           |
      | document.pdf            | document.pdf        |
      | ../../../etc/passwd     | etc_passwd          |
      | file<script>.txt        | file_script_.txt    |
      | .hidden                 | hidden              |

  @storage @multer @single-upload
  Scenario: Multer single file upload endpoint
    When I POST to "/api/files/upload" with file in "file" field
    Then the file should be uploaded
    And response should include file metadata
    And authentication should be required

  @storage @multer @multiple-upload
  Scenario: Multer multiple files upload endpoint
    When I POST to "/api/files/upload/multiple" with 3 files
    Then all files should be uploaded
    And response should include array of metadata
    And maximum 10 files should be allowed

  @storage @multer @image-upload
  Scenario: Image-specific upload endpoint
    When I POST to "/api/files/upload/image" with JPEG file
    Then the file should be uploaded to "images/" folder
    And only image MIME types should be allowed
    And maximum size should be 5MB

  @storage @multer @document-upload
  Scenario: Document-specific upload endpoint
    When I POST to "/api/files/upload/document" with PDF file
    Then the file should be uploaded to "documents/" folder
    And only document MIME types should be allowed
    And maximum size should be 10MB

  @storage @api @download-file
  Scenario: Download file via API
    Given a file exists at path "documents/report.pdf"
    When I GET "/api/files/documents/report.pdf?download=true"
    Then the file should be downloaded
    And Content-Disposition header should indicate attachment

  @storage @api @get-url
  Scenario: Get file signed URL via API
    Given a file exists in storage
    When I GET "/api/files/documents/report.pdf?download=false"
    Then a signed URL should be returned
    And no file content should be transferred

  @storage @api @delete-file
  Scenario: Delete file via API
    Given a file exists in storage
    When I DELETE "/api/files/temp/old-file.txt"
    Then the file should be deleted
    And success message should be returned
    And authentication should be required

  @storage @api @list-files
  Scenario: List files via API
    Given files exist in storage
    When I GET "/api/files/list?folder=images&maxResults=20"
    Then a list of files should be returned
    And pagination should be applied

  @storage @health-check
  Scenario: Storage service health check
    When I GET "/api/files/health"
    Then health status should be returned
    And provider name should be included
    And connectivity to storage should be verified

  @storage @provider-switching
  Scenario: Switch storage providers
    Given STORAGE_PROVIDER is "local"
    When I change STORAGE_PROVIDER to "s3"
    And I restart the application
    Then new uploads should go to S3
    And the storage service should use S3 provider
