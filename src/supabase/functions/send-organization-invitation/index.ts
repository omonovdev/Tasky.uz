import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  employee_id: string;
  organization_id: string;
  invitation_message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { employee_id, organization_id, invitation_message } = await req.json() as InvitationRequest;

    // Get organization details
    const { data: org, error: orgError } = await supabaseClient
      .from("organizations")
      .select("name, subheadline, description, motto, photo_url, agreement_text")
      .eq("id", organization_id)
      .single();

    if (orgError) throw orgError;

    // Get employee details
    const { data: employee, error: empError } = await supabaseClient
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", employee_id)
      .single();

    if (empError) throw empError;

    // Here you would typically send an email or push notification
    // For now, we'll just log the invitation details
    console.log("Invitation sent to:", employee.email);
    console.log("Organization:", org.name);
    console.log("Message:", invitation_message || "No custom message");
    console.log("Agreement:", org.agreement_text || "No agreement");

    // You could integrate with a service like Resend here to send actual emails
    // For now, we'll return success

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Invitation notification sent",
        details: {
          to: employee.email,
          organization: org.name,
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-organization-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
