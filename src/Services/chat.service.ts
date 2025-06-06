import { Injectable } from '@angular/core';
import { supabase } from '../app/supabase.client';
import { ChatRoom } from '../Models/chat-room.model';
import { Message } from '../Models/message.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor() {}

  // ========= Room logic =========
  async getAllRooms(): Promise<ChatRoom[]> {
    const { data: rooms, error: roomError } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (roomError) throw roomError;

    const { data: participants, error: participantError } = await supabase
      .from('room_participants')
      .select('room_id');

    if (participantError) throw participantError;

    const countMap = new Map<string, number>();
    participants?.forEach(p => {
      const roomId = p.room_id;
      countMap.set(roomId, (countMap.get(roomId) || 0) + 1);
    });

    return (rooms || []).map(room => ({
      ...room,
      image: room.image_url,
      createdAt: room.created_at,
      members: countMap.get(room.id) || 0
    }));
  }

  async createRoom(room: { name: string; description?: string; imageFile?: File }): Promise<ChatRoom> {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (sessionError || !user) throw new Error('Not logged in');

    let imageUrl = '';
    if (room.imageFile) {
      imageUrl = await this.uploadRoomImage(room.imageFile);
    }

    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name: room.name,
        description: room.description || '',
        image_url: imageUrl,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateRoom(id: string, updates: { name?: string; description?: string; image_url?: string }) {
    const { error } = await supabase.from('chat_rooms').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteRoom(id: string) {
    // Xoá người tham gia trước
    const { error: participantError } = await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', id);
    if (participantError) throw participantError;

    // Rồi mới xoá phòng
    const { error: roomError } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', id);
    if (roomError) throw roomError;
  }

  async uploadRoomImage(file: File): Promise<string> {
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('room-images').upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from('room-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  // ========= Room participant logic =========
  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    return !!data && !error;
  }

  async joinRoom(roomId: string, userId: string): Promise<boolean> {
    // Bước 1: Xoá nếu user đã tham gia để tránh lỗi unique
    const { error: deleteError } = await supabase
      .from('room_participants')
      .delete()
      .match({ room_id: roomId, user_id: userId });

    if (deleteError) {
      console.warn('⚠ Không thể xóa bản ghi cũ (nếu có):', deleteError.message);
      // Không return false ở đây vì có thể bản ghi không tồn tại — điều đó vẫn ổn
    }

    // Bước 2: Insert lại bản ghi mới (trigger sẽ chạy chắc chắn)
    const { error: insertError } = await supabase
      .from('room_participants')
      .insert({
        room_id: roomId,
        user_id: userId,
        joined_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ Tham gia phòng thất bại:', insertError.message);
      return false;
    }

    return true;
  }


  // ========= Message logic =========
  async getMessages(roomId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*, users!messages_sender_id_fkey (name, avatar_url)')
      .eq('room_id', roomId)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('❌ Failed to load messages:', error.message);
      return [];
    }

    return data as Message[];
  }

  async sendMessage(roomId: string, userId: string, content: string): Promise<boolean> {
    const { error } = await supabase.from('messages').insert([
      {
        room_id: roomId,
        sender_id: userId,
        content,
        media_type: 'text',
        media_url: null,
        sent_at: new Date().toISOString()
      }
    ]);
    return !error;
  }

  async getTotalMessages(): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Error counting messages:', error.message);
      return 0;
    }

    return count ?? 0;
  }

  async getMessagesNeedingReply(): Promise<number> {
    const { data, error } = await supabase.from('messages').select('*');
    if (error) {
      console.error('❌ Error loading messages:', error.message);
      return 0;
    }

    return data.filter((m: any) => !m.content?.toLowerCase().includes('replied')).length;
  }
  async deleteRoomCompletely(id: string): Promise<void> {
    // Xoá tất cả messages của phòng
    const { error: messageError } = await supabase
      .from('messages')
      .delete()
      .eq('room_id', id);
    if (messageError) throw new Error(`Failed to delete messages: ${messageError.message}`);

    // Xoá tất cả participants của phòng
    const { error: participantError } = await supabase
      .from('room_participants')
      .delete()
      .eq('room_id', id);
    if (participantError) throw new Error(`Failed to delete participants: ${participantError.message}`);

    // Xoá phòng
    const { error: roomError } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', id);
    if (roomError) throw new Error(`Failed to delete room: ${roomError.message}`);
  }

}
