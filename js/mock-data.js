/**
 * LALA Bridge — Mock Data
 * 
 * This file simulates a backend database for the MVP.
 * In production, these would be replaced with API calls to a real backend.
 * 
 * IMPORTANT: The verificationCodes array simulates the spreadsheet
 * with all Lalíder codes. Replace this with a real database lookup later.
 */

const MockDB = {
  /**
   * Lalíder Verification Codes Database
   * Format: { code, name, camp, country, verified }
   * 
   * In production, this would be an API call to validate against
   * the real spreadsheet/database of Lalíder codes.
   */
  verificationCodes: [
    { code: "LALA-VLB32-001", name: "María González", camp: "VLB32", country: "Mexico", used: false },
    { code: "LALA-VLB32-002", name: "Carlos Mendoza", camp: "VLB32", country: "Colombia", used: false },
    { code: "LALA-VLB32-003", name: "Ana Beatriz Silva", camp: "VLB32", country: "Brazil", used: false },
    { code: "LALA-VLB32-004", name: "Diego Ramírez", camp: "VLB32", country: "Peru", used: false },
    { code: "LALA-BLB10-001", name: "Valentina Torres", camp: "BLB10", country: "Argentina", used: false },
    { code: "LALA-BLB10-002", name: "Lucas Fernández", camp: "BLB10", country: "Chile", used: false },
    { code: "LALA-BLB10-003", name: "Isabella Rojas", camp: "BLB10", country: "Ecuador", used: false },
    { code: "LALA-BLB10-004", name: "Santiago Herrera", camp: "BLB10", country: "Bolivia", used: false },
    { code: "LALA-VLB31-001", name: "Camila Vargas", camp: "VLB31", country: "Venezuela", used: false },
    { code: "LALA-VLB31-002", name: "Mateo Jiménez", camp: "VLB31", country: "Paraguay", used: false },
    { code: "LALA-BLB09-001", name: "Lucía Castillo", camp: "BLB09", country: "Guatemala", used: false },
    { code: "LALA-BLB09-002", name: "Andrés Morales", camp: "BLB09", country: "Honduras", used: false },
  ],

  /**
   * Camp options — VLB (Virtual) and BLB (In-person/Blended)
   */
  camps: [
    "VLB32", "VLB31", "VLB30", "VLB29", "VLB28", "VLB27", "VLB26", "VLB25",
    "VLB24", "VLB23", "VLB22", "VLB21", "VLB20", "VLB19", "VLB18", "VLB17",
    "VLB16", "VLB15", "VLB14", "VLB13", "VLB12", "VLB11", "VLB10",
    "BLB10", "BLB09", "BLB08", "BLB07", "BLB06", "BLB05", "BLB04", "BLB03", "BLB02", "BLB01"
  ],

  /**
   * Latin American countries
   */
  countries: [
    "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Costa Rica",
    "Cuba", "Dominican Republic", "Ecuador", "El Salvador", "Guatemala",
    "Haiti", "Honduras", "Mexico", "Nicaragua", "Panama", "Paraguay",
    "Peru", "Uruguay", "Venezuela"
  ],

  /**
   * Areas of interest
   */
  areasOfInterest: [
    "Technology & Software Development",
    "Business & Entrepreneurship",
    "Education & Teaching",
    "Healthcare & Medicine",
    "Environmental Science & Sustainability",
    "Social Impact & NGOs",
    "Arts & Design",
    "Engineering",
    "Law & Public Policy",
    "Data Science & AI",
    "Communications & Marketing",
    "Finance & Economics"
  ],

  /**
   * Equipment categories for donations
   */
  equipmentCategories: [
    { id: "laptop", name: "Laptop / Notebook", icon: "💻", description: "Laptops, notebooks, and Chromebooks" },
    { id: "phone", name: "Smartphone", icon: "📱", description: "Smartphones and tablets" },
    { id: "headphones", name: "Headphones / Audio", icon: "🎧", description: "Headphones, earbuds, microphones" },
    { id: "monitor", name: "Monitor / Display", icon: "🖥️", description: "External monitors and displays" },
    { id: "peripherals", name: "Peripherals", icon: "⌨️", description: "Keyboards, mice, webcams" },
    { id: "books", name: "Books / Learning Materials", icon: "📚", description: "Textbooks, courses, subscriptions" },
    { id: "other", name: "Other", icon: "📦", description: "Any other study/work equipment" }
  ],

  /**
   * Equipment conditions
   */
  conditions: [
    { id: "new", label: "Brand New", description: "Never used, still in packaging" },
    { id: "like-new", label: "Like New", description: "Barely used, excellent condition" },
    { id: "good", label: "Good", description: "Used but well-maintained, fully functional" },
    { id: "fair", label: "Fair", description: "Shows wear but works properly" }
  ],

  /**
   * Sample donations for demo
   */
  sampleDonations: [
    {
      id: "don-001",
      donorId: "donor-001",
      donorName: "Tech Corp Foundation",
      category: "laptop",
      title: "Dell Inspiron 15 — 8GB RAM, 256GB SSD",
      description: "Gently used Dell laptop, perfect for programming and studying. Comes with charger. Windows 11 installed.",
      condition: "good",
      country: "United States",
      status: "available",
      createdAt: "2026-09-15T10:00:00Z",
      image: null
    },
    {
      id: "don-002",
      donorId: "donor-002",
      donorName: "Sarah Mitchell",
      category: "phone",
      title: "iPhone 13 — 128GB, Unlocked",
      description: "Upgrading to a new phone. This one is in great condition, battery health at 89%. Includes case and charger.",
      condition: "like-new",
      country: "Canada",
      status: "available",
      createdAt: "2026-09-18T14:30:00Z",
      image: null
    },
    {
      id: "don-003",
      donorId: "donor-003",
      donorName: "EduTech Brasil",
      category: "headphones",
      title: "Sony WH-1000XM4 — Noise Cancelling",
      description: "Professional-grade noise cancelling headphones. Perfect for online classes and focused study sessions.",
      condition: "like-new",
      country: "Brazil",
      status: "matched",
      matchedTo: "LALA-VLB32-003",
      createdAt: "2026-09-10T09:00:00Z",
      image: null
    },
    {
      id: "don-004",
      donorId: "donor-001",
      donorName: "Tech Corp Foundation",
      category: "laptop",
      title: "MacBook Air M1 — 8GB RAM, 256GB SSD",
      description: "Company-refurbished MacBook Air. Excellent for design, programming, and content creation.",
      condition: "good",
      country: "United States",
      status: "available",
      createdAt: "2026-09-20T16:00:00Z",
      image: null
    },
    {
      id: "don-005",
      donorId: "donor-004",
      donorName: "Carlos Vega Alumni",
      category: "books",
      title: "Complete Web Development Book Set (5 books)",
      description: "Includes: HTML & CSS, JavaScript, React, Node.js, and System Design books. All in English.",
      condition: "good",
      country: "Mexico",
      status: "available",
      createdAt: "2026-09-19T11:00:00Z",
      image: null
    },
    {
      id: "don-006",
      donorId: "donor-005",
      donorName: "Anonymous Donor",
      category: "monitor",
      title: 'LG 24" IPS Monitor — Full HD',
      description: "External monitor perfect for dual-screen setup. Includes HDMI cable.",
      condition: "fair",
      country: "Colombia",
      status: "available",
      createdAt: "2026-09-21T08:00:00Z",
      image: null
    }
  ],

  /**
   * Sample Lalíder needs/requests
   */
  sampleNeeds: [
    {
      id: "need-001",
      laliderId: "LALA-VLB32-001",
      laliderName: "María G.",
      camp: "VLB32",
      country: "Mexico",
      category: "laptop",
      title: "Need a laptop for software engineering studies",
      description: "I'm starting a computer science program and need a laptop capable of running IDEs and virtual machines. Any working laptop with at least 4GB RAM would change my life.",
      urgency: "high",
      status: "open",
      createdAt: "2026-09-16T12:00:00Z"
    },
    {
      id: "need-002",
      laliderId: "LALA-BLB10-001",
      laliderName: "Valentina T.",
      camp: "BLB10",
      country: "Argentina",
      category: "phone",
      title: "Smartphone for remote internship",
      description: "I got accepted into a remote internship but need a smartphone with a good camera for video calls. My current phone barely works.",
      urgency: "medium",
      status: "open",
      createdAt: "2026-09-17T15:00:00Z"
    },
    {
      id: "need-003",
      laliderId: "LALA-VLB32-002",
      laliderName: "Carlos M.",
      camp: "VLB32",
      country: "Colombia",
      category: "headphones",
      title: "Headphones for online classes",
      description: "I share a small apartment with my family and noise-cancelling headphones would help me concentrate during online lectures.",
      urgency: "low",
      status: "open",
      createdAt: "2026-09-18T10:00:00Z"
    },
    {
      id: "need-004",
      laliderId: "LALA-BLB10-003",
      laliderName: "Isabella R.",
      camp: "BLB10",
      country: "Ecuador",
      category: "laptop",
      title: "Laptop for data science coursework",
      description: "I'm passionate about data science and AI but my family can't afford a laptop. Even a used one would be incredible for running Python and Jupyter notebooks.",
      urgency: "high",
      status: "open",
      createdAt: "2026-09-19T09:30:00Z"
    }
  ]
};

