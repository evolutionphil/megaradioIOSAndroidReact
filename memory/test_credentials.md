# MegaRadio Test Credentials

## Apple Review Test Account
- Email: review@themegaradio.com
- Password: MegaReview2026!
- Note: Must be created on production backend before App Store submission

## Backend Developer Test Account
- Email: testuser2026@megaradio.test
- Password: TestPass2026!

## API Details
- Base URL: https://themegaradio.com
- API Key Header: X-API-Key: mr_VUzdIUHuXaagvWUC208Vzi_3lqEV1Vzw
- Signup fields: fullName, username, email, password
- Login endpoint: POST /api/auth/mobile/login (returns token)
- Delete account: DELETE /api/user/delete-account (requires Bearer token)

## Signup field mapping
- Frontend sends: fullName (from name input) + username (auto-generated from email)
- Backend requires: fullName, username, email, password
