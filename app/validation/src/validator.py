"""
Image validator using OpenCV.
Validates blur, brightness, and dimensions.
"""

import cv2
import numpy as np
from typing import Dict, Any


class ImageValidator:
    """Validates image quality for document processing."""

    # Thresholds
    MIN_BLUR_SCORE = 100.0      # Laplacian variance (higher = sharper)
    MIN_BRIGHTNESS = 40.0       # Minimum average brightness (0-255)
    MAX_BRIGHTNESS = 220.0      # Maximum average brightness (0-255)
    MIN_WIDTH = 400             # Minimum width in pixels
    MIN_HEIGHT = 400            # Minimum height in pixels

    def validate(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Validate image quality.

        Args:
            image_bytes: Raw image bytes

        Returns:
            Dict with validation result:
            {
                "valid": bool,
                "reason": str,
                "details": {
                    "blur_score": float,
                    "brightness": float,
                    "width": int,
                    "height": int
                }
            }
        """
        # Decode image
        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if image is None:
            return {
                'valid': False,
                'reason': 'Could not decode image. Invalid format.',
                'details': {}
            }

        # Get dimensions
        height, width = image.shape[:2]

        # Convert to grayscale for analysis
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Calculate blur score (Laplacian variance)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()

        # Calculate brightness (mean pixel value)
        brightness = np.mean(gray)

        details = {
            'blur_score': round(blur_score, 2),
            'brightness': round(brightness, 2),
            'width': width,
            'height': height
        }

        # Validate dimensions
        if width < self.MIN_WIDTH or height < self.MIN_HEIGHT:
            return {
                'valid': False,
                'reason': f'Image too small. Minimum size: {self.MIN_WIDTH}x{self.MIN_HEIGHT} pixels. '
                         f'Your image: {width}x{height} pixels.',
                'details': details
            }

        # Validate blur
        if blur_score < self.MIN_BLUR_SCORE:
            return {
                'valid': False,
                'reason': 'Image is too blurry. Please take a clearer photo.',
                'details': details
            }

        # Validate brightness
        if brightness < self.MIN_BRIGHTNESS:
            return {
                'valid': False,
                'reason': 'Image is too dark. Please take a photo with better lighting.',
                'details': details
            }

        if brightness > self.MAX_BRIGHTNESS:
            return {
                'valid': False,
                'reason': 'Image is too bright or overexposed. Please take a photo with less light.',
                'details': details
            }

        # All validations passed
        return {
            'valid': True,
            'reason': 'Image passed all quality checks.',
            'details': details
        }

    def detect_document_contour(self, image_bytes: bytes) -> bool:
        """
        Optional: Detect if image contains a rectangular document.
        Uses edge detection and contour finding.

        Args:
            image_bytes: Raw image bytes

        Returns:
            True if a rectangular contour is detected
        """
        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if image is None:
            return False

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 75, 200)

        contours, _ = cv2.findContours(
            edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
        )

        for contour in contours:
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)

            # Check if contour has 4 points (rectangle)
            if len(approx) == 4:
                area = cv2.contourArea(contour)
                # Check if area is significant (at least 10% of image)
                image_area = image.shape[0] * image.shape[1]
                if area > image_area * 0.1:
                    return True

        return False
