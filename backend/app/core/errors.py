import logging
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("sidequest.errors")


class AppException(Exception):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class AuthRequiredException(AppException):
    def __init__(self, message: str = "Authentication credentials were not provided."):
        super().__init__(
            code="AUTH_REQUIRED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class InvalidTokenException(AppException):
    def __init__(self, message: str = "The provided authentication token is invalid or expired."):
        super().__init__(
            code="INVALID_TOKEN",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class ProfileNotFoundException(AppException):
    def __init__(self, message: str = "Profile not found."):
        super().__init__(
            code="PROFILE_NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ProfileAlreadyExistsException(AppException):
    def __init__(self, message: str = "Profile already exists for this account."):
        super().__init__(
            code="PROFILE_ALREADY_EXISTS",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
        )


class UsernameAlreadyExistsException(AppException):
    def __init__(self, message: str = "This username is already taken."):
        super().__init__(
            code="USERNAME_ALREADY_EXISTS",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
        )


class InvalidUsernameException(AppException):
    def __init__(self, message: str = "Username must be 3-30 characters and contain only letters, numbers, and underscores."):
        super().__init__(
            code="INVALID_USERNAME",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class SelfConnectionException(AppException):
    def __init__(self, message: str = "You cannot connect with yourself."):
        super().__init__(
            code="SELF_CONNECTION",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class ConnectionNotFoundException(AppException):
    def __init__(self, message: str = "Connection request not found."):
        super().__init__(
            code="CONNECTION_NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class AlreadyConnectedException(AppException):
    def __init__(self, message: str = "You are already connected with this person."):
        super().__init__(
            code="ALREADY_CONNECTED",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class DuplicateConnectionRequestException(AppException):
    def __init__(self, message: str = "A connection request has already been sent to this person."):
        super().__init__(
            code="DUPLICATE_REQUEST",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class ReverseRequestExistsException(AppException):
    def __init__(self, message: str = "This person has already sent you a connection request. Check your incoming requests."):
        super().__init__(
            code="REVERSE_REQUEST_EXISTS",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class UnauthorizedConnectionActionException(AppException):
    def __init__(self, message: str = "You are not authorized to perform this action on this connection."):
        super().__init__(
            code="UNAUTHORIZED_ACTION",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class PostNotFoundException(AppException):
    def __init__(self, message: str = "Post not found."):
        super().__init__(
            code="POST_NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedPostActionException(AppException):
    def __init__(self, message: str = "You are not authorized to modify or delete this post."):
        super().__init__(
            code="UNAUTHORIZED_POST_ACTION",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class NotConnectedException(AppException):
    def __init__(self, message: str = "You can only message users you are connected with."):
        super().__init__(
            code="NOT_CONNECTED",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class SelfConversationException(AppException):
    def __init__(self, message: str = "You cannot start a conversation with yourself."):
        super().__init__(
            code="SELF_CONVERSATION",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class ConversationNotFoundException(AppException):
    def __init__(self, message: str = "Conversation not found."):
        super().__init__(
            code="CONVERSATION_NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedConversationActionException(AppException):
    def __init__(self, message: str = "You are not authorized to access this conversation."):
        super().__init__(
            code="UNAUTHORIZED_CONVERSATION_ACTION",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class NotificationNotFoundException(AppException):
    def __init__(self, message: str = "Notification not found."):
        super().__init__(
            code="NOTIFICATION_NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
        )


class UnauthorizedNotificationActionException(AppException):
    def __init__(self, message: str = "You are not authorized to access this notification."):
        super().__init__(
            code="UNAUTHORIZED_NOTIFICATION_ACTION",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Extract the first friendly validation error message
        errors = exc.errors()
        if errors:
            first_err = errors[0]
            loc = " -> ".join(str(l) for l in first_err.get("loc", []) if l != "body")
            msg = first_err.get("msg", "Invalid input.")
            readable_msg = f"{loc}: {msg}" if loc else msg
        else:
            readable_msg = "Invalid request data."

        # Check if the error is specifically related to username
        error_code = "VALIDATION_ERROR"
        if any("username" in str(err.get("loc", [])) for err in errors):
            error_code = "INVALID_USERNAME"

        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": {"code": error_code, "message": readable_msg}},
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        code_map = {
            401: "AUTH_REQUIRED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            422: "VALIDATION_ERROR",
            500: "INTERNAL_SERVER_ERROR",
        }
        code = code_map.get(exc.status_code, "HTTP_ERROR")
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": code, "message": str(exc.detail)}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error("Unhandled internal server error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "Something went wrong. Please try again.",
                }
            },
        )
