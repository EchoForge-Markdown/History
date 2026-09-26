import pytest
from hp_web_runner.height import normalize_gender, to_cm, predict_height


def test_normalize_gender():
    assert normalize_gender('男') == '男'
    assert normalize_gender('female') == '女'
    assert normalize_gender('M') == '男'
    assert normalize_gender('') == ''


def test_to_cm():
    assert to_cm('10', 'cm') == 10.0
    assert abs(to_cm('10', 'in') - 25.4) < 1e-6
    assert to_cm('abc', 'cm') is None


def test_predict_height_male():
    r = predict_height('男', 180, 165)
    assert r['predicted_cm'] == 179.0
    assert r['low_cm'] == 171.0
    assert r['high_cm'] == 187.0


def test_predict_height_female():
    r = predict_height('女', 180, 165)
    assert r['predicted_cm'] == 166.0


def test_predict_height_invalid_gender():
    with pytest.raises(ValueError):
        predict_height('', 180, 165)


def test_predict_height_out_of_range():
    with pytest.raises(ValueError):
        predict_height('男', 10, 165)