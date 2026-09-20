from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    profile,
    activity,
    discover,
    connection,
    post,
    feed,
    conversation,
    notification,
    media,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(profile.router)
api_router.include_router(activity.router)
api_router.include_router(discover.router)
api_router.include_router(connection.router)
api_router.include_router(post.router)
api_router.include_router(feed.router)
api_router.include_router(conversation.router)
api_router.include_router(notification.router)
api_router.include_router(media.router)
