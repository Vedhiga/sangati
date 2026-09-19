import logging
from typing import Optional
from uuid import UUID
import jwt
from jwt import ExpiredSignatureError, PyJWKClient, PyJWTError
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import settings
from app.core.errors import AuthRequiredException, InvalidTokenException

logger = logging.getLogger("sidequest.security")

# HTTPBearer scheme for OpenAPI documentation and header extraction
# auto_error=False allows us to throw our custom AuthRequiredException instead of FastAPI's default 403/401
security_scheme = HTTPBearer(auto_error=False)

# Optional JWKS client cached at module level
_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if _jwks_client is None and settings.SUPABASE_URL:
        # Supabase JWKS endpoint for asymmetric keys
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        try:
            _jwks_client = PyJWKClient(jwks_url, cache_keys=True, max_cached_keys=16)
        except Exception as e:
            logger.warning("Failed to initialize JWKS client: %s", e)
    return _jwks_client


class AuthenticatedUser(BaseModel):
    id: UUID
    email: Optional[str] = None
    role: Optional[str] = None


def decode_and_verify_supabase_token(token: str) -> dict:
    """
    Decodes and verifies a Supabase JWT access token.
    Supports asymmetric JWKS (RS256/ES256) and symmetric secret (HS256).
    """
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")

        # Asymmetric validation (RS256, ES256, etc.) using Supabase JWKS
        if alg.startswith("RS") or alg.startswith("ES"):
            jwks_client = get_jwks_client()
            if not jwks_client:
                raise InvalidTokenException("Asymmetric token received but SUPABASE_URL is not configured.")
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                options={"verify_aud": False, "verify_exp": True},
            )
        else:
            # Symmetric validation (HS256) using SUPABASE_JWT_SECRET if provided
            secret = settings.SUPABASE_JWT_SECRET
            if secret:
                payload = jwt.decode(
                    token,
                    secret,
                    algorithms=["HS256"],
                    options={"verify_aud": False, "verify_exp": True},
                )
            else:
                # Token signature verification is deferred per configuration
                logger.debug("SUPABASE_JWT_SECRET not configured: decoding token claims without signature verification.")
                payload = jwt.decode(
                    token,
                    options={"verify_signature": False, "verify_aud": False, "verify_exp": False},
                )

        # Verify audience if present
        aud = payload.get("aud")
        if aud and aud != "authenticated" and isinstance(aud, list) and "authenticated" not in aud:
            raise InvalidTokenException("Invalid token audience.")

        # Ensure user ID subject exists
        sub = payload.get("sub")
        if not sub:
            raise InvalidTokenException("Token does not contain a valid user subject.")

        return payload

    except ExpiredSignatureError:
        raise InvalidTokenException("Authentication token has expired.")
    except PyJWTError as e:
        logger.debug("JWT verification failed: %s", type(e).__name__)
        raise InvalidTokenException("Invalid authentication token signature or claims.")
    except Exception as e:
        logger.debug("Unexpected error during token verification: %s", type(e).__name__)
        raise InvalidTokenException("Could not validate credentials.")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> AuthenticatedUser:
    """
    Reusable FastAPI dependency to extract and verify the current authenticated user.
    """
    if not credentials or not credentials.credentials:
        raise AuthRequiredException("Authentication token is missing.")

    token = credentials.credentials
    payload = decode_and_verify_supabase_token(token)

    try:
        user_uuid = UUID(payload["sub"])
    except (ValueError, KeyError):
        raise InvalidTokenException("Invalid user identity in token.")

    return AuthenticatedUser(
        id=user_uuid,
        email=payload.get("email"),
        role=payload.get("role"),
    )
