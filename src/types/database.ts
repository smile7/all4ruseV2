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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      event_tags: {
        Row: {
          event_id: number
          tag_id: number
        }
        Insert: {
          event_id: number
          tag_id: number
        }
        Update: {
          event_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_tags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string
          created_at: string
          createdBy: string | null
          description: string
          email: string | null
          endDate: string
          endTime: string | null
          fbLink: string | null
          id: number
          image: string | null
          images: Json | null
          isEventActive: boolean
          isEventCancelled: boolean | null
          isEventPremium: boolean | null
          isSoldOut: boolean | null
          organizers: Json | null
          phoneNumber: string | null
          place: string | null
          price: string | null
          slug: string | null
          startDate: string
          startTime: string
          ticketsLink: string | null
          title: string
          town: string
        }
        Insert: {
          address: string
          created_at?: string
          createdBy?: string | null
          description: string
          email?: string | null
          endDate: string
          endTime?: string | null
          fbLink?: string | null
          id?: number
          image?: string | null
          images?: Json | null
          isEventActive: boolean
          isEventCancelled?: boolean | null
          isEventPremium?: boolean | null
          isSoldOut?: boolean | null
          organizers?: Json | null
          phoneNumber?: string | null
          place?: string | null
          price?: string | null
          slug?: string | null
          startDate: string
          startTime: string
          ticketsLink?: string | null
          title: string
          town: string
        }
        Update: {
          address?: string
          created_at?: string
          createdBy?: string | null
          description?: string
          email?: string | null
          endDate?: string
          endTime?: string | null
          fbLink?: string | null
          id?: number
          image?: string | null
          images?: Json | null
          isEventActive?: boolean
          isEventCancelled?: boolean | null
          isEventPremium?: boolean | null
          isSoldOut?: boolean | null
          organizers?: Json | null
          phoneNumber?: string | null
          place?: string | null
          price?: string | null
          slug?: string | null
          startDate?: string
          startTime?: string
          ticketsLink?: string | null
          title?: string
          town?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_createdBy_fkey"
            columns: ["createdBy"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_physical: string | null
          avatar_url: string | null
          bio: string | null
          email: string | null
          email_to_show: string | null
          fb: string | null
          full_name: string | null
          id: string
          instagram: string | null
          is_confirmed: boolean | null
          name_to_show: string | null
          phone: string | null
          place: string | null
          tiktok: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          address_physical?: string | null
          avatar_url?: string | null
          bio?: string | null
          email?: string | null
          email_to_show?: string | null
          fb?: string | null
          full_name?: string | null
          id: string
          instagram?: string | null
          is_confirmed?: boolean | null
          name_to_show?: string | null
          phone?: string | null
          place?: string | null
          tiktok?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          address_physical?: string | null
          avatar_url?: string | null
          bio?: string | null
          email?: string | null
          email_to_show?: string | null
          fb?: string | null
          full_name?: string | null
          id?: string
          instagram?: string | null
          is_confirmed?: boolean | null
          name_to_show?: string | null
          phone?: string | null
          place?: string | null
          tiktok?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: number
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          title?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
