import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 3; // 3 applications per hour per IP
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count };
}

// Validation functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^[+]?[\d\s()-]{7,20}$/;
  return phoneRegex.test(phone);
}

function validateDateOfBirth(dob: string): { valid: boolean; error?: string } {
  const date = new Date(dob);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date format" };
  }
  
  const now = new Date();
  const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  if (age < 3 || age > 25) {
    return { valid: false, error: "Age must be between 3 and 25 years" };
  }
  
  return { valid: true };
}

function validateGender(gender: string): boolean {
  return ["male", "female", "other"].includes(gender.toLowerCase());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";

    const { allowed, remaining } = checkRateLimit(ip);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "3600",
          },
        }
      );
    }

    const body = await req.json();
    const {
      studentName,
      dateOfBirth,
      gender,
      parentName,
      parentEmail,
      parentPhone,
      address,
      gradeApplyingFor,
      previousSchool,
      additionalInfo,
      honeypot,
    } = body;

    // Honeypot check
    if (honeypot) {
      return new Response(
        JSON.stringify({ success: true, message: "Application submitted successfully." }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Server-side validation
    const errors: string[] = [];

    if (!studentName || typeof studentName !== "string" || studentName.trim().length < 2 || studentName.trim().length > 100) {
      errors.push("Student name must be between 2 and 100 characters");
    }

    const dobValidation = validateDateOfBirth(dateOfBirth);
    if (!dobValidation.valid) {
      errors.push(dobValidation.error || "Invalid date of birth");
    }

    if (!gender || !validateGender(gender)) {
      errors.push("Please select a valid gender");
    }

    if (!parentName || typeof parentName !== "string" || parentName.trim().length < 2 || parentName.trim().length > 100) {
      errors.push("Parent name must be between 2 and 100 characters");
    }

    if (!parentEmail || !validateEmail(parentEmail.trim())) {
      errors.push("Please provide a valid email address");
    }

    if (!parentPhone || !validatePhone(parentPhone.trim())) {
      errors.push("Please provide a valid phone number");
    }

    if (!address || typeof address !== "string" || address.trim().length < 5 || address.trim().length > 500) {
      errors.push("Address must be between 5 and 500 characters");
    }

    if (!gradeApplyingFor || typeof gradeApplyingFor !== "string" || gradeApplyingFor.trim().length > 50) {
      errors.push("Please select a valid grade");
    }

    if (previousSchool && previousSchool.length > 200) {
      errors.push("Previous school name must be less than 200 characters");
    }

    if (additionalInfo && additionalInfo.length > 1000) {
      errors.push("Additional info must be less than 1000 characters");
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: errors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase.from("admission_applications").insert({
      student_name: studentName.trim(),
      date_of_birth: dateOfBirth,
      gender: gender.trim().toLowerCase(),
      parent_name: parentName.trim(),
      parent_email: parentEmail.trim().toLowerCase(),
      parent_phone: parentPhone.trim(),
      address: address.trim(),
      grade_applying_for: gradeApplyingFor.trim(),
      previous_school: previousSchool?.trim() || null,
      additional_info: additionalInfo?.trim() || null,
    });

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit application. Please try again." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Application submitted successfully!" }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
