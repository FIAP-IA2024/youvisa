"""
MongoDB client for updating file classifications.
"""

import logging
from datetime import datetime
from pymongo import MongoClient

logger = logging.getLogger()


class MongoDBClient:
    """MongoDB client for file classification updates."""

    def __init__(self, uri: str, database: str):
        """
        Initialize MongoDB client.

        Args:
            uri: MongoDB connection URI
            database: Database name
        """
        self.client = MongoClient(uri)
        self.db = self.client[database]
        self.files_collection = self.db['files']

    def update_file_classification(
        self,
        s3_key: str,
        document_type: str,
        confidence: float = 1.0
    ) -> bool:
        """
        Update file record with classification result.

        Args:
            s3_key: S3 object key
            document_type: Classified document type
            confidence: Classification confidence score

        Returns:
            True if update was successful
        """
        try:
            result = self.files_collection.update_one(
                {'s3_key': s3_key},
                {
                    '$set': {
                        'document_type': document_type,
                        'classification_confidence': confidence,
                        'classified_at': datetime.utcnow(),
                        'classification_status': 'completed'
                    }
                }
            )

            if result.modified_count > 0:
                logger.info(f"Updated file {s3_key} with type: {document_type}")
                return True
            else:
                logger.warning(f"No file found with s3_key: {s3_key}")
                return False

        except Exception as e:
            logger.error(f"Error updating file classification: {str(e)}")
            return False

    def close(self):
        """Close the MongoDB connection."""
        self.client.close()
