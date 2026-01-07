export interface Term {
  term: string;
  acronym: string;
  priority: string;
  definition: string;
}

export const termsData: Term[] = [
  {
    term: "Quote-to-Close",
    acronym: "QTC",
    priority: "Top Priority",
    definition: "Measures the percentage of quoted prospects that become closed customers."
  },
  {
    term: "CPL (Cost Per Lead)",
    acronym: "CPL",
    priority: "Top Priority",
    definition: "Measures the cost incurred to acquire a single lead or potential customer."
  },
  {
    term: "Click-to-Close",
    acronym: "CTC",
    priority: "Top Priority",
    definition: "Measures the effectiveness of ads by calculating the percentage of customers who close after clicking."
  },
  {
    term: "CPA (Cost Per Acquisition)",
    acronym: "CPA",
    priority: "Top Priority",
    definition: "Measures the cost to acquire each new customer during a specified period."
  },
  {
    term: "Geo/Zip Codes/Areas",
    acronym: "GEO",
    priority: "Top Priority",
    definition: "Geographic regions used for analyzing performance metrics like sales and leads."
  },
  {
    term: "Currently Insured",
    acronym: "CI",
    priority: "Top Priority",
    definition: "Leads reporting active insurance coverage, calculated as a percentage of total leads."
  },
  {
    term: "Core Target Group",
    acronym: "CTG",
    priority: "Top Priority",
    definition: "A specific segment of leads defined by set criteria for targeted marketing efforts."
  },
  {
    term: "Items/Cost Per Item",
    acronym: "IPC",
    priority: "Medium Priority",
    definition: "A list detailing individual item costs for pricing and budget management."
  },
  {
    term: "Conversion Pixel",
    acronym: "CP",
    priority: "Medium Priority",
    definition: "Tracks user actions on a website to measure the effectiveness of advertising campaigns."
  },
  {
    term: "Day-Part Schedule",
    acronym: "DP",
    priority: "Medium Priority",
    definition: "Organizes activities or tasks by specific time segments throughout the day."
  },
  {
    term: "Premium Per Household",
    acronym: "PPH",
    priority: "Medium Priority",
    definition: "The average cost charged to each household for a service or product."
  },
  {
    term: "Ad Units / Ad Creative",
    acronym: "AU/AC",
    priority: "Medium Priority",
    definition: "Components used for advertising placement; ad creatives are the visuals and messaging within those units."
  },
  {
    term: "Lead Line",
    acronym: "LL",
    priority: "Medium Priority",
    definition: "A preliminary statement that captures attention and encourages further interest or action."
  },
  {
    term: "CRM (Customer Relationship Management)",
    acronym: "CRM",
    priority: "Medium Priority",
    definition: "A system for managing a company's interactions with current and potential customers."
  },
  {
    term: "Channel ID (or Advertiser ID)",
    acronym: "CID",
    priority: "Medium Priority",
    definition: "A unique identifier for a specific advertising channel or advertiser in marketing platforms."
  },
  {
    term: "Ad Groups",
    acronym: "AG",
    priority: "Medium Priority",
    definition: "Collections of ads that share the same targeting settings and budget within a campaign."
  },
  {
    term: "IVR (Interactive Voice Response)",
    acronym: "IVR",
    priority: "Medium Priority",
    definition: "Allows users to interact with a phone system through voice or keypad inputs."
  },
  {
    term: "Base Bid",
    acronym: "BB",
    priority: "Medium Priority",
    definition: "The initial offer made by a contractor to complete a project."
  },
  {
    term: "Ricochet & CopperSt",
    acronym: "R&C",
    priority: "Medium Priority",
    definition: "A project or collaboration involving these two entities."
  },
  {
    term: "LMS (Lead Management System)",
    acronym: "LMS",
    priority: "Medium Priority",
    definition: "Organizes and tracks potential customers through the sales process."
  },
  {
    term: "Sales Rate",
    acronym: "SR",
    priority: "Medium Priority",
    definition: "Measures conversion efficiency from leads to sales or quotes to policies."
  },
  {
    term: "Multi-car",
    acronym: "MCA",
    priority: "Medium Priority",
    definition: "Insurance policies covering two or more vehicles."
  },
  {
    term: "Bid Modifiers",
    acronym: "BM",
    priority: "Medium Priority",
    definition: "Adjust bids based on specific criteria, influencing key performance indicators."
  },
  {
    term: "SR22",
    acronym: "SR22",
    priority: "Medium Priority",
    definition: "A certification proving a driver has met insurance requirements after certain violations."
  },
  {
    term: "Homeowner",
    acronym: "HO",
    priority: "Medium Priority",
    definition: "A customer who owns their residence, influencing market penetration calculations."
  },
  {
    term: "Credit Indicator",
    acronym: "CI",
    priority: "Medium Priority",
    definition: "Tracks the percentage of quotes across different credit bands."
  },
  {
    term: "DUIs",
    acronym: "DUI",
    priority: "Low Priority",
    definition: "Driving under the influence of alcohol or drugs, leading to legal penalties."
  },
  {
    term: "Captive Agent",
    acronym: "CA",
    priority: "Low Priority",
    definition: "A representative tied to a single company, distinguishing from independent agents."
  },
  {
    term: "Continuous Coverage",
    acronym: "CC",
    priority: "Low Priority",
    definition: "Leads without any lapse in coverage, influencing underwriting and pricing decisions."
  },
  {
    term: "Independent Broker/Agent",
    acronym: "IBA",
    priority: "Low Priority",
    definition: "Segments production and performance by channel, distinguishing independent from captive and direct channels."
  },
  {
    term: "ABO",
    acronym: "ABO",
    priority: "Other",
    definition: "Minimum required items for agents to maintain their job; missing can lead to contract loss."
  },
  {
    term: "Telemarketing Companies",
    acronym: "TC",
    priority: "Other",
    definition: "Third parties hired to contact potential customers on behalf of agencies."
  },
  {
    term: "VC",
    acronym: "VC",
    priority: "Other",
    definition: "The minimum number of items an Allstate agent must sell for higher commission eligibility."
  },
  {
    term: "Bound/ Household bound",
    acronym: "HB",
    priority: "Other",
    definition: "A term for 'sale,' aggregating multiple policies per household for data analysis."
  }
];

export const priorityOrder = ["Top Priority", "Medium Priority", "Low Priority", "Other"];

export const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
  "Top Priority": {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200"
  },
  "Medium Priority": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200"
  },
  "Low Priority": {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200"
  },
  "Other": {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200"
  }
};
