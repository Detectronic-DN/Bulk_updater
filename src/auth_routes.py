"""
Auth Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from src.logger.logger import Logger
from src.oneEdge.oneEdgeAPI import OneEdgeApi, OneEdgeApiError, AuthState

logger = Logger(__name__)
router = APIRouter()

api_endpoint = "https://api-de.devicewise.com/api"
one_edge_api = OneEdgeApi(api_endpoint)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def is_secure_connection(request: Request) -> bool:
    return request.url.scheme == "https"


class User(BaseModel):
    username: str
    mfa_code: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str
    requireMFA: bool = False
    username: str | None = None


async def get_user_info(request: Request):
    """
    Get user information from the OneEdge API.
    """
    session_id = request.cookies.get("session")
    if session_id:
        one_edge_api.session_id = session_id
        if await one_edge_api._verify_auth_state():
            return User(username=one_edge_api.username)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
    )


@router.post("/token", response_model=Token)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        authenticated = await one_edge_api.authenticate_user(
            form_data.username, form_data.password
        )
        if authenticated:
            if one_edge_api.auth_state == AuthState.WAITING_FOR_MFA:
                return JSONResponse(
                    content={
                        "access_token": "",
                        "token_type": "bearer",
                        "requireMFA": True,
                        "username": form_data.username,
                    },
                    headers={"Content-Type": "application/json; charset=utf-8"},
                )
            else:
                response = JSONResponse(
                    content={
                        "access_token": one_edge_api.session_id,
                        "token_type": "bearer",
                        "requireMFA": False,
                        "username": one_edge_api.username,
                    },
                    headers={"Content-Type": "application/json; charset=utf-8"},
                )
                response.set_cookie(
                    key="session",
                    value=one_edge_api.session_id,
                    httponly=True,
                    secure=True,  # Always set secure to True
                    samesite="lax",
                )
                logger.info(f"Login successful. Session ID: {one_edge_api.session_id}")
                return response
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException as e:
        if e.status_code == 403 and e.detail == "MFA required":
            return JSONResponse(
                content={
                    "access_token": "",
                    "token_type": "bearer",
                    "requireMFA": True,
                    "username": form_data.username,
                },
                headers={"Content-Type": "application/json; charset=utf-8"},
            )
        raise e


@router.get("/user", response_model=User)
async def read_users_me(user: User = Depends(get_user_info)):
    """
    Get user information from the OneEdge API.
    """
    return user


@router.get("/logout")
async def logout(current_user: User = Depends(read_users_me)):
    """
    Logout from the OneEdge API.
    """
    try:
        result = await one_edge_api.close_session()
        if result and result.get("success"):
            response = JSONResponse({"message": "Logged out successfully"})
            response.delete_cookie(key="session")
            return response
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to logout",
            )
    except OneEdgeApiError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while logging out: {str(e)}",
        )


@router.post("/mfa", response_model=Token)
async def submit_mfa(mfa_data: User):
    try:
        authenticated = await one_edge_api.submit_mfa(mfa_data.mfa_code)
        if authenticated:
            response = JSONResponse(
                {
                    "access_token": one_edge_api.session_id,
                    "token_type": "bearer",
                    "requireMFA": False,
                    "username": one_edge_api.username,
                }
            )
            response.set_cookie(
                key="session",
                value=one_edge_api.session_id,
                httponly=True,
                secure=True,
                samesite="strict",
            )
            return response
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect MFA code",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except OneEdgeApiError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}",
        )


@router.get("/validate")
async def validate_session(request: Request):
    session_id = request.cookies.get("session")
    logger.info(f"Validating session. Session ID: {session_id}")
    if session_id:
        one_edge_api.session_id = session_id
        is_valid = await one_edge_api._verify_auth_state()
        logger.info(f"Session validation result: {is_valid}")
        if is_valid:
            return JSONResponse(
                content={
                    "message": "Session is valid",
                    "username": one_edge_api.username,
                },
                headers={"Content-Type": "application/json; charset=utf-8"},
            )
    logger.warning("Session is invalid or expired")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is invalid or expired"
    )
