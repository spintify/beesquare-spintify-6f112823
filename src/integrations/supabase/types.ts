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
      audit_counters: {
        Row: {
          key: string
          value: number
        }
        Insert: {
          key: string
          value?: number
        }
        Update: {
          key?: string
          value?: number
        }
        Relationships: []
      }
      audit_items: {
        Row: {
          audit_id: string
          created_at: string
          data: Json
          id: string
          row_index: number
        }
        Insert: {
          audit_id: string
          created_at?: string
          data?: Json
          id?: string
          row_index: number
        }
        Update: {
          audit_id?: string
          created_at?: string
          data?: Json
          id?: string
          row_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          address_line1: string | null
          alternate_mobile: string | null
          audit_id: string
          branch_name: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          file_name: string | null
          file_size: number | null
          firm_name: string
          gst_number: string
          id: string
          item_count: number
          mobile_number: string
          owner_name: string
          pan_number: string | null
          pincode: string
          remarks: string | null
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          alternate_mobile?: string | null
          audit_id: string
          branch_name?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          file_name?: string | null
          file_size?: number | null
          firm_name: string
          gst_number: string
          id?: string
          item_count?: number
          mobile_number: string
          owner_name: string
          pan_number?: string | null
          pincode: string
          remarks?: string | null
          state: string
          status?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          alternate_mobile?: string | null
          audit_id?: string
          branch_name?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          file_name?: string | null
          file_size?: number | null
          firm_name?: string
          gst_number?: string
          id?: string
          item_count?: number
          mobile_number?: string
          owner_name?: string
          pan_number?: string | null
          pincode?: string
          remarks?: string | null
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      bill_counters: {
        Row: {
          key: string
          value: number
        }
        Insert: {
          key: string
          value?: number
        }
        Update: {
          key?: string
          value?: number
        }
        Relationships: []
      }
      bills: {
        Row: {
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          bill_number: string
          created_at: string
          customer_address: string | null
          customer_gstin: string | null
          customer_name: string | null
          customer_phone: string | null
          date: string
          gst_amount: number
          gst_rate: number
          id: string
          items: Json
          subtotal: number
          taxable: number
          total: number
          total_discount: number
          upi_id: string | null
        }
        Insert: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          bill_number: string
          created_at?: string
          customer_address?: string | null
          customer_gstin?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string
          gst_amount?: number
          gst_rate?: number
          id?: string
          items?: Json
          subtotal?: number
          taxable?: number
          total?: number
          total_discount?: number
          upi_id?: string | null
        }
        Update: {
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          bill_number?: string
          created_at?: string
          customer_address?: string | null
          customer_gstin?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string
          gst_amount?: number
          gst_rate?: number
          id?: string
          items?: Json
          subtotal?: number
          taxable?: number
          total?: number
          total_discount?: number
          upi_id?: string | null
        }
        Relationships: []
      }
      buyers: {
        Row: {
          address: string | null
          created_at: string
          gstin: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          discount: number
          hsn: string | null
          id: string
          name: string
          price: number
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount?: number
          hsn?: string | null
          id?: string
          name: string
          price?: number
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount?: number
          hsn?: string | null
          id?: string
          name?: string
          price?: number
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          date: string
          gst_amount: number
          id: string
          items: Json
          notes: string | null
          purchase_number: string
          subtotal: number
          supplier_address: string | null
          supplier_gstin: string | null
          supplier_name: string | null
          supplier_phone: string | null
          total: number
        }
        Insert: {
          created_at?: string
          date?: string
          gst_amount?: number
          id?: string
          items?: Json
          notes?: string | null
          purchase_number: string
          subtotal?: number
          supplier_address?: string | null
          supplier_gstin?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          total?: number
        }
        Update: {
          created_at?: string
          date?: string
          gst_amount?: number
          id?: string
          items?: Json
          notes?: string | null
          purchase_number?: string
          subtotal?: number
          supplier_address?: string | null
          supplier_gstin?: string | null
          supplier_name?: string | null
          supplier_phone?: string | null
          total?: number
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          created_at: string
          gstin: string | null
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: { _delta: number; _product_id: string }
        Returns: undefined
      }
      next_audit_id: { Args: never; Returns: string }
      next_bill_number: { Args: never; Returns: string }
      next_bill_number_for: { Args: { _fy: string }; Returns: number }
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
