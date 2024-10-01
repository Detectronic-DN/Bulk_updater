from typing import List, Dict, Optional, Any, Union, Tuple
from src.oneEdge.oneEdgeAPI import OneEdgeApi, OneEdgeApiError
from src.logger.logger import Logger

logger = Logger(__name__)


async def get_profile_id(one_edge_api: OneEdgeApi, profile_name: str) -> Optional[str]:
    """
    Get profile ID from the oneEdge API.

    :param one_edge_api: Instance of OneEdgeApi.
    :param profile_name: Name of the profile to search for.
    :return: Profile ID if found, None otherwise.
    :raises OneEdgeApiError: If there's an error communicating with the API.

    Example:
        profile_id = await get_profile_id(one_edge_api, "Standard Profile")
        if profile_id:
            print(f"Profile ID: {profile_id}")
        else:
            print("Profile not found.")
    """
    try:
        response = await one_edge_api.run_command(
            {"command": "lwm2m.profile.list", "params": {"limit": 100, "offset": 0}}
        )

        profile_list = response.get("params", {}).get("result", [])

        for profile in profile_list:
            if profile.get("name") == profile_name:
                return profile["id"]

        logger.warning(f"Profile name '{profile_name}' not found.")
        return None
    except OneEdgeApiError as e:
        logger.error(f"Error while fetching profile: {e}")
        raise


async def get_thing_def_key(one_edge_api: OneEdgeApi, thing_name: str) -> Optional[str]:
    """
    Get thing definition key from the oneEdge API.

    :param one_edge_api: Instance of OneEdgeApi.
    :param thing_name: Name of the thing definition to search for.
    :return: Thing definition key if found, None otherwise.
    :raises OneEdgeApiError: If there's an error communicating with the API.

    Example:
        thing_def_key = await get_thing_def_key(one_edge_api, "Temperature Sensor")
        if thing_def_key:
            print(f"Thing Definition Key: {thing_def_key}")
        else:
            print("Thing definition not found.")
    """
    try:
        response = await one_edge_api.run_command({"command": "thing_def.list"})

        thing_def_list = response.get("params", {}).get("result", [])

        for thing_def in thing_def_list:
            if thing_def.get("name") == thing_name:
                return thing_def["key"]

        logger.warning(f"Thing definition name '{thing_name}' not found.")
        return None
    except OneEdgeApiError as e:
        logger.error(f"Failed to get thing definition list: {e}")
        raise


