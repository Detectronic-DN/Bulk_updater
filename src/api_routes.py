from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from typing import List, Optional
from src.logger.logger import Logger
from src.oneEdge.oneEdgeAPI import OneEdgeApi
from src.bulk_changes.create_commands import (
    create_commands_tags,
    create_commands_device_profile,
    create_commands_settings,
    create_commands_thing_def,
    create_commands_delete_tag,
    create_command_delete_things,
    onboarding_things,
)
from src.bulk_changes.get_data import read_imei_and_setting, read_imei_only
import io
import json

logger = Logger(__name__)
router = APIRouter()

endpoint_url = "https://api-de.devicewise.com/api"


async def process_file_or_input(
    file: Optional[UploadFile], imeis: Optional[str], operation: str
):
    if imeis:
        return [imei.strip() for imei in imeis.split("\n") if imei.strip()]
    elif file:
        content = await file.read()
        if operation == "add-settings":
            return await read_imei_and_setting(io.BytesIO(content))
        else:
            return await read_imei_only(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="No file or IMEI list provided")


async def get_one_edge_api(request: Request):
    session_id = request.cookies.get("session")
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    api = OneEdgeApi(endpoint_url)
    api.session_id = session_id
    if not await api._verify_auth_state():
        raise HTTPException(status_code=401, detail="Session is invalid or expired")
    return api


@router.post("/add-settings")
async def add_settings(
    file: Optional[UploadFile] = File(None),
    imeis: Optional[str] = Form(None),
    api: OneEdgeApi = Depends(get_one_edge_api),
):
    try:
        imei_list, settings = await process_file_or_input(file, imeis, "add-settings")
        logger.info(f"Total IMEIs: {len(imei_list)}")
        commands = await create_commands_settings(imei_list, settings)
        result = await api.run_commands(commands)
        return {"message": "Settings added successfully", "result": result}
    except Exception as e:
        logger.error(f"Error in add settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply-profile")
async def apply_profile(
    file: Optional[UploadFile] = File(None),
    imeis: Optional[str] = Form(None),
    profileId: str = Form(...),  # This is now the actual profile ID, not the name
    api: OneEdgeApi = Depends(get_one_edge_api),
):
    try:
        imei_list = await process_file_or_input(file, imeis, "apply-profile")
        logger.info(f"Total IMEIs: {len(imei_list)}")
        commands = await create_commands_device_profile(imei_list, profileId)
        result = await api.run_commands(commands)
        return {"message": "Profile applied successfully", "result": result}
    except Exception as e:
        logger.error(f"Error in apply profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-tags")
async def add_tags(
    file: Optional[UploadFile] = File(None),
    imeis: Optional[str] = Form(None),
    tags: str = Form(...),
    api: OneEdgeApi = Depends(get_one_edge_api),
):
    try:
        imei_list = await process_file_or_input(file, imeis, "add-tags")
        logger.info(f"Total IMEIs: {len(imei_list)}")
        tag_list = json.loads(tags)
        if not isinstance(tag_list, list):
            tag_list = [tag_list]        
        commands = await create_commands_tags(imei_list, tag_list)
        result = await api.run_commands(commands)
        return {"message": "Tags added successfully", "result": result}
    except Exception as e:
        logger.error(f"Error in add tags: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete-tags")
async def delete_tags(
    file: Optional[UploadFile] = File(None),
    imeis: Optional[str] = Form(None),
    tags: str = Form(...),
    api: OneEdgeApi = Depends(get_one_edge_api),
):
    try:
        imei_list = await process_file_or_input(file, imeis, "delete-tags")
        logger.info(f"Total IMEIs: {len(imei_list)}")
        tag_list = json.loads(tags)
        if not isinstance(tag_list, list):
            tag_list = [tag_list]
        commands = await create_commands_delete_tag(imei_list, tag_list)
        result = await api.run_commands(commands)
        return {"message": "Tags deleted successfully", "result": result}
    except Exception as e:
        logger.error(f"Error in delete tags: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/change-def")
async def change_def(
    file: Optional[UploadFile] = File(None),
    imeis: Optional[str] = Form(None),
    thingDefinitionId: str = Form(...),
    api: OneEdgeApi = Depends(get_one_edge_api),
):
    try:
        imei_list = await process_file_or_input(file, imeis, "change-def")
        logger.info(f"Total IMEIs: {len(imei_list)}")
        commands = await create_commands_thing_def(imei_list, thingDefinitionId)
        result = await api.run_commands(commands)
        return {"message": "Thing definition changed successfully", "result": result}
    except Exception as e:
        logger.error(f"Error in change definition: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete-things-keys")
async def delete_things_keys(
    file: Optional[UploadFile] = File(None),
    imeis: Optional[str] = Form(None),
    api: OneEdgeApi = Depends(get_one_edge_api),
):
    try:
        imei_list = await process_file_or_input(file, imeis, "delete-things-keys")
        logger.info(f"Total IMEIs: {len(imei_list)}")
        commands = await create_command_delete_things(thing_keys=imei_list)
        result = await api.run_commands(commands)
        return {"message": "Things deleted successfully", "result": result}
    except Exception as e:
        logger.error(f"Error in delete things by keys: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete-things-tags")
async def delete_things_tags(
    tags: str = Form(...),
    api: OneEdgeApi = Depends(get_one_edge_api),
):
    try:
        tag_list = json.loads(tags)
        if not isinstance(tag_list, list):
            tag_list = [tag_list]
        commands = await create_command_delete_things(tags=tag_list)
        result = await api.run_commands(commands)
        return {"message": "Things deleted successfully", "result": result}
    except Exception as e:
        logger.error(f"Error in delete things by tags: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding")
async def onboarding(
    file: Optional[UploadFile] = File(None),
    imeis: Optional[str] = Form(None),
    profileId: str = Form(...),
    thingDefinitionId: str = Form(...),
    tags: str = Form(...),
    api: OneEdgeApi = Depends(get_one_edge_api),
):
    try:
        imei_list = await process_file_or_input(file, imeis, "onboarding")
        logger.info(f"Total IMEIs: {len(imei_list)}")

        tag_list = json.loads(tags)
        if not isinstance(tag_list, list):
            tag_list = [tag_list]

        await onboarding_things(
            api, imei_list, profileId, thingDefinitionId, tag_list
        )

        return {"message": "Things onboarded successfully"}
    except Exception as e:
        logger.error(f"Error in onboarding: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))