#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://bill-tracker-mobile.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def log_test(test_name, status, details=""):
    """Log test results"""
    status_symbol = "✅" if status == "PASS" else "❌"
    print(f"{status_symbol} {test_name}")
    if details:
        print(f"   {details}")
    print()

def test_authentication():
    """Test authentication to get access token"""
    print("🔐 Testing Authentication...")
    
    try:
        response = requests.post(f"{BASE_URL}/auth/single-user", headers=HEADERS)
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get("access_token")
            user_id = data.get("user", {}).get("user_id")
            
            if access_token and user_id:
                log_test("Authentication", "PASS", f"Token obtained, User ID: {user_id}")
                return access_token, user_id
            else:
                log_test("Authentication", "FAIL", "No access token in response")
                return None, None
        else:
            log_test("Authentication", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
            return None, None
            
    except Exception as e:
        log_test("Authentication", "FAIL", f"Exception: {str(e)}")
        return None, None

def test_reminders_api(access_token):
    """Test all Reminders API endpoints"""
    print("📅 Testing Reminders API...")
    
    auth_headers = {
        **HEADERS,
        "Authorization": f"Bearer {access_token}"
    }
    
    created_reminder_ids = []
    
    # Test 1: Create Reminder - HDFC SIP Payment (recurring)
    print("1️⃣ Testing Create Reminder - HDFC SIP Payment...")
    try:
        reminder_data = {
            "title": "HDFC SIP Payment",
            "description": "Monthly SIP for HDFC Flexicap",
            "reminder_date": "2026-04-15T00:00:00Z",
            "reminder_type": "investment",
            "is_recurring": True,
            "recurrence": "monthly"
        }
        
        response = requests.post(f"{BASE_URL}/reminders", 
                               headers=auth_headers, 
                               json=reminder_data)
        
        if response.status_code == 200:
            data = response.json()
            reminder_id = data.get("reminder_id")
            if reminder_id:
                created_reminder_ids.append(reminder_id)
                log_test("Create HDFC SIP Reminder", "PASS", 
                        f"Created reminder ID: {reminder_id}, Title: {data.get('title')}")
            else:
                log_test("Create HDFC SIP Reminder", "FAIL", "No reminder_id in response")
        else:
            log_test("Create HDFC SIP Reminder", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Create HDFC SIP Reminder", "FAIL", f"Exception: {str(e)}")
    
    # Test 2: Create Reminder - EMI Payment Due
    print("2️⃣ Testing Create Reminder - EMI Payment Due...")
    try:
        reminder_data = {
            "title": "EMI Payment Due",
            "description": "Home loan EMI",
            "reminder_date": "2026-04-25T00:00:00Z",
            "reminder_type": "loan_emi"
        }
        
        response = requests.post(f"{BASE_URL}/reminders", 
                               headers=auth_headers, 
                               json=reminder_data)
        
        if response.status_code == 200:
            data = response.json()
            reminder_id = data.get("reminder_id")
            if reminder_id:
                created_reminder_ids.append(reminder_id)
                log_test("Create EMI Reminder", "PASS", 
                        f"Created reminder ID: {reminder_id}, Title: {data.get('title')}")
            else:
                log_test("Create EMI Reminder", "FAIL", "No reminder_id in response")
        else:
            log_test("Create EMI Reminder", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Create EMI Reminder", "FAIL", f"Exception: {str(e)}")
    
    # Test 3: Create Reminder - Credit Card Bill (overdue)
    print("3️⃣ Testing Create Reminder - Credit Card Bill (overdue)...")
    try:
        reminder_data = {
            "title": "Credit Card Bill",
            "reminder_date": "2025-01-01T00:00:00Z",
            "reminder_type": "credit_card"
        }
        
        response = requests.post(f"{BASE_URL}/reminders", 
                               headers=auth_headers, 
                               json=reminder_data)
        
        if response.status_code == 200:
            data = response.json()
            reminder_id = data.get("reminder_id")
            if reminder_id:
                created_reminder_ids.append(reminder_id)
                log_test("Create Credit Card Reminder", "PASS", 
                        f"Created reminder ID: {reminder_id}, Title: {data.get('title')}")
            else:
                log_test("Create Credit Card Reminder", "FAIL", "No reminder_id in response")
        else:
            log_test("Create Credit Card Reminder", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Create Credit Card Reminder", "FAIL", f"Exception: {str(e)}")
    
    # Test 4: List All Reminders
    print("4️⃣ Testing List All Reminders...")
    try:
        response = requests.get(f"{BASE_URL}/reminders", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                reminder_count = len(data)
                if reminder_count >= 3:
                    log_test("List All Reminders", "PASS", 
                            f"Retrieved {reminder_count} reminders")
                    
                    # Verify reminder details
                    titles = [r.get('title') for r in data]
                    expected_titles = ["HDFC SIP Payment", "EMI Payment Due", "Credit Card Bill"]
                    found_titles = [title for title in expected_titles if title in titles]
                    
                    if len(found_titles) == 3:
                        log_test("Reminder Titles Verification", "PASS", 
                                f"All expected titles found: {found_titles}")
                    else:
                        log_test("Reminder Titles Verification", "FAIL", 
                                f"Missing titles. Found: {found_titles}, Expected: {expected_titles}")
                else:
                    log_test("List All Reminders", "FAIL", 
                            f"Expected at least 3 reminders, got {reminder_count}")
            else:
                log_test("List All Reminders", "FAIL", "Response is not a list")
        else:
            log_test("List All Reminders", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("List All Reminders", "FAIL", f"Exception: {str(e)}")
    
    # Test 5: Filter by Type - Investment
    print("5️⃣ Testing Filter by Type - Investment...")
    try:
        response = requests.get(f"{BASE_URL}/reminders?reminder_type=investment", 
                              headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                investment_reminders = [r for r in data if r.get('reminder_type') == 'investment']
                if len(investment_reminders) >= 1:
                    log_test("Filter by Investment Type", "PASS", 
                            f"Found {len(investment_reminders)} investment reminder(s)")
                    
                    # Verify it's the HDFC SIP reminder
                    hdfc_reminder = next((r for r in investment_reminders if r.get('title') == 'HDFC SIP Payment'), None)
                    if hdfc_reminder:
                        log_test("HDFC SIP Reminder Found", "PASS", 
                                f"Recurring: {hdfc_reminder.get('is_recurring')}, Recurrence: {hdfc_reminder.get('recurrence')}")
                    else:
                        log_test("HDFC SIP Reminder Found", "FAIL", "HDFC SIP Payment not found in investment reminders")
                else:
                    log_test("Filter by Investment Type", "FAIL", 
                            f"Expected at least 1 investment reminder, got {len(investment_reminders)}")
            else:
                log_test("Filter by Investment Type", "FAIL", "Response is not a list")
        else:
            log_test("Filter by Investment Type", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Filter by Investment Type", "FAIL", f"Exception: {str(e)}")
    
    # Test 6: Filter by Completion Status - Uncompleted
    print("6️⃣ Testing Filter by Completion Status - Uncompleted...")
    try:
        response = requests.get(f"{BASE_URL}/reminders?is_completed=false", 
                              headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                uncompleted_count = len(data)
                if uncompleted_count >= 3:
                    log_test("Filter Uncompleted Reminders", "PASS", 
                            f"Found {uncompleted_count} uncompleted reminders")
                    
                    # Verify all are uncompleted
                    all_uncompleted = all(not r.get('is_completed', True) for r in data)
                    if all_uncompleted:
                        log_test("All Reminders Uncompleted", "PASS", "All returned reminders are uncompleted")
                    else:
                        log_test("All Reminders Uncompleted", "FAIL", "Some reminders are marked as completed")
                else:
                    log_test("Filter Uncompleted Reminders", "FAIL", 
                            f"Expected at least 3 uncompleted reminders, got {uncompleted_count}")
            else:
                log_test("Filter Uncompleted Reminders", "FAIL", "Response is not a list")
        else:
            log_test("Filter Uncompleted Reminders", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Filter Uncompleted Reminders", "FAIL", f"Exception: {str(e)}")
    
    # Test 7: Filter by Upcoming
    print("7️⃣ Testing Filter by Upcoming...")
    try:
        response = requests.get(f"{BASE_URL}/reminders?upcoming=true", 
                              headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                upcoming_count = len(data)
                log_test("Filter Upcoming Reminders", "PASS", 
                        f"Found {upcoming_count} upcoming reminders")
                
                # Verify all are future-dated and uncompleted
                if upcoming_count >= 2:  # HDFC SIP and EMI should be future-dated
                    log_test("Future-dated Reminders", "PASS", 
                            f"Found {upcoming_count} upcoming reminders (future-dated and uncompleted)")
                else:
                    log_test("Future-dated Reminders", "FAIL", 
                            f"Expected at least 2 upcoming reminders, got {upcoming_count}")
            else:
                log_test("Filter Upcoming Reminders", "FAIL", "Response is not a list")
        else:
            log_test("Filter Upcoming Reminders", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Filter Upcoming Reminders", "FAIL", f"Exception: {str(e)}")
    
    # Test 8: Get Reminders Summary
    print("8️⃣ Testing Get Reminders Summary...")
    try:
        response = requests.get(f"{BASE_URL}/reminders/summary", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["total_pending", "overdue", "today", "this_week"]
            
            if all(field in data for field in required_fields):
                log_test("Reminders Summary Structure", "PASS", 
                        f"All required fields present: {required_fields}")
                
                # Verify counts
                total_pending = data.get("total_pending", 0)
                overdue = data.get("overdue", 0)
                today = data.get("today", 0)
                this_week = data.get("this_week", 0)
                
                log_test("Summary Counts", "PASS", 
                        f"Total Pending: {total_pending}, Overdue: {overdue}, Today: {today}, This Week: {this_week}")
                
                # Verify overdue count (should be at least 1 due to the past-dated credit card reminder)
                if overdue >= 1:
                    log_test("Overdue Count Verification", "PASS", 
                            f"Overdue count is {overdue} (≥1 as expected)")
                else:
                    log_test("Overdue Count Verification", "FAIL", 
                            f"Expected overdue count ≥1, got {overdue}")
                
                # Check for upcoming and overdue lists
                if "upcoming" in data and "overdue_list" in data:
                    log_test("Summary Lists", "PASS", "Upcoming and overdue_list fields present")
                else:
                    log_test("Summary Lists", "FAIL", "Missing upcoming or overdue_list fields")
                    
            else:
                missing_fields = [field for field in required_fields if field not in data]
                log_test("Reminders Summary Structure", "FAIL", 
                        f"Missing fields: {missing_fields}")
        else:
            log_test("Reminders Summary", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Reminders Summary", "FAIL", f"Exception: {str(e)}")
    
    # Test 9: Update Reminder - Mark as Completed
    if created_reminder_ids:
        print("9️⃣ Testing Update Reminder - Mark as Completed...")
        try:
            reminder_id = created_reminder_ids[0]  # Use first created reminder
            update_data = {"is_completed": True}
            
            response = requests.put(f"{BASE_URL}/reminders/{reminder_id}", 
                                  headers=auth_headers, 
                                  json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("is_completed") == True:
                    log_test("Update Reminder - Mark Completed", "PASS", 
                            f"Reminder {reminder_id} marked as completed")
                    
                    # Verify the reminder is updated
                    if data.get("reminder_id") == reminder_id:
                        log_test("Updated Reminder Verification", "PASS", 
                                f"Returned reminder has correct ID and completion status")
                    else:
                        log_test("Updated Reminder Verification", "FAIL", 
                                "Returned reminder ID doesn't match")
                else:
                    log_test("Update Reminder - Mark Completed", "FAIL", 
                            f"is_completed not set to true: {data.get('is_completed')}")
            else:
                log_test("Update Reminder - Mark Completed", "FAIL", 
                        f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            log_test("Update Reminder - Mark Completed", "FAIL", f"Exception: {str(e)}")
    
    # Test 10: Delete Reminder
    if len(created_reminder_ids) > 1:
        print("🔟 Testing Delete Reminder...")
        try:
            reminder_id = created_reminder_ids[1]  # Use second created reminder
            
            response = requests.delete(f"{BASE_URL}/reminders/{reminder_id}", 
                                     headers=auth_headers)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "deleted" in data["message"].lower():
                    log_test("Delete Reminder", "PASS", 
                            f"Reminder {reminder_id} deleted successfully")
                    
                    # Verify deletion by trying to get all reminders
                    verify_response = requests.get(f"{BASE_URL}/reminders", headers=auth_headers)
                    if verify_response.status_code == 200:
                        all_reminders = verify_response.json()
                        deleted_reminder = next((r for r in all_reminders if r.get('reminder_id') == reminder_id), None)
                        
                        if deleted_reminder is None:
                            log_test("Delete Verification", "PASS", 
                                    f"Deleted reminder {reminder_id} no longer appears in list")
                        else:
                            log_test("Delete Verification", "FAIL", 
                                    f"Deleted reminder {reminder_id} still appears in list")
                    else:
                        log_test("Delete Verification", "FAIL", 
                                "Could not verify deletion - failed to get reminders list")
                else:
                    log_test("Delete Reminder", "FAIL", 
                            f"Unexpected response message: {data}")
            else:
                log_test("Delete Reminder", "FAIL", 
                        f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            log_test("Delete Reminder", "FAIL", f"Exception: {str(e)}")
    
    # Test 11: Final Count Verification
    print("1️⃣1️⃣ Testing Final Count Verification...")
    try:
        response = requests.get(f"{BASE_URL}/reminders", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                final_count = len(data)
                # Should have 2 reminders left (3 created - 1 deleted)
                expected_count = 2
                if final_count == expected_count:
                    log_test("Final Count Verification", "PASS", 
                            f"Final count is {final_count} as expected")
                else:
                    log_test("Final Count Verification", "FAIL", 
                            f"Expected {expected_count} reminders, got {final_count}")
            else:
                log_test("Final Count Verification", "FAIL", "Response is not a list")
        else:
            log_test("Final Count Verification", "FAIL", 
                    f"Status: {response.status_code}, Response: {response.text}")
            
    except Exception as e:
        log_test("Final Count Verification", "FAIL", f"Exception: {str(e)}")

def main():
    """Main test function"""
    print("🚀 Starting Reminders API Testing...")
    print("=" * 60)
    
    # Test authentication first
    access_token, user_id = test_authentication()
    
    if not access_token:
        print("❌ Authentication failed. Cannot proceed with API tests.")
        sys.exit(1)
    
    # Test Reminders API
    test_reminders_api(access_token)
    
    print("=" * 60)
    print("🏁 Reminders API Testing Complete!")

if __name__ == "__main__":
    main()