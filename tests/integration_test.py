"""tests/integration_test.py — Integration and security verification test suite."""

import httpx
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    passed = 0
    failed = 0

    print("=========================================================")
    print(" PASSPORT APPLICATION PLATFORM — INTEGRATION TEST SUITE")
    print("=========================================================")

    # Test 1: Health Check
    try:
        r = httpx.get(f"{BASE_URL}/health", timeout=5)
        assert r.status_code == 200
        assert r.json().get("status") == "HEALTHY"
        print("[PASS] Test 1: /health endpoint is operational")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 1: /health endpoint failed: {e}")
        failed += 1

    # Test 2: Unauthenticated access to protected route returns 401
    try:
        r = httpx.get(f"{BASE_URL}/api/applications/me", timeout=5)
        assert r.status_code == 401
        print("[PASS] Test 2: Unauthenticated request to /api/applications/me rejected (401)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 2: Expected 401 on unauthenticated request, got {e}")
        failed += 1

    # Test 3: Invalid / forged token rejected
    try:
        headers = {"Authorization": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.e30.tampered_signature"}
        r = httpx.get(f"{BASE_URL}/api/applications/me", headers=headers, timeout=5)
        assert r.status_code == 401
        print("[PASS] Test 3: Tampered signature JWT rejected (401)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 3: Expected 401 on tampered JWT: {e}")
        failed += 1

    # Test 4: Alg: none attack rejected
    try:
        headers = {"Authorization": "Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTUyMzQtMTIzNC0xMjM0NTY3ODkwMTIiLCJyb2xlIjoiQURNSU4ifQ."}
        r = httpx.get(f"{BASE_URL}/api/applications/me", headers=headers, timeout=5)
        assert r.status_code == 401
        print("[PASS] Test 4: alg:none attack rejected (401)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 4: Expected 401 on alg:none attack: {e}")
        failed += 1

    # Test 5: Security headers check
    try:
        r = httpx.get(f"{BASE_URL}/health", timeout=5)
        assert r.headers.get("X-Content-Type-Options") == "nosniff"
        assert r.headers.get("X-Frame-Options") == "DENY"
        print("[PASS] Test 5: Security headers (nosniff, DENY) present")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Test 5: Missing security headers: {e}")
        failed += 1

    print("\n---------------------------------------------------------")
    print(f"Results: {passed} PASSED, {failed} FAILED")
    print("---------------------------------------------------------")
    return failed == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
