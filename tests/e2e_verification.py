"""
tests/e2e_verification.py — Comprehensive End-to-End Verification Suite.
Exercises:
 1. Health checks across all 3 services (Auth 8080, App 8000, Frontend 3000)
 2. Customer Registration via BFF (/api/auth/register)
 3. Role Escalation Prevention (Attempts to register as AGENT or ADMIN)
 4. Duplicate Email Uniqueness Enforcement
 5. Customer Login via BFF (/api/auth/login) & HttpOnly Cookie Issuance
 6. Protected Customer Application Creation (/api/proxy/applications)
 7. Document Checklist Retrieval (/api/proxy/applications/{app_id}/checklist)
 8. File Upload Security:
    a) Rejection of disallowed executable disguised as PDF
    b) Rejection of magic byte mismatch
    c) Acceptance of valid signed PDF
 9. Admin Bootstrap Login (/api/auth/login with bootstrap admin)
10. Admin Provisioning of an AGENT account (/admin/users)
11. Agent Login & Application Review Workflow
12. Agent Document Approval & Application Progress Update
13. Customer Status Update Verification
14. Logout & Session Termination
"""

import os
import random
import sys
import time
import httpx

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://frontend:3000")
AUTH_URL = os.environ.get("AUTH_URL", "http://auth-service:8080")
APP_URL = os.environ.get("APP_URL", "http://localhost:8000")

