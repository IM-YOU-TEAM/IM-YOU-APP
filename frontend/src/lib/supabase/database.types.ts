// Generated from the Supabase schema. Regenerate after each migration; do not edit by hand.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      exercise_clips: {
        Row: {
          created_at: string
          credit: string
          movement_type: string
          poster_path: string | null
          source_url: string
          video_path: string
        }
        Insert: {
          created_at?: string
          credit: string
          movement_type: string
          poster_path?: string | null
          source_url: string
          video_path: string
        }
        Update: {
          created_at?: string
          credit?: string
          movement_type?: string
          poster_path?: string | null
          source_url?: string
          video_path?: string
        }
        Relationships: []
      }
      imu_pairings: {
        Row: {
          claimed_at: string | null
          code_expires_at: string
          code_hash: string
          created_at: string
          id: string
          patient_id: string
          revoked_at: string | null
          topic: string
        }
        Insert: {
          claimed_at?: string | null
          code_expires_at?: string
          code_hash: string
          created_at?: string
          id?: string
          patient_id: string
          revoked_at?: string | null
          topic?: string
        }
        Update: {
          claimed_at?: string | null
          code_expires_at?: string
          code_hash?: string
          created_at?: string
          id?: string
          patient_id?: string
          revoked_at?: string | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "imu_pairings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          assigned_motions: string[]
          care_code: string
          clinician_id: string | null
          created_at: string
          full_name: string | null
          id: string
          linked_at: string | null
          owner_link: string | null
          task_frequency: Json
        }
        Insert: {
          assigned_motions?: string[]
          care_code?: string
          clinician_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          linked_at?: string | null
          owner_link?: string | null
          task_frequency?: Json
        }
        Update: {
          assigned_motions?: string[]
          care_code?: string
          clinician_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          linked_at?: string | null
          owner_link?: string | null
          task_frequency?: Json
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          body: string
          clinician_id: string
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          body: string
          clinician_id?: string
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          body?: string
          clinician_id?: string
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          cadence: number
          created_at: string
          duration_sec: number
          far_leg_hidden: boolean
          gait_score: number
          id: string
          method: string
          metrics: Json
          motion: string
          patient_id: string
          reps: number | null
          started_at: string
          step_count: number | null
          symmetry: number | null
        }
        Insert: {
          cadence: number
          created_at?: string
          duration_sec: number
          far_leg_hidden?: boolean
          gait_score: number
          id?: string
          method: string
          metrics?: Json
          motion: string
          patient_id: string
          reps?: number | null
          started_at: string
          step_count?: number | null
          symmetry?: number | null
        }
        Update: {
          cadence?: number
          created_at?: string
          duration_sec?: number
          far_leg_hidden?: boolean
          gait_score?: number
          id?: string
          method?: string
          metrics?: Json
          motion?: string
          patient_id?: string
          reps?: number | null
          started_at?: string
          step_count?: number | null
          symmetry?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      task_checks: {
        Row: {
          created_at: string
          done_on: string
          motion: string
          patient_id: string
        }
        Insert: {
          created_at?: string
          done_on: string
          motion: string
          patient_id: string
        }
        Update: {
          created_at?: string
          done_on?: string
          motion?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_checks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_care_code: { Args: { p_code: string }; Returns: string }
      claim_imu_pairing: { Args: { p_code: string }; Returns: string }
      complete_onboarding: {
        Args: { p_care_code?: string; p_display_name?: string; p_role: string }
        Returns: undefined
      }
      create_imu_pairing: {
        Args: never
        Returns: {
          code: string
          code_expires_at: string
          topic: string
        }[]
      }
      imu_pairing_topic_open: { Args: never; Returns: boolean }
      provision_patient_account: {
        Args: { p_clinician_id: string; p_full_name: string; p_user_id: string }
        Returns: {
          assigned_motions: string[]
          care_code: string
          clinician_id: string | null
          created_at: string
          full_name: string | null
          id: string
          linked_at: string | null
          owner_link: string | null
          task_frequency: Json
        }
        SetofOptions: {
          from: "*"
          to: "patients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
