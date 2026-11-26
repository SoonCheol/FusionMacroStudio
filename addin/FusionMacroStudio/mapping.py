"""Pure profile validation and mapping. Matches site/protocol.js."""
SLOTS = list(range(1,13)) + list(range(16,25))
MODS = [0,3,5,6,7,2]
def trigger(layer, slot):
    if type(layer) is not int or not 0 <= layer < 3 or type(slot) is not int or slot not in SLOTS:
        raise ValueError("Invalid slot")
    i = layer * 21 + SLOTS.index(slot)
    return MODS[i // 12], 0x7c + i % 12

def load_mapping(profile):
    if not isinstance(profile, dict) or profile.get("format") != "fusion-macro-studio-v1" or profile.get("knobBase") != 16:
        raise ValueError("Unsupported profile")
    layers = profile.get("layers")
    if not isinstance(layers, list) or len(layers) != 3:
        raise ValueError("Expected three layers")
    result = {}
    for layer, data in enumerate(layers):
        if not isinstance(data, dict):
            raise ValueError("Invalid layer")
        fusion, bindings = data.get("fusion", {}), data.get("bindings", {})
        if not isinstance(fusion, dict) or not isinstance(bindings, dict):
            raise ValueError("Invalid layer mappings")
        for key, value in fusion.items():
            if key not in {str(s) for s in SLOTS} or not isinstance(value, dict):
                raise ValueError("Invalid mapped slot")
            slot = int(key)
            command = value.get("id")
            if not isinstance(command, str) or not command.strip() or len(command) > 256 or command in ("__fms_escape__", "__fms_export__"):
                raise ValueError("Invalid command ID")
            mods, vk = trigger(layer, slot)
            # A saved web profile must actually contain the matching HID trigger.
            binding = bindings.get(key)
            if not isinstance(binding, dict) or binding.get("type") != "key" or binding.get("delay") != 0:
                raise ValueError("Missing trigger for layer %s slot %s" % (layer+1, slot))
            steps = binding.get("steps")
            if not isinstance(steps, list) or len(steps) != 1 or not isinstance(steps[0], dict):
                raise ValueError("Invalid trigger steps")
            step = steps[0]
            if type(step.get("mods")) is not int or type(step.get("code")) is not int or step["mods"] != mods or step["code"] != vk - 20:
                raise ValueError("Trigger mismatch for layer %s slot %s" % (layer+1, slot))
            result[(mods, vk)] = (command, slot <= 12)
    return result

def resolve(action, elapsed, threshold=0.5):
    command, is_key = action
    return "__fms_escape__" if is_key and elapsed >= threshold else command