async def create_commands_tags(
        imei_list: List[str], tags_list: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Creates commands to add tags to devices.

    :param imei_list: A list of IMEI numbers.
    :param tags_list: A list of tags to add.
    :return: A dictionary containing the created commands.

    Example:
        imei_list = ["123456789012345", "987654321098765"]
        tags_list = ["sensor", "active"]
        commands = await create_commands_tags(imei_list, tags_list)
        print(commands)
    """
    try:
        return {
            str(i): {
                "command": "thing.tag.add",
                "params": {"thingKey": imei_number, "tags": tags_list},
            }
            for i, imei_number in enumerate(imei_list, 1)
        }
    except Exception as e:
        logger.error(f"Error creating tag commands: {e}")
        raise


async def create_commands_device_profile(
        imei_list: List[str], profile_id: str
) -> Dict[str, Dict[str, Any]]:
    """
    Creates commands to change device profiles.

    :param imei_list: A list of IMEI numbers.
    :param profile_id: The ID of the profile to apply.
    :return: A dictionary containing the created commands.

    Example:
        imei_list = ["123456789012345", "987654321098765"]
        profile_id = "profile_123"
        commands = await create_commands_device_profile(imei_list, profile_id)
        print(commands)
    """
    try:
        return {
            str(i): {
                "command": "lwm2m.device.profile.change",
                "params": {"thingKey": imei_number, "profileId": profile_id},
            }
            for i, imei_number in enumerate(imei_list, 1)
        }
    except Exception as e:
        logger.error(f"Error creating device profile commands: {e}")
        raise


async def create_commands_settings(
        imei_list: List[str], value_list: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Creates commands to publish attribute settings changes.

    :param imei_list: A list of IMEI numbers.
    :param value_list: A list of associated values.
    :return: A dictionary containing the created commands.
    :raises ValueError: If imei_list and value_list have different lengths.

    Example:
        imei_list = ["123456789012345", "987654321098765"]
        value_list = ["DM=Alarm,SI=900", "DI=86400"]
        commands = await create_commands_settings(imei_list, value_list)
        print(commands)
    """
    if len(imei_list) != len(value_list):
        logger.error("IMEI list and value list must have the same length")
        raise ValueError("IMEI list and value list must have the same length")

    try:
        return {
            str(i): {
                "command": "attribute.publish",
                "params": {
                    "thingKey": imei_number,
                    "key": "att_settings_change",
                    "value": value,
                },
            }
            for i, (imei_number, value) in enumerate(
                zip(imei_list, value_list), start=1
            )
        }
    except Exception as e:
        logger.error(f"Error creating settings commands: {e}")
        raise


async def create_commands_thing_def(
        imei_list: List[str], thing_key: str
) -> Dict[str, Dict[str, Any]]:
    """
    Creates commands to change thing definitions.

    :param imei_list: A list of IMEI numbers.
    :param thing_key: The new thing definition key to apply.
    :return: A dictionary containing the created commands.

    Example:
        imei_list = ["123456789012345", "987654321098765"]
        thing_key = "new_def_key"
        commands = await create_commands_thing_def(imei_list, thing_key)
        print(commands)
    """
    try:
        return {
            str(i): {
                "command": "thing.def.change",
                "params": {
                    "key": imei_number,
                    "newDefKey": thing_key,
                    "dropProps": False,
                    "dropAttrs": True,
                    "dropAlarms": True,
                },
            }
            for i, imei_number in enumerate(imei_list, start=1)
        }
    except Exception as e:
        logger.error(f"Error creating thing definition commands: {e}")
        raise


async def create_commands_undeploy(imei_list: List[str]) -> Dict[str, Dict[str, Any]]:
    """
    Creates commands to undeploy devices by clearing their data destination.

    :param imei_list: A list of IMEI numbers.
    :return: A dictionary containing the created commands.

    Example:
        imei_list = ["123456789012345", "987654321098765"]
        commands = await create_commands_undeploy(imei_list)
        print(commands)
    """
    try:
        return {
            str(i): {
                "command": "attribute.publish",
                "params": {
                    "thingKey": imei_number,
                    "key": "data_destination",
                    "value": "",
                },
            }
            for i, imei_number in enumerate(imei_list, start=1)
        }
    except Exception as e:
        logger.error(f"Error creating undeploy commands: {e}")
        raise


async def create_commands_delete_tag(
        imei_list: List[str], tags_list: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Creates commands to delete tags from devices.

    :param imei_list: A list of IMEI numbers.
    :param tags_list: A list of tags to delete.
    :return: A dictionary containing the created commands.

    Example:
        imei_list = ["123456789012345", "987654321098765"]
        tags_list = ["sensor", "inactive"]
        commands = await create_commands_delete_tag(imei_list, tags_list)
        print(commands)
    """
    try:
        return {
            str(i): {
                "command": "thing.tag.delete",
                "params": {"thingKey": imei_number, "tags": tags_list},
            }
            for i, imei_number in enumerate(imei_list, start=1)
        }
    except Exception as e:
        logger.error(f"Error creating delete tag commands: {e}")
        raise


async def create_commands_delete_tags(
        thing_keys: Union[str, List[str]], tags_to_remove: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Creates commands to delete specified tags from one or more things.

    :param thing_keys: A single thing key or a list of thing keys to remove tags from.
    :param tags_to_remove: A list of tags to be removed from the specified thing(s).
    :return: A dictionary containing the created commands.
    :raises ValueError: If tags_to_remove is empty.

    Example:
        thing_keys = ["thing_123", "thing_456"]
        tags_to_remove = ["outdated", "inactive"]
        commands = await create_commands_delete_tags(thing_keys, tags_to_remove)
        print(commands)
    """
    if not tags_to_remove:
        logger.error("tags_to_remove list cannot be empty")
        raise ValueError("tags_to_remove list cannot be empty")

    try:
        if isinstance(thing_keys, str):
            thing_keys = [thing_keys]

        return {
            str(i): {
                "command": "thing.tag.delete",
                "params": {"thingKey": thing_key, "tags": tags_to_remove},
            }
            for i, thing_key in enumerate(thing_keys, start=1)
        }
    except Exception as e:
        logger.error(f"Error creating delete tag commands: {e}")
        raise


async def create_command_delete_things(
        thing_keys: Optional[Union[str, List[str]]] = None,
        thing_ids: Optional[Union[str, List[str]]] = None,
        tags: Optional[List[str]] = None,
        query: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Creates a command to delete things based on various criteria.

    :param thing_keys: A single thing key or a list of thing keys to delete.
    :param thing_ids: A single thing ID or a list of thing IDs to delete.
    :param tags: A list of tags. Things with all these tags will be deleted.
    :param query: A query string to match things for deletion.
    :return: A dictionary containing the command and its parameters.
    :raises ValueError: If no deletion criteria are provided or if multiple criteria are provided.

    Example:
        # Example 1: Delete by thing keys
        commands = await create_command_delete_things(thing_keys=["thing_123", "thing_456"])
        print(commands)

        # Example 2: Delete by tags
        commands = await create_command_delete_things(tags=["obsolete"])
        print(commands)
    """
    if sum([bool(thing_keys), bool(thing_ids), bool(tags), bool(query)]) != 1:
        logger.error("Exactly one deletion criteria must be provided")
        raise ValueError("Exactly one deletion criteria must be provided")

    params: Dict[str, Any] = {}

    if thing_keys:
        params["key"] = thing_keys if isinstance(thing_keys, list) else [thing_keys]
    elif thing_ids:
        params["id"] = thing_ids if isinstance(thing_ids, list) else [thing_ids]
    elif tags:
        params["tag"] = tags
    elif query:
        params["query"] = query

    try:
        return {"command": "thing.delete", "params": params}
    except Exception as e:
        logger.error(f"Error creating delete things command: {e}")
        raise


async def search_inventory(
        imei: str,
        api: OneEdgeApi,
) -> Optional[Tuple[str, str]]:
    """
    Searches for an inventory item by IMEI number.

    :param imei: The IMEI number to search for.
    :param api: An instance of the OneEdgeApi class.
    :return: The inventory item if found, or None if not found. The tuple contains the identifier ID and IoT ID.
    """
    request = {
        "command": "module.inventory.find",
        "params": {
            "identifiers": imei
        }
    }
    try:
        response = await api.run_command(request)
        if not response.get("success"):
            error_msg = f"Thing {imei} not found or API call unsuccessful"
            logger.error(error_msg)
            if 'errorMessages' in response:
                logger.error(response['errorMessages'])
            raise RuntimeError(error_msg)
        logger.info(f"Thing {imei} found!")
        identifier_id = response.get('params', {}).get('id')
        iotId = response.get('params', {}).get('iotId')
        return (identifier_id, iotId)
    except Exception as e:
        logger.error(f"Error searching inventory: {e}")
        raise RuntimeError(f"Error searching inventory: {e}")

async def create_thing(
        api: OneEdgeApi, def_id: str, imei: str, tags: Optional[List[str]]
) -> str:
    """
    Creates a new thing based on the definition ID and key provided.

    Parameters:
    - api: The API client capable of sending asynchronous commands.
    - def_id: The definition ID for the new thing.
    - thing_key: The key for the new thing, which serves as a unique identifier.
    - tags: A list of tags to assign to the new thing.

    Returns:
    - The ID of the newly created thing if successful.

    Raises:
    - RuntimeError: If the thing creation fails.
    """
    request = {
        "command": "thing.create",
        "params": {
            "defId": def_id,
            "name": imei,
            "key": imei,
            "tags": tags,
            "locEnabled": "1",
        },
    }
    try:
        response = await api.run_command(request)
        if response.get('success'):
            logger.info("Thing created successfully!")
            thing_id: str = response.get('params', {}).get('id')
            return thing_id
        else:
            error_msgs: List[str] = response.get('errorMessages', [])
            error_msg: str = "Error creating thing: " + ", ".join(error_msgs)

            logger.error(error_msg)
            raise RuntimeError(error_msg)
    except Exception as e:
        logger.error(f"Error creating thing: {e}")
        raise RuntimeError(f"Error creating thing: {e}")


async def create_module(api: OneEdgeApi, inventory_id: str, thing_id: str) -> None:
    """
    Creates a new module for a thing using the given inventory and thing IDs.

    Parameters:
    - api: The API client capable of sending asynchronous commands.
    - inventory_id: The inventory ID where the module will be created.
    - thing_id: The thing ID to which the module will be attached.

    Returns:
    - None. Success or error is logged.

    Raises:
    - RuntimeError: If module creation fails.
    """
    request = {
        "command": "module.create",
        "params": {"inventoryId": inventory_id, "thingId": thing_id},
    }
    try:
        response = await api.run_command(request)
        if response.get("success"):
            logger.info("Module created successfully!")
        else:
            error_msg = "Error creating module" + (response.get("errorMessage", ""))
            logger.error(error_msg)
            raise RuntimeError(error_msg)
    except Exception as e:
        logger.error(f"Error creating module: {e}")
        raise RuntimeError(f"Error creating module: {e}")

async def update_lwm2m_profile(
    api: OneEdgeApi,
    thing_id: str,
    profile_id: str,
    iot_id: str,
) -> Optional[dict]:
    """
    Asynchronously updates the LWM2M profile associated with a specific thing.

    Parameters:
    - api: The API client capable of sending asynchronous commands.
    - thing_id: The ID of the thing to update.
    - profile_id: The ID of the LWM2M profile to apply.
    - iot_id: The ID of the IoT device to update.

    Returns:
    - The response from the API if the update was successful, None otherwise.

    Raises:
    - ValueError: If thing_id, profile_id, or iot_id is empty or None.
    - RuntimeError: If the API call fails.
    """
    if not all([thing_id, profile_id, iot_id]):
        raise ValueError(
            "thing_id, profile_id, and iot_id must all be provided and non-empty."
        )

    request = {
        "command": "lwm2m.device.update",
        "params": {
            "connection": "bootstrap_dtls",
            "endpoint": iot_id,
            "profileId": profile_id,
            "thingId": thing_id,
        },
    }

    try:
        response = await api.run_command(request)
        if response.get("success"):
            logger.info("LWM2M profile updated successfully!")
            return response
        else:
            error_msg = response.get("errorMessage", "Error updating LWM2M profile")
            logger.error(f"Failed to update LWM2M profile: {error_msg}")
            raise RuntimeError(f"Failed to update LWM2M profile: {error_msg}")

    except Exception as e:
        logger.error(f"Exception occurred while updating LWM2M profile: {e}")
        raise e


async def onboarding_things(
    api: OneEdgeApi,
    imei_list: List[str],
    profile_id: str,
    thing_def_id: str,
    tags: List[str],
):
    """
    Asynchronously creates new things and modules for a list of IMEI numbers.

    Parameters:
    - api: The API client capable of sending asynchronous commands.
    - imei_list: A list of IMEI numbers to onboard.
    - profile_id: The ID of the LWM2M profile to apply.
    - thing_def_id: The ID of the Thing Definition to use for the new things.
    - tags: A list of tags to apply to the new things and modules.

    Returns:
    - None. Success or error is logged.

    Raises:
    - ValueError: If imei_list is empty or None.
    - RuntimeError: If the API call fails.
    """
    if not all([imei_list, profile_id, thing_def_id, tags]):
        raise ValueError(
            "imei_list, profile_id, thing_def_id, and tags must all be provided and non-empty."
        )

    for imei in imei_list:
        try:
            inventory_id, iotId = await search_inventory(imei, api)
            thing_id = await create_thing(api, def_id=thing_def_id, imei=imei, tags=tags)
            if not thing_id:
                logger.error("Failed to create new thing")
                return

            await create_module(api, inventory_id, thing_id)
            await update_lwm2m_profile(api, thing_id, profile_id, iotId)

            logger.info(f"Successfully Onboarded {imei}")

        except Exception as e:
            logger.error(f"Failed to onboard {imei}: {e}")

