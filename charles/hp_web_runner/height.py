"""Height prediction helper functions extracted from app logic.
Provides normalize_gender, to_cm, and predict_height for reuse and testing.
"""
from typing import Dict, Optional

def normalize_gender(s: Optional[str]) -> str:
    if not s:
        return ''
    s = str(s)
    if '男' in s:
        return '男'
    if '女' in s:
        return '女'
    t = s.strip().lower()
    if t.startswith('m'):
        return '男'
    if t.startswith('f'):
        return '女'
    if 'male' in t:
        return '男'
    if 'female' in t:
        return '女'
    return ''

def to_cm(val: Optional[str], unit: Optional[str]) -> Optional[float]:
    try:
        v = float(val)
    except Exception:
        return None
    if not unit:
        unit = 'cm'
    unit = str(unit).lower()
    if 'in' in unit or '英' in unit:
        return v * 2.54
    return v

def predict_height(gender: str, father_height: float, mother_height: float) -> Dict[str, float]:
    """Compute predicted adult height (cm) and ±8cm range.

    Raises ValueError on invalid inputs.
    """
    g = normalize_gender(gender)
    if g == '':
        raise ValueError('无法解析的性别')

    # Validate numeric
    try:
        fh = float(father_height)
        mh = float(mother_height)
    except Exception:
        raise ValueError('父母身高必须为数字')

    # Range checks
    for v in (fh, mh):
        if v < 30 or v > 300:
            raise ValueError('身高值不在合理范围 (30-300 cm)')

    if g == '男':
        predicted = (fh + mh + 13.0) / 2.0
    else:
        predicted = (fh + mh - 13.0) / 2.0

    low = predicted - 8.0
    high = predicted + 8.0

    return {
        'predicted_cm': round(predicted, 1),
        'low_cm': round(low, 1),
        'high_cm': round(high, 1),
        'message': '基于父母身高的遗传预测，结果仅供参考'
    }
