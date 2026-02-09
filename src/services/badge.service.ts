import { readFileSync } from "fs";
import { dirname, join } from "path";
import { chromium } from "playwright";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { prisma } from "../config/db.js";
import { NotFoundError } from "../utils/errors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface BadgeData {
  student: {
    id: string;
    studentNumber: number | null;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    profileImageUrl: string | null;
    emergencyPhone: string;
  };
  class: {
    name: string;
    grade?: {
      name: string;
    };
  } | null;
  academicYear: {
    name: string;
  } | null;
  school: {
    name: string;
    contactNumber: string;
    logoUrl: string | null;
  };
}

export const getStudentBadgeData = async (
  studentId: string,
): Promise<BadgeData> => {
  console.log(`[badge-debug] Fetching badge data for student ID: ${studentId}`);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      classHistory: {
        where: { endDate: null },
        take: 1,
        include: {
          class: {
            include: {
              academicYear: true,
              grade: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    console.error(`[badge-debug] Student with ID ${studentId} not found.`);
    throw new NotFoundError("Student not found");
  }
  console.log(`[badge-debug] Successfully fetched student record for: ${student.firstName} ${student.lastName}`);


  // Get current class and academic year
  const currentClassHistory = student.classHistory[0];
  const currentClass = currentClassHistory?.class || null;
  const academicYear = currentClass?.academicYear || null;

  // Get school settings
  const [schoolNameSetting, contactNumberSetting, logoUrlSetting] =
    await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: "schoolName" } }),
      prisma.systemSettings.findUnique({
        where: { key: "schoolContactNumber" },
      }),
      prisma.systemSettings.findUnique({ where: { key: "schoolLogoUrl" } }),
    ]);

  const school = {
    name: schoolNameSetting?.value || "School Name",
    contactNumber: contactNumberSetting?.value || "(000) 0000 000 000",
    logoUrl: logoUrlSetting?.value || null,
  };

  return {
    student: {
      id: student.id,
      studentNumber: student.studentNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: student.dateOfBirth,
      profileImageUrl: student.profileImageUrl,
      emergencyPhone: student.emergencyPhone,
    },
    class: currentClass ? { name: currentClass.name } : null,
    academicYear: academicYear ? { name: academicYear.name } : null,
    school,
  };
};

export const generateQRCode = async (text: string): Promise<string> => {
  try {
    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return dataUrl;
  } catch (error) {
    console.error("QR code generation error:", error);
    // Return empty string on error
    return "";
  }
};

export const renderBadgeHTML = (
  side: "front" | "back",
  data: BadgeData,
  qrCodeDataUrl: string,
  minimal: boolean = false,
): string => {
  // KISS: Simply look for templates relative to the current service file
  // This works in both src/services and dist/services if we copy src/templates to dist/templates
  const templatePath = join(__dirname, "..", "templates", `badge-${side}.html`);
  console.log(`[badge-debug] Template path: ${templatePath}`);
  console.log(`[badge-debug] __dirname: ${__dirname}`);

  let html: string;
  try {
    html = readFileSync(templatePath, "utf-8");
    console.log(`[badge-debug] Template loaded successfully from: ${templatePath}`);
  } catch (error) {
    console.error(`[badge-debug] Failed to read template at: ${templatePath}`, error);
    throw new Error(`Template file not found at ${templatePath}`);
  }

  // Format date of birth
  const dob = new Date(data.student.dateOfBirth);
  const formattedDob = `${String(dob.getMonth() + 1).padStart(2, "0")}/${String(dob.getDate()).padStart(2, "0")}/${dob.getFullYear()}`;

  // Assets base URL: Prefer environment variable or auto-detected
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}`;

  // Format student number for display (5 digits) or fallback to UUID
  const displayStudentId = data.student.studentNumber
    ? String(data.student.studentNumber).padStart(5, "0")
    : data.student.id;

  // Replace placeholders
  const replacements: Record<string, string> = {
    "{{STUDENT_FULL_NAME}}": `${data.student.firstName} ${data.student.lastName}`,
    "{{STUDENT_ID}}": displayStudentId,
    "{{CLASS_NAME}}": data.class ? data.class.name : "N/A",
    "{{BIRTHDATE}}": formattedDob,
    "{{ACADEMIC_YEAR}}": data.academicYear?.name || "N/A",
    "{{EMERGENCY_PHONE}}": data.student.emergencyPhone || "N/A",
    "{{STUDENT_PHOTO_URL}}": data.student.profileImageUrl || `${baseUrl}/placeholder-student.png`,
    "{{SCHOOL_NAME}}": data.school.name,
    "{{SCHOOL_CONTACT}}": data.school.contactNumber,
    "{{SCHOOL_LOGO_URL}}": data.school.logoUrl || `${baseUrl}/logo.jpg`,
    "{{QR_CODE_DATA_URL}}": qrCodeDataUrl,
    "{{MINIMAL_CLASS}}": minimal ? "minimal-view" : "",
  };

  Object.entries(replacements).forEach(([key, value]) => {
    html = html.replace(new RegExp(key, "g"), value);
  });

  return html;
};

export const generateBadgePDF = async (html: string): Promise<Buffer> => {
  console.log("[badge-debug] Launching chromium for PDF...");
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }).catch(err => {
    console.error("[badge-debug] Playwright launch failed:", err);
    throw err;
  });
  console.log("[badge-debug] Chromium launched successfully.");
  const page = await browser.newPage();

  try {
    console.log("[badge-debug] Setting page content...");
    await page.setContent(html, {
      waitUntil: "networkidle",
    }).catch(err => {
      console.error("[badge-debug] setContent failed:", err);
      throw err;
    });
    console.log("[badge-debug] Page content set.");

    // CR80 size: 85.60mm x 53.98mm
    // At 300 DPI: 1011px x 638px (approximately)
    await page.setViewportSize({ width: 1011, height: 638 });

    console.log("[badge-debug] Generating PDF...");
    const pdf = await page.pdf({
      width: "85.6mm",
      height: "53.98mm",
      printBackground: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    }).catch(err => {
      console.error("[badge-debug] Playwright PDF generation failed:", err);
      throw err;
    });
    console.log("[badge-debug] PDF generated successfully.");

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};

export const generateBadgePNG = async (html: string): Promise<Buffer> => {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle" });

    // CR80 size at 300 DPI
    await page.setViewportSize({ width: 1011, height: 638 });

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
    });

    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
};

export const generateCombinedPDF = async (
  frontHtml: string,
  backHtml: string,
): Promise<Buffer> => {
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    // Create combined HTML with page breaks
    const combinedHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @page {
              size: 85.6mm 53.98mm;
              margin: 0;
            }
            .page {
              width: 85.6mm;
              height: 53.98mm;
              page-break-after: always;
            }
            .page:last-child {
              page-break-after: auto;
            }
          </style>
        </head>
        <body>
          <div class="page">${frontHtml}</div>
          <div class="page">${backHtml}</div>
        </body>
      </html>
    `;

    await page.setContent(combinedHtml, { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 1011, height: 638 });

    const pdf = await page.pdf({
      width: "85.6mm",
      height: "53.98mm",
      printBackground: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};
