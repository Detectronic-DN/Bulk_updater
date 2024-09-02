"""
oneEdge API Module

This module provides a class to interact with the oneEdge API.
"""

import asyncio
from enum import Enum
from typing import Any, Dict, List, Optional

import aiohttp
from cachetools import TTLCache
from fastapi import HTTPException

from src.logger.logger import Logger

logger = Logger(__name__)


class AuthState(Enum):
    """Authentication state"""

    AUTHENTICATED = 2
    NOT_AUTHENTICATED = 0
    WAITING_FOR_MFA = 1


class OneEdgeApiError(Exception):
    """oneEdge API Error"""

    def __init__(self, message: str):
        """
        Initializes a new instance of the class.

        Args:
            message (str): The error message.
        """
        self.message = message
        super().__init__(message)


class OneEdgeApi:
    """
    OneEdge API Class
    """

    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 5
    ITERATION_LIMIT: int = 100

    def __init__(self, endpoint_url: str):
        """
        Initializes a new instance of the OneEdgeApi class.

        Args:
            endpoint_url (str): The URL of the oneEdge API endpoint.
        """
        self.endpoint_url: str = endpoint_url
        self._session_cache: TTLCache = TTLCache(maxsize=1, ttl=28800)
        self._last_error: Optional[int] = None
        self._auth_state: AuthState = AuthState.NOT_AUTHENTICATED
        self.username: str = ""

    @property
    def session_id(self) -> Optional[str]:
        """Gets the session id"""
        return self._session_cache.get("session_id")

    @session_id.setter
    def session_id(self, value: Optional[str]) -> None:
        """Sets the session id"""
        self._session_cache["session_id"] = value
        self._auth_state = self._calculate_auth_state()

    @property
    def last_error(self) -> Optional[int]:
        """Gets the last error"""
        return self._last_error

    @last_error.setter
    def last_error(self, value: Optional[int]) -> None:
        """Sets the last error"""
        self._last_error = value
        self._auth_state = self._calculate_auth_state()

    @property
    def auth_state(self) -> AuthState:
        """Gets the authentication state"""
        return self._auth_state

    @auth_state.setter
    def auth_state(self, state: AuthState) -> None:
        """Sets the authentication state"""
        if state != self._auth_state:
            self._auth_state = state

    def _calculate_auth_state(self) -> AuthState:
        """
        Calculate the authentication state based on the current session ID
        and last error.

        Returns:
            AuthState: The calculated authentication state.
        """
        if self.session_id is not None:
            return AuthState.AUTHENTICATED
        if self.last_error == -90041:
            return AuthState.WAITING_FOR_MFA
        return AuthState.NOT_AUTHENTICATED

    async def run_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run a single command.

        Args:
            command (Dict[str, Any]): The command to be executed.

        Returns:
            Dict[str, Any]: The result of the command.

        Raises:
            OneEdgeApiError: If an error occurs while making the request.
        """
        try:
            result = await self.run_commands({"1": command})
            return result.get("1", result)
        except OneEdgeApiError as e:
            logger.exception("An error occurred while making the request", error=str(e))
            raise HTTPException(status_code=500, detail=str(e))

    async def run_commands(self, cmds: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Run multiple commands asynchronously.

        Args:
            cmds (Dict[str, Dict[str, Any]]): The commands to be executed.

        Returns:
            Dict[str, Any]: The results of the commands.

        Raises:
            OneEdgeApiError: If failed to receive a response from the API.
        """
        payload: Dict[str, Any] = {"auth": {"sessionId": self.session_id}}
        payload.update(cmds)

        async with aiohttp.ClientSession() as session:
            for retry_count in range(self.MAX_RETRIES):
                try:
                    async with session.post(
                        self.endpoint_url, json=payload
                    ) as response:
                        response_data = await response.json()
                        if response_data is None:
                            raise HTTPException(
                                status_code=500,
                                detail="Received empty response from API",
                            )
                        return self._process_response(response_data, cmds)
                except (aiohttp.ClientError, asyncio.TimeoutError) as e:
                    logger.error(
                        "An error occurred while making the request",
                        error=str(e),
                        retry_count=retry_count,
                    )
                    if retry_count < self.MAX_RETRIES - 1:
                        await asyncio.sleep(self.RETRY_DELAY)
                    else:
                        logger.error(
                            "Failed to make the request after multiple retries",
                            max_retries=self.MAX_RETRIES,
                        )
                        raise HTTPException(
                            status_code=503, detail="Service unavailable"
                        )

        raise HTTPException(
            status_code=500, detail="Failed to receive a response from the API."
        )

    def _process_response(
        self, response_data: Dict[str, Any], cmds: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process the API response.

        Args:
            response (Dict[str, Any]): The response data from the API.
            cmds (Dict[str, Dict[str, Any]]): The commands that were executed.

        Returns:
            Dict[str, Any]: The processed results.
        """
        results: Dict[str, Any] = response_data

        if "success" in response_data and not response_data["success"]:
            for cmd_key in cmds:
                results[cmd_key] = {
                    "success": False,
                    "errorCodes": response_data.get("errorCodes", []),
                }
        else:
            results["success"] = True
            results["errorCodes"] = []

        if results["errorCodes"]:
            self.last_error = results["errorCodes"][0]
        else:
            self.last_error = None

        return results

    async def run_iterated_command(self, cmd: Dict[str, Any]) -> List[Any]:
        """
        Run an iterated command with pagination.

        Args:
            cmd (Dict[str, Any]): The command to be executed iteratively.

        Returns:
            List[Any]: The aggregated results from all iterations.
        """
        cmd["params"].update(
            {"iterator": "new", "useSearch": True, "limit": 2000, "showCount": False}
        )

        results: List[Any] = []
        for iteration in range(self.ITERATION_LIMIT):
            result = await self.run_command(cmd)
            if not result["success"]:
                logger.warning("Iterated command unsuccessful", iteration=iteration)
                return results

            results.extend(result["params"]["result"])
            cmd["params"]["iterator"] = result["params"]["iterator"]

            await asyncio.sleep(0.5)

        logger.warning("Reached maximum iteration limit", limit=self.ITERATION_LIMIT)
        return results

    async def authenticate(self, username: str, password: str) -> bool:
        """
        Authenticate with the API using provided credentials.

        Args:
            username (str): The username (email address).
            password (str): The password or MFA code.

        Returns:
            bool: True if authentication was successful.

        Raises:
            HTTPException: If authentication fails or MFA is required.
        """
        auth_payload: Dict[str, Dict[str, Any]] = {
            "auth": {
                "command": "api.authenticate",
                "params": {"username": username, "password": password},
            }
        }

        try:
            result = await self.run_commands(auth_payload)
            auth_response = result.get("auth", {})

            if auth_response.get("success"):
                self.session_id = auth_response["params"].get("sessionId")
                self.auth_state = AuthState.AUTHENTICATED
                self.username = username
                logger.info("Authentication successful", username=username)
                return True
            else:
                self.last_error = auth_response.get("errorCodes", [None])[0]
                if self.last_error == -90041:
                    self.auth_state = AuthState.WAITING_FOR_MFA
                    logger.info("MFA required", username=username)
                    raise HTTPException(status_code=403, detail="MFA required")
                self.auth_state = AuthState.NOT_AUTHENTICATED
                raise HTTPException(status_code=401, detail="Authentication failed")
        except OneEdgeApiError as error:
            logger.exception("An error occurred while authenticating", error=str(error))
            raise HTTPException(status_code=500, detail="Authentication error")

    def is_session_valid(self) -> bool:
        """
        Check if the current session appears to be valid without making an API call.

        Returns:
            bool: True if the session appears valid, False otherwise.
        """
        return (
            self.auth_state == AuthState.AUTHENTICATED and self.session_id is not None
        )

    async def submit_mfa(self, mfa_code: str) -> bool:
        """
        Submit the MFA code to the API.

        Args:
            mfa_code (str): The 6-digit TOTP code.

        Returns:
            bool: True if MFA authentication was successful.

        Raises:
            HTTPException: If MFA authentication fails or is not required.
        """
        if self.auth_state != AuthState.WAITING_FOR_MFA:
            raise HTTPException(status_code=400, detail="MFA not required")

        try:
            return await self.authenticate(self.username, mfa_code)
        except HTTPException as e:
            if e.status_code == 403 and e.detail == "MFA required":
                logger.info("MFA in submission", username=self.username)
                logger.error("Unexpected MFA required response during MFA submission")
                raise HTTPException(
                    status_code=500, detail="Unexpected authentication state"
                )
            self.auth_state = AuthState.NOT_AUTHENTICATED
            raise e

    async def switch_organization(self, org_id: str) -> bool:
        """
        Switch to a different organization.

        Args:
            org_id (str): The ID of the organization to switch to.

        Returns:
            bool: True if the switch was successful.

        Raises:
            HTTPException: If the switch fails or the user is not authenticated.
        """
        if self.auth_state != AuthState.AUTHENTICATED:
            raise HTTPException(status_code=401, detail="User not authenticated")

        try:
            result = await self.run_command(
                {"command": "session.org.switch", "params": {"id": org_id}}
            )
            if result.get("success"):
                logger.info(f"Successfully switched to organization {org_id}")
                return True
            else:
                raise HTTPException(
                    status_code=400, detail="Failed to switch organization"
                )
        except OneEdgeApiError as error:
            logger.exception(
                "An error occurred while switching organizations", error=str(error)
            )
            raise HTTPException(status_code=500, detail="Organization switch error")

    async def close_session(self) -> Optional[Dict[str, Any]]:
        """
        Close the session with the API.

        Returns:
            Optional[Dict[str, Any]]: The response from the API, or None if an error occurred.

        Raises:
            OneEdgeApiError: If an error occurs while closing the session.
        """
        try:
            res = await self.run_command(
                {"command": "session.end", "params": {"id": self.session_id}}
            )

            if res is None:
                logger.error("Received 'None' response when closing the session")
                raise HTTPException(status_code=500, detail="Failed to close session")

            if not res.get("success"):
                logger.error("Error closing session", error_codes=res.get("errorCodes"))
                raise HTTPException(status_code=500, detail="Failed to close session")
            return res
        except OneEdgeApiError as e:
            logger.exception(
                "An error occurred while closing the session", error=str(e)
            )
            raise HTTPException(status_code=500, detail="Failed to close session")

    async def verify_auth_state(self) -> None:
        """
        Check the authentication status.

        Raises:
            OneEdgeApiError: If an error occurs while verifying the authentication state.
        """
        try:
            if not self.session_id or self.session_id in ["None", "null"]:

                self.session_id = None
                self.auth_state = AuthState.NOT_AUTHENTICATED
                logger.info(
                    "Auth state set to NOT_AUTHENTICATED due to invalid session ID"
                )
                return

            request = await self.run_command({"command": "session.info"})
            if request["success"]:
                self.auth_state = AuthState.AUTHENTICATED
            else:
                self.session_id = None
                self.auth_state = AuthState.NOT_AUTHENTICATED
                logger.warning(
                    "Auth state set to NOT_AUTHENTICATED after failed verification"
                )
        except OneEdgeApiError as e:
            logger.exception(
                "An error occurred while verifying the authentication state",
                error=str(e),
            )
            raise HTTPException(
                status_code=500, detail="Failed to verify authentication state"
            )

    async def authenticate_user(self, username: str, password: str) -> bool:
        """
        Authenticates the user with the oneEdge API.

        Args:
            username (str): The username (email address).
            password (str): The password.

        Returns:
            bool: True if authentication was successful.

        Raises:
            HTTPException: If authentication fails or MFA is required.
        """
        self.username = username
        try:
            result = await self.authenticate(username, password)
            if result:
                if await self._verify_auth_state():
                    return True
                else:
                    logger.error(
                        "Failed to verify authentication state", username=username
                    )
                    raise HTTPException(status_code=401, detail="Authentication failed")
            return False
        except HTTPException as e:
            if e.status_code == 403 and e.detail == "MFA required":
                # MFA is required, let the caller handle it
                logger.info("MFA let caller handle it", username=username)
                raise e
            logger.error("Authentication failed", error=str(e))
            raise e

    async def _verify_auth_state(self) -> bool:
        """
        Verifies the current authentication state of the API.

        Returns:
            bool: True if authentication state is verified, False otherwise.
        """
        try:
            await self.verify_auth_state()
            return self.auth_state == AuthState.AUTHENTICATED
        except HTTPException:
            return False
