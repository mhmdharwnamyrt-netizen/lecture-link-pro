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
      activity_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          department_id: string | null
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          kind: string
          severity: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          department_id?: string | null
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind: string
          severity?: string
          title: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          department_id?: string | null
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          kind?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          status: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          status?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          biometric_verified: boolean
          created_at: string
          face_match_score: number | null
          id: string
          latitude: number | null
          lecture_id: string
          location_verified: boolean
          longitude: number | null
          status: string
          student_id: string
          synced: boolean
          verification_photo_url: string | null
        }
        Insert: {
          biometric_verified?: boolean
          created_at?: string
          face_match_score?: number | null
          id?: string
          latitude?: number | null
          lecture_id: string
          location_verified?: boolean
          longitude?: number | null
          status?: string
          student_id: string
          synced?: boolean
          verification_photo_url?: string | null
        }
        Update: {
          biometric_verified?: boolean
          created_at?: string
          face_match_score?: number | null
          id?: string
          latitude?: number | null
          lecture_id?: string
          location_verified?: boolean
          longitude?: number | null
          status?: string
          student_id?: string
          synced?: boolean
          verification_photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_hidden: boolean
          likes_count: number
          parent_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_hidden?: boolean
          likes_count?: number
          parent_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_hidden?: boolean
          likes_count?: number
          parent_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      community_mentions: {
        Row: {
          actor_id: string
          comment_id: string | null
          created_at: string
          id: string
          mentioned_user_id: string
          post_id: string | null
        }
        Insert: {
          actor_id: string
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id: string
          post_id?: string | null
        }
        Update: {
          actor_id?: string
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_media: {
        Row: {
          created_at: string
          duration_seconds: number | null
          file_name: string | null
          file_size: number | null
          id: string
          media_type: string
          mime_type: string | null
          post_id: string
          storage_path: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          media_type: string
          mime_type?: string | null
          post_id: string
          storage_path: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          media_type?: string
          mime_type?: string | null
          post_id?: string
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          category: string
          comments_count: number
          content: string
          created_at: string
          department_id: string | null
          edited_at: string | null
          id: string
          image_url: string | null
          is_answered: boolean
          is_hidden: boolean
          is_pinned: boolean
          likes_count: number
          media_mime: string | null
          media_name: string | null
          media_type: string | null
          pinned_at: string | null
          pinned_by: string | null
          saves_count: number
          score: number
          shares_count: number
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          comments_count?: number
          content?: string
          created_at?: string
          department_id?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_answered?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          likes_count?: number
          media_mime?: string | null
          media_name?: string | null
          media_type?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          saves_count?: number
          score?: number
          shares_count?: number
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          comments_count?: number
          content?: string
          created_at?: string
          department_id?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_answered?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          likes_count?: number
          media_mime?: string | null
          media_name?: string | null
          media_type?: string | null
          pinned_at?: string | null
          pinned_by?: string | null
          saves_count?: number
          score?: number
          shares_count?: number
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          post_id: string | null
          reaction: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reaction?: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          comment_id: string | null
          created_at: string
          details: string | null
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_shares: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          name_ar: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_ar?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_ar?: string | null
        }
        Relationships: []
      }
      doctor_departments: {
        Row: {
          department_id: string
          doctor_id: string
          id: string
          level: number
        }
        Insert: {
          department_id: string
          doctor_id: string
          id?: string
          level: number
        }
        Update: {
          department_id?: string
          doctor_id?: string
          id?: string
          level?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_departments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_departments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_subjects: {
        Row: {
          doctor_id: string
          id: string
          subject_id: string
        }
        Insert: {
          doctor_id: string
          id?: string
          subject_id: string
        }
        Update: {
          doctor_id?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_subjects_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_subjects_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      excuses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lecture_id: string
          reason: string
          reviewed_by: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lecture_id: string
          reason: string
          reviewed_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lecture_id?: string
          reason?: string
          reviewed_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "excuses_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excuses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excuses_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excuses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "excuses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      face_templates: {
        Row: {
          created_at: string
          front_photo_url: string
          id: string
          left_photo_url: string | null
          right_photo_url: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          front_photo_url: string
          id?: string
          left_photo_url?: string | null
          right_photo_url?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          front_photo_url?: string
          id?: string
          left_photo_url?: string | null
          right_photo_url?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "face_templates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_templates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lecture_id: string
          rating: number
          student_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lecture_id: string
          rating: number
          student_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lecture_id?: string
          rating?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_ratings_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_ratings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_ratings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          created_at: string
          day_of_week: string | null
          department_id: string
          description: string | null
          doctor_id: string
          end_time: string | null
          hall_number: number | null
          id: string
          is_active: boolean
          level: number
          notes: string | null
          points: number
          start_time: string | null
          subject_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: string | null
          department_id: string
          description?: string | null
          doctor_id: string
          end_time?: string | null
          hall_number?: number | null
          id?: string
          is_active?: boolean
          level: number
          notes?: string | null
          points?: number
          start_time?: string | null
          subject_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: string | null
          department_id?: string
          description?: string | null
          doctor_id?: string
          end_time?: string | null
          hall_number?: number | null
          id?: string
          is_active?: boolean
          level?: number
          notes?: string | null
          points?: number
          start_time?: string | null
          subject_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          content: string
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          edited_at: string | null
          id: string
          lecture_id: string | null
          reaction: string | null
          read: boolean
          read_at: string | null
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          lecture_id?: string | null
          reaction?: string | null
          read?: boolean
          read_at?: string | null
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          id?: string
          lecture_id?: string | null
          reaction?: string | null
          read?: boolean
          read_at?: string | null
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          comments: boolean
          community: boolean
          likes: boolean
          mentions: boolean
          pins: boolean
          replies: boolean
          system: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          comments?: boolean
          community?: boolean
          likes?: boolean
          mentions?: boolean
          pins?: boolean
          replies?: boolean
          system?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          comments?: boolean
          community?: boolean
          likes?: boolean
          mentions?: boolean
          pins?: boolean
          replies?: boolean
          system?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      office_hour_bookings: {
        Row: {
          booking_date: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          id: string
          notes: string | null
          reason: string | null
          reminder_sent: boolean
          slot_id: string
          status: string
          student_id: string
        }
        Insert: {
          booking_date: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string | null
          reminder_sent?: boolean
          slot_id: string
          status?: string
          student_id: string
        }
        Update: {
          booking_date?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string | null
          reminder_sent?: boolean
          slot_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_hour_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "office_hours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_hour_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_hour_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      office_hours: {
        Row: {
          created_at: string
          day_of_week: string
          doctor_id: string
          end_time: string
          id: string
          is_active: boolean
          location: string | null
          max_bookings: number
          notes: string | null
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: string
          doctor_id: string
          end_time: string
          id?: string
          is_active?: boolean
          location?: string | null
          max_bookings?: number
          notes?: string | null
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: string
          doctor_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          location?: string | null
          max_bookings?: number
          notes?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_hours_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "office_hours_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_title: string | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          department_id: string | null
          disabled_at: string | null
          disabled_reason: string | null
          favorites: string[]
          followers_count: number
          following_count: number
          full_name: string
          hobbies: string[]
          id: string
          interests: string[]
          is_disabled: boolean
          level: number | null
          phone: string | null
          points: number
          role: string
          skills: string[]
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_title?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          department_id?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          favorites?: string[]
          followers_count?: number
          following_count?: number
          full_name: string
          hobbies?: string[]
          id?: string
          interests?: string[]
          is_disabled?: boolean
          level?: number | null
          phone?: string | null
          points?: number
          role: string
          skills?: string[]
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_title?: string | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          department_id?: string | null
          disabled_at?: string | null
          disabled_reason?: string | null
          favorites?: string[]
          followers_count?: number
          following_count?: number
          full_name?: string
          hobbies?: string[]
          id?: string
          interests?: string[]
          is_disabled?: boolean
          level?: number | null
          phone?: string | null
          points?: number
          role?: string
          skills?: string[]
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_uploads: {
        Row: {
          created_at: string
          doctor_id: string
          error_message: string | null
          id: string
          image_url: string
          lectures_created: number | null
          parsed_data: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          error_message?: string | null
          id?: string
          image_url: string
          lectures_created?: number | null
          parsed_data?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          error_message?: string | null
          id?: string
          image_url?: string
          lectures_created?: number | null
          parsed_data?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_uploads_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_uploads_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      training_applications: {
        Row: {
          answers: Json
          applicant_id: string
          created_at: string
          id: string
          status: string
          training_id: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          applicant_id: string
          created_at?: string
          id?: string
          status?: string
          training_id: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          applicant_id?: string
          created_at?: string
          id?: string
          status?: string
          training_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_applications_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_form_fields: {
        Row: {
          created_at: string
          field_key: string
          field_type: string
          id: string
          label: string
          label_ar: string | null
          options: Json | null
          order_index: number
          required: boolean
          training_id: string
        }
        Insert: {
          created_at?: string
          field_key: string
          field_type: string
          id?: string
          label: string
          label_ar?: string | null
          options?: Json | null
          order_index?: number
          required?: boolean
          training_id: string
        }
        Update: {
          created_at?: string
          field_key?: string
          field_type?: string
          id?: string
          label?: string
          label_ar?: string | null
          options?: Json | null
          order_index?: number
          required?: boolean
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_form_fields_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          application_mode: string
          applications_count: number
          apply_url: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          location: string | null
          max_applicants: number | null
          tags: string[] | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          application_mode?: string
          applications_count?: number
          apply_url?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string | null
          max_applicants?: number | null
          tags?: string[] | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          application_mode?: string
          applications_count?: number
          apply_url?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          location?: string | null
          max_applicants?: number | null
          tags?: string[] | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          peer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          peer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          peer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      warning_alerts: {
        Row: {
          absence_count: number | null
          alert_type: string
          created_at: string
          doctor_id: string
          id: string
          is_resolved: boolean | null
          message: string
          risk_level: string
          student_id: string
          total_lectures: number | null
        }
        Insert: {
          absence_count?: number | null
          alert_type?: string
          created_at?: string
          doctor_id: string
          id?: string
          is_resolved?: boolean | null
          message: string
          risk_level?: string
          student_id: string
          total_lectures?: number | null
        }
        Update: {
          absence_count?: number | null
          alert_type?: string
          created_at?: string
          doctor_id?: string
          id?: string
          is_resolved?: boolean | null
          message?: string
          risk_level?: string
          student_id?: string
          total_lectures?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warning_alerts_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warning_alerts_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warning_alerts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profile_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warning_alerts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profile_directory: {
        Row: {
          academic_title: string | null
          avatar_url: string | null
          department_id: string | null
          full_name: string | null
          id: string | null
          level: number | null
          points: number | null
          role: string | null
          student_id: string | null
          user_id: string | null
        }
        Insert: {
          academic_title?: string | null
          avatar_url?: string | null
          department_id?: string | null
          full_name?: string | null
          id?: string | null
          level?: number | null
          points?: number | null
          role?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Update: {
          academic_title?: string | null
          avatar_url?: string | null
          department_id?: string | null
          full_name?: string | null
          id?: string | null
          level?: number | null
          points?: number | null
          role?: string | null
          student_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      community_leaderboard: {
        Args: { days?: number; lim?: number }
        Returns: {
          avatar_url: string
          comments_count: number
          full_name: string
          likes_received: number
          posts_count: number
          role: string
          score: number
          user_id: string
        }[]
      }
      db_health_snapshot: { Args: never; Returns: Json }
      db_integrity_check: { Args: never; Returns: Json }
      rebuild_statistics: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "doctor" | "student"
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
      app_role: ["admin", "doctor", "student"],
    },
  },
} as const