/**
 * Verify a Lalíder code against the mock database
 * @param {string} code - The verification code to check
 * @param {string} name - The name provided by the user
 * @returns {{ valid: boolean, message: string, data?: object }}
 */
function verifyLaliderCode(code, name) {
  const entry = MockDB.verificationCodes.find(
    (v) => v.code.toUpperCase() === code.toUpperCase()
  );

  if (!entry) {
    return {
      valid: false,
      message: "Invalid verification code. Please check your Lalíder ID and try again."
    };
  }

  if (entry.used) {
    return {
      valid: false,
      message: "This verification code has already been used to create an account."
    };
  }

  // In a real system, you'd also validate the name matches
  // For the MVP, we just check the code exists and isn't used
  return {
    valid: true,
    message: "Code verified successfully! Welcome, Lalíder! 🎉",
    data: {
      code: entry.code,
      camp: entry.camp,
      country: entry.country,
      registeredName: entry.name
    }
  };
}

/**
 * Mark a verification code as used
 * @param {string} code - The code to mark as used
 */
function markCodeAsUsed(code) {
  const entry = MockDB.verificationCodes.find(
    (v) => v.code.toUpperCase() === code.toUpperCase()
  );
  if (entry) {
    entry.used = true;
  }
}

// Make available globally
window.MockDB = MockDB;
window.verifyLaliderCode = verifyLaliderCode;
window.markCodeAsUsed = markCodeAsUsed;
