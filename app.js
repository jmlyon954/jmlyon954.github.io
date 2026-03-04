const riskRules = {
  Landscaping: "Low",
  Janitorial: "Low",
  Security: "Medium",
  "HVAC / Plumbing": "Medium",
  "Elevator Maintenance": "High",
  "Snow Removal": "High",
  "Roofing / Structural": "High",
  "General Contractor": "High",
};

const insuranceRequirements = {
  Low: {
    generalLiability: 1000000,
    autoLiability: 500000,
    workersComp: true,
    umbrella: 0,
  },
  Medium: {
    generalLiability: 1000000,
    autoLiability: 1000000,
    workersComp: true,
    umbrella: 1000000,
  },
  High: {
    generalLiability: 2000000,
    autoLiability: 1000000,
    workersComp: true,
    umbrella: 2000000,
  },
};

const dashboard = [];
let activeVendor = null;

const elements = {
  vendorForm: document.getElementById("vendor-form"),
  serviceType: document.getElementById("serviceType"),
  riskOutput: document.getElementById("risk-output"),
  requirementsPanel: document.getElementById("requirements-panel"),
  requirementsOutput: document.getElementById("requirements-output"),
  coiSample: document.getElementById("coi-sample"),
  initialEmailPanel: document.getElementById("initial-email-panel"),
  initialEmail: document.getElementById("initial-email"),
  analyzerPanel: document.getElementById("analyzer-panel"),
  coiForm: document.getElementById("coi-form"),
  analysisOutput: document.getElementById("analysis-output"),
  statusEmailPanel: document.getElementById("status-email-panel"),
  statusEmail: document.getElementById("status-email"),
  dashboardBody: document.getElementById("dashboard-body"),
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

function getRequirementsSummary(req) {
  return [
    `General Liability: ${formatMoney(req.generalLiability)}`,
    `Auto Liability: ${formatMoney(req.autoLiability)}`,
    `Workers' Compensation: ${req.workersComp ? "Required" : "Not Required"}`,
    `Umbrella: ${formatMoney(req.umbrella)}`,
  ].join("\n");
}

function buildInitialEmail(vendor, req) {
  return `To: ${vendor.email}
Subject: Initial Certificate of Insurance (COI) Request - ${vendor.name}

Hello ${vendor.name},

As part of onboarding, please provide your current Certificate of Insurance (COI) for your ${vendor.serviceType} services.

Required minimum coverages:
${getRequirementsSummary(req)}

Please include ${vendor.propertyName || "our managed property"} as certificate holder and additional insured where applicable.

Kindly send your COI within 5 business days.

Thank you,
Property Management Compliance Team`;
}

function buildCOISample(vendor, req) {
  return `COI SAMPLE
Insured: ${vendor.name}
Service Type: ${vendor.serviceType}
Risk Level: ${vendor.riskLevel}

Coverage Limits (Minimum):
- General Liability: ${formatMoney(req.generalLiability)} each occurrence
- Auto Liability: ${formatMoney(req.autoLiability)} combined single limit
- Workers' Compensation: ${req.workersComp ? "Included" : "Not Required"}
- Umbrella Liability: ${formatMoney(req.umbrella)}

Certificate Holder:
Acme Property Management
123 Main Street
Anytown, USA`;
}

function analyzeCOI(submitted, req) {
  const deficiencies = [];

  if (submitted.generalLiability < req.generalLiability) {
    deficiencies.push(
      `General Liability is ${formatMoney(submitted.generalLiability)} but minimum is ${formatMoney(req.generalLiability)}.`
    );
  }
  if (submitted.autoLiability < req.autoLiability) {
    deficiencies.push(
      `Auto Liability is ${formatMoney(submitted.autoLiability)} but minimum is ${formatMoney(req.autoLiability)}.`
    );
  }
  if (req.workersComp && !submitted.workersComp) {
    deficiencies.push("Workers' Compensation is missing.");
  }
  if (submitted.umbrella < req.umbrella) {
    deficiencies.push(`Umbrella is ${formatMoney(submitted.umbrella)} but minimum is ${formatMoney(req.umbrella)}.`);
  }

  const expirationDate = new Date(submitted.expiration);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expirationDate <= today) {
    deficiencies.push("Policy expiration date is not current.");
  }

  return {
    status: deficiencies.length === 0 ? "Compliant" : "Deficient",
    deficiencies,
  };
}

