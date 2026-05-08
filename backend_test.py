#!/usr/bin/env python3
"""
Backend API Testing Script for Budget API
Tests all endpoints as specified in the review request
"""

import requests
import json
from datetime import datetime, date
from typing import Dict, Any

# Base URL for API
BASE_URL = "http://localhost:8001/api"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "total": 0
}

def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    test_results["total"] += 1
    if passed:
        test_results["passed"].append(test_name)
        print(f"✅ PASS: {test_name}")
        if details:
            print(f"   Details: {details}")
    else:
        test_results["failed"].append(test_name)
        print(f"❌ FAIL: {test_name}")
        if details:
            print(f"   Error: {details}")
    print()

def test_root_endpoint():
    """Test 1: GET /api/ - Should return welcome message with version"""
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "version" in data:
                log_test("GET /api/ - Root endpoint", True, 
                        f"Message: {data['message']}, Version: {data['version']}")
                return True
            else:
                log_test("GET /api/ - Root endpoint", False, 
                        "Response missing 'message' or 'version' field")
                return False
        else:
            log_test("GET /api/ - Root endpoint", False, 
                    f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        log_test("GET /api/ - Root endpoint", False, str(e))
        return False

def test_seed_categories():
    """Seed categories before testing"""
    try:
        response = requests.post(f"{BASE_URL}/categories/seed")
        if response.status_code == 200:
            data = response.json()
            print(f"ℹ️  Categories seeding: {data['message']}")
            return True
        else:
            print(f"⚠️  Categories seeding returned {response.status_code}")
            return False
    except Exception as e:
        print(f"⚠️  Categories seeding error: {str(e)}")
        return False

def test_get_categories():
    """Test 2: GET /api/categories - Should return list of 10 default categories"""
    try:
        response = requests.get(f"{BASE_URL}/categories")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                if len(data) >= 10:
                    # Check structure of first category
                    if data[0].get("name") and data[0].get("icon"):
                        log_test("GET /api/categories - Get categories", True, 
                                f"Found {len(data)} categories")
                        return data
                    else:
                        log_test("GET /api/categories - Get categories", False, 
                                "Category structure missing required fields")
                        return None
                else:
                    log_test("GET /api/categories - Get categories", False, 
                            f"Expected at least 10 categories, got {len(data)}")
                    return None
            else:
                log_test("GET /api/categories - Get categories", False, 
                        "Response is not a list")
                return None
        else:
            log_test("GET /api/categories - Get categories", False, 
                    f"Expected 200, got {response.status_code}")
            return None
    except Exception as e:
        log_test("GET /api/categories - Get categories", False, str(e))
        return None

def test_create_budget():
    """Test 3: POST /api/budget - Create a new budget"""
    try:
        budget_data = {
            "total_budget": 150000,
            "period": "monthly",
            "start_date": "2025-05-01T00:00:00",
            "currency": "USD"
        }
        response = requests.post(f"{BASE_URL}/budget", json=budget_data)
        if response.status_code == 200:
            data = response.json()
            if (data.get("total_budget") == 150000 and 
                data.get("period") == "monthly" and
                data.get("currency") == "USD"):
                log_test("POST /api/budget - Create budget", True, 
                        f"Budget created with ID: {data.get('id')}")
                return data
            else:
                log_test("POST /api/budget - Create budget", False, 
                        "Budget data doesn't match request")
                return None
        else:
            log_test("POST /api/budget - Create budget", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("POST /api/budget - Create budget", False, str(e))
        return None

def test_get_budget():
    """Test 4: GET /api/budget - Should return the created budget"""
    try:
        response = requests.get(f"{BASE_URL}/budget")
        if response.status_code == 200:
            data = response.json()
            if data.get("total_budget") and data.get("currency"):
                log_test("GET /api/budget - Get budget", True, 
                        f"Budget: {data.get('total_budget')} {data.get('currency')}")
                return data
            else:
                log_test("GET /api/budget - Get budget", False, 
                        "Budget missing required fields")
                return None
        else:
            log_test("GET /api/budget - Get budget", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("GET /api/budget - Get budget", False, str(e))
        return None

def test_create_category_budget():
    """Test 5: POST /api/category-budgets - Create a category budget"""
    try:
        category_budget_data = {
            "category_name": "Transport",
            "category_icon": "car",
            "budget_amount": 15000,
            "period": "monthly",
            "alert_limit": 85,
            "month": 5,
            "year": 2025
        }
        response = requests.post(f"{BASE_URL}/category-budgets", json=category_budget_data)
        if response.status_code == 200:
            data = response.json()
            if (data.get("category_name") == "Transport" and 
                data.get("budget_amount") == 15000 and
                data.get("month") == 5):
                log_test("POST /api/category-budgets - Create category budget", True, 
                        f"Category budget created with ID: {data.get('id')}")
                return data
            else:
                log_test("POST /api/category-budgets - Create category budget", False, 
                        "Category budget data doesn't match request")
                return None
        else:
            log_test("POST /api/category-budgets - Create category budget", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("POST /api/category-budgets - Create category budget", False, str(e))
        return None

def test_get_category_budgets():
    """Test 6: GET /api/category-budgets?month=5&year=2025 - Should return list with created budget"""
    try:
        response = requests.get(f"{BASE_URL}/category-budgets", params={"month": 5, "year": 2025})
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check if Transport category is in the list
                transport_found = any(cb.get("category_name") == "Transport" for cb in data)
                if transport_found:
                    log_test("GET /api/category-budgets - Get category budgets", True, 
                            f"Found {len(data)} category budget(s)")
                    return data
                else:
                    log_test("GET /api/category-budgets - Get category budgets", False, 
                            "Transport category budget not found in response")
                    return None
            else:
                log_test("GET /api/category-budgets - Get category budgets", False, 
                        "Expected non-empty list")
                return None
        else:
            log_test("GET /api/category-budgets - Get category budgets", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("GET /api/category-budgets - Get category budgets", False, str(e))
        return None

def test_get_budget_summary():
    """Test 7: GET /api/budget-summary?month=5&year=2025 - Should return comprehensive summary"""
    try:
        response = requests.get(f"{BASE_URL}/budget-summary", params={"month": 5, "year": 2025})
        if response.status_code == 200:
            data = response.json()
            required_fields = ["total_budget", "total_spent", "remaining_budget", 
                             "income", "expenses", "savings", "savings_rate", 
                             "categories", "month", "year", "currency"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if not missing_fields:
                if isinstance(data.get("categories"), list):
                    log_test("GET /api/budget-summary - Get budget summary", True, 
                            f"Summary with {len(data['categories'])} categories")
                    return data
                else:
                    log_test("GET /api/budget-summary - Get budget summary", False, 
                            "Categories field is not a list")
                    return None
            else:
                log_test("GET /api/budget-summary - Get budget summary", False, 
                        f"Missing fields: {missing_fields}")
                return None
        else:
            log_test("GET /api/budget-summary - Get budget summary", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("GET /api/budget-summary - Get budget summary", False, str(e))
        return None

def test_create_savings_goal():
    """Test 8: POST /api/savings-goals - Create a savings goal"""
    try:
        savings_goal_data = {
            "goal_amount": 50000,
            "target_date": "2025-12-31",
            "notes": "Emergency fund"
        }
        response = requests.post(f"{BASE_URL}/savings-goals", json=savings_goal_data)
        if response.status_code == 200:
            data = response.json()
            if (data.get("goal_amount") == 50000 and 
                data.get("notes") == "Emergency fund"):
                log_test("POST /api/savings-goals - Create savings goal", True, 
                        f"Savings goal created with ID: {data.get('id')}")
                return data
            else:
                log_test("POST /api/savings-goals - Create savings goal", False, 
                        "Savings goal data doesn't match request")
                return None
        else:
            log_test("POST /api/savings-goals - Create savings goal", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("POST /api/savings-goals - Create savings goal", False, str(e))
        return None

def test_get_savings_goals():
    """Test 9: GET /api/savings-goals - Should return list with created goal"""
    try:
        response = requests.get(f"{BASE_URL}/savings-goals")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                # Check if our goal is in the list
                emergency_fund_found = any(sg.get("notes") == "Emergency fund" for sg in data)
                if emergency_fund_found:
                    log_test("GET /api/savings-goals - Get savings goals", True, 
                            f"Found {len(data)} savings goal(s)")
                    return data
                else:
                    log_test("GET /api/savings-goals - Get savings goals", False, 
                            "Emergency fund goal not found in response")
                    return None
            else:
                log_test("GET /api/savings-goals - Get savings goals", False, 
                        "Expected non-empty list")
                return None
        else:
            log_test("GET /api/savings-goals - Get savings goals", False, 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return None
    except Exception as e:
        log_test("GET /api/savings-goals - Get savings goals", False, str(e))
        return None

def test_duplicate_category_budget_error():
    """Test 10: Test error handling - Try creating duplicate category budget"""
    try:
        category_budget_data = {
            "category_name": "Transport",
            "category_icon": "car",
            "budget_amount": 20000,
            "period": "monthly",
            "alert_limit": 90,
            "month": 5,
            "year": 2025
        }
        response = requests.post(f"{BASE_URL}/category-budgets", json=category_budget_data)
        if response.status_code == 400:
            data = response.json()
            if "detail" in data:
                log_test("POST /api/category-budgets - Duplicate error handling", True, 
                        f"Correctly returned 400 with message: {data['detail']}")
                return True
            else:
                log_test("POST /api/category-budgets - Duplicate error handling", False, 
                        "400 response missing 'detail' field")
                return False
        else:
            log_test("POST /api/category-budgets - Duplicate error handling", False, 
                    f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("POST /api/category-budgets - Duplicate error handling", False, str(e))
        return False

def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Total Tests: {test_results['total']}")
    print(f"Passed: {len(test_results['passed'])} ✅")
    print(f"Failed: {len(test_results['failed'])} ❌")
    print(f"Success Rate: {len(test_results['passed'])/test_results['total']*100:.1f}%")
    
    if test_results['failed']:
        print("\nFailed Tests:")
        for test in test_results['failed']:
            print(f"  - {test}")
    
    print("="*70 + "\n")

def main():
    """Run all tests"""
    print("\n" + "="*70)
    print("BUDGET API BACKEND TESTING")
    print("="*70 + "\n")
    
    # Seed categories first
    print("Setting up test data...")
    test_seed_categories()
    print()
    
    # Run all tests in sequence
    print("Running API tests...\n")
    
    test_root_endpoint()
    test_get_categories()
    test_create_budget()
    test_get_budget()
    test_create_category_budget()
    test_get_category_budgets()
    test_get_budget_summary()
    test_create_savings_goal()
    test_get_savings_goals()
    test_duplicate_category_budget_error()
    
    # Print summary
    print_summary()
    
    # Return exit code
    return 0 if len(test_results['failed']) == 0 else 1

if __name__ == "__main__":
    exit(main())
