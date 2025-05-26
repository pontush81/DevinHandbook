export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          created_by: string | null
          file_path: string
          file_size: number
          file_type: string
          handbook_id: string
          id: string
          is_public: boolean | null
          name: string
          page_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_path: string
          file_size: number
          file_type: string
          handbook_id: string
          id?: string
          is_public?: boolean | null
          name: string
          page_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          handbook_id?: string
          id?: string
          is_public?: boolean | null
          name?: string
          page_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_handbook_id_fkey"
            columns: ["handbook_id"]
            isOneToOne: false
            referencedRelation: "handbook_structure"
            referencedColumns: ["handbook_id"]
          },
          {
            foreignKeyName: "attachments_handbook_id_fkey"
            columns: ["handbook_id"]
            isOneToOne: false
            referencedRelation: "handbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "handbook_structure"
            referencedColumns: ["page_id"]
          },
          {
            foreignKeyName: "attachments_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      handbooks: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          subdomain: string | null;
          owner_id: string | null;
          published: boolean | null;
          description: string | null;
          subtitle: string | null;
          version: string | null;
          updated_at: string | null;
          theme: Json | null;
          organization_id: string | null;
          organization_name: string | null;
          organization_email: string | null;
          organization_phone: string | null;
          organization_address: string | null;
          organization_org_number: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          subdomain?: string | null;
          owner_id?: string | null;
          published?: boolean | null;
          description?: string | null;
          subtitle?: string | null;
          version?: string | null;
          updated_at?: string | null;
          theme?: Json | null;
          organization_id?: string | null;
          organization_name?: string | null;
          organization_email?: string | null;
          organization_phone?: string | null;
          organization_address?: string | null;
          organization_org_number?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          subdomain?: string | null;
          owner_id?: string | null;
          published?: boolean | null;
          description?: string | null;
          subtitle?: string | null;
          version?: string | null;
          updated_at?: string | null;
          theme?: Json | null;
          organization_id?: string | null;
          organization_name?: string | null;
          organization_email?: string | null;
          organization_phone?: string | null;
          organization_address?: string | null;
          organization_org_number?: string | null;
        };
      };
      sections: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          description: string | null;
          order_index: number;
          handbook_id: string;
          icon: string | null;
          is_active: boolean | null;
          is_published: boolean | null;
          is_public: boolean;
          completion_status: number | null;
          parent_section_id: string | null;
          created_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          description?: string | null;
          order_index?: number;
          handbook_id: string;
          icon?: string | null;
          is_active?: boolean | null;
          is_published?: boolean | null;
          is_public?: boolean;
          completion_status?: number | null;
          parent_section_id?: string | null;
          created_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          description?: string | null;
          order_index?: number;
          handbook_id?: string;
          icon?: string | null;
          is_active?: boolean | null;
          is_published?: boolean | null;
          is_public?: boolean;
          completion_status?: number | null;
          parent_section_id?: string | null;
          created_by?: string | null;
          updated_at?: string | null;
        };
      };
      pages: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          content: string | null;
          content_json: Json | null;
          order_index: number;
          section_id: string;
          slug: string;
          is_published: boolean | null;
          table_of_contents: boolean | null;
          created_by: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          content?: string | null;
          content_json?: Json | null;
          order_index?: number;
          section_id: string;
          slug: string;
          is_published?: boolean | null;
          table_of_contents?: boolean | null;
          created_by?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          content?: string | null;
          content_json?: Json | null;
          order_index?: number;
          section_id?: string;
          slug?: string;
          is_published?: boolean | null;
          table_of_contents?: boolean | null;
          created_by?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
      };
      welcome_content: {
        Row: {
          id: string;
          handbook_id: string;
          hero_title: string;
          hero_subtitle: string;
          info_cards: Json;
          important_info: Json;
          show_info_cards: boolean;
          show_important_info: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          handbook_id: string;
          hero_title?: string;
          hero_subtitle?: string;
          info_cards?: Json;
          important_info?: Json;
          show_info_cards?: boolean;
          show_important_info?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          handbook_id?: string;
          hero_title?: string;
          hero_subtitle?: string;
          info_cards?: Json;
          important_info?: Json;
          show_info_cards?: boolean;
          show_important_info?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
}; 