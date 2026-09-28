import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  source: "jsearch";
  company: string;
  title: string;
  location: string;
  workplaceType: string;
  employmentType: string;
  description: string;
  postedAt: string;
  applyUrl: string;
  jobUrl: string;
};

type ApplyOption = {
  publisher?: string;
  apply_link?: string;
  is_direct?: boolean;
};

// Job aggregators / intermediary websites.
// Apply Now should not send the user to these websites.
const BLOCKED_DOMAINS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "adzuna.com",
  "adzuna.in",
  "jobvetta.com",
  "ziprecruiter.com",
  "monster.com",
  "monsterindia.com",
  "foundit.in",
  "careerbuilder.com",
  "simplyhired.com",
  "simplyhired.co.in",
  "talent.com",
  "jooble.org",
  "apna.co",
  "shine.com",
  "naukri.com",
  "jobleads.com",
  "mployee.me",
  "topgenaijobs.com",
];

function getHostname(url = "") {
  try {
    return new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlockedUrl(url = "") {
  const hostname = getHostname(url);

  if (!hostname) return true;

  return BLOCKED_DOMAINS.some(
    (blocked) =>
      hostname === blocked ||
      hostname.endsWith(`.${blocked}`)
  );
}

function isSafeApplyUrl(url = "") {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    if (
      parsed.protocol !== "https:" &&
      parsed.protocol !== "http:"
    ) {
      return false;
    }

    return !isBlockedUrl(url);
  } catch {
    return false;
  }
}

function chooseApplyUrl(job: any): string {
  const options: ApplyOption[] =
    Array.isArray(job?.apply_options)
      ? job.apply_options
      : [];

  // First preference: JSearch marks it direct.
  const directOption = options.find(
    (option) =>
      option?.is_direct === true &&
      isSafeApplyUrl(option?.apply_link || "")
  );

  if (directOption?.apply_link) {
    return directOption.apply_link;
  }

  // Second preference: company/ATS URL even if
  // JSearch has not marked is_direct=true.
  const safeOption = options.find((option) =>
    isSafeApplyUrl(option?.apply_link || "")
  );

  if (safeOption?.apply_link) {
    return safeOption.apply_link;
  }

  // Finally check main apply URL.
  if (isSafeApplyUrl(job?.job_apply_link || "")) {
    return job.job_apply_link;
  }

  return "";
}

function buildLocation(job: any) {
  if (job?.job_location) {
    return String(job.job_location);
  }

  const parts = [
    job?.job_city,
    job?.job_state,
    job?.job_country,
  ]
    .filter(Boolean)
    .map(String);

  return [...new Set(parts)].join(", ");
}

function normalizeEmploymentType(value = "") {
  const normalized = value.toUpperCase();

  if (normalized.includes("FULL")) return "Full-time";
  if (normalized.includes("PART")) return "Part-time";
  if (normalized.includes("CONTRACT")) return "Contract";
  if (normalized.includes("INTERN")) return "Internship";

  return value;
}

function makeSearchQuery(
  role: string,
  location: string
) {
  const cleanRole = role.trim();
  const cleanLocation = location.trim();

  if (cleanRole && cleanLocation) {
    return `${cleanRole} in ${cleanLocation}`;
  }

  if (cleanRole) {
    return `${cleanRole} in India`;
  }

  if (cleanLocation) {
    return `jobs in ${cleanLocation}`;
  }

  return "jobs in India";
}

async function fetchJSearch(
  searchQuery: string,
  cursor?: string
) {
  const apiKey = process.env.RAPIDAPI_KEY;

  if (!apiKey) {
    throw new Error(
      "RAPIDAPI_KEY is missing. Add it to .env.local and restart the server."
    );
  }

  const params = new URLSearchParams({
    query: searchQuery,
    country: "in",
    num_pages: "1",
    date_posted: "all",
    work_from_home: "false",
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  // IMPORTANT:
  // Current JSearch v5 endpoint from your RapidAPI playground.
  const response = await fetch(
    `https://jsearch.p.rapidapi.com/search-v2?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "JSearch API Error:",
      response.status,
      errorText
    );

    throw new Error(
      `JSearch API returned ${response.status}`
    );
  }

  const json = await response.json();

  // JSearch v5:
  // data.jobs = job results
  return {
    jobs: Array.isArray(json?.data?.jobs)
      ? json.data.jobs
      : [],

    cursor:
      typeof json?.data?.cursor === "string"
        ? json.data.cursor
        : "",
  };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;

    const query =
      (sp.get("query") || "").trim();

    const location =
      (sp.get("location") || "").trim();

    const cursor =
      (sp.get("cursor") || "").trim();

    const searchQuery = makeSearchQuery(
      query,
      location
    );

    console.log(
      "VRoom AI JSearch:",
      searchQuery
    );

    const result = await fetchJSearch(
      searchQuery,
      cursor || undefined
    );

    let jobs: Job[] = result.jobs
      .map((raw: any): Job | null => {
        const applyUrl =
          chooseApplyUrl(raw);

        // Don't show jobs that only have blocked
        // aggregator application links.
        if (!applyUrl) {
          return null;
        }

        const locationText =
          buildLocation(raw);

        return {
          id:
            raw.job_id ||
            raw.job_uid ||
            `${raw.employer_name}-${raw.job_title}`,

          source: "jsearch",

          company:
            raw.employer_name ||
            "Unknown company",

          title:
            raw.job_title ||
            "Untitled role",

          location:
            locationText ||
            (raw.job_is_remote
              ? "Remote"
              : ""),

          workplaceType:
            raw.job_is_remote
              ? "Remote"
              : "On-site / Hybrid",

          employmentType:
            normalizeEmploymentType(
              raw.job_employment_type || ""
            ),

          description:
            raw.job_description || "",

          postedAt:
            raw.job_posted_at_datetime_utc ||
            (raw.job_posted_at_timestamp
              ? new Date(
                  Number(
                    raw.job_posted_at_timestamp
                  ) * 1000
                ).toISOString()
              : ""),

          applyUrl,

          jobUrl: applyUrl,
        };
      })
      .filter(
  (job: Job | null): job is Job =>
    job !== null
);

    // Remove duplicate jobs.
    const seen = new Set<string>();

    jobs = jobs.filter((job) => {
      const key = [
        job.company,
        job.title,
        job.location,
      ]
        .join("|")
        .toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

    // Newest first.
    jobs.sort((a, b) => {
      const aTime =
        Date.parse(a.postedAt || "") || 0;

      const bTime =
        Date.parse(b.postedAt || "") || 0;

      return bTime - aTime;
    });

    return NextResponse.json({
      jobs,
      total: jobs.length,

      // Keeping these because your existing Jobs UI
      // may expect page/pageCount.
      page: 0,
      pageCount: 1,

      searchQuery,

      nextCursor:
        result.cursor || null,

      note:
        jobs.length === 0
          ? "Jobs were found, but no direct company/ATS application links passed the filter."
          : undefined,
    });
  } catch (error) {
    console.error(
      "VRoom Jobs API Error:",
      error
    );

    return NextResponse.json(
      {
        jobs: [],
        total: 0,
        page: 0,
        pageCount: 1,

        error:
          error instanceof Error
            ? error.message
            : "Unable to search jobs.",
      },
      {
        status: 500,
      }
    );
  }
}