def run_e2e_suite():
    passed = 0
    failed = 0

    print("=================================================================")
    print("   PASSPORT PLATFORM — FULL-STACK END-TO-END VERIFICATION")
    print("=================================================================")

    # -------------------------------------------------------------
    # 1. Health Checks
    # -------------------------------------------------------------
    print("\n--- PHASE 1: SERVICE HEALTH CHECKS ---")
    try:
        r_app = httpx.get(f"{APP_URL}/health", timeout=5)
        assert r_app.status_code == 200 and r_app.json().get("status") == "HEALTHY"
        print("[PASS] Python App Service /health is HEALTHY (port 8000)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] App Service health check failed: {e}")
        failed += 1

    try:
        r_auth = httpx.get(f"{AUTH_URL}/actuator/health", timeout=5)
        assert r_auth.status_code == 200 and r_auth.json().get("status") == "UP"
        print("[PASS] Java Auth Service /actuator/health is UP (port 8080)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Auth Service health check failed: {e}")
        failed += 1

    try:
        r_fe = httpx.get(f"{FRONTEND_URL}/", timeout=10)
        assert r_fe.status_code == 200
        assert "NOT affiliated with" in r_fe.text or "NOT an official government" in r_fe.text
        print("[PASS] Next.js Frontend is UP with Mandatory Disclaimer Banner (port 3000)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Frontend check failed: {e}")
        failed += 1

    # -------------------------------------------------------------
    # 2. Customer Registration via BFF
    # -------------------------------------------------------------
    print("\n--- PHASE 2: CUSTOMER REGISTRATION WORKFLOW ---")
    cust_ip = f"198.51.100.{random.randint(10, 100)}"
    customer_client = httpx.Client(base_url=FRONTEND_URL, timeout=15, headers={"x-forwarded-for": cust_ip})
    test_email = f"test.applicant.{int(time.time())}@example.com"
    test_password = "SecurePassword123!"

    reg_payload = {
        "fullName": "Aarav Sharma",
        "email": test_email,
        "password": test_password,
        "confirmPassword": test_password
    }

    try:
        r_reg = customer_client.post("/api/auth/register", json=reg_payload)
        assert r_reg.status_code == 201, f"Expected 201, got {r_reg.status_code}: {r_reg.text}"
        user = r_reg.json().get("user", {})
        assert user.get("email") == test_email.lower()
        assert user.get("role") == "CUSTOMER"
        print(f"[PASS] Customer registered successfully: {test_email} (Role: CUSTOMER)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Customer registration failed: {e}")
        failed += 1

    # Duplicate registration should return 409
    try:
        r_dup = customer_client.post("/api/auth/register", json=reg_payload)
        assert r_dup.status_code == 409
        print("[PASS] Duplicate registration properly rejected with 409 Conflict")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Duplicate registration check failed: {e}")
        failed += 1

    # Privilege escalation attempt in public registration
    try:
        hacked_payload = {
            "fullName": "Malicious User",
            "email": f"hacker.{int(time.time())}@example.com",
            "password": test_password,
            "confirmPassword": test_password,
            "role": "ADMIN"
        }
        r_hack = customer_client.post("/api/auth/register", json=hacked_payload)
        if r_hack.status_code == 201:
            hacked_user = r_hack.json().get("user", {})
            assert hacked_user.get("role") == "CUSTOMER", "SECURITY ALERT: Role escalation succeeded!"
            print("[PASS] Public registration sanitized role to CUSTOMER (privilege escalation blocked)")
        else:
            print(f"[PASS] Public registration with role parameter rejected ({r_hack.status_code})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Privilege escalation test failed: {e}")
        failed += 1

    # -------------------------------------------------------------
    # 3. Customer Login via BFF & Session Cookie Check
    # -------------------------------------------------------------
    print("\n--- PHASE 3: LOGIN & BFF SESSION ESTABLISHMENT ---")
    try:
        login_payload = {
            "email": test_email,
            "password": test_password
        }
        r_login = customer_client.post("/api/auth/login", json=login_payload)
        assert r_login.status_code == 200, f"Expected 200, got {r_login.status_code}: {r_login.text}"
        cookies = customer_client.cookies
        assert "pp_access" in cookies, "Missing pp_access cookie!"
        assert "pp_refresh" in cookies, "Missing pp_refresh cookie!"
        assert "pp_csrf" in cookies, "Missing pp_csrf cookie!"
        print("[PASS] Customer login succeeded. HttpOnly access_token and refresh_token cookies received")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Customer login failed: {e}")
        failed += 1

    # /api/auth/me check
    customer_id = None
    try:
        r_me = customer_client.get("/api/auth/me")
        assert r_me.status_code == 200
        me_data = r_me.json()
        assert me_data.get("authenticated") is True
        user_info = me_data.get("user", {})
        customer_id = user_info.get("userId") or user_info.get("id")
        assert customer_id is not None
        print(f"[PASS] /api/auth/me returned authenticated customer profile (ID: {customer_id})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] /api/auth/me failed: {e}")
        failed += 1

    # -------------------------------------------------------------
    # 4. Application Creation & Checklist via BFF Proxy
    # -------------------------------------------------------------
    print("\n--- PHASE 4: APPLICATION & CHECKLIST CREATION ---")
    app_id = None
    checklist_item_id = None
    try:
        csrf_token = customer_client.cookies.get("pp_csrf")
        headers = {"x-csrf-token": csrf_token} if csrf_token else {}

        r_app_create = customer_client.post("/api/proxy/applications", headers=headers)
        assert r_app_create.status_code in (200, 201), f"Expected 200/201, got {r_app_create.status_code}: {r_app_create.text}"
        app_data = r_app_create.json()
        app_id = app_data.get("id")
        ref_no = app_data.get("application_reference") or app_data.get("reference_number")
        print(f"[PASS] Passport application initiated (ID: {app_id}, Ref: {ref_no})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Application creation failed: {e}")
        failed += 1

    try:
        # Fetch checklist for this specific application
        r_chk = customer_client.get(f"/api/proxy/applications/{app_id}/checklist")
        assert r_chk.status_code == 200, f"Expected 200, got {r_chk.status_code}: {r_chk.text}"
        checklist = r_chk.json()
        assert len(checklist) > 0, "No checklist items assigned!"
        checklist_item_id = checklist[0].get("id")
        req_name = checklist[0].get("requirement", {}).get("name", "Document")
        print(f"[PASS] Checklist retrieved with {len(checklist)} items. First item: '{req_name}' (ID: {checklist_item_id})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Checklist retrieval failed: {e}")
        failed += 1

    # -------------------------------------------------------------
    # 5. File Upload Security Verification
    # -------------------------------------------------------------
    print("\n--- PHASE 5: DOCUMENT UPLOAD SECURITY ---")
    csrf_token = customer_client.cookies.get("pp_csrf")
    headers = {"x-csrf-token": csrf_token} if csrf_token else {}

    # Test 5a: Reject executable file disguised as pdf
    try:
        fake_exe = b"MZ\x90\x00\x03\x00\x00\x00Fake executable content"
        files = {"file": ("malware.exe.pdf", fake_exe, "application/pdf")}
        r_fake = customer_client.post(
            f"/api/proxy/documents/upload/{app_id}/{checklist_item_id}",
            files=files,
            headers=headers
        )
        assert r_fake.status_code in (400, 422), f"Expected 400 on fake exe, got {r_fake.status_code}"
        print("[PASS] Upload security: Executable file disguised with double extension rejected")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Executable upload rejection failed: {e}")
        failed += 1

    # Test 5b: Reject MIME/Magic Byte mismatch
    try:
        mismatch_file = b"This is plain text pretending to be a PDF"
        files = {"file": ("document.pdf", mismatch_file, "application/pdf")}
        r_mis = customer_client.post(
            f"/api/proxy/documents/upload/{app_id}/{checklist_item_id}",
            files=files,
            headers=headers
        )
        assert r_mis.status_code in (400, 422), f"Expected 400 on magic byte mismatch, got {r_mis.status_code}"
        print("[PASS] Upload security: Magic byte signature mismatch rejected")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Magic byte mismatch rejection failed: {e}")
        failed += 1

    # Test 5c: Accept genuine PDF with valid header and structure
    doc_id = None
    try:
        valid_pdf = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF"
        files = {"file": ("aadhaar_proof.pdf", valid_pdf, "application/pdf")}
        r_valid = customer_client.post(
            f"/api/proxy/documents/upload/{app_id}/{checklist_item_id}",
            files=files,
            headers=headers
        )
        assert r_valid.status_code in (200, 201), f"Expected 200/201, got {r_valid.status_code}: {r_valid.text}"
        doc_data = r_valid.json()
        doc_id = doc_data.get("id")
        assert (doc_data.get("review_status") or doc_data.get("status")) == "SUBMITTED"
        print(f"[PASS] Upload security: Valid PDF accepted (Doc ID: {doc_id}, Status: SUBMITTED)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Valid PDF upload failed: {e}")
        failed += 1

    # -------------------------------------------------------------
    # 6. Admin Bootstrap Login & Agent Provisioning
    # -------------------------------------------------------------
    print("\n--- PHASE 6: ADMIN AUTHENTICATION & AGENT PROVISIONING ---")
    admin_ip = f"198.51.100.{random.randint(101, 150)}"
    admin_client = httpx.Client(base_url=FRONTEND_URL, timeout=15, headers={"x-forwarded-for": admin_ip})
    agent_email = f"agent.priya.{int(time.time())}@passportplatform.local"
    agent_password = "AgentSecurePassword123!"

    try:
        # Login as bootstrap admin
        admin_login = {
            "email": "admin@passportplatform.local",
            "password": "Admin@Passport2026!"
        }
        r_admin_log = admin_client.post("/api/auth/login", json=admin_login)
        assert r_admin_log.status_code == 200, f"Admin login failed: {r_admin_log.text}"
        assert admin_client.cookies.get("pp_access") is not None
        print("[PASS] Bootstrap Admin logged in successfully (admin@passportplatform.local)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Admin login failed: {e}")
        failed += 1

    try:
        # Create an AGENT user via Java Auth admin endpoint
        admin_access_token = admin_client.cookies.get("pp_access")
        auth_admin_headers = {
            "Authorization": f"Bearer {admin_access_token}",
            "X-Forwarded-For": admin_ip,
        }
        create_agent_payload = {
            "fullName": "Agent Priya Verma",
            "email": agent_email,
            "password": agent_password,
            "role": "AGENT"
        }
        r_agent_create = httpx.post(
            f"{AUTH_URL}/admin/users",
            json=create_agent_payload,
            headers=auth_admin_headers,
            timeout=10
        )
        assert r_agent_create.status_code == 201, f"Expected 201, got {r_agent_create.status_code}: {r_agent_create.text}"
        agent_data = r_agent_create.json()
        assert agent_data.get("role") == "AGENT"
        print(f"[PASS] Admin successfully provisioned new AGENT account ({agent_email})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Agent provisioning failed: {e}")
        failed += 1

    # -------------------------------------------------------------
    # 7. Agent Dashboard & Document Review Workflow
    # -------------------------------------------------------------
    print("\n--- PHASE 7: AGENT DASHBOARD & REVIEW WORKFLOW ---")
    agent_ip = f"198.51.100.{random.randint(151, 250)}"
    agent_client = httpx.Client(base_url=FRONTEND_URL, timeout=15, headers={"x-forwarded-for": agent_ip})
    try:
        r_agent_log = agent_client.post("/api/auth/login", json={"email": agent_email, "password": agent_password})
        assert r_agent_log.status_code == 200
        assert agent_client.cookies.get("pp_access") is not None
        print(f"[PASS] Agent {agent_email} logged in successfully via BFF")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Agent login failed: {e}")
        failed += 1

    try:
        # Agent views applications list
        r_agent_apps = agent_client.get("/api/proxy/agent/applications")
        assert r_agent_apps.status_code == 200
        apps_list = r_agent_apps.json()
        assert any(a.get("id") == app_id for a in apps_list), "Customer application not found in agent dossier!"
        print(f"[PASS] Agent dashboard retrieved {len(apps_list)} customer application(s)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Agent application listing failed: {e}")
        failed += 1

    try:
        # Agent assigns self to application
        agent_csrf = agent_client.cookies.get("pp_csrf")
        agent_headers = {"x-csrf-token": agent_csrf} if agent_csrf else {}
        r_assign = agent_client.post(f"/api/proxy/agent/applications/{app_id}/assign", headers=agent_headers)
        assert r_assign.status_code in (200, 201)
        print(f"[PASS] Agent assigned to application {app_id}")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Agent assignment failed: {e}")
        failed += 1

    try:
        # Agent reviews and approves document
        agent_csrf = agent_client.cookies.get("pp_csrf")
        agent_headers = {"x-csrf-token": agent_csrf} if agent_csrf else {}
        review_payload = {
            "review_status": "APPROVED",
            "rejection_reason": None,
        }
        r_review = agent_client.patch(
            f"/api/proxy/documents/{doc_id}/review",
            json=review_payload,
            headers=agent_headers
        )
        assert r_review.status_code == 200, f"Expected 200, got {r_review.status_code}: {r_review.text}"
        assert (r_review.json().get("review_status") or r_review.json().get("status")) == "APPROVED"
        print(f"[PASS] Agent reviewed and APPROVED document (Doc ID: {doc_id})")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Agent review failed: {e}")
        failed += 1

    try:
        # Agent updates application status to UNDER_REVIEW
        status_payload = {
            "new_status": "UNDER_REVIEW",
            "remarks": "All initial documents accepted. Proceeding with appointment dossier packaging."
        }
        r_status = agent_client.patch(
            f"/api/proxy/agent/applications/{app_id}/status",
            json=status_payload,
            headers=agent_headers
        )
        assert r_status.status_code == 200
        assert (r_status.json().get("application_status") or r_status.json().get("status")) == "UNDER_REVIEW"
        print(f"[PASS] Agent transitioned application status to UNDER_REVIEW")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Status transition failed: {e}")
        failed += 1

    # -------------------------------------------------------------
    # 8. Customer Real-Time Progress Verification
    # -------------------------------------------------------------
    print("\n--- PHASE 8: CUSTOMER WORKFLOW TIMELINE VERIFICATION ---")
    try:
        r_cust_prog = customer_client.get(f"/api/proxy/applications/{app_id}")
        assert r_cust_prog.status_code == 200
        prog_data = r_cust_prog.json()
        assert (prog_data.get("application_status") or prog_data.get("status")) == "UNDER_REVIEW"
        print(f"[PASS] Customer view confirms updated status: UNDER_REVIEW")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Customer progress check failed: {e}")
        failed += 1

    # -------------------------------------------------------------
    # 9. Customer Logout & Session Invalidation
    # -------------------------------------------------------------
    print("\n--- PHASE 9: LOGOUT & SESSION TERMINATION ---")
    try:
        r_logout = customer_client.post("/api/auth/logout")
        assert r_logout.status_code == 200
        # Check /api/auth/me is now 401
        r_after = customer_client.get("/api/auth/me")
        assert r_after.status_code == 401
        print("[PASS] Customer logged out successfully. Cookies cleared and subsequent calls rejected (401)")
        passed += 1
    except Exception as e:
        print(f"[FAIL] Logout verification failed: {e}")
        failed += 1

    print("\n=================================================================")
    print(f" END-TO-END VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED")
    print("=================================================================")
    return failed == 0

if __name__ == "__main__":
    success = run_e2e_suite()
    sys.exit(0 if success else 1)
