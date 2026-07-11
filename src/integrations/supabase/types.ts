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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      commission_entries: {
        Row: {
          commission_amount: number
          commission_rule_id: string | null
          commission_type: string
          commission_value: number
          created_at: string
          earned_at: string
          id: string
          package_id: string | null
          payroll_item_id: string | null
          session_deduction_request_id: string | null
          session_revenue: number
          staff_user_id: string
          status: string
          updated_at: string
          usage_log_id: string | null
        }
        Insert: {
          commission_amount?: number
          commission_rule_id?: string | null
          commission_type?: string
          commission_value?: number
          created_at?: string
          earned_at?: string
          id?: string
          package_id?: string | null
          payroll_item_id?: string | null
          session_deduction_request_id?: string | null
          session_revenue?: number
          staff_user_id: string
          status?: string
          updated_at?: string
          usage_log_id?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rule_id?: string | null
          commission_type?: string
          commission_value?: number
          created_at?: string
          earned_at?: string
          id?: string
          package_id?: string | null
          payroll_item_id?: string | null
          session_deduction_request_id?: string | null
          session_revenue?: number
          staff_user_id?: string
          status?: string
          updated_at?: string
          usage_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_commission_rule_id_fkey"
            columns: ["commission_rule_id"]
            isOneToOne: false
            referencedRelation: "commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_payroll_item_fk"
            columns: ["payroll_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_session_deduction_request_id_fkey"
            columns: ["session_deduction_request_id"]
            isOneToOne: false
            referencedRelation: "session_deduction_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_usage_log_id_fkey"
            columns: ["usage_log_id"]
            isOneToOne: false
            referencedRelation: "usage_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          commission_type: string
          commission_value: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          package_id: string | null
          priority: number
          staff_role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          package_id?: string | null
          priority?: number
          staff_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          package_id?: string | null
          priority?: number
          staff_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_rules_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_packages: {
        Row: {
          customer_id: string
          deposit_amount: number
          deposit_paid: boolean
          deposit_paid_at: string | null
          deposit_sessions_paid: number
          id: string
          package_id: string
          purchase_date: string
          sessions_remaining: number
          total_price: number
          total_sessions: number
          variant_id: string | null
          variant_label: string | null
          warranty_expires_at: string | null
          warranty_years: number
        }
        Insert: {
          customer_id: string
          deposit_amount?: number
          deposit_paid?: boolean
          deposit_paid_at?: string | null
          deposit_sessions_paid?: number
          id?: string
          package_id: string
          purchase_date?: string
          sessions_remaining: number
          total_price?: number
          total_sessions: number
          variant_id?: string | null
          variant_label?: string | null
          warranty_expires_at?: string | null
          warranty_years?: number
        }
        Update: {
          customer_id?: string
          deposit_amount?: number
          deposit_paid?: boolean
          deposit_paid_at?: string | null
          deposit_sessions_paid?: number
          id?: string
          package_id?: string
          purchase_date?: string
          sessions_remaining?: number
          total_price?: number
          total_sessions?: number
          variant_id?: string | null
          variant_label?: string | null
          warranty_expires_at?: string | null
          warranty_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_packages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "package_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      package_promotions: {
        Row: {
          created_at: string
          id: string
          package_id: string
          promotion_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          promotion_id: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_promotions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_promotions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      package_variants: {
        Row: {
          created_at: string
          first_time_price: number | null
          id: string
          label: string
          package_id: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_time_price?: number | null
          id?: string
          label: string
          package_id: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_time_price?: number | null
          id?: string
          label?: string
          package_id?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_variants_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          first_time_price: number | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          points_awarded: number
          price: number
          total_sessions: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          first_time_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          points_awarded?: number
          price?: number
          total_sessions?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          first_time_price?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          points_awarded?: number
          price?: number
          total_sessions?: number
        }
        Relationships: []
      }
      payroll_items: {
        Row: {
          adjustments: number
          created_at: string
          entries_count: number
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          payroll_run_id: string
          staff_user_id: string
          updated_at: string
        }
        Insert: {
          adjustments?: number
          created_at?: string
          entries_count?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          payroll_run_id: string
          staff_user_id: string
          updated_at?: string
        }
        Update: {
          adjustments?: number
          created_at?: string
          entries_count?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          payroll_run_id?: string
          staff_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
          period_end: string
          period_start: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          period_end: string
          period_start: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          must_change_password: boolean
          name: string | null
          phone: string | null
          points: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          must_change_password?: boolean
          name?: string | null
          phone?: string | null
          points?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          must_change_password?: boolean
          name?: string | null
          phone?: string | null
          points?: number
        }
        Relationships: []
      }
      promotions: {
        Row: {
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      salon_contacts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          phone: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          phone: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          phone?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      session_deduction_requests: {
        Row: {
          admin_id: string
          created_at: string
          customer_id: string
          customer_package_id: string
          expires_at: string
          id: string
          responded_at: string | null
          staff_ids: string[]
          status: string
          usage_log_id: string | null
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          admin_id: string
          created_at?: string
          customer_id: string
          customer_package_id: string
          expires_at?: string
          id?: string
          responded_at?: string | null
          staff_ids?: string[]
          status?: string
          usage_log_id?: string | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          admin_id?: string
          created_at?: string
          customer_id?: string
          customer_package_id?: string
          expires_at?: string
          id?: string
          responded_at?: string | null
          staff_ids?: string[]
          status?: string
          usage_log_id?: string | null
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_deduction_requests_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_deduction_requests_usage_log_id_fkey"
            columns: ["usage_log_id"]
            isOneToOne: false
            referencedRelation: "usage_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_deduction_requests_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "package_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      session_staff: {
        Row: {
          created_at: string
          id: string
          staff_user_id: string
          usage_log_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          staff_user_id: string
          usage_log_id: string
        }
        Update: {
          created_at?: string
          id?: string
          staff_user_id?: string
          usage_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_staff_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_staff_usage_log_id_fkey"
            columns: ["usage_log_id"]
            isOneToOne: false
            referencedRelation: "usage_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payment_history: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          payment_method: string | null
          payroll_item_id: string | null
          payroll_run_id: string | null
          recorded_by: string | null
          reference: string | null
          staff_user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          payroll_item_id?: string | null
          payroll_run_id?: string | null
          recorded_by?: string | null
          reference?: string | null
          staff_user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          payroll_item_id?: string | null
          payroll_run_id?: string | null
          recorded_by?: string | null
          reference?: string | null
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payment_history_payroll_item_id_fkey"
            columns: ["payroll_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payment_history_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payment_history_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payment_history_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          admin_id: string
          customer_package_id: string
          id: string
          price_applied: number
          used_at: string
          variant_id: string | null
          variant_label: string | null
          was_first_time: boolean
        }
        Insert: {
          admin_id: string
          customer_package_id: string
          id?: string
          price_applied?: number
          used_at?: string
          variant_id?: string | null
          variant_label?: string | null
          was_first_time?: boolean
        }
        Update: {
          admin_id?: string
          customer_package_id?: string
          id?: string
          price_applied?: number
          used_at?: string
          variant_id?: string | null
          variant_label?: string | null
          was_first_time?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "usage_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "package_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer" | "staff" | "stylist"
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
      app_role: ["admin", "customer", "staff", "stylist"],
    },
  },
} as const
