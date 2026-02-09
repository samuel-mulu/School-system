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
    throw new NotFoundError("Student not found");
  }

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
  // Try multiple paths to find templates (works in both dev and production)
  let templatePath: string;
  const possiblePaths = [
    join(__dirname, "..", "templates", `badge-${side}.html`), // Production (dist)
    join(__dirname, "..", "..", "src", "templates", `badge-${side}.html`), // Development
  ];

  for (const path of possiblePaths) {
    try {
      readFileSync(path, "utf-8");
      templatePath = path;
      break;
    } catch {
      // Try next path
    }
  }

  if (!templatePath!) {
    throw new Error(`Template file not found: badge-${side}.html`);
  }

  let html = readFileSync(templatePath, "utf-8");

  // Format date of birth
  const dob = new Date(data.student.dateOfBirth);
  const formattedDob = `${String(dob.getMonth() + 1).padStart(2, "0")}/${String(dob.getDate()).padStart(2, "0")}/${dob.getFullYear()}`;

  // Determine the base URL for assets
  const isDevelopment = process.env.NODE_ENV === "development";
  const baseUrl = process.env.FRONTEND_URL || (isDevelopment ? `http://localhost:${process.env.PORT || 4000}` : "");

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
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle" });

    // CR80 size: 85.60mm x 53.98mm
    // At 300 DPI: 1011px x 638px (approximately)
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

export const generateBadgePNG = async (html: string): Promise<Buffer> => {
  const browser = await chromium.launch();
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
  const browser = await chromium.launch();
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
