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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          focus_keyword: string | null
          id: string
          last_reviewed_at: string | null
          needs_medical_review: boolean
          published: boolean
          published_at: string | null
          review_interval_days: number
          scheduled_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          focus_keyword?: string | null
          id?: string
          last_reviewed_at?: string | null
          needs_medical_review?: boolean
          published?: boolean
          published_at?: string | null
          review_interval_days?: number
          scheduled_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          focus_keyword?: string | null
          id?: string
          last_reviewed_at?: string | null
          needs_medical_review?: boolean
          published?: boolean
          published_at?: string | null
          review_interval_days?: number
          scheduled_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_action_tokens: {
        Row: {
          action: Database["public"]["Enums"]["booking_action_type"]
          booking_id: string
          created_at: string
          expires_at: string
          id: string
          recipient_email: string
          token: string
          used_at: string | null
          used_by_email: string | null
          used_by_ip: string | null
          used_by_ua: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["booking_action_type"]
          booking_id: string
          created_at?: string
          expires_at: string
          id?: string
          recipient_email: string
          token: string
          used_at?: string | null
          used_by_email?: string | null
          used_by_ip?: string | null
          used_by_ua?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["booking_action_type"]
          booking_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          recipient_email?: string
          token?: string
          used_at?: string | null
          used_by_email?: string | null
          used_by_ip?: string | null
          used_by_ua?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_action_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reminder_opt_out_tokens: {
        Row: {
          booking_id: string
          created_at: string
          expires_at: string
          id: string
          patient_email: string
          token: string
          used_at: string | null
          used_by_ip: string | null
          used_by_ua: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          expires_at?: string
          id?: string
          patient_email: string
          token: string
          used_at?: string | null
          used_by_ip?: string | null
          used_by_ua?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          patient_email?: string
          token?: string
          used_at?: string | null
          used_by_ip?: string | null
          used_by_ua?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reminder_opt_out_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          source: string
        }
        Insert: {
          booking_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          source?: string
        }
        Update: {
          booking_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          appointment_date: string
          appointment_time: string
          cc_emails: string[]
          created_at: string
          id: string
          location: string
          message: string | null
          next_reminder_24h_at: string | null
          next_reminder_2h_at: string | null
          patient_email: string
          patient_name: string
          patient_phone: string
          reminder_opt_out: boolean
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          cc_emails?: string[]
          created_at?: string
          id?: string
          location: string
          message?: string | null
          next_reminder_24h_at?: string | null
          next_reminder_2h_at?: string | null
          patient_email: string
          patient_name: string
          patient_phone: string
          reminder_opt_out?: boolean
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          cc_emails?: string[]
          created_at?: string
          id?: string
          location?: string
          message?: string | null
          next_reminder_24h_at?: string | null
          next_reminder_2h_at?: string | null
          patient_email?: string
          patient_name?: string
          patient_phone?: string
          reminder_opt_out?: boolean
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notification_recipients: {
        Row: {
          created_at: string
          email: string
          enabled: boolean
          id: string
          location_label: string | null
          location_match: string | null
          location_match_patterns: string[]
          notes: string | null
          role: Database["public"]["Enums"]["notification_recipient_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          enabled?: boolean
          id?: string
          location_label?: string | null
          location_match?: string | null
          location_match_patterns?: string[]
          notes?: string | null
          role: Database["public"]["Enums"]["notification_recipient_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          enabled?: boolean
          id?: string
          location_label?: string | null
          location_match?: string | null
          location_match_patterns?: string[]
          notes?: string | null
          role?: Database["public"]["Enums"]["notification_recipient_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          count: number
          endpoint: string
          ip: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          ip: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          ip?: string
          window_start?: string
        }
        Relationships: []
      }
      security_checklist_items: {
        Row: {
          category: string
          created_at: string
          description: string
          detail: string | null
          id: string
          policies: Json
          slug: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          detail?: string | null
          id?: string
          policies?: Json
          slug: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          detail?: string | null
          id?: string
          policies?: Json
          slug?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_redirect_hits: {
        Row: {
          created_at: string
          from_path: string
          id: string
          kind: string
          referrer: string | null
          search: string | null
          session_id: string | null
          to_path: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          from_path: string
          id?: string
          kind: string
          referrer?: string | null
          search?: string | null
          session_id?: string | null
          to_path?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          from_path?: string
          id?: string
          kind?: string
          referrer?: string | null
          search?: string | null
          session_id?: string | null
          to_path?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      seo_redirects: {
        Row: {
          created_at: string
          created_by: string | null
          from_path: string
          id: string
          is_active: boolean
          reason: string | null
          to_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_path: string
          id?: string
          is_active?: boolean
          reason?: string | null
          to_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_path?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      token_validation_failures: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip: string | null
          metadata: Json | null
          reason: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          reason: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip?: string | null
          metadata?: Json | null
          reason?: string
          user_agent?: string | null
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
      vein_image_override_history: {
        Row: {
          action: string
          alt: string
          caption: string
          id: string
          override_id: string | null
          page_key: string
          recorded_at: string
          slot: string
          updated_by: string | null
        }
        Insert: {
          action: string
          alt: string
          caption: string
          id?: string
          override_id?: string | null
          page_key: string
          recorded_at?: string
          slot: string
          updated_by?: string | null
        }
        Update: {
          action?: string
          alt?: string
          caption?: string
          id?: string
          override_id?: string | null
          page_key?: string
          recorded_at?: string
          slot?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      vein_image_overrides: {
        Row: {
          alt: string
          caption: string
          id: string
          page_key: string
          slot: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alt: string
          caption: string
          id?: string
          page_key: string
          slot: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alt?: string
          caption?: string
          id?: string
          page_key?: string
          slot?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_vitals: {
        Row: {
          connection: string | null
          created_at: string
          id: string
          metric: string
          navigation_type: string | null
          path: string
          rating: string
          user_agent: string | null
          value: number
        }
        Insert: {
          connection?: string | null
          created_at?: string
          id?: string
          metric: string
          navigation_type?: string | null
          path: string
          rating: string
          user_agent?: string | null
          value: number
        }
        Update: {
          connection?: string | null
          created_at?: string
          id?: string
          metric?: string
          navigation_type?: string | null
          path?: string
          rating?: string
          user_agent?: string | null
          value?: number
        }
        Relationships: []
      }
    }
    Views: {
      recent_token_abuse_ips: {
        Row: {
          already_used_count: number | null
          endpoints: string[] | null
          expired_count: number | null
          failure_count: number | null
          first_seen: string | null
          invalid_token_count: number | null
          ip: string | null
          last_seen: string | null
          last_user_agent: string | null
          rate_limited_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_increment_rate_limit: {
        Args: {
          p_endpoint: string
          p_ip: string
          p_max: number
          p_window_sec: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          remaining: number
          retry_after_sec: number
        }[]
      }
      cleanup_old_bookings: { Args: never; Returns: undefined }
      cleanup_old_token_failures: { Args: never; Returns: undefined }
      cleanup_rate_limit_buckets: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_public_web_vitals_summary: {
        Args: { p_days?: number }
        Returns: {
          count: number
          good: number
          metric: string
          needs_improvement: number
          p75: number
          poor: number
        }[]
      }
      get_top_rate_limited_ips: {
        Args: { p_limit?: number }
        Returns: {
          denied: number
          endpoint: string
          hits: number
          ip: string
          last_window: string
          windows: number
        }[]
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      booking_action_type: "confirm" | "cancel" | "needs_contact"
      notification_recipient_role: "reception" | "hq" | "doctor"
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
      app_role: ["admin", "moderator", "user"],
      booking_action_type: ["confirm", "cancel", "needs_contact"],
      notification_recipient_role: ["reception", "hq", "doctor"],
    },
  },
} as const
