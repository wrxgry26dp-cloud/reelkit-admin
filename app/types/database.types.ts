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
      banners: {
        Row: {
          created_at: string
          drama_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          drama_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          drama_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          title?: string
        }
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
      }
      drama_categories: {
        Row: { category_id: string; drama_id: string }
        Insert: { category_id: string; drama_id: string }
        Update: { category_id?: string; drama_id?: string }
      }
      dramas: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          is_trending: boolean
          slug: string
          status: string
          synopsis: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_trending?: boolean
          slug: string
          status?: string
          synopsis?: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_trending?: boolean
          slug?: string
          status?: string
          synopsis?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
      }
      episodes: {
        Row: {
          created_at: string
          drama_id: string
          duration_seconds: number
          episode_number: number
          id: string
          is_free: boolean
          title: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          drama_id: string
          duration_seconds?: number
          episode_number: number
          id?: string
          is_free?: boolean
          title?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          drama_id?: string
          duration_seconds?: number
          episode_number?: number
          id?: string
          is_free?: boolean
          title?: string
          video_url?: string | null
        }
      }
      home_section_items: {
        Row: { drama_id: string; id: string; section_id: string; sort_order: number }
        Insert: { drama_id: string; id?: string; section_id: string; sort_order?: number }
        Update: { drama_id?: string; id?: string; section_id?: string; sort_order?: number }
      }
      home_sections: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
        }
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
      }
      site_pages: {
        Row: { body: string; id: string; slug: string; title: string; updated_at: string }
        Insert: { body?: string; id?: string; slug: string; title: string; updated_at?: string }
        Update: { body?: string; id?: string; slug?: string; title?: string; updated_at?: string }
      }
      watch_progress: {
        Row: {
          drama_id: string
          episode_id: string
          id: string
          progress_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          drama_id: string
          episode_id: string
          id?: string
          progress_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          drama_id?: string
          episode_id?: string
          id?: string
          progress_seconds?: number
          updated_at?: string
          user_id?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: Record<string, never>
  }
}

export type Drama = Database['public']['Tables']['dramas']['Row']
export type Episode = Database['public']['Tables']['episodes']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Banner = Database['public']['Tables']['banners']['Row']
export type HomeSection = Database['public']['Tables']['home_sections']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type SitePage = Database['public']['Tables']['site_pages']['Row']
