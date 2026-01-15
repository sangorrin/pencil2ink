"""TAMS API Signature Generation"""
import base64
import hashlib
import time
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import padding


def generate_signature(method: str, url: str, body: str, app_id: str, private_key_pem: str) -> str:
    """
    Generate TAMS-SHA256-RSA signature for API authentication.

    Args:
        method: HTTP method (GET, POST, etc.)
        url: URL path (e.g., "/v1/jobs")
        body: Request body as JSON string (empty string "" for GET)
        app_id: TAMS application ID
        private_key_pem: Private key in PEM format

    Returns:
        Authorization header value
    """
    method_str = method.upper()
    url_str = url
    timestamp = str(int(time.time()))
    nonce_str = hashlib.md5(timestamp.encode()).hexdigest()
    body_str = body

    # Build string to sign
    to_sign = f"{method_str}\n{url_str}\n{timestamp}\n{nonce_str}\n{body_str}"

    # Load private key from PEM string
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode(),
        password=None,
        backend=default_backend()
    )

    # Sign with SHA256-RSA
    signature = private_key.sign(
        to_sign.encode(),
        padding.PKCS1v15(),
        hashes.SHA256()
    )

    # Encode signature
    signature_base64 = base64.b64encode(signature).decode()

    # Build authorization header
    auth_header = (
        f"TAMS-SHA256-RSA "
        f"app_id={app_id},"
        f"nonce_str={nonce_str},"
        f"timestamp={timestamp},"
        f"signature={signature_base64}"
    )

    return auth_header
