"""
Health check endpoints for monitoring and debugging.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def health_check() -> dict:
    """
    Basic health check endpoint.
    Returns 200 OK if the service is running.
    """
    return {"status": "healthy", "service": "nexhacks-study-api"}


@router.get("/ready")
async def readiness_check() -> dict:
    """
    Readiness check - verifies the service is ready to accept requests.
    Add database/external service checks here as needed.
    """
    # TODO: Add database connectivity check when DB is added
    return {"status": "ready"}
