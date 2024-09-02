"""
Auth Routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from src.logger.logger import Logger
from src.oneEdge.oneEdgeAPI import OneEdgeApi, OneEdgeApiError, AuthState

logger = Logger(__name__)
router = APIRouter()

api_endpoint = "https://api-de.devicewise.com/api"
one_edge_api = OneEdgeApi(api_endpoint)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class User(BaseModel):
    username: str
    mfa_code: str


class Token(BaseModel):
    access_token: str
    token_type: str
    requireMFA: bool = False


async def get_user_info(token: str = Depends(oauth2_scheme)) -> User:
    """
    Get user information from the OneEdge API.
    """
    if one_edge_api.auth_state != AuthState.AUTHENTICATED:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated",
                            headers={"WWW-Authenticate": "Bearer"}, )
    return User(username=one_edge_api.username)


@router.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login to the OneEdge API.
    """
    try:
        authenticated = await one_edge_api.authenticate_user(
            form_data.username, form_data.password
        )
        if authenticated:
            if one_edge_api.auth_state == AuthState.WAITING_FOR_MFA:
                return {"access_token": "", "token_type": "bearer", "requireMFA": True}
            else:
                return {
                    "access_token": one_edge_api.session_id,
                    "token_type": "bearer",
                    "requireMFA": False,
                }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except OneEdgeApiError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}",
        )


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
            return {"message": "Logged out successfully"}
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
    """
    Submit MFA code to complete authentication.
    """
    try:
        authenticated = await one_edge_api.submit_mfa(mfa_data.mfa_code)
        if authenticated:
            return {
                "access_token": one_edge_api.session_id,
                "token_type": "bearer",
                "requireMFA": False,
            }
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
async def validate_session(current_user: User = Depends(get_user_info)):
    """
    Validate the current session.
    """
    if one_edge_api.is_session_valid():
        return {"message": "Session is valid"}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or expired",
        )