function buildStatusEmail(vendor, result) {
  if (result.status === "Compliant") {
    return `To: ${vendor.email}
Subject: COI Compliance Confirmed - ${vendor.name}

Hello ${vendor.name},

Thank you for submitting your Certificate of Insurance.
Your COI has been reviewed and is compliant with our insurance requirements.

No further action is required at this time.

Regards,
Property Management Compliance Team`;
  }

  return `To: ${vendor.email}
Subject: COI Deficiencies - Action Required - ${vendor.name}

Hello ${vendor.name},

We reviewed your submitted COI and found the following deficiencies:
- ${result.deficiencies.join("\n- ")}

Please submit an updated COI within 3 business days.

Regards,
Property Management Compliance Team`;
}

function renderDashboard() {
  elements.dashboardBody.innerHTML = "";

  for (const vendor of dashboard) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${vendor.name}</td>
      <td>${vendor.serviceType}</td>
      <td>${vendor.riskLevel}</td>
      <td>${vendor.status || "Pending COI"}</td>
      <td>${vendor.expiration || "-"}</td>
      <td>${vendor.deficiencies?.length ? vendor.deficiencies.join("; ") : "-"}</td>
    `;
    elements.dashboardBody.appendChild(tr);
  }
}

elements.vendorForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const vendor = {
    name: document.getElementById("vendorName").value.trim(),
    serviceType: elements.serviceType.value,
    email: document.getElementById("vendorEmail").value.trim(),
  };

  vendor.riskLevel = riskRules[vendor.serviceType] || "Medium";
  const req = insuranceRequirements[vendor.riskLevel];

  activeVendor = {
    ...vendor,
    requirements: req,
    status: "Pending COI",
    deficiencies: [],
  };

  dashboard.push(activeVendor);
  renderDashboard();

  elements.riskOutput.classList.remove("hidden");
  elements.riskOutput.textContent = `${vendor.name} classified as ${vendor.riskLevel} risk (${vendor.serviceType}).`;

  elements.requirementsPanel.classList.remove("hidden");
  elements.requirementsOutput.textContent = getRequirementsSummary(req);
  elements.coiSample.textContent = buildCOISample(activeVendor, req);

  elements.initialEmailPanel.classList.remove("hidden");
  elements.initialEmail.value = buildInitialEmail(activeVendor, req);

  elements.analyzerPanel.classList.remove("hidden");
  elements.analysisOutput.classList.add("hidden");

  elements.statusEmailPanel.classList.remove("hidden");
  elements.statusEmail.value = "COI analysis pending.";

  elements.vendorForm.reset();
});

elements.coiForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!activeVendor) {
    return;
  }

  const submitted = {
    generalLiability: Number(document.getElementById("glOccurrence").value),
    autoLiability: Number(document.getElementById("autoLiability").value),
    workersComp: document.getElementById("workersComp").value === "yes",
    umbrella: Number(document.getElementById("umbrella").value),
    expiration: document.getElementById("expiration").value,
  };

  const result = analyzeCOI(submitted, activeVendor.requirements);
  activeVendor.status = result.status;
  activeVendor.deficiencies = result.deficiencies;
  activeVendor.expiration = submitted.expiration;

  renderDashboard();

  elements.analysisOutput.classList.remove("hidden", "success", "warning");
  elements.analysisOutput.classList.add(result.status === "Compliant" ? "success" : "warning");
  elements.analysisOutput.textContent =
    result.status === "Compliant"
      ? "COI meets all requirements."
      : `COI is deficient:\n- ${result.deficiencies.join("\n- ")}`;

  elements.statusEmail.value = buildStatusEmail(activeVendor, result);
});
