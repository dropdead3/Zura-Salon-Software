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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_approval_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          performed_by: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          performed_by: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          performed_by?: string
          user_id?: string
        }
        Relationships: []
      }
      account_note_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_role: string | null
          mentioned_user_id: string | null
          note_id: string
          notified_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_role?: string | null
          mentioned_user_id?: string | null
          note_id: string
          notified_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_role?: string | null
          mentioned_user_id?: string | null
          note_id?: string
          notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_note_mentions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "account_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      account_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
          mentions: Json | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          mentions?: Json | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          mentions?: Json | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      accountability_items: {
        Row: {
          coach_id: string
          completed_at: string | null
          completion_notes: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          meeting_id: string | null
          priority: string
          reminder_date: string | null
          reminder_sent: boolean
          status: string
          team_member_id: string
          title: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          priority?: string
          reminder_date?: string | null
          reminder_sent?: boolean
          status?: string
          team_member_id: string
          title: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_id?: string | null
          priority?: string
          reminder_date?: string | null
          reminder_sent?: boolean
          status?: string
          team_member_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "one_on_one_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      action_campaign_tasks: {
        Row: {
          assigned_to: string | null
          campaign_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_campaign_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "action_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      action_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          goal_period: string | null
          id: string
          leadership_note: string | null
          name: string
          organization_id: string
          source_plan_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          goal_period?: string | null
          id?: string
          leadership_note?: string | null
          name: string
          organization_id: string
          source_plan_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          goal_period?: string | null
          id?: string
          leadership_note?: string | null
          name?: string
          organization_id?: string
          source_plan_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_meeting_attendees: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          notified_at: string | null
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          notified_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          notified_at?: string | null
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "admin_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_meetings: {
        Row: {
          created_at: string
          duration_minutes: number
          end_time: string
          id: string
          location_id: string | null
          meeting_mode: Database["public"]["Enums"]["meeting_mode"]
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          notes: string | null
          organization_id: string
          organizer_user_id: string
          start_date: string
          start_time: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at: string
          video_link: string | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          end_time: string
          id?: string
          location_id?: string | null
          meeting_mode?: Database["public"]["Enums"]["meeting_mode"]
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          notes?: string | null
          organization_id: string
          organizer_user_id: string
          start_date: string
          start_time: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at?: string
          video_link?: string | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          end_time?: string
          id?: string
          location_id?: string | null
          meeting_mode?: Database["public"]["Enums"]["meeting_mode"]
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          notes?: string | null
          organization_id?: string
          organizer_user_id?: string
          start_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
          updated_at?: string
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_actions: {
        Row: {
          action_params: Json
          action_type: string
          channel_id: string | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          expires_at: string | null
          id: string
          message_id: string | null
          organization_id: string | null
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          action_params?: Json
          action_type: string
          channel_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          message_id?: string | null
          organization_id?: string | null
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          action_params?: Json
          action_type?: string
          channel_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          message_id?: string | null
          organization_id?: string | null
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_actions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_business_insights: {
        Row: {
          created_at: string
          expires_at: string
          generated_at: string
          id: string
          insights: Json
          location_id: string | null
          organization_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          insights?: Json
          location_id?: string | null
          organization_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          insights?: Json
          location_id?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_business_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_personal_insights: {
        Row: {
          created_at: string
          expires_at: string
          generated_at: string
          id: string
          insights: Json
          organization_id: string | null
          role_tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          insights?: Json
          organization_id?: string | null
          role_tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          generated_at?: string
          id?: string
          insights?: Json
          organization_id?: string | null
          role_tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_personal_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      allowance_buckets: {
        Row: {
          billing_label: string
          bucket_name: string
          created_at: string
          display_order: number
          id: string
          included_quantity: number
          included_unit: string
          is_taxable: boolean
          mapped_product_categories: string[]
          mapped_product_ids: string[]
          min_charge_threshold: number
          organization_id: string
          overage_cap: number | null
          overage_rate: number
          overage_rate_type: string
          policy_id: string
          requires_manager_override: boolean
          rounding_rule: string
          updated_at: string
        }
        Insert: {
          billing_label?: string
          bucket_name: string
          created_at?: string
          display_order?: number
          id?: string
          included_quantity?: number
          included_unit?: string
          is_taxable?: boolean
          mapped_product_categories?: string[]
          mapped_product_ids?: string[]
          min_charge_threshold?: number
          organization_id: string
          overage_cap?: number | null
          overage_rate?: number
          overage_rate_type?: string
          policy_id: string
          requires_manager_override?: boolean
          rounding_rule?: string
          updated_at?: string
        }
        Update: {
          billing_label?: string
          bucket_name?: string
          created_at?: string
          display_order?: number
          id?: string
          included_quantity?: number
          included_unit?: string
          is_taxable?: boolean
          mapped_product_categories?: string[]
          mapped_product_ids?: string[]
          min_charge_threshold?: number
          organization_id?: string
          overage_cap?: number | null
          overage_rate?: number
          overage_rate_type?: string
          policy_id?: string
          requires_manager_override?: boolean
          rounding_rule?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowance_buckets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowance_buckets_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "service_allowance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      allowance_override_log: {
        Row: {
          action: string
          charge_id: string
          created_at: string
          id: string
          new_amount: number | null
          organization_id: string
          performed_by: string | null
          previous_amount: number | null
          reason: string | null
        }
        Insert: {
          action: string
          charge_id: string
          created_at?: string
          id?: string
          new_amount?: number | null
          organization_id: string
          performed_by?: string | null
          previous_amount?: number | null
          reason?: string | null
        }
        Update: {
          action?: string
          charge_id?: string
          created_at?: string
          id?: string
          new_amount?: number | null
          organization_id?: string
          performed_by?: string | null
          previous_amount?: number | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allowance_override_log_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "checkout_usage_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowance_override_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          link_label: string | null
          link_url: string | null
          location_id: string | null
          priority: string | null
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          link_label?: string | null
          link_url?: string | null
          location_id?: string | null
          priority?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          link_label?: string | null
          link_url?: string | null
          location_id?: string | null
          priority?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_assistants: {
        Row: {
          appointment_id: string
          assist_duration_minutes: number | null
          assistant_user_id: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
        }
        Insert: {
          appointment_id: string
          assist_duration_minutes?: number | null
          assistant_user_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          appointment_id?: string
          assist_duration_minutes?: number | null
          assistant_user_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_assistants_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "phorest_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_assistants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_audit_log: {
        Row: {
          actor_name: string | null
          actor_user_id: string | null
          appointment_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          organization_id: string
          previous_value: Json | null
        }
        Insert: {
          actor_name?: string | null
          actor_user_id?: string | null
          appointment_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          organization_id: string
          previous_value?: Json | null
        }
        Update: {
          actor_name?: string | null
          actor_user_id?: string | null
          appointment_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          organization_id?: string
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_audit_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "phorest_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_check_ins: {
        Row: {
          appointment_id: string | null
          check_in_method: string
          checked_in_at: string
          client_id: string | null
          created_at: string | null
          forms_completed: boolean | null
          forms_completed_at: string | null
          forms_required: boolean | null
          id: string
          kiosk_device_id: string | null
          kiosk_session_id: string | null
          location_id: string | null
          notification_status: string | null
          organization_id: string | null
          phorest_appointment_id: string | null
          phorest_client_id: string | null
          stylist_notified_at: string | null
          stylist_user_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          check_in_method: string
          checked_in_at?: string
          client_id?: string | null
          created_at?: string | null
          forms_completed?: boolean | null
          forms_completed_at?: string | null
          forms_required?: boolean | null
          id?: string
          kiosk_device_id?: string | null
          kiosk_session_id?: string | null
          location_id?: string | null
          notification_status?: string | null
          organization_id?: string | null
          phorest_appointment_id?: string | null
          phorest_client_id?: string | null
          stylist_notified_at?: string | null
          stylist_user_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          check_in_method?: string
          checked_in_at?: string
          client_id?: string | null
          created_at?: string | null
          forms_completed?: boolean | null
          forms_completed_at?: string | null
          forms_required?: boolean | null
          id?: string
          kiosk_device_id?: string | null
          kiosk_session_id?: string | null
          location_id?: string | null
          notification_status?: string | null
          organization_id?: string | null
          phorest_appointment_id?: string | null
          phorest_client_id?: string | null
          stylist_notified_at?: string | null
          stylist_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_check_ins_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_check_ins_kiosk_device_id_fkey"
            columns: ["kiosk_device_id"]
            isOneToOne: false
            referencedRelation: "kiosk_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_check_ins_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_check_ins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_fee_charges: {
        Row: {
          appointment_id: string
          charged_at: string | null
          collected_via: string | null
          created_at: string
          fee_amount: number
          fee_type: string
          id: string
          organization_id: string
          policy_id: string | null
          status: string
          updated_at: string
          waived_by: string | null
          waived_reason: string | null
        }
        Insert: {
          appointment_id: string
          charged_at?: string | null
          collected_via?: string | null
          created_at?: string
          fee_amount: number
          fee_type: string
          id?: string
          organization_id: string
          policy_id?: string | null
          status?: string
          updated_at?: string
          waived_by?: string | null
          waived_reason?: string | null
        }
        Update: {
          appointment_id?: string
          charged_at?: string | null
          collected_via?: string | null
          created_at?: string
          fee_amount?: number
          fee_type?: string
          id?: string
          organization_id?: string
          policy_id?: string | null
          status?: string
          updated_at?: string
          waived_by?: string | null
          waived_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_fee_charges_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "phorest_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_fee_charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_fee_charges_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "cancellation_fee_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_notes: {
        Row: {
          author_id: string
          created_at: string | null
          id: string
          is_private: boolean | null
          note: string
          phorest_appointment_id: string
        }
        Insert: {
          author_id: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          note: string
          phorest_appointment_id: string
        }
        Update: {
          author_id?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          note?: string
          phorest_appointment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      appointment_reminder_overrides: {
        Row: {
          config_id: string
          created_at: string
          html_body: string | null
          id: string
          location_id: string
          subject: string | null
        }
        Insert: {
          config_id: string
          created_at?: string
          html_body?: string | null
          id?: string
          location_id: string
          subject?: string | null
        }
        Update: {
          config_id?: string
          created_at?: string
          html_body?: string | null
          id?: string
          location_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminder_overrides_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "appointment_reminders_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminder_overrides_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders_config: {
        Row: {
          created_at: string
          html_body: string
          id: string
          is_active: boolean
          organization_id: string
          reminder_type: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_body?: string
          id?: string
          is_active?: boolean
          organization_id: string
          reminder_type: string
          subject?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_body?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          reminder_type?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_service_assignments: {
        Row: {
          appointment_id: string
          assigned_staff_name: string
          assigned_user_id: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          service_name: string
        }
        Insert: {
          appointment_id: string
          assigned_staff_name: string
          assigned_user_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          service_name: string
        }
        Update: {
          appointment_id?: string
          assigned_staff_name?: string
          assigned_user_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_service_assignments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "phorest_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_service_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          cancellation_fee_charged: number | null
          cancellation_fee_status: string | null
          cancellation_fee_stripe_payment_id: string | null
          card_on_file_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_notes: string | null
          client_phone: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deposit_amount: number | null
          deposit_applied_to_total: boolean
          deposit_collected_at: string | null
          deposit_required: boolean
          deposit_status: string | null
          deposit_stripe_payment_id: string | null
          duration_minutes: number | null
          end_time: string
          external_id: string | null
          id: string
          import_job_id: string | null
          import_source: string | null
          imported_at: string | null
          is_new_client: boolean | null
          is_redo: boolean
          location_id: string | null
          notes: string | null
          organization_id: string | null
          original_appointment_id: string | null
          original_price: number | null
          paid_at: string | null
          payment_failure_reason: string | null
          payment_method: string | null
          payment_status: string
          phorest_client_id: string | null
          phorest_staff_id: string | null
          rebook_declined_reason: string | null
          rebooked_at_checkout: boolean | null
          recurrence_group_id: string | null
          recurrence_index: number | null
          recurrence_rule: Json | null
          redo_approved_by: string | null
          redo_pricing_override: number | null
          redo_reason: string | null
          reminder_24h_sent: boolean | null
          reminder_2h_sent: boolean | null
          rescheduled_at: string | null
          rescheduled_from_date: string | null
          rescheduled_from_time: string | null
          service_category: string | null
          service_id: string | null
          service_name: string | null
          staff_name: string | null
          staff_user_id: string | null
          start_time: string
          status: string | null
          stripe_payment_intent_id: string | null
          tip_amount: number | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          cancellation_fee_charged?: number | null
          cancellation_fee_status?: string | null
          cancellation_fee_stripe_payment_id?: string | null
          card_on_file_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_notes?: string | null
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit_amount?: number | null
          deposit_applied_to_total?: boolean
          deposit_collected_at?: string | null
          deposit_required?: boolean
          deposit_status?: string | null
          deposit_stripe_payment_id?: string | null
          duration_minutes?: number | null
          end_time: string
          external_id?: string | null
          id?: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          is_new_client?: boolean | null
          is_redo?: boolean
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          original_appointment_id?: string | null
          original_price?: number | null
          paid_at?: string | null
          payment_failure_reason?: string | null
          payment_method?: string | null
          payment_status?: string
          phorest_client_id?: string | null
          phorest_staff_id?: string | null
          rebook_declined_reason?: string | null
          rebooked_at_checkout?: boolean | null
          recurrence_group_id?: string | null
          recurrence_index?: number | null
          recurrence_rule?: Json | null
          redo_approved_by?: string | null
          redo_pricing_override?: number | null
          redo_reason?: string | null
          reminder_24h_sent?: boolean | null
          reminder_2h_sent?: boolean | null
          rescheduled_at?: string | null
          rescheduled_from_date?: string | null
          rescheduled_from_time?: string | null
          service_category?: string | null
          service_id?: string | null
          service_name?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
          start_time: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          tip_amount?: number | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          cancellation_fee_charged?: number | null
          cancellation_fee_status?: string | null
          cancellation_fee_stripe_payment_id?: string | null
          card_on_file_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_notes?: string | null
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit_amount?: number | null
          deposit_applied_to_total?: boolean
          deposit_collected_at?: string | null
          deposit_required?: boolean
          deposit_status?: string | null
          deposit_stripe_payment_id?: string | null
          duration_minutes?: number | null
          end_time?: string
          external_id?: string | null
          id?: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          is_new_client?: boolean | null
          is_redo?: boolean
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          original_appointment_id?: string | null
          original_price?: number | null
          paid_at?: string | null
          payment_failure_reason?: string | null
          payment_method?: string | null
          payment_status?: string
          phorest_client_id?: string | null
          phorest_staff_id?: string | null
          rebook_declined_reason?: string | null
          rebooked_at_checkout?: boolean | null
          recurrence_group_id?: string | null
          recurrence_index?: number | null
          recurrence_rule?: Json | null
          redo_approved_by?: string | null
          redo_pricing_override?: number | null
          redo_reason?: string | null
          reminder_24h_sent?: boolean | null
          reminder_2h_sent?: boolean | null
          rescheduled_at?: string | null
          rescheduled_from_date?: string | null
          rescheduled_from_time?: string | null
          service_category?: string | null
          service_id?: string | null
          service_name?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
          start_time?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
          tip_amount?: number | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_card_on_file_id_fkey"
            columns: ["card_on_file_id"]
            isOneToOne: false
            referencedRelation: "client_cards_on_file"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_original_appointment_id_fkey"
            columns: ["original_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      archived_appointments: {
        Row: {
          appointment_date: string | null
          archived_at: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_notes: string | null
          client_phone: string | null
          created_at: string | null
          duration_minutes: number | null
          end_time: string | null
          external_id: string | null
          id: string
          import_job_id: string | null
          import_source: string | null
          imported_at: string | null
          location_id: string | null
          notes: string | null
          organization_id: string | null
          original_price: number | null
          payment_method: string | null
          rebooked_at_checkout: boolean | null
          service_category: string | null
          service_id: string | null
          service_name: string | null
          staff_name: string | null
          staff_user_id: string | null
          start_time: string | null
          status: string | null
          tip_amount: number | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_date?: string | null
          archived_at?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_notes?: string | null
          client_phone?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          external_id?: string | null
          id: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          original_price?: number | null
          payment_method?: string | null
          rebooked_at_checkout?: boolean | null
          service_category?: string | null
          service_id?: string | null
          service_name?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
          start_time?: string | null
          status?: string | null
          tip_amount?: number | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string | null
          archived_at?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_notes?: string | null
          client_phone?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          external_id?: string | null
          id?: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string | null
          original_price?: number | null
          payment_method?: string | null
          rebooked_at_checkout?: boolean | null
          service_category?: string | null
          service_id?: string | null
          service_name?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
          start_time?: string | null
          status?: string | null
          tip_amount?: number | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      archived_log_summaries: {
        Row: {
          archived_at: string | null
          id: string
          period_end: string
          period_start: string
          summary: Json
        }
        Insert: {
          archived_at?: string | null
          id?: string
          period_end: string
          period_start: string
          summary: Json
        }
        Update: {
          archived_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          summary?: Json
        }
        Relationships: []
      }
      archived_notifications: {
        Row: {
          archived_at: string | null
          created_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          resolved_at: string | null
          severity: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          id: string
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: []
      }
      assistant_assignments: {
        Row: {
          assistant_id: string
          created_at: string
          id: string
          last_assigned_at: string | null
          location_id: string | null
          total_assignments: number | null
        }
        Insert: {
          assistant_id: string
          created_at?: string
          id?: string
          last_assigned_at?: string | null
          location_id?: string | null
          total_assignments?: number | null
        }
        Update: {
          assistant_id?: string
          created_at?: string
          id?: string
          last_assigned_at?: string | null
          location_id?: string | null
          total_assignments?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_requests: {
        Row: {
          accepted_at: string | null
          assigned_at: string | null
          assistant_id: string | null
          client_name: string
          created_at: string
          declined_by: string[] | null
          end_time: string
          id: string
          location_id: string | null
          notes: string | null
          parent_request_id: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          request_date: string
          response_deadline_hours: number | null
          response_time_seconds: number | null
          service_id: string
          start_time: string
          status: string
          stylist_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          assigned_at?: string | null
          assistant_id?: string | null
          client_name: string
          created_at?: string
          declined_by?: string[] | null
          end_time: string
          id?: string
          location_id?: string | null
          notes?: string | null
          parent_request_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          request_date: string
          response_deadline_hours?: number | null
          response_time_seconds?: number | null
          service_id: string
          start_time: string
          status?: string
          stylist_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          assigned_at?: string | null
          assistant_id?: string | null
          client_name?: string
          created_at?: string
          declined_by?: string[] | null
          end_time?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          parent_request_id?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          request_date?: string
          response_deadline_hours?: number | null
          response_time_seconds?: number | null
          service_id?: string
          start_time?: string
          status?: string
          stylist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requests_parent_request_id_fkey"
            columns: ["parent_request_id"]
            isOneToOne: false
            referencedRelation: "assistant_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "salon_services"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_time_blocks: {
        Row: {
          assistant_user_id: string | null
          created_at: string
          created_by: string | null
          date: string
          end_time: string
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          requesting_user_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          assistant_user_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          end_time: string
          id?: string
          location_id: string
          notes?: string | null
          organization_id: string
          requesting_user_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          assistant_user_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          end_time?: string
          id?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          requesting_user_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_time_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_replenishment_events: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          organization_id: string
          product_id: string
          purchase_order_id: string | null
          recommended_qty: number
          status: Database["public"]["Enums"]["replenishment_event_status"]
          supplier_name: string
          trigger_reason: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id: string
          product_id: string
          purchase_order_id?: string | null
          recommended_qty?: number
          status?: Database["public"]["Enums"]["replenishment_event_status"]
          supplier_name: string
          trigger_reason: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string
          product_id?: string
          purchase_order_id?: string | null
          recommended_qty?: number
          status?: Database["public"]["Enums"]["replenishment_event_status"]
          supplier_name?: string
          trigger_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_replenishment_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_replenishment_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_replenishment_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_replenishment_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_replenishment_events_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_replenishment_rules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          location_id: string | null
          max_order_value: number | null
          organization_id: string
          product_id: string | null
          require_approval: boolean
          supplier_preference_id: string | null
          threshold_type: Database["public"]["Enums"]["replenishment_threshold_type"]
          threshold_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          location_id?: string | null
          max_order_value?: number | null
          organization_id: string
          product_id?: string | null
          require_approval?: boolean
          supplier_preference_id?: string | null
          threshold_type?: Database["public"]["Enums"]["replenishment_threshold_type"]
          threshold_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          location_id?: string | null
          max_order_value?: number | null
          organization_id?: string
          product_id?: string | null
          require_approval?: boolean
          supplier_preference_id?: string | null
          threshold_type?: Database["public"]["Enums"]["replenishment_threshold_type"]
          threshold_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_replenishment_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_replenishment_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_replenishment_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_replenishment_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_replenishment_rules_supplier_preference_id_fkey"
            columns: ["supplier_preference_id"]
            isOneToOne: false
            referencedRelation: "supplier_preferences"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_alert_rules: {
        Row: {
          created_at: string
          creates_exception: boolean
          creates_task: boolean
          id: string
          is_active: boolean
          location_id: string | null
          notify_roles: string[]
          organization_id: string
          rule_type: string
          severity: string
          threshold_unit: string
          threshold_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creates_exception?: boolean
          creates_task?: boolean
          id?: string
          is_active?: boolean
          location_id?: string | null
          notify_roles?: string[]
          organization_id: string
          rule_type: string
          severity?: string
          threshold_unit?: string
          threshold_value: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creates_exception?: boolean
          creates_task?: boolean
          id?: string
          is_active?: boolean
          location_id?: string | null
          notify_roles?: string[]
          organization_id?: string
          rule_type?: string
          severity?: string
          threshold_unit?: string
          threshold_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backroom_alert_rules_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backroom_alert_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_analytics_snapshots: {
        Row: {
          actual_depletion: number | null
          avg_chemical_cost_per_service: number | null
          avg_session_duration_minutes: number | null
          bowls_requiring_reweigh: number | null
          bowls_reweighed: number | null
          completed_sessions: number | null
          created_at: string
          ghost_loss_cost: number | null
          ghost_loss_qty: number | null
          id: string
          location_id: string | null
          organization_id: string
          reweigh_compliance_pct: number | null
          sessions_with_variance: number | null
          snapshot_date: string
          staff_metrics: Json | null
          theoretical_depletion: number | null
          total_dispensed_qty: number | null
          total_overage_qty: number | null
          total_product_cost: number | null
          total_service_revenue: number | null
          total_sessions: number | null
          total_underage_qty: number | null
          total_waste_qty: number | null
          waste_by_category: Json | null
          waste_pct: number | null
        }
        Insert: {
          actual_depletion?: number | null
          avg_chemical_cost_per_service?: number | null
          avg_session_duration_minutes?: number | null
          bowls_requiring_reweigh?: number | null
          bowls_reweighed?: number | null
          completed_sessions?: number | null
          created_at?: string
          ghost_loss_cost?: number | null
          ghost_loss_qty?: number | null
          id?: string
          location_id?: string | null
          organization_id: string
          reweigh_compliance_pct?: number | null
          sessions_with_variance?: number | null
          snapshot_date: string
          staff_metrics?: Json | null
          theoretical_depletion?: number | null
          total_dispensed_qty?: number | null
          total_overage_qty?: number | null
          total_product_cost?: number | null
          total_service_revenue?: number | null
          total_sessions?: number | null
          total_underage_qty?: number | null
          total_waste_qty?: number | null
          waste_by_category?: Json | null
          waste_pct?: number | null
        }
        Update: {
          actual_depletion?: number | null
          avg_chemical_cost_per_service?: number | null
          avg_session_duration_minutes?: number | null
          bowls_requiring_reweigh?: number | null
          bowls_reweighed?: number | null
          completed_sessions?: number | null
          created_at?: string
          ghost_loss_cost?: number | null
          ghost_loss_qty?: number | null
          id?: string
          location_id?: string | null
          organization_id?: string
          reweigh_compliance_pct?: number | null
          sessions_with_variance?: number | null
          snapshot_date?: string
          staff_metrics?: Json | null
          theoretical_depletion?: number | null
          total_dispensed_qty?: number | null
          total_overage_qty?: number | null
          total_product_cost?: number | null
          total_service_revenue?: number | null
          total_sessions?: number | null
          total_underage_qty?: number | null
          total_waste_qty?: number | null
          waste_by_category?: Json | null
          waste_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backroom_analytics_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_billing_settings: {
        Row: {
          created_at: string
          default_product_markup_pct: number
          enable_supply_cost_recovery: boolean
          id: string
          organization_id: string
          product_charge_label: string
          product_charge_taxable: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          default_product_markup_pct?: number
          enable_supply_cost_recovery?: boolean
          id?: string
          organization_id: string
          product_charge_label?: string
          product_charge_taxable?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          default_product_markup_pct?: number
          enable_supply_cost_recovery?: boolean
          id?: string
          organization_id?: string
          product_charge_label?: string
          product_charge_taxable?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backroom_billing_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_coach_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          coach_user_id: string
          id: string
          is_primary: boolean
          organization_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          coach_user_id: string
          id?: string
          is_primary?: boolean
          organization_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          coach_user_id?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backroom_coach_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_compliance_log: {
        Row: {
          appointment_date: string
          appointment_id: string
          compliance_status: string
          evaluated_at: string
          has_mix_session: boolean
          has_reweigh: boolean
          id: string
          is_manual_override: boolean
          location_id: string | null
          mix_session_id: string | null
          notes: string | null
          organization_id: string
          service_name: string | null
          staff_name: string | null
          staff_user_id: string | null
        }
        Insert: {
          appointment_date: string
          appointment_id: string
          compliance_status?: string
          evaluated_at?: string
          has_mix_session?: boolean
          has_reweigh?: boolean
          id?: string
          is_manual_override?: boolean
          location_id?: string | null
          mix_session_id?: string | null
          notes?: string | null
          organization_id: string
          service_name?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_id?: string
          compliance_status?: string
          evaluated_at?: string
          has_mix_session?: boolean
          has_reweigh?: boolean
          id?: string
          is_manual_override?: boolean
          location_id?: string | null
          mix_session_id?: string | null
          notes?: string | null
          organization_id?: string
          service_name?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backroom_compliance_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backroom_compliance_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_devices: {
        Row: {
          connection_type: string
          created_at: string
          device_name: string
          device_type: string
          id: string
          is_paired: boolean
          last_seen_at: string | null
          location_id: string
          organization_id: string
          paired_station_id: string | null
          serial_number: string | null
        }
        Insert: {
          connection_type?: string
          created_at?: string
          device_name: string
          device_type?: string
          id?: string
          is_paired?: boolean
          last_seen_at?: string | null
          location_id: string
          organization_id: string
          paired_station_id?: string | null
          serial_number?: string | null
        }
        Update: {
          connection_type?: string
          created_at?: string
          device_name?: string
          device_type?: string
          id?: string
          is_paired?: boolean
          last_seen_at?: string | null
          location_id?: string
          organization_id?: string
          paired_station_id?: string | null
          serial_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backroom_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backroom_devices_paired_station_id_fkey"
            columns: ["paired_station_id"]
            isOneToOne: false
            referencedRelation: "backroom_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_exceptions: {
        Row: {
          created_at: string
          description: string | null
          exception_type: string
          id: string
          location_id: string | null
          metric_value: number | null
          organization_id: string
          reference_id: string | null
          reference_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_notes: string | null
          severity: string
          staff_user_id: string | null
          status: string
          threshold_value: number | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          exception_type: string
          id?: string
          location_id?: string | null
          metric_value?: number | null
          organization_id: string
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_notes?: string | null
          severity?: string
          staff_user_id?: string | null
          status?: string
          threshold_value?: number | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          exception_type?: string
          id?: string
          location_id?: string | null
          metric_value?: number | null
          organization_id?: string
          reference_id?: string | null
          reference_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_notes?: string | null
          severity?: string
          staff_user_id?: string | null
          status?: string
          threshold_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "backroom_exceptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_location_entitlements: {
        Row: {
          activated_at: string
          activated_by: string | null
          billing_interval: string | null
          created_at: string
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          plan_tier: string
          prior_refund_count: number
          refund_eligible_until: string | null
          refunded_at: string | null
          refunded_by: string | null
          scale_count: number
          status: string
          stripe_subscription_id: string | null
          trial_end_date: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string
          activated_by?: string | null
          billing_interval?: string | null
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          organization_id: string
          plan_tier?: string
          prior_refund_count?: number
          refund_eligible_until?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          scale_count?: number
          status?: string
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string
          activated_by?: string | null
          billing_interval?: string | null
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          plan_tier?: string
          prior_refund_count?: number
          refund_eligible_until?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          scale_count?: number
          status?: string
          stripe_subscription_id?: string | null
          trial_end_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backroom_location_entitlements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backroom_location_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_pricing_display_rules: {
        Row: {
          allow_edit: boolean
          allow_waive: boolean
          apply_tax: boolean
          auto_insert_checkout: boolean
          created_at: string
          display_mode: string
          id: string
          line_item_label: string
          organization_id: string
          requires_manager_approval: boolean
          service_id: string | null
          show_usage_to_client: boolean
          show_usage_to_staff: boolean
          updated_at: string
        }
        Insert: {
          allow_edit?: boolean
          allow_waive?: boolean
          apply_tax?: boolean
          auto_insert_checkout?: boolean
          created_at?: string
          display_mode?: string
          id?: string
          line_item_label?: string
          organization_id: string
          requires_manager_approval?: boolean
          service_id?: string | null
          show_usage_to_client?: boolean
          show_usage_to_staff?: boolean
          updated_at?: string
        }
        Update: {
          allow_edit?: boolean
          allow_waive?: boolean
          apply_tax?: boolean
          auto_insert_checkout?: boolean
          created_at?: string
          display_mode?: string
          id?: string
          line_item_label?: string
          organization_id?: string
          requires_manager_approval?: boolean
          service_id?: string | null
          show_usage_to_client?: boolean
          show_usage_to_staff?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backroom_pricing_display_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backroom_pricing_display_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_settings: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          organization_id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backroom_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backroom_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backroom_stations: {
        Row: {
          assigned_device_id: string | null
          assigned_scale_id: string | null
          connection_type: string
          created_at: string
          device_name: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          location_id: string
          organization_id: string
          pairing_code: string | null
          scale_model: string | null
          station_name: string
          updated_at: string
        }
        Insert: {
          assigned_device_id?: string | null
          assigned_scale_id?: string | null
          connection_type?: string
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          location_id: string
          organization_id: string
          pairing_code?: string | null
          scale_model?: string | null
          station_name: string
          updated_at?: string
        }
        Update: {
          assigned_device_id?: string | null
          assigned_scale_id?: string | null
          connection_type?: string
          created_at?: string
          device_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          location_id?: string
          organization_id?: string
          pairing_code?: string | null
          scale_model?: string | null
          station_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backroom_stations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_transactions: {
        Row: {
          amount: number
          balance_type: string
          client_id: string
          created_at: string | null
          id: string
          issued_by: string | null
          notes: string | null
          organization_id: string
          reference_transaction_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_type: string
          client_id: string
          created_at?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          organization_id: string
          reference_transaction_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_type?: string
          client_id?: string
          created_at?: string | null
          id?: string
          issued_by?: string | null
          notes?: string | null
          organization_id?: string
          reference_transaction_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bell_entry_high_fives: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bell_entry_high_fives_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "ring_the_bell_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_changes: {
        Row: {
          change_type: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          new_value: Json | null
          notes: string | null
          organization_id: string
          previous_value: Json | null
          proration_amount: number | null
        }
        Insert: {
          change_type: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          organization_id: string
          previous_value?: Json | null
          proration_amount?: number | null
        }
        Update: {
          change_type?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          new_value?: Json | null
          notes?: string | null
          organization_id?: string
          previous_value?: Json | null
          proration_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_changes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_addon_events: {
        Row: {
          addon_cost: number | null
          addon_id: string
          addon_name: string
          addon_price: number
          appointment_id: string | null
          created_at: string
          id: string
          organization_id: string
          staff_user_id: string
          status: string
        }
        Insert: {
          addon_cost?: number | null
          addon_id: string
          addon_name: string
          addon_price?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          staff_user_id: string
          status?: string
        }
        Update: {
          addon_cost?: number | null
          addon_id?: string
          addon_name?: string
          addon_price?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          staff_user_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_addon_events_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "service_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_addon_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "phorest_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_addon_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_patterns: {
        Row: {
          analyzed_at: string | null
          avg_bookings: number | null
          day_of_week: number | null
          hour_of_day: number | null
          id: string
          location_id: string | null
          organization_id: string | null
          peak_score: number | null
          total_samples: number | null
        }
        Insert: {
          analyzed_at?: string | null
          avg_bookings?: number | null
          day_of_week?: number | null
          hour_of_day?: number | null
          id?: string
          location_id?: string | null
          organization_id?: string | null
          peak_score?: number | null
          total_samples?: number | null
        }
        Update: {
          analyzed_at?: string | null
          avg_bookings?: number | null
          day_of_week?: number | null
          hour_of_day?: number | null
          id?: string
          location_id?: string | null
          organization_id?: string | null
          peak_score?: number | null
          total_samples?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booth_rental_contracts: {
        Row: {
          additional_terms: Json | null
          auto_renew: boolean | null
          booth_renter_id: string
          contract_name: string
          contract_type: string | null
          created_at: string | null
          document_url: string | null
          due_day_of_month: number | null
          due_day_of_week: number | null
          end_date: string | null
          id: string
          includes_products: boolean | null
          includes_utilities: boolean | null
          includes_wifi: boolean | null
          notice_period_days: number | null
          organization_id: string
          pandadoc_document_id: string | null
          pandadoc_status: string | null
          rent_amount: number
          rent_frequency: string
          retail_commission_enabled: boolean | null
          retail_commission_rate: number | null
          security_deposit: number | null
          security_deposit_paid: boolean | null
          signed_at: string | null
          start_date: string
          status: string | null
          terminated_at: string | null
          termination_reason: string | null
          updated_at: string | null
        }
        Insert: {
          additional_terms?: Json | null
          auto_renew?: boolean | null
          booth_renter_id: string
          contract_name: string
          contract_type?: string | null
          created_at?: string | null
          document_url?: string | null
          due_day_of_month?: number | null
          due_day_of_week?: number | null
          end_date?: string | null
          id?: string
          includes_products?: boolean | null
          includes_utilities?: boolean | null
          includes_wifi?: boolean | null
          notice_period_days?: number | null
          organization_id: string
          pandadoc_document_id?: string | null
          pandadoc_status?: string | null
          rent_amount: number
          rent_frequency: string
          retail_commission_enabled?: boolean | null
          retail_commission_rate?: number | null
          security_deposit?: number | null
          security_deposit_paid?: boolean | null
          signed_at?: string | null
          start_date: string
          status?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_terms?: Json | null
          auto_renew?: boolean | null
          booth_renter_id?: string
          contract_name?: string
          contract_type?: string | null
          created_at?: string | null
          document_url?: string | null
          due_day_of_month?: number | null
          due_day_of_week?: number | null
          end_date?: string | null
          id?: string
          includes_products?: boolean | null
          includes_utilities?: boolean | null
          includes_wifi?: boolean | null
          notice_period_days?: number | null
          organization_id?: string
          pandadoc_document_id?: string | null
          pandadoc_status?: string | null
          rent_amount?: number
          rent_frequency?: string
          retail_commission_enabled?: boolean | null
          retail_commission_rate?: number | null
          security_deposit?: number | null
          security_deposit_paid?: boolean | null
          signed_at?: string | null
          start_date?: string
          status?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booth_rental_contracts_booth_renter_id_fkey"
            columns: ["booth_renter_id"]
            isOneToOne: false
            referencedRelation: "booth_renter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booth_rental_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booth_renter_profiles: {
        Row: {
          billing_address: Json | null
          billing_email: string | null
          billing_phone: string | null
          business_license_number: string | null
          business_name: string | null
          created_at: string | null
          ein_number: string | null
          end_date: string | null
          id: string
          insurance_document_url: string | null
          insurance_expiry_date: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          insurance_verified: boolean | null
          insurance_verified_at: string | null
          insurance_verified_by: string | null
          license_state: string | null
          onboarding_complete: boolean | null
          organization_id: string
          start_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_address?: Json | null
          billing_email?: string | null
          billing_phone?: string | null
          business_license_number?: string | null
          business_name?: string | null
          created_at?: string | null
          ein_number?: string | null
          end_date?: string | null
          id?: string
          insurance_document_url?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          insurance_verified?: boolean | null
          insurance_verified_at?: string | null
          insurance_verified_by?: string | null
          license_state?: string | null
          onboarding_complete?: boolean | null
          organization_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_address?: Json | null
          billing_email?: string | null
          billing_phone?: string | null
          business_license_number?: string | null
          business_name?: string | null
          created_at?: string | null
          ein_number?: string | null
          end_date?: string | null
          id?: string
          insurance_document_url?: string | null
          insurance_expiry_date?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          insurance_verified?: boolean | null
          insurance_verified_at?: string | null
          insurance_verified_by?: string | null
          license_state?: string | null
          onboarding_complete?: boolean | null
          organization_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booth_renter_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      build_tasks: {
        Row: {
          blocked_by: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          notes: string[] | null
          priority: string
          sort_order: number | null
          status: string
          task_key: string
          title: string
          updated_at: string
        }
        Insert: {
          blocked_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string[] | null
          priority?: string
          sort_order?: number | null
          status?: string
          task_key: string
          title: string
          updated_at?: string
        }
        Update: {
          blocked_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          notes?: string[] | null
          priority?: string
          sort_order?: number | null
          status?: string
          task_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_card_requests: {
        Row: {
          design_style: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          design_style: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          design_style?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          business_name: string
          city: string | null
          created_at: string
          default_tax_rate: number | null
          ein: string | null
          email: string | null
          icon_dark_url: string | null
          icon_light_url: string | null
          id: string
          legal_name: string | null
          logo_dark_url: string | null
          logo_light_url: string | null
          mailing_address: string | null
          phone: string | null
          sidebar_layout: Json | null
          state: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          business_name?: string
          city?: string | null
          created_at?: string
          default_tax_rate?: number | null
          ein?: string | null
          email?: string | null
          icon_dark_url?: string | null
          icon_light_url?: string | null
          id?: string
          legal_name?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          mailing_address?: string | null
          phone?: string | null
          sidebar_layout?: Json | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          business_name?: string
          city?: string | null
          created_at?: string
          default_tax_rate?: number | null
          ein?: string | null
          email?: string | null
          icon_dark_url?: string | null
          icon_light_url?: string | null
          id?: string
          legal_name?: string | null
          logo_dark_url?: string | null
          logo_light_url?: string | null
          mailing_address?: string | null
          phone?: string | null
          sidebar_layout?: Json | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      calendar_feed_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_preferences: {
        Row: {
          color_by: string | null
          created_at: string | null
          default_location_id: string | null
          default_view: string | null
          hours_end: number | null
          hours_start: number | null
          id: string
          show_cancelled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color_by?: string | null
          created_at?: string | null
          default_location_id?: string | null
          default_view?: string | null
          hours_end?: number | null
          hours_start?: number | null
          id?: string
          show_cancelled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color_by?: string | null
          created_at?: string | null
          default_location_id?: string | null
          default_view?: string | null
          hours_end?: number | null
          hours_start?: number | null
          id?: string
          show_cancelled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_preferences_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      calendar_theme_settings: {
        Row: {
          calendar_bg_color: string
          cell_border_color: string
          cell_border_style: string
          cell_border_width: number
          created_at: string
          current_time_color: string
          days_row_bg_color: string
          days_row_text_color: string
          half_hour_line_color: string
          header_bg_color: string
          header_text_color: string
          hour_line_color: string
          id: string
          outside_month_bg_color: string
          quarter_hour_line_color: string
          today_badge_bg_color: string
          today_badge_text_color: string
          today_highlight_color: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_bg_color?: string
          cell_border_color?: string
          cell_border_style?: string
          cell_border_width?: number
          created_at?: string
          current_time_color?: string
          days_row_bg_color?: string
          days_row_text_color?: string
          half_hour_line_color?: string
          header_bg_color?: string
          header_text_color?: string
          hour_line_color?: string
          id?: string
          outside_month_bg_color?: string
          quarter_hour_line_color?: string
          today_badge_bg_color?: string
          today_badge_text_color?: string
          today_highlight_color?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_bg_color?: string
          cell_border_color?: string
          cell_border_style?: string
          cell_border_width?: number
          created_at?: string
          current_time_color?: string
          days_row_bg_color?: string
          days_row_text_color?: string
          half_hour_line_color?: string
          header_bg_color?: string
          header_text_color?: string
          hour_line_color?: string
          id?: string
          outside_month_bg_color?: string
          quarter_hour_line_color?: string
          today_badge_bg_color?: string
          today_badge_text_color?: string
          today_highlight_color?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cancellation_fee_policies: {
        Row: {
          applies_to_new_clients_only: boolean
          created_at: string
          fee_amount: number
          fee_type: string
          id: string
          is_active: boolean
          min_notice_hours: number | null
          organization_id: string
          policy_type: string
          updated_at: string
        }
        Insert: {
          applies_to_new_clients_only?: boolean
          created_at?: string
          fee_amount?: number
          fee_type?: string
          id?: string
          is_active?: boolean
          min_notice_hours?: number | null
          organization_id: string
          policy_type: string
          updated_at?: string
        }
        Update: {
          applies_to_new_clients_only?: boolean
          created_at?: string
          fee_amount?: number
          fee_type?: string
          id?: string
          is_active?: boolean
          min_notice_hours?: number | null
          organization_id?: string
          policy_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_fee_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_content: {
        Row: {
          content_key: string
          content_type: string
          created_at: string | null
          id: string
          last_synced_at: string | null
          organization_id: string
          source: string | null
          updated_at: string | null
          value: Json
        }
        Insert: {
          content_key: string
          content_type?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id: string
          source?: string | null
          updated_at?: string | null
          value?: Json
        }
        Update: {
          content_key?: string
          content_type?: string
          created_at?: string | null
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          source?: string | null
          updated_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "canonical_content_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_event_log: {
        Row: {
          created_at: string
          event_type: string
          funding_opportunity_id: string | null
          funding_project_id: string | null
          id: string
          metadata_json: Json | null
          opportunity_id: string | null
          organization_id: string
          surface_area: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          funding_opportunity_id?: string | null
          funding_project_id?: string | null
          id?: string
          metadata_json?: Json | null
          opportunity_id?: string | null
          organization_id: string
          surface_area?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          funding_opportunity_id?: string | null
          funding_project_id?: string | null
          id?: string
          metadata_json?: Json | null
          opportunity_id?: string | null
          organization_id?: string
          surface_area?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_event_log_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "expansion_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_event_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_funding_opportunities: {
        Row: {
          break_even_months_expected: number
          break_even_months_high: number
          break_even_months_low: number
          business_value_score: number | null
          campaign_id: string | null
          confidence_score: number
          constraint_type: string | null
          coverage_ratio: number | null
          created_at: string
          created_by_system: boolean
          detected_at: string
          effort_score: number | null
          eligibility_status: string
          expires_at: string | null
          funded_at: string | null
          funding_provider: string | null
          id: string
          initiated_at: string | null
          location_id: string | null
          momentum_score: number | null
          net_monthly_gain_expected_cents: number | null
          operational_stability_score: number | null
          opportunity_type: string
          organization_id: string
          predicted_booking_lift_expected: number
          predicted_booking_lift_high: number
          predicted_booking_lift_low: number
          predicted_revenue_lift_expected_cents: number
          predicted_revenue_lift_high_cents: number
          predicted_revenue_lift_low_cents: number
          provider_estimated_payment_cents: number | null
          provider_fees_summary: string | null
          provider_offer_amount_cents: number | null
          provider_offer_details: Json | null
          provider_offer_id: string | null
          provider_offer_term_months: number | null
          reason_code: string | null
          reason_summary: string | null
          recommended_action_label: string
          required_investment_cents: number
          risk_level: string
          roe_score: number
          service_id: string | null
          source_opportunity_id: string | null
          source_opportunity_type: string | null
          status: string
          stripe_offer_available: boolean
          stripe_offer_id: string | null
          stylist_id: string | null
          summary: string
          surface_priority: number
          surfaced_at: string | null
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          break_even_months_expected?: number
          break_even_months_high?: number
          break_even_months_low?: number
          business_value_score?: number | null
          campaign_id?: string | null
          confidence_score?: number
          constraint_type?: string | null
          coverage_ratio?: number | null
          created_at?: string
          created_by_system?: boolean
          detected_at?: string
          effort_score?: number | null
          eligibility_status?: string
          expires_at?: string | null
          funded_at?: string | null
          funding_provider?: string | null
          id?: string
          initiated_at?: string | null
          location_id?: string | null
          momentum_score?: number | null
          net_monthly_gain_expected_cents?: number | null
          operational_stability_score?: number | null
          opportunity_type: string
          organization_id: string
          predicted_booking_lift_expected?: number
          predicted_booking_lift_high?: number
          predicted_booking_lift_low?: number
          predicted_revenue_lift_expected_cents?: number
          predicted_revenue_lift_high_cents?: number
          predicted_revenue_lift_low_cents?: number
          provider_estimated_payment_cents?: number | null
          provider_fees_summary?: string | null
          provider_offer_amount_cents?: number | null
          provider_offer_details?: Json | null
          provider_offer_id?: string | null
          provider_offer_term_months?: number | null
          reason_code?: string | null
          reason_summary?: string | null
          recommended_action_label?: string
          required_investment_cents: number
          risk_level?: string
          roe_score?: number
          service_id?: string | null
          source_opportunity_id?: string | null
          source_opportunity_type?: string | null
          status?: string
          stripe_offer_available?: boolean
          stripe_offer_id?: string | null
          stylist_id?: string | null
          summary?: string
          surface_priority?: number
          surfaced_at?: string | null
          title: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          break_even_months_expected?: number
          break_even_months_high?: number
          break_even_months_low?: number
          business_value_score?: number | null
          campaign_id?: string | null
          confidence_score?: number
          constraint_type?: string | null
          coverage_ratio?: number | null
          created_at?: string
          created_by_system?: boolean
          detected_at?: string
          effort_score?: number | null
          eligibility_status?: string
          expires_at?: string | null
          funded_at?: string | null
          funding_provider?: string | null
          id?: string
          initiated_at?: string | null
          location_id?: string | null
          momentum_score?: number | null
          net_monthly_gain_expected_cents?: number | null
          operational_stability_score?: number | null
          opportunity_type?: string
          organization_id?: string
          predicted_booking_lift_expected?: number
          predicted_booking_lift_high?: number
          predicted_booking_lift_low?: number
          predicted_revenue_lift_expected_cents?: number
          predicted_revenue_lift_high_cents?: number
          predicted_revenue_lift_low_cents?: number
          provider_estimated_payment_cents?: number | null
          provider_fees_summary?: string | null
          provider_offer_amount_cents?: number | null
          provider_offer_details?: Json | null
          provider_offer_id?: string | null
          provider_offer_term_months?: number | null
          reason_code?: string | null
          reason_summary?: string | null
          recommended_action_label?: string
          required_investment_cents?: number
          risk_level?: string
          roe_score?: number
          service_id?: string | null
          source_opportunity_id?: string | null
          source_opportunity_type?: string | null
          status?: string
          stripe_offer_available?: boolean
          stripe_offer_id?: string | null
          stylist_id?: string | null
          summary?: string
          surface_priority?: number
          surfaced_at?: string | null
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_funding_opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_funding_projects: {
        Row: {
          activation_status: string
          actual_monthly_payment_cents: number | null
          actual_total_repayment_to_date_cents: number
          break_even_progress_percent: number
          coverage_ratio: number
          created_at: string
          estimated_total_repayment_cents: number | null
          expected_monthly_payment_cents: number | null
          funded_amount_cents: number
          funding_opportunity_id: string
          funding_start_date: string
          id: string
          last_synced_at: string | null
          organization_id: string
          predicted_revenue_to_date_cents: number
          provider: string
          provider_offer_id: string | null
          repayment_progress_percent: number
          repayment_status: string
          required_investment_cents: number
          revenue_generated_to_date_cents: number
          roi_to_date: number | null
          status: string
          updated_at: string
          variance_percent: number | null
        }
        Insert: {
          activation_status?: string
          actual_monthly_payment_cents?: number | null
          actual_total_repayment_to_date_cents?: number
          break_even_progress_percent?: number
          coverage_ratio?: number
          created_at?: string
          estimated_total_repayment_cents?: number | null
          expected_monthly_payment_cents?: number | null
          funded_amount_cents: number
          funding_opportunity_id: string
          funding_start_date?: string
          id?: string
          last_synced_at?: string | null
          organization_id: string
          predicted_revenue_to_date_cents?: number
          provider?: string
          provider_offer_id?: string | null
          repayment_progress_percent?: number
          repayment_status?: string
          required_investment_cents: number
          revenue_generated_to_date_cents?: number
          roi_to_date?: number | null
          status?: string
          updated_at?: string
          variance_percent?: number | null
        }
        Update: {
          activation_status?: string
          actual_monthly_payment_cents?: number | null
          actual_total_repayment_to_date_cents?: number
          break_even_progress_percent?: number
          coverage_ratio?: number
          created_at?: string
          estimated_total_repayment_cents?: number | null
          expected_monthly_payment_cents?: number | null
          funded_amount_cents?: number
          funding_opportunity_id?: string
          funding_start_date?: string
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          predicted_revenue_to_date_cents?: number
          provider?: string
          provider_offer_id?: string | null
          repayment_progress_percent?: number
          repayment_status?: string
          required_investment_cents?: number
          revenue_generated_to_date_cents?: number
          roi_to_date?: number | null
          status?: string
          updated_at?: string
          variance_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_funding_projects_funding_opportunity_id_fkey"
            columns: ["funding_opportunity_id"]
            isOneToOne: false
            referencedRelation: "capital_funding_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_funding_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_offer_snapshots: {
        Row: {
          created_at: string
          eligible: boolean
          estimated_payment_amount: number | null
          expires_at: string | null
          fees_summary: string | null
          fetched_at: string
          id: string
          offered_amount: number | null
          opportunity_id: string
          organization_id: string
          provider: string
          provider_offer_id: string | null
          raw_snapshot_json: Json | null
          repayment_model: string | null
          term_length: number | null
        }
        Insert: {
          created_at?: string
          eligible?: boolean
          estimated_payment_amount?: number | null
          expires_at?: string | null
          fees_summary?: string | null
          fetched_at?: string
          id?: string
          offered_amount?: number | null
          opportunity_id: string
          organization_id: string
          provider?: string
          provider_offer_id?: string | null
          raw_snapshot_json?: Json | null
          repayment_model?: string | null
          term_length?: number | null
        }
        Update: {
          created_at?: string
          eligible?: boolean
          estimated_payment_amount?: number | null
          expires_at?: string | null
          fees_summary?: string | null
          fetched_at?: string
          id?: string
          offered_amount?: number | null
          opportunity_id?: string
          organization_id?: string
          provider?: string
          provider_offer_id?: string | null
          raw_snapshot_json?: Json | null
          repayment_model?: string | null
          term_length?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_offer_snapshots_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "expansion_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_offer_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_policy_settings: {
        Row: {
          allow_manager_initiation: boolean
          allow_stylist_microfunding: boolean
          confidence_threshold: number
          cooldown_after_decline_days: number
          cooldown_after_underperformance_days: number
          created_at: string
          id: string
          max_concurrent_projects: number
          max_exposure_cents: number | null
          max_risk_level: string
          organization_id: string | null
          roe_threshold: number
          stylist_ors_threshold: number
          stylist_spi_threshold: number
          updated_at: string
        }
        Insert: {
          allow_manager_initiation?: boolean
          allow_stylist_microfunding?: boolean
          confidence_threshold?: number
          cooldown_after_decline_days?: number
          cooldown_after_underperformance_days?: number
          created_at?: string
          id?: string
          max_concurrent_projects?: number
          max_exposure_cents?: number | null
          max_risk_level?: string
          organization_id?: string | null
          roe_threshold?: number
          stylist_ors_threshold?: number
          stylist_spi_threshold?: number
          updated_at?: string
        }
        Update: {
          allow_manager_initiation?: boolean
          allow_stylist_microfunding?: boolean
          confidence_threshold?: number
          cooldown_after_decline_days?: number
          cooldown_after_underperformance_days?: number
          created_at?: string
          id?: string
          max_concurrent_projects?: number
          max_exposure_cents?: number | null
          max_risk_level?: string
          organization_id?: string | null
          roe_threshold?: number
          stylist_ors_threshold?: number
          stylist_spi_threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_policy_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_provider_offers: {
        Row: {
          apr_text: string | null
          created_at: string
          eligible: boolean
          estimated_payment_cents: number | null
          estimated_total_repayment_cents: number | null
          expires_at: string | null
          fees_summary: string | null
          fetched_at: string
          funding_opportunity_id: string
          id: string
          offered_amount_cents: number | null
          organization_id: string
          provider: string
          provider_offer_id: string
          raw_snapshot_json: Json
          repayment_model: string | null
          term_length_months: number | null
        }
        Insert: {
          apr_text?: string | null
          created_at?: string
          eligible?: boolean
          estimated_payment_cents?: number | null
          estimated_total_repayment_cents?: number | null
          expires_at?: string | null
          fees_summary?: string | null
          fetched_at?: string
          funding_opportunity_id: string
          id?: string
          offered_amount_cents?: number | null
          organization_id: string
          provider?: string
          provider_offer_id: string
          raw_snapshot_json?: Json
          repayment_model?: string | null
          term_length_months?: number | null
        }
        Update: {
          apr_text?: string | null
          created_at?: string
          eligible?: boolean
          estimated_payment_cents?: number | null
          estimated_total_repayment_cents?: number | null
          expires_at?: string | null
          fees_summary?: string | null
          fetched_at?: string
          funding_opportunity_id?: string
          id?: string
          offered_amount_cents?: number | null
          organization_id?: string
          provider?: string
          provider_offer_id?: string
          raw_snapshot_json?: Json
          repayment_model?: string | null
          term_length_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_provider_offers_funding_opportunity_id_fkey"
            columns: ["funding_opportunity_id"]
            isOneToOne: false
            referencedRelation: "capital_funding_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_provider_offers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_surface_state: {
        Row: {
          cooldown_until: string | null
          created_at: string
          dismiss_reason: string | null
          dismissed_at: string | null
          funding_opportunity_id: string
          id: string
          last_shown_at: string | null
          organization_id: string
          show_count: number
          surface_area: string
          updated_at: string
        }
        Insert: {
          cooldown_until?: string | null
          created_at?: string
          dismiss_reason?: string | null
          dismissed_at?: string | null
          funding_opportunity_id: string
          id?: string
          last_shown_at?: string | null
          organization_id: string
          show_count?: number
          surface_area: string
          updated_at?: string
        }
        Update: {
          cooldown_until?: string | null
          created_at?: string
          dismiss_reason?: string | null
          dismissed_at?: string | null
          funding_opportunity_id?: string
          id?: string
          last_shown_at?: string | null
          organization_id?: string
          show_count?: number
          surface_area?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_surface_state_funding_opportunity_id_fkey"
            columns: ["funding_opportunity_id"]
            isOneToOne: false
            referencedRelation: "capital_funding_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_surface_state_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          current_value: number | null
          id: string
          joined_at: string | null
          location_id: string | null
          rank: number | null
          team_name: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id: string
          current_value?: number | null
          id?: string
          joined_at?: string | null
          location_id?: string | null
          rank?: number | null
          team_name?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string
          current_value?: number | null
          id?: string
          joined_at?: string | null
          location_id?: string | null
          rank?: number | null
          team_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "team_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress_snapshots: {
        Row: {
          challenge_id: string
          created_at: string | null
          id: string
          participant_id: string
          snapshot_date: string
          value_at_snapshot: number
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          id?: string
          participant_id: string
          snapshot_date: string
          value_at_snapshot: number
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          id?: string
          participant_id?: string
          snapshot_date?: string
          value_at_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_snapshots_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "team_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_progress_snapshots_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "challenge_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_entries: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          entry_type: string
          id: string
          is_major: boolean | null
          notification_sent: boolean | null
          published_at: string | null
          release_date: string | null
          scheduled_publish_at: string | null
          send_as_announcement: boolean | null
          send_as_notification: boolean | null
          sort_order: number | null
          status: string
          target_roles: string[] | null
          title: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          entry_type?: string
          id?: string
          is_major?: boolean | null
          notification_sent?: boolean | null
          published_at?: string | null
          release_date?: string | null
          scheduled_publish_at?: string | null
          send_as_announcement?: boolean | null
          send_as_notification?: boolean | null
          sort_order?: number | null
          status?: string
          target_roles?: string[] | null
          title: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          entry_type?: string
          id?: string
          is_major?: boolean | null
          notification_sent?: boolean | null
          published_at?: string | null
          release_date?: string | null
          scheduled_publish_at?: string | null
          send_as_announcement?: boolean | null
          send_as_notification?: boolean | null
          sort_order?: number | null
          status?: string
          target_roles?: string[] | null
          title?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      changelog_reads: {
        Row: {
          changelog_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          changelog_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          changelog_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_reads_changelog_id_fkey"
            columns: ["changelog_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_votes: {
        Row: {
          changelog_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          changelog_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          changelog_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_votes_changelog_id_fkey"
            columns: ["changelog_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          channel_id: string
          id: string
          is_hidden: boolean | null
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
          muted_until: string | null
          role: Database["public"]["Enums"]["chat_member_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          is_hidden?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          muted_until?: string | null
          role?: Database["public"]["Enums"]["chat_member_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          is_hidden?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          muted_until?: string | null
          role?: Database["public"]["Enums"]["chat_member_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channel_members_employee_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          is_system: boolean | null
          location_id: string | null
          name: string
          organization_id: string | null
          section_id: string | null
          type: Database["public"]["Enums"]["chat_channel_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_system?: boolean | null
          location_id?: string | null
          name: string
          organization_id?: string | null
          section_id?: string | null
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          is_system?: boolean | null
          location_id?: string | null
          name?: string
          organization_id?: string | null
          section_id?: string | null
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "chat_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          content_html: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          metadata: Json | null
          parent_message_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          channel_id: string
          content: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          metadata?: Json | null
          parent_message_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          channel_id?: string
          content?: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          metadata?: Json | null
          parent_message_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_employee_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_permissions: {
        Row: {
          created_at: string
          id: string
          is_allowed: boolean
          organization_id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          organization_id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_allowed?: boolean
          organization_id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_pinned_messages: {
        Row: {
          channel_id: string
          id: string
          message_id: string
          pinned_at: string | null
          pinned_by: string | null
        }
        Insert: {
          channel_id: string
          id?: string
          message_id: string
          pinned_at?: string | null
          pinned_by?: string | null
        }
        Update: {
          channel_id?: string
          id?: string
          message_id?: string
          pinned_at?: string | null
          pinned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_pinned_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sections: {
        Row: {
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_smart_actions: {
        Row: {
          action_type: string
          channel_id: string
          confidence: number
          created_at: string | null
          detected_intent: string
          expires_at: string | null
          extracted_data: Json | null
          id: string
          linked_action_id: string | null
          linked_action_type: string | null
          message_id: string
          organization_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          sender_id: string
          status: string | null
          target_user_id: string
        }
        Insert: {
          action_type: string
          channel_id: string
          confidence: number
          created_at?: string | null
          detected_intent: string
          expires_at?: string | null
          extracted_data?: Json | null
          id?: string
          linked_action_id?: string | null
          linked_action_type?: string | null
          message_id: string
          organization_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_id: string
          status?: string | null
          target_user_id: string
        }
        Update: {
          action_type?: string
          channel_id?: string
          confidence?: number
          created_at?: string | null
          detected_intent?: string
          expires_at?: string | null
          extracted_data?: Json | null
          id?: string
          linked_action_id?: string | null
          linked_action_type?: string | null
          message_id?: string
          organization_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sender_id?: string
          status?: string | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_smart_actions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_smart_actions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_smart_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_user_status: {
        Row: {
          status: Database["public"]["Enums"]["chat_user_status_type"] | null
          status_expires_at: string | null
          status_message: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          status?: Database["public"]["Enums"]["chat_user_status_type"] | null
          status_expires_at?: string | null
          status_message?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          status?: Database["public"]["Enums"]["chat_user_status_type"] | null
          status_expires_at?: string | null
          status_message?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      checkout_usage_charges: {
        Row: {
          actual_usage_qty: number
          applied_at: string | null
          appointment_id: string
          approved_by: string | null
          charge_amount: number
          charge_type: string
          created_at: string
          id: string
          included_allowance_qty: number
          mix_session_id: string
          organization_id: string
          overage_qty: number
          overage_rate: number
          policy_id: string | null
          product_charge_markup_pct: number | null
          product_wholesale_cost: number | null
          service_name: string | null
          status: string
          updated_at: string
          waived_by: string | null
          waived_reason: string | null
        }
        Insert: {
          actual_usage_qty: number
          applied_at?: string | null
          appointment_id: string
          approved_by?: string | null
          charge_amount: number
          charge_type?: string
          created_at?: string
          id?: string
          included_allowance_qty: number
          mix_session_id: string
          organization_id: string
          overage_qty: number
          overage_rate: number
          policy_id?: string | null
          product_charge_markup_pct?: number | null
          product_wholesale_cost?: number | null
          service_name?: string | null
          status?: string
          updated_at?: string
          waived_by?: string | null
          waived_reason?: string | null
        }
        Update: {
          actual_usage_qty?: number
          applied_at?: string | null
          appointment_id?: string
          approved_by?: string | null
          charge_amount?: number
          charge_type?: string
          created_at?: string
          id?: string
          included_allowance_qty?: number
          mix_session_id?: string
          organization_id?: string
          overage_qty?: number
          overage_rate?: number
          policy_id?: string | null
          product_charge_markup_pct?: number | null
          product_wholesale_cost?: number | null
          service_name?: string | null
          status?: string
          updated_at?: string
          waived_by?: string | null
          waived_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_usage_charges_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_usage_charges_mix_session_id_fkey"
            columns: ["mix_session_id"]
            isOneToOne: false
            referencedRelation: "mix_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_usage_charges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_usage_charges_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "service_allowance_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_usage_projections: {
        Row: {
          appointment_id: string | null
          appointment_service_id: string | null
          client_id: string | null
          id: string
          last_calculated_at: string | null
          mix_session_id: string | null
          organization_id: string
          overage_charge: number | null
          overage_grams: number | null
          requires_manager_review: boolean | null
          service_allowance_grams: number | null
          total_dispensed_cost: number | null
          total_dispensed_weight: number | null
        }
        Insert: {
          appointment_id?: string | null
          appointment_service_id?: string | null
          client_id?: string | null
          id?: string
          last_calculated_at?: string | null
          mix_session_id?: string | null
          organization_id: string
          overage_charge?: number | null
          overage_grams?: number | null
          requires_manager_review?: boolean | null
          service_allowance_grams?: number | null
          total_dispensed_cost?: number | null
          total_dispensed_weight?: number | null
        }
        Update: {
          appointment_id?: string | null
          appointment_service_id?: string | null
          client_id?: string | null
          id?: string
          last_calculated_at?: string | null
          mix_session_id?: string | null
          organization_id?: string
          overage_charge?: number | null
          overage_grams?: number | null
          requires_manager_review?: boolean | null
          service_allowance_grams?: number | null
          total_dispensed_cost?: number | null
          total_dispensed_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkout_usage_projections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_risk_scores: {
        Row: {
          analyzed_at: string | null
          created_at: string | null
          factors: Json | null
          id: string
          organization_id: string
          recommendations: string[] | null
          risk_level: string
          risk_score: number
        }
        Insert: {
          analyzed_at?: string | null
          created_at?: string | null
          factors?: Json | null
          id?: string
          organization_id: string
          recommendations?: string[] | null
          risk_level: string
          risk_score: number
        }
        Update: {
          analyzed_at?: string | null
          created_at?: string | null
          factors?: Json | null
          id?: string
          organization_id?: string
          recommendations?: string[] | null
          risk_level?: string
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "churn_risk_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_automation_log: {
        Row: {
          channel: string | null
          client_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          phorest_client_id: string | null
          rule_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          channel?: string | null
          client_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          phorest_client_id?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          channel?: string | null
          client_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          phorest_client_id?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_automation_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_automation_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "client_automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      client_automation_rules: {
        Row: {
          conditions: Json | null
          created_at: string | null
          email_template_id: string | null
          id: string
          is_active: boolean | null
          organization_id: string | null
          priority: number | null
          rule_name: string
          rule_type: string
          sms_template_id: string | null
          trigger_days: number
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          email_template_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          priority?: number | null
          rule_name: string
          rule_type: string
          sms_template_id?: string | null
          trigger_days: number
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          email_template_id?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string | null
          priority?: number | null
          rule_name?: string
          rule_type?: string
          sms_template_id?: string | null
          trigger_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_automation_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_balances: {
        Row: {
          client_id: string
          created_at: string | null
          gift_card_balance: number
          id: string
          organization_id: string
          salon_credit_balance: number
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          gift_card_balance?: number
          id?: string
          organization_id: string
          salon_credit_balance?: number
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          gift_card_balance?: number
          id?: string
          organization_id?: string
          salon_credit_balance?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_balances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_cards_on_file: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          client_id: string
          created_at: string
          id: string
          is_default: boolean
          organization_id: string
          stripe_customer_id: string
          stripe_payment_method_id: string
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          organization_id: string
          stripe_customer_id: string
          stripe_payment_method_id: string
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          organization_id?: string
          stripe_customer_id?: string
          stripe_payment_method_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_cards_on_file_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_cards_on_file_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_email_preferences: {
        Row: {
          client_id: string
          created_at: string
          id: string
          marketing_opt_out: boolean
          opt_out_at: string | null
          organization_id: string
          sms_opt_out: boolean
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          marketing_opt_out?: boolean
          opt_out_at?: string | null
          organization_id: string
          sms_opt_out?: boolean
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          marketing_opt_out?: boolean
          opt_out_at?: string | null
          organization_id?: string
          sms_opt_out?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "client_email_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_email_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feedback_responses: {
        Row: {
          appointment_id: string | null
          cleanliness: number | null
          client_id: string | null
          comments: string | null
          created_at: string | null
          expires_at: string | null
          external_review_clicked: string | null
          external_review_clicked_at: string | null
          id: string
          is_public: boolean | null
          manager_notified: boolean | null
          manager_notified_at: string | null
          nps_score: number | null
          organization_id: string | null
          overall_rating: number | null
          passed_review_gate: boolean | null
          responded_at: string | null
          service_quality: number | null
          staff_friendliness: number | null
          staff_user_id: string | null
          survey_id: string | null
          token: string
          would_recommend: boolean | null
        }
        Insert: {
          appointment_id?: string | null
          cleanliness?: number | null
          client_id?: string | null
          comments?: string | null
          created_at?: string | null
          expires_at?: string | null
          external_review_clicked?: string | null
          external_review_clicked_at?: string | null
          id?: string
          is_public?: boolean | null
          manager_notified?: boolean | null
          manager_notified_at?: string | null
          nps_score?: number | null
          organization_id?: string | null
          overall_rating?: number | null
          passed_review_gate?: boolean | null
          responded_at?: string | null
          service_quality?: number | null
          staff_friendliness?: number | null
          staff_user_id?: string | null
          survey_id?: string | null
          token: string
          would_recommend?: boolean | null
        }
        Update: {
          appointment_id?: string | null
          cleanliness?: number | null
          client_id?: string | null
          comments?: string | null
          created_at?: string | null
          expires_at?: string | null
          external_review_clicked?: string | null
          external_review_clicked_at?: string | null
          id?: string
          is_public?: boolean | null
          manager_notified?: boolean | null
          manager_notified_at?: string | null
          nps_score?: number | null
          organization_id?: string | null
          overall_rating?: number | null
          passed_review_gate?: boolean | null
          responded_at?: string | null
          service_quality?: number | null
          staff_friendliness?: number | null
          staff_user_id?: string | null
          survey_id?: string | null
          token?: string
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_feedback_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "client_feedback_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feedback_surveys: {
        Row: {
          created_at: string | null
          delay_hours: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delay_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id?: string | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delay_hours?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_form_signatures: {
        Row: {
          appointment_id: string | null
          client_id: string
          collected_by: string | null
          created_at: string | null
          form_template_id: string
          form_version: string
          id: string
          ip_address: string | null
          signed_at: string | null
          typed_signature: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          collected_by?: string | null
          created_at?: string | null
          form_template_id: string
          form_version: string
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          typed_signature?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          collected_by?: string | null
          created_at?: string | null
          form_template_id?: string
          form_version?: string
          id?: string
          ip_address?: string | null
          signed_at?: string | null
          typed_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_form_signatures_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_formula_history: {
        Row: {
          appointment_id: string | null
          appointment_service_id: string | null
          client_id: string | null
          created_at: string
          formula_data: Json
          formula_type: Database["public"]["Enums"]["formula_type"]
          id: string
          mix_session_id: string | null
          notes: string | null
          organization_id: string
          service_name: string | null
          staff_id: string | null
          staff_name: string | null
          version_number: number
        }
        Insert: {
          appointment_id?: string | null
          appointment_service_id?: string | null
          client_id?: string | null
          created_at?: string
          formula_data?: Json
          formula_type?: Database["public"]["Enums"]["formula_type"]
          id?: string
          mix_session_id?: string | null
          notes?: string | null
          organization_id: string
          service_name?: string | null
          staff_id?: string | null
          staff_name?: string | null
          version_number?: number
        }
        Update: {
          appointment_id?: string | null
          appointment_service_id?: string | null
          client_id?: string | null
          created_at?: string
          formula_data?: Json
          formula_type?: Database["public"]["Enums"]["formula_type"]
          id?: string
          mix_session_id?: string | null
          notes?: string | null
          organization_id?: string
          service_name?: string | null
          staff_id?: string | null
          staff_name?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_formula_history_mix_session_id_fkey"
            columns: ["mix_session_id"]
            isOneToOne: false
            referencedRelation: "mix_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_formula_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_household_members: {
        Row: {
          added_at: string
          client_id: string
          household_id: string
          id: string
        }
        Insert: {
          added_at?: string
          client_id: string
          household_id: string
          id?: string
        }
        Update: {
          added_at?: string
          client_id?: string
          household_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_household_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "client_households"
            referencedColumns: ["id"]
          },
        ]
      }
      client_households: {
        Row: {
          created_at: string
          created_by: string | null
          household_name: string | null
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          household_name?: string | null
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          household_name?: string | null
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_households_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_loyalty_points: {
        Row: {
          client_id: string
          created_at: string | null
          current_points: number
          id: string
          lifetime_points: number
          organization_id: string
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          current_points?: number
          id?: string
          lifetime_points?: number
          organization_id: string
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          current_points?: number
          id?: string
          lifetime_points?: number
          organization_id?: string
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_loyalty_points_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_loyalty_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_merge_log: {
        Row: {
          before_snapshots: Json
          created_at: string
          field_resolutions: Json
          id: string
          is_undone: boolean
          organization_id: string
          performed_at: string
          performed_by: string
          primary_client_id: string
          reparenting_counts: Json
          secondary_client_ids: string[]
          undo_expires_at: string
          undone_at: string | null
          undone_by: string | null
        }
        Insert: {
          before_snapshots?: Json
          created_at?: string
          field_resolutions?: Json
          id?: string
          is_undone?: boolean
          organization_id: string
          performed_at?: string
          performed_by: string
          primary_client_id: string
          reparenting_counts?: Json
          secondary_client_ids: string[]
          undo_expires_at?: string
          undone_at?: string | null
          undone_by?: string | null
        }
        Update: {
          before_snapshots?: Json
          created_at?: string
          field_resolutions?: Json
          id?: string
          is_undone?: boolean
          organization_id?: string
          performed_at?: string
          performed_by?: string
          primary_client_id?: string
          reparenting_counts?: Json
          secondary_client_ids?: string[]
          undo_expires_at?: string
          undone_at?: string | null
          undone_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_merge_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_merge_log_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_private: boolean | null
          note: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          note: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          note?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_tokens: {
        Row: {
          client_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          organization_id: string | null
          token: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          organization_id?: string | null
          token: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          organization_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_transformation_photos: {
        Row: {
          after_url: string | null
          appointment_id: string | null
          before_url: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          portfolio_approved: boolean
          portfolio_category: string | null
          service_name: string | null
          stylist_user_id: string | null
          taken_at: string | null
        }
        Insert: {
          after_url?: string | null
          appointment_id?: string | null
          before_url?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          portfolio_approved?: boolean
          portfolio_category?: string | null
          service_name?: string | null
          stylist_user_id?: string | null
          taken_at?: string | null
        }
        Update: {
          after_url?: string | null
          appointment_id?: string | null
          before_url?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          portfolio_approved?: boolean
          portfolio_category?: string | null
          service_name?: string | null
          stylist_user_id?: string | null
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_transformation_photos_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_transformation_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          archived_at: string | null
          archived_by: string | null
          average_spend: number | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          birthday: string | null
          branch_name: string | null
          city: string | null
          client_category: string | null
          client_since: string | null
          country: string | null
          created_at: string | null
          customer_number: string | null
          email: string | null
          email_normalized: string | null
          external_id: string | null
          first_name: string
          first_visit: string | null
          gender: string | null
          id: string
          import_job_id: string | null
          import_source: string | null
          imported_at: string | null
          is_active: boolean | null
          is_archived: boolean | null
          is_banned: boolean | null
          is_placeholder: boolean
          is_vip: boolean | null
          landline: string | null
          last_name: string
          last_visit_date: string | null
          lead_source: string | null
          location_id: string | null
          medical_alerts: string | null
          merged_at: string | null
          merged_by: string | null
          merged_into_client_id: string | null
          mobile: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          phone_normalized: string | null
          phorest_client_id: string | null
          preferred_services: string[] | null
          preferred_stylist_id: string | null
          prompt_appointment_notes: boolean | null
          prompt_client_notes: boolean | null
          referred_by: string | null
          reminder_email_opt_in: boolean | null
          reminder_sms_opt_in: boolean | null
          state: string | null
          status: string
          tags: string[] | null
          total_spend: number | null
          updated_at: string | null
          visit_count: number | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          archived_by?: string | null
          average_spend?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          birthday?: string | null
          branch_name?: string | null
          city?: string | null
          client_category?: string | null
          client_since?: string | null
          country?: string | null
          created_at?: string | null
          customer_number?: string | null
          email?: string | null
          email_normalized?: string | null
          external_id?: string | null
          first_name: string
          first_visit?: string | null
          gender?: string | null
          id?: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          is_banned?: boolean | null
          is_placeholder?: boolean
          is_vip?: boolean | null
          landline?: string | null
          last_name: string
          last_visit_date?: string | null
          lead_source?: string | null
          location_id?: string | null
          medical_alerts?: string | null
          merged_at?: string | null
          merged_by?: string | null
          merged_into_client_id?: string | null
          mobile?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          phorest_client_id?: string | null
          preferred_services?: string[] | null
          preferred_stylist_id?: string | null
          prompt_appointment_notes?: boolean | null
          prompt_client_notes?: boolean | null
          referred_by?: string | null
          reminder_email_opt_in?: boolean | null
          reminder_sms_opt_in?: boolean | null
          state?: string | null
          status?: string
          tags?: string[] | null
          total_spend?: number | null
          updated_at?: string | null
          visit_count?: number | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          archived_by?: string | null
          average_spend?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          birthday?: string | null
          branch_name?: string | null
          city?: string | null
          client_category?: string | null
          client_since?: string | null
          country?: string | null
          created_at?: string | null
          customer_number?: string | null
          email?: string | null
          email_normalized?: string | null
          external_id?: string | null
          first_name?: string
          first_visit?: string | null
          gender?: string | null
          id?: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          is_active?: boolean | null
          is_archived?: boolean | null
          is_banned?: boolean | null
          is_placeholder?: boolean
          is_vip?: boolean | null
          landline?: string | null
          last_name?: string
          last_visit_date?: string | null
          lead_source?: string | null
          location_id?: string | null
          medical_alerts?: string | null
          merged_at?: string | null
          merged_by?: string | null
          merged_into_client_id?: string | null
          mobile?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          phone_normalized?: string | null
          phorest_client_id?: string | null
          preferred_services?: string[] | null
          preferred_stylist_id?: string | null
          prompt_appointment_notes?: boolean | null
          prompt_client_notes?: boolean | null
          referred_by?: string | null
          reminder_email_opt_in?: boolean | null
          reminder_sms_opt_in?: boolean | null
          state?: string | null
          status?: string
          tags?: string[] | null
          total_spend?: number | null
          updated_at?: string | null
          visit_count?: number | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_merged_into_client_id_fkey"
            columns: ["merged_into_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_stylist_id_fkey"
            columns: ["preferred_stylist_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coach_notes: {
        Row: {
          coach_user_id: string
          created_at: string
          enrollment_id: string
          id: string
          is_pinned: boolean
          note_text: string
          note_type: string | null
          updated_at: string
        }
        Insert: {
          coach_user_id: string
          created_at?: string
          enrollment_id: string
          id?: string
          is_pinned?: boolean
          note_text: string
          note_type?: string | null
          updated_at?: string
        }
        Update: {
          coach_user_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          is_pinned?: boolean
          note_text?: string
          note_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notes_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "stylist_program_enrollment"
            referencedColumns: ["id"]
          },
        ]
      }
      command_audit_log: {
        Row: {
          command_name: string
          command_payload: Json
          id: string
          idempotency_key: string | null
          initiated_at: string
          initiated_by: string | null
          organization_id: string
          outcome: string
          result_entity_id: string | null
          result_entity_type: string | null
          source: string
          validation_errors: Json | null
        }
        Insert: {
          command_name: string
          command_payload?: Json
          id?: string
          idempotency_key?: string | null
          initiated_at?: string
          initiated_by?: string | null
          organization_id: string
          outcome?: string
          result_entity_id?: string | null
          result_entity_type?: string | null
          source?: string
          validation_errors?: Json | null
        }
        Update: {
          command_name?: string
          command_payload?: Json
          id?: string
          idempotency_key?: string | null
          initiated_at?: string
          initiated_by?: string | null
          organization_id?: string
          outcome?: string
          result_entity_id?: string | null
          result_entity_type?: string | null
          source?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "command_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rate_history: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_retail_rate: number | null
          new_service_rate: number | null
          organization_id: string | null
          previous_retail_rate: number | null
          previous_service_rate: number | null
          user_id: string | null
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_retail_rate?: number | null
          new_service_rate?: number | null
          organization_id?: string | null
          previous_retail_rate?: number | null
          previous_service_rate?: number | null
          user_id?: string | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_retail_rate?: number | null
          new_service_rate?: number | null
          organization_id?: string | null
          previous_retail_rate?: number | null
          previous_service_rate?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rate_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_tiers: {
        Row: {
          applies_to: string
          commission_rate: number
          created_at: string
          id: string
          is_active: boolean
          max_revenue: number | null
          min_revenue: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          applies_to?: string
          commission_rate: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_revenue?: number | null
          min_revenue: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          applies_to?: string
          commission_rate?: number
          created_at?: string
          id?: string
          is_active?: boolean
          max_revenue?: number | null
          min_revenue?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_adjustments: {
        Row: {
          adjustment_type: string
          approved_by: string
          comp_value: number | null
          created_at: string
          description: string
          id: string
          months_added: number | null
          new_end_date: string | null
          new_start_date: string | null
          organization_id: string
          previous_end_date: string | null
          previous_start_date: string | null
          reason: string
        }
        Insert: {
          adjustment_type: string
          approved_by: string
          comp_value?: number | null
          created_at?: string
          description: string
          id?: string
          months_added?: number | null
          new_end_date?: string | null
          new_start_date?: string | null
          organization_id: string
          previous_end_date?: string | null
          previous_start_date?: string | null
          reason: string
        }
        Update: {
          adjustment_type?: string
          approved_by?: string
          comp_value?: number | null
          created_at?: string
          description?: string
          id?: string
          months_added?: number | null
          new_end_date?: string | null
          new_start_date?: string | null
          organization_id?: string
          previous_end_date?: string | null
          previous_start_date?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_adjustments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      count_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          organization_id: string
          started_by: string | null
          status: string
          total_products_counted: number | null
          total_variance_cost: number | null
          total_variance_units: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id: string
          started_by?: string | null
          status?: string
          total_products_counted?: number | null
          total_variance_cost?: number | null
          total_variance_units?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          started_by?: string | null
          status?: string
          total_products_counted?: number | null
          total_variance_cost?: number | null
          total_variance_units?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "count_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_report_templates: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_shared: boolean | null
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_shared?: boolean | null
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_report_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_completions: {
        Row: {
          all_tasks_done: boolean
          completion_date: string
          created_at: string
          day_number: number
          enrollment_id: string
          id: string
          is_complete: boolean
          metrics_logged: boolean
          proof_notes: string | null
          proof_type: string | null
          proof_url: string | null
          tasks_completed: Json | null
          updated_at: string
        }
        Insert: {
          all_tasks_done?: boolean
          completion_date?: string
          created_at?: string
          day_number: number
          enrollment_id: string
          id?: string
          is_complete?: boolean
          metrics_logged?: boolean
          proof_notes?: string | null
          proof_type?: string | null
          proof_url?: string | null
          tasks_completed?: Json | null
          updated_at?: string
        }
        Update: {
          all_tasks_done?: boolean
          completion_date?: string
          created_at?: string
          day_number?: number
          enrollment_id?: string
          id?: string
          is_complete?: boolean
          metrics_logged?: boolean
          proof_notes?: string | null
          proof_type?: string | null
          proof_url?: string | null
          tasks_completed?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_completions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "stylist_program_enrollment"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_huddles: {
        Row: {
          ai_generated: boolean | null
          ai_sections: Json | null
          announcements: string | null
          birthdays_celebrations: string | null
          created_at: string | null
          created_by: string
          focus_of_the_day: string | null
          generation_source: string | null
          huddle_date: string
          id: string
          is_published: boolean | null
          location_id: string | null
          sales_goals: Json | null
          training_reminders: string | null
          updated_at: string | null
          wins_from_yesterday: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          ai_sections?: Json | null
          announcements?: string | null
          birthdays_celebrations?: string | null
          created_at?: string | null
          created_by: string
          focus_of_the_day?: string | null
          generation_source?: string | null
          huddle_date?: string
          id?: string
          is_published?: boolean | null
          location_id?: string | null
          sales_goals?: Json | null
          training_reminders?: string | null
          updated_at?: string | null
          wins_from_yesterday?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          ai_sections?: Json | null
          announcements?: string | null
          birthdays_celebrations?: string | null
          created_at?: string | null
          created_by?: string
          focus_of_the_day?: string | null
          generation_source?: string | null
          huddle_date?: string
          id?: string
          is_published?: boolean | null
          location_id?: string | null
          sales_goals?: Json | null
          training_reminders?: string | null
          updated_at?: string | null
          wins_from_yesterday?: string | null
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          ad_leads: number | null
          completion_id: string
          consults_booked: number | null
          consults_completed: number | null
          created_at: string
          dms_received: number | null
          id: string
          inquiry_forms: number | null
          new_clients: number | null
          posts_published: number | null
          profile_visits: number | null
          reach: number | null
          reels_published: number | null
          referral_leads: number | null
          revenue_booked: number | null
          saves: number | null
          services_booked: number | null
          shares: number | null
          stories_published: number | null
          total_leads: number | null
          updated_at: string
        }
        Insert: {
          ad_leads?: number | null
          completion_id: string
          consults_booked?: number | null
          consults_completed?: number | null
          created_at?: string
          dms_received?: number | null
          id?: string
          inquiry_forms?: number | null
          new_clients?: number | null
          posts_published?: number | null
          profile_visits?: number | null
          reach?: number | null
          reels_published?: number | null
          referral_leads?: number | null
          revenue_booked?: number | null
          saves?: number | null
          services_booked?: number | null
          shares?: number | null
          stories_published?: number | null
          total_leads?: number | null
          updated_at?: string
        }
        Update: {
          ad_leads?: number | null
          completion_id?: string
          consults_booked?: number | null
          consults_completed?: number | null
          created_at?: string
          dms_received?: number | null
          id?: string
          inquiry_forms?: number | null
          new_clients?: number | null
          posts_published?: number | null
          profile_visits?: number | null
          reach?: number | null
          reels_published?: number | null
          referral_leads?: number | null
          revenue_booked?: number | null
          saves?: number | null
          services_booked?: number | null
          shares?: number | null
          stories_published?: number | null
          total_leads?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: true
            referencedRelation: "daily_completions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales_summary: {
        Row: {
          average_ticket: number | null
          branch_name: string | null
          created_at: string
          external_id: string | null
          id: string
          import_source: string | null
          location_id: string | null
          organization_id: string
          product_revenue: number | null
          service_revenue: number | null
          staff_user_id: string | null
          summary_date: string
          total_discounts: number | null
          total_products: number | null
          total_revenue: number | null
          total_services: number | null
          total_transactions: number | null
          updated_at: string
        }
        Insert: {
          average_ticket?: number | null
          branch_name?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          import_source?: string | null
          location_id?: string | null
          organization_id: string
          product_revenue?: number | null
          service_revenue?: number | null
          staff_user_id?: string | null
          summary_date: string
          total_discounts?: number | null
          total_products?: number | null
          total_revenue?: number | null
          total_services?: number | null
          total_transactions?: number | null
          updated_at?: string
        }
        Update: {
          average_ticket?: number | null
          branch_name?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          import_source?: string | null
          location_id?: string | null
          organization_id?: string
          product_revenue?: number | null
          service_revenue?: number | null
          staff_user_id?: string | null
          summary_date?: string
          total_discounts?: number | null
          total_products?: number | null
          total_revenue?: number | null
          total_services?: number | null
          total_transactions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_summary_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_summary_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      dashboard_element_visibility: {
        Row: {
          created_at: string
          element_category: string
          element_key: string
          element_name: string
          id: string
          is_visible: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          element_category: string
          element_key: string
          element_name: string
          id?: string
          is_visible?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          element_category?: string
          element_key?: string
          element_name?: string
          id?: string
          is_visible?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_layout_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_default: boolean | null
          layout: Json
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_default?: boolean | null
          layout: Json
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_default?: boolean | null
          layout?: Json
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_exports: {
        Row: {
          created_at: string | null
          data: Json | null
          export_type: string
          format: string | null
          id: string
          organization_id: string
          record_count: number | null
          requested_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          export_type: string
          format?: string | null
          id?: string
          organization_id: string
          record_count?: number | null
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          export_type?: string
          format?: string | null
          id?: string
          organization_id?: string
          record_count?: number | null
          requested_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_exports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      day_rate_agreements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      day_rate_bookings: {
        Row: {
          agreement_signed_at: string | null
          agreement_version: string | null
          amount_paid: number | null
          booking_date: string
          business_name: string | null
          chair_id: string | null
          created_at: string
          id: string
          instagram_handle: string | null
          license_number: string
          license_state: string
          location_id: string
          notes: string | null
          status: Database["public"]["Enums"]["day_rate_booking_status"]
          stripe_payment_id: string | null
          stylist_email: string
          stylist_name: string
          stylist_phone: string
          updated_at: string
        }
        Insert: {
          agreement_signed_at?: string | null
          agreement_version?: string | null
          amount_paid?: number | null
          booking_date: string
          business_name?: string | null
          chair_id?: string | null
          created_at?: string
          id?: string
          instagram_handle?: string | null
          license_number: string
          license_state: string
          location_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["day_rate_booking_status"]
          stripe_payment_id?: string | null
          stylist_email: string
          stylist_name: string
          stylist_phone: string
          updated_at?: string
        }
        Update: {
          agreement_signed_at?: string | null
          agreement_version?: string | null
          amount_paid?: number | null
          booking_date?: string
          business_name?: string | null
          chair_id?: string | null
          created_at?: string
          id?: string
          instagram_handle?: string | null
          license_number?: string
          license_state?: string
          location_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["day_rate_booking_status"]
          stripe_payment_id?: string | null
          stylist_email?: string
          stylist_name?: string
          stylist_phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_rate_bookings_chair_id_fkey"
            columns: ["chair_id"]
            isOneToOne: false
            referencedRelation: "day_rate_chairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_rate_bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      day_rate_chairs: {
        Row: {
          chair_number: number
          created_at: string
          daily_rate: number | null
          id: string
          is_available: boolean | null
          location_id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          chair_number: number
          created_at?: string
          daily_rate?: number | null
          id?: string
          is_available?: boolean | null
          location_id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          chair_number?: number
          created_at?: string
          daily_rate?: number | null
          id?: string
          is_available?: boolean | null
          location_id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_rate_chairs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_queries: {
        Row: {
          created_at: string
          id: string
          matched_feature_count: number
          query_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_feature_count?: number
          query_text: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_feature_count?: number
          query_text?: string
        }
        Relationships: []
      }
      detected_anomalies: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          anomaly_type: string
          context: Json | null
          detected_at: string | null
          deviation_percent: number | null
          expected_value: number | null
          id: string
          is_acknowledged: boolean | null
          location_id: string | null
          metric_value: number | null
          organization_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          anomaly_type: string
          context?: Json | null
          detected_at?: string | null
          deviation_percent?: number | null
          expected_value?: number | null
          id?: string
          is_acknowledged?: boolean | null
          location_id?: string | null
          metric_value?: number | null
          organization_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          anomaly_type?: string
          context?: Json | null
          detected_at?: string | null
          deviation_percent?: number | null
          expected_value?: number | null
          id?: string
          is_acknowledged?: boolean | null
          location_id?: string | null
          metric_value?: number | null
          organization_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "detected_anomalies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_insight_suggestions: {
        Row: {
          created_at: string
          dismissed_at: string
          expires_at: string
          id: string
          organization_id: string
          suggestion_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string
          expires_at?: string
          id?: string
          organization_id: string
          suggestion_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          suggestion_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_insight_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_bookings: {
        Row: {
          appointment_date: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          created_by: string
          created_by_name: string | null
          expires_at: string
          id: string
          is_redo: boolean
          location_id: string | null
          notes: string | null
          organization_id: string
          redo_metadata: Json | null
          selected_services: Json | null
          staff_name: string | null
          staff_user_id: string | null
          start_time: string | null
          step_reached: string | null
          updated_at: string
        }
        Insert: {
          appointment_date?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by: string
          created_by_name?: string | null
          expires_at?: string
          id?: string
          is_redo?: boolean
          location_id?: string | null
          notes?: string | null
          organization_id: string
          redo_metadata?: Json | null
          selected_services?: Json | null
          staff_name?: string | null
          staff_user_id?: string | null
          start_time?: string | null
          step_reached?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string | null
          expires_at?: string
          id?: string
          is_redo?: boolean
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          redo_metadata?: Json | null
          selected_services?: Json | null
          staff_name?: string | null
          staff_user_id?: string | null
          start_time?: string | null
          step_reached?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_dismissals: {
        Row: {
          client_a_id: string
          client_b_id: string
          dismissed_at: string
          dismissed_by: string | null
          id: string
          organization_id: string
          reason: string | null
        }
        Insert: {
          client_a_id: string
          client_b_id: string
          dismissed_at?: string
          dismissed_by?: string | null
          id?: string
          organization_id: string
          reason?: string | null
        }
        Update: {
          client_a_id?: string
          client_b_id?: string
          dismissed_at?: string
          dismissed_by?: string | null
          id?: string
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_dismissals_client_a_id_fkey"
            columns: ["client_a_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_dismissals_client_b_id_fkey"
            columns: ["client_b_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_dismissals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_logs: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          metadata: Json | null
          organization_id: string | null
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          started_at?: string
          status: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edge_function_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_digest_log: {
        Row: {
          digest_type: string
          entries_included: string[]
          id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          digest_type: string
          entries_included: string[]
          id?: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          digest_type?: string
          entries_included?: string[]
          id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          client_id: string | null
          email_type: string
          id: string
          message_id: string | null
          organization_id: string
          sent_at: string
        }
        Insert: {
          client_id?: string | null
          email_type?: string
          id?: string
          message_id?: string | null
          organization_id: string
          sent_at?: string
        }
        Update: {
          client_id?: string | null
          email_type?: string
          id?: string
          message_id?: string | null
          organization_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          blocks_json: Json | null
          created_at: string | null
          description: string | null
          html_body: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_key: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          blocks_json?: Json | null
          created_at?: string | null
          description?: string | null
          html_body: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_key: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          blocks_json?: Json | null
          created_at?: string | null
          description?: string | null
          html_body?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      email_themes: {
        Row: {
          accent_color: string
          body_bg: string
          body_text: string
          button_bg: string
          button_text: string
          created_at: string
          created_by: string
          description: string | null
          divider_color: string
          header_bg: string
          header_text: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          body_bg?: string
          body_text?: string
          button_bg?: string
          button_text?: string
          created_at?: string
          created_by: string
          description?: string | null
          divider_color?: string
          header_bg?: string
          header_text?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          body_bg?: string
          body_text?: string
          button_bg?: string
          button_text?: string
          created_at?: string
          created_by?: string
          description?: string | null
          divider_color?: string
          header_bg?: string
          header_text?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_tracking_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          link_url: string | null
          message_id: string | null
          organization_id: string | null
          queue_item_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          message_id?: string | null
          organization_id?: string | null
          queue_item_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          link_url?: string | null
          message_id?: string | null
          organization_id?: string | null
          queue_item_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_tracking_events_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "service_email_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      email_variables: {
        Row: {
          category: string
          created_at: string | null
          description: string
          example: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          variable_key: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          example?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          variable_key: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          example?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          variable_key?: string
        }
        Relationships: []
      }
      employee_location_schedules: {
        Row: {
          created_at: string | null
          id: string
          location_id: string
          updated_at: string | null
          user_id: string
          work_days: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location_id: string
          updated_at?: string | null
          user_id: string
          work_days?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location_id?: string
          updated_at?: string | null
          user_id?: string
          work_days?: string[] | null
        }
        Relationships: []
      }
      employee_payroll_settings: {
        Row: {
          commission_enabled: boolean | null
          created_at: string
          direct_deposit_status: string | null
          employee_id: string
          external_employee_id: string | null
          hourly_rate: number | null
          id: string
          is_payroll_active: boolean | null
          metadata: Json | null
          organization_id: string
          pay_type: string
          salary_amount: number | null
          updated_at: string
        }
        Insert: {
          commission_enabled?: boolean | null
          created_at?: string
          direct_deposit_status?: string | null
          employee_id: string
          external_employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_payroll_active?: boolean | null
          metadata?: Json | null
          organization_id: string
          pay_type?: string
          salary_amount?: number | null
          updated_at?: string
        }
        Update: {
          commission_enabled?: boolean | null
          created_at?: string
          direct_deposit_status?: string | null
          employee_id?: string
          external_employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_payroll_active?: boolean | null
          metadata?: Json | null
          organization_id?: string
          pay_type?: string
          salary_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_payroll_settings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_payroll_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_pin_changelog: {
        Row: {
          changed_at: string
          changed_by: string
          employee_profile_id: string
          id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          employee_profile_id: string
          id?: string
          reason?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          employee_profile_id?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_pin_changelog_employee_profile_id_fkey"
            columns: ["employee_profile_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_pins: {
        Row: {
          login_pin: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          login_pin: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          login_pin?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_pins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profiles: {
        Row: {
          active_organization_id: string | null
          admin_approved_at: string | null
          admin_approved_by: string | null
          approved_at: string | null
          approved_by: string | null
          avatar_rotation: number | null
          avatar_zoom: number | null
          bio: string | null
          birthday: string | null
          card_focal_x: number | null
          card_focal_y: number | null
          card_rotation: number | null
          card_zoom: number | null
          chat_enabled: boolean | null
          created_at: string
          departure_notes: string | null
          display_name: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          extensions_certified: boolean | null
          full_name: string
          hide_numbers: boolean
          highlighted_services: string[] | null
          hire_date: string | null
          homepage_order: number | null
          homepage_requested: boolean | null
          homepage_requested_at: string | null
          homepage_visible: boolean | null
          id: string
          instagram: string | null
          is_active: boolean | null
          is_approved: boolean | null
          is_booking: boolean | null
          is_onsite_staff: boolean
          is_primary_owner: boolean | null
          is_super_admin: boolean | null
          location_id: string | null
          location_ids: string[] | null
          organization_id: string | null
          phone: string | null
          photo_focal_x: number | null
          photo_focal_y: number | null
          photo_url: string | null
          planned_departure_date: string | null
          preferred_social_handle: string | null
          specialties: string[] | null
          stylist_level: string | null
          stylist_level_since: string | null
          stylist_type: Database["public"]["Enums"]["stylist_type"] | null
          tiktok: string | null
          updated_at: string
          user_id: string
          work_days: string[] | null
        }
        Insert: {
          active_organization_id?: string | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_rotation?: number | null
          avatar_zoom?: number | null
          bio?: string | null
          birthday?: string | null
          card_focal_x?: number | null
          card_focal_y?: number | null
          card_rotation?: number | null
          card_zoom?: number | null
          chat_enabled?: boolean | null
          created_at?: string
          departure_notes?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          extensions_certified?: boolean | null
          full_name: string
          hide_numbers?: boolean
          highlighted_services?: string[] | null
          hire_date?: string | null
          homepage_order?: number | null
          homepage_requested?: boolean | null
          homepage_requested_at?: string | null
          homepage_visible?: boolean | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_booking?: boolean | null
          is_onsite_staff?: boolean
          is_primary_owner?: boolean | null
          is_super_admin?: boolean | null
          location_id?: string | null
          location_ids?: string[] | null
          organization_id?: string | null
          phone?: string | null
          photo_focal_x?: number | null
          photo_focal_y?: number | null
          photo_url?: string | null
          planned_departure_date?: string | null
          preferred_social_handle?: string | null
          specialties?: string[] | null
          stylist_level?: string | null
          stylist_level_since?: string | null
          stylist_type?: Database["public"]["Enums"]["stylist_type"] | null
          tiktok?: string | null
          updated_at?: string
          user_id: string
          work_days?: string[] | null
        }
        Update: {
          active_organization_id?: string | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avatar_rotation?: number | null
          avatar_zoom?: number | null
          bio?: string | null
          birthday?: string | null
          card_focal_x?: number | null
          card_focal_y?: number | null
          card_rotation?: number | null
          card_zoom?: number | null
          chat_enabled?: boolean | null
          created_at?: string
          departure_notes?: string | null
          display_name?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          extensions_certified?: boolean | null
          full_name?: string
          hide_numbers?: boolean
          highlighted_services?: string[] | null
          hire_date?: string | null
          homepage_order?: number | null
          homepage_requested?: boolean | null
          homepage_requested_at?: string | null
          homepage_visible?: boolean | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          is_booking?: boolean | null
          is_onsite_staff?: boolean
          is_primary_owner?: boolean | null
          is_super_admin?: boolean | null
          location_id?: string | null
          location_ids?: string[] | null
          organization_id?: string | null
          phone?: string | null
          photo_focal_x?: number | null
          photo_focal_y?: number | null
          photo_url?: string | null
          planned_departure_date?: string | null
          preferred_social_handle?: string | null
          specialties?: string[] | null
          stylist_level?: string | null
          stylist_level_since?: string | null
          stylist_type?: Database["public"]["Enums"]["stylist_type"] | null
          tiktok?: string | null
          updated_at?: string
          user_id?: string
          work_days?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_pto_balances: {
        Row: {
          accrued_ytd: number
          carried_over: number
          created_at: string
          current_balance: number
          id: string
          last_accrual_date: string | null
          organization_id: string
          policy_id: string
          updated_at: string
          used_ytd: number
          user_id: string
        }
        Insert: {
          accrued_ytd?: number
          carried_over?: number
          created_at?: string
          current_balance?: number
          id?: string
          last_accrual_date?: string | null
          organization_id: string
          policy_id: string
          updated_at?: string
          used_ytd?: number
          user_id: string
        }
        Update: {
          accrued_ytd?: number
          carried_over?: number
          created_at?: string
          current_balance?: number
          id?: string
          last_accrual_date?: string | null
          organization_id?: string
          policy_id?: string
          updated_at?: string
          used_ytd?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_pto_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_pto_balances_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "pto_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      expansion_opportunities: {
        Row: {
          break_even_months: number | null
          break_even_months_high: number | null
          break_even_months_low: number | null
          business_value_score: number | null
          campaign_id: string | null
          capital_required: number
          city: string | null
          confidence: string
          constraint_type: string | null
          created_at: string
          description: string | null
          effort_score: number | null
          eligibility_status: string
          expires_at: string | null
          id: string
          is_active: boolean
          location_id: string | null
          momentum_score: number | null
          opportunity_type: Database["public"]["Enums"]["expansion_opportunity_type"]
          organization_id: string
          predicted_annual_lift: number
          predicted_booking_lift_expected: number | null
          predicted_booking_lift_high: number | null
          predicted_booking_lift_low: number | null
          predicted_revenue_lift_high: number | null
          predicted_revenue_lift_low: number | null
          recommended_action_label: string
          risk_factors: Json | null
          roe_score: number
          service_category: string | null
          service_id: string | null
          spi_at_creation: number | null
          staff_user_id: string | null
          status: Database["public"]["Enums"]["expansion_status"]
          stripe_offer_amount: number | null
          stripe_offer_available: boolean
          stripe_offer_id: string | null
          stripe_offer_terms_summary: string | null
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          break_even_months?: number | null
          break_even_months_high?: number | null
          break_even_months_low?: number | null
          business_value_score?: number | null
          campaign_id?: string | null
          capital_required?: number
          city?: string | null
          confidence?: string
          constraint_type?: string | null
          created_at?: string
          description?: string | null
          effort_score?: number | null
          eligibility_status?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          momentum_score?: number | null
          opportunity_type?: Database["public"]["Enums"]["expansion_opportunity_type"]
          organization_id: string
          predicted_annual_lift?: number
          predicted_booking_lift_expected?: number | null
          predicted_booking_lift_high?: number | null
          predicted_booking_lift_low?: number | null
          predicted_revenue_lift_high?: number | null
          predicted_revenue_lift_low?: number | null
          recommended_action_label?: string
          risk_factors?: Json | null
          roe_score?: number
          service_category?: string | null
          service_id?: string | null
          spi_at_creation?: number | null
          staff_user_id?: string | null
          status?: Database["public"]["Enums"]["expansion_status"]
          stripe_offer_amount?: number | null
          stripe_offer_available?: boolean
          stripe_offer_id?: string | null
          stripe_offer_terms_summary?: string | null
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          break_even_months?: number | null
          break_even_months_high?: number | null
          break_even_months_low?: number | null
          business_value_score?: number | null
          campaign_id?: string | null
          capital_required?: number
          city?: string | null
          confidence?: string
          constraint_type?: string | null
          created_at?: string
          description?: string | null
          effort_score?: number | null
          eligibility_status?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          momentum_score?: number | null
          opportunity_type?: Database["public"]["Enums"]["expansion_opportunity_type"]
          organization_id?: string
          predicted_annual_lift?: number
          predicted_booking_lift_expected?: number | null
          predicted_booking_lift_high?: number | null
          predicted_booking_lift_low?: number | null
          predicted_revenue_lift_high?: number | null
          predicted_revenue_lift_low?: number | null
          recommended_action_label?: string
          risk_factors?: Json | null
          roe_score?: number
          service_category?: string | null
          service_id?: string | null
          spi_at_creation?: number | null
          staff_user_id?: string | null
          status?: Database["public"]["Enums"]["expansion_status"]
          stripe_offer_amount?: number | null
          stripe_offer_available?: boolean
          stripe_offer_id?: string | null
          stripe_offer_terms_summary?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expansion_opportunities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expansion_opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expansion_scenarios: {
        Row: {
          assumptions: Json | null
          break_even_months: number | null
          confidence: string
          created_at: string
          created_by: string | null
          id: string
          investment_amount: number
          opportunity_id: string
          organization_id: string
          projected_monthly_lift: number
          result_summary: Json | null
        }
        Insert: {
          assumptions?: Json | null
          break_even_months?: number | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          investment_amount?: number
          opportunity_id: string
          organization_id: string
          projected_monthly_lift?: number
          result_summary?: Json | null
        }
        Update: {
          assumptions?: Json | null
          break_even_months?: number | null
          confidence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          investment_amount?: number
          opportunity_id?: string
          organization_id?: string
          projected_monthly_lift?: number
          result_summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "expansion_scenarios_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "expansion_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expansion_scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_catalog: {
        Row: {
          category: string
          created_at: string | null
          default_enabled: boolean | null
          description: string | null
          display_order: number | null
          feature_key: string
          feature_name: string
          icon_name: string | null
          id: string
          is_core: boolean | null
          requires_features: string[] | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          display_order?: number | null
          feature_key: string
          feature_name: string
          icon_name?: string | null
          id?: string
          is_core?: boolean | null
          requires_features?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_enabled?: boolean | null
          description?: string | null
          display_order?: number | null
          feature_key?: string
          feature_name?: string
          icon_name?: string | null
          id?: string
          is_core?: boolean | null
          requires_features?: string[] | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          enabled_for_roles: string[] | null
          enabled_for_users: string[] | null
          flag_key: string
          flag_name: string
          id: string
          is_enabled: boolean | null
          metadata: Json | null
          percentage_rollout: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled_for_roles?: string[] | null
          enabled_for_users?: string[] | null
          flag_key: string
          flag_name: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          percentage_rollout?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled_for_roles?: string[] | null
          enabled_for_users?: string[] | null
          flag_key?: string
          flag_name?: string
          id?: string
          is_enabled?: boolean | null
          metadata?: Json | null
          percentage_rollout?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_request_votes: {
        Row: {
          created_at: string | null
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_response: string | null
          category: string | null
          created_at: string | null
          description: string
          id: string
          linked_changelog_id: string | null
          priority: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          submitted_by: string
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_response?: string | null
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          linked_changelog_id?: string | null
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          submitted_by: string
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_response?: string | null
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          linked_changelog_id?: string | null
          priority?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          submitted_by?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_linked_changelog_id_fkey"
            columns: ["linked_changelog_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      financed_project_ledger: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          entry_type: Database["public"]["Enums"]["financed_ledger_entry_type"]
          financed_project_id: string
          id: string
          organization_id: string
          recorded_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          entry_type: Database["public"]["Enums"]["financed_ledger_entry_type"]
          financed_project_id: string
          id?: string
          organization_id: string
          recorded_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          entry_type?: Database["public"]["Enums"]["financed_ledger_entry_type"]
          financed_project_id?: string
          id?: string
          organization_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financed_project_ledger_financed_project_id_fkey"
            columns: ["financed_project_id"]
            isOneToOne: false
            referencedRelation: "financed_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financed_project_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financed_projects: {
        Row: {
          actual_monthly_payment: number | null
          actual_total_repayment_to_date: number
          break_even_progress_percent: number
          completed_at: string | null
          confidence_at_funding: string
          created_at: string
          estimated_total_repayment: number | null
          expected_monthly_payment: number | null
          funded_amount: number
          funded_at: string | null
          funding_source: string
          id: string
          last_synced_at: string | null
          opportunity_id: string
          organization_id: string
          predicted_annual_lift: number
          predicted_break_even_months: number
          predicted_revenue_to_date: number
          realized_revenue_lift: number
          repayment_model: string
          repayment_remaining: number
          repayment_total: number
          revenue_generated_to_date: number
          revenue_share_pct: number | null
          risk_level_at_funding: string
          roe_at_funding: number
          roi_to_date: number | null
          staff_user_id: string | null
          status: Database["public"]["Enums"]["financed_project_status"]
          stripe_checkout_session_id: string | null
          stripe_subscription_id: string | null
          target_completion_at: string | null
          updated_at: string
          variance_pct: number | null
        }
        Insert: {
          actual_monthly_payment?: number | null
          actual_total_repayment_to_date?: number
          break_even_progress_percent?: number
          completed_at?: string | null
          confidence_at_funding?: string
          created_at?: string
          estimated_total_repayment?: number | null
          expected_monthly_payment?: number | null
          funded_amount?: number
          funded_at?: string | null
          funding_source?: string
          id?: string
          last_synced_at?: string | null
          opportunity_id: string
          organization_id: string
          predicted_annual_lift?: number
          predicted_break_even_months?: number
          predicted_revenue_to_date?: number
          realized_revenue_lift?: number
          repayment_model?: string
          repayment_remaining?: number
          repayment_total?: number
          revenue_generated_to_date?: number
          revenue_share_pct?: number | null
          risk_level_at_funding?: string
          roe_at_funding?: number
          roi_to_date?: number | null
          staff_user_id?: string | null
          status?: Database["public"]["Enums"]["financed_project_status"]
          stripe_checkout_session_id?: string | null
          stripe_subscription_id?: string | null
          target_completion_at?: string | null
          updated_at?: string
          variance_pct?: number | null
        }
        Update: {
          actual_monthly_payment?: number | null
          actual_total_repayment_to_date?: number
          break_even_progress_percent?: number
          completed_at?: string | null
          confidence_at_funding?: string
          created_at?: string
          estimated_total_repayment?: number | null
          expected_monthly_payment?: number | null
          funded_amount?: number
          funded_at?: string | null
          funding_source?: string
          id?: string
          last_synced_at?: string | null
          opportunity_id?: string
          organization_id?: string
          predicted_annual_lift?: number
          predicted_break_even_months?: number
          predicted_revenue_to_date?: number
          realized_revenue_lift?: number
          repayment_model?: string
          repayment_remaining?: number
          repayment_total?: number
          revenue_generated_to_date?: number
          revenue_share_pct?: number | null
          risk_level_at_funding?: string
          roe_at_funding?: number
          roi_to_date?: number | null
          staff_user_id?: string | null
          status?: Database["public"]["Enums"]["financed_project_status"]
          stripe_checkout_session_id?: string | null
          stripe_subscription_id?: string | null
          target_completion_at?: string | null
          updated_at?: string
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financed_projects_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "expansion_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financed_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          form_type: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_witness: boolean | null
          updated_at: string | null
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_witness?: boolean | null
          updated_at?: string | null
          version?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          form_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_witness?: boolean | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          alt: string
          created_at: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          src: string
          updated_at: string | null
        }
        Insert: {
          alt: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          src: string
          updated_at?: string | null
        }
        Update: {
          alt?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          src?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_transformations: {
        Row: {
          after_image: string
          after_label: string | null
          before_image: string
          before_label: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          updated_at: string | null
        }
        Insert: {
          after_image: string
          after_label?: string | null
          before_image: string
          before_label?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          updated_at?: string | null
        }
        Update: {
          after_image?: string
          after_label?: string | null
          before_image?: string
          before_label?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gift_card_orders: {
        Row: {
          card_design: string
          card_number_prefix: string | null
          card_stock: string | null
          custom_logo_url: string | null
          custom_message: string | null
          delivered_at: string | null
          estimated_delivery: string | null
          id: string
          notes: string | null
          ordered_at: string | null
          ordered_by: string
          organization_id: string
          quantity: number
          shipped_at: string | null
          shipping_address: Json
          shipping_method: string | null
          status: string | null
          total_price: number | null
          tracking_number: string | null
          unit_price: number | null
        }
        Insert: {
          card_design: string
          card_number_prefix?: string | null
          card_stock?: string | null
          custom_logo_url?: string | null
          custom_message?: string | null
          delivered_at?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          ordered_by: string
          organization_id: string
          quantity: number
          shipped_at?: string | null
          shipping_address: Json
          shipping_method?: string | null
          status?: string | null
          total_price?: number | null
          tracking_number?: string | null
          unit_price?: number | null
        }
        Update: {
          card_design?: string
          card_number_prefix?: string | null
          card_stock?: string | null
          custom_logo_url?: string | null
          custom_message?: string | null
          delivered_at?: string | null
          estimated_delivery?: string | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          ordered_by?: string
          organization_id?: string
          quantity?: number
          shipped_at?: string | null
          shipping_address?: Json
          shipping_method?: string | null
          status?: string | null
          total_price?: number | null
          tracking_number?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_settings: {
        Row: {
          card_accent_color: string | null
          card_background_color: string | null
          card_logo_url: string | null
          card_text_color: string | null
          created_at: string | null
          default_expiration_months: number | null
          id: string
          include_qr_code: boolean | null
          include_terms: boolean | null
          organization_id: string
          print_template: string | null
          suggested_amounts: number[] | null
          terms_text: string | null
          updated_at: string | null
        }
        Insert: {
          card_accent_color?: string | null
          card_background_color?: string | null
          card_logo_url?: string | null
          card_text_color?: string | null
          created_at?: string | null
          default_expiration_months?: number | null
          id?: string
          include_qr_code?: boolean | null
          include_terms?: boolean | null
          organization_id: string
          print_template?: string | null
          suggested_amounts?: number[] | null
          terms_text?: string | null
          updated_at?: string | null
        }
        Update: {
          card_accent_color?: string | null
          card_background_color?: string | null
          card_logo_url?: string | null
          card_text_color?: string | null
          created_at?: string | null
          default_expiration_months?: number | null
          id?: string
          include_qr_code?: boolean | null
          include_terms?: boolean | null
          organization_id?: string
          print_template?: string | null
          suggested_amounts?: number[] | null
          terms_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          assigned_client_id: string | null
          card_type: string | null
          code: string
          created_at: string | null
          created_by: string | null
          current_balance: number
          custom_message: string | null
          design_template: string | null
          expires_at: string | null
          id: string
          initial_amount: number
          is_active: boolean | null
          organization_id: string
          physical_card_id: string | null
          printed_at: string | null
          purchaser_email: string | null
          purchaser_name: string | null
          recipient_email: string | null
          recipient_name: string | null
        }
        Insert: {
          assigned_client_id?: string | null
          card_type?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_balance: number
          custom_message?: string | null
          design_template?: string | null
          expires_at?: string | null
          id?: string
          initial_amount: number
          is_active?: boolean | null
          organization_id: string
          physical_card_id?: string | null
          printed_at?: string | null
          purchaser_email?: string | null
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
        }
        Update: {
          assigned_client_id?: string | null
          card_type?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_balance?: number
          custom_message?: string | null
          design_template?: string | null
          expires_at?: string | null
          id?: string
          initial_amount?: number
          is_active?: boolean | null
          organization_id?: string
          physical_card_id?: string | null
          printed_at?: string | null
          purchaser_email?: string | null
          purchaser_name?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_assigned_client_id_fkey"
            columns: ["assigned_client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_cards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      graduation_feedback: {
        Row: {
          coach_id: string
          created_at: string
          feedback: string
          id: string
          organization_id: string
          submission_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          feedback: string
          id?: string
          organization_id: string
          submission_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          feedback?: string
          id?: string
          organization_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "graduation_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduation_feedback_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "graduation_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      graduation_requirements: {
        Row: {
          applies_to_level_ids: string[] | null
          category: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          applies_to_level_ids?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          applies_to_level_ids?: string[] | null
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "graduation_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      graduation_submissions: {
        Row: {
          assistant_id: string
          assistant_notes: string | null
          created_at: string
          id: string
          organization_id: string
          proof_url: string | null
          requirement_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assistant_id: string
          assistant_notes?: string | null
          created_at?: string
          id?: string
          organization_id: string
          proof_url?: string | null
          requirement_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assistant_id?: string
          assistant_notes?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          proof_url?: string | null
          requirement_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "graduation_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduation_submissions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "graduation_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_forecasts: {
        Row: {
          accuracy_pct: number | null
          actuals_revenue: number | null
          confidence_lower: number | null
          confidence_upper: number | null
          created_at: string
          expires_at: string
          forecast_type: string
          generated_at: string
          growth_rate_qoq: number | null
          growth_rate_yoy: number | null
          id: string
          insights: Json | null
          location_id: string | null
          momentum: string | null
          organization_id: string
          period_end: string
          period_label: string
          period_start: string
          projected_product_revenue: number | null
          projected_revenue: number
          projected_service_revenue: number | null
          scenario: string
          seasonality_index: number | null
        }
        Insert: {
          accuracy_pct?: number | null
          actuals_revenue?: number | null
          confidence_lower?: number | null
          confidence_upper?: number | null
          created_at?: string
          expires_at?: string
          forecast_type?: string
          generated_at?: string
          growth_rate_qoq?: number | null
          growth_rate_yoy?: number | null
          id?: string
          insights?: Json | null
          location_id?: string | null
          momentum?: string | null
          organization_id: string
          period_end: string
          period_label: string
          period_start: string
          projected_product_revenue?: number | null
          projected_revenue?: number
          projected_service_revenue?: number | null
          scenario?: string
          seasonality_index?: number | null
        }
        Update: {
          accuracy_pct?: number | null
          actuals_revenue?: number | null
          confidence_lower?: number | null
          confidence_upper?: number | null
          created_at?: string
          expires_at?: string
          forecast_type?: string
          generated_at?: string
          growth_rate_qoq?: number | null
          growth_rate_yoy?: number | null
          id?: string
          insights?: Json | null
          location_id?: string | null
          momentum?: string | null
          organization_id?: string
          period_end?: string
          period_label?: string
          period_start?: string
          projected_product_revenue?: number | null
          projected_revenue?: number
          projected_service_revenue?: number | null
          scenario?: string
          seasonality_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_forecasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      handbook_acknowledgments: {
        Row: {
          acknowledged_at: string
          handbook_id: string
          id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          handbook_id: string
          id?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          handbook_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handbook_acknowledgments_handbook_id_fkey"
            columns: ["handbook_id"]
            isOneToOne: false
            referencedRelation: "handbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      handbooks: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          file_url: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
          version: string | null
          visible_to_roles: Database["public"]["Enums"]["app_role"][] | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
          version?: string | null
          visible_to_roles?: Database["public"]["Enums"]["app_role"][] | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
          version?: string | null
          visible_to_roles?: Database["public"]["Enums"]["app_role"][] | null
        }
        Relationships: []
      }
      hardware_orders: {
        Row: {
          created_at: string
          delivered_at: string | null
          fulfillment_status: Database["public"]["Enums"]["fulfillment_status"]
          id: string
          item_type: string
          notes: string | null
          organization_id: string
          quantity: number
          shipped_at: string | null
          shipping_address: Json | null
          shipping_carrier: string | null
          stripe_checkout_session_id: string | null
          stripe_subscription_id: string | null
          tracking_number: string | null
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          item_type?: string
          notes?: string | null
          organization_id: string
          quantity?: number
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          stripe_checkout_session_id?: string | null
          stripe_subscription_id?: string | null
          tracking_number?: string | null
          unit_price_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          fulfillment_status?: Database["public"]["Enums"]["fulfillment_status"]
          id?: string
          item_type?: string
          notes?: string | null
          organization_id?: string
          quantity?: number
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          stripe_checkout_session_id?: string | null
          stripe_subscription_id?: string | null
          tracking_number?: string | null
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hardware_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      headshot_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          scheduled_date: string | null
          scheduled_location: string | null
          scheduled_time: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          scheduled_date?: string | null
          scheduled_location?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          scheduled_date?: string | null
          scheduled_location?: string | null
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_score_weights: {
        Row: {
          base_weight: number
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          requires_data_source: string | null
          updated_at: string
        }
        Insert: {
          base_weight?: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          requires_data_source?: string | null
          updated_at?: string
        }
        Update: {
          base_weight?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          requires_data_source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      huddle_acknowledgments: {
        Row: {
          acknowledged_at: string | null
          huddle_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          huddle_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          huddle_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "huddle_acknowledgments_huddle_id_fkey"
            columns: ["huddle_id"]
            isOneToOne: false
            referencedRelation: "daily_huddles"
            referencedColumns: ["id"]
          },
        ]
      }
      huddle_templates: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_default: boolean | null
          location_id: string | null
          name: string
          template_content: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_default?: boolean | null
          location_id?: string | null
          name: string
          template_content?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_default?: boolean | null
          location_id?: string | null
          name?: string
          template_content?: Json | null
        }
        Relationships: []
      }
      impersonation_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json | null
          session_id: string | null
          target_role: string | null
          target_user_id: string | null
          target_user_name: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          target_role?: string | null
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          target_role?: string | null
          target_user_id?: string | null
          target_user_name?: string | null
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          entity_type: string
          error_count: number | null
          errors: Json | null
          file_name: string | null
          file_size: number | null
          id: string
          is_dry_run: boolean | null
          location_id: string | null
          organization_id: string | null
          processed_rows: number | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          skip_count: number | null
          source_type: string
          started_at: string | null
          status: string | null
          success_count: number | null
          summary: Json | null
          template_id: string | null
          total_rows: number | null
          updated_at: string | null
          warnings: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_type: string
          error_count?: number | null
          errors?: Json | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_dry_run?: boolean | null
          location_id?: string | null
          organization_id?: string | null
          processed_rows?: number | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          skip_count?: number | null
          source_type: string
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          summary?: Json | null
          template_id?: string | null
          total_rows?: number | null
          updated_at?: string | null
          warnings?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_type?: string
          error_count?: number | null
          errors?: Json | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_dry_run?: boolean | null
          location_id?: string | null
          organization_id?: string | null
          processed_rows?: number | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          skip_count?: number | null
          source_type?: string
          started_at?: string | null
          status?: string | null
          success_count?: number | null
          summary?: Json | null
          template_id?: string | null
          total_rows?: number | null
          updated_at?: string | null
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "import_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      import_templates: {
        Row: {
          column_mappings: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          name: string
          source_type: string
          transformation_rules: Json | null
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          column_mappings?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name: string
          source_type: string
          transformation_rules?: Json | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          column_mappings?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name?: string
          source_type?: string
          transformation_rules?: Json | null
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      imported_staff: {
        Row: {
          bio: string | null
          created_at: string | null
          email: string | null
          external_id: string | null
          full_name: string
          hire_date: string | null
          id: string
          import_job_id: string | null
          import_source: string | null
          imported_at: string | null
          linked_at: string | null
          linked_user_id: string | null
          location_id: string | null
          organization_id: string | null
          phone: string | null
          specialties: string[] | null
          status: string | null
          stylist_level: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          linked_at?: string | null
          linked_user_id?: string | null
          location_id?: string | null
          organization_id?: string | null
          phone?: string | null
          specialties?: string[] | null
          status?: string | null
          stylist_level?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          linked_at?: string | null
          linked_user_id?: string | null
          location_id?: string | null
          organization_id?: string | null
          phone?: string | null
          specialties?: string[] | null
          status?: string | null
          stylist_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imported_staff_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_staff_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imported_staff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          corrective_action: string | null
          created_at: string
          description: string
          id: string
          incident_date: string
          incident_type: string
          involved_user_id: string | null
          location_id: string | null
          organization_id: string
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          corrective_action?: string | null
          created_at?: string
          description: string
          id?: string
          incident_date?: string
          incident_type?: string
          involved_user_id?: string | null
          location_id?: string | null
          organization_id: string
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          corrective_action?: string | null
          created_at?: string
          description?: string
          id?: string
          incident_date?: string
          incident_type?: string
          involved_user_id?: string | null
          location_id?: string | null
          organization_id?: string
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_benchmarks: {
        Row: {
          category: string
          city: string | null
          cohort_size: number
          computed_at: string
          created_at: string
          id: string
          metric_key: string
          p25: number
          p50: number
          p75: number
          p90: number
          period: string
        }
        Insert: {
          category: string
          city?: string | null
          cohort_size?: number
          computed_at?: string
          created_at?: string
          id?: string
          metric_key: string
          p25?: number
          p50?: number
          p75?: number
          p90?: number
          period: string
        }
        Update: {
          category?: string
          city?: string | null
          cohort_size?: number
          computed_at?: string
          created_at?: string
          id?: string
          metric_key?: string
          p25?: number
          p50?: number
          p75?: number
          p90?: number
          period?: string
        }
        Relationships: []
      }
      industry_trend_signals: {
        Row: {
          category: string
          city: string | null
          cohort_size: number
          computed_at: string
          confidence: Database["public"]["Enums"]["trend_confidence"]
          created_at: string
          current_value: number
          delta_pct: number
          direction: Database["public"]["Enums"]["trend_direction"]
          expires_at: string
          id: string
          insight_text: string | null
          metric_key: string
          period_end: string
          period_start: string
          previous_value: number
          signal_type: Database["public"]["Enums"]["industry_signal_type"]
        }
        Insert: {
          category: string
          city?: string | null
          cohort_size?: number
          computed_at?: string
          confidence?: Database["public"]["Enums"]["trend_confidence"]
          created_at?: string
          current_value?: number
          delta_pct?: number
          direction?: Database["public"]["Enums"]["trend_direction"]
          expires_at?: string
          id?: string
          insight_text?: string | null
          metric_key: string
          period_end: string
          period_start: string
          previous_value?: number
          signal_type: Database["public"]["Enums"]["industry_signal_type"]
        }
        Update: {
          category?: string
          city?: string | null
          cohort_size?: number
          computed_at?: string
          confidence?: Database["public"]["Enums"]["trend_confidence"]
          created_at?: string
          current_value?: number
          delta_pct?: number
          direction?: Database["public"]["Enums"]["trend_direction"]
          expires_at?: string
          id?: string
          insight_text?: string | null
          metric_key?: string
          period_end?: string
          period_start?: string
          previous_value?: number
          signal_type?: Database["public"]["Enums"]["industry_signal_type"]
        }
        Relationships: []
      }
      infrastructure_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_key: string
          metric_type: string
          recorded_at: string | null
          status: string | null
          threshold_critical: number | null
          threshold_warning: number | null
          unit: string | null
          value: number
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_key: string
          metric_type: string
          recorded_at?: string | null
          status?: string | null
          threshold_critical?: number | null
          threshold_warning?: number | null
          unit?: string | null
          value: number
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_key?: string
          metric_type?: string
          recorded_at?: string | null
          status?: string | null
          threshold_critical?: number | null
          threshold_warning?: number | null
          unit?: string | null
          value?: number
        }
        Relationships: []
      }
      inquiry_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          inquiry_id: string
          notes: string | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          inquiry_id: string
          notes?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          inquiry_id?: string
          notes?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_activity_log_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "salon_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_activity_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      inventory_alert_settings: {
        Row: {
          alert_channels: string[]
          audit_frequency: string
          audit_notify_roles: string[]
          audit_reminder_days_before: number
          audit_reminder_enabled: boolean
          auto_create_draft_po: boolean
          auto_reorder_enabled: boolean
          auto_reorder_mode: string
          created_at: string
          dead_stock_days: number
          dead_stock_enabled: boolean
          default_threshold_pct: number
          enabled: boolean
          id: string
          max_auto_reorder_value: number | null
          organization_id: string
          recipient_roles: string[]
          recipient_user_ids: string[]
          require_po_approval: boolean
          updated_at: string
        }
        Insert: {
          alert_channels?: string[]
          audit_frequency?: string
          audit_notify_roles?: string[]
          audit_reminder_days_before?: number
          audit_reminder_enabled?: boolean
          auto_create_draft_po?: boolean
          auto_reorder_enabled?: boolean
          auto_reorder_mode?: string
          created_at?: string
          dead_stock_days?: number
          dead_stock_enabled?: boolean
          default_threshold_pct?: number
          enabled?: boolean
          id?: string
          max_auto_reorder_value?: number | null
          organization_id: string
          recipient_roles?: string[]
          recipient_user_ids?: string[]
          require_po_approval?: boolean
          updated_at?: string
        }
        Update: {
          alert_channels?: string[]
          audit_frequency?: string
          audit_notify_roles?: string[]
          audit_reminder_days_before?: number
          audit_reminder_enabled?: boolean
          auto_create_draft_po?: boolean
          auto_reorder_enabled?: boolean
          auto_reorder_mode?: string
          created_at?: string
          dead_stock_days?: number
          dead_stock_enabled?: boolean
          default_threshold_pct?: number
          enabled?: boolean
          id?: string
          max_auto_reorder_value?: number | null
          organization_id?: string
          recipient_roles?: string[]
          recipient_user_ids?: string[]
          require_po_approval?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_alert_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audit_schedule: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          count_session_id: string | null
          created_at: string
          due_date: string
          id: string
          location_id: string | null
          notes: string | null
          organization_id: string
          reminder_sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          count_session_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id: string
          reminder_sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          count_session_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          reminder_sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_schedule_count_session_id_fkey"
            columns: ["count_session_id"]
            isOneToOne: false
            referencedRelation: "count_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_schedule_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_projections: {
        Row: {
          allocated: number
          available: number | null
          id: string
          last_calculated_at: string
          location_id: string | null
          on_hand: number
          on_order: number
          organization_id: string
          product_id: string
        }
        Insert: {
          allocated?: number
          available?: number | null
          id?: string
          last_calculated_at?: string
          location_id?: string | null
          on_hand?: number
          on_order?: number
          organization_id: string
          product_id: string
        }
        Update: {
          allocated?: number
          available?: number | null
          id?: string
          last_calculated_at?: string
          location_id?: string | null
          on_hand?: number
          on_order?: number
          organization_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_projections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_projections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_projections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reorder_queue: {
        Row: {
          created_at: string
          id: string
          ordered_at: string | null
          organization_id: string
          product_id: string
          reason: string | null
          received_at: string | null
          status: string
          suggested_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ordered_at?: string | null
          organization_id: string
          product_id: string
          reason?: string | null
          received_at?: string | null
          status?: string
          suggested_quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ordered_at?: string | null
          organization_id?: string
          product_id?: string
          reason?: string | null
          received_at?: string | null
          status?: string
          suggested_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reorder_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reorder_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reorder_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_risk_projections: {
        Row: {
          avg_daily_usage: number | null
          current_on_hand: number | null
          id: string
          last_forecast_at: string | null
          location_id: string | null
          open_po_quantity: number | null
          organization_id: string
          product_id: string
          projected_depletion_date: string | null
          recommended_order_qty: number | null
          stockout_risk_level: string | null
        }
        Insert: {
          avg_daily_usage?: number | null
          current_on_hand?: number | null
          id?: string
          last_forecast_at?: string | null
          location_id?: string | null
          open_po_quantity?: number | null
          organization_id: string
          product_id: string
          projected_depletion_date?: string | null
          recommended_order_qty?: number | null
          stockout_risk_level?: string | null
        }
        Update: {
          avg_daily_usage?: number | null
          current_on_hand?: number | null
          id?: string
          last_forecast_at?: string | null
          location_id?: string | null
          open_po_quantity?: number | null
          organization_id?: string
          product_id?: string
          projected_depletion_date?: string | null
          recommended_order_qty?: number | null
          stockout_risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_risk_projections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_risk_projections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_risk_projections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_settings_audit: {
        Row: {
          changed_by: string | null
          created_at: string
          field_name: string
          id: string
          location_id: string | null
          new_value: number | null
          old_value: number | null
          organization_id: string
          product_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          field_name: string
          id?: string
          location_id?: string | null
          new_value?: number | null
          old_value?: number | null
          organization_id: string
          product_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          field_name?: string
          id?: string
          location_id?: string | null
          new_value?: number | null
          old_value?: number | null
          organization_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_settings_audit_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_application_notes: {
        Row: {
          application_id: string
          author_id: string
          created_at: string
          id: string
          note: string
          note_type: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          author_id: string
          created_at?: string
          id?: string
          note: string
          note_type?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          note_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          assigned_to: string | null
          client_book: string
          created_at: string
          email: string
          experience: string
          id: string
          instagram: string | null
          is_archived: boolean | null
          is_starred: boolean | null
          last_contacted_at: string | null
          message: string | null
          name: string
          phone: string
          pipeline_stage: string
          rating: number | null
          source: string | null
          source_detail: string | null
          specialties: string
          updated_at: string
          why_join_us: string
        }
        Insert: {
          assigned_to?: string | null
          client_book: string
          created_at?: string
          email: string
          experience: string
          id?: string
          instagram?: string | null
          is_archived?: boolean | null
          is_starred?: boolean | null
          last_contacted_at?: string | null
          message?: string | null
          name: string
          phone: string
          pipeline_stage?: string
          rating?: number | null
          source?: string | null
          source_detail?: string | null
          specialties: string
          updated_at?: string
          why_join_us: string
        }
        Update: {
          assigned_to?: string | null
          client_book?: string
          created_at?: string
          email?: string
          experience?: string
          id?: string
          instagram?: string | null
          is_archived?: boolean | null
          is_starred?: boolean | null
          last_contacted_at?: string | null
          message?: string | null
          name?: string
          phone?: string
          pipeline_stage?: string
          rating?: number | null
          source?: string | null
          source_detail?: string | null
          specialties?: string
          updated_at?: string
          why_join_us?: string
        }
        Relationships: []
      }
      kb_article_reads: {
        Row: {
          article_id: string
          id: string
          organization_id: string | null
          read_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          id?: string
          organization_id?: string | null
          read_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          id?: string
          organization_id?: string | null
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_reads_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_reads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string
          id: string
          is_featured: boolean | null
          is_pinned: boolean | null
          published_at: string | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          published_at?: string | null
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_featured?: boolean | null
          is_pinned?: boolean | null
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      kiosk_analytics: {
        Row: {
          abandoned_at_step: string | null
          appointment_id: string | null
          check_in_method: string | null
          client_id: string | null
          confirmation_duration_seconds: number | null
          created_at: string | null
          error_occurred: boolean | null
          error_type: string | null
          form_signing_duration_seconds: number | null
          id: string
          is_walk_in: boolean | null
          kiosk_device_id: string | null
          location_id: string | null
          lookup_attempts: number | null
          lookup_duration_seconds: number | null
          organization_id: string | null
          session_completed: boolean | null
          session_ended_at: string | null
          session_id: string
          session_started_at: string
          total_duration_seconds: number | null
        }
        Insert: {
          abandoned_at_step?: string | null
          appointment_id?: string | null
          check_in_method?: string | null
          client_id?: string | null
          confirmation_duration_seconds?: number | null
          created_at?: string | null
          error_occurred?: boolean | null
          error_type?: string | null
          form_signing_duration_seconds?: number | null
          id?: string
          is_walk_in?: boolean | null
          kiosk_device_id?: string | null
          location_id?: string | null
          lookup_attempts?: number | null
          lookup_duration_seconds?: number | null
          organization_id?: string | null
          session_completed?: boolean | null
          session_ended_at?: string | null
          session_id: string
          session_started_at: string
          total_duration_seconds?: number | null
        }
        Update: {
          abandoned_at_step?: string | null
          appointment_id?: string | null
          check_in_method?: string | null
          client_id?: string | null
          confirmation_duration_seconds?: number | null
          created_at?: string | null
          error_occurred?: boolean | null
          error_type?: string | null
          form_signing_duration_seconds?: number | null
          id?: string
          is_walk_in?: boolean | null
          kiosk_device_id?: string | null
          location_id?: string | null
          lookup_attempts?: number | null
          lookup_duration_seconds?: number | null
          organization_id?: string | null
          session_completed?: boolean | null
          session_ended_at?: string | null
          session_id?: string
          session_started_at?: string
          total_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_analytics_kiosk_device_id_fkey"
            columns: ["kiosk_device_id"]
            isOneToOne: false
            referencedRelation: "kiosk_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_analytics_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_analytics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_devices: {
        Row: {
          created_at: string | null
          device_name: string
          device_token: string
          id: string
          is_active: boolean | null
          last_heartbeat_at: string | null
          location_id: string | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_name: string
          device_token?: string
          id?: string
          is_active?: boolean | null
          last_heartbeat_at?: string | null
          location_id?: string | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_name?: string
          device_token?: string
          id?: string
          is_active?: boolean | null
          last_heartbeat_at?: string | null
          location_id?: string | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          cadence: string
          created_at: string
          critical_threshold: number
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          location_id: string | null
          metric_key: string
          organization_id: string
          target_value: number
          unit: string
          updated_at: string
          warning_threshold: number
        }
        Insert: {
          cadence?: string
          created_at?: string
          critical_threshold: number
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          metric_key: string
          organization_id: string
          target_value: number
          unit?: string
          updated_at?: string
          warning_threshold: number
        }
        Update: {
          cadence?: string
          created_at?: string
          critical_threshold?: number
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          metric_key?: string
          organization_id?: string
          target_value?: number
          unit?: string
          updated_at?: string
          warning_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_readings: {
        Row: {
          created_at: string
          id: string
          kpi_definition_id: string
          location_id: string | null
          organization_id: string
          reading_date: string
          source: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_definition_id: string
          location_id?: string | null
          organization_id: string
          reading_date: string
          source?: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          kpi_definition_id?: string
          location_id?: string | null
          organization_id?: string
          reading_date?: string
          source?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_readings_kpi_definition_id_fkey"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_achievements: {
        Row: {
          badge_color: string
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          key: string
          name: string
          organization_id: string | null
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          badge_color?: string
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          organization_id?: string | null
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          badge_color?: string
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          organization_id?: string | null
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_history: {
        Row: {
          created_at: string
          extensions_rank: number | null
          extensions_value: number | null
          id: string
          new_clients_rank: number | null
          new_clients_value: number | null
          organization_id: string | null
          overall_rank: number
          overall_score: number
          retail_rank: number | null
          retail_value: number | null
          retention_rank: number | null
          retention_value: number | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          extensions_rank?: number | null
          extensions_value?: number | null
          id?: string
          new_clients_rank?: number | null
          new_clients_value?: number | null
          organization_id?: string | null
          overall_rank: number
          overall_score: number
          retail_rank?: number | null
          retail_value?: number | null
          retention_rank?: number | null
          retention_value?: number | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          extensions_rank?: number | null
          extensions_value?: number | null
          id?: string
          new_clients_rank?: number | null
          new_clients_value?: number | null
          organization_id?: string | null
          overall_rank?: number
          overall_score?: number
          retail_rank?: number | null
          retail_value?: number | null
          retention_rank?: number | null
          retention_value?: number | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_weights: {
        Row: {
          extensions_weight: number
          id: string
          new_clients_weight: number
          organization_id: string | null
          retail_weight: number
          retention_weight: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          extensions_weight?: number
          id?: string
          new_clients_weight?: number
          organization_id?: string | null
          retail_weight?: number
          retention_weight?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          extensions_weight?: number
          id?: string
          new_clients_weight?: number
          organization_id?: string | null
          retail_weight?: number
          retention_weight?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_weights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      level_commission_overrides: {
        Row: {
          created_at: string
          id: string
          location_id: string
          organization_id: string
          retail_commission_rate: number | null
          service_commission_rate: number | null
          stylist_level_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          organization_id: string
          retail_commission_rate?: number | null
          service_commission_rate?: number | null
          stylist_level_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          organization_id?: string
          retail_commission_rate?: number | null
          service_commission_rate?: number | null
          stylist_level_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "level_commission_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_commission_overrides_stylist_level_id_fkey"
            columns: ["stylist_level_id"]
            isOneToOne: false
            referencedRelation: "stylist_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      level_criteria_overrides: {
        Row: {
          created_at: string
          criteria_type: string
          id: string
          location_group_id: string | null
          location_id: string | null
          organization_id: string
          override_field: string
          override_value: number
          stylist_level_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          criteria_type: string
          id?: string
          location_group_id?: string | null
          location_id?: string | null
          organization_id: string
          override_field: string
          override_value: number
          stylist_level_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          criteria_type?: string
          id?: string
          location_group_id?: string | null
          location_id?: string | null
          organization_id?: string
          override_field?: string
          override_value?: number
          stylist_level_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "level_criteria_overrides_location_group_id_fkey"
            columns: ["location_group_id"]
            isOneToOne: false
            referencedRelation: "location_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_criteria_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_criteria_overrides_stylist_level_id_fkey"
            columns: ["stylist_level_id"]
            isOneToOne: false
            referencedRelation: "stylist_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      level_progress_snapshots: {
        Row: {
          composite_score: number
          created_at: string
          criteria_snapshot: Json | null
          id: string
          organization_id: string
          snapshot_month: string
          stylist_level_id: string | null
          user_id: string
        }
        Insert: {
          composite_score?: number
          created_at?: string
          criteria_snapshot?: Json | null
          id?: string
          organization_id: string
          snapshot_month: string
          stylist_level_id?: string | null
          user_id: string
        }
        Update: {
          composite_score?: number
          created_at?: string
          criteria_snapshot?: Json | null
          id?: string
          organization_id?: string
          snapshot_month?: string
          stylist_level_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_progress_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_progress_snapshots_stylist_level_id_fkey"
            columns: ["stylist_level_id"]
            isOneToOne: false
            referencedRelation: "stylist_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      level_promotion_criteria: {
        Row: {
          avg_ticket_enabled: boolean
          avg_ticket_threshold: number
          avg_ticket_weight: number
          created_at: string
          evaluation_window_days: number
          id: string
          is_active: boolean
          new_clients_enabled: boolean
          new_clients_threshold: number
          new_clients_weight: number
          organization_id: string
          rebooking_enabled: boolean
          rebooking_pct_threshold: number
          rebooking_weight: number
          requires_manual_approval: boolean
          retail_enabled: boolean
          retail_pct_threshold: number
          retail_weight: number
          retention_rate_enabled: boolean
          retention_rate_threshold: number
          retention_rate_weight: number
          rev_per_hour_enabled: boolean
          rev_per_hour_threshold: number
          rev_per_hour_weight: number
          revenue_enabled: boolean
          revenue_threshold: number
          revenue_weight: number
          stylist_level_id: string
          tenure_days: number
          tenure_enabled: boolean
          updated_at: string
          utilization_enabled: boolean
          utilization_threshold: number
          utilization_weight: number
        }
        Insert: {
          avg_ticket_enabled?: boolean
          avg_ticket_threshold?: number
          avg_ticket_weight?: number
          created_at?: string
          evaluation_window_days?: number
          id?: string
          is_active?: boolean
          new_clients_enabled?: boolean
          new_clients_threshold?: number
          new_clients_weight?: number
          organization_id: string
          rebooking_enabled?: boolean
          rebooking_pct_threshold?: number
          rebooking_weight?: number
          requires_manual_approval?: boolean
          retail_enabled?: boolean
          retail_pct_threshold?: number
          retail_weight?: number
          retention_rate_enabled?: boolean
          retention_rate_threshold?: number
          retention_rate_weight?: number
          rev_per_hour_enabled?: boolean
          rev_per_hour_threshold?: number
          rev_per_hour_weight?: number
          revenue_enabled?: boolean
          revenue_threshold?: number
          revenue_weight?: number
          stylist_level_id: string
          tenure_days?: number
          tenure_enabled?: boolean
          updated_at?: string
          utilization_enabled?: boolean
          utilization_threshold?: number
          utilization_weight?: number
        }
        Update: {
          avg_ticket_enabled?: boolean
          avg_ticket_threshold?: number
          avg_ticket_weight?: number
          created_at?: string
          evaluation_window_days?: number
          id?: string
          is_active?: boolean
          new_clients_enabled?: boolean
          new_clients_threshold?: number
          new_clients_weight?: number
          organization_id?: string
          rebooking_enabled?: boolean
          rebooking_pct_threshold?: number
          rebooking_weight?: number
          requires_manual_approval?: boolean
          retail_enabled?: boolean
          retail_pct_threshold?: number
          retail_weight?: number
          retention_rate_enabled?: boolean
          retention_rate_threshold?: number
          retention_rate_weight?: number
          rev_per_hour_enabled?: boolean
          rev_per_hour_threshold?: number
          rev_per_hour_weight?: number
          revenue_enabled?: boolean
          revenue_threshold?: number
          revenue_weight?: number
          stylist_level_id?: string
          tenure_days?: number
          tenure_enabled?: boolean
          updated_at?: string
          utilization_enabled?: boolean
          utilization_threshold?: number
          utilization_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "level_promotion_criteria_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_promotion_criteria_stylist_level_id_fkey"
            columns: ["stylist_level_id"]
            isOneToOne: false
            referencedRelation: "stylist_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      level_promotions: {
        Row: {
          created_at: string
          direction: string
          from_level: string
          id: string
          notes: string | null
          organization_id: string
          promoted_at: string
          promoted_by: string
          to_level: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          from_level: string
          id?: string
          notes?: string | null
          organization_id: string
          promoted_at?: string
          promoted_by: string
          to_level: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          from_level?: string
          id?: string
          notes?: string | null
          organization_id?: string
          promoted_at?: string
          promoted_by?: string
          to_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "level_promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      level_retention_criteria: {
        Row: {
          action_type: Database["public"]["Enums"]["retention_action_type"]
          avg_ticket_enabled: boolean
          avg_ticket_minimum: number
          created_at: string
          evaluation_window_days: number
          grace_period_days: number
          id: string
          is_active: boolean
          new_clients_enabled: boolean
          new_clients_minimum: number
          organization_id: string
          rebooking_enabled: boolean
          rebooking_pct_minimum: number
          retail_enabled: boolean
          retail_pct_minimum: number
          retention_enabled: boolean
          retention_rate_enabled: boolean
          retention_rate_minimum: number
          rev_per_hour_enabled: boolean
          rev_per_hour_minimum: number
          revenue_enabled: boolean
          revenue_minimum: number
          stylist_level_id: string
          updated_at: string
          utilization_enabled: boolean
          utilization_minimum: number
        }
        Insert: {
          action_type?: Database["public"]["Enums"]["retention_action_type"]
          avg_ticket_enabled?: boolean
          avg_ticket_minimum?: number
          created_at?: string
          evaluation_window_days?: number
          grace_period_days?: number
          id?: string
          is_active?: boolean
          new_clients_enabled?: boolean
          new_clients_minimum?: number
          organization_id: string
          rebooking_enabled?: boolean
          rebooking_pct_minimum?: number
          retail_enabled?: boolean
          retail_pct_minimum?: number
          retention_enabled?: boolean
          retention_rate_enabled?: boolean
          retention_rate_minimum?: number
          rev_per_hour_enabled?: boolean
          rev_per_hour_minimum?: number
          revenue_enabled?: boolean
          revenue_minimum?: number
          stylist_level_id: string
          updated_at?: string
          utilization_enabled?: boolean
          utilization_minimum?: number
        }
        Update: {
          action_type?: Database["public"]["Enums"]["retention_action_type"]
          avg_ticket_enabled?: boolean
          avg_ticket_minimum?: number
          created_at?: string
          evaluation_window_days?: number
          grace_period_days?: number
          id?: string
          is_active?: boolean
          new_clients_enabled?: boolean
          new_clients_minimum?: number
          organization_id?: string
          rebooking_enabled?: boolean
          rebooking_pct_minimum?: number
          retail_enabled?: boolean
          retail_pct_minimum?: number
          retention_enabled?: boolean
          retention_rate_enabled?: boolean
          retention_rate_minimum?: number
          rev_per_hour_enabled?: boolean
          rev_per_hour_minimum?: number
          revenue_enabled?: boolean
          revenue_minimum?: number
          stylist_level_id?: string
          updated_at?: string
          utilization_enabled?: boolean
          utilization_minimum?: number
        }
        Relationships: [
          {
            foreignKeyName: "level_retention_criteria_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_retention_criteria_stylist_level_id_fkey"
            columns: ["stylist_level_id"]
            isOneToOne: false
            referencedRelation: "stylist_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      lever_outcomes: {
        Row: {
          created_at: string
          delta: number | null
          id: string
          measured_at: string | null
          measurement_window: string
          metric_key: string
          organization_id: string
          recommendation_id: string
          value_after: number | null
          value_before: number
        }
        Insert: {
          created_at?: string
          delta?: number | null
          id?: string
          measured_at?: string | null
          measurement_window?: string
          metric_key: string
          organization_id: string
          recommendation_id: string
          value_after?: number | null
          value_before: number
        }
        Update: {
          created_at?: string
          delta?: number | null
          id?: string
          measured_at?: string | null
          measurement_window?: string
          metric_key?: string
          organization_id?: string
          recommendation_id?: string
          value_after?: number | null
          value_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "lever_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lever_outcomes_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "lever_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      lever_recommendations: {
        Row: {
          confidence: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          estimated_monthly_impact: number | null
          evidence: Json | null
          expires_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          lever_type: string
          modified_action: string | null
          organization_id: string
          period_end: string
          period_start: string
          status: string
          summary: string
          title: string
          what_to_do: string
          why_now: Json
        }
        Insert: {
          confidence?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          estimated_monthly_impact?: number | null
          evidence?: Json | null
          expires_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          lever_type: string
          modified_action?: string | null
          organization_id: string
          period_end: string
          period_start: string
          status?: string
          summary: string
          title: string
          what_to_do: string
          why_now?: Json
        }
        Update: {
          confidence?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          estimated_monthly_impact?: number | null
          evidence?: Json | null
          expires_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          lever_type?: string
          modified_action?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          status?: string
          summary?: string
          title?: string
          what_to_do?: string
          why_now?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lever_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_groups: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_health_scores: {
        Row: {
          calculated_at: string
          data_profile: Json
          id: string
          location_id: string
          organization_id: string
          recommendations: string[]
          risk_level: string
          score: number
          score_breakdown: Json
          score_date: string
          trends: Json
        }
        Insert: {
          calculated_at?: string
          data_profile?: Json
          id?: string
          location_id: string
          organization_id: string
          recommendations?: string[]
          risk_level?: string
          score?: number
          score_breakdown?: Json
          score_date?: string
          trends?: Json
        }
        Update: {
          calculated_at?: string
          data_profile?: Json
          id?: string
          location_id?: string
          organization_id?: string
          recommendations?: string[]
          risk_level?: string
          score?: number
          score_breakdown?: Json
          score_date?: string
          trends?: Json
        }
        Relationships: [
          {
            foreignKeyName: "location_health_scores_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_health_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_inventory_leads: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          location_id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          location_id: string
          organization_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          location_id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_inventory_leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_product_settings: {
        Row: {
          created_at: string
          id: string
          is_tracked: boolean
          location_id: string
          organization_id: string
          par_level: number | null
          product_id: string
          reorder_level: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_tracked?: boolean
          location_id: string
          organization_id: string
          par_level?: number | null
          product_id: string
          reorder_level?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_tracked?: boolean
          location_id?: string
          organization_id?: string
          par_level?: number | null
          product_id?: string
          reorder_level?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_product_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_product_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_product_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_product_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          appointment_padding_minutes: number | null
          assistant_ratio: number | null
          booking_url: string | null
          booth_assignment_enabled: boolean
          break_minutes_per_day: number | null
          city: string
          country: string | null
          created_at: string | null
          day_rate_blackout_dates: string[] | null
          day_rate_default_price: number | null
          day_rate_enabled: boolean | null
          display_order: number | null
          google_maps_url: string | null
          holiday_closures: Json | null
          hours: string | null
          hours_json: Json | null
          id: string
          import_job_id: string | null
          is_active: boolean | null
          location_group_id: string | null
          lunch_minutes: number | null
          major_crossroads: string | null
          name: string
          organization_id: string | null
          phone: string
          phorest_branch_id: string | null
          rental_model: string
          show_on_website: boolean
          state_province: string | null
          store_number: string | null
          stripe_account_id: string | null
          stripe_payments_enabled: boolean | null
          stripe_status: string | null
          stylist_capacity: number | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          appointment_padding_minutes?: number | null
          assistant_ratio?: number | null
          booking_url?: string | null
          booth_assignment_enabled?: boolean
          break_minutes_per_day?: number | null
          city: string
          country?: string | null
          created_at?: string | null
          day_rate_blackout_dates?: string[] | null
          day_rate_default_price?: number | null
          day_rate_enabled?: boolean | null
          display_order?: number | null
          google_maps_url?: string | null
          holiday_closures?: Json | null
          hours?: string | null
          hours_json?: Json | null
          id: string
          import_job_id?: string | null
          is_active?: boolean | null
          location_group_id?: string | null
          lunch_minutes?: number | null
          major_crossroads?: string | null
          name: string
          organization_id?: string | null
          phone: string
          phorest_branch_id?: string | null
          rental_model?: string
          show_on_website?: boolean
          state_province?: string | null
          store_number?: string | null
          stripe_account_id?: string | null
          stripe_payments_enabled?: boolean | null
          stripe_status?: string | null
          stylist_capacity?: number | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          appointment_padding_minutes?: number | null
          assistant_ratio?: number | null
          booking_url?: string | null
          booth_assignment_enabled?: boolean
          break_minutes_per_day?: number | null
          city?: string
          country?: string | null
          created_at?: string | null
          day_rate_blackout_dates?: string[] | null
          day_rate_default_price?: number | null
          day_rate_enabled?: boolean | null
          display_order?: number | null
          google_maps_url?: string | null
          holiday_closures?: Json | null
          hours?: string | null
          hours_json?: Json | null
          id?: string
          import_job_id?: string | null
          is_active?: boolean | null
          location_group_id?: string | null
          lunch_minutes?: number | null
          major_crossroads?: string | null
          name?: string
          organization_id?: string | null
          phone?: string
          phorest_branch_id?: string | null
          rental_model?: string
          show_on_website?: boolean
          state_province?: string | null
          store_number?: string | null
          stripe_account_id?: string | null
          stripe_payments_enabled?: boolean | null
          stripe_status?: string | null
          stylist_capacity?: number | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_location_group_id_fkey"
            columns: ["location_group_id"]
            isOneToOne: false
            referencedRelation: "location_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_analytics_daily: {
        Row: {
          active_members: number | null
          analytics_date: string
          id: string
          loyalty_attributed_revenue: number | null
          new_enrollments: number | null
          organization_id: string
          points_earned: number | null
          points_expired: number | null
          points_redeemed: number | null
          redemption_value: number | null
          tier_upgrades: number | null
        }
        Insert: {
          active_members?: number | null
          analytics_date: string
          id?: string
          loyalty_attributed_revenue?: number | null
          new_enrollments?: number | null
          organization_id: string
          points_earned?: number | null
          points_expired?: number | null
          points_redeemed?: number | null
          redemption_value?: number | null
          tier_upgrades?: number | null
        }
        Update: {
          active_members?: number | null
          analytics_date?: string
          id?: string
          loyalty_attributed_revenue?: number | null
          new_enrollments?: number | null
          organization_id?: string
          points_earned?: number | null
          points_expired?: number | null
          points_redeemed?: number | null
          redemption_value?: number | null
          tier_upgrades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_analytics_daily_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_program_settings: {
        Row: {
          bonus_rules: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          minimum_redemption_points: number | null
          organization_id: string
          points_expiration_days: number | null
          points_expire: boolean | null
          points_per_dollar: number | null
          points_to_dollar_ratio: number | null
          product_multiplier: number | null
          program_name: string | null
          service_multiplier: number | null
          updated_at: string | null
        }
        Insert: {
          bonus_rules?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          minimum_redemption_points?: number | null
          organization_id: string
          points_expiration_days?: number | null
          points_expire?: boolean | null
          points_per_dollar?: number | null
          points_to_dollar_ratio?: number | null
          product_multiplier?: number | null
          program_name?: string | null
          service_multiplier?: number | null
          updated_at?: string | null
        }
        Update: {
          bonus_rules?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          minimum_redemption_points?: number | null
          organization_id?: string
          points_expiration_days?: number | null
          points_expire?: boolean | null
          points_per_dollar?: number | null
          points_to_dollar_ratio?: number | null
          product_multiplier?: number | null
          program_name?: string | null
          service_multiplier?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_program_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          minimum_lifetime_points: number
          organization_id: string
          perks: string[] | null
          points_multiplier: number | null
          sort_order: number | null
          tier_key: string
          tier_name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          minimum_lifetime_points?: number
          organization_id: string
          perks?: string[] | null
          points_multiplier?: number | null
          sort_order?: number | null
          tier_key: string
          tier_name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          minimum_lifetime_points?: number
          organization_id?: string
          perks?: string[] | null
          points_multiplier?: number | null
          sort_order?: number | null
          tier_key?: string
          tier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_tiers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          budget: number | null
          campaign_name: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          organization_id: string | null
          platform: string | null
          spend_to_date: number | null
          start_date: string | null
          updated_at: string | null
          utm_campaign: string
        }
        Insert: {
          budget?: number | null
          campaign_name: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string | null
          platform?: string | null
          spend_to_date?: number | null
          start_date?: string | null
          updated_at?: string | null
          utm_campaign: string
        }
        Update: {
          budget?: number | null
          campaign_name?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          organization_id?: string | null
          platform?: string | null
          spend_to_date?: number | null
          start_date?: string | null
          updated_at?: string | null
          utm_campaign?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_notes: {
        Row: {
          coach_id: string
          content: string
          created_at: string
          id: string
          is_private: boolean
          meeting_id: string
          photo_urls: string[] | null
          topic_category: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          content: string
          created_at?: string
          id?: string
          is_private?: boolean
          meeting_id: string
          photo_urls?: string[] | null
          topic_category?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean
          meeting_id?: string
          photo_urls?: string[] | null
          topic_category?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "one_on_one_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_reports: {
        Row: {
          acknowledged_at: string | null
          coach_id: string
          created_at: string
          id: string
          included_items: Json | null
          included_notes: Json | null
          meeting_id: string
          report_content: string
          sent_at: string | null
          team_member_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          coach_id: string
          created_at?: string
          id?: string
          included_items?: Json | null
          included_notes?: Json | null
          meeting_id: string
          report_content: string
          sent_at?: string | null
          team_member_id: string
        }
        Update: {
          acknowledged_at?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          included_items?: Json | null
          included_notes?: Json | null
          meeting_id?: string
          report_content?: string
          sent_at?: string | null
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_reports_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "one_on_one_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_requests: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          linked_meeting_id: string | null
          manager_id: string
          priority: string
          reason: string
          status: string
          team_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          linked_meeting_id?: string | null
          manager_id: string
          priority?: string
          reason: string
          status?: string
          team_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          linked_meeting_id?: string | null
          manager_id?: string
          priority?: string
          reason?: string
          status?: string
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_requests_linked_meeting_id_fkey"
            columns: ["linked_meeting_id"]
            isOneToOne: false
            referencedRelation: "one_on_one_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          attendee_user_ids: string[]
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          location_id: string | null
          meeting_mode: Database["public"]["Enums"]["meeting_mode"]
          meeting_type: Database["public"]["Enums"]["meeting_type"]
          name: string
          notes: string | null
          organization_id: string
          title_template: string
          updated_at: string
          video_link: string | null
        }
        Insert: {
          attendee_user_ids?: string[]
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_id?: string | null
          meeting_mode?: Database["public"]["Enums"]["meeting_mode"]
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          name: string
          notes?: string | null
          organization_id: string
          title_template?: string
          updated_at?: string
          video_link?: string | null
        }
        Update: {
          attendee_user_ids?: string[]
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          location_id?: string | null
          meeting_mode?: Database["public"]["Enums"]["meeting_mode"]
          meeting_type?: Database["public"]["Enums"]["meeting_type"]
          name?: string
          notes?: string | null
          organization_id?: string
          title_template?: string
          updated_at?: string
          video_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_benchmarks: {
        Row: {
          benchmark_type: string
          context: string | null
          created_at: string | null
          id: string
          metric_key: string
          organization_id: string | null
          valid_from: string | null
          valid_to: string | null
          value: number
        }
        Insert: {
          benchmark_type: string
          context?: string | null
          created_at?: string | null
          id?: string
          metric_key: string
          organization_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value: number
        }
        Update: {
          benchmark_type?: string
          context?: string | null
          created_at?: string | null
          id?: string
          metric_key?: string
          organization_id?: string | null
          valid_from?: string | null
          valid_to?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_benchmarks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mix_bowl_lines: {
        Row: {
          bowl_id: string
          brand_snapshot: string | null
          captured_via: string
          created_at: string
          dispensed_cost_snapshot: number
          dispensed_quantity: number
          dispensed_unit: string
          id: string
          product_id: string | null
          product_name_snapshot: string
          sequence_order: number
        }
        Insert: {
          bowl_id: string
          brand_snapshot?: string | null
          captured_via?: string
          created_at?: string
          dispensed_cost_snapshot?: number
          dispensed_quantity?: number
          dispensed_unit?: string
          id?: string
          product_id?: string | null
          product_name_snapshot: string
          sequence_order?: number
        }
        Update: {
          bowl_id?: string
          brand_snapshot?: string | null
          captured_via?: string
          created_at?: string
          dispensed_cost_snapshot?: number
          dispensed_quantity?: number
          dispensed_unit?: string
          id?: string
          product_id?: string | null
          product_name_snapshot?: string
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "mix_bowl_lines_bowl_id_fkey"
            columns: ["bowl_id"]
            isOneToOne: false
            referencedRelation: "mix_bowls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mix_bowl_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mix_bowl_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mix_bowl_projections: {
        Row: {
          bowl_number: number | null
          current_status: string | null
          dispensed_total: number | null
          estimated_cost: number | null
          has_reweigh: boolean | null
          last_event_at: string | null
          leftover_total: number | null
          line_item_count: number | null
          mix_bowl_id: string
          mix_session_id: string
          net_usage_total: number | null
          organization_id: string
          purpose: string | null
          updated_at: string | null
        }
        Insert: {
          bowl_number?: number | null
          current_status?: string | null
          dispensed_total?: number | null
          estimated_cost?: number | null
          has_reweigh?: boolean | null
          last_event_at?: string | null
          leftover_total?: number | null
          line_item_count?: number | null
          mix_bowl_id: string
          mix_session_id: string
          net_usage_total?: number | null
          organization_id: string
          purpose?: string | null
          updated_at?: string | null
        }
        Update: {
          bowl_number?: number | null
          current_status?: string | null
          dispensed_total?: number | null
          estimated_cost?: number | null
          has_reweigh?: boolean | null
          last_event_at?: string | null
          leftover_total?: number | null
          line_item_count?: number | null
          mix_bowl_id?: string
          mix_session_id?: string
          net_usage_total?: number | null
          organization_id?: string
          purpose?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mix_bowl_projections_mix_bowl_id_fkey"
            columns: ["mix_bowl_id"]
            isOneToOne: true
            referencedRelation: "mix_bowls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mix_bowl_projections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mix_bowls: {
        Row: {
          bowl_name: string | null
          bowl_number: number
          completed_at: string | null
          container_type: Database["public"]["Enums"]["container_type"]
          created_at: string
          id: string
          leftover_weight: number | null
          mix_session_id: string
          net_usage_weight: number | null
          prepared_by_staff_id: string | null
          purpose: string | null
          started_at: string
          status: Database["public"]["Enums"]["mix_bowl_status"]
          total_dispensed_cost: number | null
          total_dispensed_weight: number | null
          updated_at: string
        }
        Insert: {
          bowl_name?: string | null
          bowl_number?: number
          completed_at?: string | null
          container_type?: Database["public"]["Enums"]["container_type"]
          created_at?: string
          id?: string
          leftover_weight?: number | null
          mix_session_id: string
          net_usage_weight?: number | null
          prepared_by_staff_id?: string | null
          purpose?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["mix_bowl_status"]
          total_dispensed_cost?: number | null
          total_dispensed_weight?: number | null
          updated_at?: string
        }
        Update: {
          bowl_name?: string | null
          bowl_number?: number
          completed_at?: string | null
          container_type?: Database["public"]["Enums"]["container_type"]
          created_at?: string
          id?: string
          leftover_weight?: number | null
          mix_session_id?: string
          net_usage_weight?: number | null
          prepared_by_staff_id?: string | null
          purpose?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["mix_bowl_status"]
          total_dispensed_cost?: number | null
          total_dispensed_weight?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mix_bowls_mix_session_id_fkey"
            columns: ["mix_session_id"]
            isOneToOne: false
            referencedRelation: "mix_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mix_session_events: {
        Row: {
          created_at: string
          created_by: string | null
          device_id: string | null
          event_payload: Json
          event_type: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          mix_session_id: string
          organization_id: string
          sequence_number: number
          source_mode: string
          station_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          event_payload?: Json
          event_type: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          mix_session_id: string
          organization_id: string
          sequence_number: number
          source_mode?: string
          station_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          event_payload?: Json
          event_type?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          mix_session_id?: string
          organization_id?: string
          sequence_number?: number
          source_mode?: string
          station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mix_session_events_mix_session_id_fkey"
            columns: ["mix_session_id"]
            isOneToOne: false
            referencedRelation: "mix_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mix_session_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mix_session_projections: {
        Row: {
          active_bowl_count: number
          awaiting_reweigh_count: number
          current_status: string
          has_device_disconnect: boolean
          has_manual_override: boolean
          last_event_at: string | null
          last_event_sequence: number
          mix_session_id: string
          organization_id: string
          reweighed_bowl_count: number
          running_dispensed_weight: number
          running_estimated_cost: number
          sealed_bowl_count: number
          total_line_items: number
          unresolved_flag: boolean
          updated_at: string
        }
        Insert: {
          active_bowl_count?: number
          awaiting_reweigh_count?: number
          current_status?: string
          has_device_disconnect?: boolean
          has_manual_override?: boolean
          last_event_at?: string | null
          last_event_sequence?: number
          mix_session_id: string
          organization_id: string
          reweighed_bowl_count?: number
          running_dispensed_weight?: number
          running_estimated_cost?: number
          sealed_bowl_count?: number
          total_line_items?: number
          unresolved_flag?: boolean
          updated_at?: string
        }
        Update: {
          active_bowl_count?: number
          awaiting_reweigh_count?: number
          current_status?: string
          has_device_disconnect?: boolean
          has_manual_override?: boolean
          last_event_at?: string | null
          last_event_sequence?: number
          mix_session_id?: string
          organization_id?: string
          reweighed_bowl_count?: number
          running_dispensed_weight?: number
          running_estimated_cost?: number
          sealed_bowl_count?: number
          total_line_items?: number
          unresolved_flag?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mix_session_projections_mix_session_id_fkey"
            columns: ["mix_session_id"]
            isOneToOne: true
            referencedRelation: "mix_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mix_session_projections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mix_sessions: {
        Row: {
          appointment_id: string | null
          appointment_service_id: string | null
          client_id: string | null
          completed_at: string | null
          confidence_score: number | null
          container_type: Database["public"]["Enums"]["container_type"]
          created_at: string
          id: string
          is_manual_override: boolean
          is_prep_mode: boolean | null
          location_id: string | null
          mixed_by_staff_id: string | null
          notes: string | null
          organization_id: string
          prep_approved_at: string | null
          prep_approved_by: string | null
          service_label: string | null
          service_performed_by_staff_id: string | null
          started_at: string
          station_id: string | null
          status: Database["public"]["Enums"]["mix_session_status"]
          unresolved_flag: boolean
          unresolved_reason: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          appointment_service_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          container_type?: Database["public"]["Enums"]["container_type"]
          created_at?: string
          id?: string
          is_manual_override?: boolean
          is_prep_mode?: boolean | null
          location_id?: string | null
          mixed_by_staff_id?: string | null
          notes?: string | null
          organization_id: string
          prep_approved_at?: string | null
          prep_approved_by?: string | null
          service_label?: string | null
          service_performed_by_staff_id?: string | null
          started_at?: string
          station_id?: string | null
          status?: Database["public"]["Enums"]["mix_session_status"]
          unresolved_flag?: boolean
          unresolved_reason?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          appointment_service_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          container_type?: Database["public"]["Enums"]["container_type"]
          created_at?: string
          id?: string
          is_manual_override?: boolean
          is_prep_mode?: boolean | null
          location_id?: string | null
          mixed_by_staff_id?: string | null
          notes?: string | null
          organization_id?: string
          prep_approved_at?: string | null
          prep_approved_by?: string | null
          service_label?: string | null
          service_performed_by_staff_id?: string | null
          started_at?: string
          station_id?: string | null
          status?: Database["public"]["Enums"]["mix_session_status"]
          unresolved_flag?: boolean
          unresolved_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mix_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mix_sessions_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "backroom_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      network_capital_ledger: {
        Row: {
          amount: number
          created_at: string
          deal_id: string
          description: string | null
          entry_type: Database["public"]["Enums"]["capital_entry_type"]
          id: string
          organization_id: string
          recorded_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deal_id: string
          description?: string | null
          entry_type: Database["public"]["Enums"]["capital_entry_type"]
          id?: string
          organization_id: string
          recorded_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deal_id?: string
          description?: string | null
          entry_type?: Database["public"]["Enums"]["capital_entry_type"]
          id?: string
          organization_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_capital_ledger_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "network_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_capital_ledger_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      network_deals: {
        Row: {
          capital_deployed: number
          created_at: string
          deal_type: Database["public"]["Enums"]["network_deal_type"]
          id: string
          notes: string | null
          organization_id: string
          pipeline_stage: Database["public"]["Enums"]["network_pipeline_stage"]
          roi_multiple: number
          start_date: string | null
          status: string
          terms: Json
          total_return: number
          updated_at: string
        }
        Insert: {
          capital_deployed?: number
          created_at?: string
          deal_type: Database["public"]["Enums"]["network_deal_type"]
          id?: string
          notes?: string | null
          organization_id: string
          pipeline_stage?: Database["public"]["Enums"]["network_pipeline_stage"]
          roi_multiple?: number
          start_date?: string | null
          status?: string
          terms?: Json
          total_return?: number
          updated_at?: string
        }
        Update: {
          capital_deployed?: number
          created_at?: string
          deal_type?: Database["public"]["Enums"]["network_deal_type"]
          id?: string
          notes?: string | null
          organization_id?: string
          pipeline_stage?: Database["public"]["Enums"]["network_pipeline_stage"]
          roi_multiple?: number
          start_date?: string | null
          status?: string
          terms?: Json
          total_return?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      network_ownership_scores: {
        Row: {
          consistency_component: number
          created_at: string
          eligibility_status: Database["public"]["Enums"]["zos_eligibility"]
          execution_reliability: number
          factors: Json
          growth_responsiveness: number
          hard_filter_results: Json
          id: string
          market_position: number
          organization_id: string
          scored_at: string
          spi_component: number
          team_stability: number
          zos_score: number
        }
        Insert: {
          consistency_component?: number
          created_at?: string
          eligibility_status?: Database["public"]["Enums"]["zos_eligibility"]
          execution_reliability?: number
          factors?: Json
          growth_responsiveness?: number
          hard_filter_results?: Json
          id?: string
          market_position?: number
          organization_id: string
          scored_at?: string
          spi_component?: number
          team_stability?: number
          zos_score?: number
        }
        Update: {
          consistency_component?: number
          created_at?: string
          eligibility_status?: Database["public"]["Enums"]["zos_eligibility"]
          execution_reliability?: number
          factors?: Json
          growth_responsiveness?: number
          hard_filter_results?: Json
          id?: string
          market_position?: number
          organization_id?: string
          scored_at?: string
          spi_component?: number
          team_stability?: number
          zos_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "network_ownership_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          announcement_enabled: boolean
          birthday_reminder_enabled: boolean
          changelog_digest_enabled: boolean | null
          changelog_digest_frequency: string | null
          created_at: string
          email_notifications_enabled: boolean
          high_five_enabled: boolean
          id: string
          insights_email_enabled: boolean
          insights_email_frequency: string
          insights_email_last_sent: string | null
          insights_email_next_at: string | null
          meeting_reminder_enabled: boolean
          mention_enabled: boolean | null
          payroll_deadline_enabled: boolean
          program_reminder_enabled: boolean
          push_notifications_enabled: boolean | null
          streak_warning_enabled: boolean
          task_reminder_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          announcement_enabled?: boolean
          birthday_reminder_enabled?: boolean
          changelog_digest_enabled?: boolean | null
          changelog_digest_frequency?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          high_five_enabled?: boolean
          id?: string
          insights_email_enabled?: boolean
          insights_email_frequency?: string
          insights_email_last_sent?: string | null
          insights_email_next_at?: string | null
          meeting_reminder_enabled?: boolean
          mention_enabled?: boolean | null
          payroll_deadline_enabled?: boolean
          program_reminder_enabled?: boolean
          push_notifications_enabled?: boolean | null
          streak_warning_enabled?: boolean
          task_reminder_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          announcement_enabled?: boolean
          birthday_reminder_enabled?: boolean
          changelog_digest_enabled?: boolean | null
          changelog_digest_frequency?: string | null
          created_at?: string
          email_notifications_enabled?: boolean
          high_five_enabled?: boolean
          id?: string
          insights_email_enabled?: boolean
          insights_email_frequency?: string
          insights_email_last_sent?: string | null
          insights_email_next_at?: string | null
          meeting_reminder_enabled?: boolean
          mention_enabled?: boolean | null
          payroll_deadline_enabled?: boolean
          program_reminder_enabled?: boolean
          push_notifications_enabled?: boolean | null
          streak_warning_enabled?: boolean
          task_reminder_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nps_daily_snapshots: {
        Row: {
          average_rating: number | null
          created_at: string | null
          detractors: number | null
          id: string
          nps_score: number | null
          organization_id: string | null
          passives: number | null
          promoters: number | null
          snapshot_date: string
          total_responses: number | null
        }
        Insert: {
          average_rating?: number | null
          created_at?: string | null
          detractors?: number | null
          id?: string
          nps_score?: number | null
          organization_id?: string | null
          passives?: number | null
          promoters?: number | null
          snapshot_date: string
          total_responses?: number | null
        }
        Update: {
          average_rating?: number | null
          created_at?: string | null
          detractors?: number | null
          id?: string
          nps_score?: number | null
          organization_id?: string | null
          passives?: number | null
          promoters?: number | null
          snapshot_date?: string
          total_responses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_daily_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_section_config: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean
          is_required: boolean
          organization_id: string | null
          role: string
          section_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          is_required?: boolean
          organization_id?: string | null
          role: string
          section_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean
          is_required?: boolean
          organization_id?: string | null
          role?: string
          section_key?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_section_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_task_completions: {
        Row: {
          completed_at: string
          id: string
          task_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          task_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          task_key?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_tasks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_required: boolean
          link_url: string | null
          title: string
          updated_at: string
          visible_to_roles: Database["public"]["Enums"]["app_role"][]
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          link_url?: string | null
          title: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["app_role"][]
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          link_url?: string | null
          title?: string
          updated_at?: string
          visible_to_roles?: Database["public"]["Enums"]["app_role"][]
        }
        Relationships: []
      }
      one_on_one_meetings: {
        Row: {
          coach_id: string
          created_at: string
          end_time: string
          id: string
          meeting_date: string
          meeting_type: string | null
          notes: string | null
          requester_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          end_time: string
          id?: string
          meeting_date: string
          meeting_type?: string | null
          notes?: string | null
          requester_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          end_time?: string
          id?: string
          meeting_date?: string
          meeting_type?: string | null
          notes?: string | null
          requester_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      operational_task_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_assigned_to: string | null
          new_status: string | null
          notes: string | null
          performed_by: string | null
          previous_assigned_to: string | null
          previous_status: string | null
          task_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_assigned_to?: string | null
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          previous_assigned_to?: string | null
          previous_status?: string | null
          task_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_assigned_to?: string | null
          new_status?: string | null
          notes?: string | null
          performed_by?: string | null
          previous_assigned_to?: string | null
          previous_status?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "operational_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_tasks: {
        Row: {
          assigned_at: string | null
          assigned_role: string | null
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          escalated_at: string | null
          escalation_level: number
          id: string
          location_id: string | null
          organization_id: string
          priority: string
          reference_id: string | null
          reference_type: string | null
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_id: string | null
          source_rule: string | null
          source_type: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          escalated_at?: string | null
          escalation_level?: number
          id?: string
          location_id?: string | null
          organization_id: string
          priority?: string
          reference_id?: string | null
          reference_type?: string | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string | null
          source_rule?: string | null
          source_type: string
          status?: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          escalated_at?: string | null
          escalation_level?: number
          id?: string
          location_id?: string | null
          organization_id?: string
          priority?: string
          reference_id?: string | null
          reference_type?: string | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_id?: string | null
          source_rule?: string | null
          source_type?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_admins: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_admins_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_apps: {
        Row: {
          activated_at: string
          app_key: string
          id: string
          organization_id: string
        }
        Insert: {
          activated_at?: string
          app_key: string
          id?: string
          organization_id: string
        }
        Update: {
          activated_at?: string
          app_key?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_apps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_benchmarks: {
        Row: {
          calculated_at: string
          comparison_group: string
          id: string
          metadata: Json | null
          metric_key: string
          organization_id: string
          percentile: number | null
          period_end: string
          period_start: string
          period_type: string
          value: number
        }
        Insert: {
          calculated_at?: string
          comparison_group?: string
          id?: string
          metadata?: Json | null
          metric_key: string
          organization_id: string
          percentile?: number | null
          period_end: string
          period_start: string
          period_type: string
          value: number
        }
        Update: {
          calculated_at?: string
          comparison_group?: string
          id?: string
          metadata?: Json | null
          metric_key?: string
          organization_id?: string
          percentile?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_benchmarks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_billing: {
        Row: {
          additional_locations_purchased: number | null
          additional_users_purchased: number | null
          auto_renewal: boolean | null
          base_price: number | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          billing_starts_at: string | null
          contract_end_date: string | null
          contract_length_months: number
          contract_start_date: string | null
          created_at: string
          custom_price: number | null
          discount_reason: string | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number | null
          id: string
          included_locations: number | null
          included_users: number | null
          non_renewal_reason: string | null
          non_renewal_requested_at: string | null
          notes: string | null
          organization_id: string
          per_location_fee: number | null
          per_user_fee: number | null
          plan_id: string | null
          promo_ends_at: string | null
          promo_months: number | null
          promo_price: number | null
          setup_fee: number | null
          setup_fee_paid: boolean | null
          trial_days: number | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          additional_locations_purchased?: number | null
          additional_users_purchased?: number | null
          auto_renewal?: boolean | null
          base_price?: number | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          billing_starts_at?: string | null
          contract_end_date?: string | null
          contract_length_months?: number
          contract_start_date?: string | null
          created_at?: string
          custom_price?: number | null
          discount_reason?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number | null
          id?: string
          included_locations?: number | null
          included_users?: number | null
          non_renewal_reason?: string | null
          non_renewal_requested_at?: string | null
          notes?: string | null
          organization_id: string
          per_location_fee?: number | null
          per_user_fee?: number | null
          plan_id?: string | null
          promo_ends_at?: string | null
          promo_months?: number | null
          promo_price?: number | null
          setup_fee?: number | null
          setup_fee_paid?: boolean | null
          trial_days?: number | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          additional_locations_purchased?: number | null
          additional_users_purchased?: number | null
          auto_renewal?: boolean | null
          base_price?: number | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          billing_starts_at?: string | null
          contract_end_date?: string | null
          contract_length_months?: number
          contract_start_date?: string | null
          created_at?: string
          custom_price?: number | null
          discount_reason?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number | null
          id?: string
          included_locations?: number | null
          included_users?: number | null
          non_renewal_reason?: string | null
          non_renewal_requested_at?: string | null
          notes?: string | null
          organization_id?: string
          per_location_fee?: number | null
          per_user_fee?: number | null
          plan_id?: string | null
          promo_ends_at?: string | null
          promo_months?: number | null
          promo_price?: number | null
          setup_fee?: number | null
          setup_fee_paid?: boolean | null
          trial_days?: number | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_billing_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_billing_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          organization_id: string
          ssl_provisioned_at: string | null
          status: string
          updated_at: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          organization_id: string
          ssl_provisioned_at?: string | null
          status?: string
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          organization_id?: string
          ssl_provisioned_at?: string | null
          status?: string
          updated_at?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_feature_flags: {
        Row: {
          created_at: string | null
          flag_key: string
          id: string
          is_enabled: boolean
          organization_id: string
          override_reason: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          flag_key: string
          id?: string
          is_enabled: boolean
          organization_id: string
          override_reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          flag_key?: string
          id?: string
          is_enabled?: boolean
          organization_id?: string
          override_reason?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_features: {
        Row: {
          created_at: string | null
          disabled_at: string | null
          enabled_at: string | null
          feature_key: string
          id: string
          is_enabled: boolean
          last_known_config: Json | null
          organization_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          disabled_at?: string | null
          enabled_at?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean
          last_known_config?: Json | null
          organization_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          disabled_at?: string | null
          enabled_at?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean
          last_known_config?: Json | null
          organization_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_features_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_goals: {
        Row: {
          category: string
          created_at: string
          critical_threshold: number | null
          description: string | null
          display_name: string
          goal_period: string
          id: string
          is_active: boolean
          location_id: string | null
          metric_key: string
          organization_id: string
          target_value: number
          unit: string
          updated_at: string
          warning_threshold: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          critical_threshold?: number | null
          description?: string | null
          display_name: string
          goal_period?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          metric_key: string
          organization_id: string
          target_value: number
          unit?: string
          updated_at?: string
          warning_threshold?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          critical_threshold?: number | null
          description?: string | null
          display_name?: string
          goal_period?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          metric_key?: string
          organization_id?: string
          target_value?: number
          unit?: string
          updated_at?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_health_scores: {
        Row: {
          calculated_at: string
          data_profile: Json | null
          id: string
          organization_id: string
          recommendations: Json | null
          risk_level: string
          score: number
          score_breakdown: Json
          score_date: string
          trends: Json | null
        }
        Insert: {
          calculated_at?: string
          data_profile?: Json | null
          id?: string
          organization_id: string
          recommendations?: Json | null
          risk_level: string
          score: number
          score_breakdown?: Json
          score_date?: string
          trends?: Json | null
        }
        Update: {
          calculated_at?: string
          data_profile?: Json | null
          id?: string
          organization_id?: string
          recommendations?: Json | null
          risk_level?: string
          score?: number
          score_breakdown?: Json
          score_date?: string
          trends?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_health_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_kiosk_settings: {
        Row: {
          accent_color: string | null
          background_color: string | null
          background_image_url: string | null
          background_overlay_opacity: number | null
          button_style: string | null
          check_in_prompt: string | null
          created_at: string | null
          display_orientation: string
          enable_feedback_prompt: boolean | null
          enable_glow_effects: boolean | null
          enable_self_booking: boolean | null
          enable_walk_ins: boolean | null
          exit_pin: string | null
          font_family: string | null
          id: string
          idle_slideshow_images: string[] | null
          idle_timeout_seconds: number | null
          idle_video_url: string | null
          location_badge_position: string | null
          location_badge_style: string | null
          location_id: string | null
          logo_color: string | null
          logo_size: string
          logo_url: string | null
          organization_id: string | null
          require_confirmation_tap: boolean | null
          require_form_signing: boolean | null
          self_booking_allow_future: boolean | null
          self_booking_show_stylists: boolean | null
          show_location_badge: boolean | null
          show_stylist_photo: boolean | null
          show_wait_time_estimate: boolean | null
          success_message: string | null
          text_color: string | null
          theme_mode: string | null
          updated_at: string | null
          welcome_subtitle: string | null
          welcome_title: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          background_image_url?: string | null
          background_overlay_opacity?: number | null
          button_style?: string | null
          check_in_prompt?: string | null
          created_at?: string | null
          display_orientation?: string
          enable_feedback_prompt?: boolean | null
          enable_glow_effects?: boolean | null
          enable_self_booking?: boolean | null
          enable_walk_ins?: boolean | null
          exit_pin?: string | null
          font_family?: string | null
          id?: string
          idle_slideshow_images?: string[] | null
          idle_timeout_seconds?: number | null
          idle_video_url?: string | null
          location_badge_position?: string | null
          location_badge_style?: string | null
          location_id?: string | null
          logo_color?: string | null
          logo_size?: string
          logo_url?: string | null
          organization_id?: string | null
          require_confirmation_tap?: boolean | null
          require_form_signing?: boolean | null
          self_booking_allow_future?: boolean | null
          self_booking_show_stylists?: boolean | null
          show_location_badge?: boolean | null
          show_stylist_photo?: boolean | null
          show_wait_time_estimate?: boolean | null
          success_message?: string | null
          text_color?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          welcome_subtitle?: string | null
          welcome_title?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          background_image_url?: string | null
          background_overlay_opacity?: number | null
          button_style?: string | null
          check_in_prompt?: string | null
          created_at?: string | null
          display_orientation?: string
          enable_feedback_prompt?: boolean | null
          enable_glow_effects?: boolean | null
          enable_self_booking?: boolean | null
          enable_walk_ins?: boolean | null
          exit_pin?: string | null
          font_family?: string | null
          id?: string
          idle_slideshow_images?: string[] | null
          idle_timeout_seconds?: number | null
          idle_video_url?: string | null
          location_badge_position?: string | null
          location_badge_style?: string | null
          location_id?: string | null
          logo_color?: string | null
          logo_size?: string
          logo_url?: string | null
          organization_id?: string | null
          require_confirmation_tap?: boolean | null
          require_form_signing?: boolean | null
          self_booking_allow_future?: boolean | null
          self_booking_show_stylists?: boolean | null
          show_location_badge?: boolean | null
          show_stylist_photo?: boolean | null
          show_wait_time_estimate?: boolean | null
          success_message?: string | null
          text_color?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          welcome_subtitle?: string | null
          welcome_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_kiosk_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_kiosk_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_payroll_settings: {
        Row: {
          auto_run_days_before_check: number
          bi_weekly_day_of_week: number
          bi_weekly_start_date: string | null
          created_at: string
          days_until_check: number
          id: string
          monthly_pay_day: number
          organization_id: string
          pay_schedule_type: string
          processing_mode: string
          reminder_channels: Json | null
          reminder_days_before: number[] | null
          reminder_enabled: boolean | null
          semi_monthly_first_day: number
          semi_monthly_second_day: number
          updated_at: string
          weekly_day_of_week: number
        }
        Insert: {
          auto_run_days_before_check?: number
          bi_weekly_day_of_week?: number
          bi_weekly_start_date?: string | null
          created_at?: string
          days_until_check?: number
          id?: string
          monthly_pay_day?: number
          organization_id: string
          pay_schedule_type?: string
          processing_mode?: string
          reminder_channels?: Json | null
          reminder_days_before?: number[] | null
          reminder_enabled?: boolean | null
          semi_monthly_first_day?: number
          semi_monthly_second_day?: number
          updated_at?: string
          weekly_day_of_week?: number
        }
        Update: {
          auto_run_days_before_check?: number
          bi_weekly_day_of_week?: number
          bi_weekly_start_date?: string | null
          created_at?: string
          days_until_check?: number
          id?: string
          monthly_pay_day?: number
          organization_id?: string
          pay_schedule_type?: string
          processing_mode?: string
          reminder_channels?: Json | null
          reminder_days_before?: number[] | null
          reminder_enabled?: boolean | null
          semi_monthly_first_day?: number
          semi_monthly_second_day?: number
          updated_at?: string
          weekly_day_of_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_payroll_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_pos_config: {
        Row: {
          created_at: string
          credentials_encrypted: string | null
          id: string
          last_sync_at: string | null
          organization_id: string
          pos_type: string
          settings: Json | null
          sync_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id: string
          pos_type?: string
          settings?: Json | null
          sync_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials_encrypted?: string | null
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          pos_type?: string
          settings?: Json | null
          sync_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_pos_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_secrets: {
        Row: {
          created_at: string
          organization_id: string
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_phone_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_secrets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          access_ends_at: string | null
          account_number: number | null
          activated_at: string | null
          billing_email: string | null
          billing_status: Database["public"]["Enums"]["billing_status"] | null
          business_type: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          email_accent_color: string | null
          email_button_radius: string | null
          email_footer_text: string | null
          email_header_style: string | null
          email_logo_url: string | null
          email_physical_address: string | null
          email_reply_to: string | null
          email_sender_name: string | null
          email_show_attribution: boolean | null
          email_social_links: Json | null
          go_live_date: string | null
          id: string
          is_internal: boolean
          is_multi_location: boolean | null
          last_backroom_coached_at: string | null
          last_setup_link_sent_at: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          next_invoice_date: string | null
          onboarding_stage: string | null
          pause_ends_at: string | null
          paused_at: string | null
          plan_type: string | null
          primary_contact_email: string | null
          primary_contact_phone: string | null
          settings: Json | null
          slug: string
          source_software: string | null
          status: string | null
          stripe_connect_account_id: string | null
          stripe_connect_status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          time_off_requires_approval: boolean
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          access_ends_at?: string | null
          account_number?: number | null
          activated_at?: string | null
          billing_email?: string | null
          billing_status?: Database["public"]["Enums"]["billing_status"] | null
          business_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          email_accent_color?: string | null
          email_button_radius?: string | null
          email_footer_text?: string | null
          email_header_style?: string | null
          email_logo_url?: string | null
          email_physical_address?: string | null
          email_reply_to?: string | null
          email_sender_name?: string | null
          email_show_attribution?: boolean | null
          email_social_links?: Json | null
          go_live_date?: string | null
          id?: string
          is_internal?: boolean
          is_multi_location?: boolean | null
          last_backroom_coached_at?: string | null
          last_setup_link_sent_at?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          next_invoice_date?: string | null
          onboarding_stage?: string | null
          pause_ends_at?: string | null
          paused_at?: string | null
          plan_type?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          settings?: Json | null
          slug: string
          source_software?: string | null
          status?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          time_off_requires_approval?: boolean
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          access_ends_at?: string | null
          account_number?: number | null
          activated_at?: string | null
          billing_email?: string | null
          billing_status?: Database["public"]["Enums"]["billing_status"] | null
          business_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          email_accent_color?: string | null
          email_button_radius?: string | null
          email_footer_text?: string | null
          email_header_style?: string | null
          email_logo_url?: string | null
          email_physical_address?: string | null
          email_reply_to?: string | null
          email_sender_name?: string | null
          email_show_attribution?: boolean | null
          email_social_links?: Json | null
          go_live_date?: string | null
          id?: string
          is_internal?: boolean
          is_multi_location?: boolean | null
          last_backroom_coached_at?: string | null
          last_setup_link_sent_at?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          next_invoice_date?: string | null
          onboarding_stage?: string | null
          pause_ends_at?: string | null
          paused_at?: string | null
          plan_type?: string | null
          primary_contact_email?: string | null
          primary_contact_phone?: string | null
          settings?: Json | null
          slug?: string
          source_software?: string | null
          status?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          time_off_requires_approval?: boolean
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      pandadoc_documents: {
        Row: {
          applied_at: string | null
          applied_to_billing: boolean | null
          completed_at: string | null
          created_at: string
          document_name: string
          document_url: string | null
          extracted_fields: Json | null
          id: string
          organization_id: string
          pandadoc_document_id: string
          sent_at: string | null
          signed_by_email: string | null
          signed_by_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          applied_to_billing?: boolean | null
          completed_at?: string | null
          created_at?: string
          document_name: string
          document_url?: string | null
          extracted_fields?: Json | null
          id?: string
          organization_id: string
          pandadoc_document_id: string
          sent_at?: string | null
          signed_by_email?: string | null
          signed_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          applied_to_billing?: boolean | null
          completed_at?: string | null
          created_at?: string
          document_name?: string
          document_url?: string | null
          extracted_fields?: Json | null
          id?: string
          organization_id?: string
          pandadoc_document_id?: string
          sent_at?: string | null
          signed_by_email?: string | null
          signed_by_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pandadoc_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pass_usage_history: {
        Row: {
          created_at: string
          current_day_at_use: number
          day_missed: number
          enrollment_id: string
          id: string
          restore_reason: string | null
          restored_at: string | null
          restored_by: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_day_at_use: number
          day_missed: number
          enrollment_id: string
          id?: string
          restore_reason?: string | null
          restored_at?: string | null
          restored_by?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_day_at_use?: number
          day_missed?: number
          enrollment_id?: string
          id?: string
          restore_reason?: string | null
          restored_at?: string | null
          restored_by?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pass_usage_history_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "stylist_program_enrollment"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_disputes: {
        Row: {
          amount: number
          appointment_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          currency: string
          evidence_due_by: string | null
          id: string
          metadata: Json | null
          organization_id: string
          reason: string | null
          resolved_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_dispute_id: string
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          appointment_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          evidence_due_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_dispute_id: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          evidence_due_by?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_dispute_id?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_disputes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_disputes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_disputes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_analytics_snapshots: {
        Row: {
          created_at: string | null
          id: string
          metrics: Json
          organization_id: string
          snapshot_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metrics?: Json
          organization_id: string
          snapshot_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metrics?: Json
          organization_id?: string
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_analytics_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_connections: {
        Row: {
          access_token_encrypted: string | null
          connected_at: string | null
          connected_by: string | null
          connection_status: string
          created_at: string
          external_company_id: string | null
          id: string
          last_synced_at: string | null
          metadata: Json | null
          organization_id: string
          provider: Database["public"]["Enums"]["payroll_provider"]
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          connected_at?: string | null
          connected_by?: string | null
          connection_status?: string
          created_at?: string
          external_company_id?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          organization_id: string
          provider: Database["public"]["Enums"]["payroll_provider"]
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          connected_at?: string | null
          connected_by?: string | null
          connection_status?: string
          created_at?: string
          external_company_id?: string | null
          id?: string
          last_synced_at?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: Database["public"]["Enums"]["payroll_provider"]
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_forecasts: {
        Row: {
          calculated_at: string | null
          confidence_level: string
          created_at: string | null
          forecast_data: Json
          id: string
          organization_id: string
          period_end: string
          period_start: string
          updated_at: string | null
        }
        Insert: {
          calculated_at?: string | null
          confidence_level?: string
          created_at?: string | null
          forecast_data?: Json
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          updated_at?: string | null
        }
        Update: {
          calculated_at?: string | null
          confidence_level?: string
          created_at?: string | null
          forecast_data?: Json
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_forecasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_line_items: {
        Row: {
          bonus_pay: number | null
          commission_pay: number | null
          created_at: string
          employee_deductions: number | null
          employee_id: string
          employee_taxes: number | null
          employer_taxes: number | null
          external_employee_id: string | null
          gross_pay: number
          hourly_pay: number | null
          id: string
          metadata: Json | null
          net_pay: number
          overtime_hours: number | null
          payroll_run_id: string
          regular_hours: number | null
          salary_pay: number | null
          tips: number | null
          updated_at: string
        }
        Insert: {
          bonus_pay?: number | null
          commission_pay?: number | null
          created_at?: string
          employee_deductions?: number | null
          employee_id: string
          employee_taxes?: number | null
          employer_taxes?: number | null
          external_employee_id?: string | null
          gross_pay?: number
          hourly_pay?: number | null
          id?: string
          metadata?: Json | null
          net_pay?: number
          overtime_hours?: number | null
          payroll_run_id: string
          regular_hours?: number | null
          salary_pay?: number | null
          tips?: number | null
          updated_at?: string
        }
        Update: {
          bonus_pay?: number | null
          commission_pay?: number | null
          created_at?: string
          employee_deductions?: number | null
          employee_id?: string
          employee_taxes?: number | null
          employer_taxes?: number | null
          external_employee_id?: string | null
          gross_pay?: number
          hourly_pay?: number | null
          id?: string
          metadata?: Json | null
          net_pay?: number
          overtime_hours?: number | null
          payroll_run_id?: string
          regular_hours?: number | null
          salary_pay?: number | null
          tips?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_line_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payroll_line_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          check_date: string
          created_at: string
          employee_count: number | null
          external_payroll_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
          pay_period_end: string
          pay_period_start: string
          processed_at: string | null
          provider: Database["public"]["Enums"]["payroll_provider"]
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_employee_deductions: number | null
          total_employer_taxes: number | null
          total_gross_pay: number | null
          total_net_pay: number | null
          updated_at: string
        }
        Insert: {
          check_date: string
          created_at?: string
          employee_count?: number | null
          external_payroll_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          pay_period_end: string
          pay_period_start: string
          processed_at?: string | null
          provider: Database["public"]["Enums"]["payroll_provider"]
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_employee_deductions?: number | null
          total_employer_taxes?: number | null
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Update: {
          check_date?: string
          created_at?: string
          employee_count?: number | null
          external_payroll_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          pay_period_end?: string
          pay_period_start?: string
          processed_at?: string | null
          provider?: Database["public"]["Enums"]["payroll_provider"]
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_employee_deductions?: number | null
          total_employer_taxes?: number | null
          total_gross_pay?: number | null
          total_net_pay?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          areas_for_improvement: string | null
          completed_at: string | null
          created_at: string
          employee_notes: string | null
          goals_summary: string | null
          id: string
          organization_id: string
          overall_rating: number | null
          review_period_end: string | null
          review_period_start: string | null
          review_type: string
          reviewer_id: string
          reviewer_notes: string | null
          status: string
          strengths: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          areas_for_improvement?: string | null
          completed_at?: string | null
          created_at?: string
          employee_notes?: string | null
          goals_summary?: string | null
          id?: string
          organization_id: string
          overall_rating?: number | null
          review_period_end?: string | null
          review_period_start?: string | null
          review_type?: string
          reviewer_id: string
          reviewer_notes?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          areas_for_improvement?: string | null
          completed_at?: string | null
          created_at?: string
          employee_notes?: string | null
          goals_summary?: string | null
          id?: string
          organization_id?: string
          overall_rating?: number | null
          review_period_end?: string | null
          review_period_start?: string | null
          review_type?: string
          reviewer_id?: string
          reviewer_notes?: string | null
          status?: string
          strengths?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      phorest_appointments: {
        Row: {
          appointment_date: string
          client_name: string | null
          client_phone: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deposit_amount: number | null
          deposit_applied_to_total: boolean
          deposit_collected_at: string | null
          deposit_required: boolean
          deposit_status: string | null
          deposit_stripe_payment_id: string | null
          discount_amount: number | null
          discount_id: string | null
          discount_reason: string | null
          discount_type: string | null
          discount_value: number | null
          end_time: string
          expected_price: number | null
          id: string
          is_demo: boolean
          is_new_client: boolean | null
          is_redo: boolean
          is_walk_in: boolean
          location_id: string | null
          notes: string | null
          original_appointment_id: string | null
          original_price: number | null
          payment_failure_reason: string | null
          payment_method: string | null
          payment_status: string
          phorest_client_id: string | null
          phorest_id: string
          phorest_staff_id: string | null
          rebook_declined_reason: string | null
          rebooked_at_checkout: boolean | null
          recurrence_group_id: string | null
          recurrence_index: number | null
          recurrence_rule: Json | null
          redo_approved_by: string | null
          redo_pricing_override: number | null
          redo_reason: string | null
          rescheduled_at: string | null
          rescheduled_from_date: string | null
          rescheduled_from_time: string | null
          service_category: string | null
          service_name: string | null
          start_time: string
          status: string
          stylist_user_id: string | null
          tip_amount: number | null
          total_price: number | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit_amount?: number | null
          deposit_applied_to_total?: boolean
          deposit_collected_at?: string | null
          deposit_required?: boolean
          deposit_status?: string | null
          deposit_stripe_payment_id?: string | null
          discount_amount?: number | null
          discount_id?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_time: string
          expected_price?: number | null
          id?: string
          is_demo?: boolean
          is_new_client?: boolean | null
          is_redo?: boolean
          is_walk_in?: boolean
          location_id?: string | null
          notes?: string | null
          original_appointment_id?: string | null
          original_price?: number | null
          payment_failure_reason?: string | null
          payment_method?: string | null
          payment_status?: string
          phorest_client_id?: string | null
          phorest_id: string
          phorest_staff_id?: string | null
          rebook_declined_reason?: string | null
          rebooked_at_checkout?: boolean | null
          recurrence_group_id?: string | null
          recurrence_index?: number | null
          recurrence_rule?: Json | null
          redo_approved_by?: string | null
          redo_pricing_override?: number | null
          redo_reason?: string | null
          rescheduled_at?: string | null
          rescheduled_from_date?: string | null
          rescheduled_from_time?: string | null
          service_category?: string | null
          service_name?: string | null
          start_time: string
          status?: string
          stylist_user_id?: string | null
          tip_amount?: number | null
          total_price?: number | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deposit_amount?: number | null
          deposit_applied_to_total?: boolean
          deposit_collected_at?: string | null
          deposit_required?: boolean
          deposit_status?: string | null
          deposit_stripe_payment_id?: string | null
          discount_amount?: number | null
          discount_id?: string | null
          discount_reason?: string | null
          discount_type?: string | null
          discount_value?: number | null
          end_time?: string
          expected_price?: number | null
          id?: string
          is_demo?: boolean
          is_new_client?: boolean | null
          is_redo?: boolean
          is_walk_in?: boolean
          location_id?: string | null
          notes?: string | null
          original_appointment_id?: string | null
          original_price?: number | null
          payment_failure_reason?: string | null
          payment_method?: string | null
          payment_status?: string
          phorest_client_id?: string | null
          phorest_id?: string
          phorest_staff_id?: string | null
          rebook_declined_reason?: string | null
          rebooked_at_checkout?: boolean | null
          recurrence_group_id?: string | null
          recurrence_index?: number | null
          recurrence_rule?: Json | null
          redo_approved_by?: string | null
          redo_pricing_override?: number | null
          redo_reason?: string | null
          rescheduled_at?: string | null
          rescheduled_from_date?: string | null
          rescheduled_from_time?: string | null
          service_category?: string | null
          service_name?: string | null
          start_time?: string
          status?: string
          stylist_user_id?: string | null
          tip_amount?: number | null
          total_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_phorest_appointments_discount"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "service_discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phorest_appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phorest_appointments_stylist_user_id_fkey"
            columns: ["stylist_user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      phorest_clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          archived_at: string | null
          archived_by: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          birthday: string | null
          branch_name: string | null
          canonical_client_id: string | null
          city: string | null
          client_category: string | null
          client_since: string | null
          country: string | null
          created_at: string
          customer_number: string | null
          email: string | null
          email_normalized: string | null
          external_client_id: string | null
          first_name: string | null
          first_visit: string | null
          gender: string | null
          id: string
          is_archived: boolean
          is_banned: boolean | null
          is_duplicate: boolean
          is_vip: boolean | null
          landline: string | null
          last_name: string | null
          last_visit: string | null
          lead_source: string | null
          location_id: string | null
          medical_alerts: string | null
          name: string
          notes: string | null
          phone: string | null
          phone_normalized: string | null
          phorest_branch_id: string | null
          phorest_client_id: string
          preferred_services: string[] | null
          preferred_stylist_id: string | null
          prompt_appointment_notes: boolean | null
          prompt_client_notes: boolean | null
          referred_by: string | null
          reminder_email_opt_in: boolean | null
          reminder_sms_opt_in: boolean | null
          state: string | null
          total_spend: number
          updated_at: string
          visit_count: number
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          archived_by?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          birthday?: string | null
          branch_name?: string | null
          canonical_client_id?: string | null
          city?: string | null
          client_category?: string | null
          client_since?: string | null
          country?: string | null
          created_at?: string
          customer_number?: string | null
          email?: string | null
          email_normalized?: string | null
          external_client_id?: string | null
          first_name?: string | null
          first_visit?: string | null
          gender?: string | null
          id?: string
          is_archived?: boolean
          is_banned?: boolean | null
          is_duplicate?: boolean
          is_vip?: boolean | null
          landline?: string | null
          last_name?: string | null
          last_visit?: string | null
          lead_source?: string | null
          location_id?: string | null
          medical_alerts?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          phorest_branch_id?: string | null
          phorest_client_id: string
          preferred_services?: string[] | null
          preferred_stylist_id?: string | null
          prompt_appointment_notes?: boolean | null
          prompt_client_notes?: boolean | null
          referred_by?: string | null
          reminder_email_opt_in?: boolean | null
          reminder_sms_opt_in?: boolean | null
          state?: string | null
          total_spend?: number
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          archived_at?: string | null
          archived_by?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          birthday?: string | null
          branch_name?: string | null
          canonical_client_id?: string | null
          city?: string | null
          client_category?: string | null
          client_since?: string | null
          country?: string | null
          created_at?: string
          customer_number?: string | null
          email?: string | null
          email_normalized?: string | null
          external_client_id?: string | null
          first_name?: string | null
          first_visit?: string | null
          gender?: string | null
          id?: string
          is_archived?: boolean
          is_banned?: boolean | null
          is_duplicate?: boolean
          is_vip?: boolean | null
          landline?: string | null
          last_name?: string | null
          last_visit?: string | null
          lead_source?: string | null
          location_id?: string | null
          medical_alerts?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          phone_normalized?: string | null
          phorest_branch_id?: string | null
          phorest_client_id?: string
          preferred_services?: string[] | null
          preferred_stylist_id?: string | null
          prompt_appointment_notes?: boolean | null
          prompt_client_notes?: boolean | null
          referred_by?: string | null
          reminder_email_opt_in?: boolean | null
          reminder_sms_opt_in?: boolean | null
          state?: string | null
          total_spend?: number
          updated_at?: string
          visit_count?: number
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phorest_clients_canonical_client_id_fkey"
            columns: ["canonical_client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phorest_clients_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phorest_clients_preferred_stylist_id_fkey"
            columns: ["preferred_stylist_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      phorest_daily_sales_summary: {
        Row: {
          average_ticket: number | null
          branch_name: string | null
          created_at: string
          id: string
          location_id: string | null
          phorest_staff_id: string | null
          product_revenue: number | null
          service_revenue: number | null
          summary_date: string
          total_discounts: number | null
          total_products: number | null
          total_revenue: number | null
          total_services: number | null
          total_transactions: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          average_ticket?: number | null
          branch_name?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          phorest_staff_id?: string | null
          product_revenue?: number | null
          service_revenue?: number | null
          summary_date: string
          total_discounts?: number | null
          total_products?: number | null
          total_revenue?: number | null
          total_services?: number | null
          total_transactions?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          average_ticket?: number | null
          branch_name?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          phorest_staff_id?: string | null
          product_revenue?: number | null
          service_revenue?: number | null
          summary_date?: string
          total_discounts?: number | null
          total_products?: number | null
          total_revenue?: number | null
          total_services?: number | null
          total_transactions?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phorest_daily_sales_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      phorest_performance_metrics: {
        Row: {
          average_ticket: number | null
          created_at: string
          extension_clients: number
          id: string
          new_clients: number
          phorest_staff_id: string | null
          rebooking_rate: number | null
          retail_sales: number
          retention_rate: number | null
          service_count: number
          total_revenue: number
          updated_at: string
          user_id: string | null
          week_start: string
        }
        Insert: {
          average_ticket?: number | null
          created_at?: string
          extension_clients?: number
          id?: string
          new_clients?: number
          phorest_staff_id?: string | null
          rebooking_rate?: number | null
          retail_sales?: number
          retention_rate?: number | null
          service_count?: number
          total_revenue?: number
          updated_at?: string
          user_id?: string | null
          week_start: string
        }
        Update: {
          average_ticket?: number | null
          created_at?: string
          extension_clients?: number
          id?: string
          new_clients?: number
          phorest_staff_id?: string | null
          rebooking_rate?: number | null
          retail_sales?: number
          retention_rate?: number | null
          service_count?: number
          total_revenue?: number
          updated_at?: string
          user_id?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "phorest_performance_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      phorest_sales_transactions: {
        Row: {
          branch_name: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          discount_amount: number | null
          id: string
          item_category: string | null
          item_name: string
          item_type: string
          location_id: string | null
          payment_method: string | null
          phorest_staff_id: string | null
          phorest_transaction_id: string
          quantity: number | null
          stylist_user_id: string | null
          tax_amount: number | null
          tip_amount: number | null
          total_amount: number
          transaction_date: string
          transaction_time: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          branch_name?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          item_category?: string | null
          item_name: string
          item_type: string
          location_id?: string | null
          payment_method?: string | null
          phorest_staff_id?: string | null
          phorest_transaction_id: string
          quantity?: number | null
          stylist_user_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount: number
          transaction_date: string
          transaction_time?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          branch_name?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          item_category?: string | null
          item_name?: string
          item_type?: string
          location_id?: string | null
          payment_method?: string | null
          phorest_staff_id?: string | null
          phorest_transaction_id?: string
          quantity?: number | null
          stylist_user_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number
          transaction_date?: string
          transaction_time?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phorest_sales_transactions_stylist_user_id_fkey"
            columns: ["stylist_user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      phorest_services: {
        Row: {
          allow_same_day_booking: boolean | null
          category: string | null
          container_types: Database["public"]["Enums"]["container_type"][]
          created_at: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          is_chemical_service: boolean
          lead_time_days: number | null
          name: string
          phorest_branch_id: string
          phorest_service_id: string
          price: number | null
          requires_qualification: boolean | null
          same_day_restriction_reason: string | null
          updated_at: string | null
        }
        Insert: {
          allow_same_day_booking?: boolean | null
          category?: string | null
          container_types?: Database["public"]["Enums"]["container_type"][]
          created_at?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          is_chemical_service?: boolean
          lead_time_days?: number | null
          name: string
          phorest_branch_id: string
          phorest_service_id: string
          price?: number | null
          requires_qualification?: boolean | null
          same_day_restriction_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_same_day_booking?: boolean | null
          category?: string | null
          container_types?: Database["public"]["Enums"]["container_type"][]
          created_at?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          is_chemical_service?: boolean
          lead_time_days?: number | null
          name?: string
          phorest_branch_id?: string
          phorest_service_id?: string
          price?: number | null
          requires_qualification?: boolean | null
          same_day_restriction_reason?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      phorest_staff_mapping: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          phorest_branch_id: string | null
          phorest_branch_name: string | null
          phorest_photo_url: string | null
          phorest_staff_email: string | null
          phorest_staff_id: string
          phorest_staff_name: string | null
          show_on_calendar: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          phorest_branch_id?: string | null
          phorest_branch_name?: string | null
          phorest_photo_url?: string | null
          phorest_staff_email?: string | null
          phorest_staff_id: string
          phorest_staff_name?: string | null
          show_on_calendar?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          phorest_branch_id?: string | null
          phorest_branch_name?: string | null
          phorest_photo_url?: string | null
          phorest_staff_email?: string | null
          phorest_staff_id?: string
          phorest_staff_name?: string | null
          show_on_calendar?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phorest_staff_mapping_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      phorest_staff_services: {
        Row: {
          created_at: string | null
          custom_duration_minutes: number | null
          custom_price: number | null
          id: string
          is_qualified: boolean | null
          phorest_branch_id: string
          phorest_service_id: string
          phorest_staff_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_duration_minutes?: number | null
          custom_price?: number | null
          id?: string
          is_qualified?: boolean | null
          phorest_branch_id: string
          phorest_service_id: string
          phorest_staff_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_duration_minutes?: number | null
          custom_price?: number | null
          id?: string
          is_qualified?: boolean | null
          phorest_branch_id?: string
          phorest_service_id?: string
          phorest_staff_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      phorest_sync_log: {
        Row: {
          api_endpoint: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          records_synced: number | null
          response_sample: string | null
          retry_count: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          api_endpoint?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_synced?: number | null
          response_sample?: string | null
          retry_count?: number | null
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          api_endpoint?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          records_synced?: number | null
          response_sample?: string | null
          retry_count?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      phorest_transaction_items: {
        Row: {
          appointment_id: string | null
          branch_name: string | null
          client_name: string | null
          created_at: string | null
          discount: number | null
          id: string
          item_category: string | null
          item_name: string
          item_type: string
          location_id: string | null
          payment_method: string | null
          phorest_client_id: string | null
          phorest_staff_id: string | null
          promotion_id: string | null
          quantity: number | null
          sale_classification: string | null
          stylist_name: string | null
          stylist_user_id: string | null
          tax_amount: number | null
          tip_amount: number | null
          total_amount: number
          transaction_date: string
          transaction_id: string
          unit_price: number | null
        }
        Insert: {
          appointment_id?: string | null
          branch_name?: string | null
          client_name?: string | null
          created_at?: string | null
          discount?: number | null
          id?: string
          item_category?: string | null
          item_name: string
          item_type: string
          location_id?: string | null
          payment_method?: string | null
          phorest_client_id?: string | null
          phorest_staff_id?: string | null
          promotion_id?: string | null
          quantity?: number | null
          sale_classification?: string | null
          stylist_name?: string | null
          stylist_user_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount: number
          transaction_date: string
          transaction_id: string
          unit_price?: number | null
        }
        Update: {
          appointment_id?: string | null
          branch_name?: string | null
          client_name?: string | null
          created_at?: string | null
          discount?: number | null
          id?: string
          item_category?: string | null
          item_name?: string
          item_type?: string
          location_id?: string | null
          payment_method?: string | null
          phorest_client_id?: string | null
          phorest_staff_id?: string | null
          promotion_id?: string | null
          quantity?: number | null
          sale_classification?: string | null
          stylist_name?: string | null
          stylist_user_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number
          transaction_date?: string
          transaction_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "phorest_transaction_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "phorest_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phorest_transaction_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phorest_transaction_items_stylist_user_id_fkey"
            columns: ["stylist_user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      pin_attempt_log: {
        Row: {
          attempted_at: string
          id: string
          target_org_id: string | null
        }
        Insert: {
          attempted_at?: string
          id?: string
          target_org_id?: string | null
        }
        Update: {
          attempted_at?: string
          id?: string
          target_org_id?: string | null
        }
        Relationships: []
      }
      platform_audit_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_favorite_organizations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_favorite_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feedback: {
        Row: {
          browser_info: Json | null
          category: string | null
          created_at: string
          description: string
          id: string
          organization_id: string | null
          screenshot_urls: string[] | null
          status: string | null
          submitted_by: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          browser_info?: Json | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          organization_id?: string | null
          screenshot_urls?: string[] | null
          status?: string | null
          submitted_by: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          browser_info?: Json | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          organization_id?: string | null
          screenshot_urls?: string[] | null
          status?: string | null
          submitted_by?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_import_templates: {
        Row: {
          created_at: string
          created_by: string | null
          entity_type: string
          field_mappings: Json
          id: string
          is_default: boolean | null
          organization_id: string | null
          source_system: string
          transformations: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_type: string
          field_mappings?: Json
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          source_system: string
          transformations?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_type?: string
          field_mappings?: Json
          id?: string
          is_default?: boolean | null
          organization_id?: string | null
          source_system?: string
          transformations?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_import_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_incidents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_auto_created: boolean
          link_text: string | null
          link_url: string | null
          message: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_auto_created?: boolean
          link_text?: string | null
          link_url?: string | null
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_auto_created?: boolean
          link_text?: string | null
          link_url?: string | null
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: string
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_kpi_counters: {
        Row: {
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          value?: number
        }
        Update: {
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      platform_notification_preferences: {
        Row: {
          email_enabled: boolean | null
          id: string
          in_app_enabled: boolean | null
          notification_type: string
          slack_enabled: boolean | null
          user_id: string
        }
        Insert: {
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type: string
          slack_enabled?: boolean | null
          user_id: string
        }
        Update: {
          email_enabled?: boolean | null
          id?: string
          in_app_enabled?: boolean | null
          notification_type?: string
          slack_enabled?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      platform_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          read_at: string | null
          recipient_id: string | null
          severity: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string | null
          severity?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string | null
          severity?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      platform_permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_name: string
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      platform_role_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          role: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          role: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "platform_permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_roles: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_security_settings: {
        Row: {
          id: string
          max_concurrent_sessions: number
          min_password_length: number
          password_expiry_days: number
          require_2fa_org_admins: boolean
          require_2fa_platform_admins: boolean
          require_mixed_case: boolean
          require_special_chars: boolean
          session_timeout_minutes: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          max_concurrent_sessions?: number
          min_password_length?: number
          password_expiry_days?: number
          require_2fa_org_admins?: boolean
          require_2fa_platform_admins?: boolean
          require_mixed_case?: boolean
          require_special_chars?: boolean
          session_timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          max_concurrent_sessions?: number
          min_password_length?: number
          password_expiry_days?: number
          require_2fa_org_admins?: boolean
          require_2fa_platform_admins?: boolean
          require_mixed_case?: boolean
          require_special_chars?: boolean
          session_timeout_minutes?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      points_rules: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_daily: number | null
          points_awarded: number
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_daily?: number | null
          points_awarded: number
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_daily?: number | null
          points_awarded?: number
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          points: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          points: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          points?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_budgets: {
        Row: {
          alert_threshold_pct: number
          id: string
          monthly_budget: number
          organization_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alert_threshold_pct?: number
          id?: string
          monthly_budget?: number
          organization_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alert_threshold_pct?: number
          id?: string
          monthly_budget?: number
          organization_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_history: {
        Row: {
          cost_price: number
          id: string
          organization_id: string
          product_id: string
          recorded_at: string
          supplier_name: string | null
        }
        Insert: {
          cost_price: number
          id?: string
          organization_id: string
          product_id: string
          recorded_at?: string
          supplier_name?: string | null
        }
        Update: {
          cost_price?: number
          id?: string
          organization_id?: string
          product_id?: string
          recorded_at?: string
          supplier_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_drafts: {
        Row: {
          created_at: string
          current_step: number
          form_data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_step?: number
          form_data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_step?: number
          form_data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_features: {
        Row: {
          category: string | null
          created_at: string | null
          demo_video_url: string | null
          description: string | null
          display_order: number | null
          feature_key: string
          id: string
          is_active: boolean | null
          is_highlighted: boolean | null
          name: string
          problem_keywords: string[] | null
          related_features: string[] | null
          screenshot_url: string | null
          tagline: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          demo_video_url?: string | null
          description?: string | null
          display_order?: number | null
          feature_key: string
          id?: string
          is_active?: boolean | null
          is_highlighted?: boolean | null
          name: string
          problem_keywords?: string[] | null
          related_features?: string[] | null
          screenshot_url?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          demo_video_url?: string | null
          description?: string | null
          display_order?: number | null
          feature_key?: string
          id?: string
          is_active?: boolean | null
          is_highlighted?: boolean | null
          name?: string
          problem_keywords?: string[] | null
          related_features?: string[] | null
          screenshot_url?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_service_performance: {
        Row: {
          avg_product_cost: number
          avg_quantity_per_use: number
          avg_service_revenue: number
          created_at: string
          id: string
          last_used_at: string | null
          location_id: string | null
          margin_pct: number
          organization_id: string
          outcome_score: number | null
          period_end: string
          period_start: string
          product_id: string
          service_name: string
          total_uses: number
        }
        Insert: {
          avg_product_cost?: number
          avg_quantity_per_use?: number
          avg_service_revenue?: number
          created_at?: string
          id?: string
          last_used_at?: string | null
          location_id?: string | null
          margin_pct?: number
          organization_id: string
          outcome_score?: number | null
          period_end: string
          period_start: string
          product_id: string
          service_name: string
          total_uses?: number
        }
        Update: {
          avg_product_cost?: number
          avg_quantity_per_use?: number
          avg_service_revenue?: number
          created_at?: string
          id?: string
          last_used_at?: string | null
          location_id?: string | null
          margin_pct?: number
          organization_id?: string
          outcome_score?: number | null
          period_end?: string
          period_start?: string
          product_id?: string
          service_name?: string
          total_uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_service_performance_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_service_performance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_service_performance_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_service_performance_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_substitutions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          priority: number | null
          product_id: string
          substitute_product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          priority?: number | null
          product_id: string
          substitute_product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          priority?: number | null
          product_id?: string
          substitute_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_substitutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_substitutions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_substitutions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_substitutions_substitute_product_id_fkey"
            columns: ["substitute_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_substitutions_substitute_product_id_fkey"
            columns: ["substitute_product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          account_number: string | null
          avg_delivery_days: number | null
          contact_name: string | null
          created_at: string
          delivery_count: number
          id: string
          lead_time_days: number | null
          moq: number
          organization_id: string
          product_id: string
          reorder_method: string | null
          reorder_method_other: string | null
          reorder_notes: string | null
          secondary_contact_email: string | null
          secondary_contact_name: string | null
          secondary_contact_phone: string | null
          supplier_email: string | null
          supplier_name: string
          supplier_phone: string | null
          supplier_website: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          avg_delivery_days?: number | null
          contact_name?: string | null
          created_at?: string
          delivery_count?: number
          id?: string
          lead_time_days?: number | null
          moq?: number
          organization_id: string
          product_id: string
          reorder_method?: string | null
          reorder_method_other?: string | null
          reorder_notes?: string | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          supplier_email?: string | null
          supplier_name: string
          supplier_phone?: string | null
          supplier_website?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          avg_delivery_days?: number | null
          contact_name?: string | null
          created_at?: string
          delivery_count?: number
          id?: string
          lead_time_days?: number | null
          moq?: number
          organization_id?: string
          product_id?: string
          reorder_method?: string | null
          reorder_method_other?: string | null
          reorder_notes?: string | null
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          supplier_email?: string | null
          supplier_name?: string
          supplier_phone?: string | null
          supplier_website?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available_online: boolean
          barcode: string | null
          brand: string | null
          category: string | null
          clearance_discount_pct: number | null
          clearance_marked_at: string | null
          clearance_status: string | null
          color_type: Database["public"]["Enums"]["color_type"] | null
          container_size: string | null
          cost_per_gram: number | null
          cost_price: number | null
          created_at: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          depletion_method: string
          description: string | null
          expires_at: string | null
          expiry_alert_days: number | null
          external_id: string | null
          id: string
          image_url: string | null
          import_job_id: string | null
          import_source: string | null
          imported_at: string | null
          is_active: boolean | null
          is_backroom_tracked: boolean
          is_billable_to_client: boolean
          is_forecast_eligible: boolean
          is_overage_eligible: boolean
          location_id: string | null
          markup_pct: number | null
          name: string
          organization_id: string | null
          original_retail_price: number | null
          par_level: number | null
          product_type: string
          quantity_on_hand: number | null
          reorder_level: number | null
          retail_price: number | null
          size: string | null
          sku: string | null
          subcategory: string | null
          supplier_id: string | null
          swatch_color: string | null
          unit_of_measure: string
          updated_at: string | null
          variant: string | null
        }
        Insert: {
          available_online?: boolean
          barcode?: string | null
          brand?: string | null
          category?: string | null
          clearance_discount_pct?: number | null
          clearance_marked_at?: string | null
          clearance_status?: string | null
          color_type?: Database["public"]["Enums"]["color_type"] | null
          container_size?: string | null
          cost_per_gram?: number | null
          cost_price?: number | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          depletion_method?: string
          description?: string | null
          expires_at?: string | null
          expiry_alert_days?: number | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          is_active?: boolean | null
          is_backroom_tracked?: boolean
          is_billable_to_client?: boolean
          is_forecast_eligible?: boolean
          is_overage_eligible?: boolean
          location_id?: string | null
          markup_pct?: number | null
          name: string
          organization_id?: string | null
          original_retail_price?: number | null
          par_level?: number | null
          product_type?: string
          quantity_on_hand?: number | null
          reorder_level?: number | null
          retail_price?: number | null
          size?: string | null
          sku?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          swatch_color?: string | null
          unit_of_measure?: string
          updated_at?: string | null
          variant?: string | null
        }
        Update: {
          available_online?: boolean
          barcode?: string | null
          brand?: string | null
          category?: string | null
          clearance_discount_pct?: number | null
          clearance_marked_at?: string | null
          clearance_status?: string | null
          color_type?: Database["public"]["Enums"]["color_type"] | null
          container_size?: string | null
          cost_per_gram?: number | null
          cost_price?: number | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          depletion_method?: string
          description?: string | null
          expires_at?: string | null
          expiry_alert_days?: number | null
          external_id?: string | null
          id?: string
          image_url?: string | null
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          is_active?: boolean | null
          is_backroom_tracked?: boolean
          is_billable_to_client?: boolean
          is_forecast_eligible?: boolean
          is_overage_eligible?: boolean
          location_id?: string | null
          markup_pct?: number | null
          name?: string
          organization_id?: string | null
          original_retail_price?: number | null
          par_level?: number | null
          product_type?: string
          quantity_on_hand?: number | null
          reorder_level?: number | null
          retail_price?: number | null
          size?: string | null
          sku?: string | null
          subcategory?: string | null
          supplier_id?: string | null
          swatch_color?: string | null
          unit_of_measure?: string
          updated_at?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "product_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      program_achievements: {
        Row: {
          achievement_type: string
          badge_color: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          key: string
          threshold: number
          title: string
        }
        Insert: {
          achievement_type: string
          badge_color?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          key: string
          threshold?: number
          title: string
        }
        Update: {
          achievement_type?: string
          badge_color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          key?: string
          threshold?: number
          title?: string
        }
        Relationships: []
      }
      program_configuration: {
        Row: {
          allow_manual_restart: boolean
          auto_restart_on_miss: boolean
          created_at: string
          grace_period_hours: number
          id: string
          is_active: boolean
          life_happens_passes_total: number
          logo_color: string | null
          logo_size: number | null
          logo_url: string | null
          program_name: string
          require_metrics_logging: boolean
          require_proof_upload: boolean
          total_days: number
          updated_at: string
          weekly_wins_interval: number
          welcome_cta_text: string | null
          welcome_eyebrow: string | null
          welcome_headline: string | null
          welcome_subheadline: string | null
        }
        Insert: {
          allow_manual_restart?: boolean
          auto_restart_on_miss?: boolean
          created_at?: string
          grace_period_hours?: number
          id?: string
          is_active?: boolean
          life_happens_passes_total?: number
          logo_color?: string | null
          logo_size?: number | null
          logo_url?: string | null
          program_name?: string
          require_metrics_logging?: boolean
          require_proof_upload?: boolean
          total_days?: number
          updated_at?: string
          weekly_wins_interval?: number
          welcome_cta_text?: string | null
          welcome_eyebrow?: string | null
          welcome_headline?: string | null
          welcome_subheadline?: string | null
        }
        Update: {
          allow_manual_restart?: boolean
          auto_restart_on_miss?: boolean
          created_at?: string
          grace_period_hours?: number
          id?: string
          is_active?: boolean
          life_happens_passes_total?: number
          logo_color?: string | null
          logo_size?: number | null
          logo_url?: string | null
          program_name?: string
          require_metrics_logging?: boolean
          require_proof_upload?: boolean
          total_days?: number
          updated_at?: string
          weekly_wins_interval?: number
          welcome_cta_text?: string | null
          welcome_eyebrow?: string | null
          welcome_headline?: string | null
          welcome_subheadline?: string | null
        }
        Relationships: []
      }
      program_daily_tasks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_required: boolean
          label: string
          task_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          label: string
          task_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          label?: string
          task_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_outcomes: {
        Row: {
          created_at: string
          description: string
          display_order: number
          icon: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_pause_requests: {
        Row: {
          created_at: string
          enrollment_id: string
          id: string
          pause_end_date: string | null
          pause_start_date: string | null
          reason: string
          requested_at: string
          requested_duration_days: number
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          id?: string
          pause_end_date?: string | null
          pause_start_date?: string | null
          reason: string
          requested_at?: string
          requested_duration_days?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          id?: string
          pause_end_date?: string | null
          pause_start_date?: string | null
          reason?: string
          requested_at?: string
          requested_duration_days?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_pause_requests_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "stylist_program_enrollment"
            referencedColumns: ["id"]
          },
        ]
      }
      program_resources: {
        Row: {
          assignment_id: string | null
          created_at: string
          description: string | null
          display_order: number
          file_type: string
          file_url: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          week_id: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          file_type?: string
          file_url: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          week_id?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          file_type?: string
          file_url?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_resources_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "weekly_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_resources_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      program_rules: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_emphasized: boolean
          rule_number: number
          rule_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_emphasized?: boolean
          rule_number: number
          rule_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_emphasized?: boolean
          rule_number?: number
          rule_text?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_weeks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          end_day: number
          id: string
          is_active: boolean
          objective: string | null
          resources_json: Json | null
          start_day: number
          title: string
          updated_at: string
          video_url: string | null
          week_number: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          end_day: number
          id?: string
          is_active?: boolean
          objective?: string | null
          resources_json?: Json | null
          start_day: number
          title: string
          updated_at?: string
          video_url?: string | null
          week_number: number
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          end_day?: number
          id?: string
          is_active?: boolean
          objective?: string | null
          resources_json?: Json | null
          start_day?: number
          title?: string
          updated_at?: string
          video_url?: string | null
          week_number?: number
        }
        Relationships: []
      }
      promotion_redemptions: {
        Row: {
          client_id: string | null
          created_at: string | null
          discount_applied: number | null
          final_amount: number | null
          id: string
          items_discounted: Json | null
          location_id: string | null
          organization_id: string
          original_amount: number | null
          promo_code_used: string | null
          promotion_id: string | null
          revenue_attributed: number | null
          staff_user_id: string | null
          transaction_date: string | null
          transaction_id: string | null
          variant_id: string | null
          voucher_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          discount_applied?: number | null
          final_amount?: number | null
          id?: string
          items_discounted?: Json | null
          location_id?: string | null
          organization_id: string
          original_amount?: number | null
          promo_code_used?: string | null
          promotion_id?: string | null
          revenue_attributed?: number | null
          staff_user_id?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          variant_id?: string | null
          voucher_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          discount_applied?: number | null
          final_amount?: number | null
          id?: string
          items_discounted?: Json | null
          location_id?: string | null
          organization_id?: string
          original_amount?: number | null
          promo_code_used?: string | null
          promotion_id?: string | null
          revenue_attributed?: number | null
          staff_user_id?: string | null
          transaction_date?: string | null
          transaction_id?: string | null
          variant_id?: string | null
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_variants: {
        Row: {
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          is_active: boolean | null
          is_control: boolean | null
          promotion_id: string
          redemptions: number | null
          revenue_generated: number | null
          variant_code: string | null
          variant_name: string
          views: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          is_control?: boolean | null
          promotion_id: string
          redemptions?: number | null
          revenue_generated?: number | null
          variant_code?: string | null
          variant_name: string
          views?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          is_control?: boolean | null
          promotion_id?: string
          redemptions?: number | null
          revenue_generated?: number | null
          variant_code?: string | null
          variant_name?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_variants_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotional_services: {
        Row: {
          auto_deactivate: boolean | null
          created_at: string | null
          deactivated_at: string | null
          expires_at: string
          id: string
          organization_id: string
          original_price: number | null
          original_service_id: string | null
          promotion_id: string | null
          promotional_price: number | null
          service_id: string
        }
        Insert: {
          auto_deactivate?: boolean | null
          created_at?: string | null
          deactivated_at?: string | null
          expires_at: string
          id?: string
          organization_id: string
          original_price?: number | null
          original_service_id?: string | null
          promotion_id?: string | null
          promotional_price?: number | null
          service_id: string
        }
        Update: {
          auto_deactivate?: boolean | null
          created_at?: string | null
          deactivated_at?: string | null
          expires_at?: string
          id?: string
          organization_id?: string
          original_price?: number | null
          original_service_id?: string | null
          promotion_id?: string | null
          promotional_price?: number | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotional_services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_services_original_service_id_fkey"
            columns: ["original_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_services_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotional_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applicable_category: string[] | null
          applicable_service_ids: string[] | null
          applies_to: string | null
          banner_color: string | null
          banner_text: string | null
          created_at: string | null
          created_by: string | null
          current_usage_count: number | null
          description: string | null
          discount_max_amount: number | null
          discount_value: number | null
          excluded_service_ids: string[] | null
          expires_at: string | null
          flash_sale_countdown_start: string | null
          id: string
          is_active: boolean | null
          is_flash_sale: boolean | null
          minimum_purchase: number | null
          name: string
          organization_id: string
          promo_code: string | null
          promotion_type: string
          show_homepage_banner: boolean | null
          starts_at: string
          target_audience: string | null
          target_client_ids: string[] | null
          target_loyalty_tiers: string[] | null
          updated_at: string | null
          usage_limit: number | null
          usage_per_client: number | null
        }
        Insert: {
          applicable_category?: string[] | null
          applicable_service_ids?: string[] | null
          applies_to?: string | null
          banner_color?: string | null
          banner_text?: string | null
          created_at?: string | null
          created_by?: string | null
          current_usage_count?: number | null
          description?: string | null
          discount_max_amount?: number | null
          discount_value?: number | null
          excluded_service_ids?: string[] | null
          expires_at?: string | null
          flash_sale_countdown_start?: string | null
          id?: string
          is_active?: boolean | null
          is_flash_sale?: boolean | null
          minimum_purchase?: number | null
          name: string
          organization_id: string
          promo_code?: string | null
          promotion_type: string
          show_homepage_banner?: boolean | null
          starts_at?: string
          target_audience?: string | null
          target_client_ids?: string[] | null
          target_loyalty_tiers?: string[] | null
          updated_at?: string | null
          usage_limit?: number | null
          usage_per_client?: number | null
        }
        Update: {
          applicable_category?: string[] | null
          applicable_service_ids?: string[] | null
          applies_to?: string | null
          banner_color?: string | null
          banner_text?: string | null
          created_at?: string | null
          created_by?: string | null
          current_usage_count?: number | null
          description?: string | null
          discount_max_amount?: number | null
          discount_value?: number | null
          excluded_service_ids?: string[] | null
          expires_at?: string | null
          flash_sale_countdown_start?: string | null
          id?: string
          is_active?: boolean | null
          is_flash_sale?: boolean | null
          minimum_purchase?: number | null
          name?: string
          organization_id?: string
          promo_code?: string | null
          promotion_type?: string
          show_homepage_banner?: boolean | null
          starts_at?: string
          target_audience?: string | null
          target_client_ids?: string[] | null
          target_loyalty_tiers?: string[] | null
          updated_at?: string | null
          usage_limit?: number | null
          usage_per_client?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pto_policies: {
        Row: {
          accrual_period: string
          accrual_rate: number
          carry_over_limit: number | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          max_balance: number | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          accrual_period?: string
          accrual_rate?: number
          carry_over_limit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_balance?: number | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          accrual_period?: string
          accrual_rate?: number
          carry_over_limit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          max_balance?: number | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pto_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          id: string
          line_total: number | null
          notes: string | null
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          unit_cost: number | null
          vendor_product_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number | null
          notes?: string | null
          product_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received?: number | null
          unit_cost?: number | null
          vendor_product_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number | null
          notes?: string | null
          product_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          unit_cost?: number | null
          vendor_product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_vendor_product_id_fkey"
            columns: ["vendor_product_id"]
            isOneToOne: false
            referencedRelation: "vendor_products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_followup_sent_at: string | null
          expected_delivery_date: string | null
          grand_total: number | null
          id: string
          items_received_count: number | null
          line_count: number | null
          notes: string | null
          organization_id: string
          po_number: string | null
          product_id: string | null
          quantity: number
          received_at: string | null
          receiving_status: string | null
          sent_at: string | null
          shipping_cost: number | null
          status: string
          subtotal: number | null
          supplier_confirmed_at: string | null
          supplier_confirmed_delivery_date: string | null
          supplier_email: string | null
          supplier_name: string | null
          tax_amount: number | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_followup_sent_at?: string | null
          expected_delivery_date?: string | null
          grand_total?: number | null
          id?: string
          items_received_count?: number | null
          line_count?: number | null
          notes?: string | null
          organization_id: string
          po_number?: string | null
          product_id?: string | null
          quantity?: number
          received_at?: string | null
          receiving_status?: string | null
          sent_at?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number | null
          supplier_confirmed_at?: string | null
          supplier_confirmed_delivery_date?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_followup_sent_at?: string | null
          expected_delivery_date?: string | null
          grand_total?: number | null
          id?: string
          items_received_count?: number | null
          line_count?: number | null
          notes?: string | null
          organization_id?: string
          po_number?: string | null
          product_id?: string | null
          quantity?: number
          received_at?: string | null
          receiving_status?: string | null
          sent_at?: string | null
          shipping_cost?: number | null
          status?: string
          subtotal?: number | null
          supplier_confirmed_at?: string | null
          supplier_confirmed_delivery_date?: string | null
          supplier_email?: string | null
          supplier_name?: string | null
          tax_amount?: number | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      receiving_record_lines: {
        Row: {
          created_at: string
          expiry_date: string | null
          id: string
          lot_number: string | null
          notes: string | null
          po_line_id: string
          product_id: string
          quantity_damaged: number | null
          quantity_received: number
          quantity_rejected: number | null
          receiving_record_id: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          po_line_id: string
          product_id: string
          quantity_damaged?: number | null
          quantity_received: number
          quantity_rejected?: number | null
          receiving_record_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          po_line_id?: string
          product_id?: string
          quantity_damaged?: number | null
          quantity_received?: number
          quantity_rejected?: number | null
          receiving_record_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_record_lines_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_record_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_record_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_record_lines_receiving_record_id_fkey"
            columns: ["receiving_record_id"]
            isOneToOne: false
            referencedRelation: "receiving_records"
            referencedColumns: ["id"]
          },
        ]
      }
      receiving_records: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          purchase_order_id: string
          received_at: string
          received_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          purchase_order_id: string
          received_at?: string
          received_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          purchase_order_id?: string
          received_at?: string
          received_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "receiving_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receiving_records_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiting_pipeline_stages: {
        Row: {
          color: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean | null
          name: string
          slug: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      reengagement_campaigns: {
        Row: {
          created_at: string | null
          description: string | null
          email_template_id: string | null
          id: string
          inactivity_days: number
          is_active: boolean | null
          name: string
          offer_type: string | null
          offer_value: string | null
          organization_id: string | null
          sms_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          email_template_id?: string | null
          id?: string
          inactivity_days?: number
          is_active?: boolean | null
          name: string
          offer_type?: string | null
          offer_value?: string | null
          organization_id?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          email_template_id?: string | null
          id?: string
          inactivity_days?: number
          is_active?: boolean | null
          name?: string
          offer_type?: string | null
          offer_value?: string | null
          organization_id?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reengagement_campaigns_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengagement_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reengagement_outreach: {
        Row: {
          campaign_id: string | null
          channel: string | null
          client_id: string | null
          contacted_at: string | null
          converted_appointment_id: string | null
          converted_at: string | null
          created_at: string | null
          days_inactive: number | null
          id: string
          last_visit_date: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel?: string | null
          client_id?: string | null
          contacted_at?: string | null
          converted_appointment_id?: string | null
          converted_at?: string | null
          created_at?: string | null
          days_inactive?: number | null
          id?: string
          last_visit_date?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string | null
          client_id?: string | null
          contacted_at?: string | null
          converted_appointment_id?: string | null
          converted_at?: string | null
          created_at?: string | null
          days_inactive?: number | null
          id?: string
          last_visit_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reengagement_outreach_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "reengagement_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengagement_outreach_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengagement_outreach_converted_appointment_id_fkey"
            columns: ["converted_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_conversions: {
        Row: {
          converted_at: string | null
          first_appointment_date: string | null
          first_appointment_id: string | null
          first_appointment_value: number | null
          id: string
          referee_reward_id: string | null
          referee_reward_issued_at: string | null
          referee_rewarded: boolean | null
          referral_link_id: string
          referred_client_id: string
          referrer_reward_id: string | null
          referrer_reward_issued_at: string | null
          referrer_rewarded: boolean | null
        }
        Insert: {
          converted_at?: string | null
          first_appointment_date?: string | null
          first_appointment_id?: string | null
          first_appointment_value?: number | null
          id?: string
          referee_reward_id?: string | null
          referee_reward_issued_at?: string | null
          referee_rewarded?: boolean | null
          referral_link_id: string
          referred_client_id: string
          referrer_reward_id?: string | null
          referrer_reward_issued_at?: string | null
          referrer_rewarded?: boolean | null
        }
        Update: {
          converted_at?: string | null
          first_appointment_date?: string | null
          first_appointment_id?: string | null
          first_appointment_value?: number | null
          id?: string
          referee_reward_id?: string | null
          referee_reward_issued_at?: string | null
          referee_rewarded?: boolean | null
          referral_link_id?: string
          referred_client_id?: string
          referrer_reward_id?: string | null
          referrer_reward_issued_at?: string | null
          referrer_rewarded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_conversions_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          campaign_name: string | null
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          organization_id: string
          referee_reward_description: string | null
          referee_reward_value: number | null
          referral_code: string
          referrer_client_id: string | null
          referrer_reward_description: string | null
          referrer_reward_value: number | null
          referrer_user_id: string | null
          reward_type: string | null
          terms_conditions: string | null
          uses: number | null
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          organization_id: string
          referee_reward_description?: string | null
          referee_reward_value?: number | null
          referral_code: string
          referrer_client_id?: string | null
          referrer_reward_description?: string | null
          referrer_reward_value?: number | null
          referrer_user_id?: string | null
          reward_type?: string | null
          terms_conditions?: string | null
          uses?: number | null
        }
        Update: {
          campaign_name?: string | null
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          organization_id?: string
          referee_reward_description?: string | null
          referee_reward_value?: number | null
          referral_code?: string
          referrer_client_id?: string | null
          referrer_reward_description?: string | null
          referrer_reward_value?: number | null
          referrer_user_id?: string | null
          reward_type?: string | null
          terms_conditions?: string | null
          uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_records: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          organization_id: string
          original_item_name: string | null
          original_transaction_date: string
          original_transaction_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          refund_amount: number
          refund_type: string
          status: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          organization_id: string
          original_item_name?: string | null
          original_transaction_date: string
          original_transaction_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_amount: number
          refund_type: string
          status?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          original_item_name?: string | null
          original_transaction_date?: string
          original_transaction_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          refund_amount?: number
          refund_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_late_fee_config: {
        Row: {
          auto_apply: boolean | null
          created_at: string | null
          daily_fee_amount: number | null
          grace_period_days: number | null
          id: string
          late_fee_amount: number | null
          late_fee_percentage: number | null
          late_fee_type: string | null
          max_late_fee: number | null
          organization_id: string
          send_reminder_days: number[] | null
          updated_at: string | null
        }
        Insert: {
          auto_apply?: boolean | null
          created_at?: string | null
          daily_fee_amount?: number | null
          grace_period_days?: number | null
          id?: string
          late_fee_amount?: number | null
          late_fee_percentage?: number | null
          late_fee_type?: string | null
          max_late_fee?: number | null
          organization_id: string
          send_reminder_days?: number[] | null
          updated_at?: string | null
        }
        Update: {
          auto_apply?: boolean | null
          created_at?: string | null
          daily_fee_amount?: number | null
          grace_period_days?: number | null
          id?: string
          late_fee_amount?: number | null
          late_fee_percentage?: number | null
          late_fee_type?: string | null
          max_late_fee?: number | null
          organization_id?: string
          send_reminder_days?: number[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_late_fee_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          adjustment_notes: string | null
          adjustments: number | null
          amount_paid: number | null
          autopay_attempted_at: string | null
          autopay_failed_reason: string | null
          autopay_scheduled: boolean | null
          base_rent: number
          booth_renter_id: string
          contract_id: string
          created_at: string | null
          credits_applied: number | null
          due_date: string
          id: string
          late_fee: number | null
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          period_end: string
          period_start: string
          status: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          adjustment_notes?: string | null
          adjustments?: number | null
          amount_paid?: number | null
          autopay_attempted_at?: string | null
          autopay_failed_reason?: string | null
          autopay_scheduled?: boolean | null
          base_rent: number
          booth_renter_id: string
          contract_id: string
          created_at?: string | null
          credits_applied?: number | null
          due_date: string
          id?: string
          late_fee?: number | null
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          period_end: string
          period_start: string
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          adjustment_notes?: string | null
          adjustments?: number | null
          amount_paid?: number | null
          autopay_attempted_at?: string | null
          autopay_failed_reason?: string | null
          autopay_scheduled?: boolean | null
          base_rent?: number
          booth_renter_id?: string
          contract_id?: string
          created_at?: string | null
          credits_applied?: number | null
          due_date?: string
          id?: string
          late_fee?: number | null
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_booth_renter_id_fkey"
            columns: ["booth_renter_id"]
            isOneToOne: false
            referencedRelation: "booth_renter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "booth_rental_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_stations: {
        Row: {
          amenities: string[] | null
          created_at: string | null
          daily_rate: number | null
          id: string
          is_available: boolean | null
          location_id: string
          monthly_rate: number | null
          notes: string | null
          organization_id: string
          station_name: string
          station_number: number | null
          station_type: string | null
          updated_at: string | null
          weekly_rate: number | null
        }
        Insert: {
          amenities?: string[] | null
          created_at?: string | null
          daily_rate?: number | null
          id?: string
          is_available?: boolean | null
          location_id: string
          monthly_rate?: number | null
          notes?: string | null
          organization_id: string
          station_name: string
          station_number?: number | null
          station_type?: string | null
          updated_at?: string | null
          weekly_rate?: number | null
        }
        Update: {
          amenities?: string[] | null
          created_at?: string | null
          daily_rate?: number | null
          id?: string
          is_available?: boolean | null
          location_id?: string
          monthly_rate?: number | null
          notes?: string | null
          organization_id?: string
          station_name?: string
          station_number?: number | null
          station_type?: string | null
          updated_at?: string | null
          weekly_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_stations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      renter_commission_statements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          booth_renter_id: string
          commission_rate: number
          created_at: string | null
          deduction_notes: string | null
          deductions: number | null
          id: string
          line_items: Json | null
          net_payout: number
          organization_id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          statement_pdf_url: string | null
          status: string | null
          total_commission: number
          total_retail_sales: number
          total_service_revenue: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          booth_renter_id: string
          commission_rate: number
          created_at?: string | null
          deduction_notes?: string | null
          deductions?: number | null
          id?: string
          line_items?: Json | null
          net_payout?: number
          organization_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          statement_pdf_url?: string | null
          status?: string | null
          total_commission?: number
          total_retail_sales?: number
          total_service_revenue?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          booth_renter_id?: string
          commission_rate?: number
          created_at?: string | null
          deduction_notes?: string | null
          deductions?: number | null
          id?: string
          line_items?: Json | null
          net_payout?: number
          organization_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          statement_pdf_url?: string | null
          status?: string | null
          total_commission?: number
          total_retail_sales?: number
          total_service_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "renter_commission_statements_booth_renter_id_fkey"
            columns: ["booth_renter_id"]
            isOneToOne: false
            referencedRelation: "booth_renter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renter_commission_statements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      renter_onboarding_completions: {
        Row: {
          booth_renter_id: string
          completed_at: string | null
          completed_data: Json | null
          id: string
          task_id: string
        }
        Insert: {
          booth_renter_id: string
          completed_at?: string | null
          completed_data?: Json | null
          id?: string
          task_id: string
        }
        Update: {
          booth_renter_id?: string
          completed_at?: string | null
          completed_data?: Json | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renter_onboarding_completions_booth_renter_id_fkey"
            columns: ["booth_renter_id"]
            isOneToOne: false
            referencedRelation: "booth_renter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renter_onboarding_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "renter_onboarding_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      renter_onboarding_progress: {
        Row: {
          booth_renter_id: string
          completed_at: string | null
          created_at: string | null
          document_url: string | null
          id: string
          is_complete: boolean | null
          notes: string | null
          task_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          booth_renter_id: string
          completed_at?: string | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          is_complete?: boolean | null
          notes?: string | null
          task_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          booth_renter_id?: string
          completed_at?: string | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          is_complete?: boolean | null
          notes?: string | null
          task_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renter_onboarding_progress_booth_renter_id_fkey"
            columns: ["booth_renter_id"]
            isOneToOne: false
            referencedRelation: "booth_renter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renter_onboarding_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "renter_onboarding_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      renter_onboarding_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          document_required: boolean | null
          document_template_id: string | null
          form_template_id: string | null
          id: string
          is_active: boolean | null
          link_url: string | null
          organization_id: string
          required: boolean | null
          task_order: number | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          document_required?: boolean | null
          document_template_id?: string | null
          form_template_id?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          organization_id: string
          required?: boolean | null
          task_order?: number | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          document_required?: boolean | null
          document_template_id?: string | null
          form_template_id?: string | null
          id?: string
          is_active?: boolean | null
          link_url?: string | null
          organization_id?: string
          required?: boolean | null
          task_order?: number | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renter_onboarding_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      renter_payment_methods: {
        Row: {
          autopay_days_before_due: number | null
          autopay_enabled: boolean | null
          booth_renter_id: string
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at: string | null
        }
        Insert: {
          autopay_days_before_due?: number | null
          autopay_enabled?: boolean | null
          booth_renter_id: string
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_customer_id: string
          stripe_payment_method_id: string
          updated_at?: string | null
        }
        Update: {
          autopay_days_before_due?: number | null
          autopay_enabled?: boolean | null
          booth_renter_id?: string
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_customer_id?: string
          stripe_payment_method_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renter_payment_methods_booth_renter_id_fkey"
            columns: ["booth_renter_id"]
            isOneToOne: false
            referencedRelation: "booth_renter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      renter_payment_settings: {
        Row: {
          autopay_days_before_due: number | null
          autopay_enabled: boolean | null
          booth_renter_id: string
          created_at: string | null
          id: string
          organization_id: string
          payment_method_brand: string | null
          payment_method_last_four: string | null
          payment_method_type: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          updated_at: string | null
        }
        Insert: {
          autopay_days_before_due?: number | null
          autopay_enabled?: boolean | null
          booth_renter_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          payment_method_brand?: string | null
          payment_method_last_four?: string | null
          payment_method_type?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Update: {
          autopay_days_before_due?: number | null
          autopay_enabled?: boolean | null
          booth_renter_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          payment_method_brand?: string | null
          payment_method_last_four?: string | null
          payment_method_type?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renter_payment_settings_booth_renter_id_fkey"
            columns: ["booth_renter_id"]
            isOneToOne: true
            referencedRelation: "booth_renter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renter_payment_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      renter_retail_commissions: {
        Row: {
          booth_renter_id: string
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string
          payout_date: string | null
          payout_reference: string | null
          payout_status: string | null
          retail_sale_id: string | null
          sale_amount: number
          sale_date: string
        }
        Insert: {
          booth_renter_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          payout_date?: string | null
          payout_reference?: string | null
          payout_status?: string | null
          retail_sale_id?: string | null
          sale_amount: number
          sale_date: string
        }
        Update: {
          booth_renter_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          payout_date?: string | null
          payout_reference?: string | null
          payout_status?: string | null
          retail_sale_id?: string | null
          sale_amount?: number
          sale_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "renter_retail_commissions_booth_renter_id_fkey"
            columns: ["booth_renter_id"]
            isOneToOne: false
            referencedRelation: "booth_renter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renter_retail_commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      replenishment_recommendations: {
        Row: {
          created_at: string
          current_on_hand: number | null
          daily_usage_rate: number
          expires_at: string | null
          generated_at: string
          id: string
          lead_time_days: number
          open_po_qty: number | null
          organization_id: string
          product_id: string
          recommended_qty: number
          reorder_point: number
          safety_stock: number
          status: string
          target_stock: number
          usage_stddev: number | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          current_on_hand?: number | null
          daily_usage_rate?: number
          expires_at?: string | null
          generated_at?: string
          id?: string
          lead_time_days?: number
          open_po_qty?: number | null
          organization_id: string
          product_id: string
          recommended_qty?: number
          reorder_point?: number
          safety_stock?: number
          status?: string
          target_stock?: number
          usage_stddev?: number | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          current_on_hand?: number | null
          daily_usage_rate?: number
          expires_at?: string | null
          generated_at?: string
          id?: string
          lead_time_days?: number
          open_po_qty?: number | null
          organization_id?: string
          product_id?: string
          recommended_qty?: number
          reorder_point?: number
          safety_stock?: number
          status?: string
          target_stock?: number
          usage_stddev?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replenishment_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replenishment_recommendations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          created_at: string | null
          date_from: string
          date_to: string
          file_url: string | null
          generated_by: string | null
          id: string
          parameters: Json | null
          report_name: string
          report_type: string
        }
        Insert: {
          created_at?: string | null
          date_from: string
          date_to: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          parameters?: Json | null
          report_name: string
          report_type: string
        }
        Update: {
          created_at?: string | null
          date_from?: string
          date_to?: string
          file_url?: string | null
          generated_by?: string | null
          id?: string
          parameters?: Json | null
          report_name?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_history_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      report_template_usage: {
        Row: {
          id: string
          template_id: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          id?: string
          template_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          id?: string
          template_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_template_usage_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      responsibilities: {
        Row: {
          color: string
          created_at: string
          description: string | null
          display_name: string
          icon: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          display_name: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          display_name?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsibilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      responsibility_assets: {
        Row: {
          content: Json
          created_at: string
          id: string
          responsibility_id: string
          sort_order: number
          title: string
          type: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          responsibility_id: string
          sort_order?: number
          title: string
          type?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          responsibility_id?: string
          sort_order?: number
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsibility_assets_responsibility_id_fkey"
            columns: ["responsibility_id"]
            isOneToOne: false
            referencedRelation: "responsibilities"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_commission_config: {
        Row: {
          commission_type: string
          created_at: string
          default_rate: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          tiers: Json | null
          updated_at: string
        }
        Insert: {
          commission_type?: string
          created_at?: string
          default_rate?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id: string
          tiers?: Json | null
          updated_at?: string
        }
        Update: {
          commission_type?: string
          created_at?: string
          default_rate?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          tiers?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retail_commission_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_commission_overrides: {
        Row: {
          config_id: string
          created_at: string
          id: string
          organization_id: string
          override_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          config_id: string
          created_at?: string
          id?: string
          organization_id: string
          override_rate: number
          updated_at?: string
          user_id: string
        }
        Update: {
          config_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          override_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retail_commission_overrides_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "retail_commission_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_commission_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_product_settings: {
        Row: {
          created_at: string
          display_position: number | null
          id: string
          is_tracked: boolean
          location_id: string
          organization_id: string
          par_level: number | null
          product_id: string
          reorder_level: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_position?: number | null
          id?: string
          is_tracked?: boolean
          location_id: string
          organization_id: string
          par_level?: number | null
          product_id: string
          reorder_level?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_position?: number | null
          id?: string
          is_tracked?: boolean
          location_id?: string
          organization_id?: string
          par_level?: number | null
          product_id?: string
          reorder_level?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retail_product_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_product_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retail_product_settings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_recommendation_events: {
        Row: {
          client_id: string
          converted_at: string | null
          created_at: string
          id: string
          organization_id: string
          recommended_at: string
          recommended_by: string | null
          recommended_product_name: string
          service_name: string | null
        }
        Insert: {
          client_id: string
          converted_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          recommended_at?: string
          recommended_by?: string | null
          recommended_product_name: string
          service_name?: string | null
        }
        Update: {
          client_id?: string
          converted_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          recommended_at?: string
          recommended_by?: string | null
          recommended_product_name?: string
          service_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retail_recommendation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_sales_goals: {
        Row: {
          created_at: string
          created_by: string | null
          goal_period: string
          id: string
          location_id: string | null
          organization_id: string | null
          period_start: string
          target_attachment_rate: number | null
          target_revenue: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          goal_period?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          period_start: string
          target_attachment_rate?: number | null
          target_revenue?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          goal_period?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          period_start?: string
          target_attachment_rate?: number | null
          target_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retail_sales_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_forecasts: {
        Row: {
          accuracy_score: number | null
          actual_revenue: number | null
          confidence_level: string | null
          created_at: string | null
          factors: Json | null
          forecast_date: string
          forecast_type: string
          id: string
          location_id: string | null
          organization_id: string | null
          predicted_products: number | null
          predicted_revenue: number
          predicted_services: number | null
        }
        Insert: {
          accuracy_score?: number | null
          actual_revenue?: number | null
          confidence_level?: string | null
          created_at?: string | null
          factors?: Json | null
          forecast_date: string
          forecast_type: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          predicted_products?: number | null
          predicted_revenue: number
          predicted_services?: number | null
        }
        Update: {
          accuracy_score?: number | null
          actual_revenue?: number | null
          confidence_level?: string | null
          created_at?: string | null
          factors?: Json | null
          forecast_date?: string
          forecast_type?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          predicted_products?: number | null
          predicted_revenue?: number
          predicted_services?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_forecasts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      review_goals: {
        Row: {
          created_at: string
          goal_text: string
          id: string
          progress_notes: string | null
          review_id: string
          status: string
          target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_text: string
          id?: string
          progress_notes?: string | null
          review_id: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_text?: string
          id?: string
          progress_notes?: string | null
          review_id?: string
          status?: string
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_goals_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "performance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          created_at: string | null
          fulfilled_at: string | null
          id: string
          manager_id: string | null
          notes: string | null
          points_spent: number
          reward_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fulfilled_at?: string | null
          id?: string
          manager_id?: string | null
          notes?: string | null
          points_spent: number
          reward_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fulfilled_at?: string | null
          id?: string
          manager_id?: string | null
          notes?: string | null
          points_spent?: number
          reward_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          organization_id: string | null
          points_cost: number
          quantity_available: number | null
          sort_order: number | null
          start_date: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          organization_id?: string | null
          points_cost: number
          quantity_available?: number | null
          sort_order?: number | null
          start_date?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          organization_id?: string | null
          points_cost?: number
          quantity_available?: number | null
          sort_order?: number | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reweigh_events: {
        Row: {
          bowl_id: string
          captured_via: string
          created_at: string
          id: string
          leftover_quantity: number
          leftover_unit: string
          mix_session_id: string
          notes: string | null
          weighed_at: string
          weighed_by_staff_id: string | null
        }
        Insert: {
          bowl_id: string
          captured_via?: string
          created_at?: string
          id?: string
          leftover_quantity?: number
          leftover_unit?: string
          mix_session_id: string
          notes?: string | null
          weighed_at?: string
          weighed_by_staff_id?: string | null
        }
        Update: {
          bowl_id?: string
          captured_via?: string
          created_at?: string
          id?: string
          leftover_quantity?: number
          leftover_unit?: string
          mix_session_id?: string
          notes?: string | null
          weighed_at?: string
          weighed_by_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reweigh_events_bowl_id_fkey"
            columns: ["bowl_id"]
            isOneToOne: false
            referencedRelation: "mix_bowls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reweigh_events_mix_session_id_fkey"
            columns: ["mix_session_id"]
            isOneToOne: false
            referencedRelation: "mix_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ring_the_bell_entries: {
        Row: {
          closing_script: string | null
          coach_note: string | null
          created_at: string
          enrollment_id: string
          id: string
          is_pinned: boolean | null
          lead_source: Database["public"]["Enums"]["lead_source"]
          organization_id: string | null
          screenshot_url: string | null
          service_booked: string
          ticket_value: number
          user_id: string
        }
        Insert: {
          closing_script?: string | null
          coach_note?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          is_pinned?: boolean | null
          lead_source?: Database["public"]["Enums"]["lead_source"]
          organization_id?: string | null
          screenshot_url?: string | null
          service_booked: string
          ticket_value: number
          user_id: string
        }
        Update: {
          closing_script?: string | null
          coach_note?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          is_pinned?: boolean | null
          lead_source?: Database["public"]["Enums"]["lead_source"]
          organization_id?: string | null
          screenshot_url?: string | null
          service_booked?: string
          ticket_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ring_the_bell_entries_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "stylist_program_enrollment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ring_the_bell_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permission_defaults: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permission_defaults_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          category: string
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          icon: string
          id: string
          is_system: boolean
          name: string
          permission_ids: string[]
          updated_at: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          icon?: string
          id?: string
          is_system?: boolean
          name: string
          permission_ids?: string[]
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          icon?: string
          id?: string
          is_system?: boolean
          name?: string
          permission_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          category: string
          color: string
          created_at: string
          description: string | null
          display_name: string
          icon: string
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          display_name: string
          icon?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          description?: string | null
          display_name?: string
          icon?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      salon_chair_assignments: {
        Row: {
          chair_id: string
          created_at: string
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          status: string
          stylist_user_id: string
          updated_at: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          chair_id: string
          created_at?: string
          id?: string
          location_id: string
          notes?: string | null
          organization_id: string
          status?: string
          stylist_user_id: string
          updated_at?: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          chair_id?: string
          created_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          stylist_user_id?: string
          updated_at?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "salon_chair_assignments_chair_id_fkey"
            columns: ["chair_id"]
            isOneToOne: false
            referencedRelation: "rental_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_chair_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_inquiries: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          consultation_booked_at: string | null
          converted_at: string | null
          created_at: string
          email: string | null
          first_service_revenue: number | null
          id: string
          message: string | null
          name: string
          phone: string | null
          phorest_client_id: string | null
          preferred_location: string | null
          preferred_service: string | null
          preferred_stylist: string | null
          response_time_seconds: number | null
          source: Database["public"]["Enums"]["inquiry_source"]
          source_detail: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          consultation_booked_at?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          first_service_revenue?: number | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          phorest_client_id?: string | null
          preferred_location?: string | null
          preferred_service?: string | null
          preferred_stylist?: string | null
          response_time_seconds?: number | null
          source?: Database["public"]["Enums"]["inquiry_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          consultation_booked_at?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string | null
          first_service_revenue?: number | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          phorest_client_id?: string | null
          preferred_location?: string | null
          preferred_service?: string | null
          preferred_stylist?: string | null
          response_time_seconds?: number | null
          source?: Database["public"]["Enums"]["inquiry_source"]
          source_detail?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salon_inquiries_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "salon_inquiries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      salon_performance_index: {
        Row: {
          conversion_strength: number
          created_at: string
          execution_quality: number
          factors: Json | null
          growth_velocity: number
          id: string
          location_id: string | null
          operational_stability: number
          organization_id: string
          pricing_power: number
          revenue_efficiency: number
          risk_level: string
          scored_at: string
          spi_score: number
        }
        Insert: {
          conversion_strength?: number
          created_at?: string
          execution_quality?: number
          factors?: Json | null
          growth_velocity?: number
          id?: string
          location_id?: string | null
          operational_stability?: number
          organization_id: string
          pricing_power?: number
          revenue_efficiency?: number
          risk_level?: string
          scored_at?: string
          spi_score?: number
        }
        Update: {
          conversion_strength?: number
          created_at?: string
          execution_quality?: number
          factors?: Json | null
          growth_velocity?: number
          id?: string
          location_id?: string | null
          operational_stability?: number
          organization_id?: string
          pricing_power?: number
          revenue_efficiency?: number
          risk_level?: string
          scored_at?: string
          spi_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "salon_performance_index_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salon_performance_index_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      salon_services: {
        Row: {
          category: string | null
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_recovery_plans: {
        Row: {
          content: string
          created_at: string
          current_revenue: number | null
          goal_period: string
          id: string
          is_archived: boolean
          plan_type: string | null
          reminder_date: string | null
          reminder_sent: boolean
          shortfall: number | null
          target_revenue: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          current_revenue?: number | null
          goal_period?: string
          id?: string
          is_archived?: boolean
          plan_type?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean
          shortfall?: number | null
          target_revenue?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          current_revenue?: number | null
          goal_period?: string
          id?: string
          is_archived?: boolean
          plan_type?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean
          shortfall?: number | null
          target_revenue?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_change_requests: {
        Row: {
          created_at: string | null
          current_days: string[] | null
          id: string
          location_id: string
          reason: string | null
          requested_days: string[]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_days?: string[] | null
          id?: string
          location_id: string
          reason?: string | null
          requested_days: string[]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_days?: string[] | null
          id?: string
          location_id?: string
          reason?: string | null
          requested_days?: string[]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_rent_changes: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          current_rent_amount: number
          effective_date: string
          id: string
          new_rent_amount: number
          notes: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          reason: string | null
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          current_rent_amount: number
          effective_date: string
          id?: string
          new_rent_amount: number
          notes?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          reason?: string | null
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          current_rent_amount?: number
          effective_date?: string
          id?: string
          new_rent_amount?: number
          notes?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_rent_changes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "booth_rental_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_report_runs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          file_url: string | null
          id: string
          recipient_count: number | null
          scheduled_report_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          recipient_count?: number | null
          scheduled_report_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          recipient_count?: number | null
          scheduled_report_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_report_runs_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          filters: Json | null
          format: string | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          next_run_at: string | null
          organization_id: string | null
          recipients: Json
          report_type: string | null
          schedule_config: Json | null
          schedule_type: string
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          organization_id?: string | null
          recipients?: Json
          report_type?: string | null
          schedule_config?: Json | null
          schedule_type: string
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          organization_id?: string | null
          recipients?: Json
          report_type?: string | null
          schedule_config?: Json | null
          schedule_type?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_suggestions: {
        Row: {
          confidence_score: number | null
          context: Json | null
          created_at: string | null
          id: string
          location_id: string | null
          organization_id: string | null
          service_duration_minutes: number | null
          staff_user_id: string
          suggested_date: string
          suggested_time: string
          suggestion_type: string
          was_accepted: boolean | null
        }
        Insert: {
          confidence_score?: number | null
          context?: Json | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          organization_id?: string | null
          service_duration_minutes?: number | null
          staff_user_id: string
          suggested_date: string
          suggested_time: string
          suggestion_type: string
          was_accepted?: boolean | null
        }
        Update: {
          confidence_score?: number | null
          context?: Json | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          organization_id?: string | null
          service_duration_minutes?: number | null
          staff_user_id?: string
          suggested_date?: string
          suggested_time?: string
          suggestion_type?: string
          was_accepted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      search_promotions: {
        Row: {
          boost_amount: number
          created_at: string
          created_by: string | null
          demoted: boolean
          expires_at: string | null
          id: string
          organization_id: string
          promoted_path: string
          query_pattern: string
          updated_at: string
        }
        Insert: {
          boost_amount?: number
          created_at?: string
          created_by?: string | null
          demoted?: boolean
          expires_at?: string | null
          id?: string
          organization_id: string
          promoted_path: string
          query_pattern: string
          updated_at?: string
        }
        Update: {
          boost_amount?: number
          created_at?: string
          created_by?: string | null
          demoted?: boolean
          expires_at?: string | null
          id?: string
          organization_id?: string
          promoted_path?: string
          query_pattern?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_autonomous_actions: {
        Row: {
          action_type: string
          confidence_score: number | null
          content_applied: Json | null
          created_at: string
          error_message: string | null
          executed_at: string
          id: string
          measured_impact: Json | null
          organization_id: string
          predicted_lift: number | null
          rollback_data: Json | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          status: string
          task_id: string | null
          template_key: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          confidence_score?: number | null
          content_applied?: Json | null
          created_at?: string
          error_message?: string | null
          executed_at?: string
          id?: string
          measured_impact?: Json | null
          organization_id: string
          predicted_lift?: number | null
          rollback_data?: Json | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          status?: string
          task_id?: string | null
          template_key: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          confidence_score?: number | null
          content_applied?: Json | null
          created_at?: string
          error_message?: string | null
          executed_at?: string
          id?: string
          measured_impact?: Json | null
          organization_id?: string
          predicted_lift?: number | null
          rollback_data?: Json | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          status?: string
          task_id?: string | null
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_autonomous_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_campaigns: {
        Row: {
          actual_revenue_impact: Json | null
          created_at: string
          expected_metrics: Json | null
          id: string
          location_id: string | null
          objective: string | null
          organization_id: string
          owner_user_id: string | null
          status: Database["public"]["Enums"]["seo_campaign_status"]
          title: string
          updated_at: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          actual_revenue_impact?: Json | null
          created_at?: string
          expected_metrics?: Json | null
          id?: string
          location_id?: string | null
          objective?: string | null
          organization_id: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["seo_campaign_status"]
          title: string
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          actual_revenue_impact?: Json | null
          created_at?: string
          expected_metrics?: Json | null
          id?: string
          location_id?: string | null
          objective?: string | null
          organization_id?: string
          owner_user_id?: string | null
          status?: Database["public"]["Enums"]["seo_campaign_status"]
          title?: string
          updated_at?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_campaigns_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_domination_scores: {
        Row: {
          captured_revenue_share: number
          competitor_suppression: number
          content_dominance: number
          contributing_location_ids: string[]
          conversion_strength: number
          created_at: string
          domination_score: number
          estimated_market_demand: number
          factors: Json | null
          id: string
          organization_id: string
          page_strength: number
          review_dominance: number
          scored_at: string
          strategy_state: Database["public"]["Enums"]["seo_domination_strategy"]
          target_id: string
          visible_market_share: number
        }
        Insert: {
          captured_revenue_share?: number
          competitor_suppression?: number
          content_dominance?: number
          contributing_location_ids?: string[]
          conversion_strength?: number
          created_at?: string
          domination_score?: number
          estimated_market_demand?: number
          factors?: Json | null
          id?: string
          organization_id: string
          page_strength?: number
          review_dominance?: number
          scored_at?: string
          strategy_state?: Database["public"]["Enums"]["seo_domination_strategy"]
          target_id: string
          visible_market_share?: number
        }
        Update: {
          captured_revenue_share?: number
          competitor_suppression?: number
          content_dominance?: number
          contributing_location_ids?: string[]
          conversion_strength?: number
          created_at?: string
          domination_score?: number
          estimated_market_demand?: number
          factors?: Json | null
          id?: string
          organization_id?: string
          page_strength?: number
          review_dominance?: number
          scored_at?: string
          strategy_state?: Database["public"]["Enums"]["seo_domination_strategy"]
          target_id?: string
          visible_market_share?: number
        }
        Relationships: [
          {
            foreignKeyName: "seo_domination_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_domination_scores_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "seo_domination_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_domination_targets: {
        Row: {
          city: string
          created_at: string
          id: string
          is_active: boolean
          micro_market_keywords: string[]
          organization_id: string
          service_category: string
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_active?: boolean
          micro_market_keywords?: string[]
          organization_id: string
          service_category: string
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          micro_market_keywords?: string[]
          organization_id?: string
          service_category?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_domination_targets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_engine_settings: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_engine_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_growth_reports: {
        Row: {
          actions_taken: Json
          created_at: string
          id: string
          impact_summary: Json
          next_best_action: Json | null
          organization_id: string
          remaining_opportunity: number | null
          report_date: string
        }
        Insert: {
          actions_taken?: Json
          created_at?: string
          id?: string
          impact_summary?: Json
          next_best_action?: Json | null
          organization_id: string
          remaining_opportunity?: number | null
          report_date: string
        }
        Update: {
          actions_taken?: Json
          created_at?: string
          id?: string
          impact_summary?: Json
          next_best_action?: Json | null
          organization_id?: string
          remaining_opportunity?: number | null
          report_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_growth_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_health_scores: {
        Row: {
          created_at: string
          domain: Database["public"]["Enums"]["seo_health_domain"]
          id: string
          organization_id: string
          raw_signals: Json | null
          score: number
          scored_at: string
          seo_object_id: string
        }
        Insert: {
          created_at?: string
          domain: Database["public"]["Enums"]["seo_health_domain"]
          id?: string
          organization_id: string
          raw_signals?: Json | null
          score: number
          scored_at?: string
          seo_object_id: string
        }
        Update: {
          created_at?: string
          domain?: Database["public"]["Enums"]["seo_health_domain"]
          id?: string
          organization_id?: string
          raw_signals?: Json | null
          score?: number
          scored_at?: string
          seo_object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_health_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_health_scores_seo_object_id_fkey"
            columns: ["seo_object_id"]
            isOneToOne: false
            referencedRelation: "seo_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_object_revenue: {
        Row: {
          computed_at: string
          created_at: string
          id: string
          organization_id: string
          period_end: string
          period_start: string
          seo_object_id: string
          total_revenue: number
          transaction_count: number
        }
        Insert: {
          computed_at?: string
          created_at?: string
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          seo_object_id: string
          total_revenue?: number
          transaction_count?: number
        }
        Update: {
          computed_at?: string
          created_at?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          seo_object_id?: string
          total_revenue?: number
          transaction_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "seo_object_revenue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_object_revenue_seo_object_id_fkey"
            columns: ["seo_object_id"]
            isOneToOne: false
            referencedRelation: "seo_objects"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_objects: {
        Row: {
          created_at: string
          id: string
          label: string
          location_id: string | null
          metadata: Json | null
          object_key: string
          object_type: Database["public"]["Enums"]["seo_object_type"]
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          location_id?: string | null
          metadata?: Json | null
          object_key: string
          object_type: Database["public"]["Enums"]["seo_object_type"]
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          location_id?: string | null
          metadata?: Json | null
          object_key?: string
          object_type?: Database["public"]["Enums"]["seo_object_type"]
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_objects_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_objects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_opportunity_risk_scores: {
        Row: {
          created_at: string
          factors: Json | null
          id: string
          location_id: string
          opportunity_score: number
          organization_id: string
          risk_score: number
          scored_at: string
          service_id: string | null
        }
        Insert: {
          created_at?: string
          factors?: Json | null
          id?: string
          location_id: string
          opportunity_score: number
          organization_id: string
          risk_score: number
          scored_at?: string
          service_id?: string | null
        }
        Update: {
          created_at?: string
          factors?: Json | null
          id?: string
          location_id?: string
          opportunity_score?: number
          organization_id?: string
          risk_score?: number
          scored_at?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_opportunity_risk_scores_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_opportunity_risk_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_task_dependencies: {
        Row: {
          created_at: string
          dependency_type: Database["public"]["Enums"]["seo_dependency_type"]
          depends_on_task_id: string
          id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          dependency_type?: Database["public"]["Enums"]["seo_dependency_type"]
          depends_on_task_id: string
          id?: string
          task_id: string
        }
        Update: {
          created_at?: string
          dependency_type?: Database["public"]["Enums"]["seo_dependency_type"]
          depends_on_task_id?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "seo_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "seo_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_task_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["seo_task_status"] | null
          notes: string | null
          performed_by: string | null
          previous_status: Database["public"]["Enums"]["seo_task_status"] | null
          task_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["seo_task_status"] | null
          notes?: string | null
          performed_by?: string | null
          previous_status?:
            | Database["public"]["Enums"]["seo_task_status"]
            | null
          task_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["seo_task_status"] | null
          notes?: string | null
          performed_by?: string | null
          previous_status?:
            | Database["public"]["Enums"]["seo_task_status"]
            | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "seo_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_task_impact: {
        Row: {
          contribution_confidence: number | null
          created_at: string
          id: string
          measured_at: string
          measurement_window: Database["public"]["Enums"]["seo_impact_window"]
          metrics: Json
          task_id: string
        }
        Insert: {
          contribution_confidence?: number | null
          created_at?: string
          id?: string
          measured_at?: string
          measurement_window: Database["public"]["Enums"]["seo_impact_window"]
          metrics?: Json
          task_id: string
        }
        Update: {
          contribution_confidence?: number | null
          created_at?: string
          id?: string
          measured_at?: string
          measurement_window?: Database["public"]["Enums"]["seo_impact_window"]
          metrics?: Json
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_task_impact_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "seo_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_task_templates: {
        Row: {
          assignment_rules: Json
          completion_criteria: Json
          created_at: string
          dependency_rules: Json
          description_template: string
          due_date_rules: Json
          escalation_rules: Json
          expected_impact_category: string | null
          id: string
          is_active: boolean
          label: string
          priority_weight_overrides: Json | null
          recurrence_rules: Json
          suppression_rules: Json
          task_type: string
          template_key: string
          trigger_conditions: Json
          trigger_domain:
            | Database["public"]["Enums"]["seo_health_domain"]
            | null
          updated_at: string
        }
        Insert: {
          assignment_rules?: Json
          completion_criteria?: Json
          created_at?: string
          dependency_rules?: Json
          description_template?: string
          due_date_rules?: Json
          escalation_rules?: Json
          expected_impact_category?: string | null
          id?: string
          is_active?: boolean
          label: string
          priority_weight_overrides?: Json | null
          recurrence_rules?: Json
          suppression_rules?: Json
          task_type: string
          template_key: string
          trigger_conditions?: Json
          trigger_domain?:
            | Database["public"]["Enums"]["seo_health_domain"]
            | null
          updated_at?: string
        }
        Update: {
          assignment_rules?: Json
          completion_criteria?: Json
          created_at?: string
          dependency_rules?: Json
          description_template?: string
          due_date_rules?: Json
          escalation_rules?: Json
          expected_impact_category?: string | null
          id?: string
          is_active?: boolean
          label?: string
          priority_weight_overrides?: Json | null
          recurrence_rules?: Json
          suppression_rules?: Json
          task_type?: string
          template_key?: string
          trigger_conditions?: Json
          trigger_domain?:
            | Database["public"]["Enums"]["seo_health_domain"]
            | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_tasks: {
        Row: {
          ai_generated_content: Json | null
          assigned_at: string | null
          assigned_role: string | null
          assigned_to: string | null
          campaign_id: string | null
          completion_method:
            | Database["public"]["Enums"]["seo_completion_method"]
            | null
          completion_verified_at: string | null
          cooldown_until: string | null
          created_at: string
          due_at: string | null
          escalation_level: number
          id: string
          location_id: string | null
          organization_id: string
          primary_seo_object_id: string
          priority_factors: Json | null
          priority_score: number
          proof_artifacts: Json | null
          resolved_at: string | null
          resolved_by: string | null
          secondary_seo_object_id: string | null
          status: Database["public"]["Enums"]["seo_task_status"]
          suppression_reason: string | null
          template_key: string
          updated_at: string
        }
        Insert: {
          ai_generated_content?: Json | null
          assigned_at?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          campaign_id?: string | null
          completion_method?:
            | Database["public"]["Enums"]["seo_completion_method"]
            | null
          completion_verified_at?: string | null
          cooldown_until?: string | null
          created_at?: string
          due_at?: string | null
          escalation_level?: number
          id?: string
          location_id?: string | null
          organization_id: string
          primary_seo_object_id: string
          priority_factors?: Json | null
          priority_score?: number
          proof_artifacts?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          secondary_seo_object_id?: string | null
          status?: Database["public"]["Enums"]["seo_task_status"]
          suppression_reason?: string | null
          template_key: string
          updated_at?: string
        }
        Update: {
          ai_generated_content?: Json | null
          assigned_at?: string | null
          assigned_role?: string | null
          assigned_to?: string | null
          campaign_id?: string | null
          completion_method?:
            | Database["public"]["Enums"]["seo_completion_method"]
            | null
          completion_verified_at?: string | null
          cooldown_until?: string | null
          created_at?: string
          due_at?: string | null
          escalation_level?: number
          id?: string
          location_id?: string | null
          organization_id?: string
          primary_seo_object_id?: string
          priority_factors?: Json | null
          priority_score?: number
          proof_artifacts?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          secondary_seo_object_id?: string | null
          status?: Database["public"]["Enums"]["seo_task_status"]
          suppression_reason?: string | null
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_tasks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "seo_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_tasks_primary_seo_object_id_fkey"
            columns: ["primary_seo_object_id"]
            isOneToOne: false
            referencedRelation: "seo_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_tasks_secondary_seo_object_id_fkey"
            columns: ["secondary_seo_object_id"]
            isOneToOne: false
            referencedRelation: "seo_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_tasks_template_key_fkey"
            columns: ["template_key"]
            isOneToOne: false
            referencedRelation: "seo_task_templates"
            referencedColumns: ["template_key"]
          },
        ]
      }
      service_addon_assignments: {
        Row: {
          addon_id: string
          created_at: string
          display_order: number
          id: string
          organization_id: string
          target_category_id: string | null
          target_service_id: string | null
          target_type: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          display_order?: number
          id?: string
          organization_id: string
          target_category_id?: string | null
          target_service_id?: string | null
          target_type: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          display_order?: number
          id?: string
          organization_id?: string
          target_category_id?: string | null
          target_service_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_addon_assignments_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "service_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addon_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addon_assignments_target_category_id_fkey"
            columns: ["target_category_id"]
            isOneToOne: false
            referencedRelation: "service_category_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_addon_assignments_target_service_id_fkey"
            columns: ["target_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_addons: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          display_order: number
          duration_minutes: number | null
          id: string
          is_active: boolean
          linked_service_id: string | null
          name: string
          organization_id: string
          price: number
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          linked_service_id?: string | null
          name: string
          organization_id: string
          price?: number
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          display_order?: number
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          linked_service_id?: string | null
          name?: string
          organization_id?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_addons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_allowance_bowls: {
        Row: {
          bowl_number: number
          created_at: string
          id: string
          label: string
          organization_id: string
          service_id: string
          updated_at: string
        }
        Insert: {
          bowl_number?: number
          created_at?: string
          id?: string
          label?: string
          organization_id: string
          service_id: string
          updated_at?: string
        }
        Update: {
          bowl_number?: number
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_allowance_bowls_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_allowance_bowls_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_allowance_policies: {
        Row: {
          allowance_health_pct: number | null
          allowance_health_status: string | null
          allowance_unit: string
          billing_mode: string
          created_at: string
          created_by: string | null
          id: string
          included_allowance_qty: number
          is_active: boolean
          last_health_check_at: string | null
          notes: string | null
          organization_id: string
          overage_cap: number | null
          overage_rate: number
          overage_rate_type: string
          service_id: string
          updated_at: string
        }
        Insert: {
          allowance_health_pct?: number | null
          allowance_health_status?: string | null
          allowance_unit?: string
          billing_mode?: string
          created_at?: string
          created_by?: string | null
          id?: string
          included_allowance_qty?: number
          is_active?: boolean
          last_health_check_at?: string | null
          notes?: string | null
          organization_id: string
          overage_cap?: number | null
          overage_rate?: number
          overage_rate_type?: string
          service_id: string
          updated_at?: string
        }
        Update: {
          allowance_health_pct?: number | null
          allowance_health_status?: string | null
          allowance_unit?: string
          billing_mode?: string
          created_at?: string
          created_by?: string | null
          id?: string
          included_allowance_qty?: number
          is_active?: boolean
          last_health_check_at?: string | null
          notes?: string | null
          organization_id?: string
          overage_cap?: number | null
          overage_rate?: number
          overage_rate_type?: string
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_allowance_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_allowance_policies_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_blueprints: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json
          organization_id: string
          position: number
          service_id: string
          step_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          position?: number
          service_id: string
          step_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          position?: number
          service_id?: string
          step_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_blueprints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_blueprints_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_category_addons: {
        Row: {
          addon_category_name: string | null
          addon_label: string
          addon_service_name: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          organization_id: string
          source_category_id: string
          updated_at: string
        }
        Insert: {
          addon_category_name?: string | null
          addon_label: string
          addon_service_name?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id: string
          source_category_id: string
          updated_at?: string
        }
        Update: {
          addon_category_name?: string | null
          addon_label?: string
          addon_service_name?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string
          source_category_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_category_addons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_category_addons_source_category_id_fkey"
            columns: ["source_category_id"]
            isOneToOne: false
            referencedRelation: "service_category_colors"
            referencedColumns: ["id"]
          },
        ]
      }
      service_category_colors: {
        Row: {
          archived_at: string | null
          category_name: string
          color_hex: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_archived: boolean
          organization_id: string | null
          text_color_hex: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category_name: string
          color_hex?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_archived?: boolean
          organization_id?: string | null
          text_color_hex?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category_name?: string
          color_hex?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_archived?: boolean
          organization_id?: string | null
          text_color_hex?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_category_colors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_category_themes: {
        Row: {
          colors: Json
          created_at: string | null
          description: string | null
          id: string
          is_custom: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          colors: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          colors?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_communication_flows: {
        Row: {
          created_at: string
          email_template_id: string | null
          id: string
          is_active: boolean
          service_id: string
          sms_template_id: string | null
          timing_offset_minutes: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_template_id?: string | null
          id?: string
          is_active?: boolean
          service_id: string
          sms_template_id?: string | null
          timing_offset_minutes?: number
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_template_id?: string | null
          id?: string
          is_active?: boolean
          service_id?: string
          sms_template_id?: string | null
          timing_offset_minutes?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_communication_flows_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_communication_flows_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "phorest_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_communication_flows_sms_template_id_fkey"
            columns: ["sms_template_id"]
            isOneToOne: false
            referencedRelation: "sms_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      service_discounts: {
        Row: {
          applicable_categories: string[] | null
          applicable_service_ids: string[] | null
          applies_to: string | null
          created_at: string | null
          created_by: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_service_ids?: string[] | null
          applies_to?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_service_ids?: string[] | null
          applies_to?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_discounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_email_flow_step_overrides: {
        Row: {
          created_at: string
          html_body: string | null
          id: string
          location_id: string
          step_id: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          html_body?: string | null
          id?: string
          location_id: string
          step_id: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          html_body?: string | null
          id?: string
          location_id?: string
          step_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_email_flow_step_overrides_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_email_flow_step_overrides_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "service_email_flow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      service_email_flow_steps: {
        Row: {
          created_at: string
          email_template_id: string | null
          flow_id: string
          html_body: string
          id: string
          is_active: boolean
          step_order: number
          subject: string
          timing_type: string
          timing_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_template_id?: string | null
          flow_id: string
          html_body?: string
          id?: string
          is_active?: boolean
          step_order?: number
          subject: string
          timing_type?: string
          timing_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_template_id?: string | null
          flow_id?: string
          html_body?: string
          id?: string
          is_active?: boolean
          step_order?: number
          subject?: string
          timing_type?: string
          timing_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_email_flow_steps_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_email_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "service_email_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      service_email_flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          service_category: string | null
          service_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          service_category?: string | null
          service_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          service_category?: string | null
          service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_email_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_email_flows_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_email_queue: {
        Row: {
          appointment_id: string
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          merged_into_id: string | null
          message_id: string | null
          organization_id: string
          scheduled_at: string
          sent_at: string | null
          status: string
          step_id: string
        }
        Insert: {
          appointment_id: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          merged_into_id?: string | null
          message_id?: string | null
          organization_id: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          step_id: string
        }
        Update: {
          appointment_id?: string
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          merged_into_id?: string | null
          message_id?: string | null
          organization_id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_email_queue_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_email_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_email_queue_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "service_email_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_email_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_email_queue_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "service_email_flow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      service_form_requirements: {
        Row: {
          created_at: string | null
          form_template_id: string
          id: string
          is_required: boolean | null
          service_id: string
          signing_frequency: string | null
        }
        Insert: {
          created_at?: string | null
          form_template_id: string
          id?: string
          is_required?: boolean | null
          service_id: string
          signing_frequency?: string | null
        }
        Update: {
          created_at?: string | null
          form_template_id?: string
          id?: string
          is_required?: boolean | null
          service_id?: string
          signing_frequency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_form_requirements_form_template_id_fkey"
            columns: ["form_template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_form_requirements_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "phorest_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_level_prices: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          price: number
          service_id: string
          stylist_level_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          price: number
          service_id: string
          stylist_level_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          price?: number
          service_id?: string
          stylist_level_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_level_prices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_level_prices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_level_prices_stylist_level_id_fkey"
            columns: ["stylist_level_id"]
            isOneToOne: false
            referencedRelation: "stylist_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      service_location_prices: {
        Row: {
          created_at: string
          id: string
          location_id: string
          organization_id: string
          price: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          organization_id: string
          price: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          organization_id?: string
          price?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_location_prices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_location_prices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_location_prices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_price_recommendations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          current_price: number
          id: string
          margin_pct_current: number
          margin_pct_target: number
          organization_id: string
          product_cost: number
          recommended_price: number
          service_id: string
          status: Database["public"]["Enums"]["price_recommendation_status"]
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          current_price: number
          id?: string
          margin_pct_current: number
          margin_pct_target: number
          organization_id: string
          product_cost: number
          recommended_price: number
          service_id: string
          status?: Database["public"]["Enums"]["price_recommendation_status"]
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          current_price?: number
          id?: string
          margin_pct_current?: number
          margin_pct_target?: number
          organization_id?: string
          product_cost?: number
          recommended_price?: number
          service_id?: string
          status?: Database["public"]["Enums"]["price_recommendation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "service_price_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_price_recommendations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_price_targets: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          service_id: string
          target_margin_pct: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          service_id: string
          target_margin_pct?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          service_id?: string
          target_margin_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_price_targets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_price_targets_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_profitability_snapshots: {
        Row: {
          appointment_id: string | null
          appointment_service_id: string | null
          contribution_margin: number | null
          created_at: string | null
          id: string
          location_id: string | null
          organization_id: string
          overage_revenue: number | null
          product_cost: number | null
          service_name: string | null
          service_revenue: number | null
          staff_id: string | null
          waste_cost: number | null
        }
        Insert: {
          appointment_id?: string | null
          appointment_service_id?: string | null
          contribution_margin?: number | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          organization_id: string
          overage_revenue?: number | null
          product_cost?: number | null
          service_name?: string | null
          service_revenue?: number | null
          staff_id?: string | null
          waste_cost?: number | null
        }
        Update: {
          appointment_id?: string | null
          appointment_service_id?: string | null
          contribution_margin?: number | null
          created_at?: string | null
          id?: string
          location_id?: string | null
          organization_id?: string
          overage_revenue?: number | null
          product_cost?: number | null
          service_name?: string | null
          service_revenue?: number | null
          staff_id?: string | null
          waste_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_profitability_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_recipe_baselines: {
        Row: {
          bowl_id: string
          cost_per_unit_snapshot: number | null
          created_at: string
          created_by: string | null
          developer_ratio: number | null
          expected_quantity: number
          id: string
          is_developer: boolean
          notes: string | null
          organization_id: string
          product_id: string
          service_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          bowl_id: string
          cost_per_unit_snapshot?: number | null
          created_at?: string
          created_by?: string | null
          developer_ratio?: number | null
          expected_quantity?: number
          id?: string
          is_developer?: boolean
          notes?: string | null
          organization_id: string
          product_id: string
          service_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          bowl_id?: string
          cost_per_unit_snapshot?: number | null
          created_at?: string
          created_by?: string | null
          developer_ratio?: number | null
          expected_quantity?: number
          id?: string
          is_developer?: boolean
          notes?: string | null
          organization_id?: string
          product_id?: string
          service_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_recipe_baselines_bowl_id_fkey"
            columns: ["bowl_id"]
            isOneToOne: false
            referencedRelation: "service_allowance_bowls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recipe_baselines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recipe_baselines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recipe_baselines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_recipe_baselines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_seasonal_adjustments: {
        Row: {
          adjustment_type: string
          adjustment_value: number
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          organization_id: string
          service_id: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          adjustment_type: string
          adjustment_value: number
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          organization_id: string
          service_id?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          adjustment_value?: number
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          organization_id?: string
          service_id?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_seasonal_adjustments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_seasonal_adjustments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_seasonal_adjustments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_stylist_price_overrides: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          organization_id: string
          price: number
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          organization_id: string
          price: number
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          organization_id?: string
          price?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_stylist_price_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_stylist_price_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_stylist_price_overrides_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_tracking_components: {
        Row: {
          component_role: string
          contributes_to_billing: boolean
          contributes_to_cost: boolean
          contributes_to_forecast: boolean
          contributes_to_inventory: boolean
          contributes_to_waste: boolean
          created_at: string
          estimated_quantity: number | null
          id: string
          organization_id: string
          product_id: string
          service_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          component_role?: string
          contributes_to_billing?: boolean
          contributes_to_cost?: boolean
          contributes_to_forecast?: boolean
          contributes_to_inventory?: boolean
          contributes_to_waste?: boolean
          created_at?: string
          estimated_quantity?: number | null
          id?: string
          organization_id: string
          product_id: string
          service_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          component_role?: string
          contributes_to_billing?: boolean
          contributes_to_cost?: boolean
          contributes_to_forecast?: boolean
          contributes_to_inventory?: boolean
          contributes_to_waste?: boolean
          created_at?: string
          estimated_quantity?: number | null
          id?: string
          organization_id?: string
          product_id?: string
          service_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_tracking_components_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tracking_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tracking_components_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_tracking_components_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          allow_same_day_booking: boolean | null
          archived_at: string | null
          assistant_prep_allowed: boolean
          backroom_config_dismissed: boolean
          bookable_online: boolean
          category: string | null
          container_types: Database["public"]["Enums"]["container_type"][]
          content_creation_time_minutes: number
          cost: number | null
          created_at: string | null
          deposit_amount: number | null
          deposit_amount_flat: number | null
          deposit_type: string
          description: string | null
          display_order: number | null
          duration_minutes: number
          external_id: string | null
          finishing_time_minutes: number
          formula_memory_enabled: boolean
          id: string
          import_job_id: string | null
          import_source: string | null
          imported_at: string | null
          is_active: boolean | null
          is_archived: boolean
          is_backroom_tracked: boolean
          is_chemical_service: boolean | null
          is_popular: boolean
          lead_time_days: number | null
          location_id: string | null
          name: string
          organization_id: string | null
          predictive_backroom_enabled: boolean
          price: number | null
          processing_time_minutes: number
          require_card_on_file: boolean
          requires_deposit: boolean
          requires_new_client_consultation: boolean
          requires_qualification: boolean | null
          same_day_restriction_reason: string | null
          smart_mix_assist_enabled: boolean
          updated_at: string | null
          variance_threshold_pct: number
          website_description: string | null
        }
        Insert: {
          allow_same_day_booking?: boolean | null
          archived_at?: string | null
          assistant_prep_allowed?: boolean
          backroom_config_dismissed?: boolean
          bookable_online?: boolean
          category?: string | null
          container_types?: Database["public"]["Enums"]["container_type"][]
          content_creation_time_minutes?: number
          cost?: number | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_amount_flat?: number | null
          deposit_type?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          external_id?: string | null
          finishing_time_minutes?: number
          formula_memory_enabled?: boolean
          id?: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          is_active?: boolean | null
          is_archived?: boolean
          is_backroom_tracked?: boolean
          is_chemical_service?: boolean | null
          is_popular?: boolean
          lead_time_days?: number | null
          location_id?: string | null
          name: string
          organization_id?: string | null
          predictive_backroom_enabled?: boolean
          price?: number | null
          processing_time_minutes?: number
          require_card_on_file?: boolean
          requires_deposit?: boolean
          requires_new_client_consultation?: boolean
          requires_qualification?: boolean | null
          same_day_restriction_reason?: string | null
          smart_mix_assist_enabled?: boolean
          updated_at?: string | null
          variance_threshold_pct?: number
          website_description?: string | null
        }
        Update: {
          allow_same_day_booking?: boolean | null
          archived_at?: string | null
          assistant_prep_allowed?: boolean
          backroom_config_dismissed?: boolean
          bookable_online?: boolean
          category?: string | null
          container_types?: Database["public"]["Enums"]["container_type"][]
          content_creation_time_minutes?: number
          cost?: number | null
          created_at?: string | null
          deposit_amount?: number | null
          deposit_amount_flat?: number | null
          deposit_type?: string
          description?: string | null
          display_order?: number | null
          duration_minutes?: number
          external_id?: string | null
          finishing_time_minutes?: number
          formula_memory_enabled?: boolean
          id?: string
          import_job_id?: string | null
          import_source?: string | null
          imported_at?: string | null
          is_active?: boolean | null
          is_archived?: boolean
          is_backroom_tracked?: boolean
          is_chemical_service?: boolean | null
          is_popular?: boolean
          lead_time_days?: number | null
          location_id?: string | null
          name?: string
          organization_id?: string | null
          predictive_backroom_enabled?: boolean
          price?: number | null
          processing_time_minutes?: number
          require_card_on_file?: boolean
          requires_deposit?: boolean
          requires_new_client_consultation?: boolean
          requires_qualification?: boolean | null
          same_day_restriction_reason?: string | null
          smart_mix_assist_enabled?: boolean
          updated_at?: string | null
          variance_threshold_pct?: number
          website_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_formulas: {
        Row: {
          client_id: string
          created_at: string
          formula_history_id: string
          id: string
          notes: string | null
          organization_id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          client_id: string
          created_at?: string
          formula_history_id: string
          id?: string
          notes?: string | null
          organization_id: string
          shared_by: string
          shared_with: string
        }
        Update: {
          client_id?: string
          created_at?: string
          formula_history_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_formulas_formula_history_id_fkey"
            columns: ["formula_history_id"]
            isOneToOne: false
            referencedRelation: "client_formula_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_formulas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swap_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          organization_id: string | null
          swap_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          organization_id?: string | null
          swap_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          organization_id?: string | null
          swap_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_messages_swap_id_fkey"
            columns: ["swap_id"]
            isOneToOne: false
            referencedRelation: "shift_swaps"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swaps: {
        Row: {
          approved_at: string | null
          claimer_date: string | null
          claimer_end_time: string | null
          claimer_id: string | null
          claimer_start_time: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          location_id: string | null
          manager_id: string | null
          manager_notes: string | null
          organization_id: string | null
          original_date: string
          original_end_time: string
          original_start_time: string
          reason: string | null
          requester_id: string
          status: string | null
          swap_type: string
        }
        Insert: {
          approved_at?: string | null
          claimer_date?: string | null
          claimer_end_time?: string | null
          claimer_id?: string | null
          claimer_start_time?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string | null
          manager_id?: string | null
          manager_notes?: string | null
          organization_id?: string | null
          original_date: string
          original_end_time: string
          original_start_time: string
          reason?: string | null
          requester_id: string
          status?: string | null
          swap_type: string
        }
        Update: {
          approved_at?: string | null
          claimer_date?: string | null
          claimer_end_time?: string | null
          claimer_id?: string | null
          claimer_start_time?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string | null
          manager_id?: string | null
          manager_notes?: string | null
          organization_id?: string | null
          original_date?: string
          original_end_time?: string
          original_start_time?: string
          reason?: string | null
          requester_id?: string
          status?: string | null
          swap_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swaps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_presets: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          config: Json
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          organization_id: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          organization_id?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_mix_assist_settings: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          is_enabled: boolean
          organization_id: string
          ratio_lock_enabled: boolean
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_id: string
          ratio_lock_enabled?: boolean
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          organization_id?: string
          ratio_lock_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_mix_assist_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          message_body: string
          name: string
          template_key: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          message_body: string
          name: string
          template_key: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          message_body?: string
          name?: string
          template_key?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      specialty_options: {
        Row: {
          category: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_backroom_performance: {
        Row: {
          avg_usage_variance: number | null
          id: string
          last_calculated_at: string | null
          location_id: string | null
          manual_override_rate: number | null
          mix_session_count: number | null
          organization_id: string
          period_end: string
          period_start: string
          reweigh_compliance_rate: number | null
          staff_id: string
          total_dispensed_weight: number | null
          total_product_cost: number | null
          waste_rate: number | null
        }
        Insert: {
          avg_usage_variance?: number | null
          id?: string
          last_calculated_at?: string | null
          location_id?: string | null
          manual_override_rate?: number | null
          mix_session_count?: number | null
          organization_id: string
          period_end: string
          period_start: string
          reweigh_compliance_rate?: number | null
          staff_id: string
          total_dispensed_weight?: number | null
          total_product_cost?: number | null
          waste_rate?: number | null
        }
        Update: {
          avg_usage_variance?: number | null
          id?: string
          last_calculated_at?: string | null
          location_id?: string | null
          manual_override_rate?: number | null
          mix_session_count?: number | null
          organization_id?: string
          period_end?: string
          period_start?: string
          reweigh_compliance_rate?: number | null
          staff_id?: string
          total_dispensed_weight?: number | null
          total_product_cost?: number | null
          waste_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_backroom_performance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          expiration_date: string | null
          file_url: string | null
          id: string
          issued_date: string | null
          license_number: string | null
          notes: string | null
          organization_id: string
          reminded_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type?: string
          expiration_date?: string | null
          file_url?: string | null
          id?: string
          issued_date?: string | null
          license_number?: string | null
          notes?: string | null
          organization_id: string
          reminded_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          expiration_date?: string | null
          file_url?: string | null
          id?: string
          issued_date?: string | null
          license_number?: string | null
          notes?: string | null
          organization_id?: string
          reminded_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_pinned_products: {
        Row: {
          created_at: string
          display_order: number
          id: string
          organization_id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          organization_id: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          organization_id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_pinned_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_pinned_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_pinned_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_service_qualifications: {
        Row: {
          created_at: string | null
          custom_duration_minutes: number | null
          custom_price: number | null
          external_id: string | null
          id: string
          import_source: string | null
          imported_at: string | null
          is_active: boolean | null
          location_id: string | null
          service_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_duration_minutes?: number | null
          custom_price?: number | null
          external_id?: string | null
          id?: string
          import_source?: string | null
          imported_at?: string | null
          is_active?: boolean | null
          location_id?: string | null
          service_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_duration_minutes?: number | null
          custom_price?: number | null
          external_id?: string | null
          id?: string
          import_source?: string | null
          imported_at?: string | null
          is_active?: boolean | null
          location_id?: string | null
          service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_service_qualifications_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_service_qualifications_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_service_qualifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          is_recurring: boolean
          location_id: string | null
          notes: string | null
          organization_id: string
          recurrence_pattern: string | null
          role_context: Database["public"]["Enums"]["shift_role_context"]
          shift_date: string
          start_time: string
          status: Database["public"]["Enums"]["shift_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          is_recurring?: boolean
          location_id?: string | null
          notes?: string | null
          organization_id: string
          recurrence_pattern?: string | null
          role_context?: Database["public"]["Enums"]["shift_role_context"]
          shift_date: string
          start_time: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          is_recurring?: boolean
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          recurrence_pattern?: string | null
          role_context?: Database["public"]["Enums"]["shift_role_context"]
          shift_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_strikes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          incident_date: string
          is_resolved: boolean
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          strike_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          incident_date?: string
          is_resolved?: boolean
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          strike_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          incident_date?: string
          is_resolved?: boolean
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          strike_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staffing_history: {
        Row: {
          assistant_count: number
          assistant_ratio: number | null
          created_at: string | null
          id: string
          location_id: string
          organization_id: string | null
          record_date: string
          stylist_capacity: number | null
          stylist_count: number
        }
        Insert: {
          assistant_count?: number
          assistant_ratio?: number | null
          created_at?: string | null
          id?: string
          location_id: string
          organization_id?: string | null
          record_date?: string
          stylist_capacity?: number | null
          stylist_count?: number
        }
        Update: {
          assistant_count?: number
          assistant_ratio?: number | null
          created_at?: string | null
          id?: string
          location_id?: string
          organization_id?: string | null
          record_date?: string
          stylist_capacity?: number | null
          stylist_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "staffing_history_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staffing_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      station_assignments: {
        Row: {
          assigned_by: string | null
          assigned_date: string
          booth_renter_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          station_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_date?: string
          booth_renter_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          station_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_date?: string
          booth_renter_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_assignments_booth_renter_id_fkey"
            columns: ["booth_renter_id"]
            isOneToOne: false
            referencedRelation: "booth_renter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "station_assignments_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "rental_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          count_session_id: string | null
          counted_at: string
          counted_by: string | null
          counted_quantity: number
          created_at: string
          expected_quantity: number
          id: string
          location_id: string | null
          notes: string | null
          organization_id: string
          product_id: string
          variance: number | null
        }
        Insert: {
          count_session_id?: string | null
          counted_at?: string
          counted_by?: string | null
          counted_quantity: number
          created_at?: string
          expected_quantity: number
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id: string
          product_id: string
          variance?: number | null
        }
        Update: {
          count_session_id?: string | null
          counted_at?: string
          counted_by?: string | null
          counted_quantity?: number
          created_at?: string
          expected_quantity?: number
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          product_id?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_count_session_id_fkey"
            columns: ["count_session_id"]
            isOneToOne: false
            referencedRelation: "count_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_counts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          location_id: string | null
          notes: string | null
          organization_id: string
          product_id: string
          quantity_after: number
          quantity_change: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id: string
          product_id: string
          quantity_after: number
          quantity_change: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          product_id?: string
          quantity_after?: number
          quantity_change?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_lines: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          transfer_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          transfer_id: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          transfer_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_lines_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          from_location_id: string
          id: string
          notes: string | null
          organization_id: string
          product_id: string
          quantity: number
          status: string
          to_location_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          from_location_id: string
          id?: string
          notes?: string | null
          organization_id: string
          product_id: string
          quantity: number
          status?: string
          to_location_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          from_location_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          product_id?: string
          quantity?: number
          status?: string
          to_location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_career_milestones: {
        Row: {
          achieved_at: string
          created_at: string
          from_stage: string | null
          id: string
          milestone_type: string
          organization_id: string
          ors_at_milestone: number | null
          spi_at_milestone: number
          to_stage: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          milestone_type: string
          organization_id: string
          ors_at_milestone?: number | null
          spi_at_milestone?: number
          to_stage: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          created_at?: string
          from_stage?: string | null
          id?: string
          milestone_type?: string
          organization_id?: string
          ors_at_milestone?: number | null
          spi_at_milestone?: number
          to_stage?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_career_milestones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_commission_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          organization_id: string
          reason: string
          retail_commission_rate: number | null
          service_commission_rate: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          reason: string
          retail_commission_rate?: number | null
          service_commission_rate?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          reason?: string
          retail_commission_rate?: number | null
          service_commission_rate?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_commission_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_levels: {
        Row: {
          client_label: string
          created_at: string
          description: string | null
          display_order: number
          hourly_wage: number | null
          hourly_wage_enabled: boolean
          id: string
          is_active: boolean
          is_configured: boolean
          label: string
          organization_id: string
          retail_commission_rate: number | null
          service_commission_rate: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          client_label: string
          created_at?: string
          description?: string | null
          display_order?: number
          hourly_wage?: number | null
          hourly_wage_enabled?: boolean
          id?: string
          is_active?: boolean
          is_configured?: boolean
          label: string
          organization_id: string
          retail_commission_rate?: number | null
          service_commission_rate?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          client_label?: string
          created_at?: string
          description?: string | null
          display_order?: number
          hourly_wage?: number | null
          hourly_wage_enabled?: boolean
          id?: string
          is_active?: boolean
          is_configured?: boolean
          label?: string
          organization_id?: string
          retail_commission_rate?: number | null
          service_commission_rate?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_ors_scores: {
        Row: {
          career_stage: string
          consistency_score: number
          created_at: string
          demand_stability: number
          financing_eligible: boolean
          id: string
          leadership_score: number
          organization_id: string
          ors_score: number
          ownership_eligible: boolean
          scored_at: string
          spi_average: number
          updated_at: string
          user_id: string
        }
        Insert: {
          career_stage?: string
          consistency_score?: number
          created_at?: string
          demand_stability?: number
          financing_eligible?: boolean
          id?: string
          leadership_score?: number
          organization_id: string
          ors_score?: number
          ownership_eligible?: boolean
          scored_at?: string
          spi_average?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          career_stage?: string
          consistency_score?: number
          created_at?: string
          demand_stability?: number
          financing_eligible?: boolean
          id?: string
          leadership_score?: number
          organization_id?: string
          ors_score?: number
          ownership_eligible?: boolean
          scored_at?: string
          spi_average?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_ors_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stylist_personal_goals: {
        Row: {
          created_at: string
          id: string
          monthly_target: number
          notes: string | null
          retail_monthly_target: number
          retail_weekly_target: number
          updated_at: string
          user_id: string
          weekly_target: number
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_target?: number
          notes?: string | null
          retail_monthly_target?: number
          retail_weekly_target?: number
          updated_at?: string
          user_id: string
          weekly_target?: number
        }
        Update: {
          created_at?: string
          id?: string
          monthly_target?: number
          notes?: string | null
          retail_monthly_target?: number
          retail_weekly_target?: number
          updated_at?: string
          user_id?: string
          weekly_target?: number
        }
        Relationships: []
      }
      stylist_program_enrollment: {
        Row: {
          completed_at: string | null
          created_at: string
          current_day: number
          forgive_credits_remaining: number
          forgive_credits_used: number
          id: string
          last_completion_date: string | null
          last_credit_used_at: string | null
          restart_count: number
          start_date: string
          status: Database["public"]["Enums"]["program_status"]
          streak_count: number
          updated_at: string
          user_id: string
          weekly_wins_due_day: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_day?: number
          forgive_credits_remaining?: number
          forgive_credits_used?: number
          id?: string
          last_completion_date?: string | null
          last_credit_used_at?: string | null
          restart_count?: number
          start_date?: string
          status?: Database["public"]["Enums"]["program_status"]
          streak_count?: number
          updated_at?: string
          user_id: string
          weekly_wins_due_day?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_day?: number
          forgive_credits_remaining?: number
          forgive_credits_used?: number
          id?: string
          last_completion_date?: string | null
          last_credit_used_at?: string | null
          restart_count?: number
          start_date?: string
          status?: Database["public"]["Enums"]["program_status"]
          streak_count?: number
          updated_at?: string
          user_id?: string
          weekly_wins_due_day?: number | null
        }
        Relationships: []
      }
      stylist_spi_scores: {
        Row: {
          created_at: string
          execution_score: number
          growth_score: number
          id: string
          location_id: string | null
          organization_id: string
          period_end: string
          period_start: string
          rebooking_score: number
          retention_score: number
          revenue_score: number
          review_score: number
          scored_at: string
          spi_score: number
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          execution_score?: number
          growth_score?: number
          id?: string
          location_id?: string | null
          organization_id: string
          period_end: string
          period_start: string
          rebooking_score?: number
          retention_score?: number
          revenue_score?: number
          review_score?: number
          scored_at?: string
          spi_score?: number
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          execution_score?: number
          growth_score?: number
          id?: string
          location_id?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          rebooking_score?: number
          retention_score?: number
          revenue_score?: number
          review_score?: number
          scored_at?: string
          spi_score?: number
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stylist_spi_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_invoices: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          description: string | null
          id: string
          invoice_pdf: string | null
          invoice_url: string | null
          line_items: Json | null
          metadata: Json | null
          organization_id: string
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          retry_count: number | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          invoice_pdf?: string | null
          invoice_url?: string | null
          line_items?: Json | null
          metadata?: Json | null
          organization_id: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          retry_count?: number | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          invoice_pdf?: string | null
          invoice_url?: string | null
          line_items?: Json | null
          metadata?: Json | null
          organization_id?: string
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          retry_count?: number | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_locations: number | null
          max_users: number | null
          name: string
          price_annually: number
          price_monthly: number
          stripe_price_id_annual: string | null
          stripe_price_id_monthly: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_locations?: number | null
          max_users?: number | null
          name: string
          price_annually?: number
          price_monthly?: number
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_locations?: number | null
          max_users?: number | null
          name?: string
          price_annually?: number
          price_monthly?: number
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplier_preferences: {
        Row: {
          auto_replenish_enabled: boolean
          created_at: string
          fulfillment_api_url: string | null
          id: string
          is_preferred: boolean
          notes: string | null
          organization_id: string
          priority_rank: number
          supplier_name: string
          updated_at: string
        }
        Insert: {
          auto_replenish_enabled?: boolean
          created_at?: string
          fulfillment_api_url?: string | null
          id?: string
          is_preferred?: boolean
          notes?: string | null
          organization_id: string
          priority_rank?: number
          supplier_name: string
          updated_at?: string
        }
        Update: {
          auto_replenish_enabled?: boolean
          created_at?: string
          fulfillment_api_url?: string | null
          id?: string
          is_preferred?: boolean
          notes?: string | null
          organization_id?: string
          priority_rank?: number
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_library_brands: {
        Row: {
          country_of_origin: string | null
          created_at: string
          created_by: string | null
          default_category: string | null
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          country_of_origin?: string | null
          created_at?: string
          created_by?: string | null
          default_category?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          country_of_origin?: string | null
          created_at?: string
          created_by?: string | null
          default_category?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      supply_library_products: {
        Row: {
          brand: string
          brand_id: string | null
          category: string
          color_type: Database["public"]["Enums"]["color_type"] | null
          created_at: string
          currency: string
          default_depletion: string
          default_markup_pct: number | null
          default_unit: string
          id: string
          is_active: boolean
          is_professional: boolean
          name: string
          price_source_id: string | null
          price_updated_at: string | null
          product_line: string | null
          recommended_retail: number | null
          size_options: string[] | null
          swatch_color: string | null
          updated_at: string
          wholesale_price: number | null
        }
        Insert: {
          brand: string
          brand_id?: string | null
          category?: string
          color_type?: Database["public"]["Enums"]["color_type"] | null
          created_at?: string
          currency?: string
          default_depletion?: string
          default_markup_pct?: number | null
          default_unit?: string
          id?: string
          is_active?: boolean
          is_professional?: boolean
          name: string
          price_source_id?: string | null
          price_updated_at?: string | null
          product_line?: string | null
          recommended_retail?: number | null
          size_options?: string[] | null
          swatch_color?: string | null
          updated_at?: string
          wholesale_price?: number | null
        }
        Update: {
          brand?: string
          brand_id?: string | null
          category?: string
          color_type?: Database["public"]["Enums"]["color_type"] | null
          created_at?: string
          currency?: string
          default_depletion?: string
          default_markup_pct?: number | null
          default_unit?: string
          id?: string
          is_active?: boolean
          is_professional?: boolean
          name?: string
          price_source_id?: string | null
          price_updated_at?: string | null
          product_line?: string | null
          recommended_retail?: number | null
          size_options?: string[] | null
          swatch_color?: string | null
          updated_at?: string
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_library_products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "supply_library_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_library_products_price_source_id_fkey"
            columns: ["price_source_id"]
            isOneToOne: false
            referencedRelation: "wholesale_price_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          first_response_at: string | null
          id: string
          organization_id: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          sla_deadline_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          tags: string[] | null
          ticket_number: number
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          first_response_at?: string | null
          id?: string
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_deadline_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[] | null
          ticket_number?: number
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          first_response_at?: string | null
          id?: string
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_deadline_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          tags?: string[] | null
          ticket_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_status: {
        Row: {
          error_message: string | null
          id: string
          last_checked_at: string | null
          metadata: Json | null
          response_time_ms: number | null
          service_name: string
          status: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          last_checked_at?: string | null
          metadata?: Json | null
          response_time_ms?: number | null
          service_name: string
          status: string
        }
        Update: {
          error_message?: string | null
          id?: string
          last_checked_at?: string | null
          metadata?: Json | null
          response_time_ms?: number | null
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      task_checklist_items: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          sort_order: number
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          decay_days: number | null
          description: string | null
          difficulty_score: number | null
          due_date: string | null
          enforcement_level: number
          estimated_revenue_impact_cents: number | null
          execution_time_minutes: number | null
          expires_at: string | null
          id: string
          is_completed: boolean | null
          missed_revenue_cents: number | null
          notes: string | null
          opportunity_id: string | null
          priority: string | null
          priority_score: number | null
          recurrence_parent_id: string | null
          recurrence_pattern: string | null
          revenue_type: string | null
          snoozed_until: string | null
          source: string
          status: string
          task_type: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          decay_days?: number | null
          description?: string | null
          difficulty_score?: number | null
          due_date?: string | null
          enforcement_level?: number
          estimated_revenue_impact_cents?: number | null
          execution_time_minutes?: number | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean | null
          missed_revenue_cents?: number | null
          notes?: string | null
          opportunity_id?: string | null
          priority?: string | null
          priority_score?: number | null
          recurrence_parent_id?: string | null
          recurrence_pattern?: string | null
          revenue_type?: string | null
          snoozed_until?: string | null
          source?: string
          status?: string
          task_type?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          decay_days?: number | null
          description?: string | null
          difficulty_score?: number | null
          due_date?: string | null
          enforcement_level?: number
          estimated_revenue_impact_cents?: number | null
          execution_time_minutes?: number | null
          expires_at?: string | null
          id?: string
          is_completed?: boolean | null
          missed_revenue_cents?: number | null
          notes?: string | null
          opportunity_id?: string | null
          priority?: string | null
          priority_score?: number | null
          recurrence_parent_id?: string | null
          recurrence_pattern?: string | null
          revenue_type?: string | null
          snoozed_until?: string | null
          source?: string
          status?: string
          task_type?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "capital_funding_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_calendar_events: {
        Row: {
          all_day: boolean | null
          attendees: Json | null
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          event_type: string
          id: string
          is_cancelled: boolean | null
          location_id: string | null
          metadata: Json | null
          organization_id: string
          recurring_pattern: Json | null
          start_date: string
          start_time: string | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          all_day?: boolean | null
          attendees?: Json | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type: string
          id?: string
          is_cancelled?: boolean | null
          location_id?: string | null
          metadata?: Json | null
          organization_id: string
          recurring_pattern?: Json | null
          start_date: string
          start_time?: string | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          all_day?: boolean | null
          attendees?: Json | null
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          event_type?: string
          id?: string
          is_cancelled?: boolean | null
          location_id?: string | null
          metadata?: Json | null
          organization_id?: string
          recurring_pattern?: Json | null
          start_date?: string
          start_time?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_challenges: {
        Row: {
          challenge_type: string
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string
          goal_value: number | null
          id: string
          metric_type: string
          organization_id: string | null
          prize_description: string | null
          rules: Json | null
          start_date: string
          status: string | null
          title: string
        }
        Insert: {
          challenge_type: string
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date: string
          goal_value?: number | null
          id?: string
          metric_type: string
          organization_id?: string | null
          prize_description?: string | null
          rules?: Json | null
          start_date: string
          status?: string | null
          title: string
        }
        Update: {
          challenge_type?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string
          goal_value?: number | null
          id?: string
          metric_type?: string
          organization_id?: string | null
          prize_description?: string | null
          rules?: Json | null
          start_date?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_challenges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chat_role_auto_join: {
        Row: {
          channel_id: string
          created_at: string | null
          id: string
          organization_id: string
          role: string
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          id?: string
          organization_id: string
          role: string
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_chat_role_auto_join_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_chat_role_auto_join_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chat_settings: {
        Row: {
          allow_dnd_override: boolean | null
          allow_file_attachments: boolean | null
          channel_archive_permission: string | null
          channel_create_private: string | null
          channel_create_public: string | null
          created_at: string | null
          default_channels: string[] | null
          default_notification_setting: string | null
          delete_others_messages: string | null
          display_name_format: string | null
          id: string
          max_file_size_mb: number | null
          mention_everyone_permission: string | null
          message_retention_days: number | null
          organization_id: string
          pin_message_permission: string | null
          show_job_title: boolean | null
          show_location_badge: boolean | null
          show_profile_photos: boolean | null
          show_role_badges: boolean | null
          smart_action_expiry_hours: number | null
          smart_action_require_approval: boolean | null
          smart_action_types: string[] | null
          smart_actions_enabled: boolean | null
          updated_at: string | null
          welcome_dms_enabled: boolean | null
        }
        Insert: {
          allow_dnd_override?: boolean | null
          allow_file_attachments?: boolean | null
          channel_archive_permission?: string | null
          channel_create_private?: string | null
          channel_create_public?: string | null
          created_at?: string | null
          default_channels?: string[] | null
          default_notification_setting?: string | null
          delete_others_messages?: string | null
          display_name_format?: string | null
          id?: string
          max_file_size_mb?: number | null
          mention_everyone_permission?: string | null
          message_retention_days?: number | null
          organization_id: string
          pin_message_permission?: string | null
          show_job_title?: boolean | null
          show_location_badge?: boolean | null
          show_profile_photos?: boolean | null
          show_role_badges?: boolean | null
          smart_action_expiry_hours?: number | null
          smart_action_require_approval?: boolean | null
          smart_action_types?: string[] | null
          smart_actions_enabled?: boolean | null
          updated_at?: string | null
          welcome_dms_enabled?: boolean | null
        }
        Update: {
          allow_dnd_override?: boolean | null
          allow_file_attachments?: boolean | null
          channel_archive_permission?: string | null
          channel_create_private?: string | null
          channel_create_public?: string | null
          created_at?: string | null
          default_channels?: string[] | null
          default_notification_setting?: string | null
          delete_others_messages?: string | null
          display_name_format?: string | null
          id?: string
          max_file_size_mb?: number | null
          mention_everyone_permission?: string | null
          message_retention_days?: number | null
          organization_id?: string
          pin_message_permission?: string | null
          show_job_title?: boolean | null
          show_location_badge?: boolean | null
          show_profile_photos?: boolean | null
          show_role_badges?: boolean | null
          smart_action_expiry_hours?: number | null
          smart_action_require_approval?: boolean | null
          smart_action_types?: string[] | null
          smart_actions_enabled?: boolean | null
          updated_at?: string | null
          welcome_dms_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "team_chat_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chat_welcome_rules: {
        Row: {
          created_at: string | null
          delay_minutes: number | null
          id: string
          is_active: boolean | null
          message_template: string
          organization_id: string
          sender_role: string
          sort_order: number | null
          target_locations: string[] | null
          target_roles: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_template: string
          organization_id: string
          sender_role?: string
          sort_order?: number | null
          target_locations?: string[] | null
          target_roles?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          organization_id?: string
          sender_role?: string
          sort_order?: number | null
          target_locations?: string[] | null
          target_roles?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_chat_welcome_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chat_welcome_sent: {
        Row: {
          channel_id: string
          id: string
          message_id: string | null
          organization_id: string
          recipient_user_id: string
          sender_user_id: string
          sent_at: string | null
        }
        Insert: {
          channel_id: string
          id?: string
          message_id?: string | null
          organization_id: string
          recipient_user_id: string
          sender_user_id: string
          sent_at?: string | null
        }
        Update: {
          channel_id?: string
          id?: string
          message_id?: string | null
          organization_id?: string
          recipient_user_id?: string
          sender_user_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_chat_welcome_sent_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_chat_welcome_sent_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_chat_welcome_sent_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      terminal_hardware_requests: {
        Row: {
          accessories: Json | null
          admin_notes: string | null
          created_at: string
          device_type: string
          estimated_total_cents: number | null
          id: string
          location_id: string | null
          notes: string | null
          organization_id: string
          quantity: number
          reason: string
          requested_by: string
          status: string
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          accessories?: Json | null
          admin_notes?: string | null
          created_at?: string
          device_type?: string
          estimated_total_cents?: number | null
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id: string
          quantity?: number
          reason?: string
          requested_by: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          accessories?: Json | null
          admin_notes?: string | null
          created_at?: string
          device_type?: string
          estimated_total_cents?: number | null
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          quantity?: number
          reason?: string
          requested_by?: string
          status?: string
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terminal_hardware_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author: string
          created_at: string
          created_by: string | null
          display_order: number | null
          id: string
          is_visible: boolean | null
          organization_id: string | null
          rating: number
          text: string
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          organization_id?: string | null
          rating?: number
          text: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          created_at?: string
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_visible?: boolean | null
          organization_id?: string | null
          rating?: number
          text?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_activations: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          id: string
          is_current: boolean | null
          migration_report: Json | null
          organization_id: string
          pre_switch_snapshot: Json | null
          theme_id: string
          theme_version: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          id?: string
          is_current?: boolean | null
          migration_report?: Json | null
          organization_id: string
          pre_switch_snapshot?: Json | null
          theme_id: string
          theme_version: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          id?: string
          is_current?: boolean | null
          migration_report?: Json | null
          organization_id?: string
          pre_switch_snapshot?: Json | null
          theme_id?: string
          theme_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "theme_activations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theme_activations_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "website_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_section_types: {
        Row: {
          allowed_field_types: string[] | null
          canonical_fields_schema: Json
          created_at: string | null
          id: string
          is_builtin: boolean | null
          is_portable: boolean | null
          max_instances_per_page: number | null
          performance_weight: number | null
          semantic_category: string
          transformation_rules: Json | null
        }
        Insert: {
          allowed_field_types?: string[] | null
          canonical_fields_schema?: Json
          created_at?: string | null
          id: string
          is_builtin?: boolean | null
          is_portable?: boolean | null
          max_instances_per_page?: number | null
          performance_weight?: number | null
          semantic_category: string
          transformation_rules?: Json | null
        }
        Update: {
          allowed_field_types?: string[] | null
          canonical_fields_schema?: Json
          created_at?: string | null
          id?: string
          is_builtin?: boolean | null
          is_portable?: boolean | null
          max_instances_per_page?: number | null
          performance_weight?: number | null
          semantic_category?: string
          transformation_rules?: Json | null
        }
        Relationships: []
      }
      theme_slot_mappings: {
        Row: {
          created_at: string | null
          expected_field_type: string
          fallback_source: string | null
          id: string
          performance_priority: number | null
          primary_source: string
          required: boolean | null
          semantic_type: string
          slot_id: string
          theme_id: string
          transformation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          expected_field_type: string
          fallback_source?: string | null
          id?: string
          performance_priority?: number | null
          primary_source: string
          required?: boolean | null
          semantic_type: string
          slot_id: string
          theme_id: string
          transformation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          expected_field_type?: string
          fallback_source?: string | null
          id?: string
          performance_priority?: number | null
          primary_source?: string
          required?: boolean | null
          semantic_type?: string
          slot_id?: string
          theme_id?: string
          transformation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "theme_slot_mappings_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "website_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_minutes: number | null
          clock_in: string
          clock_out: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          location_id: string | null
          notes: string | null
          organization_id: string
          payroll_synced: boolean | null
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id: string
          payroll_synced?: boolean | null
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          payroll_synced?: boolean | null
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          blocks_online_booking: boolean
          calendar_event_id: string | null
          created_at: string | null
          end_date: string
          end_time: string | null
          id: string
          is_full_day: boolean
          notes: string | null
          organization_id: string
          reason: string | null
          request_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          start_time: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          blocks_online_booking?: boolean
          calendar_event_id?: string | null
          created_at?: string | null
          end_date: string
          end_time?: string | null
          id?: string
          is_full_day?: boolean
          notes?: string | null
          organization_id: string
          reason?: string | null
          request_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          start_time?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          blocks_online_booking?: boolean
          calendar_event_id?: string | null
          created_at?: string | null
          end_date?: string
          end_time?: string | null
          id?: string
          is_full_day?: boolean
          notes?: string | null
          organization_id?: string
          reason?: string | null
          request_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          start_time?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_calendar_event_id_fkey"
            columns: ["calendar_event_id"]
            isOneToOne: false
            referencedRelation: "team_calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_distributions: {
        Row: {
          card_tips: number
          cash_tips: number
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          distribution_date: string
          id: string
          location_id: string | null
          method: string
          notes: string | null
          organization_id: string
          status: string
          stylist_user_id: string
          total_tips: number
          updated_at: string
        }
        Insert: {
          card_tips?: number
          cash_tips?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          distribution_date: string
          id?: string
          location_id?: string | null
          method?: string
          notes?: string | null
          organization_id: string
          status?: string
          stylist_user_id: string
          total_tips?: number
          updated_at?: string
        }
        Update: {
          card_tips?: number
          cash_tips?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          distribution_date?: string
          id?: string
          location_id?: string | null
          method?: string
          notes?: string | null
          organization_id?: string
          status?: string
          stylist_user_id?: string
          total_tips?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_distributions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tip_distributions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          assigned_by: string
          created_at: string | null
          due_date: string | null
          id: string
          is_required: boolean | null
          notes: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean | null
          notes?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string | null
          due_date?: string | null
          id?: string
          is_required?: boolean | null
          notes?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
          video_id: string
          watch_progress: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
          video_id: string
          watch_progress?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
          video_id?: string
          watch_progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string | null
          score: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string | null
          score?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_questions: {
        Row: {
          correct_answer: string
          id: string
          options: Json | null
          order_index: number | null
          question_text: string
          question_type: string | null
          quiz_id: string | null
        }
        Insert: {
          correct_answer: string
          id?: string
          options?: Json | null
          order_index?: number | null
          question_text: string
          question_type?: string | null
          quiz_id?: string | null
        }
        Update: {
          correct_answer?: string
          id?: string
          options?: Json | null
          order_index?: number | null
          question_text?: string
          question_type?: string | null
          quiz_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quizzes: {
        Row: {
          created_at: string | null
          id: string
          is_required: boolean | null
          passing_score: number | null
          title: string
          video_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          passing_score?: number | null
          title: string
          video_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_required?: boolean | null
          passing_score?: number | null
          title?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_quizzes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      training_videos: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          order_index: number | null
          required_for_roles: Database["public"]["Enums"]["app_role"][] | null
          storage_path: string | null
          thumbnail_url: string | null
          title: string
          video_url: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          required_for_roles?: Database["public"]["Enums"]["app_role"][] | null
          storage_path?: string | null
          thumbnail_url?: string | null
          title: string
          video_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          required_for_roles?: Database["public"]["Enums"]["app_role"][] | null
          storage_path?: string | null
          thumbnail_url?: string | null
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          appointment_id: string | null
          branch_name: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          discount: number | null
          external_id: string | null
          id: string
          import_source: string | null
          imported_at: string | null
          item_category: string | null
          item_name: string
          item_type: string
          location_id: string | null
          organization_id: string
          payment_method: string | null
          promotion_id: string | null
          quantity: number | null
          sale_classification: string | null
          staff_name: string | null
          staff_user_id: string | null
          tax_amount: number | null
          tip_amount: number | null
          total_amount: number
          transaction_date: string
          transaction_id: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          branch_name?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          discount?: number | null
          external_id?: string | null
          id?: string
          import_source?: string | null
          imported_at?: string | null
          item_category?: string | null
          item_name: string
          item_type: string
          location_id?: string | null
          organization_id: string
          payment_method?: string | null
          promotion_id?: string | null
          quantity?: number | null
          sale_classification?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount: number
          transaction_date: string
          transaction_id: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          branch_name?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          discount?: number | null
          external_id?: string | null
          id?: string
          import_source?: string | null
          imported_at?: string | null
          item_category?: string | null
          item_name?: string
          item_type?: string
          location_id?: string | null
          organization_id?: string
          payment_method?: string | null
          promotion_id?: string | null
          quantity?: number | null
          sale_classification?: string | null
          staff_name?: string | null
          staff_user_id?: string | null
          tax_amount?: number | null
          tip_amount?: number | null
          total_amount?: number
          transaction_date?: string
          transaction_id?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transfer_template_lines: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          template_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          template_id: string
          unit?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          template_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_template_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_template_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_template_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "transfer_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer_templates: {
        Row: {
          created_at: string
          created_by: string | null
          from_location_id: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          to_location_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_location_id?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          to_location_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_location_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          to_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transfer_templates_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_templates_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_metrics: {
        Row: {
          active_users: number | null
          api_calls: number | null
          created_at: string | null
          id: string
          organization_id: string
          period_end: string
          period_start: string
          storage_used_mb: number | null
          total_appointments: number | null
          total_clients: number | null
          total_locations: number | null
          total_users: number | null
        }
        Insert: {
          active_users?: number | null
          api_calls?: number | null
          created_at?: string | null
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          storage_used_mb?: number | null
          total_appointments?: number | null
          total_clients?: number | null
          total_locations?: number | null
          total_users?: number | null
        }
        Update: {
          active_users?: number | null
          api_calls?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          storage_used_mb?: number | null
          total_appointments?: number | null
          total_clients?: number | null
          total_locations?: number | null
          total_users?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          metadata: Json | null
          organization_id: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mentions: {
        Row: {
          channel_id: string | null
          created_at: string | null
          id: string
          mentioned_by: string | null
          notified_at: string | null
          organization_id: string | null
          read_at: string | null
          source_context: string | null
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          mentioned_by?: string | null
          notified_at?: string | null
          organization_id?: string | null
          read_at?: string | null
          source_context?: string | null
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          mentioned_by?: string | null
          notified_at?: string | null
          organization_id?: string | null
          read_at?: string | null
          source_context?: string | null
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mentions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          chat_layout: Json | null
          created_at: string
          custom_landing_page: string | null
          custom_theme: Json | null
          custom_typography: Json | null
          dashboard_layout: Json | null
          dual_role_destination: string | null
          id: string
          settings_layout: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_layout?: Json | null
          created_at?: string
          custom_landing_page?: string | null
          custom_theme?: Json | null
          custom_typography?: Json | null
          dashboard_layout?: Json | null
          dual_role_destination?: string | null
          id?: string
          settings_layout?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_layout?: Json | null
          created_at?: string
          custom_landing_page?: string | null
          custom_theme?: Json | null
          custom_typography?: Json | null
          dashboard_layout?: Json | null
          dual_role_destination?: string | null
          id?: string
          settings_layout?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_program_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          enrollment_id: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          enrollment_id: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          enrollment_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_program_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "program_achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_program_achievements_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "stylist_program_enrollment"
            referencedColumns: ["id"]
          },
        ]
      }
      user_responsibilities: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          responsibility_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          responsibility_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          responsibility_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_responsibilities_responsibility_id_fkey"
            columns: ["responsibility_id"]
            isOneToOne: false
            referencedRelation: "responsibilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_products: {
        Row: {
          created_at: string
          id: string
          is_preferred: boolean | null
          lead_time_days: number | null
          moq: number
          notes: string | null
          organization_id: string
          pack_size: number | null
          product_id: string
          unit_cost: number | null
          updated_at: string
          vendor_id: string
          vendor_sku: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_preferred?: boolean | null
          lead_time_days?: number | null
          moq?: number
          notes?: string | null
          organization_id: string
          pack_size?: number | null
          product_id: string
          unit_cost?: number | null
          updated_at?: string
          vendor_id: string
          vendor_sku?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_preferred?: boolean | null
          lead_time_days?: number | null
          moq?: number
          notes?: string | null
          organization_id?: string
          pack_size?: number | null
          product_id?: string
          unit_cost?: number | null
          updated_at?: string
          vendor_id?: string
          vendor_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          account_number: string | null
          created_at: string
          created_by: string | null
          default_lead_time_days: number | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          created_by?: string | null
          default_lead_time_days?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_number?: string | null
          created_at?: string
          created_by?: string | null
          default_lead_time_days?: number | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      voided_transactions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          transaction_id: string
          void_reason: string | null
          voided_at: string
          voided_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          transaction_id: string
          void_reason?: string | null
          voided_at?: string
          voided_by: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          transaction_id?: string
          void_reason?: string | null
          voided_at?: string
          voided_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "voided_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          expires_at: string | null
          free_service_id: string | null
          id: string
          is_active: boolean | null
          is_redeemed: boolean | null
          issued_at: string | null
          issued_by: string | null
          issued_to_client_id: string | null
          issued_to_email: string | null
          issued_to_name: string | null
          notes: string | null
          organization_id: string
          promotion_id: string | null
          redeemed_at: string | null
          redeemed_by_client_id: string | null
          redeemed_transaction_id: string | null
          valid_from: string | null
          value: number | null
          value_type: string | null
          voucher_type: string
        }
        Insert: {
          code: string
          expires_at?: string | null
          free_service_id?: string | null
          id?: string
          is_active?: boolean | null
          is_redeemed?: boolean | null
          issued_at?: string | null
          issued_by?: string | null
          issued_to_client_id?: string | null
          issued_to_email?: string | null
          issued_to_name?: string | null
          notes?: string | null
          organization_id: string
          promotion_id?: string | null
          redeemed_at?: string | null
          redeemed_by_client_id?: string | null
          redeemed_transaction_id?: string | null
          valid_from?: string | null
          value?: number | null
          value_type?: string | null
          voucher_type: string
        }
        Update: {
          code?: string
          expires_at?: string | null
          free_service_id?: string | null
          id?: string
          is_active?: boolean | null
          is_redeemed?: boolean | null
          issued_at?: string | null
          issued_by?: string | null
          issued_to_client_id?: string | null
          issued_to_email?: string | null
          issued_to_name?: string | null
          notes?: string | null
          organization_id?: string
          promotion_id?: string | null
          redeemed_at?: string | null
          redeemed_by_client_id?: string | null
          redeemed_transaction_id?: string | null
          valid_from?: string | null
          value?: number | null
          value_type?: string | null
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_free_service_id_fkey"
            columns: ["free_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_issued_to_client_id_fkey"
            columns: ["issued_to_client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vouchers_redeemed_by_client_id_fkey"
            columns: ["redeemed_by_client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          offered_at: string | null
          organization_id: string
          preferred_date_end: string | null
          preferred_date_start: string
          preferred_stylist_id: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          priority: number
          resolved_at: string | null
          service_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          offered_at?: string | null
          organization_id: string
          preferred_date_end?: string | null
          preferred_date_start: string
          preferred_stylist_id?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          priority?: number
          resolved_at?: string | null
          service_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          offered_at?: string | null
          organization_id?: string
          preferred_date_end?: string | null
          preferred_date_start?: string
          preferred_stylist_id?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          priority?: number
          resolved_at?: string | null
          service_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "phorest_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      walk_in_queue: {
        Row: {
          assigned_at: string | null
          assigned_stylist_id: string | null
          checked_in_at: string
          client_email: string | null
          client_name: string
          client_phone: string | null
          completed_at: string | null
          created_at: string | null
          estimated_wait_minutes: number | null
          id: string
          location_id: string | null
          organization_id: string
          phorest_client_id: string | null
          queue_position: number | null
          service_category: string | null
          service_notes: string | null
          service_started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_stylist_id?: string | null
          checked_in_at?: string
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          location_id?: string | null
          organization_id: string
          phorest_client_id?: string | null
          queue_position?: number | null
          service_category?: string | null
          service_notes?: string | null
          service_started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_stylist_id?: string | null
          checked_in_at?: string
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          completed_at?: string | null
          created_at?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          location_id?: string | null
          organization_id?: string
          phorest_client_id?: string | null
          queue_position?: number | null
          service_category?: string | null
          service_notes?: string | null
          service_started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "walk_in_queue_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walk_in_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_events: {
        Row: {
          bowl_id: string | null
          created_at: string
          id: string
          mix_session_id: string
          notes: string | null
          product_id: string | null
          quantity: number
          recorded_by_staff_id: string | null
          unit: string
          waste_category: Database["public"]["Enums"]["waste_category"]
        }
        Insert: {
          bowl_id?: string | null
          created_at?: string
          id?: string
          mix_session_id: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          recorded_by_staff_id?: string | null
          unit?: string
          waste_category: Database["public"]["Enums"]["waste_category"]
        }
        Update: {
          bowl_id?: string | null
          created_at?: string
          id?: string
          mix_session_id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          recorded_by_staff_id?: string | null
          unit?: string
          waste_category?: Database["public"]["Enums"]["waste_category"]
        }
        Relationships: [
          {
            foreignKeyName: "waste_events_bowl_id_fkey"
            columns: ["bowl_id"]
            isOneToOne: false
            referencedRelation: "mix_bowls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_events_mix_session_id_fkey"
            columns: ["mix_session_id"]
            isOneToOne: false
            referencedRelation: "mix_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
        ]
      }
      website_analytics_cache: {
        Row: {
          avg_session_duration: number | null
          bounce_rate: number | null
          created_at: string
          date: string
          fetched_at: string
          id: string
          pageviews: number
          visitors: number
        }
        Insert: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string
          date: string
          fetched_at?: string
          id?: string
          pageviews?: number
          visitors?: number
        }
        Update: {
          avg_session_duration?: number | null
          bounce_rate?: number | null
          created_at?: string
          date?: string
          fetched_at?: string
          id?: string
          pageviews?: number
          visitors?: number
        }
        Relationships: []
      }
      website_menu_items: {
        Row: {
          created_at: string
          cta_style: string | null
          icon: string | null
          id: string
          is_published: boolean
          item_type: string
          label: string
          menu_id: string
          open_in_new_tab: boolean
          organization_id: string
          parent_id: string | null
          sort_order: number
          target_anchor: string | null
          target_page_id: string | null
          target_url: string | null
          tracking_key: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          cta_style?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          item_type?: string
          label: string
          menu_id: string
          open_in_new_tab?: boolean
          organization_id: string
          parent_id?: string | null
          sort_order?: number
          target_anchor?: string | null
          target_page_id?: string | null
          target_url?: string | null
          tracking_key?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          cta_style?: string | null
          icon?: string | null
          id?: string
          is_published?: boolean
          item_type?: string
          label?: string
          menu_id?: string
          open_in_new_tab?: boolean
          organization_id?: string
          parent_id?: string | null
          sort_order?: number
          target_anchor?: string | null
          target_page_id?: string | null
          target_url?: string | null
          tracking_key?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "website_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_menu_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "website_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      website_menu_versions: {
        Row: {
          change_summary: string | null
          id: string
          menu_id: string
          organization_id: string
          published_at: string
          published_by: string | null
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          id?: string
          menu_id: string
          organization_id: string
          published_at?: string
          published_by?: string | null
          snapshot?: Json
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          id?: string
          menu_id?: string
          organization_id?: string
          published_at?: string
          published_by?: string | null
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "website_menu_versions_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "website_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_menu_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      website_menus: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          name: string
          organization_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_menus_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      website_page_versions: {
        Row: {
          change_summary: string | null
          id: string
          organization_id: string
          page_id: string
          saved_at: string
          saved_by: string | null
          snapshot: Json
          status: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          id?: string
          organization_id: string
          page_id: string
          saved_at?: string
          saved_by?: string | null
          snapshot?: Json
          status?: string
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          id?: string
          organization_id?: string
          page_id?: string
          saved_at?: string
          saved_by?: string | null
          snapshot?: Json
          status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "website_page_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      website_themes: {
        Row: {
          blueprint: Json
          category: string
          color_scheme: string
          compatibility_rules: Json | null
          created_at: string
          default_sections: Json
          description: string | null
          id: string
          is_available: boolean
          is_builtin: boolean
          layout_config: Json
          name: string
          organization_id: string | null
          status: string
          supported_features: Json | null
          thumbnail_url: string | null
          typography_preset: Json
          updated_at: string | null
          version: string
        }
        Insert: {
          blueprint?: Json
          category?: string
          color_scheme?: string
          compatibility_rules?: Json | null
          created_at?: string
          default_sections?: Json
          description?: string | null
          id: string
          is_available?: boolean
          is_builtin?: boolean
          layout_config?: Json
          name: string
          organization_id?: string | null
          status?: string
          supported_features?: Json | null
          thumbnail_url?: string | null
          typography_preset?: Json
          updated_at?: string | null
          version?: string
        }
        Update: {
          blueprint?: Json
          category?: string
          color_scheme?: string
          compatibility_rules?: Json | null
          created_at?: string
          default_sections?: Json
          description?: string | null
          id?: string
          is_available?: boolean
          is_builtin?: boolean
          layout_config?: Json
          name?: string
          organization_id?: string | null
          status?: string
          supported_features?: Json | null
          thumbnail_url?: string | null
          typography_preset?: Json
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_themes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_assignment_completions: {
        Row: {
          assignment_id: string
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          is_complete: boolean
          notes: string | null
          proof_url: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          is_complete?: boolean
          notes?: string | null
          proof_url?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          is_complete?: boolean
          notes?: string | null
          proof_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_assignment_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "weekly_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_assignment_completions_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "stylist_program_enrollment"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_assignments: {
        Row: {
          assignment_type: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_required: boolean
          proof_type: string
          title: string
          updated_at: string
          week_id: string
        }
        Insert: {
          assignment_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          proof_type?: string
          title: string
          updated_at?: string
          week_id: string
        }
        Update: {
          assignment_type?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_required?: boolean
          proof_type?: string
          title?: string
          updated_at?: string
          week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_assignments_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "program_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_digests: {
        Row: {
          created_at: string | null
          id: string
          kpis: Json
          recipients: string[] | null
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kpis: Json
          recipients?: string[] | null
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kpis?: Json
          recipients?: string[] | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      weekly_wins_reports: {
        Row: {
          adjustment_for_next_week: string | null
          bottleneck: string | null
          created_at: string
          due_day: number
          enrollment_id: string
          id: string
          is_submitted: boolean
          numbers_snapshot: Json | null
          submitted_at: string | null
          updated_at: string
          week_number: number
          what_worked: string | null
          wins_this_week: string | null
        }
        Insert: {
          adjustment_for_next_week?: string | null
          bottleneck?: string | null
          created_at?: string
          due_day: number
          enrollment_id: string
          id?: string
          is_submitted?: boolean
          numbers_snapshot?: Json | null
          submitted_at?: string | null
          updated_at?: string
          week_number: number
          what_worked?: string | null
          wins_this_week?: string | null
        }
        Update: {
          adjustment_for_next_week?: string | null
          bottleneck?: string | null
          created_at?: string
          due_day?: number
          enrollment_id?: string
          id?: string
          is_submitted?: boolean
          numbers_snapshot?: Json | null
          submitted_at?: string | null
          updated_at?: string
          week_number?: number
          what_worked?: string | null
          wins_this_week?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_wins_reports_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "stylist_program_enrollment"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_price_queue: {
        Row: {
          brand: string
          confidence_score: number | null
          created_at: string
          currency: string
          fetched_at: string
          id: string
          notes: string | null
          previous_price: number | null
          price_delta_pct: number | null
          product_id: string | null
          product_name: string
          recommended_retail: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          sku: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["price_queue_status"]
          wholesale_price: number
        }
        Insert: {
          brand: string
          confidence_score?: number | null
          created_at?: string
          currency?: string
          fetched_at?: string
          id?: string
          notes?: string | null
          previous_price?: number | null
          price_delta_pct?: number | null
          product_id?: string | null
          product_name: string
          recommended_retail?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sku?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["price_queue_status"]
          wholesale_price: number
        }
        Update: {
          brand?: string
          confidence_score?: number | null
          created_at?: string
          currency?: string
          fetched_at?: string
          id?: string
          notes?: string | null
          previous_price?: number | null
          price_delta_pct?: number | null
          product_id?: string | null
          product_name?: string
          recommended_retail?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sku?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["price_queue_status"]
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "wholesale_price_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_price_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wholesale_price_queue_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "wholesale_price_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      wholesale_price_sources: {
        Row: {
          api_endpoint: string | null
          api_key_secret_name: string | null
          auto_apply_threshold: number | null
          brand: string
          created_at: string
          id: string
          is_active: boolean
          last_polled_at: string | null
          max_auto_delta_pct: number | null
          scrape_frequency: string
          source_type: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          auto_apply_threshold?: number | null
          brand: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_polled_at?: string | null
          max_auto_delta_pct?: number | null
          scrape_frequency?: string
          source_type?: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_key_secret_name?: string | null
          auto_apply_threshold?: number | null
          brand?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_polled_at?: string | null
          max_auto_delta_pct?: number | null
          scrape_frequency?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      zura_guardrails: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          rule_description: string
          rule_type: Database["public"]["Enums"]["zura_guardrail_type"]
          severity: Database["public"]["Enums"]["zura_guardrail_severity"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          rule_description: string
          rule_type: Database["public"]["Enums"]["zura_guardrail_type"]
          severity?: Database["public"]["Enums"]["zura_guardrail_severity"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          rule_description?: string
          rule_type?: Database["public"]["Enums"]["zura_guardrail_type"]
          severity?: Database["public"]["Enums"]["zura_guardrail_severity"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zura_guardrails_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zura_knowledge_entries: {
        Row: {
          applies_to_functions: string[]
          category: Database["public"]["Enums"]["zura_knowledge_category"]
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          organization_id: string
          priority: number
          title: string
          updated_at: string
        }
        Insert: {
          applies_to_functions?: string[]
          category?: Database["public"]["Enums"]["zura_knowledge_category"]
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          priority?: number
          title: string
          updated_at?: string
        }
        Update: {
          applies_to_functions?: string[]
          category?: Database["public"]["Enums"]["zura_knowledge_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          priority?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zura_knowledge_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zura_personality_config: {
        Row: {
          brand_voice_notes: string | null
          created_at: string
          custom_greeting: string | null
          custom_sign_off: string | null
          display_name: string
          emoji_usage: boolean
          encouraged_phrases: string[] | null
          formality_level: number
          id: string
          organization_id: string
          prohibited_phrases: string[] | null
          response_length_preference: Database["public"]["Enums"]["zura_response_length"]
          tone: Database["public"]["Enums"]["zura_tone"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          brand_voice_notes?: string | null
          created_at?: string
          custom_greeting?: string | null
          custom_sign_off?: string | null
          display_name?: string
          emoji_usage?: boolean
          encouraged_phrases?: string[] | null
          formality_level?: number
          id?: string
          organization_id: string
          prohibited_phrases?: string[] | null
          response_length_preference?: Database["public"]["Enums"]["zura_response_length"]
          tone?: Database["public"]["Enums"]["zura_tone"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          brand_voice_notes?: string | null
          created_at?: string
          custom_greeting?: string | null
          custom_sign_off?: string | null
          display_name?: string
          emoji_usage?: boolean
          encouraged_phrases?: string[] | null
          formality_level?: number
          id?: string
          organization_id?: string
          prohibited_phrases?: string[] | null
          response_length_preference?: Database["public"]["Enums"]["zura_response_length"]
          tone?: Database["public"]["Enums"]["zura_tone"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zura_personality_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zura_role_rules: {
        Row: {
          created_at: string
          custom_instructions: string | null
          data_boundaries: string | null
          id: string
          is_active: boolean
          organization_id: string
          suggested_cta_style: string | null
          target_role: Database["public"]["Enums"]["app_role"]
          tone_override: Database["public"]["Enums"]["zura_tone"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_instructions?: string | null
          data_boundaries?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          suggested_cta_style?: string | null
          target_role: Database["public"]["Enums"]["app_role"]
          tone_override?: Database["public"]["Enums"]["zura_tone"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_instructions?: string | null
          data_boundaries?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          suggested_cta_style?: string | null
          target_role?: Database["public"]["Enums"]["app_role"]
          tone_override?: Database["public"]["Enums"]["zura_tone"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zura_role_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      products_public: {
        Row: {
          available_online: boolean | null
          brand: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          name: string | null
          organization_id: string | null
          product_type: string | null
          quantity_on_hand: number | null
          reorder_level: number | null
          retail_price: number | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          available_online?: boolean | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          product_type?: string | null
          quantity_on_hand?: number | null
          reorder_level?: number | null
          retail_price?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          available_online?: boolean | null
          brand?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          product_type?: string | null
          quantity_on_hand?: number | null
          reorder_level?: number | null
          retail_price?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_all_appointments: {
        Row: {
          appointment_date: string | null
          client_name: string | null
          client_phone: string | null
          deleted_at: string | null
          deleted_by: string | null
          end_time: string | null
          expected_price: number | null
          id: string | null
          is_demo: boolean | null
          is_new_client: boolean | null
          is_walk_in: boolean | null
          location_id: string | null
          phorest_client_id: string | null
          phorest_staff_id: string | null
          rebooked_at_checkout: boolean | null
          service_category: string | null
          service_name: string | null
          source: string | null
          staff_name: string | null
          start_time: string | null
          status: string | null
          stylist_user_id: string | null
          tip_amount: number | null
          total_price: number | null
        }
        Relationships: []
      }
      v_all_clients: {
        Row: {
          birthday: string | null
          canonical_client_id: string | null
          client_since: string | null
          created_at: string | null
          email: string | null
          email_normalized: string | null
          first_name: string | null
          id: string | null
          is_archived: boolean | null
          is_duplicate: boolean | null
          last_name: string | null
          last_visit: string | null
          lead_source: string | null
          location_id: string | null
          name: string | null
          phone: string | null
          phone_normalized: string | null
          phorest_client_id: string | null
          source: string | null
          total_spend: number | null
          visit_count: number | null
        }
        Relationships: []
      }
      v_all_transaction_items: {
        Row: {
          appointment_id: string | null
          branch_name: string | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          discount: number | null
          external_client_id: string | null
          id: string | null
          item_category: string | null
          item_name: string | null
          item_type: string | null
          location_id: string | null
          payment_method: string | null
          promotion_id: string | null
          quantity: number | null
          sale_classification: string | null
          source: string | null
          staff_name: string | null
          staff_user_id: string | null
          tax_amount: number | null
          tip_amount: number | null
          total_amount: number | null
          transaction_date: string | null
          transaction_id: string | null
          unit_price: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_price_recommendation: {
        Args: {
          _current_price: number
          _margin_pct_current: number
          _margin_pct_target: number
          _org_id: string
          _product_cost: number
          _recommended_price: number
          _service_id: string
          _user_id?: string
        }
        Returns: undefined
      }
      add_to_client_balance: {
        Args: {
          p_amount: number
          p_balance_type: string
          p_client_id: string
          p_issued_by?: string
          p_notes?: string
          p_organization_id: string
          p_reference_transaction_id?: string
          p_transaction_type: string
        }
        Returns: string
      }
      award_points: {
        Args: {
          _action_type: string
          _description?: string
          _reference_id?: string
          _user_id: string
        }
        Returns: number
      }
      calculate_preferred_stylists: {
        Args: never
        Returns: {
          appointment_count: number
          client_id: string
          preferred_user_id: string
        }[]
      }
      can_access_channel: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      can_approve_admin_role: { Args: { _user_id: string }; Returns: boolean }
      can_manage_kiosk_settings: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_view_all_clients: { Args: { _user_id: string }; Returns: boolean }
      can_view_leaderboard: { Args: { _user_id: string }; Returns: boolean }
      check_booking_conflicts: {
        Args: {
          p_date: string
          p_end_time: string
          p_exclude_appointment_id?: string
          p_location_id?: string
          p_staff_user_id: string
          p_start_time: string
        }
        Returns: {
          conflict_appointment_id: string
          conflict_client_name: string
          conflict_end_time: string
          conflict_start_time: string
          conflict_type: string
          has_conflict: boolean
        }[]
      }
      check_cost_alert_threshold: {
        Args: {
          _new_cost: number
          _old_cost: number
          _org_id: string
          _product_id: string
          _product_name: string
        }
        Returns: undefined
      }
      check_user_has_pin: { Args: { _user_id: string }; Returns: boolean }
      cleanup_old_seo_scores: { Args: never; Returns: undefined }
      create_booking: {
        Args: {
          p_appointment_date: string
          p_client_email?: string
          p_client_id?: string
          p_client_name?: string
          p_client_phone?: string
          p_end_time: string
          p_location_id: string
          p_notes?: string
          p_service_id?: string
          p_service_name?: string
          p_staff_user_id: string
          p_start_time: string
          p_total_price?: number
        }
        Returns: {
          appointment_id: string
          error_message: string
          success: boolean
        }[]
      }
      create_break_request:
        | {
            Args: {
              p_blocks_online_booking?: boolean
              p_end_date: string
              p_end_time?: string
              p_is_full_day?: boolean
              p_notes?: string
              p_organization_id: string
              p_reason?: string
              p_start_date: string
              p_start_time?: string
              p_user_id: string
            }
            Returns: {
              appointment_id: string
              request_id: string
              status: string
            }[]
          }
        | {
            Args: {
              p_block_mode?: string
              p_blocks_online_booking?: boolean
              p_end_date: string
              p_end_time?: string
              p_is_full_day?: boolean
              p_notes?: string
              p_organization_id: string
              p_reason?: string
              p_start_date: string
              p_start_time?: string
              p_user_id: string
            }
            Returns: {
              appointment_id: string
              request_id: string
              status: string
            }[]
          }
      current_user_is_coach: { Args: never; Returns: boolean }
      find_duplicate_clients: {
        Args: {
          p_email?: string
          p_exclude_client_id?: string
          p_organization_id: string
          p_phone?: string
        }
        Returns: {
          email: string
          first_name: string
          id: string
          last_name: string
          last_visit_date: string
          match_type: string
          mobile: string
          total_spend: number
        }[]
      }
      find_duplicate_phorest_clients: {
        Args: {
          p_email?: string
          p_exclude_phorest_client_id?: string
          p_phone?: string
        }
        Returns: {
          email: string
          id: string
          match_type: string
          name: string
          phone: string
          phorest_client_id: string
        }[]
      }
      generate_secure_token: { Args: never; Returns: string }
      get_booth_renter_profile_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_db_connection_stats: { Args: never; Returns: Json }
      get_kiosk_settings: {
        Args: { p_location_id?: string; p_organization_id: string }
        Returns: {
          accent_color: string | null
          background_color: string | null
          background_image_url: string | null
          background_overlay_opacity: number | null
          button_style: string | null
          check_in_prompt: string | null
          created_at: string | null
          display_orientation: string
          enable_feedback_prompt: boolean | null
          enable_glow_effects: boolean | null
          enable_self_booking: boolean | null
          enable_walk_ins: boolean | null
          exit_pin: string | null
          font_family: string | null
          id: string
          idle_slideshow_images: string[] | null
          idle_timeout_seconds: number | null
          idle_video_url: string | null
          location_badge_position: string | null
          location_badge_style: string | null
          location_id: string | null
          logo_color: string | null
          logo_size: string
          logo_url: string | null
          organization_id: string | null
          require_confirmation_tap: boolean | null
          require_form_signing: boolean | null
          self_booking_allow_future: boolean | null
          self_booking_show_stylists: boolean | null
          show_location_badge: boolean | null
          show_stylist_photo: boolean | null
          show_wait_time_estimate: boolean | null
          success_message: string | null
          text_color: string | null
          theme_mode: string | null
          updated_at: string | null
          welcome_subtitle: string | null
          welcome_title: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organization_kiosk_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_client_balance: {
        Args: { p_client_id: string; p_organization_id: string }
        Returns: string
      }
      get_public_locations: {
        Args: { p_organization_id?: string }
        Returns: {
          address: string
          booking_url: string
          city: string
          country: string
          display_order: number
          google_maps_url: string
          hours: string
          hours_json: Json
          id: string
          is_active: boolean
          major_crossroads: string
          name: string
          organization_id: string
          phone: string
          show_on_website: boolean
          state_province: string
        }[]
      }
      get_staff_availability: {
        Args: {
          p_date: string
          p_location_id?: string
          p_slot_duration_minutes?: number
          p_staff_user_id: string
        }
        Returns: {
          is_available: boolean
          slot_end: string
          slot_start: string
        }[]
      }
      get_storage_bucket_stats: { Args: never; Returns: Json }
      get_supply_library_brand_summaries: {
        Args: never
        Returns: {
          brand: string
          category: string
          cnt: number
          is_professional: boolean
          missing_price: number
          missing_swatch: number
        }[]
      }
      get_team_pin_statuses: {
        Args: { _organization_id: string }
        Returns: {
          has_pin: boolean
          user_id: string
        }[]
      }
      get_unread_counts: {
        Args: { p_channel_ids: string[]; p_user_id: string }
        Returns: {
          channel_id: string
          unread_count: number
        }[]
      }
      get_user_accessible_organizations: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      get_user_points_balance: { Args: { _user_id: string }; Returns: number }
      has_chat_permission: {
        Args: { _org_id: string; _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_platform_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_kb_article_views: {
        Args: { article_id: string }
        Returns: undefined
      }
      is_booth_renter: { Args: { _user_id: string }; Returns: boolean }
      is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_coach_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_multi_org_user: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_user: { Args: { _user_id: string }; Returns: boolean }
      kiosk_heartbeat_update: {
        Args: { p_device_token: string; p_is_active?: boolean }
        Returns: undefined
      }
      log_platform_action: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_type?: string
          _org_id: string
        }
        Returns: string
      }
      rebuild_inventory_projection: {
        Args: { p_location_id?: string; p_org_id: string; p_product_id: string }
        Returns: undefined
      }
      rebuild_mix_session_projection: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      reschedule_booking: {
        Args: {
          p_appointment_id: string
          p_new_date: string
          p_new_end_time: string
          p_new_staff_user_id?: string
          p_new_start_time: string
        }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      revert_price_recommendation: {
        Args: { _recommendation_id: string; _user_id?: string }
        Returns: undefined
      }
      set_employee_pin: {
        Args: { _pin: string; _target_user_id: string }
        Returns: undefined
      }
      update_booking_status: {
        Args: {
          p_appointment_id: string
          p_notes?: string
          p_status: string
          p_tip_amount?: number
        }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      update_preferred_stylists: { Args: never; Returns: number }
      user_belongs_to_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      validate_dock_pin: {
        Args: { _organization_id?: string; _pin: string }
        Returns: {
          display_name: string
          location_id: string
          location_ids: string[]
          organization_id: string
          photo_url: string
          user_id: string
        }[]
      }
      validate_user_pin: {
        Args: { _organization_id: string; _pin: string }
        Returns: {
          display_name: string
          is_primary_owner: boolean
          is_super_admin: boolean
          photo_url: string
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "stylist"
        | "receptionist"
        | "assistant"
        | "stylist_assistant"
        | "admin_assistant"
        | "operations_assistant"
        | "super_admin"
        | "booth_renter"
        | "bookkeeper"
        | "inventory_manager"
      billing_cycle: "monthly" | "quarterly" | "semi_annual" | "annual"
      billing_status:
        | "draft"
        | "trialing"
        | "active"
        | "past_due"
        | "paused"
        | "cancelled"
      capital_entry_type: "investment" | "return" | "reinvestment"
      chat_channel_type: "public" | "private" | "dm" | "group_dm" | "location"
      chat_member_role: "owner" | "admin" | "member"
      chat_user_status_type: "available" | "busy" | "dnd" | "away"
      color_type: "permanent" | "demi_permanent" | "semi_permanent"
      container_type: "bowl" | "bottle"
      day_rate_booking_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "cancelled"
        | "no_show"
      discount_type: "percentage" | "fixed_amount" | "promotional"
      expansion_opportunity_type:
        | "location_expansion"
        | "new_location"
        | "category_expansion"
        | "acquisition"
        | "capacity_expansion"
        | "inventory_expansion"
        | "service_growth"
        | "stylist_capacity_growth"
        | "campaign_acceleration"
        | "equipment_expansion"
        | "marketing_acceleration"
      expansion_status:
        | "identified"
        | "evaluating"
        | "approved"
        | "in_progress"
        | "completed"
        | "dismissed"
        | "funded"
        | "surfaced"
        | "underperforming"
        | "expired"
        | "canceled"
      financed_ledger_entry_type:
        | "repayment"
        | "revenue_lift_recorded"
        | "adjustment"
      financed_project_status:
        | "pending_payment"
        | "active"
        | "completed"
        | "defaulted"
        | "cancelled"
        | "underperforming"
      formula_type: "actual" | "refined"
      fulfillment_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      industry_signal_type:
        | "demand_shift"
        | "keyword_trend"
        | "price_signal"
        | "effectiveness_pattern"
        | "conversion_pattern"
      inquiry_source:
        | "website_form"
        | "google_business"
        | "facebook_lead"
        | "instagram_lead"
        | "phone_call"
        | "walk_in"
        | "referral"
        | "other"
      inquiry_status:
        | "new"
        | "contacted"
        | "assigned"
        | "consultation_booked"
        | "converted"
        | "lost"
      lead_source:
        | "content"
        | "ads"
        | "referral"
        | "google"
        | "walkin"
        | "other"
        | "salon_lead"
      meeting_mode: "in_person" | "video" | "hybrid"
      meeting_status: "scheduled" | "cancelled" | "completed"
      meeting_type:
        | "one_on_one"
        | "interview"
        | "manager_meeting"
        | "training"
        | "other"
      mix_bowl_status: "open" | "sealed" | "reweighed" | "discarded"
      mix_session_status:
        | "draft"
        | "mixing"
        | "pending_reweigh"
        | "completed"
        | "cancelled"
      network_deal_type: "revenue_share" | "equity_stake" | "full_acquisition"
      network_pipeline_stage:
        | "observe"
        | "qualify"
        | "offer"
        | "convert"
        | "scale"
      payroll_provider:
        | "gusto"
        | "quickbooks"
        | "adp"
        | "paychex"
        | "square"
        | "onpay"
        | "homebase"
        | "rippling"
        | "wave"
      price_queue_status: "pending" | "approved" | "rejected" | "auto_applied"
      price_recommendation_status: "pending" | "accepted" | "dismissed"
      program_status: "active" | "paused" | "completed" | "restarted"
      replenishment_event_status:
        | "suggested"
        | "approved"
        | "ordered"
        | "dismissed"
      replenishment_threshold_type:
        | "days_of_stock"
        | "fixed_quantity"
        | "forecast_driven"
      retention_action_type: "coaching_flag" | "demotion_eligible"
      rsvp_status: "pending" | "accepted" | "declined"
      seo_campaign_status:
        | "planning"
        | "active"
        | "blocked"
        | "at_risk"
        | "completed"
        | "abandoned"
      seo_completion_method: "system" | "manual_approved"
      seo_dependency_type: "hard" | "soft"
      seo_domination_strategy: "attack" | "expand" | "defend" | "abandon"
      seo_health_domain:
        | "review"
        | "page"
        | "local_presence"
        | "content"
        | "competitive_gap"
        | "conversion"
      seo_impact_window: "7d" | "30d" | "90d"
      seo_object_type:
        | "location"
        | "service"
        | "location_service"
        | "stylist_page"
        | "website_page"
        | "gbp_listing"
        | "review_stream"
        | "competitor"
      seo_task_status:
        | "detected"
        | "queued"
        | "assigned"
        | "in_progress"
        | "awaiting_dependency"
        | "awaiting_verification"
        | "completed"
        | "overdue"
        | "escalated"
        | "suppressed"
        | "canceled"
      shift_role_context:
        | "front_desk"
        | "receptionist"
        | "coordinator"
        | "other"
      shift_status: "scheduled" | "swapped" | "cancelled"
      stylist_type: "independent" | "commission" | "salon_owner"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_on_customer"
        | "waiting_on_internal"
        | "resolved"
        | "closed"
      touchpoint_type: "call" | "text" | "email" | "social" | "in_person"
      trend_confidence: "low" | "medium" | "high"
      trend_direction: "rising" | "stable" | "declining"
      waste_category:
        | "leftover_bowl_waste"
        | "overmix_waste"
        | "spill_waste"
        | "expired_product_discard"
        | "contamination_discard"
        | "wrong_mix"
        | "client_refusal"
      zos_eligibility: "prime" | "watchlist" | "ineligible"
      zura_guardrail_severity: "soft_warn" | "hard_block"
      zura_guardrail_type:
        | "topic_block"
        | "data_boundary"
        | "behavior_rule"
        | "compliance"
      zura_knowledge_category:
        | "salon_policy"
        | "product_info"
        | "pricing"
        | "brand_guidelines"
        | "service_info"
        | "faq"
        | "custom"
      zura_response_length: "concise" | "moderate" | "detailed"
      zura_tone:
        | "professional"
        | "friendly"
        | "motivational"
        | "luxury"
        | "casual"
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
      app_role: [
        "admin",
        "manager",
        "stylist",
        "receptionist",
        "assistant",
        "stylist_assistant",
        "admin_assistant",
        "operations_assistant",
        "super_admin",
        "booth_renter",
        "bookkeeper",
        "inventory_manager",
      ],
      billing_cycle: ["monthly", "quarterly", "semi_annual", "annual"],
      billing_status: [
        "draft",
        "trialing",
        "active",
        "past_due",
        "paused",
        "cancelled",
      ],
      capital_entry_type: ["investment", "return", "reinvestment"],
      chat_channel_type: ["public", "private", "dm", "group_dm", "location"],
      chat_member_role: ["owner", "admin", "member"],
      chat_user_status_type: ["available", "busy", "dnd", "away"],
      color_type: ["permanent", "demi_permanent", "semi_permanent"],
      container_type: ["bowl", "bottle"],
      day_rate_booking_status: [
        "pending",
        "confirmed",
        "checked_in",
        "completed",
        "cancelled",
        "no_show",
      ],
      discount_type: ["percentage", "fixed_amount", "promotional"],
      expansion_opportunity_type: [
        "location_expansion",
        "new_location",
        "category_expansion",
        "acquisition",
        "capacity_expansion",
        "inventory_expansion",
        "service_growth",
        "stylist_capacity_growth",
        "campaign_acceleration",
        "equipment_expansion",
        "marketing_acceleration",
      ],
      expansion_status: [
        "identified",
        "evaluating",
        "approved",
        "in_progress",
        "completed",
        "dismissed",
        "funded",
        "surfaced",
        "underperforming",
        "expired",
        "canceled",
      ],
      financed_ledger_entry_type: [
        "repayment",
        "revenue_lift_recorded",
        "adjustment",
      ],
      financed_project_status: [
        "pending_payment",
        "active",
        "completed",
        "defaulted",
        "cancelled",
        "underperforming",
      ],
      formula_type: ["actual", "refined"],
      fulfillment_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      industry_signal_type: [
        "demand_shift",
        "keyword_trend",
        "price_signal",
        "effectiveness_pattern",
        "conversion_pattern",
      ],
      inquiry_source: [
        "website_form",
        "google_business",
        "facebook_lead",
        "instagram_lead",
        "phone_call",
        "walk_in",
        "referral",
        "other",
      ],
      inquiry_status: [
        "new",
        "contacted",
        "assigned",
        "consultation_booked",
        "converted",
        "lost",
      ],
      lead_source: [
        "content",
        "ads",
        "referral",
        "google",
        "walkin",
        "other",
        "salon_lead",
      ],
      meeting_mode: ["in_person", "video", "hybrid"],
      meeting_status: ["scheduled", "cancelled", "completed"],
      meeting_type: [
        "one_on_one",
        "interview",
        "manager_meeting",
        "training",
        "other",
      ],
      mix_bowl_status: ["open", "sealed", "reweighed", "discarded"],
      mix_session_status: [
        "draft",
        "mixing",
        "pending_reweigh",
        "completed",
        "cancelled",
      ],
      network_deal_type: ["revenue_share", "equity_stake", "full_acquisition"],
      network_pipeline_stage: [
        "observe",
        "qualify",
        "offer",
        "convert",
        "scale",
      ],
      payroll_provider: [
        "gusto",
        "quickbooks",
        "adp",
        "paychex",
        "square",
        "onpay",
        "homebase",
        "rippling",
        "wave",
      ],
      price_queue_status: ["pending", "approved", "rejected", "auto_applied"],
      price_recommendation_status: ["pending", "accepted", "dismissed"],
      program_status: ["active", "paused", "completed", "restarted"],
      replenishment_event_status: [
        "suggested",
        "approved",
        "ordered",
        "dismissed",
      ],
      replenishment_threshold_type: [
        "days_of_stock",
        "fixed_quantity",
        "forecast_driven",
      ],
      retention_action_type: ["coaching_flag", "demotion_eligible"],
      rsvp_status: ["pending", "accepted", "declined"],
      seo_campaign_status: [
        "planning",
        "active",
        "blocked",
        "at_risk",
        "completed",
        "abandoned",
      ],
      seo_completion_method: ["system", "manual_approved"],
      seo_dependency_type: ["hard", "soft"],
      seo_domination_strategy: ["attack", "expand", "defend", "abandon"],
      seo_health_domain: [
        "review",
        "page",
        "local_presence",
        "content",
        "competitive_gap",
        "conversion",
      ],
      seo_impact_window: ["7d", "30d", "90d"],
      seo_object_type: [
        "location",
        "service",
        "location_service",
        "stylist_page",
        "website_page",
        "gbp_listing",
        "review_stream",
        "competitor",
      ],
      seo_task_status: [
        "detected",
        "queued",
        "assigned",
        "in_progress",
        "awaiting_dependency",
        "awaiting_verification",
        "completed",
        "overdue",
        "escalated",
        "suppressed",
        "canceled",
      ],
      shift_role_context: [
        "front_desk",
        "receptionist",
        "coordinator",
        "other",
      ],
      shift_status: ["scheduled", "swapped", "cancelled"],
      stylist_type: ["independent", "commission", "salon_owner"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_on_customer",
        "waiting_on_internal",
        "resolved",
        "closed",
      ],
      touchpoint_type: ["call", "text", "email", "social", "in_person"],
      trend_confidence: ["low", "medium", "high"],
      trend_direction: ["rising", "stable", "declining"],
      waste_category: [
        "leftover_bowl_waste",
        "overmix_waste",
        "spill_waste",
        "expired_product_discard",
        "contamination_discard",
        "wrong_mix",
        "client_refusal",
      ],
      zos_eligibility: ["prime", "watchlist", "ineligible"],
      zura_guardrail_severity: ["soft_warn", "hard_block"],
      zura_guardrail_type: [
        "topic_block",
        "data_boundary",
        "behavior_rule",
        "compliance",
      ],
      zura_knowledge_category: [
        "salon_policy",
        "product_info",
        "pricing",
        "brand_guidelines",
        "service_info",
        "faq",
        "custom",
      ],
      zura_response_length: ["concise", "moderate", "detailed"],
      zura_tone: [
        "professional",
        "friendly",
        "motivational",
        "luxury",
        "casual",
      ],
    },
  },
} as const
