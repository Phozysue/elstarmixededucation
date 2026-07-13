import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allowed buckets with their configurations
const BUCKET_CONFIG: Record<string, { 
  maxSizeBytes: number; 
  allowedMimeTypes: string[];
  requiresAdmin: boolean;
}> = {
  "gallery-images": {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    requiresAdmin: true,
  },
  "gallery-videos": {
    maxSizeBytes: 100 * 1024 * 1024, // 100MB for videos
    allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"],
    requiresAdmin: true,
  },
  "hero-images": {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    requiresAdmin: true,
  },
  "principal-images": {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    requiresAdmin: true,
  },
  "teacher-photos": {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    requiresAdmin: true,
  },
  "library-pdfs": {
    maxSizeBytes: 50 * 1024 * 1024, // 50MB for PDFs
    allowedMimeTypes: ["application/pdf"],
    requiresAdmin: true,
  },
};

// Magic bytes for file validation
const FILE_MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/png": [0x89, 0x50, 0x4E, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF)
  "video/mp4": [0x00, 0x00, 0x00], // MP4 starts with ftyp box (variable offset)
  "video/webm": [0x1A, 0x45, 0xDF, 0xA3], // EBML header
  "video/quicktime": [0x00, 0x00, 0x00], // MOV similar to MP4
  "video/x-msvideo": [0x52, 0x49, 0x46, 0x46], // AVI uses RIFF
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
};

function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const bytes = new Uint8Array(buffer);
  
  // Special handling for video types that have variable headers
  if (mimeType === "video/mp4" || mimeType === "video/quicktime") {
    // MP4/MOV files have 'ftyp' signature at offset 4
    const ftyp = [0x66, 0x74, 0x79, 0x70]; // 'ftyp'
    for (let i = 0; i < ftyp.length; i++) {
      if (bytes[4 + i] !== ftyp[i]) return false;
    }
    return true;
  }
  
  if (mimeType === "video/x-msvideo") {
    // AVI files have 'AVI ' at offset 8
    const riff = [0x52, 0x49, 0x46, 0x46]; // RIFF
    for (let i = 0; i < riff.length; i++) {
      if (bytes[i] !== riff[i]) return false;
    }
    const avi = [0x41, 0x56, 0x49, 0x20]; // 'AVI '
    for (let i = 0; i < avi.length; i++) {
      if (bytes[8 + i] !== avi[i]) return false;
    }
    return true;
  }
  
  const expected = FILE_MAGIC_BYTES[mimeType];
  if (!expected) return false;
  
  for (let i = 0; i < expected.length; i++) {
    if (bytes[i] !== expected[i]) return false;
  }
  
  // Additional check for WebP: bytes 8-11 should be WEBP
  if (mimeType === "image/webp") {
    const webpMarker = [0x57, 0x45, 0x42, 0x50]; // WEBP
    for (let i = 0; i < webpMarker.length; i++) {
      if (bytes[8 + i] !== webpMarker[i]) return false;
    }
  }
  
  // Additional check for WebM
  if (mimeType === "video/webm") {
    // Just check EBML header is present
    const ebml = [0x1A, 0x45, 0xDF, 0xA3];
    for (let i = 0; i < ebml.length; i++) {
      if (bytes[i] !== ebml[i]) return false;
    }
  }
  
  return true;
}

function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "application/pdf": "pdf",
  };
  return map[mimeType] || "bin";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = formData.get("bucket") as string | null;

    if (!file || !bucket) {
      return new Response(
        JSON.stringify({ error: "File and bucket are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate bucket
    const bucketConfig = BUCKET_CONFIG[bucket];
    if (!bucketConfig) {
      return new Response(
        JSON.stringify({ error: "Invalid bucket specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role if required
    if (bucketConfig.requiresAdmin) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Admin privileges required for this bucket" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate file size
    if (file.size > bucketConfig.maxSizeBytes) {
      const maxMB = bucketConfig.maxSizeBytes / (1024 * 1024);
      return new Response(
        JSON.stringify({ error: `File too large. Maximum size is ${maxMB}MB` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate MIME type from header
    if (!bucketConfig.allowedMimeTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type. Allowed types: ${bucketConfig.allowedMimeTypes.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read file buffer for magic bytes validation
    const buffer = await file.arrayBuffer();

    // Validate magic bytes (actual file content)
    if (!validateMagicBytes(buffer, file.type)) {
      return new Response(
        JSON.stringify({ error: "File content does not match declared type. Possible security risk detected." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure filename
    const ext = getFileExtension(file.type);
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().split("-")[0];
    const fileName = `${timestamp}-${randomId}.${ext}`;

    // Use service role for upload to bypass RLS
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Upload to storage
    const { error: uploadError } = await adminSupabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = adminSupabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    // Log the upload for audit
    console.log(`[AUDIT] User ${user.id} uploaded file to ${bucket}: ${fileName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        publicUrl,
        fileName,
        bucket,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});