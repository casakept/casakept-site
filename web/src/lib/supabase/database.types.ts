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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      booking_product_selections: {
        Row: {
          booking_id: string
          category: Database["public"]["Enums"]["cleaning_product_category"]
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          booking_id: string
          category: Database["public"]["Enums"]["cleaning_product_category"]
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          booking_id?: string
          category?: Database["public"]["Enums"]["cleaning_product_category"]
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_product_selections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_product_selections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cleaning_products"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          assigned_staff_id: string | null
          covered_by_entitlement: boolean
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          preferred_staff_id: string | null
          price_cents: number
          property_id: string
          scheduled_date: string
          service_id: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["booking_status"]
          subscription_id: string | null
          time_window: Database["public"]["Enums"]["schedule_window"]
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          covered_by_entitlement?: boolean
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          preferred_staff_id?: string | null
          price_cents?: number
          property_id: string
          scheduled_date: string
          service_id?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          subscription_id?: string | null
          time_window: Database["public"]["Enums"]["schedule_window"]
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          covered_by_entitlement?: boolean
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          preferred_staff_id?: string | null
          price_cents?: number
          property_id?: string
          scheduled_date?: string
          service_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["booking_status"]
          subscription_id?: string | null
          time_window?: Database["public"]["Enums"]["schedule_window"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_preferred_staff_id_fkey"
            columns: ["preferred_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          active: boolean
          created_at: string
          deep_clean_only: boolean
          id: string
          name: string
          requires_photo: boolean
          rotation_zone: string | null
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          deep_clean_only?: boolean
          id?: string
          name: string
          requires_photo?: boolean
          rotation_zone?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          deep_clean_only?: boolean
          id?: string
          name?: string
          requires_photo?: boolean
          rotation_zone?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      cleaning_products: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["cleaning_product_category"]
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: Database["public"]["Enums"]["cleaning_product_category"]
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["cleaning_product_category"]
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cocina_menu_items: {
        Row: {
          active: boolean
          created_at: string
          description: string
          dish_name: string
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          dish_name: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          dish_name?: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      csat_responses: {
        Row: {
          booking_id: string
          comment: string | null
          customer_id: string
          id: string
          rating: number | null
          responded_at: string | null
          sent_at: string
          token: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          customer_id: string
          id?: string
          rating?: number | null
          responded_at?: string | null
          sent_at?: string
          token: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          customer_id?: string
          id?: string
          rating?: number | null
          responded_at?: string | null
          sent_at?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "csat_responses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csat_responses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_usage: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          included_count: number
          service_type: Database["public"]["Enums"]["service_type"]
          subscription_id: string
          updated_at: string
          used_count: number
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          id?: string
          included_count: number
          service_type: Database["public"]["Enums"]["service_type"]
          subscription_id: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          id?: string
          included_count?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          subscription_id?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "entitlement_usage_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          ack_carpet_access: boolean
          ack_estimate_validity: boolean
          ack_guarantee: boolean
          ack_membership_terms: boolean
          ack_services_guide: boolean
          address_line1: string
          approx_sq_ft: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          condition_bathrooms: number | null
          condition_clutter: number | null
          condition_dust: number | null
          condition_floors: number | null
          condition_kitchen: number | null
          condition_notes: string | null
          condition_windows: number | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string
          customer_id: string | null
          customer_signature: string | null
          customer_signed_at: string | null
          estimator_id: string
          estimator_signed_at: string | null
          gate_code_needed: boolean
          has_alarm: boolean
          has_pets: boolean
          id: string
          monthly_total_cents: number
          notes: string | null
          onboarding_deep_clean: boolean
          onboarding_deep_clean_cents: number
          one_time_services: Json
          one_time_total_cents: number
          pets_notes: string | null
          preferred_days: string[]
          preferred_entry: string | null
          preferred_window:
            | Database["public"]["Enums"]["schedule_window"]
            | null
          product_preference: Database["public"]["Enums"]["product_preference"]
          selected_plan_id: string | null
          size_adjustment_cents: number
          state: string
          status: Database["public"]["Enums"]["estimate_status"]
          stories: number | null
          target_start_date: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          ack_carpet_access?: boolean
          ack_estimate_validity?: boolean
          ack_guarantee?: boolean
          ack_membership_terms?: boolean
          ack_services_guide?: boolean
          address_line1: string
          approx_sq_ft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          condition_bathrooms?: number | null
          condition_clutter?: number | null
          condition_dust?: number | null
          condition_floors?: number | null
          condition_kitchen?: number | null
          condition_notes?: string | null
          condition_windows?: number | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          customer_signature?: string | null
          customer_signed_at?: string | null
          estimator_id: string
          estimator_signed_at?: string | null
          gate_code_needed?: boolean
          has_alarm?: boolean
          has_pets?: boolean
          id?: string
          monthly_total_cents?: number
          notes?: string | null
          onboarding_deep_clean?: boolean
          onboarding_deep_clean_cents?: number
          one_time_services?: Json
          one_time_total_cents?: number
          pets_notes?: string | null
          preferred_days?: string[]
          preferred_entry?: string | null
          preferred_window?:
            | Database["public"]["Enums"]["schedule_window"]
            | null
          product_preference?: Database["public"]["Enums"]["product_preference"]
          selected_plan_id?: string | null
          size_adjustment_cents?: number
          state?: string
          status?: Database["public"]["Enums"]["estimate_status"]
          stories?: number | null
          target_start_date?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          ack_carpet_access?: boolean
          ack_estimate_validity?: boolean
          ack_guarantee?: boolean
          ack_membership_terms?: boolean
          ack_services_guide?: boolean
          address_line1?: string
          approx_sq_ft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          condition_bathrooms?: number | null
          condition_clutter?: number | null
          condition_dust?: number | null
          condition_floors?: number | null
          condition_kitchen?: number | null
          condition_notes?: string | null
          condition_windows?: number | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          customer_id?: string | null
          customer_signature?: string | null
          customer_signed_at?: string | null
          estimator_id?: string
          estimator_signed_at?: string | null
          gate_code_needed?: boolean
          has_alarm?: boolean
          has_pets?: boolean
          id?: string
          monthly_total_cents?: number
          notes?: string | null
          onboarding_deep_clean?: boolean
          onboarding_deep_clean_cents?: number
          one_time_services?: Json
          one_time_total_cents?: number
          pets_notes?: string | null
          preferred_days?: string[]
          preferred_entry?: string | null
          preferred_window?:
            | Database["public"]["Enums"]["schedule_window"]
            | null
          product_preference?: Database["public"]["Enums"]["product_preference"]
          selected_plan_id?: string | null
          size_adjustment_cents?: number
          state?: string
          status?: Database["public"]["Enums"]["estimate_status"]
          stories?: number | null
          target_start_date?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_estimator_id_fkey"
            columns: ["estimator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_selected_plan_id_fkey"
            columns: ["selected_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          active: boolean
          annual_price_cents: number | null
          created_at: string
          description: string | null
          extra_services_discount_pct: number
          id: string
          minimum_term_months: number
          monthly_price_cents: number
          name: string
          perks: string[]
          slug: string
          sort_order: number
          stripe_price_id: string | null
          stripe_price_id_annual: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          annual_price_cents?: number | null
          created_at?: string
          description?: string | null
          extra_services_discount_pct?: number
          id?: string
          minimum_term_months?: number
          monthly_price_cents: number
          name: string
          perks?: string[]
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
          stripe_price_id_annual?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          annual_price_cents?: number | null
          created_at?: string
          description?: string | null
          extra_services_discount_pct?: number
          id?: string
          minimum_term_months?: number
          monthly_price_cents?: number
          name?: string
          perks?: string[]
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
          stripe_price_id_annual?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          booking_id: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          customer_id: string
          id: string
          sent_at: string | null
          status: string
          template: string
        }
        Insert: {
          booking_id?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id: string
          id?: string
          sent_at?: string | null
          status?: string
          template: string
        }
        Update: {
          booking_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string
          id?: string
          sent_at?: string | null
          status?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          booking_id: string | null
          created_at: string
          currency: string
          customer_id: string
          id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_entitlements: {
        Row: {
          created_at: string
          frequency: Database["public"]["Enums"]["entitlement_frequency"]
          id: string
          plan_id: string
          quantity: number
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          created_at?: string
          frequency: Database["public"]["Enums"]["entitlement_frequency"]
          id?: string
          plan_id: string
          quantity: number
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          created_at?: string
          frequency?: Database["public"]["Enums"]["entitlement_frequency"]
          id?: string
          plan_id?: string
          quantity?: number
          service_type?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          founding_member: boolean
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          sms_opt_in: boolean
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          founding_member?: boolean
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sms_opt_in?: boolean
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          founding_member?: boolean
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sms_opt_in?: boolean
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          access_notes: string | null
          address_line1: string
          address_line2: string | null
          city: string
          created_at: string
          customer_id: string
          id: string
          label: string | null
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          access_notes?: string | null
          address_line1: string
          address_line2?: string | null
          city: string
          created_at?: string
          customer_id: string
          id?: string
          label?: string | null
          state?: string
          updated_at?: string
          zip: string
        }
        Update: {
          access_notes?: string | null
          address_line1?: string
          address_line2?: string | null
          city?: string
          created_at?: string
          customer_id?: string
          id?: string
          label?: string | null
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          base_price_cents: number
          created_at: string
          default_duration_minutes: number | null
          description: string | null
          id: string
          member_discount_pct: number
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_price_cents: number
          created_at?: string
          default_duration_minutes?: number | null
          description?: string | null
          id?: string
          member_discount_pct?: number
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_price_cents?: number
          created_at?: string
          default_duration_minutes?: number | null
          description?: string | null
          id?: string
          member_discount_pct?: number
          name?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          hire_date: string
          id: string
          referred_by_staff_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          hire_date?: string
          id: string
          referred_by_staff_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          hire_date?: string
          id?: string
          referred_by_staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_referred_by_staff_id_fkey"
            columns: ["referred_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_availability: {
        Row: {
          active: boolean
          created_at: string
          day_of_week: number
          id: string
          staff_id: string
          time_window: Database["public"]["Enums"]["schedule_window"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          day_of_week: number
          id?: string
          staff_id: string
          time_window: Database["public"]["Enums"]["schedule_window"]
        }
        Update: {
          active?: boolean
          created_at?: string
          day_of_week?: number
          id?: string
          staff_id?: string
          time_window?: Database["public"]["Enums"]["schedule_window"]
        }
        Relationships: [
          {
            foreignKeyName: "staff_availability_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_bonuses: {
        Row: {
          amount_cents: number
          bonus_type: Database["public"]["Enums"]["staff_bonus_type"]
          computed_at: string
          id: string
          paid: boolean
          paid_at: string | null
          period_label: string | null
          related_staff_id: string | null
          staff_id: string
        }
        Insert: {
          amount_cents: number
          bonus_type: Database["public"]["Enums"]["staff_bonus_type"]
          computed_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          period_label?: string | null
          related_staff_id?: string | null
          staff_id: string
        }
        Update: {
          amount_cents?: number
          bonus_type?: Database["public"]["Enums"]["staff_bonus_type"]
          computed_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          period_label?: string | null
          related_staff_id?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_bonuses_related_staff_id_fkey"
            columns: ["related_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_bonuses_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_time_off: {
        Row: {
          created_at: string
          end_date: string
          id: string
          reason: string | null
          staff_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          reason?: string | null
          staff_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          reason?: string | null
          staff_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cadence: string
          cancel_at: string | null
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          customer_id: string
          id: string
          minimum_term_end: string
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_cadence?: string
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start?: string
          customer_id: string
          id?: string
          minimum_term_end: string
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_cadence?: string
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          customer_id?: string
          id?: string
          minimum_term_end?: string
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_checklist_entries: {
        Row: {
          booking_id: string
          checklist_item_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          photo_path: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          checklist_item_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          photo_path?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          checklist_item_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          photo_path?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_checklist_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_checklist_entries_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_checklist_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_checkins: {
        Row: {
          booking_id: string
          check_in_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_at: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          created_at: string
          id: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          created_at?: string
          id?: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          created_at?: string
          id?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_checkins_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_checkins_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_scores: {
        Row: {
          booking_id: string
          created_at: string
          customer_score: number
          event_type: Database["public"]["Enums"]["visit_score_event"]
          id: string
          notes: string | null
          professionalism_score: number
          quality_score: number
          scored_by: string
          staff_id: string
          timeliness_score: number
          total_score: number | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          customer_score: number
          event_type?: Database["public"]["Enums"]["visit_score_event"]
          id?: string
          notes?: string | null
          professionalism_score: number
          quality_score: number
          scored_by: string
          staff_id: string
          timeliness_score: number
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          customer_score?: number
          event_type?: Database["public"]["Enums"]["visit_score_event"]
          id?: string
          notes?: string | null
          professionalism_score?: number
          quality_score?: number
          scored_by?: string
          staff_id?: string
          timeliness_score?: number
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_scores_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_scores_scored_by_fkey"
            columns: ["scored_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_scores_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_staff_directory: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      assign_booking_staff: { Args: { p_booking_id: string }; Returns: string }
      claim_entitlement_usage: {
        Args: {
          p_included_count: number
          p_period_end: string
          p_period_start: string
          p_service_type: Database["public"]["Enums"]["service_type"]
          p_subscription_id: string
        }
        Returns: {
          billing_period_end: string
          billing_period_start: string
          created_at: string
          id: string
          included_count: number
          service_type: Database["public"]["Enums"]["service_type"]
          subscription_id: string
          updated_at: string
          used_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "entitlement_usage"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_role_name: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_slot_availability: {
        Args: { p_date: string }
        Returns: {
          available: boolean
          time_window: Database["public"]["Enums"]["schedule_window"]
        }[]
      }
      grant_founding_member: { Args: { p_customer_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      cleaning_product_category:
        | "all_purpose_cleaner"
        | "hard_floor_cleaner"
        | "carpet_cleaner"
        | "glass_cleaner"
        | "laundry_detergent"
        | "fabric_softener"
      entitlement_frequency: "weekly" | "biweekly" | "monthly" | "quarterly"
      estimate_status: "draft" | "sent" | "converted" | "declined"
      notification_channel: "email" | "sms"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      product_preference: "standard" | "hypoallergenic" | "pet_safe"
      schedule_window: "morning" | "midday" | "afternoon"
      service_type:
        | "standard_clean"
        | "deep_clean"
        | "move_out_clean"
        | "carpet_cleaning"
        | "window_cleaning"
        | "organization"
        | "laundry"
        | "laundry_rush"
        | "grocery"
        | "fridge_restock"
        | "cocina_meal"
        | "errand"
      staff_bonus_type: "90_day" | "anniversary" | "household_retention" | "crew_of_month" | "referral"
      subscription_status: "active" | "paused" | "cancelled" | "past_due"
      user_role: "customer" | "staff" | "admin"
      visit_score_event: "none" | "no_show" | "callback" | "safety_violation"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      cleaning_product_category: [
        "all_purpose_cleaner",
        "hard_floor_cleaner",
        "carpet_cleaner",
        "glass_cleaner",
        "laundry_detergent",
        "fabric_softener",
      ],
      entitlement_frequency: ["weekly", "biweekly", "monthly", "quarterly"],
      estimate_status: ["draft", "sent", "converted", "declined"],
      notification_channel: ["email", "sms"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      product_preference: ["standard", "hypoallergenic", "pet_safe"],
      schedule_window: ["morning", "midday", "afternoon"],
      service_type: [
        "standard_clean",
        "deep_clean",
        "move_out_clean",
        "carpet_cleaning",
        "window_cleaning",
        "organization",
        "laundry",
        "laundry_rush",
        "grocery",
        "fridge_restock",
        "cocina_meal",
        "errand",
      ],
      subscription_status: ["active", "paused", "cancelled", "past_due"],
      user_role: ["customer", "staff", "admin"],
      visit_score_event: ["none", "no_show", "callback", "safety_violation"],
    },
  },
} as const
