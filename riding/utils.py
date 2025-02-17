def calculate_path_distance(path_data):
    if not path_data:
        return 0.0

    total_distance = 0
    for path in path_data:
        if path.get("geometry", {}).get("type") == "LineString":
            if "properties" in path and "distance" in path["properties"]:
                total_distance += path["properties"]["distance"]

    # 미터를 킬로미터로 변환하고 소수점 첫째 자리까지 표시
    return round(total_distance / 1000, 1)
