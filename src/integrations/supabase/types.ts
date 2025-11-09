export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      notification_reads: {
        Row: {
          created_at: string
          id: string
          notification_id: string
          notification_type: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_id: string
          notification_type: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_id?: string
          notification_type?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_chat: {
        Row: {
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          message: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_chat_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_chat_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "organization_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_chat_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "organization_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_chat_replies: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reply_to_message_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reply_to_message_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reply_to_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_chat_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "organization_chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_chat_replies_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "organization_chat"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_chat_typing: {
        Row: {
          id: string
          last_typed_at: string | null
          organization_id: string
          user_id: string
        }
        Insert: {
          id?: string
          last_typed_at?: string | null
          organization_id: string
          user_id: string
        }
        Update: {
          id?: string
          last_typed_at?: string | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_chat_typing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_ideas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          contract_duration: string | null
          created_at: string | null
          employee_id: string
          id: string
          invitation_message: string | null
          organization_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          contract_duration?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          invitation_message?: string | null
          organization_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          contract_duration?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          invitation_message?: string | null
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          agreement_accepted_at: string | null
          agreement_version_accepted: number | null
          created_at: string | null
          id: string
          organization_id: string
          position: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          agreement_accepted_at?: string | null
          agreement_version_accepted?: number | null
          created_at?: string | null
          id?: string
          organization_id: string
          position?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          agreement_accepted_at?: string | null
          agreement_version_accepted?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string
          position?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          agreement_text: string | null
          agreement_version: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          motto: string | null
          name: string
          photo_url: string | null
          subheadline: string | null
        }
        Insert: {
          agreement_text?: string | null
          agreement_version?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          motto?: string | null
          name: string
          photo_url?: string | null
          subheadline?: string | null
        }
        Update: {
          agreement_text?: string | null
          agreement_version?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          motto?: string | null
          name?: string
          photo_url?: string | null
          subheadline?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          organization: string | null
          organization_id: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          id: string
          last_name: string
          organization?: string | null
          organization_id?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          organization?: string | null
          organization_id?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subgroup_members: {
        Row: {
          added_at: string
          id: string
          subgroup_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          subgroup_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          subgroup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgroup_members_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
        ]
      }
      subgroups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgroups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          task_report_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_type: string
          file_url: string
          id?: string
          task_report_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          task_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_report_id_fkey"
            columns: ["task_report_id"]
            isOneToOne: false
            referencedRelation: "task_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reports: {
        Row: {
          created_at: string | null
          id: string
          report_text: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_text: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          report_text?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_stages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          order_index: number
          status: string | null
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_index: number
          status?: string | null
          task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_index?: number
          status?: string | null
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_stages_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subgroup_assignments: {
        Row: {
          created_at: string
          id: string
          subgroup_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subgroup_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subgroup_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subgroup_assignments_subgroup_id_fkey"
            columns: ["subgroup_id"]
            isOneToOne: false
            referencedRelation: "subgroups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_subgroup_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_completed_at: string | null
          assigned_by: string
          assigned_to: string
          created_at: string | null
          custom_goal: string | null
          deadline: string
          decline_reason: string | null
          description: string | null
          estimated_completion_hours: number | null
          goal: string | null
          id: string
          last_edited_at: string | null
          last_edited_by: string | null
          organization_id: string | null
          started_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_completed_at?: string | null
          assigned_by: string
          assigned_to: string
          created_at?: string | null
          custom_goal?: string | null
          deadline: string
          decline_reason?: string | null
          description?: string | null
          estimated_completion_hours?: number | null
          goal?: string | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_completed_at?: string | null
          assigned_by?: string
          assigned_to?: string
          created_at?: string | null
          custom_goal?: string | null
          deadline?: string
          decline_reason?: string | null
          description?: string | null
          estimated_completion_hours?: number | null
          goal?: string | null
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          organization_id?: string | null
          started_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          created_at: string
          deadline: string | null
          description: string | null
          goal_text: string
          goal_type: string
          id: string
          picture_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          goal_text: string
          goal_type: string
          id?: string
          picture_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          description?: string | null
          goal_text?: string
          goal_type?: string
          id?: string
          picture_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: { invitation_id: string }
        Returns: {
          membership_id: string
          organization_id: string
        }[]
      }
      can_view_organization: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      employee_has_accepted_invitation: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      has_pending_invitation: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_organization: { Args: { _org_id: string }; Returns: boolean }
      is_organization_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "employee" | "employer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["employee", "employer"],
    },
  },
} as const