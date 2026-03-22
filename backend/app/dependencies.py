from __future__ import annotations

import logging
import urllib.request
import json

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt as pyjwt
from jwt import PyJWKClient

from app.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

# Cache the JWKS client so we don't re-fetch keys on every request
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Verify Supabase JWT and return user_id."""
    token = credentials.credentials

    # Check what algorithm the token uses
    try:
        header = pyjwt.get_unverified_header(token)
        token_alg = header.get("alg", "HS256")
    except Exception:
        raise HTTPException(status_code=401, detail="Malformed token")

    # ES256 / RS256 tokens: verify using Supabase JWKS public keys
    if token_alg in ("ES256", "RS256", "EdDSA"):
        try:
            jwks_client = _get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = pyjwt.decode(
                token,
                signing_key.key,
                algorithms=[token_alg],
                audience="authenticated",
            )
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Token missing 'sub' claim")
            return user_id
        except pyjwt.InvalidAudienceError:
            # Retry without audience check
            try:
                payload = pyjwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[token_alg],
                    options={"verify_aud": False},
                )
                user_id = payload.get("sub")
                if user_id:
                    return user_id
            except Exception:
                pass
        except Exception as e:
            logger.error("JWKS token decode failed: %s", e)
            raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    # HS256 tokens: verify using the JWT secret
    for verify_aud in [True, False]:
        try:
            options = {} if verify_aud else {"verify_aud": False}
            kwargs = {"audience": "authenticated"} if verify_aud else {}
            payload = pyjwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options=options,
                **kwargs,
            )
            user_id = payload.get("sub")
            if user_id:
                return user_id
        except pyjwt.PyJWTError:
            continue

    logger.error("All JWT decode attempts failed for alg=%s", token_alg)
    raise HTTPException(status_code=401, detail=f"Invalid token (alg={token_alg})")
