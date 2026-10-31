const express = require("express");
const app = express();
const alloyToken = process.env.ALLOY_WORKFLOW_TOKEN;
const alloySecret = process.env.ALLOY_WORKFLOW_SECRET;

if (!alloyToken || !alloySecret) {
  console.error("Missing Alloy credentials. Check your .env file.");
  process.exit(1);
}

console.log("Alloy credentials loaded.");

app.use(express.json());

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

app.post("/api/apply", async function (req, res) {
  const applicant = req.body;

  // Make sure we received an object containing application information.
  if (
    !applicant ||
    typeof applicant !== "object" ||
    Array.isArray(applicant)
  ) {
    return res.status(400).json({
      message: "Please submit your application information."
    });
  }

  // These fields must contain text and cannot be blank.
  // Address line 2 is optional.
  const requiredFields = [
    ["first_name", "First name"],
    ["last_name", "Last name"],
    ["email", "Email address"],
    ["phone", "Phone number"],
    ["date_of_birth", "Date of birth"],
    ["ssn", "Social Security number"],
    ["address_line_1", "Street address"],
    ["city", "City"],
    ["state", "State"],
    ["zip", "ZIP code"],
    ["country", "Country"]
  ];

  for (const [field, label] of requiredFields) {
    if (
      typeof applicant[field] !== "string" ||
      applicant[field].trim() === ""
    ) {
      return res.status(400).json({
        message: `${label} is required.`
      });
    }

    applicant[field] = applicant[field].trim();
  }

  // Check the optional address field if it was provided.
  if (
    applicant.address_line_2 !== undefined &&
    typeof applicant.address_line_2 !== "string"
  ) {
    return res.status(400).json({
      message: "Apartment or suite must be text."
    });
  }

  // State: exactly two uppercase letters.
  if (!/^[A-Z]{2}$/.test(applicant.state)) {
    return res.status(400).json({
      message: "Please enter a two-letter uppercase state code, such as NY."
    });
  }

  // Country: US only.
  if (applicant.country !== "US") {
    return res.status(400).json({
      message: "Country must be US."
    });
  }

  // SSN: exactly nine digits, without dashes.
  if (!/^[0-9]{9}$/.test(applicant.ssn)) {
    return res.status(400).json({
      message: "Please enter a 9-digit SSN with no dashes."
    });
  }

  // Date of birth: YYYY-MM-DD format.
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(applicant.date_of_birth)) {
    return res.status(400).json({
      message: "Please enter your date of birth in YYYY-MM-DD format."
    });
  }

  // Date of birth: must be a real date and cannot be in the future.
  const birthDate = new Date(
    applicant.date_of_birth + "T00:00:00.000Z"
  );
  const today = new Date().toISOString().slice(0, 10);

  if (
    Number.isNaN(birthDate.getTime()) ||
    birthDate.toISOString().slice(0, 10) !== applicant.date_of_birth ||
    applicant.date_of_birth > today
  ) {
    return res.status(400).json({
      message: "Please enter a valid date of birth that is not in the future."
    });
  }

  // ZIP: five digits for this basic US application.
  if (!/^[0-9]{5}$/.test(applicant.zip)) {
    return res.status(400).json({
      message: "Please enter a 5-digit ZIP code."
    });
  }

  // Email: basic format check.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicant.email)) {
    return res.status(400).json({
      message: "Please enter a valid email address."
    });
  }

  // Phone: allow common formatting characters.
  if (!/^\+?[0-9()\s.-]+$/.test(applicant.phone)) {
    return res.status(400).json({
      message: "Please enter a valid US phone number."
    });
  }

  // Accept 10 digits, or 11 digits beginning with country code 1.
  const phoneDigits = applicant.phone.replace(/[^0-9]/g, "");

  if (
    phoneDigits.length !== 10 &&
    !(phoneDigits.length === 11 && phoneDigits.startsWith("1"))
  ) {
    return res.status(400).json({
      message: "Please enter a 10-digit US phone number, optionally prefixed with 1."
    });
  }

  // All checks passed. Alloy is not connected yet.
const alloyApplicant = {
  name_first: applicant.first_name,
  name_last: applicant.last_name,
  email_address: applicant.email,
  phone_number: applicant.phone.replace(/[^0-9]/g, ""),
  birth_date: applicant.date_of_birth,
  document_ssn: applicant.ssn,
  address_line_1: applicant.address_line_1,
  address_line_2: applicant.address_line_2 || "",
  address_city: applicant.city,
  address_state: applicant.state,
  address_postal_code: applicant.zip,
  address_country_code: applicant.country
};  

try {
  const authorization = Buffer.from(
    alloyToken + ":" + alloySecret
  ).toString("base64");

  const alloyResponse = await fetch(
    "https://sandbox.alloy.co/v1/evaluations/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + authorization
      },
      body: JSON.stringify(alloyApplicant),
      signal: AbortSignal.timeout(15000)
    }
  );

  if (!alloyResponse.ok) {
    return res.status(502).json({
      message: "We couldn't complete the evaluation. Please contact support."
    });
  }

  const alloyData = await alloyResponse.json();
  const outcome = alloyData.summary?.outcome;

  const messages = {
    "Approved": "Your account has been successfully created.",
    "Manual Review":
      "We've received your application. Our team will follow up.",
    "Denied": "Your application was not successful."
  };

  if (!Object.hasOwn(messages, outcome)) {
    return res.status(502).json({
      message: "We received an unexpected evaluation result. Please contact support."
    });
  }

  return res.json({
    outcome: outcome,
    message: messages[outcome]
  });
} catch (error) {
  return res.status(502).json({
    message:
      "We couldn't confirm the evaluation result. This is not a denial. Please contact support before submitting again."
  });
}

}); // Closes the app.post handler

app.listen(3000, "127.0.0.1", function () {
  console.log("Server running at http://127.0.0.1:3000");
});