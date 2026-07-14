# TwinsDay Restaurant Backend

## Setup
```bash
cd Backend
npm install
npm start
```

## Auth APIs

### Register
`POST /api/v1/auth/register`

```json
{
  "fullName": "John Doe",
  "companyName": "STV Billing",
  "phone": "9876543210",
  "email": "john@example.com",
  "password": "Password@1",
  "confirmPassword": "Password@1"
}
```

### Login
`POST /api/v1/auth/login`

```json
{
  "loginId": "john@example.com",
  "password": "Password@1"
}
```

Or with phone:

```json
{
  "loginId": "9876543210",
  "password": "Password@1"
}
```
