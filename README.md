# Alloy Account Application

A basic bank application form with a Node.js and Express backend.
The backend validates applicant information, submits it to Alloy's
sandbox, and displays Approved, Manual Review, or Denied.

## Requirements

- Node.js 24 or later
- Alloy sandbox workflow token and workflow secret

## Run locally

1. Download or clone this repository.
2. Open a terminal in the project folder.
3. Install dependencies:

   npm install

4. Create a file named .env in the project folder containing:

   ALLOY_WORKFLOW_TOKEN=your_token
   ALLOY_WORKFLOW_SECRET=your_secret

5. Start the server:

   node --env-file=.env server.js

6. Open http://127.0.0.1:3000 in your browser.

## Test the outcomes

Use made-up applicant information only.

- Last name Review: Manual Review
- Last name Deny: Denied
- An ordinary test surname: typically Approved

## Scope and limitations

This is a sandbox proof of concept. The approval message simulates
account creation; no real bank account is created.

The app does not persist applications in a database. Lookup,
document verification, webhooks, and an internal manual-review
interface are covered by the separate architecture recommendation,
not implemented here.

Credentials stay on the backend. The .env file is excluded from Git.
Never commit real credentials.