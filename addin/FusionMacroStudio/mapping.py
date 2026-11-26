"""Pure mapping logic. Matches site/protocol.js."""
SLOTS = list(range(1,13)) + list(range(16,25))
MODS = [0,3,5,6,7,2]
def trigger(layer, slot):
    i = layer * 21 + SLOTS.index(slot)
    return MODS[i // 12], 0x7c + i % 12
def load_mapping(profile):
    if profile.get("format") != "fusion-macro-studio-v1" or profile.get("knobBase") != 16 or len(profile.get("layers", [])) != 3:
        raise ValueError("Unsupported profile")
    result = {}
    for layer, data in enumerate(profile["layers"]):
        for key, value in data.get("fusion", {}).items():
            slot = int(key)
            if slot not in SLOTS or not isinstance(value.get("id"), str):
                continue
            if not value["id"] or len(value["id"]) > 256:
                continue
            mods, vk = trigger(layer, slot)
            result[(mods, vk)] = (value["id"], slot <= 12)
    return result
def resolve(action, elapsed, threshold=0.5):
    command, is_key = action
    return "__fms_escape__" if is_key and elapsed >= threshold else command
