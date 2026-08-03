from mapia_pipeline.satellite import detect_candidate, normalized_change


def test_normalized_change_requires_equal_coverage() -> None:
    try:
        normalized_change([0.1], [0.1, 0.2])
    except ValueError as error:
        assert "misma cobertura" in str(error)
    else:
        raise AssertionError("Se esperaba ValueError")


def test_radar_support_creates_private_candidate() -> None:
    candidate = detect_candidate(
        {
            "sensor": "Sentinel-1 IW GRD",
            "acquired_at": "2025-03-29T00:00:00Z",
            "baseline_at": "2025-03-09T00:00:00Z",
            "current_corridor": [0.3, 0.4],
            "baseline_corridor": [0.1, 0.12],
            "radar_change_confirmed": True,
        }
    )
    assert candidate is not None
    assert candidate.status == "borrador"
    assert candidate.requires_field_inspection is True
