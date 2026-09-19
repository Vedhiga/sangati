from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Health Check")
def health_check():
    """
    Public health check endpoint.
    Used by load balancers, monitoring tools, and deployment environments to verify service liveness.
    """
    return {"status": "ok"}
