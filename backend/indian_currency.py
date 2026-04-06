"""
Indian Currency Utilities
Formats numbers in Indian numbering system (₹ 1,00,000)
"""

def format_indian_currency(amount: float, show_symbol: bool = True) -> str:
    """
    Format amount in Indian currency format
    Example: 100000 -> ₹1,00,000.00
    """
    if amount < 0:
        negative = True
        amount = abs(amount)
    else:
        negative = False
    
    # Split into integer and decimal parts
    integer_part = int(amount)
    decimal_part = int((amount - integer_part) * 100)
    
    # Convert to string and reverse for easier processing
    s = str(integer_part)
    
    if len(s) <= 3:
        result = s
    else:
        # First 3 digits from right
        result = s[-3:]
        s = s[:-3]
        
        # Then groups of 2
        while s:
            result = s[-2:] + ',' + result
            s = s[:-2]
    
    # Add decimal part
    formatted = f"{result}.{decimal_part:02d}"
    
    # Add currency symbol
    if show_symbol:
        formatted = f"₹{formatted}"
    
    # Add negative sign if needed
    if negative:
        formatted = f"-{formatted}"
    
    return formatted


def parse_indian_currency(amount_str: str) -> float:
    """
    Parse Indian currency string to float
    Example: "₹1,00,000.00" -> 100000.0
    """
    # Remove currency symbol and commas
    cleaned = amount_str.replace('₹', '').replace(',', '').strip()
    return float(cleaned)


# Quick format function for use in code
def inr(amount: float) -> str:
    """Shorthand for Indian Rupee formatting"""
    return format_indian_currency(amount, show_symbol=True)
